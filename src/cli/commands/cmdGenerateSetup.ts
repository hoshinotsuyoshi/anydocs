import fs from "node:fs";
import yaml from "js-yaml";
import { Result as R } from "neverthrow";
import { parseRegistryConfig } from "../../registry/schemas.js";
import { generateSetupScript } from "../../registry/generateSetup.js";

export function cmdGenerateSetup(configPath: string) {
  // Read config file
  const readResult = R.fromThrowable(
    () => fs.readFileSync(configPath, "utf8"),
    (error) => new Error(`Failed to read config file: ${error}`),
  )();

  if (readResult.isErr()) {
    console.error(`Error: ${readResult.error.message}`);
    process.exit(1);
  }

  // Parse YAML
  const parseYamlResult = R.fromThrowable(
    () => yaml.load(readResult.value),
    (error) => new Error(`Failed to parse YAML: ${error}`),
  )();

  if (parseYamlResult.isErr()) {
    console.error(`Error: ${parseYamlResult.error.message}`);
    process.exit(1);
  }

  // Validate schema
  const validationResult = parseRegistryConfig(parseYamlResult.value);

  if (validationResult.isErr()) {
    console.error(`Error: ${validationResult.error.message}`);
    process.exit(1);
  }

  const { projects, repoRoot } = validationResult.value;

  // Generate shell script
  const scriptResult = R.fromThrowable(
    () => generateSetupScript(projects, repoRoot),
    (error) => new Error(`Failed to generate script: ${error}`),
  )();

  if (scriptResult.isErr()) {
    console.error(`Error: ${scriptResult.error.message}`);
    process.exit(1);
  }

  // Output to stdout
  process.stdout.write(scriptResult.value);
}
