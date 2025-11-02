import path from "node:path";
import fg from "fast-glob";
import { Result as R, type Result } from "neverthrow";
import { openDb } from "../../db/openDb.js";
import { extractTitle } from "../../indexer/extractTitle.js";
import { normalizePath } from "../../indexer/normalizePath.js";
import { parseFrontMatter, type TomlEngine } from "../../indexer/parseFrontMatter.js";
import { readFile } from "../../indexer/readFile.js";

interface IndexEntry {
  path: string;
  title: string;
  body: string;
}

type ProcessFileError =
  | { type: "read_error"; displayPath: string; reason: string }
  | { type: "parse_error"; displayPath: string; reason: string }
  | { type: "normalize_error"; filePath: string; reason: string };

function processFile(
  filePath: string,
  absoluteRoot: string,
  tomlEngine: TomlEngine,
): Result<IndexEntry, ProcessFileError> {
  return readFile(filePath)
    .mapErr((err) => {
      const pathResult = normalizePath(filePath, absoluteRoot);
      const displayPath = pathResult.isOk() ? pathResult.value : filePath;
      return {
        type: "read_error" as const,
        displayPath,
        reason: err.reason,
      };
    })
    .andThen((content) =>
      parseFrontMatter(content, tomlEngine).mapErr((err) => {
        const pathResult = normalizePath(filePath, absoluteRoot);
        const displayPath = pathResult.isOk() ? pathResult.value : filePath;
        return {
          type: "parse_error" as const,
          displayPath,
          reason: err.message,
        };
      }),
    )
    .andThen((body) => {
      const title = extractTitle(body);
      return normalizePath(filePath, absoluteRoot)
        .mapErr((err) => ({
          type: "normalize_error" as const,
          filePath,
          reason: err.reason,
        }))
        .map((normalizedPath) => ({
          path: normalizedPath,
          title,
          body,
        }));
    });
}

export function cmdIndex(
  rootDir: string,
  project: string,
  pattern = "**/*.md",
  tomlEngine: TomlEngine = "toml",
) {
  const dbResult = openDb();

  if (dbResult.isErr()) {
    const { type, reason } = dbResult.error;
    console.error(`Database error (${type}): ${reason}`);
    process.exit(1);
  }

  const db = dbResult.value;
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
  const insertStmt = db.prepare(
    "INSERT INTO pages (path, project, title, body) VALUES (?, ?, ?, ?)",
  );

  // Process in transaction
  const indexAll = db.transaction(() => {
    let indexed = 0;
    let skipped = 0;

    for (const filePath of files) {
      const result = processFile(filePath, absoluteRoot, tomlEngine);

      if (result.isErr()) {
        skipped++;
        const error = result.error;
        if (error.type === "read_error" || error.type === "parse_error") {
          console.error(`Skipped (${error.type}): ${error.displayPath} - ${error.reason}`);
        } else {
          console.error(`Skipped (${error.type}): ${error.filePath} - ${error.reason}`);
        }
        continue;
      }

      const entry = result.value;
      deleteStmt.run(entry.path, project);
      insertStmt.run(entry.path, project, entry.title, entry.body);
      console.error(`Indexed: ${entry.path}`);
      indexed++;
    }

    console.error(`\nIndexed: ${indexed} files, Skipped: ${skipped} files`);
  });

  const transactionResult = R.fromThrowable(
    () => indexAll(),
    (error) => new Error(`Transaction failed: ${error}`),
  )();

  if (transactionResult.isErr()) {
    console.error(`Indexing failed: ${transactionResult.error.message}`);
    process.exit(1);
  }

  console.error("Indexing complete");
}
