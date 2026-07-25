# GPSA Awards & Scholarship Intake — Platform Design

**Repo folder:** `app-award/` · **Deploy:** self-hosted 2-tier — nginx (DMZ node) + Fastify (app node) · **Subdomain:** `award.gpsaswimming.org`
**Status:** DRAFT for review · **Revision:** 4 (2026-07-24)

---

## Overview

A single, standardized web intake for GPSA's two annual honors:

- **J. Kyle Hurdle Scholarship** — application by/for a graduating senior swimmer.
- **Kei Lamberson Outstanding Coach Award** — nomination of a coach by a GPSA family.

Both are today collected as free-form Word/Google docs emailed through GPSA Representatives to
`scholarships@gpsaswimming.org`. That process produces **non-standardized submissions** the
league president must hand-collate, and — for the scholarship — **hand-redact** before forwarding
to the reviewing families. This platform fixes both problems: it enforces a consistent structure
(including essay word count) at intake, and it emits a **forward-ready, correctly-blinded PDF** so
the president never edits a document.

### What v1 does

- Presents a landing page (`award.gpsaswimming.org`) with the two awards; the user picks one.
- Serves a structured form per award (identity fields as discrete inputs; essay in a word-count-
  enforced text area). **No file uploads.**
- On submit, sends **one email to the league president** containing the full submission in the body
  plus a **PDF attachment** named by a timestamp submission ID.
- The PDF is **blinded for Hurdle** (essay only) and **full for Lamberson** (nothing scrubbed).
- The president collects the PDFs and forwards them to the Hurdle / Lamberson families manually.

### What v1 deliberately does NOT do (see §12)

- No database, no object storage, no persisted PII of any kind.
- No in-system judging portal, no scoring/tally, no batched multi-entry packet.
- No payment, no appropriateness/AI screening, no background workers or queues.

This is a right-sized platform: a self-hosted, containerized 2-tier deployment (GHCR images, runtime
`.env`) with **no database, no object storage, and no AI/payment processing**. Because nothing is
persisted, both tiers are stateless. The intake volume is a handful of entries per award per season,
once a year — which is what keeps the design this small.

---

## Key design decisions

- **Stateless. Nothing is stored.** The submission is validated, rendered to an email + PDF, sent,
  and forgotten. There is no PII at rest, so there is nothing to secure at rest. This is the
  privacy model the president asked for and the reason the platform can be so small.
- **Two tiers, browser touches the DMZ only.** `app-award-web` (nginx, zero credentials) on the DMZ
  node serves the static landing + forms and reverse-proxies `/api/*`, same-origin. `app-award-api`
  (Fastify, sole secret holder) on the app node does Turnstile verify, validation, PDF render, and
  SMTP send, with no direct internet ingress. The internet-facing tier holds no credentials — every
  secret lives on the app node.
- **Blinding is enforced by construction, not by redaction.** Identity fields and essay text are
  captured separately, so the Hurdle PDF is generated from the essay alone — identifying fields
  never enter its code path. The email *body* (which the president keeps) carries full identity;
  the *PDF* (which the president forwards) is already safe to share.
- **Timestamp submission IDs.** e.g. `hurdle-20260727-1432`. Unique, arrival-sortable, and — unlike
  a sequential counter — requires no state. The ID is the join key between the president's email
  body and the forwarded PDF.
- **Text area, not file upload.** Kills format chaos and lets the server enforce the exact word
  band per award (Hurdle 300–700, Lamberson 250–750).
- **Email over SMTP.** A Node container can open SMTP directly, so v1 sends through GPSA's mail
  server (creds via runtime `.env`) — no third-party email API, no verified-destination limit.
  See §6.

---

## 1. Architecture

```
   Cloudflare edge ─▶ award.gpsaswimming.org
        │
        ▼  DMZ node
  ┌──────────────────────────────────────────────────┐
  │  app-award-web   (nginx · ZERO credentials)        │
  │   serves static: / /scholarship /coach-award       │
  │                  /submitted                         │
  │   reverse-proxies /api/*  ───────────────┐          │
  └────────────────────────────────────────── │ ────────┘
                            internal HTTP only │  (/api/* )
        ▼  App node                            │
  ┌────────────────────────────────────────── ▼ ────────┐
  │  app-award-api   (Fastify · sole secret holder)      │
  │   POST /api/submit                                   │
  │    ── Turnstile verify        ──HTTPS─▶ siteverify   │
  │    ── validate (fields, word count, deadline)        │
  │    ── render PDF (pdfkit, in-process)                │
  │    ── send email              ──SMTP──▶ (below)      │
  └──────────────────────────────────────────────────────┘
                                   │ email + PDF attachment (SMTP)
                                   ▼
                    League President's inbox  (the "store")
                                   │ president forwards PDFs
                                   ▼
                 Hurdle family / Lamberson family (offline review)
```

Neither tier holds application state between requests; both containers can be redeployed or
restarted at will.

### Notes on the runtime

- **Browser touches the DMZ only.** `app-award-web` (nginx on the DMZ node) serves static assets and
  reverse-proxies `/api/*` to the app tier — **zero credentials**, same-origin, no CORS.
- **`app-award-api` is the sole secret holder** (SMTP + Turnstile secret), runs on the app node, and
  has **no direct internet ingress** — it is reachable only from the DMZ proxy over the internal
  network. Its only egress is the Turnstile siteverify call and SMTP.
- **SMTP is available** (Node, not a Worker), so email goes straight through GPSA's mail server (§6)
  — no third-party email API.
- **PDF generated in-process** with [`pdfkit`](https://pdfkit.org) (or `pdf-lib`) — no headless
  browser, and no CPU cap on a full container.

---

## 2. Submission flow (happy path)

1. User opens `award.gpsaswimming.org`, reads the two award cards, clicks **Apply / Nominate**.
2. The form loads (`/scholarship` or `/coach-award`). A live word counter tracks the essay; the
   Turnstile widget renders.
3. User submits. Client-side checks (required fields, word band, Turnstile solved) are UX only.
4. `POST /api/submit` reaches `app-award-api` (proxied same-origin from the DMZ tier):
   a. Verify the Turnstile token against Cloudflare (fetch).
   b. Reject if the award's **deadline has passed** (server clock is authoritative).
   c. Validate required fields present and essay word count within band; escape all text.
   d. Mint the submission ID: `{award}-{YYYYMMDD}-{HHmm}` in league-local time.
   e. Render the **PDF** for the award (blinded rules in §5).
   f. Send **one email** to the president: full submission in the HTML body + PDF attachment
      named `{submissionID}.pdf`.
5. On success the user is sent to `/submitted` (confirmation + what happens next).
6. The president later collects the PDFs and forwards them to the reviewing families.

Any failure (Turnstile, deadline, validation, email) returns a clear error to the form; nothing
partial is sent.

---

## 3. The two forms — field schemas

Fields are transcribed from the 2025 paper forms.

### 3a. Hurdle Scholarship (`/scholarship`)

| Field | Input | Required | Notes |
|---|---|---|---|
| Applicant name | text | ✔ | identity — body only |
| Street address | text | ✔ | identity — body only |
| Apt / suite / unit | text | | identity — body only |
| City | text | ✔ | identity — body only |
| State | select (US states) | ✔ | identity — body only |
| ZIP code | text | ✔ | identity — body only; `NNNNN` or `NNNNN-NNNN` |
| Telephone | tel | ✔ | identity — body only |
| Date of birth | date | ✔ | identity — body only |
| Pool represented | select (18 teams) | ✔ | identity — body only |
| Years in GPSA | number | ✔ | body only |
| Favorite stroke | text | | body only |
| School to attend | text | ✔ | body only |
| Already accepted? | radio yes/no | ✔ | body only |
| Intended major | text | | body only |
| **Essay** | textarea | ✔ | **300–700 words**; goes in body **and** PDF |

**Essay prompt (season-configurable):** "What positive impact has summer swimming had on your
life? How do you intend to pay this forward?"

### 3b. Lamberson Coach Award (`/coach-award`)

| Field | Input | Required | Notes |
|---|---|---|---|
| Nominated coach name | text | ✔ | in body **and** PDF |
| Pool represented | select (18 teams) | ✔ | in body **and** PDF |
| Essay writer name | text | ✔ | in body **and** PDF |
| Relationship to coach | text | ✔ | in body **and** PDF |
| Telephone (essay writer) | tel | ✔ | in body **and** PDF |
| **Essay** | textarea | ✔ | **250–750 words**; in body **and** PDF |

**Essay prompt (season-configurable):** "How has your coach demonstrated joy, compassion and
companionship in connecting with all swimmers on your team this summer?"

A `Date of application` value is not collected from the user; the server stamps submission
date/time via the ID.

---

## 4. Blinding matrix

The single most important content rule. Enforced server-side by generating each award's PDF from
a distinct field set — the Hurdle PDF renderer is never handed identity fields.

| | **Email body** (president keeps) | **PDF attachment** (president forwards to family) |
|---|---|---|
| **Hurdle scholarship** | all fields + essay | **submission ID + essay + word count only** — no applicant identity |
| **Lamberson coach award** | all fields + essay | **full submission** — coach, essay writer, relationship, phone, pool, essay; nothing scrubbed |

---

## 5. Validation & deadline

- **Required fields** per §3; reject on any missing required value.
- **Word count** computed server-side (`essay.trim().split(/\s+/)`); must fall within the award's
  band. The client shows a live counter, but the server decision is authoritative.
- **Deadline:** each award has a configured close datetime (§7). A POST after the deadline is
  rejected with a clear message; the form JS also disables submission past the deadline as a
  courtesy. Server clock wins.
- **Escaping:** every user-supplied string is HTML-escaped before insertion into the email body.
  PDF text is drawn literally (no markup surface). No user input is ever placed in an email header.

---

## 6. Email delivery

The container runs Node, so it sends over **SMTP** using `nodemailer` and the portfolio's existing
mail creds (injected via runtime `.env`). No third-party email API, no verified-destination limit,
no Worker constraints. If we later want the platform to email the families **directly** (v2), the
same SMTP path already supports arbitrary recipients — no change needed.

**The email:**
- **To:** president (config `PRESIDENT_EMAIL`). Optional `NOTIFY_EMAIL` cc.
- **Subject:** `GPSA <Award> submission — <submissionID>`.
- **Body (HTML):** every collected field, labeled, followed by the full essay. Identity included.
- **Attachment:** `<submissionID>.pdf`, blinded per §4.

---

## 7. Configuration & secrets

Config is injected at **runtime via per-container `.env` files** (git-ignored, chmod 600;
`.env.example` committed). **The repo holds no secrets, and the DMZ tier holds none either.** Every
secret lives only on the app tier.

**`app-award-web` (DMZ node)** — no credentials:

| Name | Kind | Purpose |
|---|---|---|
| `TURNSTILE_SITE_KEY` | plaintext | public widget key, injected into the static form (nginx envsubst) |
| `API_UPSTREAM` | plaintext | internal address of `app-award-api` for the `/api/*` reverse proxy |

**`app-award-api` (app node)** — sole secret holder:

| Name | Kind | Purpose |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | **secret** | server-side Turnstile verification |
| `SMTP_HOST` / `SMTP_PORT` | plaintext | GPSA mail server |
| `SMTP_USER` / `SMTP_PASS` | **secret** | dedicated scoped SMTP account |
| `MAIL_FROM` | plaintext | from/envelope address, e.g. `awards@gpsaswimming.org` |
| `PRESIDENT_EMAIL` | plaintext | recipient of every submission |
| `NOTIFY_EMAIL` | plaintext (optional) | optional cc |
| `SEASON` | plaintext | e.g. `2026`, for labels/prompts |
| `HURDLE_DEADLINE` / `LAMBERSON_DEADLINE` | plaintext | ISO datetime + tz, e.g. `2026-07-26T23:59:59-04:00` |
| `HURDLE_PROMPT` / `LAMBERSON_PROMPT` | plaintext (optional) | season essay prompt (default in code) |

The only real **secrets** are `TURNSTILE_SECRET_KEY` and `SMTP_USER`/`SMTP_PASS` — all on the app
tier. The internet-facing DMZ tier stays credential-free.

---

## 8. Frontend

Follows the shared portfolio conventions (per root `CLAUDE.md`):

- Shared CSS via absolute URL: `https://css.gpsaswimming.org/gpsa-tools-common.css`. No local CSS.
- Logos/portraits from `assets.gpsaswimming.org` (the Hurdle and Lamberson portraits currently in
  `docs-wiki/assets/scholarships/` should be promoted to `web-assets`).
- Inter font, brand navy `#002366` / red `#d9242b`, `max-w-7xl mx-auto` container, `showToast()`,
  `escapeHtml()` on any echoed input.

**Landing (`/`):** two award cards side by side. Each card: portrait, award name, one-line
description, amount, eligibility summary, this season's essay prompt, deadline, and a primary
button into the form. Content mirrors the wiki pages (`lamberson-award.md`, `hurdle-scholarship.md`)
so the two stay consistent — link out to the wiki for full detail.

**Forms (`/scholarship`, `/coach-award`):** the §3 fields, a textarea with a live word counter that
turns green inside the band and red outside it, the Turnstile widget, and a submit button disabled
until the widget is solved and the count is in band. Past the deadline the form renders read-only
with a "submissions closed" notice.

**Confirmation (`/submitted`):** "Your submission was received" + a plain-language note that a
representative/president handles the next step and winners are announced at City Meet.

---

## 9. Deployment

Self-hosted 2-tier via Docker + GHCR (not Cloudflare Pages — this platform needs SMTP and an origin
container of its own).

- **Repo:** `github.com/gpsaswimming/app-award` — **its own repo** (see §10 on visibility).
- **Images (GHCR, secret-free, env-agnostic):** `ghcr.io/gpsaswimming/app-award-web` and
  `ghcr.io/gpsaswimming/app-award-api`.
- **Structure:**
  ```
  app-award/
    services/
      web/    nginx: static site + reverse-proxy /api/*  (site config via envsubst)
        public/  index.html, scholarship.html, coach-award.html, submitted.html
      api/    Fastify: POST /api/submit — Turnstile, validate, pdfkit, nodemailer(SMTP)
    infrastructure/
      docker-compose.web.yml   runs on the DMZ node
      docker-compose.app.yml   runs on the app node
      *.env.example
    docs/DESIGN.md
    CLAUDE.md
  ```
- **CI → GHCR:** GitHub Actions builds + pushes both images on merge to `main` via the automatic
  `GITHUB_TOKEN`; images are **public** so the nodes pull with no login. No app secrets in CI.
- **Runtime config:** per-node `.env` files (§7), git-ignored, chmod 600.
- **Edge:** `award.gpsaswimming.org` routes through the Cloudflare edge to `app-award-web` on the
  DMZ node.

### Node-to-node traffic model (artifact only — firewall rules are the operator's)

```
browser ──HTTPS──▶ CF edge ──▶ app-award-web (DMZ node)
                                   │ internal HTTP, /api/* only
                                   ▼
                               app-award-api (app node)
                                   ├──HTTPS──▶ Cloudflare Turnstile siteverify
                                   └──SMTP───▶ GPSA mail server ──▶ president inbox
```

`app-award-api` accepts ingress **only** from `app-award-web`; its egress is Turnstile siteverify +
SMTP. The DMZ tier makes no outbound calls of its own beyond proxying. **Egress policy is enforced by
the operator's network firewall — this model informs those rules; it does not define them.**

---

## 10. Open items (resolve before / during build)

1. **Dedicated SMTP account.** Provision a scoped mailbox/relay credential (e.g. `awards@`) for the
   app tier rather than reusing a broad account — limits blast radius if the app tier is compromised.
2. **Deadline values + season prompts** for 2026 (config, not design).
3. **President recipient address** — `scholarships@gpsaswimming.org` vs. a personal address.
4. **Team list for "Pool represented"** — reuse the canonical 18-team list.

*Resolved by the 2-tier split:* the rev-2 credential-placement concern (secrets on an internet-
facing container) — secrets now live only on the app tier; the DMZ tier is credential-free.

---

## 11. Future enhancements (deferred — not v1)

- **Direct-to-family delivery.** Switch email to Resend/SES and send the blinded PDFs straight to
  the reviewing families (removes the president's manual forward). Needs domain verification.
- **Batched review packet.** Compile all of an award's blinded entries into a single PDF at the
  deadline — genuinely nice for a "sit down and pick winners" session, but it requires accumulating
  entries between first-submission and close, i.e. reintroducing a small store. Conscious tradeoff
  against v1's zero-storage stance.
- **In-system judging portal.** Families log in, read blinded entries, score/rank, auto-tally.
  Highest value for "select winners," highest cost (persistent store + access control). Only if the
  email-and-forward loop proves painful.
- **GPSA Rep gating.** If the league wants to preserve the "rep submission = recommendation" step,
  add light rep identification. v1 keeps intake open (Turnstile-gated) with rep/pool captured as a
  field.
