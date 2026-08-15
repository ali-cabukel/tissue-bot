#!/usr/bin/env bash
# Collect issues for a repo via gh CLI and store in SQLite.
#
# Usage:
#   ./scripts/collect-issues.sh OWNER/REPO [--state open|closed|all] [--limit N]
#
# Examples:
#   ./scripts/collect-issues.sh codecrafters-io/build-your-own-x --limit 50
#   ./scripts/collect-issues.sh ali-cabukel/tissue-bot --state all
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="${DB_PATH:-$ROOT/backend/data/tissue-bot.db}"
if [[ $# -lt 1 ]]; then
  echo "Usage: collect-issues.sh OWNER/REPO [--state open|closed|all] [--limit N]"
  exit 1
fi
REPO="$1"
shift

STATE="open"
LIMIT=100

while [[ $# -gt 0 ]]; do
  case "$1" in
    --state) STATE="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
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

# Ensure repo exists in DB (fetch metadata if missing)
REPO_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM repos WHERE full_name = '$(printf '%s' "$REPO" | sed "s/'/''/g")';")
if [[ -z "$REPO_ID" ]]; then
  echo "Repo not in database, fetching metadata first..."
  REPO_JSON=$(gh repo view "$REPO" --json name,description,url,stargazerCount,forkCount,primaryLanguage,createdAt,updatedAt,pushedAt,isPrivate,isFork,isArchived,owner,defaultBranchRef,licenseInfo,repositoryTopics)
  OWNER=$(echo "$REPO_JSON" | jq -r '.owner.login')
  NAME=$(echo "$REPO_JSON" | jq -r '.name')
  DESCRIPTION=$(echo "$REPO_JSON" | jq -r '.description // ""')
  URL=$(echo "$REPO_JSON" | jq -r '.url')
  STARS=$(echo "$REPO_JSON" | jq -r '.stargazerCount // 0')
  FORKS=$(echo "$REPO_JSON" | jq -r '.forkCount // 0')
  LANGUAGE=$(echo "$REPO_JSON" | jq -r '.primaryLanguage.name // empty')
  IS_PRIVATE=$(echo "$REPO_JSON" | jq -r 'if .isPrivate then 1 else 0 end')
  IS_FORK=$(echo "$REPO_JSON" | jq -r 'if .isFork then 1 else 0 end')
  IS_ARCHIVED=$(echo "$REPO_JSON" | jq -r 'if .isArchived then 1 else 0 end')
  LICENSE=$(echo "$REPO_JSON" | jq -r '.licenseInfo.key // empty')
  DEFAULT_BRANCH=$(echo "$REPO_JSON" | jq -r '.defaultBranchRef.name // empty')
  CREATED=$(echo "$REPO_JSON" | jq -r '.createdAt // empty')
  UPDATED=$(echo "$REPO_JSON" | jq -r '.updatedAt // empty')
  PUSHED=$(echo "$REPO_JSON" | jq -r '.pushedAt // empty')
  TOPICS=$(echo "$REPO_JSON" | jq -c 'if .repositoryTopics then [.repositoryTopics[]?.name] else [] end')

  sqlite3 "$DB_PATH" <<SQL
INSERT OR IGNORE INTO repos (
  owner, name, full_name, description, url, stars, forks, language,
  is_private, is_fork, is_archived, license, default_branch,
  created_at, updated_at, pushed_at, topics
) VALUES (
  $(sql_str "$OWNER"),
  $(sql_str "$NAME"),
  $(sql_str "$REPO"),
  $(sql_str "$DESCRIPTION"),
  $(sql_str "$URL"),
  $STARS,
  $FORKS,
  $(sql_str "$LANGUAGE"),
  $IS_PRIVATE,
  $IS_FORK,
  $IS_ARCHIVED,
  $(sql_str "$LICENSE"),
  $(sql_str "$DEFAULT_BRANCH"),
  $(sql_str "$CREATED"),
  $(sql_str "$UPDATED"),
  $(sql_str "$PUSHED"),
  $(sql_str "$TOPICS")
);
SQL
  REPO_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM repos WHERE full_name = '$(printf '%s' "$REPO" | sed "s/'/''/g")';")
fi

echo "Collecting issues for $REPO (state=$STATE, limit=$LIMIT)"

ISSUES=$(gh issue list --repo "$REPO" --state "$STATE" --limit "$LIMIT" \
  --json number,title,state,body,labels,author,createdAt,updatedAt,url)

COUNT=0
echo "$ISSUES" | jq -c '.[]' | while read -r issue; do
  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title' | sed "s/'/''/g")
  STATE_VAL=$(echo "$issue" | jq -r '.state')
  BODY=$(echo "$issue" | jq -r '.body // ""' | sed "s/'/''/g")
  AUTHOR=$(echo "$issue" | jq -r '.author.login // ""' | sed "s/'/''/g")
  URL=$(echo "$issue" | jq -r '.url' | sed "s/'/''/g")
  CREATED=$(echo "$issue" | jq -r '.createdAt')
  UPDATED=$(echo "$issue" | jq -r '.updatedAt')

  ISSUE_ID=$(sqlite3 "$DB_PATH" <<SQL
INSERT INTO issues (repo_id, number, title, state, body, author, url, created_at, updated_at, collected_at)
VALUES ($REPO_ID, $NUMBER, '$TITLE', '$STATE_VAL', '$BODY', '$AUTHOR', '$URL', '$CREATED', '$UPDATED', datetime('now'))
ON CONFLICT(repo_id, number) DO UPDATE SET
  title = excluded.title,
  state = excluded.state,
  body = excluded.body,
  author = excluded.author,
  url = excluded.url,
  updated_at = excluded.updated_at,
  collected_at = datetime('now');
SELECT id FROM issues WHERE repo_id = $REPO_ID AND number = $NUMBER;
SQL
)

  # Refresh labels
  sqlite3 "$DB_PATH" "DELETE FROM issue_labels WHERE issue_id = $ISSUE_ID;"
  echo "$issue" | jq -r '.labels[].name' | while read -r label; do
    [[ -z "$label" ]] && continue
    sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO issue_labels (issue_id, label_name) VALUES ($ISSUE_ID, '$(echo "$label" | sed "s/'/''/g")');"
  done

  COUNT=$((COUNT + 1))
  echo "  ✓ #$NUMBER $TITLE"
done

TOTAL=$(echo "$ISSUES" | jq 'length')
sqlite3 "$DB_PATH" "INSERT INTO sync_log (entity_type, entity_ref, status, message) VALUES ('issue', '$REPO', 'ok', 'Collected $TOTAL issues');"
echo "Done. Stored $TOTAL issues in $DB_PATH"
