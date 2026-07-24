# CLAUDE.md

Guidance for working in this repo. See [`docs/DESIGN.md`](docs/DESIGN.md) for the full design.

## What this is

`app-award` is a stateless web intake for two GPSA honors — the **J. Kyle Hurdle Scholarship** and
the **Kei Lamberson Outstanding Coach Award** — served at `award.gpsaswimming.org`. A submission is
validated, rendered to an email + a forward-ready PDF, sent to the league president, and forgotten.
**Nothing is persisted.**

## Layout

```
services/api/   Fastify — POST /api/submit (Turnstile, validate, pdfkit, nodemailer). Sole secret holder.
services/web/   nginx — static landing + forms, reverse-proxies /api/*. Zero credentials.
infrastructure/ docker-compose.{app,web}.yml + deploy README.
docs/DESIGN.md  Full design.
```

Two tiers: `app-award-web` (DMZ node) proxies `/api/*` to `app-award-api` (app node). The API has no
direct internet ingress. Config is injected at runtime via `.env` files; images are secret-free.

## Invariants (do not break)

- **Stateless** — no database, no object storage, no persisted PII. If a feature needs to store a
  submission, stop and revisit the design.
- **Blinding by construction** — the Hurdle PDF is built from the essay alone. `pdfBodyFields()` in
  `services/api/src/pdf.js` returns `[]` for any award with `pdfIncludesFields: false`. Identity
  fields must never reach the blinded PDF.
- **DMZ holds zero credentials** — all secrets live only on the app tier (`api.env`).
- **Escape all user input** in the email HTML body; never place user input in an email header.
- **Server is authoritative** on Turnstile, deadline, required fields, and essay word count. Client
  checks are UX only.

## Working on the API

```sh
cd services/api
npm install
npm test          # node --test — keep this green
npm start         # needs a populated api.env in the environment
```

Award field schemas, word bands, and the blinding flag live in `src/constants.js` — the single
source of truth. The web team list in `services/web/public/app.js` mirrors it.

## Development workflow

- **Never commit to `main`.** All work on a feature branch, opened as a PR to `main`.
- **One logical change per PR.**
- Delete the branch on merge.
- CI (`build-images.yml`) runs the API tests, then builds + pushes both images to GHCR on merge.
