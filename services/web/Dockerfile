FROM nginx:1.27-alpine

# envsubst ships with the nginx image (used for its template feature).
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY public /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
