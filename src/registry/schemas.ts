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
    "repo-list": v.array(ProjectConfigSchema),
  }),
);

export type ProjectConfig = v.InferOutput<typeof ProjectConfigSchema>;
export type RegistryConfig = v.InferOutput<typeof RegistryConfigSchema>;

/**
 * Parse and validate registry config
 */
export function parseRegistryConfig(data: unknown): Result<ProjectConfig[], Error> {
  try {
    const validated = v.parse(RegistryConfigSchema, data);

    // Flatten repo-list arrays
    const projects: ProjectConfig[] = [];
    for (const item of validated) {
      projects.push(...item["repo-list"]);
    }

    return ok(projects);
  } catch (error) {
    return err(new Error(`Invalid registry config: ${error}`));
  }
}
