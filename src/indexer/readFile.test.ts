import { describe, expect, it } from "vitest";
import { readFile } from "./readFile.js";

describe("readFile", () => {
  it("should read file successfully", () => {
    const result = readFile("README.md");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toContain("anydocs");
    }
  });

  it("should return error for non-existent file", () => {
    const result = readFile("/non/existent/file.txt");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.path).toBe("/non/existent/file.txt");
      expect(result.error.reason).toContain("ENOENT");
    }
  });

  it("should return error for directory", () => {
    const result = readFile("src");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.path).toBe("src");
      expect(result.error.reason).toContain("EISDIR");
    }
  });
});
