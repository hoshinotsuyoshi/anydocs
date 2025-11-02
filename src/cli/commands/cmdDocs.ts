import { openDb } from "../../db/openDb.js";

export function cmdDocs(p: string, project: string) {
  const dbResult = openDb();

  if (dbResult.isErr()) {
    const { type, reason } = dbResult.error;
    console.error(`Database error (${type}): ${reason}`);
    process.exit(1);
  }

  const db = dbResult.value;
  const row = db.prepare("SELECT body FROM pages WHERE path = ? AND project = ?").get(p, project) as
    | { body: string }
    | undefined;

  if (!row) {
    console.error(`Not found: ${p} in project: ${project}`);
    process.exit(1);
  }
  process.stdout.write(row.body);
}
