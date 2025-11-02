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
  .action((root, pattern, opts) => cmdIndex(root, opts.project, pattern));

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
  .action((query, opts) => cmdSearch(query, opts.project, Number(opts.limit)));

program.parse();
