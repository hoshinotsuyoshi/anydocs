# anydocs

Markdown documentation search CLI using SQLite FTS5 full-text search.

## Features

- **Full-text search** with SQLite FTS5 and Porter stemming
- **Fast local indexing** with better-sqlite3
- **Simple CLI** with `docs` and `search` commands
- **WAL mode** enabled for better concurrency
- **BM25 ranking** for search results

## Installation

```bash
pnpm install
pnpm run build
```

## Quick Start

```bash
# 1. Build the project
pnpm install
pnpm run build

# 2. Initialize anydocs
node dist/index.js init

# 3. Edit config file at ~/.config/anydocs/anydocs.json
cat > ~/.config/anydocs/anydocs.json << 'EOF'
{
  "projects": [
    { "repo": "vercel/next.js" }
  ]
}
EOF

# 4. Install (clone and index) projects
node dist/index.js install

# 5. Search for content
node dist/index.js search "routing" -n 5

# 6. Retrieve a specific document
node dist/index.js docs /docs/app/getting-started.md --project next.js
```

## Usage

### Configure Projects

Edit `~/.config/anydocs/anydocs.json` to define projects:

```json
{
  "projects": [
    { "repo": "vercel/next.js" },
    { "repo": "facebook/react" },
    {
      "repo": "github.com/vuejs/core",
      "name": "vue3",
      "ref": "v3.4.0",
      "path": "packages/*/README.md"
    }
  ]
}
```

**Configuration fields:**
- `repo` (required): Repository in `owner/repo` or `host/owner/repo` format
- `name` (optional): Project name, defaults to repo name (e.g., "next.js")
- `ref` (optional): Git branch or tag, defaults to repository's default branch
- `path` (optional): Glob pattern for indexing, defaults to `**/*.{md,mdx}`
- `sparse-checkout` (optional): Array of paths for sparse checkout
- `options` (optional): Additional CLI options

### Install Projects

Install (clone and index) all configured projects:

```bash
# Install all projects
node dist/index.js install

# Install specific project only
node dist/index.js install --project next.js
```

**What install does:**
- Clones repositories to `~/.local/share/anydocs/repos/host/owner/repo`
- Creates symlinks under `~/.local/share/anydocs/docs/`
- Indexes Markdown files matching the glob pattern
- Updates lockfile at `~/.local/share/anydocs/anydocs-lock.yaml`
- Idempotent: re-running updates existing installations

### Search Documents

```bash
# Basic search
node dist/index.js search "hello"

# Limit number of results
node dist/index.js search "world" -n 5

# Search with FTS5 query syntax
node dist/index.js search "hello AND world"
node dist/index.js search '"exact phrase"'
node dist/index.js search "run*"  # Prefix search
node dist/index.js search "hello OR world"
node dist/index.js search "hello NOT world"
```

**Search output (JSON):**
```json
[
  {
    "path": "/guide/intro.md",
    "title": "Getting Started",
    "snippet": "Welcome to the <b>documentation</b> system!",
    "score": -0.0000015
  }
]
```

### Retrieve Document

Retrieve the raw Markdown content:

```bash
node dist/index.js docs /guide/intro.md
```

Output is the original Markdown with front-matter removed.

### Complete Example

```bash
# Initialize anydocs
node dist/index.js init

# Configure projects
cat > ~/.config/anydocs/anydocs.json << 'EOF'
{
  "projects": [
    { "repo": "vercel/next.js" },
    { "repo": "facebook/react" }
  ]
}
EOF

# Install all projects
node dist/index.js install

# Search across all projects
node dist/index.js search "hooks" -n 5

# Search specific project
node dist/index.js search "routing" --project next.js

# Get specific document
node dist/index.js docs /docs/app/routing.md --project next.js

# Re-install (updates existing entries)
node dist/index.js install
```

## Architecture

- **Config**: `~/.config/anydocs/anydocs.json` (user-editable project list)
- **Lockfile**: `~/.local/share/anydocs/anydocs-lock.yaml` (auto-generated)
- **Repositories**: `~/.local/share/anydocs/repos/host/owner/repo`
- **Symlinks**: `~/.local/share/anydocs/docs/project-name`
- **Database**: `~/.local/share/anydocs/db/default.db` (SQLite FTS5)
- **Schema**: `pages(path UNINDEXED, project UNINDEXED, title, body) USING fts5(tokenize='porter')`
- **Output**:
  - `docs`: Raw Markdown to stdout
  - `search`: JSON array with `{path, project, title, snippet, score}`

## Search Features

- **Porter stemming**: `run` matches `running`
- **FTS5 syntax**: AND/OR/NOT, phrases, NEAR, prefix search with `*`
- **Highlighting**: Search snippets with `<b>...</b>` tags
- **BM25 scoring**: Relevance-ranked results

## TODO

- [x] Implement `index <root> [pattern]` command to recursively index Markdown files
- [x] Parse and extract front-matter
- [x] Extract first heading as title
- [x] Normalize paths (relative from root, starting with `/`)
- [x] Make indexing idempotent (replace existing paths)
- [x] Add transactional batch indexing
- [x] Add `init` command for directory setup
- [x] Add `install` command with anydocs.json config
- [x] Support ghq-style repository paths (owner/repo or host/owner/repo)
- [x] Auto-detect repository default branch
- [x] Generate lockfile (anydocs-lock.yaml)
- [ ] Support differential re-indexing with mtime tracking
- [ ] Implement `export-llms` command for llms.txt generation
- [ ] Add CLI package installation (npm/pnpm global install)
- [ ] Add progress indicator for large indexing jobs

## Specification

1. **Configuration**: `~/.config/anydocs/anydocs.json` defines projects with minimal required fields
2. **Repository format**: Supports `owner/repo` (implies GitHub) or `host/owner/repo`
3. **Default values**: Only `repo` required; `name`, `ref`, `path` have smart defaults
4. **Lockfile**: Auto-generated `anydocs-lock.yaml` tracks cloned refs and timestamps
5. **Storage**: Repositories at `$XDG_DATA_HOME/anydocs/repos/host/owner/repo`
6. **Database**: Single FTS5 database at `$XDG_DATA_HOME/anydocs/db/default.db`
7. **Schema**: `pages(path UNINDEXED, project UNINDEXED, title, body) USING fts5(tokenize='porter')`
8. **Commands**:
   - `init`: Create directory structure and empty config
   - `install [--project name]`: Clone repos and index docs
   - `search <query> [-n N] [--project name]`: Full-text search
   - `docs <path> [--project name]`: Retrieve document
9. **Indexing**: Strip front-matter, extract first `# ...` as title
10. **Idempotent**: Re-running `install` updates existing installations
11. **Path normalization**: Relative from repo root, `/`-separated, starts with `/`
12. **Search**: BM25 ranking, Porter stemming, FTS5 syntax (AND/OR/NOT/NEAR/*)
13. **Output**: JSON with fixed key order, snippets with `<b>...</b>` highlighting
14. **Error handling**: Exit non-zero on errors, empty array for no results
15. **Runtime**: Node.js with better-sqlite3, TypeScript, works with pnpm

## Development

```bash
# Install dependencies
pnpm install

# Build TypeScript to JavaScript
pnpm run build

# Run tests
pnpm test:run          # Run all tests once
pnpm test              # Run tests in watch mode
pnpm test:ui           # Open Vitest UI

# Linting and formatting
pnpm run lint          # Check code
pnpm run lint:fix      # Auto-fix issues
pnpm run format        # Format code

# Development with tsx (no build needed)
pnpm run dev init
pnpm run dev install
pnpm run dev search "query"

# Run built CLI
node dist/index.js init
node dist/index.js search "query"
```

## Database Schema

```sql
CREATE VIRTUAL TABLE pages USING fts5(
  path UNINDEXED,
  title,
  body,
  tokenize='porter'
);
```

FTS5 creates auxiliary tables: `pages_content`, `pages_data`, `pages_idx`, `pages_docsize`, `pages_config`.
