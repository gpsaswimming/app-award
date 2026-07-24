# Deployment

Two nodes, one Compose stack each. Images are public on GHCR, so nodes pull with
no login. Config is injected at runtime via `.env` files (git-ignored, chmod 600).

## App node (holds secrets)

```sh
cp ../services/api/api.env.example ./api.env
$EDITOR ./api.env            # Turnstile secret, SMTP creds, deadlines, recipient
chmod 600 ./api.env
docker compose -f docker-compose.app.yml up -d
```

Restrict ingress to `:3000` so only the DMZ node can reach it (operator's firewall).

## DMZ node (zero credentials)

```sh
cp ../services/web/web.env.example ./web.env
$EDITOR ./web.env            # API_UPSTREAM (app node addr), Turnstile site key, deadlines
chmod 600 ./web.env
docker compose -f docker-compose.web.yml up -d
```

Point the edge (`award.gpsaswimming.org`) at `:8080` on this node.

## Notes

- `api.env` and `web.env` must sit next to the compose file you run (both are
  git-ignored). The `.env.example` templates live under `../services/*/`.
- After the first CI push, mark the two GHCR packages **public** once
  (`app-award-api`, `app-award-web`) so the nodes can pull anonymously.
- Deadlines are configured in **both** env files (the API enforces them; the web
  shows them and locks the form past close).
