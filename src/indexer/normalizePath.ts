import fs from "node:fs";
import path from "node:path";

export function normalizePath(filePath: string, rootDir: string): string {
  // Get real path (resolves symlinks) for the file
  const realFilePath = fs.realpathSync(filePath);

  // Get real path for rootDir (the directory being indexed)
  const realRootDir = fs.realpathSync(rootDir);

  // Return path relative to the indexing root
  const rel = path.relative(realRootDir, realFilePath);
  const normalized = `/${rel.split(path.sep).join("/")}`;
  return normalized;
}
