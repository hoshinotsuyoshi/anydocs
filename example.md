# mydocs - Usage Example

This document shows a real-world example using Next.js documentation.

## Setup

```bash
# 1. Build the project
pnpm install
pnpm run build
```

## Setup Documentation Directory

```bash
# Create mydocs directory structure
mkdir -p ~/.local/share/mydocs/docs

# Clone Next.js repository (shallow clone)
git clone --depth 1 https://github.com/vercel/next.js.git /tmp/nextjs-clone

# Create symlink to Next.js docs
ln -sfn /tmp/nextjs-clone/docs ~/.local/share/mydocs/docs/nextjs
```

## Index the Documentation

```bash
# Index all Markdown and MDX files
# Database will be created at ~/.local/share/mydocs/docs.db
node dist/index.js index ~/.local/share/mydocs/docs/nextjs "**/*.{md,mdx}" --project nextjs
```

**Output:**
```
Found 374 files to index for project: nextjs
Indexed: /index.mdx
Indexed: /03-architecture/supported-browsers.mdx
Indexed: /03-architecture/index.mdx
...
Indexed: /02-pages/04-api-reference/04-config/01-next-config-js/webpack.mdx
Indexing complete
```

**Statistics:**
- Total files indexed: 374
- Database size: 3.6 MB
- Directory depth: 4-5 levels
- Largest file: 57 KB (image.mdx)

## Search Examples

### Basic Search

```bash
node dist/index.js search "routing"
```

**Output:**
```json
[
  {
    "path": "/01-app/01-getting-started/15-route-handlers.mdx",
    "project": "nextjs",
    "title": "",
    "snippet": "\n## Route Handlers\n\nRoute Handlers allow you to create custom request...",
    "score": -0.8348340006798176
  },
  {
    "path": "/01-app/01-getting-started/02-project-structure.mdx",
    "project": "nextjs",
    "title": "",
    "snippet": "...A route becomes public when a `page` or `route` file...",
    "score": -0.8313367184491345
  }
]
```

### Complex Query (AND)

```bash
node dist/index.js search "server components AND data fetching" -n 2
```

**Output:**
```json
[
  {
    "path": "/01-app/02-guides/caching.mdx",
    "project": "nextjs",
    "title": "",
    "snippet": "...Instead, you can fetch data in the components that need...",
    "score": -3.1386165826942443
  },
  {
    "path": "/01-app/03-api-reference/04-functions/fetch.mdx",
    "project": "nextjs",
    "title": "",
    "snippet": "...fetch` with `async` and `await` directly within Server Components.\n\n```tsx...",
    "score": -3.114538621607736
  }
]
```

### Limited Results

```bash
node dist/index.js search "middleware" -n 3
```

**Output:**
```json
[
  {
    "path": "/01-app/03-api-reference/03-file-conventions/proxy.mdx",
    "project": "nextjs",
    "title": "",
    "snippet": "...The term \"middleware\" often confuses users with Express.js middleware...",
    "score": -6.740092265927857
  },
  {
    "path": "/01-app/03-api-reference/05-config/01-next-config-js/adapterPath.mdx",
    "project": "nextjs",
    "title": "",
    "snippet": "...string\n}\n```\n\n### Middleware (`outputs.middleware`)\n\nMiddleware function (if present):\n\n```typescript\n{\n  type...",
    "score": -6.113219224959214
  },
  {
    "path": "/01-app/02-guides/upgrading/codemods.mdx",
    "project": "nextjs",
    "title": "",
    "snippet": "...It:\n\n- Renames `middleware.<extension>` to `proxy.<extension>` (e.g. `middleware...",
    "score": -5.981460120663272
  }
]
```

## Retrieve Document

```bash
node dist/index.js docs "/01-app/01-getting-started/15-route-handlers.mdx"
```

**Output (first 30 lines):**
```markdown
## Route Handlers

Route Handlers allow you to create custom request handlers for a given route using the Web [Request](https://developer.mozilla.org/docs/Web/API/Request) and [Response](https://developer.mozilla.org/docs/Web/API/Response) APIs.

<Image
  alt="Route.js Special File"
  srcLight="/docs/light/route-special-file.png"
  srcDark="/docs/dark/route-special-file.png"
  width="1600"
  height="444"
/>

> **Good to know**: Route Handlers are only available inside the `app` directory. They are the equivalent of [API Routes](/docs/pages/building-your-application/routing/api-routes) inside the `pages` directory meaning you **do not** need to use API Routes and Route Handlers together.

### Convention

Route Handlers are defined in a [`route.js|ts` file](/docs/app/api-reference/file-conventions/route) inside the `app` directory:

```ts filename="app/api/route.ts" switcher
export async function GET(request: Request) {}
```

```js filename="app/api/route.js" switcher
export async function GET(request) {}
```

Route Handlers can be nested anywhere inside the `app` directory, similar to `page.js` and `layout.js`. But there **cannot** be a `route.js` file at the same route segment level as `page.js`.
```

## Database Inspection

```bash
# Database location
ls -lh ~/.local/share/mydocs/docs.db
# Output: -rw-r--r--  1 user  staff   3.6M Nov  2 13:56 docs.db

# Count total documents
sqlite3 ~/.local/share/mydocs/docs.db "SELECT COUNT(*) as total_docs FROM pages;"
# Output: 374

# Show largest documents
sqlite3 ~/.local/share/mydocs/docs.db "SELECT path, LENGTH(body) as size FROM pages ORDER BY size DESC LIMIT 5;"
# Output:
# /01-app/03-api-reference/02-components/image.mdx|57234
# /01-app/02-guides/authentication.mdx|54081
# /01-app/03-api-reference/04-functions/generate-metadata.mdx|44196
# /01-app/02-guides/caching.mdx|37817
# /01-app/02-guides/migrating/app-router-migration.mdx|37162
```

## Directory Structure

```
~/.local/share/mydocs/
├── docs.db                           # SQLite database
└── docs/                             # Documentation root
    └── nextjs/                       # Symlink to /tmp/nextjs-clone/docs
        ├── 01-app/
        │   ├── 01-getting-started/
        │   ├── 02-guides/
        │   └── 03-api-reference/
        ├── 02-pages/
        │   ├── 01-getting-started/
        │   ├── 02-guides/
        │   ├── 03-building-your-application/
        │   └── 04-api-reference/
        ├── 03-architecture/
        ├── 04-community/
        └── app/
            └── api-reference/
```

## Features Demonstrated

- ✅ XDG Base Directory compliance (`~/.local/share/mydocs/`)
- ✅ Symlink support for flexible organization
- ✅ Multi-project support with `--project` flag
- ✅ Recursive directory scanning (4-5 levels deep)
- ✅ Multiple file extensions (.md and .mdx)
- ✅ Large-scale indexing (374 files)
- ✅ Complex search queries (AND, OR, NOT)
- ✅ Path normalization relative to indexed root
- ✅ Front-matter removal
- ✅ Full-text search with BM25 ranking
- ✅ Porter stemming (run ≈ running)
- ✅ Highlighted snippets in search results
