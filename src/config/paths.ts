import path from "node:path";
import { getDataHome } from "./getDataHome.js";

export const MYDOCS_ROOT = path.join(getDataHome(), "mydocs");
export const DB_PATH = process.env.MYDOCS_DB ?? path.join(MYDOCS_ROOT, "docs.db");
