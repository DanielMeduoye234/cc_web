import { NextRequest, NextResponse } from "next/server";
import { createSign } from "crypto";

type VerificationUser = {
  id: string;
  displayName?: string;
  username?: string;
  email?: string;
  universityName?: string;
  verificationStatus?: "pending" | "verified" | "rejected" | "expired";
  verificationDocs?: {
    schoolIdUrl?: string;
    courseFormUrl?: string;
  };
  verificationSubmittedAt?: unknown;
};

const assertAdmin = (request: NextRequest) => {
  const expected = process.env.ADMIN_REVIEW_KEY;
  const provided = request.headers.get("x-admin-key");
  if (!expected || provided !== expected) {
    throw new Error("Unauthorized");
  }
};

// Auth failures return 401 (wrong/missing staff key); everything else
// (missing Firebase config, upstream errors) returns 500 — so the client can
// tell "bad key" apart from "backend not configured yet".
const errorResponse = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Failed";
  const status = message === "Unauthorized" ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
};

const serviceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  const parsed = JSON.parse(raw);
  parsed.private_key = String(parsed.private_key ?? "").replace(/\\n/g, "\n");
  return parsed as { project_id: string; client_email: string; private_key: string };
};

const base64url = (value: object | string) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

const getAccessToken = async () => {
  const account = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: "RS256", typ: "JWT" });
  const payload = base64url({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  });
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error("Could not authenticate Firebase service account");
  return (await response.json()).access_token as string;
};

const firestoreValue = (value: any): any => {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return Number(value.doubleValue);
  if (value.booleanValue !== undefined) return Boolean(value.booleanValue);
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.mapValue?.fields) {
    return Object.fromEntries(Object.entries(value.mapValue.fields).map(([key, val]) => [key, firestoreValue(val)]));
  }
  return null;
};

const parseUserDoc = (document: any): VerificationUser => {
  const id = String(document.name).split("/").pop() ?? "";
  const fields = document.fields ?? {};
  return {
    id,
    displayName: firestoreValue(fields.displayName),
    username: firestoreValue(fields.username),
    email: firestoreValue(fields.email),
    universityName: firestoreValue(fields.universityName),
    verificationStatus: firestoreValue(fields.verificationStatus),
    verificationDocs: firestoreValue(fields.verificationDocs),
    verificationSubmittedAt: firestoreValue(fields.verificationSubmittedAt),
  };
};

const firestoreBaseUrl = () => {
  const account = serviceAccount();
  return `https://firestore.googleapis.com/v1/projects/${account.project_id}/databases/(default)/documents`;
};

export async function GET(request: NextRequest) {
  try {
    assertAdmin(request);
    const status = request.nextUrl.searchParams.get("status") ?? "pending";
    const allowed = new Set(["pending", "rejected", "verified"]);
    const queryStatus = allowed.has(status) ? status : "pending";

    const token = await getAccessToken();
    const response = await fetch(`${firestoreBaseUrl()}:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "verificationStatus" },
              op: "EQUAL",
              value: { stringValue: queryStatus },
            },
          },
          limit: 50,
        },
      }),
    });
    if (!response.ok) throw new Error("Could not load verification queue");
    const rows = await response.json();
    const users: VerificationUser[] = rows.map((row: any) => row.document).filter(Boolean).map(parseUserDoc);
    return NextResponse.json({ users });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertAdmin(request);
    const body = await request.json();
    const userId = String(body.userId ?? "");
    const status = body.status === "verified" ? "verified" : body.status === "rejected" ? "rejected" : null;

    if (!userId || !status) {
      return NextResponse.json({ error: "Missing userId or status" }, { status: 400 });
    }

    const token = await getAccessToken();
    const now = new Date().toISOString();
    const params = new URLSearchParams();
    ["verificationStatus", "verifiedAt", "verificationReviewedAt", "verificationRejectionReason"].forEach((field) => params.append("updateMask.fieldPaths", field));
    const response = await fetch(`${firestoreBaseUrl()}/users/${userId}?${params.toString()}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          verificationStatus: { stringValue: status },
          verifiedAt: status === "verified" ? { timestampValue: now } : { nullValue: null },
          verificationReviewedAt: { timestampValue: now },
          verificationRejectionReason: status === "rejected" ? { stringValue: "Documents could not be verified. Please upload clearer documents." } : { nullValue: null },
        },
      }),
    });
    if (!response.ok) throw new Error("Could not update verification status");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
