#!/usr/bin/env bash
# Collect GitHub repos via gh CLI and store in SQLite.
#
# Usage:
#   ./scripts/collect-repos.sh user [OWNER] [--limit N]
#   ./scripts/collect-repos.sh org ORG [--limit N]
#   ./scripts/collect-repos.sh search "QUERY" [--limit N]
#   ./scripts/collect-repos.sh repo OWNER/REPO
#
# Examples:
#   ./scripts/collect-repos.sh user ali-cabukel --limit 50
#   ./scripts/collect-repos.sh org github --limit 20
#   ./scripts/collect-repos.sh search "stars:>100 language:python" --limit 10
#   ./scripts/collect-repos.sh repo numpy/numpy
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="${DB_PATH:-$ROOT/backend/data/tissue-bot.db}"
if [[ $# -lt 1 ]]; then
  echo "Usage: collect-repos.sh user|org|search|repo [args...] [--limit N]"
  exit 1
fi
MODE="$1"
shift

LIMIT=100
ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit) LIMIT="$2"; shift 2 ;;
    *) ARGS+=("$1"); shift ;;
  esac
done

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database not found. Run: ./scripts/init-db.sh"
  exit 1
fi

sql_str() {
  if [[ -n "${1:-}" ]]; then
    printf "'%s'" "$(printf '%s' "$1" | sed "s/'/''/g")"
  else
    printf 'NULL'
  fi
}

upsert_repo() {
  local json="$1"
  local owner name full_name description url stars forks language
  local is_private is_fork is_archived license default_branch
  local created_at updated_at pushed_at topics

  owner=$(echo "$json" | jq -r '.owner.login // (.fullName // "" | split("/")[0])')
  name=$(echo "$json" | jq -r '.name // (.fullName // "" | split("/")[1])')
  full_name=$(echo "$json" | jq -r 'if .fullName then .fullName else (.owner.login + "/" + .name) end')
  description=$(echo "$json" | jq -r '.description // ""')
  url=$(echo "$json" | jq -r '.url')
  stars=$(echo "$json" | jq -r '.stargazerCount // .stargazersCount // 0')
  forks=$(echo "$json" | jq -r '.forkCount // .forksCount // 0')
  language=$(echo "$json" | jq -r '.primaryLanguage.name // .language // empty')
  is_private=$(echo "$json" | jq -r 'if .isPrivate then 1 else 0 end')
  is_fork=$(echo "$json" | jq -r 'if .isFork then 1 else 0 end')
  is_archived=$(echo "$json" | jq -r 'if .isArchived then 1 else 0 end')
  license=$(echo "$json" | jq -r '.licenseInfo.key // empty')
  default_branch=$(echo "$json" | jq -r '.defaultBranchRef.name // empty')
  created_at=$(echo "$json" | jq -r '.createdAt // empty')
  updated_at=$(echo "$json" | jq -r '.updatedAt // empty')
  pushed_at=$(echo "$json" | jq -r '.pushedAt // empty')
  topics=$(echo "$json" | jq -c 'if .repositoryTopics then [.repositoryTopics[]?.name] else [] end')

  sqlite3 "$DB_PATH" <<SQL
INSERT INTO repos (
  owner, name, full_name, description, url, stars, forks, language,
  is_private, is_fork, is_archived, license, default_branch,
  created_at, updated_at, pushed_at, topics, collected_at
) VALUES (
  '$(echo "$owner" | sed "s/'/''/g")',
  '$(echo "$name" | sed "s/'/''/g")',
  '$(echo "$full_name" | sed "s/'/''/g")',
  '$(echo "$description" | sed "s/'/''/g")',
  '$(echo "$url" | sed "s/'/''/g")',
  $stars,
  $forks,
  $(sql_str "$language"),
  $is_private,
  $is_fork,
  $is_archived,
  $(sql_str "$license"),
  $(sql_str "$default_branch"),
  $(sql_str "$created_at"),
  $(sql_str "$updated_at"),
  $(sql_str "$pushed_at"),
  '$(echo "$topics" | sed "s/'/''/g")',
  datetime('now')
)
ON CONFLICT(full_name) DO UPDATE SET
  description = excluded.description,
  url = excluded.url,
  stars = excluded.stars,
  forks = excluded.forks,
  language = excluded.language,
  is_private = excluded.is_private,
  is_fork = excluded.is_fork,
  is_archived = excluded.is_archived,
  license = excluded.license,
  default_branch = excluded.default_branch,
  updated_at = excluded.updated_at,
  pushed_at = excluded.pushed_at,
  topics = excluded.topics,
  collected_at = datetime('now');
SQL
}

log_sync() {
  local entity_ref="$1"
  local status="$2"
  local message="${3:-}"
  sqlite3 "$DB_PATH" "INSERT INTO sync_log (entity_type, entity_ref, status, message) VALUES ('repo', '$(echo "$entity_ref" | sed "s/'/''/g")', '$status', '$(echo "$message" | sed "s/'/''/g")');"
}

JSON_FIELDS='name,description,url,stargazerCount,forkCount,primaryLanguage,createdAt,updatedAt,pushedAt,isPrivate,isFork,isArchived,owner,defaultBranchRef,licenseInfo,repositoryTopics'

case "$MODE" in
  user)
    TARGET="${ARGS[0]:-$(gh api user -q .login)}"
    echo "Collecting repos for user: $TARGET (limit $LIMIT)"
    REPOS=$(gh repo list "$TARGET" --limit "$LIMIT" --json "$JSON_FIELDS")
    ENTITY_REF="user:$TARGET"
    ;;
  org)
    TARGET="${ARGS[0]:?Org name required}"
    echo "Collecting repos for org: $TARGET (limit $LIMIT)"
    REPOS=$(gh repo list "$TARGET" --limit "$LIMIT" --json "$JSON_FIELDS")
    ENTITY_REF="org:$TARGET"
    ;;
  search)
    QUERY="${ARGS[0]:?Search query required, e.g. stars:>100 language:python}"
    echo "Searching repos: $QUERY (limit $LIMIT)"
    REPOS=$(gh search repos "$QUERY" --limit "$LIMIT" --json fullName,description,url,stargazersCount,forksCount,updatedAt,language,isPrivate,isFork)
    ENTITY_REF="search:$QUERY"
    ;;
  repo)
    TARGET="${ARGS[0]:?Repo required, e.g. numpy/numpy}"
    echo "Collecting repo: $TARGET"
    REPOS=$(gh repo view "$TARGET" --json "$JSON_FIELDS" | jq -s '.')
    ENTITY_REF="repo:$TARGET"
    ;;
  *)
    echo "Unknown mode: $MODE"
    exit 1
    ;;
esac

COUNT=0
echo "$REPOS" | jq -c '.[]' | while read -r repo; do
  upsert_repo "$repo"
  COUNT=$((COUNT + 1))
  echo "  ✓ $(echo "$repo" | jq -r 'if .fullName then .fullName else (.owner.login + "/" + .name) end')"
done

TOTAL=$(echo "$REPOS" | jq 'length')
log_sync "$ENTITY_REF" "ok" "Collected $TOTAL repos"
echo "Done. Stored $TOTAL repos in $DB_PATH"
