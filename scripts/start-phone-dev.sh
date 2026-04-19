#!/usr/bin/env bash
# Boots the LAN-accessible dev stack for iPhone testing.
# See docs/PHONE_DEV_WORKFLOW.md for the full workflow.
#
# Usage: from repo root, `bash scripts/start-phone-dev.sh`
# Claude typically runs the individual commands inline rather than this script,
# but having it here means it's the one canonical sequence.

set -euo pipefail

JAVA_HOME_CANDIDATE="${JAVA_HOME_CANDIDATE:-/c/Users/$USER/.local/opt/jdk-21.0.10+7-jre}"
PROJECT_ID="free-lunch-85447"
SEED_DIR="./.emulator-data"

# ---------------------------------------------------------------------------
# 1. Locate a JRE the emulator can spawn

if ! command -v java >/dev/null 2>&1; then
  if [ -x "$JAVA_HOME_CANDIDATE/bin/java.exe" ]; then
    export JAVA_HOME="$JAVA_HOME_CANDIDATE"
    export PATH="$JAVA_HOME/bin:$PATH"
  else
    echo "ERROR: Java is not on PATH and the portable JRE is not at:"
    echo "  $JAVA_HOME_CANDIDATE"
    echo "Install Temurin JRE 21 (portable zip is fine) and re-run, or set JAVA_HOME."
    exit 1
  fi
fi

java -version 2>&1 | head -1

# ---------------------------------------------------------------------------
# 2. Determine PC LAN IP (informational)

LAN_IP=$(ipconfig 2>/dev/null | grep -A1 "Ethernet adapter Ethernet" | grep "IPv4" | awk -F': ' '{print $2}' | tr -d '\r' | head -1 || true)
if [ -z "${LAN_IP:-}" ]; then
  LAN_IP=$(ipconfig 2>/dev/null | grep "IPv4" | awk -F': ' '{print $2}' | tr -d '\r' | head -1 || true)
fi
echo "Detected LAN IP: ${LAN_IP:-<unknown — edit .env.local manually>}"

# ---------------------------------------------------------------------------
# 3. Start Firebase emulators in background, with persistent seed dir

mkdir -p "$SEED_DIR"

EMU_LOG=$(mktemp -t emu.XXXXXX.log)
echo "Emulator log: $EMU_LOG"

firebase emulators:start \
  --only auth,firestore,functions \
  --project "$PROJECT_ID" \
  --import="$SEED_DIR" \
  --export-on-exit="$SEED_DIR" \
  > "$EMU_LOG" 2>&1 &
EMU_PID=$!
echo "Emulators starting (pid $EMU_PID)..."

# Wait for readiness
for _ in $(seq 1 60); do
  if grep -q "All emulators ready" "$EMU_LOG" 2>/dev/null; then
    echo "  ✓ All emulators ready"
    break
  fi
  if grep -q "Error" "$EMU_LOG" 2>/dev/null; then
    echo "  ✗ Emulator start failed — see $EMU_LOG"
    exit 1
  fi
  sleep 2
done

# ---------------------------------------------------------------------------
# 4. Seed if fresh (no prior auth export → empty dir)

if [ ! -d "$SEED_DIR/auth_export" ]; then
  echo "Seeding empty emulator..."
  node scripts/seed-emulator.mjs
fi

# ---------------------------------------------------------------------------
# 5. Start Vite in foreground — Ctrl-C stops everything

cleanup() {
  echo ""
  echo "Stopping emulators..."
  kill "$EMU_PID" 2>/dev/null || true
  wait "$EMU_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ""
echo "=============================================================="
echo "  iPhone URL:  http://${LAN_IP:-<your-lan-ip>}:5173"
echo "  Login:       test@freelunch.local  /  test1234"
echo "=============================================================="
echo ""

npm run dev -- --host
