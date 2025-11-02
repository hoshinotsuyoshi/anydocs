import { err, ok, Result as R, type Result } from "neverthrow";
import * as v from "valibot";

// Database row schemas
export const PageRowSchema = v.object({
  body: v.string(),
});

export const SearchResultRowSchema = v.object({
  path: v.string(),
  project: v.string(),
  title: v.string(),
  snippet: v.string(),
  score: v.number(),
});

// Type inference from schemas
export type PageRow = v.InferOutput<typeof PageRowSchema>;
export type SearchResultRow = v.InferOutput<typeof SearchResultRowSchema>;

// Result-returning parsers for neverthrow integration
export function parsePageRow(row: unknown): Result<PageRow, Error> {
  return R.fromThrowable(
    () => v.parse(PageRowSchema, row),
    (error) => new Error(`Invalid PageRow: ${error}`),
  )();
}

export function parseSearchResultRow(row: unknown): Result<SearchResultRow, Error> {
  return R.fromThrowable(
    () => v.parse(SearchResultRowSchema, row),
    (error) => new Error(`Invalid SearchResultRow: ${error}`),
  )();
}

export function parseSearchResultRows(rows: unknown): Result<SearchResultRow[], Error> {
  if (!Array.isArray(rows)) {
    return err(new Error("Expected array of search results"));
  }

  const results: SearchResultRow[] = [];
  for (const [index, row] of rows.entries()) {
    const parsed = parseSearchResultRow(row);
    if (parsed.isErr()) {
      return err(new Error(`Invalid row at index ${index}: ${parsed.error.message}`));
    }
    results.push(parsed.value);
  }

  return ok(results);
}
