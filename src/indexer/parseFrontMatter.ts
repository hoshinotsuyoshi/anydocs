import matter from "gray-matter";
import { parse as smolTomlParse } from "smol-toml";
import toml from "toml";

export type TomlEngine = "toml" | "smol-toml";

/**
 * Parse front-matter from markdown content.
 * Tries TOML first (for files with TOML syntax but --- delimiters),
 * then falls back to auto-detection (YAML by default).
 */
export function parseFrontMatter(content: string, tomlEngine: TomlEngine = "toml"): string {
  const tomlParser = tomlEngine === "smol-toml" ? smolTomlParse : toml.parse.bind(toml);

  // Try with language: 'toml' first for TOML syntax with --- delimiters
  try {
    const result = matter(content, {
      engines: {
        toml: tomlParser,
      },
      language: "toml",
    });
    return result.content;
  } catch (_tomlError) {
    // Fallback to auto-detection (YAML by default, +++ for TOML, ;;; for JSON)
    const result = matter(content, {
      engines: {
        toml: tomlParser,
      },
    });
    return result.content;
  }
}
