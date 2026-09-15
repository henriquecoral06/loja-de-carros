#!/usr/bin/env bash
# Repõe os banners de demonstração do carrossel da home.
# Só para desenvolvimento local.
set -euo pipefail
cd "$(dirname "$0")/.."

DB=supabase_db_$(grep '^project_id' supabase/config.toml | cut -d'"' -f2)
SVC=$(supabase status -o env | grep SERVICE_ROLE_KEY | cut -d'"' -f2)
DIR=$(mktemp -d)

python3 scripts/gerar-banners.py "$DIR"

i=0
for f in "$DIR"/banner-*.png; do
  nome=$(basename "$f")
  curl -s -X POST "http://127.0.0.1:54321/storage/v1/object/marca/banners/$nome" \
    -H "Authorization: Bearer $SVC" -H "Content-Type: image/png" \
    --data-binary "@$f" > /dev/null
  docker exec "$DB" psql -U postgres -q -c \
    "insert into banners (url, alt, ordem) values ('http://127.0.0.1:54321/storage/v1/object/public/marca/banners/$nome', 'Pátio da revenda com veículos seminovos', $i);"
  i=$((i+1))
done

rm -rf "$DIR"
echo "Banners de demonstração publicados."
