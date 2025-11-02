import { Result as R } from "neverthrow";
import { openDb } from "../../db/openDb.js";
import { sanitizeFts5Query } from "../../db/sanitizeFts5Query.js";
import { parseSearchResultRows } from "../../db/schemas.js";

export function cmdSearch(query: string, projects: string[] = [], limit = 10) {
  const dbResult = openDb();

  if (dbResult.isErr()) {
    const { type, reason } = dbResult.error;
    console.error(`Database error (${type}): ${reason}`);
    process.exit(1);
  }

  const db = dbResult.value;

  // Sanitize query to prevent FTS5 syntax errors with special characters
  const sanitizedQuery = sanitizeFts5Query(query);

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
    params = [sanitizedQuery, ...projects, limit];
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
    params = [sanitizedQuery, limit];
  }

  // Wrap database query in Result to handle FTS5 syntax errors gracefully
  const queryResult = R.fromThrowable(
    () => db.prepare(sql).all(...params),
    (error) => new Error(`Search query failed: ${error}`),
  )();

  if (queryResult.isErr()) {
    console.error(`Search error: ${queryResult.error.message}`);
    process.exit(1);
  }

  const parseResult = parseSearchResultRows(queryResult.value);

  if (parseResult.isErr()) {
    console.error(`Invalid search results: ${parseResult.error.message}`);
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(parseResult.value, null, 2));
}
