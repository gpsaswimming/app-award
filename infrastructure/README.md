# Deployment

Two nodes, one Compose stack each. Images are public on GHCR, so nodes pull with
no login. Config is injected at runtime via `.env` files (git-ignored, chmod 600).

## App node (holds secrets)

```sh
cp ../services/api/api.env.example ./.env
$EDITOR ./.env              # Turnstile secret, SMTP creds, deadlines, recipient
chmod 600 ./.env
docker compose -f docker-compose.app.yml up -d
```

Restrict ingress to `:3000` so only the DMZ node can reach it (operator's firewall).

## DMZ node (zero credentials)

```sh
cp ../services/web/web.env.example ./.env
$EDITOR ./.env              # API_UPSTREAM (app node addr), Turnstile site key, deadlines
chmod 600 ./.env
docker compose -f docker-compose.web.yml up -d
```

Point the edge (`awards.gpsaswimming.org`) at `:8080` on this node.

## Notes

- The `.env` must sit next to the compose file you run (git-ignored). The
  `*.env.example` templates live under `../services/*/`. Compose reads `.env`
  **into the container** only because the service declares `env_file: [.env]` —
  without that stanza `.env` is used only for `${VAR}` substitution.
- After the first CI push, mark the two GHCR packages **public** once
  (`app-award-api`, `app-award-web`) so the nodes can pull anonymously.
- Deadlines are configured in **both** env files (the API enforces them; the web
  shows them and locks the form past close).
