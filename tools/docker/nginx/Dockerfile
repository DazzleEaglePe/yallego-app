# syntax=docker/dockerfile:1.7

FROM nginx:1.31.3-alpine

# El entrypoint oficial procesa las plantillas con envsubst. El filtro evita
# que variables propias de Nginx como $host o $request_uri sean sustituidas.
ENV NGINX_ENVSUBST_FILTER=^SERVER_NAME$

COPY default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --spider --no-check-certificate https://127.0.0.1/edge-health || exit 1

