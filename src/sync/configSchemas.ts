import { err, ok, type Result } from "neverthrow";
import * as v from "valibot";

/**
 * Schema for mydocs.json (user-editable config)
 */
export const ProjectConfigSchema = v.object({
  name: v.string(),
  repo: v.string(), // e.g., "supabase/supabase"
  ref: v.optional(v.string()), // branch or commit, defaults to "main"
  "sparse-checkout": v.optional(v.array(v.string())), // paths to checkout
  path: v.string(), // glob pattern for indexing
  options: v.optional(v.array(v.string())), // CLI options
});

export const MydocsConfigSchema = v.object({
  projects: v.array(ProjectConfigSchema),
});

export type ProjectConfig = v.InferOutput<typeof ProjectConfigSchema>;
export type MydocsConfig = v.InferOutput<typeof MydocsConfigSchema>;

/**
 * Parse mydocs.json config
 */
export function parseMydocsConfig(data: unknown): Result<MydocsConfig, Error> {
  try {
    const validated = v.parse(MydocsConfigSchema, data);
    return ok(validated);
  } catch (error) {
    return err(new Error(`Invalid mydocs.json: ${error}`));
  }
}
