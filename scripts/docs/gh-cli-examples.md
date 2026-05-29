# GitHub CLI Examples for tissue-bot

Reference cookbook for collecting GitHub data with `gh` and loading it into SQLite.
Run script commands from the **repo root** (e.g. `./scripts/init-db.sh`).

These are the building blocks for the agentic collection and analysis system.

## Prerequisites

```bash
gh auth status          # confirm you are logged in
gh auth login           # if needed
./scripts/init-db.sh    # create backend/data/tissue-bot.db
```

---

## 1. Authentication & identity

```bash
# Check login and token scopes
gh auth status

# Get the authenticated user login
gh api user -q .login

# Switch accounts (if you have multiple)
gh auth switch
```

---

## 2. Collect repositories

### List repos for a user

```bash
gh repo list kurtc3b3 --limit 50 --json \
  name,description,url,stargazerCount,forkCount,primaryLanguage,updatedAt,isPrivate,isFork
```

### List repos for an organisation

```bash
gh repo list github --limit 20 --json name,url,stargazerCount,primaryLanguage
```

### View a single repo (rich metadata)

```bash
gh repo view kurtc3b3/tissue-bot --json \
  name,description,url,stargazerCount,forkCount,primaryLanguage,createdAt,updatedAt,pushedAt,\
isPrivate,owner,defaultBranchRef,isArchived,isFork,licenseInfo,repositoryTopics
```

### Search repos (discovery)

```bash
gh search repos "stars:>100 language:python" --limit 10 --json \
  fullName,description,stargazersCount,updatedAt,url

gh search repos "topic:machine-learning stars:>500" --limit 5
gh search repos "org:github archived:false" --limit 20
```

### Raw REST API (pagination)

```bash
# Paginate through all repos for the authenticated user
gh api user/repos --paginate -q '.[] | {full_name, stars: .stargazers_count, language}'

# Paginate org repos
gh api orgs/github/repos --paginate -q '.[] | .full_name' | head -20
```

### GraphQL (batch queries)

```bash
gh api graphql -f query='
{
  viewer {
    login
    repositories(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        name
        description
        stargazerCount
        primaryLanguage { name }
        updatedAt
      }
    }
  }
}'
```

---

## 3. Collect issues

### List issues for a repo

```bash
gh issue list --repo codecrafters-io/build-your-own-x --limit 20 --json \
  number,title,state,labels,author,createdAt,updatedAt,url,body
```

### Filter by state and labels

```bash
gh issue list --repo OWNER/REPO --state open --label bug --limit 50
gh issue list --repo OWNER/REPO --state closed --limit 100
gh issue list --repo OWNER/REPO --state all --limit 200
```

### View a single issue

```bash
gh issue view 1773 --repo codecrafters-io/build-your-own-x --json \
  number,title,state,body,labels,author,assignees,comments,createdAt,updatedAt,url
```

### Raw REST API with pagination

```bash
gh api repos/codecrafters-io/build-your-own-x/issues \
  --paginate \
  -f state=all \
  -f per_page=100 \
  -q '.[] | {number, title, state, user: .user.login}'
```

### Search issues across GitHub

```bash
gh search issues "repo:codecrafters-io/build-your-own-x is:open label:bug" --limit 10
gh search issues "org:github is:open no:assignee" --limit 20 --json repository,title,state,url
```

---

## 4. Issue actions (for future agent resolution)

These are the commands an agent would use to interact with issues:

```bash
# Create an issue
gh issue create --repo OWNER/REPO --title "Fix X" --body "Description here" --label bug

# Comment on an issue
gh issue comment 42 --repo OWNER/REPO --body "Investigating this now."

# Close an issue
gh issue close 42 --repo OWNER/REPO --comment "Fixed in PR #99"

# Reopen
gh issue reopen 42 --repo OWNER/REPO

# Assign
gh issue edit 42 --repo OWNER/REPO --add-assignee @me
```

---

## 5. Pull requests (related to issue resolution)

```bash
# List PRs linked to issues
gh pr list --repo OWNER/REPO --state open --json number,title,url,linkedIssues

# Create a PR that closes an issue
gh pr create --repo OWNER/REPO --title "Fix #42" --body "Closes #42"

# View PR checks (useful before merging agent fixes)
gh pr checks 99 --repo OWNER/REPO
```

---

## 6. Store data in SQLite (scripts)

We provide wrapper scripts that call `gh` and insert into `backend/data/tissue-bot.db`:

```bash
# Initialise database
./scripts/init-db.sh

# Collect repos
./scripts/collect-repos.sh user kurtc3b3 --limit 50
./scripts/collect-repos.sh org github --limit 20
./scripts/collect-repos.sh search "stars:>100 language:python" --limit 10
./scripts/collect-repos.sh repo numpy/numpy

# Collect tracked scientific libraries (numpy, pandas, torch, etc.)
./scripts/collect-tracked-repos.sh --issue-limit 50
./scripts/collect-tracked-repos.sh scripts/config/scientific-repos.txt --issue-state open --issue-limit 100

# Collect issues for a repo
./scripts/collect-issues.sh numpy/numpy --limit 50
./scripts/collect-issues.sh kurtc3b3/tissue-bot --state all
```

---

## 6b. Tracked scientific library repos

The initial tracking list is in `scripts/config/scientific-repos.txt`. Collect a single repo:

```bash
gh repo view numpy/numpy --json name,description,url,stargazerCount,forkCount,primaryLanguage
./scripts/collect-repos.sh repo numpy/numpy
./scripts/collect-issues.sh numpy/numpy --state open --limit 50
```

Or batch-collect the full list:

```bash
./scripts/collect-tracked-repos.sh
./scripts/collect-tracked-repos.sh scripts/config/scientific-repos.txt --issue-limit 100
```

Search for similar repos to add to the list:

```bash
gh search repos "topic:scientific-computing language:python stars:>1000" --limit 10
gh search repos "org:pydata" --limit 20 --json fullName,description,stargazersCount
```

---

## 7. Query the database (analysis prep)

```bash
DB=backend/data/tissue-bot.db

# Repo summary
sqlite3 -header -column "$DB" "
  SELECT full_name, stars, language, is_private
  FROM repos ORDER BY stars DESC LIMIT 10;
"

# Issue counts by repo
sqlite3 -header -column "$DB" "
  SELECT r.full_name, i.state, COUNT(*) AS count
  FROM issues i JOIN repos r ON r.id = i.repo_id
  GROUP BY r.full_name, i.state;
"

# Open issues with labels
sqlite3 -header -column "$DB" "
  SELECT r.full_name, i.number, i.title, GROUP_CONCAT(l.label_name) AS labels
  FROM issues i
  JOIN repos r ON r.id = i.repo_id
  LEFT JOIN issue_labels l ON l.issue_id = i.id
  WHERE i.state = 'OPEN'
  GROUP BY i.id
  LIMIT 20;
"

# Sync history
sqlite3 -header -column "$DB" "
  SELECT entity_type, entity_ref, status, message, synced_at
  FROM sync_log ORDER BY synced_at DESC LIMIT 10;
"
```

---

## 8. Export for visualisation

```bash
# CSV export for charts / notebooks
sqlite3 -header -csv "$DB" "SELECT * FROM repos;" > backend/data/repos.csv
sqlite3 -header -csv "$DB" "SELECT * FROM issues;" > backend/data/issues.csv

# JSON export
sqlite3 "$DB" "SELECT json_group_array(json_object(
  'repo', full_name, 'stars', stars, 'language', language
)) FROM repos;" | jq .
```

---

## Next steps (agent system)

| Phase | Capability | gh building block |
|-------|-----------|-------------------|
| Collect | Scheduled repo/issue sync | `collect-repos.sh`, `collect-issues.sh` |
| Analyse | Dashboards, trends | SQLite queries + CSV/JSON export |
| Resolve | Agent picks up open issues | `gh issue view`, `gh pr create`, `gh issue close` |

When you are ready, we can add Python agents, scheduled sync, and visualisation on top of this foundation.
