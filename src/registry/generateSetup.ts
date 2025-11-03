import os from "node:os";
import path from "node:path";
import type { ProjectConfig } from "./schemas.js";

/**
 * Generate shell script for setting up projects from config
 */
export function generateSetupScript(projects: ProjectConfig[]): string {
  const lines: string[] = [];

  // Shebang and error handling
  lines.push("#!/bin/bash");
  lines.push("set -euxo pipefail");
  lines.push("");

  // Save original directory for relative path resolution
  lines.push("# Save original directory");
  lines.push('ORIGINAL_DIR="$(pwd)"');
  lines.push("");

  // Variables
  const homeDir = os.homedir();
  const anydocsRoot = path.join(homeDir, ".local/share/anydocs");
  const repoRoot = path.join(anydocsRoot, "repos");

  lines.push("# Configuration");
  lines.push(`ANYDOCS_DOCS_DIR="${anydocsRoot}/docs"`);
  lines.push(`REPO_ROOT="${repoRoot}"`);
  lines.push(`ANYDOCS_CLI="\${ANYDOCS_CLI:-anydocs}"`);
  lines.push("");

  // Generate setup for each project
  for (const project of projects) {
    lines.push(`# ${project.name}`);
    lines.push(`echo "Setting up ${project.name}..."`);
    lines.push("");

    // Parse repo owner/name
    const [owner, repoName] = project.repo.split("/");
    if (!owner || !repoName) {
      throw new Error(`Invalid repo format: ${project.repo}`);
    }

    const repoDir = `\${REPO_ROOT}/${owner}`;
    const repoPath = `${repoDir}/${repoName}`;

    // Create parent directory
    lines.push(`mkdir -p ${repoDir}`);

    // Check if repo already exists
    lines.push(`if [ ! -d "${repoPath}" ]; then`);
    lines.push(`  cd ${repoDir}`);

    // Git clone
    if (project["sparse-checkout"]) {
      // Sparse checkout
      lines.push(
        `  git clone --depth 1 --filter=blob:none --sparse https://github.com/${project.repo}.git`,
      );
      lines.push(`  cd ${repoName}`);
      lines.push(`  git sparse-checkout set ${project["sparse-checkout"].paths}`);
    } else {
      // Normal clone
      lines.push(`  git clone --depth 1 https://github.com/${project.repo}.git`);
    }

    // Checkout specific ref if provided
    if (project.ref) {
      // Ensure we're in the repo directory
      if (!project["sparse-checkout"]) {
        lines.push(`  cd ${repoPath}`);
      }
      lines.push(`  git checkout ${project.ref}`);
    }

    lines.push("else");
    lines.push(`  echo "  Repository already exists, skipping clone"`);
    lines.push("fi");
    lines.push("");

    // Create symlink
    const symlinkPath = `\${MYDOCS_DOCS_DIR}/${repoName}`;
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Shell script variable
    lines.push("mkdir -p ${MYDOCS_DOCS_DIR}");
    lines.push(`if [ ! -L "${symlinkPath}" ]; then`);
    lines.push(`  ln -sf ${repoPath} ${symlinkPath}`);
    lines.push(`  echo "  Created symlink: ${symlinkPath}"`);
    lines.push("else");
    lines.push(`  echo "  Symlink already exists"`);
    lines.push("fi");
    lines.push("");

    // Run anydocs index (return to original directory first)
    const indexCmd = buildIndexCommand(project, symlinkPath);
    lines.push(`cd "$ORIGINAL_DIR"`);
    lines.push(`echo "  Indexing ${project.name}..."`);
    lines.push(`${indexCmd}`);
    lines.push("");
  }

  lines.push(`echo "Setup complete!"`);

  return lines.join("\n");
}

/**
 * Build anydocs index command with options
 */
function buildIndexCommand(project: ProjectConfig, symlinkPath: string): string {
  const parts = [
    "$ANYDOCS_CLI",
    "index",
    symlinkPath,
    `"${project.path}"`,
    `--project ${project.name}`,
  ];

  // Add options from path-meta
  if (project["path-meta"]?.options) {
    parts.push(...project["path-meta"].options);
  }

  return parts.join(" ");
}
