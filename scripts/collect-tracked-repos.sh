#!/usr/bin/env bash
# Collect repos and issues for a tracked list (e.g. scientific Python libraries).
#
# Usage:
#   ./scripts/collect-tracked-repos.sh [REPO_LIST_FILE] [--issue-limit N] [--issue-state open|closed|all]
#
# Examples:
#   ./scripts/collect-tracked-repos.sh
#   ./scripts/collect-tracked-repos.sh scripts/config/scientific-repos.txt --issue-limit 50
#   ./scripts/collect-tracked-repos.sh scripts/config/scientific-repos.txt --issue-state open --issue-limit 100
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIST_FILE="${ROOT}/scripts/config/scientific-repos.txt"
ISSUE_LIMIT=100
ISSUE_STATE="open"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --issue-limit) ISSUE_LIMIT="$2"; shift 2 ;;
    --issue-state) ISSUE_STATE="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: collect-tracked-repos.sh [REPO_LIST_FILE] [--issue-limit N] [--issue-state open|closed|all]"
      exit 0
      ;;
    --*) echo "Unknown option: $1"; exit 1 ;;
    *)
      LIST_FILE="$1"
      shift
      ;;
  esac
done

if [[ ! -f "$LIST_FILE" ]]; then
  echo "Repo list not found: $LIST_FILE"
  exit 1
fi

if [[ ! -f "${DB_PATH:-$ROOT/backend/data/tissue-bot.db}" ]]; then
  "$ROOT/scripts/init-db.sh"
fi

REPOS=()
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"
  line="$(echo "$line" | xargs)"
  [[ -z "$line" ]] && continue
  REPOS+=("$line")
done < "$LIST_FILE"

if [[ ${#REPOS[@]} -eq 0 ]]; then
  echo "No repos found in $LIST_FILE"
  exit 1
fi

echo "Tracking ${#REPOS[@]} repos from $LIST_FILE"
echo ""

for repo in "${REPOS[@]}"; do
  echo "=== $repo ==="
  "$ROOT/scripts/collect-repos.sh" repo "$repo"
  "$ROOT/scripts/collect-issues.sh" "$repo" --state "$ISSUE_STATE" --limit "$ISSUE_LIMIT"
  echo ""
done

echo "Done. ${#REPOS[@]} repos processed."
