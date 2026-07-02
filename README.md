# Hamro Ward — हाम्रो वडा

A civic issue reporter for Nepal. Snap a photo of a local problem (pothole, broken
streetlight, water supply issue, or garbage), and the app uses a vision AI to identify
and categorize it, then drafts a properly formatted formal Nepali **nibedan (निवेदन)**
addressed to your ward office. Each report gets a unique **tracking ID** (e.g.
`CMP-2026-0001`), is saved to a **Supabase** database, and appears in a feed with a
status workflow (Reported / Under Review / In Progress / Resolved) that's tracked over time.

Built with **React + TypeScript + Vite + Tailwind**, an **Express (TypeScript)** API proxy,
**Supabase** (Postgres + Storage) for persistence, **Leaflet/OpenStreetMap** for maps,
**Recharts** for the analytics dashboard, and **jsPDF + html2canvas** for PDF export.

## How it works

```
Browser (React + TypeScript + Vite + Tailwind)
   │                                   │
   │ photo / details                   │ reports, image upload, tracking IDs
   ▼                                   ▼
Express (TS) ──► OpenRouter        Supabase (Postgres + Storage)
 (holds the API key)               (RLS-protected; anon key in browser)
   anthropic/claude-sonnet-4.5
```

The Express backend (it only ever holds the OpenRouter key) exposes:

- `POST /api/categorize` — sends the photo to the vision model and returns
  `{ category, description_en, description_np, severity }`.
- `POST /api/recommend` — returns `{ recommended_action, suggested_priority, urgency }`.
- `POST /api/nibedan` — returns the formatted letter text; `language: 'np' | 'en'` selects a
  Nepali nibedan or a formal English complaint letter.

The browser talks to **Supabase directly** (via the publishable anon key, protected by
Row Level Security) for saving/reading reports, uploading images, tracking-ID lookup, and
status history.

## Prerequisites

- Node.js 18+ (uses the built-in global `fetch`)
- An OpenRouter API key — get one at https://openrouter.ai/keys
- A free Supabase project — https://supabase.com

## Project structure

```
civic-reporter-nepal/
├── backend/             # Express (TypeScript) proxy to OpenRouter
│   ├── server.ts
│   ├── .env.example
│   └── package.json
├── frontend/            # React + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── components/  # LandingPage, ReportPage, TrackPage, ReportsFeed, …
│   │   ├── hooks/       # useReports (loads/syncs from Supabase)
│   │   ├── lib/         # api.ts (AI), supabase.ts, reports.ts (data access)
│   │   ├── data/        # wards.ts (editable ward/category lists)
│   │   └── types.ts     # shared domain types
│   └── package.json
├── supabase/
│   └── schema.sql       # run this in the Supabase SQL editor
└── README.md
```

## Setup & run

### 1. Supabase (one-time)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql),
   and **Run**. This creates the tables (`reports`, `report_status_history`, `users`), the
   tracking-ID generator, the status-history triggers, RLS policies, and the public
   `report-images` storage bucket.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key —
   you'll paste them into the frontend `.env` below.

### 2. Backend (terminal 1)

```bash
cd backend
npm install
cp .env.example .env        # then edit .env and paste your real key
npm start
```

Edit `backend/.env`:

```
OPENROUTER_API_KEY=sk-or-your-real-key
PORT=5174
```

The backend runs on **http://localhost:5174**.

### 3. Frontend (terminal 2)

```bash
cd frontend
npm install
cp .env.example .env        # then paste your Supabase URL + anon key
npm run dev
```

Edit `frontend/.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The frontend runs on **http://localhost:5173**. Open that URL in your browser.

> The Vite dev server proxies `/api/*` calls to the backend on port 5174, so you don't
> need to configure any URLs. Just keep both running.
>
> Without Supabase credentials the AI flow still works, but saving/loading reports is
> disabled and the UI shows a friendly "configure Supabase" message.

## Using the app

The app has five pages:

- **`/`** — a landing page explaining the service, with a **Report an Issue** call to action.
- **`/report`** — the reporting flow and the reports feed (includes a map pin picker).
- **`/map`** — a public map of all complaints that have a pinned location.
- **`/dashboard`** — an analytics dashboard: totals, resolution rate, and charts.
- **`/track`** — look up a complaint by its tracking ID and see its status history.

1. From the landing page, click **Report an Issue**.
2. Upload a photo of a civic problem. The AI analyzes it and shows the category,
   a short description (English + Nepali), a severity, and a **recommended response**
   (action, priority, urgency).
3. Confirm/adjust the category, pick your **ward**, fill in location/name/contact, and
   optionally **tap the map to pin the exact spot** (saves latitude/longitude).
4. Click **Generate Nibedan** to produce the formal Nepali letter. Use the **नेपाली / English**
   language switch to also generate a formal **English complaint letter**. Use **Copy** or
   **Download .txt** for whichever is shown.
5. Click **Submit Report**. If a similar active complaint already exists nearby, you'll see
   a **duplicate warning** with a link to it — you can still **Submit anyway**. Otherwise the
   report is saved to Supabase (with its photo uploaded to storage) and you get a **tracking
   ID** like `CMP-2026-0001`. From the success screen you can **Download PDF** — a formal,
   print-ready निवेदन with the tracking ID and date.
6. Use the status dropdown on any report to move it through the workflow — every change is
   recorded in `report_status_history`. Look up a complaint anytime on the **Track** page
   (which also offers the PDF), and see all pinned complaints on the **Map** page.

> The map uses free OpenStreetMap tiles, so the **Map** and pin-picker need an internet
> connection at runtime.

## Customizing

- **Municipalities / wards:** edit `MUNICIPALITIES` in `frontend/src/data/wards.ts`. It
  ships with the Kathmandu Valley — Kathmandu Metropolitan City (32 wards), Lalitpur
  Metropolitan City (29), and Bhaktapur Municipality (10). Add more `{ name, nameNp,
  wardCount }` entries to extend coverage. Wards load dynamically from the selected
  municipality, and dropping a map pin reverse-geocodes (via OpenStreetMap Nominatim,
  `/api/reverse-geocode`) to auto-detect the municipality.
- **Model:** change `MODEL` in `backend/server.ts` (must be vision-capable for
  categorization). The original `anthropic/claude-3.5-sonnet` slug was retired by
  OpenRouter, so this uses `anthropic/claude-sonnet-4.5`.
- **Token budget:** requests cap `max_tokens` at 1500 (in `callOpenRouter`) so they fit
  within a limited key balance. If you hit a `402` credits error, lower it further or top
  up the key.

## Security note

- The **OpenRouter API key** is read from `backend/.env` and used **only** on the server.
  It never reaches the browser.
- The **Supabase anon key** is designed to be used in the browser — it's protected by the
  Row Level Security policies in `supabase/schema.sql`. (This demo's policies are
  intentionally permissive since there's no login; tighten them before a real deployment.)
- All `.env` files are git-ignored — never commit them.

## Roadmap

Evolving the MVP into a full civic-tech platform, phase by phase:

- **Phase 1 (done):** TypeScript migration, Supabase persistence, image storage, tracking
  IDs, status workflow + history, tracking-ID search.
- **Phase 2 (done):** PDF export of the nibedan (jsPDF + html2canvas) and an interactive
  map (Leaflet/OpenStreetMap) — pin-on-submit plus a public complaints map.
- **Phase 3 (done):** AI recommendations (action / priority / urgency via `/api/recommend`)
  and duplicate-complaint detection (warns when a similar active report exists nearby).
- **Phase 4 (done):** bilingual letters — generate the Nepali nibedan and/or a formal English
  complaint letter via a language switch; both are saved and exportable to PDF.
- **Phase 5 (done):** analytics dashboard (Recharts) — overview cards (total / resolved /
  pending / resolution rate), category pie, severity distribution, and monthly complaints
  charts. Heavy routes (Leaflet, Recharts, PDF) are lazy-loaded / code-split.

All planned features are now implemented. 🎉
