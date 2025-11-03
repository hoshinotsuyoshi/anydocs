# mydocs

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

# 2. Create a test directory with Markdown files
mkdir -p docs/guide
cat > docs/guide/intro.md << 'EOF'
---
title: Introduction
date: 2025-01-01
---

# Getting Started

Welcome to the documentation system!
EOF

# 3. Index the documents
node dist/index.js index docs

# 4. Search for content
node dist/index.js search "documentation"

# 5. Retrieve a specific document
node dist/index.js docs /guide/intro.md
```

## Usage

### Index Markdown Files

Index all Markdown files in a directory:

```bash
# Index with default pattern (**/*.md)
node dist/index.js index ./docs

# Index with custom glob pattern
node dist/index.js index ./docs "**/*.{md,markdown}"

# Index subdirectories only
node dist/index.js index ./docs "guides/**/*.md"
```

**What indexing does:**
- Scans directory recursively for Markdown files
- Removes YAML/TOML front-matter
- Extracts first `# Heading` as title
- Normalizes paths (relative from root, starting with `/`)
- Stores in SQLite FTS5 for fast search
- Idempotent: re-indexing same path updates the entry

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
# Clean start
rm -f docs.db*

# Index your documentation
node dist/index.js index ./my-docs

# Search for keywords
node dist/index.js search "installation" -n 3

# Get specific document
node dist/index.js docs /getting-started.md

# Re-index (updates existing entries)
node dist/index.js index ./my-docs
```

## Architecture

- **Database**: Single `db/default.db` file at `$XDG_DATA_HOME/mydocs/db/default.db`
- **Schema**: `pages(path UNINDEXED, title, body) USING fts5(tokenize='porter')`
- **Output**:
  - `docs`: Raw Markdown to stdout
  - `search`: JSON array with `{path, title, snippet, score}`

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
- [ ] Support differential re-indexing with mtime tracking
- [ ] Implement `export-llms` command for llms.txt generation
- [ ] Add CLI package installation (npm/pnpm global install)
- [ ] Add progress indicator for large indexing jobs

## Specification

1. Index Markdown documents with SQLite FTS5 (Porter tokenizer)
2. Store in single `db/default.db` file at `$XDG_DATA_HOME/mydocs/db/default.db`
3. Schema: `pages(path UNINDEXED, title, body) USING fts5(tokenize='porter')`
4. `index <root> [pattern]`: Index Markdown files (default `**/*.md`)
5. Strip front-matter, extract first `# ...` as title
6. Idempotent indexing: same path replaces existing entry
7. Path normalization: relative from root, `/`-separated, starts with `/`
8. `docs <path>`: Output raw Markdown to stdout
9. `search <query> [-n N]`: Output JSON array with path, title, snippet, score
10. Search with `MATCH` clause + BM25 ranking, snippet with `<b>...</b>` (default 10 results)
11. Porter stemming for English word forms
12. FTS5 query syntax: AND/OR/NOT, phrases, NEAR, prefix `*`
13. Error handling: `docs` exits non-zero if not found, `search` returns empty array
14. Performance: Support differential re-indexing (future)
15. Stable output: Fixed JSON key order for testing
16. `export-llms`: Generate llms.txt/llms-full.txt (future)
17. Runtime: Node.js with better-sqlite3, works with pnpm/Bun

## Development

```bash
# Dev mode with tsx
pnpm run dev

# Build TypeScript
pnpm run build

# Run built CLI
pnpm start
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
