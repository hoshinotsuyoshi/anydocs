#!/usr/bin/env node
import { Command } from "commander";
import { collectProjects } from "./cli/collectProjects.js";
import { cmdDocs } from "./cli/commands/cmdDocs.js";
import { cmdIndex } from "./cli/commands/cmdIndex.js";
import { cmdSearch } from "./cli/commands/cmdSearch.js";

const program = new Command();
program.name("mydocs").description("Docs & search CLI using SQLite FTS5");

program
  .command("index")
  .argument("<root>", "root directory to index")
  .argument("[pattern]", "glob pattern for markdown files", "**/*.md")
  .requiredOption("-p, --project <name>", "project name")
  .option("--toml-engine <engine>", "TOML parser engine: 'toml' or 'smol-toml'", "toml")
  .action((root, pattern, opts) => {
    const tomlEngine = opts.tomlEngine === "smol-toml" ? "smol-toml" : "toml";
    cmdIndex(root, opts.project, pattern, tomlEngine);
  });

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

program.parse();
