#!/bin/bash
# redis-start.sh
# Starts an isolated Redis server inside the project workspace on port 6380.

WORKSPACE_DIR="/Users/jk/Desktop/dev/MeetFlow"
REDIS_DIR="$WORKSPACE_DIR/redis_data"
PORT=6380
LOG_FILE="$WORKSPACE_DIR/redis.log"

mkdir -p "$REDIS_DIR"

# Check if port 6380 is already listening
if nc -zv localhost $PORT 2>/dev/null; then
  echo "Port $PORT is already in use. Redis might already be running."
  exit 0
fi

echo "Starting Redis on port $PORT..."
/opt/homebrew/bin/redis-server --port $PORT --dir "$REDIS_DIR" --daemonize yes

# Wait for Redis to start
echo "Waiting for Redis to be ready..."
for i in {1..5}; do
  if /opt/homebrew/bin/redis-cli -p $PORT ping >/dev/null 2>&1; then
    echo "Redis is ready!"
    exit 0
  fi
  sleep 1
done

echo "Failed to start Redis. Check logs/processes."
exit 1
