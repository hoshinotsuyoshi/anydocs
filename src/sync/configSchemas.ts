import { err, ok, type Result } from "neverthrow";
import * as v from "valibot";

/**
 * Schema for anydocs.json (user-editable config)
 * Only 'repo' is required, other fields have defaults
 */
export const ProjectConfigSchema = v.object({
  name: v.optional(v.string()), // defaults to repo name (last part after slash)
  repo: v.string(), // e.g., "supabase/supabase" or "github.com/supabase/supabase"
  ref: v.optional(v.string()), // defaults to repository's default branch
  "sparse-checkout": v.optional(v.array(v.string())), // paths to checkout
  path: v.optional(v.string()), // defaults to "**/*.{md,mdx}"
  options: v.optional(v.array(v.string())), // CLI options
});

export const AnydocsConfigSchema = v.object({
  projects: v.array(ProjectConfigSchema),
});

export type ProjectConfig = v.InferOutput<typeof ProjectConfigSchema>;
export type AnydocsConfig = v.InferOutput<typeof AnydocsConfigSchema>;

/**
 * Normalized project config with all defaults applied
 */
export interface NormalizedProjectConfig {
  name: string;
  repo: string;
  ref: string | undefined; // undefined means use default branch
  "sparse-checkout"?: string[];
  path: string;
  options?: string[];
}

/**
 * Parse anydocs.json config
 */
export function parseAnydocsConfig(data: unknown): Result<AnydocsConfig, Error> {
  try {
    const validated = v.parse(AnydocsConfigSchema, data);
    return ok(validated);
  } catch (error) {
    return err(new Error(`Invalid anydocs.json: ${error}`));
  }
}

/**
 * Apply default values to project config
 */
export function normalizeProjectConfig(config: ProjectConfig): NormalizedProjectConfig {
  // Extract repo name from last part of repo string
  // "supermacro/neverthrow" -> "neverthrow"
  // "github.com/supermacro/neverthrow" -> "neverthrow"
  const repoName = config.repo.split("/").pop() || config.repo;

  return {
    name: config.name || repoName,
    repo: config.repo,
    ref: config.ref, // undefined means use default branch
    "sparse-checkout": config["sparse-checkout"],
    path: config.path || "**/*.{md,mdx}",
    options: config.options,
  };
}
