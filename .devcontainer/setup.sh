#!/usr/bin/env bash
# Runs once when the codespace is created: tools and dependencies.
set -euo pipefail
cd "$(dirname "$0")/.."

corepack enable
pnpm install --frozen-lockfile

if ! command -v supabase >/dev/null; then
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz \
    | sudo tar -xz -C /usr/local/bin supabase
fi
supabase --version
