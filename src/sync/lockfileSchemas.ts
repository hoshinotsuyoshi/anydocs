import { err, ok, type Result } from "neverthrow";
import * as v from "valibot";

/**
 * Schema for anydocs-lock.yaml (auto-generated)
 */
export const LockedProjectSchema = v.object({
  name: v.string(),
  repo: v.string(),
  "ref-requested": v.string(),
  "ref-resolved": v.string(), // actual commit hash
  "cloned-at": v.string(), // ISO 8601 timestamp
  "indexed-at": v.nullable(v.string()), // ISO 8601 timestamp or null
});

export const LockfileSchema = v.object({
  "lockfile-version": v.literal(1),
  projects: v.array(LockedProjectSchema),
});

export type LockedProject = v.InferOutput<typeof LockedProjectSchema>;
export type Lockfile = v.InferOutput<typeof LockfileSchema>;

/**
 * Parse anydocs-lock.yaml
 */
export function parseLockfile(data: unknown): Result<Lockfile, Error> {
  try {
    const validated = v.parse(LockfileSchema, data);
    return ok(validated);
  } catch (error) {
    return err(new Error(`Invalid anydocs-lock.yaml: ${error}`));
  }
}

/**
 * Create empty lockfile
 */
export function createEmptyLockfile(): Lockfile {
  return {
    "lockfile-version": 1,
    projects: [],
  };
}
