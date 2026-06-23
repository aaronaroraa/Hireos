# Deploying HireOS as a prototype

Three pieces: **database (Supabase)**, **backend (Render)**, **frontend (Vercel)**.
Do them in that order — the frontend needs the backend URL, the backend needs the DB URL.

---

## 1. Database — Supabase (Postgres)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → Database → Connection string → URI**.
3. Copy the URI. It looks like:
   `postgresql://postgres.xxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres`
   - Use the **pooler** URI (port `6543`) — it suits short-lived backend connections.
   - Replace `[PASSWORD]` with your DB password.
4. Keep this string — it's your `DATABASE_URL`.

Tables are created automatically on first boot (`Base.metadata.create_all`). No manual SQL needed.

---

## 2. Backend — Render (FastAPI)

1. Push this repo to GitHub.
2. In Render: **New + → Blueprint**, select the repo. It reads `backend/render.yaml`.
   (Or **New + → Web Service** manually, root dir `backend`, start command
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.)
3. Set environment variables in the Render dashboard:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase URI from step 1 |
   | `JWT_SECRET_KEY` | auto-generated, or `openssl rand -hex 32` |
   | `OPENAI_API_KEY` | your OpenAI key (enables the live AI interview) |
   | `RESEND_API_KEY` | your Resend key (enables real emails) |
   | `EMAIL_FROM` | `HireOS <onboarding@resend.dev>` |
   | `ENVIRONMENT` | `production` |
4. Deploy. Note the URL, e.g. `https://hireos-api.onrender.com`.
5. Verify: open `https://hireos-api.onrender.com/health` → `{"status":"ok"}`.

> Free tier sleeps after inactivity; the first request after idle takes ~30s to wake.
> The login screens already show a "server waking up" message for this.

### Seed demo data (optional, for a sales demo)
From a machine with the repo and `DATABASE_URL` exported, run the seed snippet
(see `backend/seed_demo.py` if present) to create the demo recruiter + candidates.

---

## 3. Frontend — Vercel (React/Vite)

1. In Vercel: **Add New → Project**, import the repo.
2. **Root Directory:** `frontend`. Framework preset: **Vite**.
3. Environment variable:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://hireos-api.onrender.com` (your Render URL) |
4. Deploy. You get e.g. `https://hireos.vercel.app`.

`frontend/vercel.json` already rewrites all routes to `index.html` so client-side
routing (`/portal/...`, `/apply/...`) works on refresh.

---

## 4. Two doors, one app

The same frontend serves both audiences by route:

| Audience | URL |
|---|---|
| Recruiter / company | `https://hireos.vercel.app/login` |
| Candidate | `https://hireos.vercel.app/portal/login` |
| **Sales presenter (both at once)** | `https://hireos.vercel.app/demo` |

When you sign a client, point two custom domains at the same Vercel project:
`app.hireos.com` (recruiter) and `hiring.hireos.com` (candidate). No code change —
each domain just defaults to its own login route.

---

## 5. Presenting both sides together

Use **`/demo`** — a split-screen that shows the recruiter dashboard and the candidate
portal side by side, auto-logged-in to demo accounts. When the candidate answers in the
chat, the recruiter's pipeline updates live. That's the screen to present from.

For quick manual testing, a small **dev switcher** (bottom-right corner, dev builds only)
jumps between the recruiter and candidate views without retyping URLs.
