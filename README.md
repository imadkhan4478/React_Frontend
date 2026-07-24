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
   **The backend is confirmed as FastAPI but does not exist in this repo
   yet.** Until it lands, `frontend/src/lib/mockAuth.ts` is the frontend-only
   stand-in — see "Security note — `mockAuth.ts` is temporary" below.
2. **Auth follows the same swap-later pattern.** `backend/app/auth/store.py`
   reads a local `auth_users.json` (gitignored, managed via
   `scripts/add_user.py`) today; it'll be swapped for the real `users` table
   later without touching `app/auth/router.py`, `app/core/security.py`, or
   any frontend code.
3. **Sessions persist across restarts** via an httpOnly JWT cookie (30-day
   expiry by default, `COOKIE_EXPIRY_DAYS` in `.env`) — not localStorage, not
   in-memory state. This is the target design; the frontend-only stub does
   not implement it yet (see below).
4. **Role-based access is now defined.** `frontend/src/lib/roleAccess.ts`
   has four roles and a `can(user, action)` helper — see "Roles &
   permissions" below. Components ask `can()` one question rather than
   checking `user.role` strings inline.
5. **Design tokens live in one place.** `frontend/src/theme/tokens.ts` (JS
   values, e.g. for charts) and `frontend/src/index.css` (CSS variables,
   flipped by the `.dark` class) — **keep both in sync if the palette
   changes.** Adding or recoloring a module accent, status color, or brand
   value in one file without the other is a common way to get dashboard
   charts and the rest of the UI silently out of sync.
6. **One file per tab.** `frontend/src/pages/*.tsx`, wired in
   `frontend/src/lib/pages.ts` (sidebar order/icons) and `frontend/src/App.tsx`
   (routes). Only Dashboard is real today; most of the rest are "coming soon"
   placeholders to be filled in one at a time. Imports Status is the first
   multi-screen exception — see below.

## Roles & permissions

Four roles, defined in `frontend/src/lib/roleAccess.ts`:

| Role    | Enter | Edit existing        | Reports    | Manage users | Manage masters   |
|---------|-------|-----------------------|------------|--------------|------------------|
| admin   | yes   | yes                   | yes        | yes          | yes              |
| manager | yes   | yes                   | yes        | no           | yes              |
| entry   | yes   | own drafts only       | yes        | no           | inline-create only |
| viewer  | no    | no                    | read-only  | no           | no               |

Viewers can see values, prices and PKR amounts — **nothing financial is
hidden by role.** The matrix only ever restricts *actions* (create/edit/
manage); every role sees every page (`PAGE_ACCESS` in `roleAccess.ts` maps
all four roles to every `PageKey`).

Use it from components as:

```ts
import { can } from '@/lib/roleAccess'

if (can(user, 'enter')) { /* show the "New" button */ }
```

`can()` covers `'enter' | 'editAny' | 'editOwnDraft' | 'viewReports' |
'manageUsers' | 'manageMastersFull' | 'manageMastersInlineCreate'`. Note that
`editOwnDraft` only tells you the *role* has that scoped capability — the
caller still checks the specific record's owner/draft state, since `can()`
has no access to record data.

### Demo credentials (frontend-only stub)

| Username | Password  | Role    |
|----------|-----------|---------|
| admin    | admin123  | admin   |
| manager  | admin123  | manager |
| entry    | admin123  | entry   |
| viewer   | admin123  | viewer  |

### Security note — `mockAuth.ts` is temporary

`frontend/src/lib/mockAuth.ts` checks these credentials against a plaintext
array in the bundle, and `AuthContext` persists the "session" to
`localStorage`. There is no real authentication here: anyone with devtools
can open the console and grant themselves `admin` by editing
`localStorage.qgirs-user` directly, or just read the passwords out of the
shipped JS. This is acceptable **only** because it's a UI-development gate,
not production auth.

When the real backend lands, **delete `mockAuth.ts`, don't edit it** — real
sessions need an httpOnly JWT cookie (see architecture rule 3), which by
definition can't be read or forged from `localStorage`/devtools the way this
stub can. `AuthContext`, `ProtectedRoute`, and every page that calls
`useAuth()`/`can()` should need no changes; only the internals of the auth
stub are meant to be swapped out.

## Imports Status vs. the Imports page

Two different things share the word "imports" — don't confuse them:

- **`frontend/src/pages/Imports.tsx`** — the Imports *dashboard* tab, wired
  through `lib/pages.ts` like every other single-page tab. Still a "coming
  soon" placeholder.
- **`frontend/src/features/importsStatus/`** — the consignment *tracking*
  system: a list, a detail view, and a seven-step data-entry wizard. This is
  its own feature area with real routing, reachable from the sidebar as
  "Imports Status" (`/imports-status`) but otherwise unrelated to the
  Imports dashboard page.

## Nested routing pattern (Imports Status)

Every other page so far is a single flat `<Route path="/x" element={...} />`
in `App.tsx`. Imports Status is the first feature with multiple screens
under one path, so it establishes the pattern for the next one:

```
/imports-status                  list
/imports-status/new              wizard, step 1, blank record
/imports-status/:id              detail view
/imports-status/:id/edit/:step   wizard on an existing record, steps 1-7
```

`App.tsx` nests these under a single `<Route path="/imports-status">` parent
with `index` / `new` / `:id` / `:id/edit/:step` children, all still inside
the existing `<ProtectedRoute>` → `<AppLayout>` wrapping. A brand-new record
only ever gets a step-1 route (`/new`); submitting step 1 is what's expected
to hand back a real id from the API, after which steps 2-7 continue under
`/:id/edit/:step`. Follow this same nested shape for the next feature that
needs more than one screen — don't flatten it back into loose top-level
routes.

## Forms: react-hook-form + zod

Added for the Imports Status wizard (`frontend/src/features/importsStatus/`)
because seven steps of heavily conditional, repeating fields with per-step
draft validation is exactly what hand-rolled `useState` doesn't hold up
under. New dependencies: `react-hook-form`, `zod`, `@hookform/resolvers`.

**These are now shared, project-wide dependencies** — if you're building
another form with more than a couple of fields or any real validation,
reach for this stack rather than re-inventing it. The pattern in
`features/importsStatus/schema.ts` + `wizard/ImportsStatusWizard.tsx` is:
one zod object per step, merged into a single draft schema, one
`useForm` for the whole wizard, and `trigger(stepFields)` to validate only
the current step on "Next" (react-hook-form's documented multi-step
pattern) — not per-step `useForm` instances.

## Environment variables

See `backend/.env.example`. `JWT_SECRET` must be changed to a long random
value before this ever leaves a dev machine. (This file — and the rest of
`backend/` — doesn't exist yet; see architecture rule 1.)
