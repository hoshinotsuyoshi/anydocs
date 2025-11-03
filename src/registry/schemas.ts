import { err, ok, type Result } from "neverthrow";
import * as v from "valibot";

/**
 * Schema for project configuration in YAML/TOML/JSON
 */
export const ProjectConfigSchema = v.object({
  name: v.string(),
  repo: v.string(), // e.g., "supabase/supabase"
  ref: v.optional(v.string()), // commit hash or branch
  "sparse-checkout": v.optional(
    v.object({
      paths: v.string(),
    }),
  ),
  path: v.string(), // glob pattern for indexing
  "path-meta": v.optional(
    v.object({
      options: v.optional(v.array(v.string())),
    }),
  ),
});

export const RegistryConfigSchema = v.array(
  v.object({
    "repo-root": v.optional(v.string()),
    "repo-list": v.array(ProjectConfigSchema),
  }),
);

export type ProjectConfig = v.InferOutput<typeof ProjectConfigSchema>;
export type RegistryConfig = v.InferOutput<typeof RegistryConfigSchema>;

export interface ParsedConfig {
  projects: ProjectConfig[];
  repoRoot?: string;
}

/**
 * Parse and validate registry config
 */
export function parseRegistryConfig(data: unknown): Result<ParsedConfig, Error> {
  try {
    const validated = v.parse(RegistryConfigSchema, data);

    // Flatten repo-list arrays and extract repo-root from first entry
    const projects: ProjectConfig[] = [];
    let repoRoot: string | undefined;

    for (const item of validated) {
      // Use repo-root from first entry if specified
      if (!repoRoot && item["repo-root"]) {
        repoRoot = item["repo-root"];
      }
      projects.push(...item["repo-list"]);
    }

    return ok({ projects, repoRoot });
  } catch (error) {
    return err(new Error(`Invalid registry config: ${error}`));
  }
}
