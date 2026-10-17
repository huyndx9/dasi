#!/usr/bin/env bash
# Runs each time the codespace opens: local Supabase, .env.local, then the web app.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! supabase status >/dev/null 2>&1; then
  echo "▶ Đang khởi động Supabase riêng trong máy ảo (lần đầu mất vài phút)…"
  # Only the database, auth and REST API are needed by the web app today.
  supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api,postgres-meta
fi

eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY)=')"
cat > .env.local <<ENV
# Written by .devcontainer/start.sh for the local Supabase in this codespace.
NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
NEXT_PUBLIC_DEMO_LOGIN=1
ENV

echo "▶ Đang chạy app. Khi thấy 'Ready', mở tab PORTS → Dasi (3000) nếu trình duyệt chưa tự mở."
exec pnpm --filter web dev
