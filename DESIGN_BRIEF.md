# Hamro Ward — UI Redesign Brief

A complete description of the system, its flow, and every screen — written so you (or a
design agent like Stitch / Figma AI / v0) can produce a polished, consistent UI to implement.

> **How to use this:** paste **Part 1–3** once to set context + style, then paste **each
> screen in Part 4** one at a time to generate that screen. Always tell the tool the
> platform ("responsive web app, light theme").

---

## PART 1 — What the system is

**Hamro Ward (हाम्रो वडा)** is an **AI-powered civic issue reporting platform for the
Kathmandu Valley, Nepal.** A citizen photographs a local problem (pothole, broken
streetlight, water-supply issue, garbage). AI identifies and categorizes it, rates
severity, suggests an action, and drafts a **formal complaint letter** — a Nepali *nibedan*
(निवेदन) and/or an English version — addressed to the correct **ward office**. Each report
gets a unique **tracking ID**, is saved to a database, plotted on a map, and moves through a
status workflow that anyone can track.

**Coverage:** the whole Kathmandu Valley — **Kathmandu Metropolitan City (32 wards),
Lalitpur Metropolitan City (29 wards), Bhaktapur Municipality (10 wards)**.

**Core features to surface in the design:**
- Photo upload → **AI detection** (category, EN + NP description, severity)
- **AI recommendation** (suggested action, priority, response urgency)
- **Municipality + ward** selection (ward list depends on municipality); a **map pin** that
  reverse-geocodes to auto-detect the municipality
- **Bilingual letter generation** (Nepali nibedan / English letter) with a language switch
- **Duplicate detection** ("a similar complaint may already exist nearby")
- **Tracking ID** (e.g. `CMP-2026-0001`) + **status workflow** (Reported → Under Review →
  In Progress → Resolved) with full history
- **PDF export** of the formal letter
- **Analytics dashboard** (totals, resolution rate, charts) with municipality filter
- **Public complaints map** and a **tracking lookup**

**Audience & tone:** everyday Nepali citizens (all ages, mostly mobile) + ward-office staff.
Tone = **trustworthy, official, civic-tech** — a clean government digital service that feels
credible enough that people believe it reaches the authorities. Friendly, not flashy.

---

## PART 2 — Brand & visual direction

- **Personality:** clean, modern, calm, official. "Government service done well."
- **Primary color:** a confident **royal/civic blue** (#2563eb) for primary actions, links,
  active states, key numbers.
- **Neutrals:** slate/gray for text and surfaces; very light gray-blue page background.
- **Semantic colors (must be consistent everywhere):**
  - Severity → Low = green, Medium = amber, High = red
  - Status → Reported = gray, Under Review = violet, In Progress = amber, Resolved = green
  - Category → blue chips
- **Surfaces:** white cards, subtle 1px borders, soft shadows, generous rounded corners
  (≈16px / rounded-2xl). Consistent radius + shadow across all cards.
- **Typography:** clean sans-serif for UI (e.g. Inter). **Must include a Devanagari font**
  (e.g. Noto Sans Devanagari) — Nepali and English appear together constantly; Nepali must
  look first-class, with comfortable line-height for long letter text.
- **Iconography:** simple line icons; category emojis/icons (🛠️ road, 💡 streetlight,
  🚰 water, 🗑️ waste).
- **Layout:** **mobile-first**, fully responsive, generous spacing, strong hierarchy, large
  tap targets. Accessible: good contrast, labeled fields, visible focus rings, keyboard-able.
- **States:** design real **loading (skeletons), empty, error, and success** states — never
  blank screens.

---

## PART 3 — Global elements

- **Top navbar (sticky, white):** left = 🏛️ logo "Hamro Ward (हाम्रो वडा)". Center =
  **Dashboard · Reports · Map · Track**. Right = primary **"Report an Issue"** button (+ a
  small user avatar). Collapses to a tidy mobile layout.
- **Footer:** "Hamro Ward (हाम्रो वडा) · © Government of Nepal · Digital Governance Portal"
  with Privacy / Terms / Accessibility / Contact links.
- **Reusable components:** Status pill, Severity badge, Category chip, KPI/stat card,
  chart card, report card, empty-state block, skeleton loader, toast/confirmation.

---

## PART 4 — Screens

### Screen 1 — Landing (`/`)
Marketing-style home that builds trust.
- **Hero:** "OFFICIAL CITIZEN PORTAL" badge; headline "Digital Public Infrastructure **for
  Every Citizen**"; a Nepali subtitle; buttons **Report an Issue** + **View Ward Map**; a
  hero image/card of the city with a "Live status" chip.
- **Stats band:** Issues Resolved · Citizen Satisfaction · Active Wards · Avg. Response Time.
- **"Common Civic Issues":** 4 category cards (Potholes, Streetlights, Water Supply, Garbage)
  with icon + short description.
- **"How it Works" (dark section):** 3 steps — 01 Capture, 02 AI Detects, 03 Submit.
- **CTA band** + footer.

### Screen 2 — Report an issue (`/report`)  ★ the core, most important screen
A **two-column layout** (stacks on mobile). Left = inputs, Right = a sticky live letter preview.

**Left column (vertical cards):**
1. **Upload Evidence** — a drag-and-drop zone ("Drag & drop a photo, or click to browse,
   PNG/JPG up to 10MB"), then a preview thumbnail.
2. **AI detection result** (after upload; show an "Analyzing photo…" loading state) — a card
   showing detected **category**, **severity** (colored), an **"AI Analysis Complete"**
   marker, and the description in **English + Nepali**.
3. **AI Recommendation** card (blue-tinted) — "Recommended response": suggested **action**,
   **priority** pill, and **urgency** (e.g. "Within 48 hours").
4. **Pin Location (optional)** — an interactive map; tapping drops a pin and shows a
   "📍 Detected: <Municipality>" note (reverse-geocoded).
5. **Issue Details** form — fields in this order: **Municipality** (dropdown), **Ward
   Number** (dropdown — options depend on the municipality), **Issue Category**, **Severity**,
   **Citizen ID / Phone**, **Specific Location / Landmark**, **Reporter Name**, **Extra
   details** (textarea).

**Right column (sticky "Official Letter Preview" panel):**
- Header "OFFICIAL LETTER PREVIEW" with a **नेपाली / English** language toggle.
- The generated letter in a scrollable, document-like box (Devanagari rendered beautifully).
  Before generation: a "Generate letter" button / empty hint.
- **Copy** and **Download .txt** actions.
- A **duplicate warning** (amber) when a similar complaint exists nearby, listing it with a
  link, plus a **"Submit anyway"** option.
- A large **Submit Complaint** button + a short disclaimer line.

### Screen 3 — Submission success
- Big green check, "Complaint Submitted Successfully".
- Prominent **Tracking ID** card (e.g. `CMP-2026-0001`).
- Buttons: **Download PDF**, **Track Progress**, **Submit Another**.

### Screen 4 — Reports (`/reports`)
- Page title "Recent reports" + total count + "Report an Issue" button.
- **Grid of report cards**, each scannable at a glance: photo thumbnail, tracking ID, date,
  **category chip**, **severity badge**, **municipality + ward**, location, and an editable
  **status dropdown** (color-coded).
- Empty + loading (skeleton) states.

### Screen 5 — Complaints map (`/map`)
- Title + a **severity legend** (High/Medium/Low colored dots).
- A clean, modern basemap filling the area, with **teardrop pins colored by severity**.
- Click a pin → popup: tracking ID, category, severity, status, municipality + ward,
  location, thumbnail, "Track this complaint →".
- Auto-frames all pins; caption "X of Y reports pinned". Empty state when none.

### Screen 6 — Analytics dashboard (`/dashboard`)
Modern-SaaS-style but government-appropriate.
- Header "System Overview" + a **Municipality filter** dropdown + **Export CSV**.
- **KPI cards:** Total Complaints · Resolved (with progress bar) · Pending (progress bar) ·
  **Resolution Rate** (highlighted blue card).
- **Charts:** Complaint Volume Trends (bar, monthly) · Category Distribution (donut with
  center total) · Severity Breakdown (horizontal bars) · Recent Submissions (table:
  citizen/ticket, category, severity, status pill, time-ago).
- Loading skeletons + empty states.

### Screen 7 — Track a complaint (`/track`)
- Title + a tracking-ID **search bar**.
- On result, a **two-column layout**:
  - Left: a "Complaint found" card with the **Tracking ID** + **Download PDF**, and a
    **vertical status timeline** (Reported → Under Review → In Progress → Resolved) with
    timestamps; completed steps checked, current step highlighted.
  - Right: a **report detail card** (photo with a status badge, category + severity + status,
    description, details: category, location, assigned ward office = municipality + ward,
    reported date), the **AI recommendation**, and a "What happens next?" info box.
- Clear **not-found** empty state.

### Screen 8 — PDF document (print layout, not a screen)
A formal A4 letter: letterhead (municipality + ward office), meta row (tracking ID +
submission date), centered title **निवेदन** (or "Complaint Letter"), the letter body, a
details table, and a **signature placeholder**.

---

## PART 5 — End-to-end user flow

1. Land on home → **Report an Issue**.
2. Upload a photo → AI shows category + EN/NP description + severity + a recommendation.
3. (Optional) drop a **map pin** → municipality auto-detected.
4. Choose **municipality** → **ward** (wards depend on municipality), fill location, name,
   contact.
5. Generate the letter in **Nepali and/or English** → review → Copy / Download .txt.
6. **Submit** → duplicate check → get a **Tracking ID** + success screen → **Download PDF**.
7. The report appears in **Reports**, on the **Map**, and in the **Dashboard** analytics.
8. Anyone can **Track** it by ID and watch the **status** progress; staff change status via
   the dropdown (every change is logged).

---

## PART 6 — Notes for the designer

- **Bilingual by design:** Nepali (Devanagari) + English coexist everywhere; never let
  Devanagari look like an afterthought, and give letter text comfortable line-height.
- **Consistency is the priority:** identical colors for status & severity across feed, map,
  dashboard, and tracking; one card style; one button system; one spacing scale.
- **Valley-wide:** municipality is a first-class field — show **Municipality + Ward +
  Location** wherever a report is displayed.
- **Mobile-first:** most citizens report from a phone, often outdoors — big targets, single
  column on small screens, two columns on desktop for Report and Track.
- **Trust > flash:** it should read like a credible government service, clean and calm.
