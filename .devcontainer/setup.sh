#!/usr/bin/env bash
# Tools and dependencies. Runs when the codespace is created, and again from
# start.sh whenever something is missing (so a failed first run heals itself).
set -euo pipefail
cd "$(dirname "$0")/.."
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

if ! command -v pnpm >/dev/null; then
  echo "▶ Cài pnpm…"
  sudo corepack enable || npm install -g pnpm@10
fi

echo "▶ Cài thư viện của dự án…"
pnpm install --frozen-lockfile

if ! command -v supabase >/dev/null; then
  echo "▶ Cài Supabase CLI…"
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz \
    | sudo tar -xz -C /usr/local/bin supabase
fi
supabase --version
