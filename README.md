# app-award

Standardized web intake for the Greater Peninsula Swimming Association's two annual honors:

- **J. Kyle Hurdle Scholarship** — application by/for a graduating senior swimmer.
- **Kei Lamberson Outstanding Coach Award** — nomination of a coach by a GPSA family.

Served at **`award.gpsaswimming.org`**. A landing page presents both awards; the user picks one and
completes a structured form (essay in a word-count-enforced text area, no file uploads). On submit,
the platform emails the league president the full submission plus a **forward-ready PDF** — blinded
for the scholarship, full for the coach award — so entries arrive standardized and ready for the
reviewing families.

**Stateless by design:** nothing is stored. Each submission is validated, rendered to an email +
PDF, sent, and forgotten — there is no database and no persisted applicant data.

## Architecture (summary)

Self-hosted, containerized, two tiers:

- **`app-award-web`** (nginx, DMZ) — serves the static landing + forms and reverse-proxies `/api/*`.
  Holds zero credentials.
- **`app-award-api`** (Fastify, app tier) — Turnstile verification, validation, PDF rendering, and
  SMTP delivery. Sole holder of secrets; no direct internet ingress.

Full design, data model, and blinding rules: **[`docs/DESIGN.md`](docs/DESIGN.md)**.

## Status

Design complete (rev 4); build in progress.

## Development

All work happens on feature branches opened as PRs to `main` — one logical change per PR. Never
commit directly to `main`.
