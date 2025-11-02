import { describe, expect, it } from "vitest";
import { extractTitle } from "./extractTitle.js";

describe("extractTitle", () => {
  it("should extract title from markdown heading", () => {
    const content = "# Hello World\n\nSome content";
    expect(extractTitle(content)).toBe("Hello World");
  });

  it("should return empty string if no heading", () => {
    const content = "No heading here";
    expect(extractTitle(content)).toBe("");
  });

  it("should extract title with extra spaces", () => {
    const content = "#   Spaced Title   \n\nContent";
    expect(extractTitle(content)).toBe("Spaced Title");
  });

  it("should extract first heading only", () => {
    const content = "# First Heading\n\n## Second Heading";
    expect(extractTitle(content)).toBe("First Heading");
  });

  it("should handle heading in middle of content", () => {
    const content = "Some intro text\n\n# Main Title\n\nMore content";
    expect(extractTitle(content)).toBe("Main Title");
  });
});
