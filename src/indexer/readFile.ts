import fs from "node:fs";
import { Result as R, type Result } from "neverthrow";

export type ReadFileError = {
  path: string;
  reason: string;
};

export function readFile(filePath: string): Result<string, ReadFileError> {
  return R.fromThrowable(
    () => fs.readFileSync(filePath, "utf-8"),
    (error) => ({
      path: filePath,
      reason: String(error),
    }),
  )();
}
