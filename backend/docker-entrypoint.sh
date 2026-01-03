#!/usr/bin/env sh
set -eu

log() {
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

mask_url() {
  # postgresql://user:pass@host/db -> postgresql://user:***@host/db
  echo "$1" | sed -E 's#(postgresql(\+[^:]*)?://[^:]+):[^@]+@#\1:***@#'
}

if [ -z "${DATABASE_URL:-}" ]; then
  log "[FATAL] DATABASE_URL is not set"
  exit 1
fi

log "[BOOT] DATABASE_URL=$(mask_url "$DATABASE_URL")"
log "[BOOT] running: alembic upgrade head"

alembic -c /app/alembic.ini upgrade head

log "[BOOT] alembic upgrade head: SUCCESS"

if [ $# -eq 0 ]; then
  set -- uvicorn app.main:app --host 0.0.0.0 --port 8000
fi

log "[BOOT] starting: $*"
exec "$@"



