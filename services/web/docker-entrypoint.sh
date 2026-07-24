#!/bin/sh
set -e

: "${API_UPSTREAM:?API_UPSTREAM is required (scheme://host:port of app-award-api)}"

# Reverse-proxy target — substitute ONLY $API_UPSTREAM, preserve $nginx vars.
envsubst '${API_UPSTREAM}' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

# Public runtime config for the browser (no secrets).
envsubst '${TURNSTILE_SITE_KEY} ${SEASON} ${HURDLE_DEADLINE} ${LAMBERSON_DEADLINE}' \
  < /usr/share/nginx/html/config.js.template \
  > /usr/share/nginx/html/config.js

exec nginx -g 'daemon off;'
