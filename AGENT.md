# AGENT.md — Café Noir Gestion (V1)

Tool-agnostic version of the project rules, for any AI coding agent (Claude Code,
Cursor, Aider, Copilot Workspace, etc.). If you are Claude Code, `CLAUDE.md`
contains the same rules plus Claude-Code-specific notes — read that one instead if
both are present and in conflict, `CLAUDE.md` wins for Claude Code sessions.

## Project in one paragraph

A responsive web app (desktop/tablet/phone), French-only UI, single administrator
account, for **Café Noir – Menzah 9**, covering: sales, products/recipes/margins,
stock, suppliers/purchases/invoices, invoice OCR with manual validation, expenses,
employees, reports/alerts/audit log, and a public website + digital menu. Full
functional spec: `docs/cahier-des-charges.md` (the signed contract — do not exceed
or reinterpret it).

## The five rules that matter most

1. **Build only what's in `docs/cahier-des-charges.md`.** No multi-user, no roles,
   no online ordering/payment/reservation, no native app, no payroll engine, no
   biometric attendance, no SMS/email/WhatsApp notifications, no multi-site. Full
   exclusion list: `docs/out-of-scope.md`.

2. **No AI/LLM features, anywhere, ever**, including inside the OCR module. The
   invoice scanner (cahier des charges §6) is a classic OCR engine (e.g. Tesseract
   or an equivalent plain text-extraction API) feeding a **mandatory human review
   screen** — never an LLM call, never a "smart" auto-categorizer, never a
   forecasting/recommendation model. Alerts are simple rule/threshold checks, not
   ML. If you think a feature needs AI to work, it's probably out of scope —
   ask instead of adding one.

3. **Every write path goes through: manual form → preview/recap → explicit
   confirm.** This applies to manual entry, Excel/CSV import, and OCR-extracted
   invoice data alike. Nothing lands in the database without the human seeing
   exactly what will be saved and clicking confirm. OCR fields must be fully
   editable before confirmation, because handwriting and photos will be
   misread sometimes.

4. **Design for a non-technical café owner, in the fewest taps possible.** See
   `docs/ux-guidelines.md` for concrete rules and the click-budget table. Persistent
   navigation, one-tap quick actions for the most common tasks (add sale, add stock
   movement, scan invoice, mark attendance), plain French labels, big touch
   targets, always a visible cancel/back path, confirmation dialogs before anything
   destructive-looking.

5. **Nothing is hard-deleted; the audit log is append-only.** Sales/movements/
   invoices are corrected or cancelled, never erased, and every meaningful change
   is written to the activity log (§9.4) which no one — including the
   administrator — can edit or delete from the app.

## UI/UX redesign track (this version of the repo)

This copy of the project also carries a **visual and usability redesign** on top
of the same functional scope — see `docs/ui-ux-redesign.md`. Ground rules:

- The redesign changes **presentation only**. No functionality, business logic,
  module, permission, or workflow already defined in `docs/cahier-des-charges.md`
  or `docs/modules/01`–`11` may change because of the redesign.
- No permanent sidebar. Replace it with the "Navigation Rapide" quick-access
  system described in `docs/ui-ux-redesign.md` §3: a minimal trigger, reachable
  from anywhere, that opens an animated launcher exposing modules and their direct
  actions (e.g. selecting "Produits" immediately exposes Produits / Catégories /
  Ingrédients / Fiches techniques / Importer Excel-CSV / Nouveau produit).
- Design **tablet-first**; adapt intelligently to desktop (expanded workspace) and
  mobile (compact operational view) — never a naive shrink of the desktop layout.
  Large touch targets, comfortable spacing, drag & drop and swipe where relevant,
  clear visual feedback, no tiny controls.
- Light-mode, premium, clean. No emojis anywhere — professional interface icons
  only. Use photos/illustrations/visual cards only when they communicate faster
  than text.
- One new module is added as an explicit addendum beyond the original cahier des
  charges: **Gestion des tables** (`docs/modules/12-gestion-des-tables.md`) — a
  visual, spatial floor-plan editor (draggable tables, multiple spaces/floors,
  full CRUD, visual status, contextual selected-table panel). Treat it as an
  addendum, not part of the original signed scope, but build it fully and in the
  same design language as everything else.

## Where to look

- `docs/cahier-des-charges.md` — the original contract (source of truth for
  functionality).
- `docs/ui-ux-redesign.md` — the design/visual reference for this build (read this
  before touching any screen).
- `docs/modules/*.md` — one file per module, dev-oriented breakdown of each cahier
  des charges section into entities, fields, states, and flows, including the
  addendum module 12 (Gestion des tables).
- `docs/crud-matrix.md` — every entity and exactly what CRUD operations it supports.
- `docs/ux-guidelines.md` — non-technical-user UX rules and the click-budget table
  (still valid; its navigation section is superseded by `ui-ux-redesign.md` §3).
- `docs/out-of-scope.md` — the exclusion list, verbatim from §13, plus a note on
  the Gestion des tables addendum.
- `docs/git-ai-studio-workflow.md` — how this repo is pushed to Git and imported
  into Google AI Studio for development.

## Stack

Not prescribed by the client. If this repo is greenfield, propose a stack and
confirm with the user before scaffolding — don't assume. Whatever is chosen must
ship as a responsive web app that works in modern browsers (no native app).

## Currency & locale

Tunisian dinar (TND), all UI text in French, no language switcher, no multi-site,
one administrator account with full rights and no other user accounts (all per §1).
