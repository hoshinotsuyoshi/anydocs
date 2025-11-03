/**
 * Parse repository URL in ghq-style format
 *
 * Supports:
 * - "owner/repo" → "github.com/owner/repo" (GitHub implicit)
 * - "github.com/owner/repo" → as-is
 * - "gitlab.com/owner/repo" → as-is
 */
export interface RepoInfo {
  host: string;
  owner: string;
  name: string;
  fullPath: string; // e.g., "github.com/owner/repo"
}

export function parseRepoUrl(repo: string): RepoInfo {
  const parts = repo.split("/");

  if (parts.length === 2) {
    // owner/repo → github.com/owner/repo
    const [owner, name] = parts;
    if (!owner || !name) {
      // eslint-disable-next-line fp/no-throw
      throw new Error(`Invalid repo format: ${repo}. Expected "owner/repo"`);
    }
    return {
      host: "github.com",
      owner,
      name,
      fullPath: `github.com/${owner}/${name}`,
    };
  }

  if (parts.length === 3) {
    // host/owner/repo
    const [host, owner, name] = parts;
    if (!host || !owner || !name) {
      // eslint-disable-next-line fp/no-throw
      throw new Error(`Invalid repo format: ${repo}. Expected "host/owner/repo"`);
    }
    return {
      host,
      owner,
      name,
      fullPath: `${host}/${owner}/${name}`,
    };
  }

  // eslint-disable-next-line fp/no-throw
  throw new Error(`Invalid repo format: ${repo}. Expected "owner/repo" or "host/owner/repo"`);
}

/**
 * Build git clone URL from repo info
 */
export function buildCloneUrl(repoInfo: RepoInfo): string {
  return `https://${repoInfo.host}/${repoInfo.owner}/${repoInfo.name}.git`;
}
