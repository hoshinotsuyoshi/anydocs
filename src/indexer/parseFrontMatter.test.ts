import { describe, expect, it } from "vitest";
import { parseFrontMatter } from "./parseFrontMatter.js";

describe("parseFrontMatter", () => {
  it("should parse YAML front-matter with --- delimiter", () => {
    const content = `---
title: Hello World
tags:
  - test
  - example
---

# Content

This is the body.`;

    const result = parseFrontMatter(content);
    expect(result).toContain("# Content");
    expect(result).toContain("This is the body.");
    expect(result).not.toContain("title: Hello World");
  });

  it("should parse TOML front-matter with ---toml language marker", () => {
    const content = `---toml
title = "Hello World"
tags = ["test", "example"]
---

# Content

This is the body.`;

    const result = parseFrontMatter(content);
    expect(result).toContain("# Content");
    expect(result).toContain("This is the body.");
    expect(result).not.toContain('title = "Hello World"');
  });

  it("should parse TOML syntax with --- delimiter (Supabase docs format)", () => {
    const content = `---
title = "42501 : permission denied for table http_request_queue"
github_url = "https://github.com/orgs/supabase/discussions/21450"
date_created = "2024-02-22T10:26:16+00:00"
topics = [ "database" ]
keywords = [ "permission", "pg_net", "http_request_queue" ]
database_id = "97923126-7d0b-4bf0-bb65-55dae289a8a3"

[[errors]]
code = "42501"
message = "permission denied for table http_request_queue"
---

If you're currently blocked by the above error, run the following in your Supabase SQL editor:

- Check \`select * from net.http_request_queue\` and make sure it's empty.
- Try \`drop extension pg_net; create extension pg_net schema extensions;\``;

    const result = parseFrontMatter(content);
    expect(result).toContain("If you're currently blocked");
    expect(result).toContain("Supabase SQL editor");
    expect(result).not.toContain("title =");
    expect(result).not.toContain("[[errors]]");
  });

  it("should handle content without front-matter", () => {
    const content = `# Hello World

This is content without front-matter.`;

    const result = parseFrontMatter(content);
    expect(result).toBe(content);
  });

  it("should handle TOML array of tables syntax", () => {
    const content = `---
title = "Test"

[[items]]
name = "First"
value = 1

[[items]]
name = "Second"
value = 2
---

# Content`;

    const result = parseFrontMatter(content);
    expect(result).toContain("# Content");
    expect(result).not.toContain("[[items]]");
  });
});
