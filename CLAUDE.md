# projects — Client CRM

React Router 7 SSR app. Internal tool for managing leads, booking requests, and active client projects.

## Stack

- **Framework**: React Router 7 (SSR, `@react-router/node`)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **DB**: Drizzle ORM + `@neondatabase/serverless` (Neon PostgreSQL)
- **Email**: Resend (booking accept/decline confirmations)
- **Auth**: Simple session cookie via `app/lib/session.server.ts`

## Dev

```bash
pnpm dev           # starts on http://localhost:5173
pnpm db:push       # push schema changes to Neon (use this, not pnpx drizzle-kit)
pnpm db:studio     # Drizzle Studio UI
pnpm typecheck
```

## Env vars (`.env`)

```
DATABASE_URL=       # Neon connection string (shared with alvarnystudios.com)
RESEND_API_KEY=     # Resend API key
SESSION_SECRET=     # Cookie signing secret
```

## Routes

| Route | File | Notes |
|-------|------|-------|
| `/` | `app/routes/home.tsx` | Main dashboard: booking requests, leads board, projects board |
| `/admin-login` | `app/routes/admin-login.tsx` | Auth |
| `/projects/:slug` | `app/routes/project.tsx` | Project detail: phases, brief, brand values, artifacts |
| `/view/:slug` | `app/routes/view.$slug.tsx` | Client-facing read-only project view |

## Database schema (`app/db/schema.ts`)

| Table | Purpose |
|-------|---------|
| `projects` | Active and proposal-stage client projects |
| `project_brief` | Scoped project details (pages, features, budget, timeline) |
| `brand_values` | Colours and fonts per project |
| `phase_steps` | Checklist steps per project phase (1–4) |
| `phase_notes` | Admin + client notes per phase |
| `phase_artifacts` | Links/files attached to a phase |
| `leads` | All inbound leads (form, booking, manual) |
| `bookings` | Calendar booking requests from the marketing site |

## Lead lifecycle

```
booking (pending) → accept → lead (status: contacted, source: booking) → Start Proposal → project
                  → decline → slot re-opens on calendar
contact form      → lead (status: new, source: form)
manual            → lead (status: new, source: admin)
lead (new)        → → Contacted → Start Proposal → project
```

## Key components

- **`BookingCard`** — Pending booking: shows date/slot, Accept (creates lead) / Decline (frees slot)
- **`LeadCard`** — Lead with status badge, contact info, booking date if applicable, pipeline actions
- **`ProjectCard`** — Project summary with phase progress
- **`PhaseCard`** — Phase detail with step checklist, notes, artifacts

## Phases (`app/lib/phases.ts`)

Four fixed phases: Discovery → Design → Build → Launch. Each has a defined step list. Progress tracked in `phase_steps`.

## Important notes

- The `projects` app **owns the DB schema**. Always run migrations here, not from the marketing site.
- `app/db/index.server.ts` uses `import * as schema` so `db.query.*` works for all tables without extra config.
- Declined bookings are NOT deleted — the unique index is partial (`WHERE status != 'declined'`), so declined slots become available again automatically.
