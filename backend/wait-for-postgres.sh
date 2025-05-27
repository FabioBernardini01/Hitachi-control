#!/bin/sh

# Carica variabili di ambiente dal file .env
HOST="${PGHOST}"
PORT="${PGPORT}"

echo "⏳ Attendo che PostgreSQL sia pronto su $HOST:$PORT..."
echo "DEBUG: PGHOST=$PGHOST PGPORT=$PGPORT"
# Loop finché la porta del DB non è accessibile
while ! nc -z "$HOST" "$PORT"; do
  sleep 1
done

echo "✅ PostgreSQL è pronto! Avvio il backend..."
node insert-companies.cjs
node insert-users.cjs
node insert-printers.cjs
exec "$@"
