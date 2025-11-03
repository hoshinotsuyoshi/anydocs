import path from "node:path";
import { getConfigHome } from "./getConfigHome.js";
import { getDataHome } from "./getDataHome.js";

// Config paths
export const CONFIG_HOME = path.join(getConfigHome(), "mydocs");
export const CONFIG_PATH = path.join(CONFIG_HOME, "mydocs.json");

// Data paths
export const MYDOCS_ROOT = path.join(getDataHome(), "mydocs");
export const REPOS_DIR = path.join(MYDOCS_ROOT, "repos");
export const DOCS_DIR = path.join(MYDOCS_ROOT, "docs");
export const DB_DIR = path.join(MYDOCS_ROOT, "db");
export const DB_PATH = process.env.MYDOCS_DB ?? path.join(DB_DIR, "default.db");
export const LOCKFILE_PATH = path.join(MYDOCS_ROOT, "mydocs-lock.yaml");
