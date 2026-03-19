#!/bin/bash
# ExpensIQ — One-command startup
# Works with Colima (ARM64 Mac) or Docker Desktop

set -e

# Start Colima if not running (skip if Docker Desktop is being used)
if command -v colima &> /dev/null; then
  if ! colima status &>/dev/null; then
    echo "Starting Colima..."
    export LIMA_DATA_HOME="$HOME/.local/share"
    colima start --arch aarch64 --vm-type vz --vz-rosetta --cpu 4 --memory 6
    docker context use colima
  fi
fi

# Launch stack
export DOCKER_DEFAULT_PLATFORM=linux/amd64
docker compose up -d "$@"

echo ""
echo "ExpensIQ running:"
echo "  Dashboard  → http://localhost:8000"
echo "  MinIO      → http://localhost:9001"
echo "  Metabase   → http://localhost:3100"
