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
node dist/index.js

# Testing
pnpm test              # Run tests in watch mode
pnpm test:run          # Run all tests once
pnpm test:ui           # Open Vitest UI

# Linting and formatting
pnpm run lint          # Check code with Biome
pnpm run lint:fix      # Auto-fix issues
pnpm run format        # Format code
```

## CLI Usage

```bash
# Initialize mydocs (creates directory structure and config)
node dist/index.js init

# Configure projects in ~/.config/mydocs/mydocs.json
# Example minimal config (only repo is required):
# {
#   "projects": [
#     { "repo": "vercel/next.js" },
#     { "repo": "facebook/react" }
#   ]
# }
#
# Example with all options:
# {
#   "projects": [
#     {
#       "repo": "github.com/vuejs/core",
#       "name": "vue3",
#       "ref": "v3.4.0",
#       "path": "packages/*/README.md",
#       "sparse-checkout": ["packages/vue"],
#       "options": ["--toml-engine", "smol-toml"]
#     }
#   ]
# }

# Install all projects (clone and index)
node dist/index.js install

# Install specific project only
node dist/index.js install --project next.js

# Search indexed documents
node dist/index.js search "query" [-n limit] [--project <name>]
node dist/index.js search "safeParse" -n 5
node dist/index.js search "hello AND world" --project next.js --project react

# Retrieve specific document
node dist/index.js docs /path/from/root.md --project next.js
```

## Architecture Overview

### Code Organization (1 file = 1 function principle)

```
src/
├── index.ts                   # CLI entry point (Commander.js)
├── cli/
│   ├── collectProjects.ts     # CLI option collector
│   └── commands/
│       ├── cmdInit.ts         # Init command (directory setup)
│       ├── cmdInstall.ts      # Install command (clone + index)
│       ├── cmdIndex.ts        # Index command with processFile()
│       ├── cmdSearch.ts       # Search command with sanitization
│       └── cmdDocs.ts         # Docs retrieval command
├── sync/
│   ├── configSchemas.ts       # mydocs.json schema and normalization
│   ├── lockfileSchemas.ts     # mydocs-lock.yaml schema
│   ├── lockfileOperations.ts  # Read/write/update lockfile
│   ├── gitOperations.ts       # Git clone and ref resolution
│   └── parseRepoUrl.ts        # Parse owner/repo or host/owner/repo
├── db/
│   ├── openDb.ts              # Database initialization with Result
│   ├── schemas.ts             # Valibot schemas for runtime validation
│   └── sanitizeFts5Query.ts   # FTS5 query sanitization
├── indexer/
│   ├── readFile.ts            # File reading with Result
│   ├── parseFrontMatter.ts    # Front-matter parsing (YAML/TOML)
│   ├── extractTitle.ts        # Extract first # heading
│   └── normalizePath.ts       # Path normalization with Result
└── config/
    ├── getConfigHome.ts       # XDG_CONFIG_HOME support
    ├── getDataHome.ts         # XDG_DATA_HOME support
    └── paths.ts               # Global path constants
```

### Railway Oriented Programming with neverthrow

This codebase consistently uses neverthrow's `Result<T, E>` type for error handling:

- **No try/catch blocks**: All fallible operations wrapped in `Result.fromThrowable()`
- **Chaining with andThen**: Sequential operations that depend on previous results
- **Error transformation with mapErr**: Convert errors to appropriate types
- **Explicit error handling**: Every Result is checked with `.isOk()` or `.isErr()`

Example pattern:
```typescript
return readFile(filePath)
  .mapErr((err) => ({ type: "read_error", reason: err.reason }))
  .andThen((content) => parseFrontMatter(content))
  .andThen((body) => normalizePath(filePath, root).map((path) => ({ path, body })));
```

### Runtime Schema Validation with Valibot

Database query results are validated at runtime using Valibot schemas defined in `src/db/schemas.ts`:

- `PageRowSchema`: Validates document retrieval results
- `SearchResultRowSchema`: Validates search query results
- Type inference: `type PageRow = v.InferOutput<typeof PageRowSchema>`
- neverthrow integration: `parsePageRow()` returns `Result<PageRow, Error>`

### FTS5 Query Sanitization

User search queries are sanitized before execution to prevent syntax errors:

- Automatically quotes queries with special characters (hyphens, asterisks, etc.)
- Preserves advanced FTS5 syntax (AND, OR, NOT, NEAR operators)
- Preserves already-quoted phrases
- Implementation: `src/db/sanitizeFts5Query.ts`

### Database Schema

```sql
CREATE VIRTUAL TABLE pages USING fts5(
  path UNINDEXED,      -- Relative path from indexing root
  project UNINDEXED,   -- Project name for filtering
  title,               -- First # heading (searchable)
  body,                -- Markdown content without front-matter (searchable)
  tokenize='porter'    -- Porter stemming for English
);
```

- **Multi-project support**: Single database stores multiple projects
- **WAL mode**: Enabled for better concurrency
- **BM25 ranking**: Lower scores = better match
- **Snippet generation**: `snippet()` function with `<b>...</b>` highlighting

### Directory Structure

```
$XDG_CONFIG_HOME/mydocs/         (or $HOME/.config/mydocs/)
└── mydocs.json                  # User-editable config

$XDG_DATA_HOME/mydocs/           (or $HOME/.local/share/mydocs/)
├── mydocs-lock.yaml             # Auto-generated lockfile
├── db/
│   └── default.db               # Main database
├── repos/                       # Cloned repositories (ghq-style)
│   └── github.com/
│       ├── vercel/
│       │   └── next.js/
│       └── facebook/
│           └── react/
└── docs/                        # Symlinks to repo docs
    ├── next.js -> ../repos/github.com/vercel/next.js/docs
    └── react -> ../repos/github.com/facebook/react/docs
```

### Configuration and Lockfile

**Config file** (`~/.config/mydocs/mydocs.json`):
- User-editable project list
- Only `repo` field is required
- Defaults: `name` (from repo), `ref` (default branch), `path` (`**/*.{md,mdx}`)
- Supports ghq-style paths: `owner/repo` (implies GitHub) or `host/owner/repo`

**Lockfile** (`~/.local/share/mydocs/mydocs-lock.yaml`):
- Auto-generated, tracks installed state
- Fields: `name`, `repo` (full path), `ref-requested`, `ref-resolved` (commit hash), `cloned-at`, `indexed-at`
- Always uses full path format (e.g., `github.com/owner/repo`)

### Path Normalization

- Paths stored relative to indexing root directory
- Format: `/`-prefixed, `/`-separated (e.g., `/guide/intro.md`)
- Symlinks resolved with `fs.realpathSync()` for consistency
- Config: `$XDG_CONFIG_HOME/mydocs` or `$HOME/.config/mydocs`
- Data: `$XDG_DATA_HOME/mydocs` or `$HOME/.local/share/mydocs`
- Database: `$XDG_DATA_HOME/mydocs/db/default.db`
- Repositories: `$XDG_DATA_HOME/mydocs/repos/host/owner/repo` (ghq-style)

### Front-matter Parsing

Supports YAML, TOML, and JSON front-matter:

- YAML: `---` delimiters (standard)
- TOML: `+++` delimiters (standard) or `---` with `language: 'toml'` (Supabase-style)
- JSON: `;;;` delimiters
- Two TOML engines: `toml` (default) or `smol-toml` (via `--toml-engine` option)
- Front-matter stripped before indexing but title extracted post-stripping

### Install Process (cmdInstall)

1. Read and parse `mydocs.json` config with Valibot validation
2. Normalize all projects (apply defaults for `name`, `ref`, `path`)
3. Filter projects if `--project` flag specified
4. Read existing lockfile (or create empty one)
5. **Clone/update phase** (`processCloning`):
   - For each project: `cloneRepository()` → `Result<CloneResult, GitError>`
   - Detect default branch if `ref` not specified: `git symbolic-ref refs/remotes/origin/HEAD`
   - Update lockfile with `ref-requested` (branch name) and `ref-resolved` (commit hash)
   - Create symlink: `docs/project-name -> repos/host/owner/repo`
6. Write lockfile after cloning
7. **Indexing phase** (`processIndexing`):
   - For each project: call `cmdIndex()` internally
   - Update `indexed-at` timestamp in lockfile
8. Write final lockfile with timestamps

### Indexing Process (cmdIndex)

1. Open database with `openDb()` → `Result<Database, DbError>`
2. Find files with fast-glob (returns absolute paths)
3. Process each file with `processFile()`:
   - Read file → `Result<string, ReadFileError>`
   - Parse front-matter → `Result<string, Error>`
   - Extract title from first `# heading`
   - Normalize path → `Result<string, NormalizePathError>`
4. Execute in transaction with error handling:
   - Delete existing entry (idempotent)
   - Insert new entry
   - Transaction wrapped in `Result.fromThrowable()` for safety

### Search Process (cmdSearch)

1. Open database with `openDb()`
2. Sanitize query with `sanitizeFts5Query()` to prevent syntax errors
3. Build SQL with project filters and limit
4. Execute query wrapped in `Result.fromThrowable()` for error handling
5. Validate results with Valibot `parseSearchResultRows()`
6. Output JSON to stdout

## Key Dependencies

- **neverthrow** (8.2.0): Type-safe error handling with Result types
- **valibot** (1.1.0): Lightweight runtime schema validation (~600 bytes)
- **better-sqlite3** (12.4.1): Native SQLite bindings with FTS5 support
- **commander** (14.0.2): CLI argument parsing
- **fast-glob** (3.3.3): Fast file matching with glob patterns
- **gray-matter** (4.0.3): Front-matter parsing (YAML/TOML/JSON)
- **js-yaml** (4.1.0): YAML parsing for config and lockfile
- **toml** (3.0.0): TOML parser (default)
- **smol-toml** (1.4.2): Alternative lightweight TOML parser

## Testing

- **Framework**: Vitest with @vitest/ui
- **Coverage**: 76 tests covering all utility functions
- **Co-location**: Test files next to source files (e.g., `readFile.test.ts`)
- **Testing philosophy**: Test utilities and error cases, commands are integration-tested manually

Run a single test file:
```bash
pnpm test src/indexer/readFile.test.ts
```

## Code Style and Patterns

### Inevitable Code Principles

This codebase follows "Inevitable Code" principles (scored 10/10 by ts-coder agent):

1. **Minimal decision points**: Clear, obvious paths forward
2. **Errors are explicit**: Result types make error handling unavoidable
3. **Functions over classes**: Pure functions with composition
4. **Railway Oriented Programming**: Linear flow via andThen/mapErr chains
5. **Type-safe at boundaries**: Runtime validation with Valibot at system edges

### Common Patterns

**Error handling**:
```typescript
const result = fallibleOperation();
if (result.isErr()) {
  console.error(`Error: ${result.error.message}`);
  process.exit(1);
}
const value = result.value;
```

**Discriminated unions for errors**:
```typescript
type MyError =
  | { type: "not_found"; path: string }
  | { type: "parse_error"; reason: string };
```

**Valibot schema validation**:
```typescript
const result = parseMySchema(unknownData);
if (result.isErr()) {
  // Handle validation error
}
const validData = result.value; // Type-safe!
```

## Important Notes

- All package versions use exact pinning (no `^` or `~`) via `.npmrc` `save-exact=true`
- Exit codes: 0 for success, 1 for errors
- **Config file**: `~/.config/mydocs/mydocs.json` (user-editable, only `repo` required)
- **Lockfile**: `~/.local/share/mydocs/mydocs-lock.yaml` (auto-generated, do not edit)
- **Repository format**: `owner/repo` (implies GitHub) or `host/owner/repo` (explicit host)
- **Default branch detection**: Automatic via `git symbolic-ref` when `ref` not specified
- Install is idempotent: re-running updates existing installations
- Indexing is idempotent: re-indexing same path updates the entry
- All output uses stable JSON key order for testing
- `init` and `install` log to stderr, `search` and `docs` output to stdout
- Porter stemming: `run` matches `running`, `runs`, `ran`
- FTS5 query syntax: AND/OR/NOT, phrases with `"quotes"`, prefix with `*`, NEAR operator
