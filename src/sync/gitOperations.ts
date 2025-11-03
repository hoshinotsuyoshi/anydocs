import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import type { ProjectConfig } from "./configSchemas.js";

export type GitError =
  | { type: "clone_failed"; reason: string }
  | { type: "checkout_failed"; reason: string }
  | { type: "resolve_ref_failed"; reason: string };

export interface CloneResult {
  resolvedRef: string; // commit hash
  clonedAt: string; // ISO 8601 timestamp
}

/**
 * Clone repository or return existing path
 */
export function cloneRepository(
  project: ProjectConfig,
  repoRoot: string,
): Result<CloneResult, GitError> {
  const [owner, repoName] = project.repo.split("/");
  if (!owner || !repoName) {
    return err({
      type: "clone_failed",
      reason: `Invalid repo format: ${project.repo}`,
    });
  }

  const repoDir = path.join(repoRoot, owner);
  const repoPath = path.join(repoDir, repoName);

  try {
    // Create parent directory
    fs.mkdirSync(repoDir, { recursive: true });

    // Check if repo already exists
    if (fs.existsSync(repoPath)) {
      console.error(`Repository ${project.name} already exists, skipping clone`);
    } else {
      // Clone repository
      if (project["sparse-checkout"]) {
        execSync(
          `git clone --depth 1 --filter=blob:none --sparse https://github.com/${project.repo}.git`,
          { cwd: repoDir, stdio: "inherit" },
        );
        execSync(`git sparse-checkout set ${project["sparse-checkout"].join(" ")}`, {
          cwd: repoPath,
          stdio: "inherit",
        });
      } else {
        execSync(`git clone --depth 1 https://github.com/${project.repo}.git`, {
          cwd: repoDir,
          stdio: "inherit",
        });
      }
    }

    // Checkout specific ref if provided
    const refRequested = project.ref || "main";
    if (project.ref) {
      execSync(`git checkout ${project.ref}`, {
        cwd: repoPath,
        stdio: "inherit",
      });
    }

    // Resolve ref to commit hash
    const resolvedRef = execSync("git rev-parse HEAD", {
      cwd: repoPath,
      encoding: "utf8",
    }).trim();

    return ok({
      resolvedRef,
      clonedAt: new Date().toISOString(),
    });
  } catch (error) {
    return err({
      type: "clone_failed",
      reason: String(error),
    });
  }
}
