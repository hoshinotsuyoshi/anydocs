import { homedir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDataHome } from "./getDataHome.js";

describe("getDataHome", () => {
  let originalXdgDataHome: string | undefined;

  beforeEach(() => {
    // Save original environment variable
    originalXdgDataHome = process.env.XDG_DATA_HOME;
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalXdgDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = originalXdgDataHome;
    }
  });

  it("should return XDG_DATA_HOME if set", () => {
    process.env.XDG_DATA_HOME = "/custom/data/home";
    const result = getDataHome();
    expect(result).toBe("/custom/data/home");
  });

  it("should return default path if XDG_DATA_HOME is not set", () => {
    delete process.env.XDG_DATA_HOME;
    const result = getDataHome();
    const expected = path.join(homedir(), ".local", "share");
    expect(result).toBe(expected);
  });

  it("should return default path if XDG_DATA_HOME is empty string", () => {
    process.env.XDG_DATA_HOME = "";
    const result = getDataHome();
    const expected = path.join(homedir(), ".local", "share");
    expect(result).toBe(expected);
  });
});
