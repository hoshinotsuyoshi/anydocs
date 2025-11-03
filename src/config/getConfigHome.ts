import { homedir } from "node:os";
import path from "node:path";

export function getConfigHome(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return xdgConfigHome;
  }
  return path.join(homedir(), ".config");
}
