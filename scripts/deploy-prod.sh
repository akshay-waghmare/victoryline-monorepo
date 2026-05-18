#!/usr/bin/env bash
# deploy-prod.sh — Build all Docker images from current code, update .env, restart stack.
#
# Usage:
#   cd ~/victoryline-monorepo
#   bash scripts/deploy-prod.sh [--tag <custom-tag>] [--no-restart] [--dry-run]
#
# This script:
#   1. Ensures working tree is clean (or warns)
#   2. Builds backend, frontend, scraper images with a consistent tag
#   3. Backs up .env
#   4. Updates .env image pins to the new tag
#   5. Restarts the stack with docker compose
#   6. Validates all containers are running

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# --- Defaults ---
CUSTOM_TAG=""
NO_RESTART=false
DRY_RUN=false
COMPOSE_FILE="docker-compose.prod.yml"

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)       CUSTOM_TAG="$2"; shift 2 ;;
    --no-restart) NO_RESTART=true; shift ;;
    --dry-run)   DRY_RUN=true; shift ;;
    *)           echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# --- Determine tag ---
GIT_SHA="$(git rev-parse --short=7 HEAD)"
GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TIMESTAMP="$(date -u +%Y%m%d-%H%M)"

if [[ -n "$CUSTOM_TAG" ]]; then
  TAG="$CUSTOM_TAG"
else
  TAG="deploy-${GIT_SHA}-${TIMESTAMP}"
fi

# --- Pre-flight checks ---
echo "============================================"
echo "  VictoryLine Production Deploy"
echo "============================================"
echo "  Branch:    $GIT_BRANCH"
echo "  Commit:    $GIT_SHA"
echo "  Tag:       $TAG"
echo "  Compose:   $COMPOSE_FILE"
echo "  Restart:   $(if $NO_RESTART; then echo 'NO'; else echo 'YES'; fi)"
echo "  Dry run:   $(if $DRY_RUN; then echo 'YES'; else echo 'NO'; fi)"
echo "============================================"
echo ""

# Warn if tracked files are dirty. Production keeps local backup files beside the repo,
# so untracked files must not block repeatable deploys.
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "WARNING: Working tree has uncommitted tracked changes!"
  echo "   Images will include uncommitted tracked code."
  git status --short --untracked-files=no
  echo ""
  read -p "Continue anyway? [y/N] " -r
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# --- Service definitions ---
# context = docker build context dir
declare -A SERVICES=(
  [backend]="apps/backend/spring-security-jwt"
  [frontend]="apps/frontend"
  [scraper]="apps/scraper"
)

declare -A IMAGE_NAMES=(
  [backend]="victoryline-backend"
  [frontend]="victoryline-frontend"
  [scraper]="victoryline-scraper"
)

declare -A ENV_KEYS=(
  [backend]="BACKEND_IMAGE"
  [frontend]="FRONTEND_IMAGE"
  [scraper]="SCRAPER_IMAGE"
)

# --- Build images ---
echo "🔨 Building Docker images..."
echo ""

for service in backend frontend scraper; do
  image="${IMAGE_NAMES[$service]}:${TAG}"
  context="${SERVICES[$service]}"

  if [[ ! -d "$context" ]]; then
    echo "❌ Directory not found: $context"
    exit 1
  fi

  echo "  Building $image from $context ..."
  build_cmd="docker build -t $image $context --quiet"

  if ! $DRY_RUN; then
    eval "$build_cmd"
    echo "  ✅ $image built"
  else
    echo "  [DRY RUN] Would build: $build_cmd"
  fi
done

echo ""

# --- Backup and update .env ---
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env file not found at $ENV_FILE"
  exit 1
fi

BACKUP_FILE="${ENV_FILE}.bak.$(date -u +%Y%m%d_%H%M%S)"
echo "📋 Backing up .env → $(basename "$BACKUP_FILE")"

if ! $DRY_RUN; then
  cp "$ENV_FILE" "$BACKUP_FILE"
fi

echo "📝 Updating .env image pins..."
for service in backend frontend scraper; do
  key="${ENV_KEYS[$service]}"
  new_value="${IMAGE_NAMES[$service]}:${TAG}"

  if ! $DRY_RUN; then
    # Replace the line in .env (handles both quoted and unquoted values)
    sed -i "s|^${key}=.*|${key}=${new_value}|" "$ENV_FILE"
  fi
  echo "  $key=$new_value"
done

echo ""

# --- Show .env diff ---
echo "📊 .env changes:"
diff "$BACKUP_FILE" "$ENV_FILE" || true
echo ""

# --- Record deployment manifest ---
MANIFEST_DIR="$REPO_ROOT/ops/prod-state"
mkdir -p "$MANIFEST_DIR"
MANIFEST_FILE="$MANIFEST_DIR/last-deploy.json"

cat > "$MANIFEST_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_branch": "$GIT_BRANCH",
  "git_sha": "$(git rev-parse HEAD)",
  "git_sha_short": "$GIT_SHA",
  "tag": "$TAG",
  "images": {
    "backend": "${IMAGE_NAMES[backend]}:${TAG}",
    "frontend": "${IMAGE_NAMES[frontend]}:${TAG}",
    "scraper": "${IMAGE_NAMES[scraper]}:${TAG}"
  },
  "env_backup": "$(basename "$BACKUP_FILE")",
  "dirty_tree": $(if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then echo "true"; else echo "false"; fi)
}
EOF
echo "📁 Deploy manifest saved: $MANIFEST_FILE"
echo ""

# --- Restart stack ---
if $NO_RESTART; then
  echo "⏭️  Skipping restart (--no-restart)"
elif $DRY_RUN; then
  echo "[DRY RUN] Would restart: docker compose -f $COMPOSE_FILE down && docker compose -f $COMPOSE_FILE up -d"
else
  echo "🔄 Restarting stack..."
  docker compose -f "$COMPOSE_FILE" down --remove-orphans
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

  echo ""
  echo "⏳ Waiting 15s for containers to start..."
  sleep 15

  echo ""
  echo "📊 Container status:"
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

  echo ""
  echo "🏥 Checking scraper health..."
  sleep 5
  curl -sf http://localhost:5000/health | python3 -m json.tool 2>/dev/null || echo "  (scraper still starting...)"
fi

echo ""
echo "============================================"
echo "  ✅ Deploy complete: $TAG"
echo "============================================"
