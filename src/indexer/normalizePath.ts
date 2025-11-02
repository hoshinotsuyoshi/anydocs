import fs from "node:fs";
import path from "node:path";
import { Result as R, type Result } from "neverthrow";

export type NormalizePathError = {
  filePath: string;
  rootDir: string;
  reason: string;
};

export function normalizePath(
  filePath: string,
  rootDir: string,
): Result<string, NormalizePathError> {
  const resolveReal = R.fromThrowable(
    () => ({
      realFile: fs.realpathSync(filePath),
      realRoot: fs.realpathSync(rootDir),
    }),
    (error) => ({
      filePath,
      rootDir,
      reason: String(error),
    }),
  )();

  return resolveReal.map(({ realFile, realRoot }) => {
    const rel = path.relative(realRoot, realFile);
    return `/${rel.split(path.sep).join("/")}`;
  });
}
