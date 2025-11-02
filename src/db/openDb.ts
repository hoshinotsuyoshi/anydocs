import Database from "better-sqlite3";
import { Result as R, type Result } from "neverthrow";
import { DB_PATH } from "../config/paths.js";

export type DbError =
  | { type: "connection_failed"; path: string; reason: string }
  | { type: "schema_creation_failed"; reason: string };

export function openDb(): Result<Database.Database, DbError> {
  return R.fromThrowable(
    () => new Database(DB_PATH),
    (error) => ({
      type: "connection_failed" as const,
      path: DB_PATH,
      reason: String(error),
    }),
  )().andThen((db) =>
    R.fromThrowable(
      () => {
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
      },
      (error) => ({
        type: "schema_creation_failed" as const,
        reason: String(error),
      }),
    )(),
  );
}
