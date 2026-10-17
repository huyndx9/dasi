#!/usr/bin/env bash
# Runs each time the codespace opens: local Supabase, .env.local, then the web app.
set -euo pipefail
cd "$(dirname "$0")/.."
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

if ! command -v supabase >/dev/null || ! command -v pnpm >/dev/null || [ ! -d node_modules ]; then
  bash .devcontainer/setup.sh
fi

if ! docker info >/dev/null 2>&1; then
  echo "✖ Docker chưa chạy trong máy ảo. Đợi 1 phút rồi chạy lại: bash .devcontainer/start.sh"
  exit 1
fi

if ! supabase status >/dev/null 2>&1; then
  echo "▶ Đang khởi động Supabase riêng trong máy ảo (lần đầu mất vài phút)…"
  # Only the database, auth and REST API are needed by the web app today.
  supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api,postgres-meta
fi

ANON_KEY="" PUBLISHABLE_KEY=""
eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|PUBLISHABLE_KEY)=')"
ANON_KEY="${ANON_KEY:-$PUBLISHABLE_KEY}"
if [ -z "${API_URL:-}" ] || [ -z "$ANON_KEY" ]; then
  echo "✖ Không đọc được địa chỉ hoặc khoá của Supabase. Gửi kết quả lệnh 'supabase status' cho Claude."
  exit 1
fi
cat > .env.local <<ENV
# Written by .devcontainer/start.sh for the local Supabase in this codespace.
NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
NEXT_PUBLIC_DEMO_LOGIN=1
ENV

echo "▶ Đang chạy app. Khi thấy 'Ready', mở tab PORTS → Dasi (3000) nếu trình duyệt chưa tự mở."
exec pnpm --filter web dev
