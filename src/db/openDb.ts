import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { err, Result as R, type Result } from "neverthrow";
import { DB_DIR, DB_PATH, LEGACY_DB_PATH } from "../config/paths.js";

export type DbError =
  | { type: "connection_failed"; path: string; reason: string }
  | { type: "schema_creation_failed"; reason: string }
  | { type: "migration_failed"; reason: string };

/**
 * Migrate old docs.db to new db/default.db structure.
 * This handles the transition from the legacy single-file layout to the multi-db layout.
 */
function migrateIfNeeded(): Result<void, DbError> {
  return R.fromThrowable(
    () => {
      // If new db already exists, no migration needed
      if (fs.existsSync(DB_PATH)) {
        return;
      }

      // If old db doesn't exist, no migration needed
      if (!fs.existsSync(LEGACY_DB_PATH)) {
        return;
      }

      // Create db directory
      fs.mkdirSync(DB_DIR, { recursive: true });

      // Move main database file
      fs.renameSync(LEGACY_DB_PATH, DB_PATH);

      // Move WAL files if they exist
      const walPath = `${LEGACY_DB_PATH}-wal`;
      const shmPath = `${LEGACY_DB_PATH}-shm`;

      if (fs.existsSync(walPath)) {
        fs.renameSync(walPath, `${DB_PATH}-wal`);
      }
      if (fs.existsSync(shmPath)) {
        fs.renameSync(shmPath, `${DB_PATH}-shm`);
      }

      console.error(`Migrated database from ${LEGACY_DB_PATH} to ${DB_PATH}`);
    },
    (error) => ({
      type: "migration_failed" as const,
      reason: String(error),
    }),
  )();
}

export function openDb(): Result<Database.Database, DbError> {
  // Migrate from legacy location if needed
  const migrationResult = migrateIfNeeded();
  if (migrationResult.isErr()) {
    return err(migrationResult.error);
  }

  // Ensure db directory exists
  return R.fromThrowable(
    () => {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      return new Database(DB_PATH);
    },
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
