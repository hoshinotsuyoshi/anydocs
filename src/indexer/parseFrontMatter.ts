import matter from "gray-matter";
import { Result, err, ok } from "neverthrow";
import { parse as smolTomlParse } from "smol-toml";
import toml from "toml";

export type TomlEngine = "toml" | "smol-toml";

/**
 * Parse front-matter from markdown content.
 * Tries TOML first (for files with TOML syntax but --- delimiters),
 * then falls back to auto-detection (YAML by default).
 */
export function parseFrontMatter(
  content: string,
  tomlEngine: TomlEngine = "toml",
): Result<string, Error> {
  const tomlParser = tomlEngine === "smol-toml" ? smolTomlParse : toml.parse.bind(toml);

  // Try with language: 'toml' first for TOML syntax with --- delimiters
  const tomlResult = Result.fromThrowable(
    () =>
      matter(content, {
        engines: {
          toml: tomlParser,
        },
        language: "toml",
      }),
    (error) => new Error(`TOML parsing failed: ${error}`),
  )();

  if (tomlResult.isOk()) {
    return ok(tomlResult.value.content);
  }

  // Fallback to auto-detection (YAML by default, +++ for TOML, ;;; for JSON)
  return Result.fromThrowable(
    () =>
      matter(content, {
        engines: {
          toml: tomlParser,
        },
      }),
    (error) => new Error(`Front-matter parsing failed: ${error}`),
  )().map((result) => result.content);
}
