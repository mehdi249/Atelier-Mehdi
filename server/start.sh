#!/bin/bash
set -e
cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
  echo "Node.js not found — install from https://nodejs.org"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies…"
  npm install
fi

node index.js
