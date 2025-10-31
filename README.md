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

## Usage

### 1. Insert documents (manual, until `index` command is implemented)

```bash
sqlite3 docs.db "INSERT INTO pages VALUES('/guide/intro.md','Intro','# Hello world
This is a test document.');"
```

### 2. Retrieve a document

```bash
node dist/index.js docs /guide/intro.md
```

### 3. Search documents

```bash
# Basic search
node dist/index.js search "hello"

# Limit results
node dist/index.js search "world" -n 5
```

## Architecture

- **Database**: Single `docs.db` file (override with `MYDOCS_DB` environment variable)
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

- [ ] Implement `index <root> [pattern]` command to recursively index Markdown files
- [ ] Parse and extract front-matter
- [ ] Extract first heading as title
- [ ] Normalize paths (relative from root, starting with `/`)
- [ ] Make indexing idempotent (replace existing paths)
- [ ] Add transactional batch indexing
- [ ] Support differential re-indexing with mtime tracking
- [ ] Implement `export-llms` command for llms.txt generation

## Specification

1. Index Markdown documents with SQLite FTS5 (Porter tokenizer)
2. Store in single `docs.db` file (configurable via `MYDOCS_DB`)
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
