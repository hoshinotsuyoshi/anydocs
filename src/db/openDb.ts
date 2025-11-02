import Database from "better-sqlite3";
import { DB_PATH } from "../config/paths.js";

export function openDb() {
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
