"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";

type ReviewUser = {
  id: string;
  displayName?: string;
  username?: string;
  email?: string;
  universityName?: string;
  verificationStatus?: string;
  verificationDocs?: {
    schoolIdUrl?: string;
    courseFormUrl?: string;
  };
};

type UploadState = "idle" | "uploading" | "success" | "error";
type ConsoleTab = "audio" | "approvals";
type Queue = "pending" | "verified" | "rejected";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "media";

function slugFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function initials(user: ReviewUser) {
  const base = user.displayName ?? user.username ?? user.email ?? "?";
  return base
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function StaffConsole({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [staffKey, setStaffKey] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [tab, setTab] = useState<ConsoleTab>("approvals");
  const [toast, setToast] = useState("");

  // Audio upload
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioArtist, setAudioArtist] = useState("CampusConnect");
  const [audioGenre, setAudioGenre] = useState("Campus");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const audioObjectUrl = useMemo(
    () => (audioFile ? URL.createObjectURL(audioFile) : ""),
    [audioFile]
  );
  useEffect(() => {
    return () => {
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
    };
  }, [audioObjectUrl]);

  // Approvals
  const [queue, setQueue] = useState<Queue>("pending");
  const [reviewUsers, setReviewUsers] = useState<ReviewUser[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [decided, setDecided] = useState<Record<string, "verified" | "rejected">>({});

  const dialogRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while the console is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  };

  // Unlock by verifying the key against the verification API.
  const unlock = async () => {
    if (!staffKey.trim()) return;
    setUnlocking(true);
    setUnlockError("");
    try {
      const res = await fetch(`/api/verifications?status=pending`, {
        headers: { "x-admin-key": staffKey },
      });
      // 401 = wrong/missing key. Any other status means the key was accepted
      // (a 500 just means the verification backend isn't configured yet).
      if (res.status === 401) {
        setUnlockError("That staff key was not accepted.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setReviewUsers(data.users ?? []);
      setQueue("pending");
      setUnlocked(true);
      setTab("approvals");
      if (!res.ok) {
        showToast("Key accepted — verification backend not configured yet");
      }
    } catch {
      setUnlockError("Could not reach the server. Check your connection.");
    } finally {
      setUnlocking(false);
    }
  };

  const loadReviews = async (status: Queue = queue) => {
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/verifications?status=${status}`, {
        headers: { "x-admin-key": staffKey },
      });
      const data = await res.json().catch(() => ({}));
      setReviewUsers(data.users ?? []);
      setDecided({});
    } finally {
      setReviewLoading(false);
    }
  };

  const decideUser = async (userId: string, status: "verified" | "rejected") => {
    setDecided((d) => ({ ...d, [userId]: status }));
    try {
      const res = await fetch("/api/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": staffKey },
        body: JSON.stringify({ userId, status }),
      });
      if (!res.ok) throw new Error();
      window.setTimeout(() => {
        setReviewUsers((users) => users.filter((u) => u.id !== userId));
      }, 360);
      showToast(status === "verified" ? "Student admitted ✓" : "Student rejected");
    } catch {
      setDecided((d) => {
        const next = { ...d };
        delete next[userId];
        return next;
      });
      showToast("Action failed — try again");
    }
  };

  const uploadAudio = async () => {
    if (!supabaseUrl || !supabaseAnonKey || !audioFile) {
      setUploadState("error");
      return;
    }
    setUploadState("uploading");
    setUploadedUrl("");
    const titlePart = slugFileName(audioTitle || audioFile.name.replace(/\.[^.]+$/, ""));
    const artistPart = slugFileName(audioArtist || "campusconnect");
    const genrePart = slugFileName(audioGenre || "campus");
    const ext = audioFile.name.split(".").pop() || "mp3";
    const fileName = `${Date.now()}-${titlePart}--${artistPart}--${genrePart}.${ext}`;
    const path = `sounds/${fileName}`;

    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": audioFile.type || "audio/mpeg",
          "x-upsert": "true",
          "cache-control": "31536000",
        },
        body: audioFile,
      });
      if (!res.ok) {
        setUploadState("error");
        return;
      }
      setUploadedUrl(`${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`);
      setUploadState("success");
      showToast("Audio uploaded ♪");
    } catch {
      setUploadState("error");
    }
  };

  const pickFromDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("audio")) {
      setAudioFile(file);
      setUploadState("idle");
      if (!audioTitle) setAudioTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(uploadedUrl);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Could not copy");
    }
  };

  return (
    <div className={`scrim ${open ? "scrim-open" : ""}`} onClick={onClose} aria-hidden={!open}>
      <aside
        ref={dialogRef}
        className={`console ${open ? "console-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Staff console"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="console-head">
          <div className="console-brand">
            <LogoMark size={30} />
            <div>
              <strong>Staff console</strong>
              <span>{unlocked ? "Audio & student approvals" : "Authorized access only"}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close console">
            ✕
          </button>
        </header>

        {!unlocked ? (
          <div className="console-lock">
            <div className="lock-badge">
              <LogoMark size={46} />
            </div>
            <h3>Enter your staff key</h3>
            <p>
              This area is for CampusConnect campus ops — uploading app audio and reviewing
              student verifications.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                unlock();
              }}
            >
              <input
                autoFocus
                type="password"
                value={staffKey}
                onChange={(e) => {
                  setStaffKey(e.target.value);
                  setUnlockError("");
                }}
                placeholder="Staff key"
                aria-label="Staff key"
              />
              <button className="btn btn-primary btn-block" disabled={!staffKey.trim() || unlocking}>
                {unlocking ? "Checking…" : "Unlock console"}
              </button>
            </form>
            {unlockError && <p className="form-error">{unlockError}</p>}
          </div>
        ) : (
          <div className="console-body">
            <div className="console-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "approvals"}
                className={tab === "approvals" ? "active" : ""}
                onClick={() => setTab("approvals")}
              >
                Student approvals
              </button>
              <button
                role="tab"
                aria-selected={tab === "audio"}
                className={tab === "audio" ? "active" : ""}
                onClick={() => setTab("audio")}
              >
                Upload audio
              </button>
            </div>

            {tab === "audio" && (
              <div className="tab-panel">
                <label
                  className={`dropzone ${dragging ? "dropzone-active" : ""} ${audioFile ? "dropzone-filled" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={pickFromDrop}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setAudioFile(file);
                      setUploadState("idle");
                      if (file && !audioTitle) setAudioTitle(file.name.replace(/\.[^.]+$/, ""));
                    }}
                  />
                  {audioFile ? (
                    <div className="drop-file">
                      <span className="drop-note">♪</span>
                      <div>
                        <strong>{audioFile.name}</strong>
                        <small>{formatBytes(audioFile.size)} · ready to upload</small>
                      </div>
                    </div>
                  ) : (
                    <div className="drop-empty">
                      <span className="drop-note">♪</span>
                      <strong>Drop an audio file</strong>
                      <small>or click to browse · saved to media/sounds</small>
                    </div>
                  )}
                </label>

                {audioObjectUrl && (
                  <audio className="audio-preview" src={audioObjectUrl} controls preload="metadata" />
                )}

                <div className="field-row">
                  <label className="field">
                    <span>Title</span>
                    <input
                      value={audioTitle}
                      onChange={(e) => setAudioTitle(e.target.value)}
                      placeholder="Campus Nights"
                    />
                  </label>
                  <label className="field">
                    <span>Artist</span>
                    <input
                      value={audioArtist}
                      onChange={(e) => setAudioArtist(e.target.value)}
                      placeholder="CampusConnect"
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Genre</span>
                  <input
                    value={audioGenre}
                    onChange={(e) => setAudioGenre(e.target.value)}
                    placeholder="Lofi"
                  />
                </label>

                <button
                  className="btn btn-primary btn-block"
                  onClick={uploadAudio}
                  disabled={!audioFile || uploadState === "uploading"}
                >
                  {uploadState === "uploading" ? "Uploading…" : "Upload to app library"}
                </button>

                {uploadState === "success" && (
                  <div className="result result-ok">
                    <p>Uploaded. It appears in the in-app sound picker after a refresh.</p>
                    {uploadedUrl && (
                      <div className="result-actions">
                        <a href={uploadedUrl} target="_blank" rel="noreferrer">
                          Open file ↗
                        </a>
                        <button onClick={copyUrl}>Copy link</button>
                      </div>
                    )}
                  </div>
                )}
                {uploadState === "error" && (
                  <div className="result result-err">
                    Upload failed. Check the Supabase bucket policy and that
                    NEXT_PUBLIC_SUPABASE_* env vars are set.
                  </div>
                )}
              </div>
            )}

            {tab === "approvals" && (
              <div className="tab-panel">
                <div className="queue-bar">
                  <div className="seg">
                    {(["pending", "verified", "rejected"] as Queue[]).map((q) => (
                      <button
                        key={q}
                        className={queue === q ? "active" : ""}
                        onClick={() => {
                          setQueue(q);
                          loadReviews(q);
                        }}
                      >
                        {q[0].toUpperCase() + q.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => loadReviews()}
                    disabled={reviewLoading}
                  >
                    {reviewLoading ? "Loading…" : "Refresh"}
                  </button>
                </div>

                <div className="review-list">
                  {reviewLoading &&
                    [0, 1, 2].map((i) => <div key={i} className="review-card skeleton" />)}

                  {!reviewLoading &&
                    reviewUsers.map((user) => {
                      const verdict = decided[user.id];
                      return (
                        <div
                          key={user.id}
                          className={`review-card ${verdict ? `decided decided-${verdict}` : ""}`}
                        >
                          <div className="review-id">
                            <span className="avatar">{initials(user)}</span>
                            <div className="review-meta">
                              <strong>{user.displayName ?? user.username ?? user.email}</strong>
                              <span>{user.email}</span>
                              <small>{user.universityName ?? "Campus not set"}</small>
                            </div>
                          </div>
                          <div className="doc-links">
                            {user.verificationDocs?.schoolIdUrl ? (
                              <a href={user.verificationDocs.schoolIdUrl} target="_blank" rel="noreferrer">
                                School ID ↗
                              </a>
                            ) : (
                              <span className="doc-missing">No ID</span>
                            )}
                            {user.verificationDocs?.courseFormUrl ? (
                              <a href={user.verificationDocs.courseFormUrl} target="_blank" rel="noreferrer">
                                Course form ↗
                              </a>
                            ) : (
                              <span className="doc-missing">No form</span>
                            )}
                          </div>
                          {queue === "pending" && (
                            <div className="decision-row">
                              <button
                                className="approve"
                                disabled={!!verdict}
                                onClick={() => decideUser(user.id, "verified")}
                              >
                                Admit
                              </button>
                              <button
                                className="reject"
                                disabled={!!verdict}
                                onClick={() => decideUser(user.id, "rejected")}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {!reviewLoading && reviewUsers.length === 0 && (
                    <div className="empty">
                      <span>✓</span>
                      <strong>Queue is clear</strong>
                      <small>No {queue} students right now.</small>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </aside>
    </div>
  );
}
