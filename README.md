# Finance — Personal money dashboard

A modern, mobile-first personal finance web app built with **Next.js 15 (App
Router) + TypeScript**, styled with **Tailwind + shadcn/ui** in a Material
Design 3 spirit. Transactions are stored in a Google Sheet that lives on the
user's own Google Drive — no extra database required.

## Features

- **Dashboard** — current balance, monthly income/expenses, balance evolution,
  expenses by category, monthly comparison and % change vs. previous month.
- **Transactions** — full CRUD with form validation, filterable list (month,
  category, type, date range), sortable desktop table, mobile card list.
- **Categories** — per-category breakdown of income/expenses.
- **Reports** — 12-month trends and all-time analytics.
- **Mobile-first** — bottom tab bar on mobile, sidebar on desktop, large tap
  targets, fixed FAB for quick add, safe-area aware.
- **Material 3 vibes** — soft shadows, rounded corners, generous whitespace,
  Google blue accent.
- **Toasts, skeletons, empty states** for polished UX.

## Tech stack

| Concern         | Choice                                   |
| --------------- | ---------------------------------------- |
| Framework       | Next.js 15 (App Router)                  |
| Language        | TypeScript                               |
| Styling         | Tailwind CSS + shadcn/ui                 |
| Data fetching   | TanStack Query (React Query)             |
| Forms           | React Hook Form + Zod                    |
| Charts          | Recharts                                 |
| Icons           | lucide-react                             |
| Auth            | Auth.js (next-auth v5) — Google provider |
| Database        | Google Sheets API + Google Drive API     |

## Project structure

```
src/
├─ app/
│  ├─ layout.tsx, providers.tsx, globals.css
│  ├─ page.tsx                ← Dashboard
│  ├─ transactions/page.tsx
│  ├─ categories/page.tsx
│  ├─ reports/page.tsx
│  ├─ login/page.tsx
│  └─ api/
│     ├─ auth/[...nextauth]/route.ts
│     └─ transactions/
│        ├─ route.ts          ← GET, POST
│        └─ [id]/route.ts     ← PUT, DELETE
├─ components/
│  ├─ ui/                     ← shadcn primitives
│  ├─ layout/                 ← Sidebar, BottomNav, TopBar, AppShell
│  ├─ dashboard/              ← MetricCard, ChartCard, charts
│  ├─ transactions/           ← Form, Card, Table, Filters
│  └─ shared/                 ← EmptyState, Fab, PageHeader, …
├─ services/
│  ├─ sheets.ts               ← Google Sheets/Drive service layer
│  └─ transactions-client.ts  ← Browser fetch wrapper
├─ hooks/
│  ├─ use-transactions.ts     ← React Query hooks
│  ├─ use-media-query.ts
│  └─ use-toast.ts
├─ lib/
│  ├─ auth.ts                 ← NextAuth config (Google + scopes)
│  ├─ api-helpers.ts
│  ├─ analytics.ts            ← totals, timelines, breakdowns
│  └─ utils.ts                ← cn, formatters
└─ types/
   └─ transaction.ts          ← Zod schemas + types
```

## Google Sheets persistence

After login, the API:

1. Searches the user's Drive for a spreadsheet named **`Finance App Data`**
   via the Drive API (`drive.files.list`).
2. If it exists → uses that spreadsheet ID.
3. If it doesn't → creates a new spreadsheet with a `transactions` sheet and
   the header row (`id`, `date`, `description`, `amount`, `type`, `category`,
   `recurring`).

The spreadsheet ID is **never persisted client-side** — the Google account is
the source of truth, so the same user gets the same sheet on any device.

OAuth scopes requested:

- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`

The `drive.file` scope only grants access to files this app creates or that
the user explicitly opens with it — your other Drive files stay private.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Google OAuth

1. Create a project at [Google Cloud Console](https://console.cloud.google.com).
2. Enable **Google Sheets API** and **Google Drive API**.
3. Configure the **OAuth consent screen** and add the two scopes listed above.
4. Create an **OAuth 2.0 Client ID** (Web application) with:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
AUTH_SECRET=...        # openssl rand -base64 32
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

### 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>, sign in with Google, and start tracking.

## Scripts

| Command           | Description           |
| ----------------- | --------------------- |
| `npm run dev`     | Start dev server      |
| `npm run build`   | Production build      |
| `npm run start`   | Run production build  |
| `npm run lint`    | ESLint                |
| `npm run typecheck` | TypeScript check    |

## Notes

- Deleting a transaction uses the row index inside the sheet — concurrent
  edits from another tab while a delete is in flight could collide. The
  service re-fetches by ID before each mutation to keep this safe in
  practice.
- The Sheets API has per-user quota limits. React Query is configured with a
  30-second `staleTime` to avoid unnecessary refetches.
- For production, set `AUTH_URL` to your deployed origin and add the
  matching redirect URI in Google Cloud Console.
