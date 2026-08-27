#!/usr/bin/env sh

set -eu

temporary_directory="$(mktemp -d)"
trap 'rm -rf "$temporary_directory"' EXIT INT TERM

private_key_path="$temporary_directory/private.pem"
public_key_path="$temporary_directory/public.pem"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$private_key_path" >/dev/null 2>&1
openssl rsa -pubout -in "$private_key_path" -out "$public_key_path" >/dev/null 2>&1

printf 'JWT_PRIVATE_KEY=%s\n' "$(base64 < "$private_key_path" | tr -d '\n')"
printf 'JWT_PUBLIC_KEY=%s\n' "$(base64 < "$public_key_path" | tr -d '\n')"
printf 'ENCRYPTION_KEY=%s\n' "$(openssl rand -base64 32 | tr -d '\n')"
