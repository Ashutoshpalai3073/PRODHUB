# Sanyog — Deployment Record

Record of how this app is deployed, kept in the repo so the setup is never lost.
Last updated: 2026-09-05

---

## Live site

- **Production URL:** https://sanyog.ashutosh-palai2005.workers.dev
- **Platform:** Cloudflare Workers
- **Worker name:** `sanyog`  (configured in [`wrangler.jsonc`](wrangler.jsonc))
- **App type:** TanStack Start (React SSR), built with Vite

> Note: `sanyog` is a separate worker from the older `incutrack` deployment. They are independent.

---

## Google OAuth — URLs configured in Google Cloud Console

OAuth client ID: `751693881682-5slo7l5b35hobfj63ms10ihrhsjsjnnp.apps.googleusercontent.com`
(Google Cloud Console → APIs & Services → Credentials → this client)

**Authorised JavaScript origins**
- `http://localhost:8080`  (local dev)
- `https://sanyog.ashutosh-palai2005.workers.dev`  (live site)

**Authorised redirect URIs**
- `http://localhost:8080/api/auth/google/callback`  (local dev)
- `https://sanyog.ashutosh-palai2005.workers.dev/api/auth/google/callback`  (live site)

> The redirect URI must match EXACTLY what the server sends (see `src/server.ts` →
> `${FRONTEND_URL}/api/auth/google/callback`). A missing `/api/auth/google/callback`
> path or a trailing slash causes `Error 400: redirect_uri_mismatch`.

**OAuth consent screen (Google Auth Platform → Branding / Audience)**
- App name `sanyog` · support & developer email: ashutosh.palai2005@gmail.com
- Authorised domain: `ashutosh-palai2005.workers.dev`
- Homepage: `https://sanyog.ashutosh-palai2005.workers.dev`
- Privacy policy: `https://sanyog.ashutosh-palai2005.workers.dev/privacy` (served by `src/routes/privacy.tsx`)
- Terms of service: `https://sanyog.ashutosh-palai2005.workers.dev/terms` (served by `src/routes/terms.tsx`)
- Publishing status must be **In production** (basic scopes only — no Google verification
  needed). While in "Testing", only whitelisted test users can sign in; everyone else
  gets a 400 on the consent screen. No app logo uploaded (a logo triggers verification).

---

## Backend (current)

- **Supabase project:** https://ecduzzzvyfesegsyuens.supabase.co
- **Google OAuth client:** `751693881682-...` (see above)

---

## How to deploy

Run from the project root in PowerShell:

```powershell
# 1. Authenticate to Cloudflare (once). Opens a browser to approve.
npx wrangler login
#    OR, if the browser login times out, use an API token instead:
#    $env:CLOUDFLARE_API_TOKEN="<token from dash.cloudflare.com/profile/api-tokens>"

# 2. Build (bakes .env values into the bundle)
npm run build

# 3. Deploy the built worker
npm run deploy
```

The live URL is printed at the end of step 3.

- Cloudflare account ID: `9f177bbca0cd2274dfbd64a876714218`

---

## Environment variables

**Runtime, non-secret** — committed in [`wrangler.jsonc`](wrangler.jsonc) under `"vars"`:
`SUPABASE_URL`, `VITE_SUPABASE_URL`, `GOOGLE_CLIENT_ID`, `FRONTEND_URL`

**Build-time secrets** — kept ONLY in a local `.env` file (gitignored, never committed).
The build inlines these into the bundle, so `.env` must exist before `npm run build`:

- `GROQ_API_KEY`
- `SUPABASE_URL` / `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `FRONTEND_URL`
- `RESEND_API_KEY`

> To deploy from a new machine, recreate `.env` with the values for the Supabase
> project above. Never commit `.env` — it holds the service-role key and secrets.

---

## Database setup

The Supabase project needs its schema. In the Supabase dashboard → SQL Editor,
run these in order:

`src/migrations/sanyog/01_core.sql` → `02_pathway.sql` → `03_platform.sql`
→ `04_grants_and_security.sql` → `05_seed_demo.sql` → `06_public_read_access.sql`

---

## Change history

- **2026-09-05** — Repointed `wrangler.jsonc` from the old `incutrack` backend
  (Supabase `kntoyozitskrblvxmbpp`, Google client `54247305152-...`) to the current
  backend (Supabase `ecduzzzvyfesegsyuens`, Google client `751693881682-...`),
  renamed the worker to `sanyog`, and set `FRONTEND_URL` to the live URL.
  First successful deploy of `sanyog`. Added live-site URLs to the Google OAuth client.
