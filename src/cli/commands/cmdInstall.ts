import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import { Result as R } from "neverthrow";
import type { ProjectConfig } from "../../sync/configSchemas.js";
import { parseMydocsConfig } from "../../sync/configSchemas.js";
import { cloneRepository } from "../../sync/gitOperations.js";
import { readLockfile, updateLockedProject, writeLockfile } from "../../sync/lockfileOperations.js";
import type { LockedProject, Lockfile } from "../../sync/lockfileSchemas.js";
import { cmdIndex } from "./cmdIndex.js";

/**
 * Extract repository name from "owner/repo" format
 */
function getRepoName(repo: string): string {
  const parts = repo.split("/");
  if (parts.length !== 2 || !parts[1]) {
    throw new Error(`Invalid repo format: ${repo}. Expected "owner/repo"`);
  }
  return parts[1];
}

/**
 * Process cloning/updating repositories
 */
function processCloning(
  projects: ProjectConfig[],
  repoRoot: string,
  docsDir: string,
  lockfile: Lockfile,
): Lockfile {
  let updatedLockfile = lockfile;

  for (const project of projects) {
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

    updatedLockfile = updateLockedProject(updatedLockfile, lockedProject);

    // Create symlink
    const repoName = getRepoName(project.repo);
    const [owner] = project.repo.split("/");
    const repoPath = path.join(repoRoot, owner, repoName);
    const symlinkPath = path.join(docsDir, repoName);

    fs.mkdirSync(docsDir, { recursive: true });
    if (!fs.existsSync(symlinkPath)) {
      fs.symlinkSync(repoPath, symlinkPath);
      console.error(`  Created symlink: ${symlinkPath}`);
    }
  }

  return updatedLockfile;
}

/**
 * Process indexing projects
 */
function processIndexing(projects: ProjectConfig[], docsDir: string, lockfile: Lockfile): void {
  for (const project of projects) {
    console.error(`\nIndexing ${project.name}...`);

    const repoName = getRepoName(project.repo);
    const symlinkPath = path.join(docsDir, repoName);

    // Parse toml-engine option if present
    const options = project.options || [];
    const tomlEngineIndex = options.indexOf("--toml-engine");
    const tomlEngine =
      tomlEngineIndex !== -1 && options[tomlEngineIndex + 1] === "smol-toml" ? "smol-toml" : "toml";

    // Call cmdIndex directly
    cmdIndex(symlinkPath, project.name, project.path, tomlEngine);

    // Update indexed-at
    const lockedProject = lockfile.projects.find((p) => p.name === project.name);
    if (lockedProject) {
      lockedProject["indexed-at"] = new Date().toISOString();
    }
  }
}

export function cmdInstall(configPath?: string, projectFilter?: string) {
  console.error("Starting install...");

  const homeDir = os.homedir();
  const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config");
  const defaultConfigPath = path.join(xdgConfigHome, "mydocs", "mydocs.json");
  const actualConfigPath = configPath || defaultConfigPath;

  // Read mydocs.json
  const configResult = R.fromThrowable(
    () => {
      const content = fs.readFileSync(actualConfigPath, "utf8");
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
  const mydocsRoot = path.join(homeDir, ".local/share/mydocs");
  const repoRoot = path.join(mydocsRoot, "repos");
  const docsDir = path.join(mydocsRoot, "docs");
  const lockfilePath = path.join(mydocsRoot, "mydocs-lock.yaml");

  // Filter projects if specified
  const projectsToProcess = projectFilter
    ? config.projects.filter((p) => p.name === projectFilter)
    : config.projects;

  if (projectFilter && projectsToProcess.length === 0) {
    console.error(`Error: Project "${projectFilter}" not found in config`);
    process.exit(1);
  }

  // Read lockfile
  const lockfileResult = readLockfile(lockfilePath);
  if (lockfileResult.isErr()) {
    console.error(`Error: ${lockfileResult.error.message}`);
    process.exit(1);
  }

  let lockfile = lockfileResult.value;

  // Clone/update repositories
  lockfile = processCloning(projectsToProcess, repoRoot, docsDir, lockfile);

  // Write lockfile after cloning
  const writeResult = writeLockfile(lockfilePath, lockfile);
  if (writeResult.isErr()) {
    console.error(`Error: ${writeResult.error.message}`);
    process.exit(1);
  }

  console.error(`\nLockfile written: ${lockfilePath}`);

  // Index projects
  processIndexing(projectsToProcess, docsDir, lockfile);

  // Write lockfile with indexed-at timestamps
  const finalWriteResult = writeLockfile(lockfilePath, lockfile);
  if (finalWriteResult.isErr()) {
    console.error(`Error: ${finalWriteResult.error.message}`);
    process.exit(1);
  }

  console.error("\nInstall complete!");
}
