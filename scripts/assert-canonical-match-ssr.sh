#!/usr/bin/env sh
set -eu

base_url="${CRICKZEN_BASE_URL:-https://www.crickzen.com}"
valid_slug="${CRICKZEN_SSR_VALID_SLUG:-ls-vs-tr-8th-match-the-hundred-2026-men-match-updates-ZKC}"
invalid_slug="${CRICKZEN_SSR_INVALID_SLUG:-definitely-not-a-real-vs-match-updates-xyz}"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

valid_html="$tmp_dir/valid.html"
invalid_html="$tmp_dir/invalid.html"

valid_status="$(curl -sS -L -o "$valid_html" -w '%{http_code}' --max-time 45 "$base_url/cric-live/$valid_slug")"
test "$valid_status" = "200"
grep -qi '<title[^>]*>[^<]' "$valid_html"
grep -qi 'rel=["'"'"']canonical["'"'"']' "$valid_html"
grep -qi 'name=["'"'"']robots["'"'"']' "$valid_html"
grep -qi '<h1[ >]' "$valid_html"
grep -qi '"@type"[[:space:]]*:[[:space:]]*"SportsEvent"' "$valid_html"

invalid_status="$(curl -sS -L -o "$invalid_html" -w '%{http_code}' --max-time 45 "$base_url/cric-live/$invalid_slug")"
test "$invalid_status" = "404"
grep -qi 'name=["'"'"']robots["'"'"'][^>]*content=["'"'"']noindex,follow["'"'"']' "$invalid_html"
grep -qi '<h1[^>]*>Cricket match not found</h1>' "$invalid_html"
! grep -qi 'rel=["'"'"']canonical["'"'"']' "$invalid_html"

printf '%s canonical SSR smoke passed (%s)\n' "$(date -u +%FT%TZ)" "$valid_slug"
