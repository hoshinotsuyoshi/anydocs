#!/usr/bin/env node
import { Command } from "commander";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";

const DB_PATH = process.env.MYDOCS_DB ?? path.resolve(process.cwd(), "docs.db");

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS pages USING fts5(
      path UNINDEXED,
      title,
      body,
      tokenize='porter'
    );
  `);
  return db;
}

function cmdDocs(p: string) {
  const db = openDb();
  const row = db.prepare("SELECT body FROM pages WHERE path = ?").get(p) as { body: string } | undefined;
  if (!row) {
    console.error(`Not found: ${p}`);
    process.exit(1);
  }
  process.stdout.write(row.body);
}

function cmdSearch(query: string, limit = 10) {
  const db = openDb();
  const sql = `
    SELECT path, title,
           snippet(pages, 2, '<b>', '</b>', '...', 10) AS snippet,
           bm25(pages) AS score
    FROM pages
    WHERE pages MATCH ?
    ORDER BY score
    LIMIT ?;
  `;
  const rows = db.prepare(sql).all(query, limit);
  process.stdout.write(JSON.stringify(rows, null, 2));
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function normalizePath(filePath: string, rootDir: string): string {
  const rel = path.relative(rootDir, filePath);
  const normalized = "/" + rel.split(path.sep).join("/");
  return normalized;
}

function cmdIndex(rootDir: string, pattern = "**/*.md") {
  const db = openDb();
  const absoluteRoot = path.resolve(rootDir);

  // Find all markdown files
  const files = fg.sync(pattern, {
    cwd: absoluteRoot,
    absolute: true,
    onlyFiles: true,
  });

  console.error(`Found ${files.length} files to index`);

  // Prepare statements
  const deleteStmt = db.prepare("DELETE FROM pages WHERE path = ?");
  const insertStmt = db.prepare("INSERT INTO pages (path, title, body) VALUES (?, ?, ?)");

  // Process in transaction
  const indexAll = db.transaction(() => {
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf-8");

      // Parse and remove front-matter
      const { content: body } = matter(content);

      // Extract title from first heading
      const title = extractTitle(body);

      // Normalize path
      const normalizedPath = normalizePath(filePath, absoluteRoot);

      // Delete existing entry (if any) and insert new one
      deleteStmt.run(normalizedPath);
      insertStmt.run(normalizedPath, title, body);

      console.error(`Indexed: ${normalizedPath}`);
    }
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
  .action(cmdIndex);

program
  .command("docs")
  .argument("<path>", "logical path, e.g. /guide/intro.md")
  .action(cmdDocs);

program
  .command("search")
  .argument("<query>", "FTS5 search query")
  .option("-n, --limit <num>", "max results", "10")
  .action((query, opts) => cmdSearch(query, Number(opts.limit)));

program.parse();
