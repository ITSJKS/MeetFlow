#!/bin/bash
# db-start.sh
# Starts an isolated PostgreSQL server inside the project workspace on port 5435.

WORKSPACE_DIR="/Users/jk/Desktop/dev/MeetFlow"
DB_DIR="$WORKSPACE_DIR/db_data"
PORT=5435
LOG_FILE="$WORKSPACE_DIR/postgres.log"

# Clean up stale locks if postgres isn't running
if [ -f "$DB_DIR/postmaster.pid" ]; then
  PID=$(cat "$DB_DIR/postmaster.pid" | head -n 1)
  if ! kill -0 $PID 2>/dev/null; then
    echo "Removing stale postmaster.pid..."
    rm -f "$DB_DIR/postmaster.pid"
  fi
fi

# Initialize if data directory does not exist
if [ ! -d "$DB_DIR" ]; then
  echo "Initializing PostgreSQL data directory at $DB_DIR..."
  /opt/homebrew/bin/initdb -D "$DB_DIR" -U postgres --auth=trust
fi

# Check if port 5435 is already listening
if nc -zv localhost $PORT 2>/dev/null; then
  echo "Port $PORT is already in use. PostgreSQL might already be running."
  exit 0
fi

echo "Starting PostgreSQL on port $PORT..."
/opt/homebrew/bin/postgres -D "$DB_DIR" -p $PORT > "$LOG_FILE" 2>&1 &

# Wait for database to start
echo "Waiting for PostgreSQL to be ready..."
for i in {1..10}; do
  if /opt/homebrew/bin/pg_isready -p $PORT >/dev/null 2>&1; then
    echo "PostgreSQL is ready!"
    exit 0
  fi
  sleep 1
done

echo "Failed to start PostgreSQL or it's taking too long. Check $LOG_FILE for details."
exit 1
