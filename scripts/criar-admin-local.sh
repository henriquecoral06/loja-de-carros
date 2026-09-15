#!/usr/bin/env bash
# Cria o usuário administrador do ambiente local.
# Só para desenvolvimento: usa a service role key do Supabase local, que
# é pública e igual em toda instalação. Nunca use este script em produção.
set -euo pipefail
cd "$(dirname "$0")/.."

EMAIL=${1:-admin@revenda.local}
SENHA=${2:-revenda123}
SVC=$(supabase status -o env | grep SERVICE_ROLE_KEY | cut -d'"' -f2)

curl -s -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
  -H "Authorization: Bearer $SVC" -H "apikey: $SVC" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\",\"email_confirm\":true,\"user_metadata\":{\"nome\":\"Administrador\"}}" \
  | head -c 200
echo
echo "Usuário local: $EMAIL / $SENHA"
