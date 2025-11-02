import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { openDb } from "../../db/openDb.js";
import { extractTitle } from "../../indexer/extractTitle.js";
import { normalizePath } from "../../indexer/normalizePath.js";
import { type TomlEngine, parseFrontMatter } from "../../indexer/parseFrontMatter.js";

export function cmdIndex(
  rootDir: string,
  project: string,
  pattern = "**/*.md",
  tomlEngine: TomlEngine = "toml",
) {
  const db = openDb();
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
      const content = fs.readFileSync(filePath, "utf-8");

      // Parse and remove front-matter (supports YAML, TOML, JSON)
      const parseResult = parseFrontMatter(content, tomlEngine);

      if (parseResult.isErr()) {
        skipped++;
        const normalizedPath = normalizePath(filePath, absoluteRoot);
        console.error(`Skipped (parse error): ${normalizedPath} - ${parseResult.error.message}`);
        continue;
      }

      const body = parseResult.value;

      // Extract title from first heading
      const title = extractTitle(body);

      // Normalize path
      const normalizedPath = normalizePath(filePath, absoluteRoot);

      // Delete existing entry (if any) and insert new one
      deleteStmt.run(normalizedPath, project);
      insertStmt.run(normalizedPath, project, title, body);

      console.error(`Indexed: ${normalizedPath}`);
      indexed++;
    }
    console.error(`\nIndexed: ${indexed} files, Skipped: ${skipped} files`);
  });

  indexAll();
  console.error("Indexing complete");
}
