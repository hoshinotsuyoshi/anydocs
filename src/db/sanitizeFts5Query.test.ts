import { describe, expect, it } from "vitest";
import { sanitizeFts5Query } from "./sanitizeFts5Query.js";

describe("sanitizeFts5Query", () => {
  it("should leave simple queries unchanged", () => {
    expect(sanitizeFts5Query("hello")).toBe("hello");
    expect(sanitizeFts5Query("safeParse")).toBe("safeParse");
    expect(sanitizeFts5Query("multiple words")).toBe("multiple words");
  });

  it("should quote queries with hyphens to prevent NOT operator interpretation", () => {
    expect(sanitizeFts5Query("safe-Parse")).toBe('"safe-Parse"');
    expect(sanitizeFts5Query("foo-bar-baz")).toBe('"foo-bar-baz"');
    expect(sanitizeFts5Query("kebab-case")).toBe('"kebab-case"');
  });

  it("should quote queries with other special FTS5 characters", () => {
    expect(sanitizeFts5Query("prefix*")).toBe('"prefix*"');
    expect(sanitizeFts5Query("column:value")).toBe('"column:value"');
    expect(sanitizeFts5Query("^start")).toBe('"\^start"');
    expect(sanitizeFts5Query("(grouped)")).toBe('"(grouped)"');
  });

  it("should escape and quote queries containing double quotes", () => {
    expect(sanitizeFts5Query('say "hello"')).toBe('"say ""hello"""');
  });

  it("should preserve already-quoted queries", () => {
    expect(sanitizeFts5Query('"exact phrase"')).toBe('"exact phrase"');
    expect(sanitizeFts5Query('"with-hyphen"')).toBe('"with-hyphen"');
    expect(sanitizeFts5Query('"multiple words here"')).toBe('"multiple words here"');
    expect(sanitizeFts5Query('"quote"')).toBe('"quote"');
  });

  it("should preserve queries with FTS5 operators", () => {
    expect(sanitizeFts5Query("hello AND world")).toBe("hello AND world");
    expect(sanitizeFts5Query("foo OR bar")).toBe("foo OR bar");
    expect(sanitizeFts5Query("hello NOT world")).toBe("hello NOT world");
    expect(sanitizeFts5Query("hello NEAR world")).toBe("hello NEAR world");
  });

  it("should preserve case-insensitive operators", () => {
    expect(sanitizeFts5Query("hello and world")).toBe("hello and world");
    expect(sanitizeFts5Query("foo or bar")).toBe("foo or bar");
    expect(sanitizeFts5Query("hello not world")).toBe("hello not world");
  });

  it("should handle complex queries with operators and special chars", () => {
    // Operators take precedence - don't quote
    expect(sanitizeFts5Query("foo-bar AND baz")).toBe("foo-bar AND baz");
    expect(sanitizeFts5Query("prefix* OR suffix")).toBe("prefix* OR suffix");
  });
});
