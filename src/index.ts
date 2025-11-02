#!/usr/bin/env node
import { Command } from "commander";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import fg from "fast-glob";
import matter from "gray-matter";
import toml from "toml";

function getDataHome(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME;
  if (xdgDataHome) {
    return xdgDataHome;
  }
  return path.join(homedir(), ".local", "share");
}

const MYDOCS_ROOT = path.join(getDataHome(), "mydocs");
const MYDOCS_DOCS = path.join(MYDOCS_ROOT, "docs");
const DB_PATH = process.env.MYDOCS_DB ?? path.join(MYDOCS_ROOT, "docs.db");

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS pages USING fts5(
      path UNINDEXED,
      project UNINDEXED,
      title,
      body,
      tokenize='porter'
    );
  `);
  return db;
}

function cmdDocs(p: string, project: string) {
  const db = openDb();
  const row = db.prepare("SELECT body FROM pages WHERE path = ? AND project = ?").get(p, project) as { body: string } | undefined;

  if (!row) {
    console.error(`Not found: ${p} in project: ${project}`);
    process.exit(1);
  }
  process.stdout.write(row.body);
}

function cmdSearch(query: string, projects: string[] = [], limit = 10) {
  const db = openDb();

  let sql: string;
  let params: (string | number)[];

  if (projects.length > 0) {
    const placeholders = projects.map(() => "?").join(", ");
    sql = `
      SELECT path, project, title,
             snippet(pages, 3, '<b>', '</b>', '...', 10) AS snippet,
             bm25(pages) AS score
      FROM pages
      WHERE pages MATCH ? AND project IN (${placeholders})
      ORDER BY score
      LIMIT ?;
    `;
    params = [query, ...projects, limit];
  } else {
    sql = `
      SELECT path, project, title,
             snippet(pages, 3, '<b>', '</b>', '...', 10) AS snippet,
             bm25(pages) AS score
      FROM pages
      WHERE pages MATCH ?
      ORDER BY score
      LIMIT ?;
    `;
    params = [query, limit];
  }

  const rows = db.prepare(sql).all(...params);
  process.stdout.write(JSON.stringify(rows, null, 2));
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function normalizePath(filePath: string, rootDir: string): string {
  // Get real path (resolves symlinks) for the file
  const realFilePath = fs.realpathSync(filePath);

  // Get real path for rootDir (the directory being indexed)
  const realRootDir = fs.realpathSync(rootDir);

  // Return path relative to the indexing root
  const rel = path.relative(realRootDir, realFilePath);
  const normalized = "/" + rel.split(path.sep).join("/");
  return normalized;
}

function cmdIndex(rootDir: string, project: string, pattern = "**/*.md") {
  const db = openDb();
  const absoluteRoot = path.resolve(rootDir);

  // Find all markdown files
  const files = fg.sync(pattern, {
    cwd: absoluteRoot,
    absolute: true,
    onlyFiles: true,
  });

  console.error(`Found ${files.length} files to index for project: ${project}`);

  // Prepare statements
  const deleteStmt = db.prepare("DELETE FROM pages WHERE path = ? AND project = ?");
  const insertStmt = db.prepare("INSERT INTO pages (path, project, title, body) VALUES (?, ?, ?, ?)");

  // Process in transaction
  const indexAll = db.transaction(() => {
    let indexed = 0;
    let skipped = 0;
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");

        // Parse and remove front-matter (supports YAML, TOML, JSON)
        const { content: body } = matter(content, {
          engines: {
            toml: toml.parse.bind(toml),
          },
        });

        // Extract title from first heading
        const title = extractTitle(body);

        // Normalize path
        const normalizedPath = normalizePath(filePath, absoluteRoot);

        // Delete existing entry (if any) and insert new one
        deleteStmt.run(normalizedPath, project);
        insertStmt.run(normalizedPath, project, title, body);

        console.error(`Indexed: ${normalizedPath}`);
        indexed++;
      } catch (error) {
        skipped++;
        const normalizedPath = normalizePath(filePath, absoluteRoot);
        console.error(`Skipped (parse error): ${normalizedPath}`);
      }
    }
    console.error(`\nIndexed: ${indexed} files, Skipped: ${skipped} files`);
  });

  indexAll();
  console.error("Indexing complete");
}

const program = new Command();
program.name("mydocs").description("Docs & search CLI using SQLite FTS5");

program
  .command("index")
  .argument("<root>", "root directory to index")
  .argument("[pattern]", "glob pattern for markdown files", "**/*.md")
  .requiredOption("-p, --project <name>", "project name")
  .action((root, pattern, opts) => cmdIndex(root, opts.project, pattern));

program
  .command("docs")
  .argument("<path>", "logical path, e.g. /guide/intro.md")
  .requiredOption("-p, --project <name>", "project name")
  .action((path, opts) => cmdDocs(path, opts.project));

function collectProjects(value: string, previous: string[] = []) {
  return previous.concat([value]);
}

program
  .command("search")
  .argument("<query>", "FTS5 search query")
  .option("-n, --limit <num>", "max results", "10")
  .option("-p, --project <name>", "filter by project (can be specified multiple times)", collectProjects, [])
  .action((query, opts) => cmdSearch(query, opts.project, Number(opts.limit)));

program.parse();
