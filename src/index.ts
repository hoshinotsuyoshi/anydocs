#!/usr/bin/env node
import { Command } from "commander";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

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

const program = new Command();
program.name("mydocs").description("Docs & search CLI using SQLite FTS5");

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
