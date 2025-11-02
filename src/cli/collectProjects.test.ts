import { describe, expect, it } from "vitest";
import { collectProjects } from "./collectProjects.js";

describe("collectProjects", () => {
  it("should add value to empty array", () => {
    const result = collectProjects("nextjs", []);
    expect(result).toEqual(["nextjs"]);
  });

  it("should add value to existing array", () => {
    const result = collectProjects("react", ["nextjs"]);
    expect(result).toEqual(["nextjs", "react"]);
  });

  it("should handle multiple calls", () => {
    let result = collectProjects("nextjs", []);
    result = collectProjects("react", result);
    result = collectProjects("vue", result);
    expect(result).toEqual(["nextjs", "react", "vue"]);
  });

  it("should use default empty array if previous is undefined", () => {
    const result = collectProjects("nextjs");
    expect(result).toEqual(["nextjs"]);
  });

  it("should not mutate original array", () => {
    const original = ["nextjs"];
    const result = collectProjects("react", original);
    expect(original).toEqual(["nextjs"]);
    expect(result).toEqual(["nextjs", "react"]);
    expect(result).not.toBe(original);
  });
});
