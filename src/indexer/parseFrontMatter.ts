import matter from "gray-matter";
import toml from "toml";

/**
 * Parse front-matter from markdown content.
 * Tries TOML first (for files with TOML syntax but --- delimiters),
 * then falls back to auto-detection (YAML by default).
 */
export function parseFrontMatter(content: string): string {
  // Try with language: 'toml' first for TOML syntax with --- delimiters
  try {
    const result = matter(content, {
      engines: {
        toml: toml.parse.bind(toml),
      },
      language: "toml",
    });
    return result.content;
  } catch (_tomlError) {
    // Fallback to auto-detection (YAML by default, +++ for TOML, ;;; for JSON)
    const result = matter(content, {
      engines: {
        toml: toml.parse.bind(toml),
      },
    });
    return result.content;
  }
}
