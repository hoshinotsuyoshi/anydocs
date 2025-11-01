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
# Index Markdown files (--project is required)
node dist/index.js index <root-dir> [glob-pattern] --project <name>
node dist/index.js index ./docs --project myproject                    # default: **/*.md
node dist/index.js index ./docs "guides/**/*.md" --project myproject   # custom pattern

# Search indexed documents
node dist/index.js search "query" [-n limit] [--project <name>]
node dist/index.js search "hello AND world" -n 5                       # all projects
node dist/index.js search "query" --project nextjs --project react     # specific projects

# Retrieve specific document (use absolute path)
node dist/index.js docs /absolute/path/to/doc.md [--project <name>]
```

## Architecture

### Single-File Design
All code is in `src/index.ts` (125 lines). The CLI uses Commander.js for command parsing and better-sqlite3 for database operations.

### Database Schema
- Single `docs.db` file in CWD (override with `MYDOCS_DB` env var)
- FTS5 virtual table: `pages(path UNINDEXED, project UNINDEXED, title, body) USING fts5(tokenize='porter')`
- WAL mode enabled for concurrency
- Supports multiple projects in a single database
- Auxiliary tables auto-created by FTS5: `pages_content`, `pages_data`, `pages_idx`, `pages_docsize`, `pages_config`

### Command Functions
- `cmdIndex()`: Indexes Markdown files with transactional batch processing
- `cmdSearch()`: Full-text search with BM25 scoring, returns JSON with snippets
- `cmdDocs()`: Retrieves raw Markdown content by path

### Indexing Process
1. Use fast-glob to find Markdown files matching pattern (returns absolute paths)
2. Read each file and parse with gray-matter to remove YAML/TOML front-matter
3. Extract first `# Heading` as title using regex
4. Store absolute file paths as-is (e.g., `/Users/user/docs/guide/intro.md`)
5. Delete existing entry (if any) by path and project, then insert - makes indexing idempotent
6. All operations in a single transaction for atomicity

### Path Storage
Paths are stored as absolute paths:
- Full absolute path from the filesystem (e.g., `/Users/user/docs/api.md`)
- No normalization or relativization applied
- Enables multiple projects with same-named files without conflicts
- Project name stored separately in `project` column for filtering

### Search Features
- Porter stemming: `run` matches `running`, `runs`, `ran`
- FTS5 query syntax: AND/OR/NOT, phrases with quotes, prefix search with `*`, NEAR operator
- Snippet highlighting: `<b>...</b>` tags around matches
- BM25 scoring for relevance ranking (lower scores = better match)

## Output Formats

- `index`: Logs to stderr (file count with project name, absolute paths, completion)
- `search`: JSON array to stdout with `{path, project, title, snippet, score}`, stable key order
- `docs`: Raw Markdown to stdout (front-matter removed), exits 1 if not found

## Key Dependencies

- `better-sqlite3`: Native SQLite bindings (requires compilation)
- `commander`: CLI argument parsing
- `fast-glob`: Fast file matching with glob patterns
- `gray-matter`: YAML/TOML front-matter parsing

## Important Implementation Details

- `openDb()` ensures WAL mode and creates FTS5 table on every invocation (idempotent)
- Indexing uses prepared statements + transaction for performance
- Paths are stored as absolute paths (no relativization)
- Multiple projects can coexist in one database with `project` column filtering
- Front-matter is stripped from indexed body but title extraction happens post-stripping
- Exit codes: 0 for success, 1 for not found (docs command)
- Database location: CWD by default, configurable via `MYDOCS_DB` environment variable
