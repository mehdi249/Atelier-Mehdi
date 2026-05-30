#!/bin/bash
set -e
cd "$(dirname "$0")"

# ── Server npm dependencies ───────────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies…"
  npm install
fi

# ── mkcert ────────────────────────────────────────────────────────────────────
if ! command -v mkcert &>/dev/null; then
  echo "Installing mkcert for HTTPS support…"
  if ! command -v brew &>/dev/null; then
    echo ""
    echo "Homebrew is required. Install it first:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "Then re-run: bash server/start.sh"
    exit 1
  fi
  brew install mkcert
fi

# Install root CA into macOS keychain (safe to run repeatedly)
mkcert -install 2>/dev/null || true

# ── Certificate files ─────────────────────────────────────────────────────────
CERT_DIR="$HOME/Documents/Atelier/cert"
mkdir -p "$CERT_DIR"

HOSTNAME=$(hostname -s).local
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

if [ ! -f "$CERT_DIR/cert.pem" ]; then
  echo "Generating HTTPS certificate for $HOSTNAME ($IP)…"
  mkcert \
    -cert-file "$CERT_DIR/cert.pem" \
    -key-file  "$CERT_DIR/key.pem" \
    "$HOSTNAME" "$IP" localhost 127.0.0.1
fi

# ── Pass paths to server ──────────────────────────────────────────────────────
export ATELIER_CERT="$CERT_DIR/cert.pem"
export ATELIER_KEY="$CERT_DIR/key.pem"
export ATELIER_CA="$(mkcert -CAROOT)/rootCA.pem"
export ATELIER_HOSTNAME="$HOSTNAME"

node index.js
