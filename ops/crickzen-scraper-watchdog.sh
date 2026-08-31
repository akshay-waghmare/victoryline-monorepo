#!/usr/bin/env bash
set -u

# External production guard for the scraper. It intentionally runs outside the
# scraper container so it can recover an HTTP-frozen process as well as a
# process that exited. Install it from the production checkout with a one-minute
# user cron entry; do not put secrets in this repository.

COMPOSE_DIR="${CRICKZEN_COMPOSE_DIR:-/home/administrator/victoryline-monorepo}"
COMPOSE_FILE="${CRICKZEN_COMPOSE_FILE:-docker-compose.prod.yml}"
CONTAINER_NAME="${CRICKZEN_SCRAPER_CONTAINER:-victoryline-scraper}"
HEALTH_URL="${CRICKZEN_SCRAPER_HEALTH_URL:-http://127.0.0.1:5000/health}"
# The scraper intentionally manages only the selected MAX_LIVE_MATCHES slate.
# Check those URLs, not every row in the backend's larger live catalogue.
CANDIDATES_URL="${CRICKZEN_SCRAPER_CANDIDATES_URL:-http://127.0.0.1:5000/prediction-candidates}"
SNAPSHOT_URL="${CRICKZEN_MANAGED_SNAPSHOT_URL:-http://127.0.0.1:8099/cricket-data/last-updated-data}"
STALE_SECONDS="${CRICKZEN_SCRAPER_STALE_SECONDS:-300}"
RESTART_COOLDOWN_SECONDS="${CRICKZEN_SCRAPER_RESTART_COOLDOWN_SECONDS:-300}"
ESCALATION_WINDOW_SECONDS="${CRICKZEN_SCRAPER_ESCALATION_WINDOW_SECONDS:-900}"
LOG_FILE="${CRICKZEN_SCRAPER_WATCHDOG_LOG:-/home/administrator/logs/crickzen-scraper-watchdog.log}"
STATE_FILE="${CRICKZEN_SCRAPER_WATCHDOG_STATE:-/tmp/crickzen-scraper-watchdog.state}"
LOCK_FILE="${CRICKZEN_SCRAPER_WATCHDOG_LOCK:-/tmp/crickzen-scraper-watchdog.lock}"
ALERT_ENV_FILE="${CRICKZEN_SCRAPER_ALERT_ENV:-/home/administrator/.config/crickzen-scraper-watchdog.env}"

if [ -r "$ALERT_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ALERT_ENV_FILE"
fi

mkdir -p "$(dirname "$LOG_FILE")"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

log_event() {
  local level="$1"
  local reason="$2"
  local message="$3"
  local line
  line="$(date -Is) level=${level} reason=${reason} ${message}"
  printf '%s\n' "$line" >> "$LOG_FILE"
  logger -t crickzen-scraper-watchdog -- "$line" 2>/dev/null || true
}

send_alert() {
  local level="$1"
  local reason="$2"
  local message="$3"
  if [ -z "${SCRAPER_ALERT_WEBHOOK_URL:-}" ] || ! command -v jq >/dev/null 2>&1; then
    return 0
  fi

  local body
  body="$(jq -n \
    --arg service "$CONTAINER_NAME" \
    --arg level "$level" \
    --arg reason "$reason" \
    --arg message "$message" \
    '{service:$service, level:$level, reason:$reason, message:$message}')"
  curl -fsS --max-time 10 -X POST \
    -H 'Content-Type: application/json' \
    --data "$body" "$SCRAPER_ALERT_WEBHOOK_URL" >/dev/null 2>&1 || \
    log_event ERROR alert_delivery_failed "reason=${reason}"
}

read_state() {
  restart_count=0
  window_started=0
  last_restart=0
  last_reason=""
  if [ -r "$STATE_FILE" ]; then
    restart_count="$(awk -F= '$1 == "restart_count" {print $2}' "$STATE_FILE" | tail -1)"
    window_started="$(awk -F= '$1 == "window_started" {print $2}' "$STATE_FILE" | tail -1)"
    last_restart="$(awk -F= '$1 == "last_restart" {print $2}' "$STATE_FILE" | tail -1)"
    last_reason="$(awk -F= '$1 == "last_reason" {print substr($0, index($0, "=") + 1)}' "$STATE_FILE" | tail -1)"
  fi
  restart_count="${restart_count:-0}"
  window_started="${window_started:-0}"
  last_restart="${last_restart:-0}"
}

write_state() {
  local temp_file="${STATE_FILE}.tmp.$$"
  {
    printf 'restart_count=%s\n' "$restart_count"
    printf 'window_started=%s\n' "$window_started"
    printf 'last_restart=%s\n' "$last_restart"
    printf 'last_reason=%s\n' "$last_reason"
  } > "$temp_file"
  mv -f "$temp_file" "$STATE_FILE"
}

check_managed_match_freshness() {
  local candidates_payload candidate_url match_key snapshot_payload last_updated age
  managed_matches=0
  stale_matches=""
  freshness_error=""

  candidates_payload="$(curl -sS --max-time 15 "$CANDIDATES_URL" 2>/dev/null || true)"
  if [ -z "$candidates_payload" ] || ! printf '%s' "$candidates_payload" | jq -e '.matches and (.matches | type == "array")' >/dev/null 2>&1; then
    freshness_error="managed_candidates_unreachable"
    return 1
  fi

  managed_matches="$(printf '%s' "$candidates_payload" | jq -r '.matches | length')"
  [ "$managed_matches" -eq 0 ] && return 0

  while IFS= read -r candidate_url; do
    [ -z "$candidate_url" ] && continue
    match_key="$(printf '%s' "$candidate_url" | sed -n 's|.*-match-updates-\([^/?#]*\).*|\1|p')"
    if [ -z "$match_key" ]; then
      stale_matches="${stale_matches}${candidate_url},"
      continue
    fi

    snapshot_payload="$(curl -sS --max-time 15 --get --data-urlencode "url=${match_key}" "$SNAPSHOT_URL" 2>/dev/null || true)"
    last_updated="$(printf '%s' "$snapshot_payload" | jq -r '.lastUpdated // .updatedTimeStamp // 0' 2>/dev/null || printf '0')"
    if ! printf '%s' "$last_updated" | grep -Eq '^[0-9]+([.][0-9]+)?$' || [ "$last_updated" = "0" ]; then
      stale_matches="${stale_matches}${match_key},"
      continue
    fi

    age="$(awk -v now="$now" -v last="$last_updated" 'BEGIN {print now - (last / 1000)}')"
    if awk -v age="$age" -v threshold="$STALE_SECONDS" 'BEGIN {exit !(age >= threshold)}'; then
      stale_matches="${stale_matches}${match_key}:${age}s,"
    fi
  done < <(printf '%s' "$candidates_payload" | jq -r '.matches[]?.url // empty')

  [ -z "$stale_matches" ]
}

read_state
now="$(date +%s)"
health_payload="$(curl -sS --max-time 15 "$HEALTH_URL" 2>/dev/null || true)"
container_running="$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || printf 'false')"

reason=""
message=""
if [ "$container_running" != "true" ]; then
  reason="scraper_container_not_running"
  message="container_running=${container_running}"
elif [ -z "$health_payload" ] || ! printf '%s' "$health_payload" | jq -e '.data' >/dev/null 2>&1; then
  reason="scraper_health_unreachable"
  message="health_url=${HEALTH_URL}"
else
  active_matches="$(printf '%s' "$health_payload" | jq -r '.data.active_matches // 0')"
  last_scrape="$(printf '%s' "$health_payload" | jq -r '.data.last_scrape // 0')"
  state="$(printf '%s' "$health_payload" | jq -r '.data.state // "unknown"')"
  restart_recommended="$(printf '%s' "$health_payload" | jq -r '.data.restart_recommended // false')"
  if [ "$restart_recommended" = "true" ]; then
    reason="$(printf '%s' "$health_payload" | jq -r '.data.restart_reason // "health_restart_recommended"')"
    message="state=${state} active_matches=${active_matches}"
  elif [ "$state" = "failing" ]; then
    reason="scraper_health_failing"
    message="state=${state} active_matches=${active_matches}"
  elif ! check_managed_match_freshness; then
    if [ -n "$freshness_error" ]; then
      reason="$freshness_error"
      message="state=${state} managed_matches=${managed_matches:-0} candidates_url=${CANDIDATES_URL}"
    else
      reason="managed_match_stale"
      message="state=${state} managed_matches=${managed_matches} stale_matches=${stale_matches%,}"
    fi
  fi
fi

if [ -z "$reason" ]; then
  if [ "$restart_count" -gt 0 ] && [ $((now - window_started)) -gt "$ESCALATION_WINDOW_SECONDS" ]; then
    restart_count=0
    window_started=0
    last_restart=0
    last_reason=""
    write_state
  fi
  exit 0
fi

if [ $((now - last_restart)) -lt "$RESTART_COOLDOWN_SECONDS" ]; then
  log_event WARNING "$reason" "restart_suppressed=cooldown last_restart=${last_restart}"
  if [ "$restart_count" -ge 2 ]; then
    send_alert CRITICAL "$reason" "repeated scraper failure while restart cooldown is active"
  fi
  exit 0
fi

if [ "$window_started" -eq 0 ] || [ $((now - window_started)) -gt "$ESCALATION_WINDOW_SECONDS" ]; then
  window_started="$now"
  restart_count=0
fi
restart_count=$((restart_count + 1))
last_restart="$now"
last_reason="$reason"

restart_output=""
if [ "$container_running" = "true" ]; then
  restart_output="$(cd "$COMPOSE_DIR" && docker compose -f "$COMPOSE_FILE" restart scraper 2>&1)" || true
else
  restart_output="$(cd "$COMPOSE_DIR" && docker compose -f "$COMPOSE_FILE" up -d scraper 2>&1)" || true
fi

if printf '%s' "$restart_output" | grep -qiE 'error|failed'; then
  log_event ERROR "$reason" "restart_failed=true attempt=${restart_count} output=$(printf '%s' "$restart_output" | tr '\n' ' ')"
  send_alert CRITICAL "$reason" "automatic scraper restart failed on attempt ${restart_count}"
elif [ "$restart_count" -ge 2 ]; then
  log_event CRITICAL "$reason" "restart_succeeded=true repeated_attempt=${restart_count} output=$(printf '%s' "$restart_output" | tr '\n' ' ')"
  send_alert CRITICAL "$reason" "scraper required repeated automatic restarts"
else
  log_event WARNING "$reason" "restart_succeeded=true attempt=${restart_count} output=$(printf '%s' "$restart_output" | tr '\n' ' ')"
fi
write_state
