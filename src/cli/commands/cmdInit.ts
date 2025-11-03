import fs from "node:fs";
import { CONFIG_HOME, CONFIG_PATH, DB_DIR, DOCS_DIR, REPOS_DIR } from "../../config/paths.js";

/**
 * Initialize mydocs directory structure and config file
 */
export function cmdInit() {
  console.error("Initializing mydocs...");

  // Create config directory
  if (!fs.existsSync(CONFIG_HOME)) {
    fs.mkdirSync(CONFIG_HOME, { recursive: true });
    console.error(`✓ Created config directory: ${CONFIG_HOME}`);
  } else {
    console.error(`✓ Config directory already exists: ${CONFIG_HOME}`);
  }

  // Create config file if it doesn't exist
  if (!fs.existsSync(CONFIG_PATH)) {
    const emptyConfig = {
      projects: [],
    };
    fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(emptyConfig, null, 2)}\n`, "utf8");
    console.error(`✓ Created config file: ${CONFIG_PATH}`);
  } else {
    console.error(`✓ Config file already exists: ${CONFIG_PATH}`);
  }

  // Create data directories
  const dataDirs = [
    { path: REPOS_DIR, name: "repos" },
    { path: DOCS_DIR, name: "docs" },
    { path: DB_DIR, name: "db" },
  ];

  for (const { path, name } of dataDirs) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
      console.error(`✓ Created ${name} directory: ${path}`);
    } else {
      console.error(`✓ Directory already exists: ${path}`);
    }
  }

  console.error("\nInitialization complete!");
  console.error("\nNext steps:");
  console.error(`  1. Edit your config: ${CONFIG_PATH}`);
  console.error("  2. Run: mydocs install");
}
