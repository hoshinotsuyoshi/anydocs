import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { Result as R } from "neverthrow";
import { CONFIG_PATH, DOCS_DIR, LOCKFILE_PATH, REPOS_DIR } from "../../config/paths.js";
import type { ProjectConfig } from "../../sync/configSchemas.js";
import { parseMydocsConfig } from "../../sync/configSchemas.js";
import { cloneRepository } from "../../sync/gitOperations.js";
import { readLockfile, updateLockedProject, writeLockfile } from "../../sync/lockfileOperations.js";
import type { LockedProject, Lockfile } from "../../sync/lockfileSchemas.js";
import { parseRepoUrl } from "../../sync/parseRepoUrl.js";
import { cmdIndex } from "./cmdIndex.js";

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

    const { resolvedRef, clonedAt, fullPath, repoPath } = cloneResult.value;

    // Update lockfile with full path (e.g., "github.com/owner/repo")
    const lockedProject: LockedProject = {
      name: project.name,
      repo: fullPath,
      "ref-requested": project.ref || "main",
      "ref-resolved": resolvedRef,
      "cloned-at": clonedAt,
      "indexed-at": null,
    };

    updatedLockfile = updateLockedProject(updatedLockfile, lockedProject);

    // Create symlink: docs/repo-name -> repos/host/owner/repo
    const repoInfo = parseRepoUrl(project.repo);
    const symlinkPath = path.join(docsDir, repoInfo.name);

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

    const repoInfo = parseRepoUrl(project.repo);
    const symlinkPath = path.join(docsDir, repoInfo.name);

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

  const actualConfigPath = configPath || CONFIG_PATH;

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

  // Filter projects if specified
  const projectsToProcess = projectFilter
    ? config.projects.filter((p) => p.name === projectFilter)
    : config.projects;

  if (projectFilter && projectsToProcess.length === 0) {
    console.error(`Error: Project "${projectFilter}" not found in config`);
    process.exit(1);
  }

  // Read lockfile
  const lockfileResult = readLockfile(LOCKFILE_PATH);
  if (lockfileResult.isErr()) {
    console.error(`Error: ${lockfileResult.error.message}`);
    process.exit(1);
  }

  let lockfile = lockfileResult.value;

  // Clone/update repositories
  lockfile = processCloning(projectsToProcess, REPOS_DIR, DOCS_DIR, lockfile);

  // Write lockfile after cloning
  const writeResult = writeLockfile(LOCKFILE_PATH, lockfile);
  if (writeResult.isErr()) {
    console.error(`Error: ${writeResult.error.message}`);
    process.exit(1);
  }

  console.error(`\nLockfile written: ${LOCKFILE_PATH}`);

  // Index projects
  processIndexing(projectsToProcess, DOCS_DIR, lockfile);

  // Write lockfile with indexed-at timestamps
  const finalWriteResult = writeLockfile(LOCKFILE_PATH, lockfile);
  if (finalWriteResult.isErr()) {
    console.error(`Error: ${finalWriteResult.error.message}`);
    process.exit(1);
  }

  console.error("\nInstall complete!");
}
