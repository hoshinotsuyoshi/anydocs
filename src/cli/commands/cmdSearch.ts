import { openDb } from "../../db/openDb.js";

export function cmdSearch(query: string, projects: string[] = [], limit = 10) {
  const dbResult = openDb();

  if (dbResult.isErr()) {
    const { type, reason } = dbResult.error;
    console.error(`Database error (${type}): ${reason}`);
    process.exit(1);
  }

  const db = dbResult.value;

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
