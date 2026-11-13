#!/bin/sh
set -e

echo "Running database migrations..."
if ! npm run migration:run:prod; then
  echo "ERROR: could not run migrations. Is the database reachable at ${DB_HOST:-unset}:${DB_PORT:-unset}?" >&2
  exit 1
fi

echo "Starting application..."
exec "$@"
