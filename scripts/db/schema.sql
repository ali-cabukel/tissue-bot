-- tissue-bot SQLite schema
-- Designed for data collected via gh CLI / GitHub API

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS repos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    owner           TEXT NOT NULL,
    name            TEXT NOT NULL,
    full_name       TEXT NOT NULL UNIQUE,
    description     TEXT,
    url             TEXT NOT NULL,
    stars           INTEGER DEFAULT 0,
    forks           INTEGER DEFAULT 0,
    language        TEXT,
    is_private      INTEGER DEFAULT 0,
    is_fork         INTEGER DEFAULT 0,
    is_archived     INTEGER DEFAULT 0,
    license         TEXT,
    default_branch  TEXT,
    created_at      TEXT,
    updated_at      TEXT,
    pushed_at       TEXT,
    topics          TEXT,           -- JSON array of topic names
    collected_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS issues (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id         INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    number          INTEGER NOT NULL,
    title           TEXT NOT NULL,
    state           TEXT NOT NULL,  -- OPEN, CLOSED
    body            TEXT,
    author          TEXT,
    url             TEXT NOT NULL,
    created_at      TEXT,
    updated_at      TEXT,
    collected_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (repo_id, number)
);

CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id        INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_name      TEXT NOT NULL,
    PRIMARY KEY (issue_id, label_name)
);

CREATE TABLE IF NOT EXISTS sync_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type     TEXT NOT NULL,  -- repo, issue, search
    entity_ref      TEXT NOT NULL,  -- e.g. kurtc3b3/tissue-bot or search query
    status          TEXT NOT NULL,  -- ok, error
    message         TEXT,
    synced_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_repos_owner ON repos(owner);
CREATE INDEX IF NOT EXISTS idx_repos_language ON repos(language);
CREATE INDEX IF NOT EXISTS idx_repos_stars ON repos(stars);
CREATE INDEX IF NOT EXISTS idx_issues_repo_id ON issues(repo_id);
CREATE INDEX IF NOT EXISTS idx_issues_state ON issues(state);
