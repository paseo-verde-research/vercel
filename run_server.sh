#!/bin/bash
set -euo pipefail
HOST="${1:-127.0.0.1}"
PORT="${2:-8000}"
python3 -m http.server "$PORT" --bind "$HOST"
