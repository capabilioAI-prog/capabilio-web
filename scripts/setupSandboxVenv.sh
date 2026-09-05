#!/usr/bin/env bash
# setupSandboxVenv.sh — creates/updates the dedicated Python venv
# pythonSandbox.js's venv-aware path (runPython(code, {usePackages:true}))
# invokes for ML/AI Engineer's (and future ML-flavored) workstations.
#
# Runs on every `npm install` via package.json's postinstall hook — this is
# what gets it created on Render's build too, since Render always runs
# `npm install` regardless of the exact configured build/start command.
#
# Never fails `npm install`. If python3 isn't available in this
# environment, that's an honest, already-handled state — pythonSandbox.js's
# checkPythonAvailable()/checkPackagesAvailable() report it at request time
# ("this challenge type can't be scored right now"), not a build-time crash.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$REPO_ROOT/backend/server/lib/sandbox/.sandbox-venv"
REQUIREMENTS="$REPO_ROOT/backend/server/lib/sandbox/requirements.txt"

if ! command -v python3 >/dev/null 2>&1; then
  echo "[setupSandboxVenv] python3 not found — skipping (ML/AI workstations will report 'unavailable' at request time, not fail the build)"
  exit 0
fi

if [ ! -d "$VENV_DIR" ]; then
  echo "[setupSandboxVenv] creating venv at $VENV_DIR"
  python3 -m venv "$VENV_DIR" || { echo "[setupSandboxVenv] venv creation failed — skipping, non-fatal"; exit 0; }
fi

echo "[setupSandboxVenv] installing sandbox-requirements.txt"
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet -r "$REQUIREMENTS" || { echo "[setupSandboxVenv] package install failed — skipping, non-fatal"; exit 0; }

echo "[setupSandboxVenv] done"
