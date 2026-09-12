#!/usr/bin/env sh

set -eu

output_path="${1:-/opt/yallego/config/production.env}"
public_url="${PUBLIC_URL:-https://pay.ecabot.site}"
server_name="${SERVER_NAME:-pay.ecabot.site}"

if [ -e "$output_path" ]; then
  echo "Refusing to overwrite existing environment file: $output_path" >&2
  exit 1
fi

temporary_directory="$(mktemp -d)"
trap 'rm -rf "$temporary_directory"' EXIT INT TERM

private_key_path="$temporary_directory/private.pem"
public_key_path="$temporary_directory/public.pem"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 \
  -out "$private_key_path" >/dev/null 2>&1
openssl rsa -pubout -in "$private_key_path" -out "$public_key_path" \
  >/dev/null 2>&1

umask 077
{
  printf 'DEPLOY_ENV=production\n'
  printf 'SERVER_NAME=%s\n' "$server_name"
  printf 'PUBLIC_URL=%s\n' "$public_url"
  printf 'HTTP_PORT=8080\n'
  printf 'HTTPS_PORT=8443\n'
  printf 'TLS_FULLCHAIN_PATH=/etc/letsencrypt/live/dashboard.ecabot.site/fullchain.pem\n'
  printf 'TLS_PRIVATE_KEY_PATH=/etc/letsencrypt/live/dashboard.ecabot.site/privkey.pem\n'
  printf 'API_IMAGE=yallego-api:prod\n'
  printf 'MIGRATIONS_IMAGE=yallego-migrations:prod\n'
  printf 'DASHBOARD_IMAGE=yallego-dashboard:prod\n'
  printf 'PROXY_IMAGE=yallego-proxy:prod\n'
  printf 'POSTGRES_DB=yallego\n'
  printf 'POSTGRES_SUPERUSER=yallego\n'
  printf 'POSTGRES_SUPERUSER_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'APP_DATABASE_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'JWT_PRIVATE_KEY=%s\n' "$(base64 < "$private_key_path" | tr -d '\n')"
  printf 'JWT_PUBLIC_KEY=%s\n' "$(base64 < "$public_key_path" | tr -d '\n')"
  printf 'ENCRYPTION_KEY=%s\n' "$(openssl rand -base64 32 | tr -d '\n')"
  printf 'DEPLOY_LOG_LEVEL=info\n'
  printf 'SMTP_HOST=127.0.0.1\n'
  printf 'SMTP_PORT=587\n'
  printf 'SMTP_SECURE=false\n'
  printf 'SMTP_USER=\n'
  printf 'SMTP_PASSWORD=\n'
  printf 'MAIL_FROM=no-reply@ecabot.site\n'
  printf 'GRAFANA_PORT=3002\n'
  printf 'GRAFANA_ADMIN_USER=admin\n'
  printf 'GRAFANA_ADMIN_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  printf 'PROMETHEUS_RETENTION=15d\n'
  printf 'API_HOST_PORT=3101\n'
  printf 'DASHBOARD_HOST_PORT=3100\n'
} > "$output_path"

chmod 600 "$output_path"
echo "Created production environment: $output_path"
