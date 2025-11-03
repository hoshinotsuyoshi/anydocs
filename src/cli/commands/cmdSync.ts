import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import yaml from "js-yaml";
import { Result as R } from "neverthrow";
import { parseMydocsConfig } from "../../sync/configSchemas.js";
import { cloneRepository } from "../../sync/gitOperations.js";
import {
  readLockfile,
  updateLockedProject,
  writeLockfile,
} from "../../sync/lockfileOperations.js";
import type { LockedProject } from "../../sync/lockfileSchemas.js";

export function cmdSync(configPath: string) {
  console.error("Starting sync...");

  // Read mydocs.json
  const configResult = R.fromThrowable(
    () => {
      const content = fs.readFileSync(configPath, "utf8");
      const data = yaml.load(content);
      const parseResult = parseMydocsConfig(data);
      if (parseResult.isErr()) {
        throw parseResult.error;
      }
      return parseResult.value;
    },
    (error) => new Error(`Failed to read config: ${error}`),
  )();

  if (configResult.isErr()) {
    console.error(`Error: ${configResult.error.message}`);
    process.exit(1);
  }

  const config = configResult.value;
  const homeDir = os.homedir();
  const mydocsRoot = path.join(homeDir, ".local/share/mydocs");
  const repoRoot = path.join(mydocsRoot, "repos");
  const docsDir = path.join(mydocsRoot, "docs");
  const lockfilePath = path.join(mydocsRoot, "mydocs-lock.yaml");

  // Read lockfile
  const lockfileResult = readLockfile(lockfilePath);
  if (lockfileResult.isErr()) {
    console.error(`Error: ${lockfileResult.error.message}`);
    process.exit(1);
  }

  let lockfile = lockfileResult.value;

  // Clone/update repositories
  for (const project of config.projects) {
    console.error(`\nProcessing ${project.name}...`);

    const cloneResult = cloneRepository(project, repoRoot);
    if (cloneResult.isErr()) {
      console.error(`  Failed to clone: ${cloneResult.error.reason}`);
      process.exit(1);
    }

    const { resolvedRef, clonedAt } = cloneResult.value;

    // Update lockfile
    const lockedProject: LockedProject = {
      name: project.name,
      repo: project.repo,
      "ref-requested": project.ref || "main",
      "ref-resolved": resolvedRef,
      "cloned-at": clonedAt,
      "indexed-at": null,
    };

    lockfile = updateLockedProject(lockfile, lockedProject);

    // Create symlink
    const [owner, repoName] = project.repo.split("/");
    const repoPath = path.join(repoRoot, owner, repoName!);
    const symlinkPath = path.join(docsDir, repoName!);

    fs.mkdirSync(docsDir, { recursive: true });
    if (!fs.existsSync(symlinkPath)) {
      fs.symlinkSync(repoPath, symlinkPath);
      console.error(`  Created symlink: ${symlinkPath}`);
    }
  }

  // Write lockfile after cloning
  const writeResult = writeLockfile(lockfilePath, lockfile);
  if (writeResult.isErr()) {
    console.error(`Error: ${writeResult.error.message}`);
    process.exit(1);
  }

  console.error(`\nLockfile written: ${lockfilePath}`);

  // Index projects
  for (const project of config.projects) {
    console.error(`\nIndexing ${project.name}...`);

    const [, repoName] = project.repo.split("/");
    const symlinkPath = path.join(docsDir, repoName!);

    try {
      const options = project.options || [];
      const cmd = `node dist/index.js index "${symlinkPath}" "${project.path}" --project ${project.name} ${options.join(" ")}`;
      execSync(cmd, { stdio: "inherit" });

      // Update indexed-at
      const lockedProject = lockfile.projects.find((p) => p.name === project.name);
      if (lockedProject) {
        lockedProject["indexed-at"] = new Date().toISOString();
      }
    } catch (error) {
      console.error(`  Failed to index: ${error}`);
      process.exit(1);
    }
  }

  // Write lockfile with indexed-at timestamps
  const finalWriteResult = writeLockfile(lockfilePath, lockfile);
  if (finalWriteResult.isErr()) {
    console.error(`Error: ${finalWriteResult.error.message}`);
    process.exit(1);
  }

  console.error("\nSync complete!");
}
