import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { normalizePath } from "./normalizePath.js";

describe("normalizePath", () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(() => {
    // Create temporary directory and file for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mydocs-test-"));
    testFile = path.join(tempDir, "test.md");
    fs.writeFileSync(testFile, "# Test");
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  it("should normalize absolute path to root-relative path", () => {
    const result = normalizePath(testFile, tempDir);
    expect(result).toBe("/test.md");
  });

  it("should handle nested directories", () => {
    const nestedDir = path.join(tempDir, "nested");
    fs.mkdirSync(nestedDir);
    const nestedFile = path.join(nestedDir, "nested.md");
    fs.writeFileSync(nestedFile, "# Nested");

    const result = normalizePath(nestedFile, tempDir);
    expect(result).toBe("/nested/nested.md");

    // Clean up
    fs.unlinkSync(nestedFile);
    fs.rmdirSync(nestedDir);
  });

  it("should resolve symlinks", () => {
    const symlinkPath = path.join(tempDir, "link.md");
    fs.symlinkSync(testFile, symlinkPath);

    const result = normalizePath(symlinkPath, tempDir);
    expect(result).toBe("/test.md");

    // Clean up
    fs.unlinkSync(symlinkPath);
  });

  it("should use forward slashes even on Windows", () => {
    const nestedDir = path.join(tempDir, "a", "b");
    fs.mkdirSync(nestedDir, { recursive: true });
    const deepFile = path.join(nestedDir, "deep.md");
    fs.writeFileSync(deepFile, "# Deep");

    const result = normalizePath(deepFile, tempDir);
    expect(result).toBe("/a/b/deep.md");
    expect(result).not.toContain("\\");

    // Clean up
    fs.unlinkSync(deepFile);
    fs.rmSync(path.join(tempDir, "a"), { recursive: true });
  });
});
