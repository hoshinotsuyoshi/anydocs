import path from "node:path";
import { getConfigHome } from "./getConfigHome.js";
import { getDataHome } from "./getDataHome.js";

// Config paths
export const CONFIG_HOME = path.join(getConfigHome(), "anydocs");
export const CONFIG_PATH = path.join(CONFIG_HOME, "anydocs.json");

// Data paths
const ANYDOCS_ROOT = path.join(getDataHome(), "anydocs");
export const REPOS_DIR = path.join(ANYDOCS_ROOT, "repos");
export const DOCS_DIR = path.join(ANYDOCS_ROOT, "docs");
export const DB_DIR = path.join(ANYDOCS_ROOT, "db");
export const DB_PATH = path.join(DB_DIR, "default.db");
export const LOCKFILE_PATH = path.join(ANYDOCS_ROOT, "anydocs-lock.yaml");
