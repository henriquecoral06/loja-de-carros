#!/usr/bin/env bash
# Repõe as fotos de demonstração depois de um `supabase db reset`.
# Só para desenvolvimento local: gera placeholders e vincula aos DEMO-001/002.
set -euo pipefail
cd "$(dirname "$0")/.."

DB=supabase_db_$(grep '^project_id' supabase/config.toml | cut -d'"' -f2)
SVC=$(supabase status -o env | grep SERVICE_ROLE_KEY | cut -d'"' -f2)
DIR=$(mktemp -d)

python3 scripts/gerar-placeholders.py "$DIR"

vincular() {
  local id=$1 arquivo=$2 ordem=$3 capa=$4 nome
  nome=$(basename "$arquivo")
  curl -s -X POST "http://127.0.0.1:54321/storage/v1/object/veiculos/$id/$nome" \
    -H "Authorization: Bearer $SVC" -H "Content-Type: image/png" \
    --data-binary "@$arquivo" > /dev/null
  docker exec "$DB" psql -U postgres -q -c \
    "insert into veiculo_fotos (veiculo_id, url, ordem, capa) values ('$id', 'http://127.0.0.1:54321/storage/v1/object/public/veiculos/$id/$nome', $ordem, $capa);"
}

COROLLA=$(docker exec "$DB" psql -U postgres -t -A -c "select id from veiculos where codigo_interno='DEMO-001';")
TCROSS=$(docker exec "$DB" psql -U postgres -t -A -c "select id from veiculos where codigo_interno='DEMO-002';")

vincular "$COROLLA" "$DIR/corolla-1.png" 0 true
vincular "$COROLLA" "$DIR/corolla-2.png" 1 false
vincular "$COROLLA" "$DIR/corolla-3.png" 2 false
vincular "$TCROSS"  "$DIR/tcross-1.png"  0 true
vincular "$TCROSS"  "$DIR/tcross-2.png"  1 false

rm -rf "$DIR"
echo "Fotos de demonstração vinculadas."
