import { homedir } from "node:os";
import path from "node:path";

export function getDataHome(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME;
  if (xdgDataHome) {
    return xdgDataHome;
  }
  return path.join(homedir(), ".local", "share");
}
