#!/usr/bin/env node
import { Command } from "commander";
import { collectProjects } from "./cli/collectProjects.js";
import { cmdDocs } from "./cli/commands/cmdDocs.js";
import { cmdInit } from "./cli/commands/cmdInit.js";
import { cmdInstall } from "./cli/commands/cmdInstall.js";
import { cmdSearch } from "./cli/commands/cmdSearch.js";

const program = new Command();
program.name("anydocs").description("Docs & search CLI using SQLite FTS5");

program
  .command("init")
  .description("Initialize anydocs (create config and data directories)")
  .action(() => cmdInit());

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
  .command("install")
  .argument("[config]", "path to anydocs.json (default: ~/.config/anydocs/anydocs.json)")
  .option("-p, --project <name>", "filter by project name")
  .description("Install projects from config (clone + index + generate lockfile)")
  .action((config, opts) => cmdInstall(config, opts.project));

program.parse();
