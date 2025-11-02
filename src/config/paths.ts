import path from "node:path";
import { getDataHome } from "./getDataHome.js";

export const MYDOCS_ROOT = path.join(getDataHome(), "mydocs");
export const DB_DIR = path.join(MYDOCS_ROOT, "db");
export const DB_PATH = process.env.MYDOCS_DB ?? path.join(DB_DIR, "default.db");
export const LEGACY_DB_PATH = path.join(MYDOCS_ROOT, "docs.db");
