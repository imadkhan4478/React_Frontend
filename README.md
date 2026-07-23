# QG-IRS — Supply Chain Intelligence Platform

React (TypeScript) frontend + FastAPI backend for Qadri Group's internal AI
Supply Chain Intelligence Platform. Replaces an earlier Streamlit prototype
(retired — it couldn't give the open visual customization this needs).

## Structure

```
frontend/   Vite + React + TypeScript + Tailwind CSS + shadcn-style components
backend/    FastAPI, JWT-cookie auth, stub data until the real Postgres DB lands
```

## Run it

**Backend**
```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate        # source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # then edit JWT_SECRET to a real random value
python scripts/add_user.py <username> "<Full Name>" <role>   # creates a login
uvicorn app.main:app --reload
```

**Frontend** (separate terminal)
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/auth` and `/api` to the backend
on :8000 (see `frontend/vite.config.ts`), so no CORS setup is needed in dev.

## Architecture rules (carried over from the Streamlit project)

1. **The frontend never talks to the database or does calculations.**
   `backend/app/*/router.py` is the API boundary; today it returns stub data
   (`app/dashboard/router.py`), later it queries the real Postgres DB owned
   by the DB team — same response shape, no frontend changes.
2. **Auth follows the same swap-later pattern.** `backend/app/auth/store.py`
   reads a local `auth_users.json` (gitignored, managed via
   `scripts/add_user.py`) today; it'll be swapped for the real `users` table
   later without touching `app/auth/router.py`, `app/core/security.py`, or
   any frontend code.
3. **Sessions persist across restarts** via an httpOnly JWT cookie (30-day
   expiry by default, `COOKIE_EXPIRY_DAYS` in `.env`) — not localStorage, not
   in-memory state.
4. **Role-based access exists but is unrestricted by default.**
   `frontend/src/lib/roleAccess.ts`'s `PAGE_ACCESS` map is empty on purpose —
   the real role→page mapping is a business decision not yet made. Add
   entries there once it is; nothing else needs to change.
5. **Design tokens live in one place.** `frontend/src/theme/tokens.ts` (JS
   values, e.g. for charts) and `frontend/src/index.css` (CSS variables,
   flipped by the `.dark` class) — keep both in sync if the palette changes.
6. **One file per tab.** `frontend/src/pages/*.tsx`, wired in
   `frontend/src/lib/pages.ts` (sidebar order/icons) and `frontend/src/App.tsx`
   (routes). Only Dashboard is real today; the other six are "coming soon"
   placeholders to be filled in one at a time.

## Environment variables

See `backend/.env.example`. `JWT_SECRET` must be changed to a long random
value before this ever leaves a dev machine.
