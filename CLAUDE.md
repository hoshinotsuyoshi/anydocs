# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript CLI tool for indexing and searching Markdown documentation using SQLite FTS5 full-text search with Porter stemming and BM25 ranking.

## Development Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript to JavaScript
pnpm run build

# Run in dev mode with tsx (hot reload)
pnpm run dev

# Run built CLI
pnpm start
# or
node dist/index.js
```

## CLI Usage

```bash
# Index Markdown files
node dist/index.js index <root-dir> [glob-pattern]
node dist/index.js index ./docs                    # default: **/*.md
node dist/index.js index ./docs "guides/**/*.md"   # custom pattern

# Search indexed documents
node dist/index.js search "query" [-n limit]
node dist/index.js search "hello AND world" -n 5

# Retrieve specific document
node dist/index.js docs /path/to/doc.md
```

## Architecture

### Single-File Design
All code is in `src/index.ts` (125 lines). The CLI uses Commander.js for command parsing and better-sqlite3 for database operations.

### Database Schema
- Single `docs.db` file in CWD (override with `MYDOCS_DB` env var)
- FTS5 virtual table: `pages(path UNINDEXED, title, body) USING fts5(tokenize='porter')`
- WAL mode enabled for concurrency
- Auxiliary tables auto-created by FTS5: `pages_content`, `pages_data`, `pages_idx`, `pages_docsize`, `pages_config`

### Command Functions
- `cmdIndex()`: Indexes Markdown files with transactional batch processing
- `cmdSearch()`: Full-text search with BM25 scoring, returns JSON with snippets
- `cmdDocs()`: Retrieves raw Markdown content by path

### Indexing Process
1. Use fast-glob to find Markdown files matching pattern
2. Read each file and parse with gray-matter to remove YAML/TOML front-matter
3. Extract first `# Heading` as title using regex
4. Normalize paths to relative from root, `/`-prefixed (e.g., `/guide/intro.md`)
5. Delete existing entry (if any) then insert - makes indexing idempotent
6. All operations in a single transaction for atomicity

### Path Normalization
Paths are normalized in `normalizePath()` to be:
- Relative from the indexing root directory
- Forward-slash separated (even on Windows)
- Starting with `/` (e.g., `/docs/api.md`)

### Search Features
- Porter stemming: `run` matches `running`, `runs`, `ran`
- FTS5 query syntax: AND/OR/NOT, phrases with quotes, prefix search with `*`, NEAR operator
- Snippet highlighting: `<b>...</b>` tags around matches
- BM25 scoring for relevance ranking (lower scores = better match)

## Output Formats

- `index`: Logs to stderr (file count, progress, completion)
- `search`: JSON array to stdout with `{path, title, snippet, score}`, stable key order
- `docs`: Raw Markdown to stdout (front-matter removed), exits 1 if not found

## Key Dependencies

- `better-sqlite3`: Native SQLite bindings (requires compilation)
- `commander`: CLI argument parsing
- `fast-glob`: Fast file matching with glob patterns
- `gray-matter`: YAML/TOML front-matter parsing

## Important Implementation Details

- `openDb()` ensures WAL mode and creates FTS5 table on every invocation (idempotent)
- Indexing uses prepared statements + transaction for performance
- Path normalization handles cross-platform path separators
- Front-matter is stripped from indexed body but title extraction happens post-stripping
- Exit codes: 0 for success, 1 for not found (docs command)
- Database location: CWD by default, configurable via `MYDOCS_DB` environment variable
