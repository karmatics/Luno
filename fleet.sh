#!/usr/bin/env bash
# ==============================================================================
# 🌙 LUNO WORKSPACE - UNIVERSAL 1-COMMAND FLEET SYNCHRONIZER
# Works identically on macOS and Linux
# ==============================================================================
set -e
PORT=${PORT:-8080}
NODE_URL="http://localhost:$PORT/api/git/fleet-sync"

ACTION="${1:-sync}"

echo "================================================================"
echo "🌙 Executing Fleet Action: [$ACTION] via Luno Server on Port $PORT..."
echo "================================================================"

if [ "$ACTION" == "sync" ]; then
  curl -s -X POST "$NODE_URL" -H "Content-Type: application/json" -d '{"action":"pull","autocommit":true}' | grep -o '"summary":[^}]*' || true
  curl -s -X POST "$NODE_URL" -H "Content-Type: application/json" -d '{"action":"push"}' | grep -o '"summary":[^}]*' || true
elif [ "$ACTION" == "pull" ]; then
  curl -s -X POST "$NODE_URL" -H "Content-Type: application/json" -d '{"action":"pull","autocommit":true}'
elif [ "$ACTION" == "push" ]; then
  curl -s -X POST "$NODE_URL" -H "Content-Type: application/json" -d '{"action":"push"}'
elif [ "$ACTION" == "status" ]; then
  curl -s -X POST "$NODE_URL" -H "Content-Type: application/json" -d '{"action":"status","fetch":true}'
fi

echo ""
echo "✅ Done!"
