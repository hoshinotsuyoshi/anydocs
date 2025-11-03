#!/usr/bin/env node
import { Command } from "commander";
import { collectProjects } from "./cli/collectProjects.js";
import { cmdDocs } from "./cli/commands/cmdDocs.js";
import { cmdGenerateSetup } from "./cli/commands/cmdGenerateSetup.js";
import { cmdSearch } from "./cli/commands/cmdSearch.js";
import { cmdInstall } from "./cli/commands/cmdInstall.js";

const program = new Command();
program.name("mydocs").description("Docs & search CLI using SQLite FTS5");

program
  .command("docs")
  .argument("<path>", "logical path, e.g. /guide/intro.md")
  .requiredOption("-p, --project <name>", "project name")
  .action((path, opts) => cmdDocs(path, opts.project));

program
  .command("search")
  .argument("<query>", "FTS5 search query")
  .option("-n, --limit <num>", "max results", "10")
  .option(
    "-p, --project <name>",
    "filter by project (can be specified multiple times)",
    collectProjects,
    [],
  )
  .action((query, opts) => {
    const parsedLimit = Number(opts.limit);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
    cmdSearch(query, opts.project, limit);
  });

program
  .command("generate-setup")
  .argument("<config>", "path to config file (YAML/TOML/JSON)")
  .description("Generate shell script for setting up projects from config")
  .action((config) => cmdGenerateSetup(config));

program
  .command("install")
  .argument("[config]", "path to mydocs.json (default: ~/.config/mydocs/mydocs.json)")
  .option("-p, --project <name>", "filter by project name")
  .description("Install projects from config (clone + index + generate lockfile)")
  .action((config, opts) => cmdInstall(config, opts.project));

program.parse();
