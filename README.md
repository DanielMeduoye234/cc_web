# CampusConnect — Web

The public landing page for **CampusConnect** plus a gated **staff console** for campus ops:

- **Landing page** — the marketing/front door for the student-only app.
- **Email verification** — auto-handles Firebase `?mode=verifyEmail&oobCode=...` deep links.
- **Staff console** (key-gated) — upload app audio to Supabase Storage and review / approve student verifications.

Built with **Next.js 15** (App Router) + React 19. Designed to deploy on **Vercel**.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

## Environment variables

Set these in `.env.local` for local dev, and in **Vercel → Project → Settings → Environment Variables** for production.

| Variable | Used for | Exposure |
| --- | --- | --- |
| `ADMIN_REVIEW_KEY` | The staff key that unlocks the console & authorizes the approval API | Server only |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Reading/updating the student verification queue in Firestore | Server only |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Completing email-verification deep links | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | Audio upload target | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Audio upload auth (anon key only) | Public |
| `NEXT_PUBLIC_SUPABASE_BUCKET` | Storage bucket name (default `media`) | Public |

> `NEXT_PUBLIC_*` values are bundled into the browser by design — never put the Supabase `service_role` key or any secret in a `NEXT_PUBLIC_` variable.

## Supabase storage

Run [`supabase-schema.sql`](./supabase-schema.sql) once in the Supabase SQL editor to create the `media` bucket and its access policies (audio uploads + verification document links).

## Deploy on Vercel

1. Import this repository in Vercel (framework preset: **Next.js**, root directory: `/`).
2. Add the environment variables above.
3. Deploy. Point your Firebase Auth email action URL at the deployed domain so verification links land here.
