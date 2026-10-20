"use strict";
/**
 * create-story L1/L2 tests.
 * Run: node --test skills/create-story/tests/*.test.js
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const lib = require("../scripts/lib.js");

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "resources",
  "story-template.yaml",
);

// ===========================================================================
// validateStoryFilename — the id is doc-id's story.{P}.{E}.{S}{sub?} (task 206)
// ===========================================================================
test("validateStoryFilename — happy path reads P, E and S", () => {
  const r = lib.validateStoryFilename("story.1.178.8.example-feature.md");
  assert.equal(r.ok, true);
  assert.equal(r.prd, 1);
  assert.equal(r.epic, 178);
  assert.equal(r.story, 8);
  assert.equal(r.sub, null);
  assert.equal(r.name, "example-feature");
});

test("validateStoryFilename — a sub-story carries its letter on S", () => {
  const r = lib.validateStoryFilename("story.1.2.3A.core-ui.md");
  assert.equal(r.ok, true);
  assert.deepEqual([r.prd, r.epic, r.story, r.sub], [1, 2, 3, "A"]);
});

test("validateStoryFilename — rejects underscores", () => {
  const r = lib.validateStoryFilename("story_1_2_example.md");
  assert.equal(r.ok, false);
  assert.match(r.reason, /underscores/i);
});

test("validateStoryFilename — rejects camelCase descriptive name", () => {
  const r = lib.validateStoryFilename("story.1.2.3.exampleFeature.md");
  assert.equal(r.ok, false);
  assert.match(r.reason, /uppercase/i);
});

test("validateStoryFilename — rejects leading-zero ids", () => {
  assert.equal(lib.validateStoryFilename("story.01.2.3.foo.md").ok, false);
  assert.equal(lib.validateStoryFilename("story.1.02.3.foo.md").ok, false);
  assert.equal(lib.validateStoryFilename("story.1.2.03.foo.md").ok, false);
});

test("validateStoryFilename — a legacy story.{E}.{S} name is refused, naming the migration", () => {
  const r = lib.validateStoryFilename("story.178.8.example-feature.md");
  assert.equal(r.ok, false);
  assert.match(r.reason, /migrate-doc-numbering/);
});

test("validateStoryFilename — rejects missing parts and artifacts", () => {
  assert.equal(lib.validateStoryFilename("story.1.2.foo.md").ok, false);
  assert.equal(lib.validateStoryFilename("story.1.2.3.md").ok, false);
  assert.equal(lib.validateStoryFilename("story.1.2.3.foo").ok, false);
  assert.equal(lib.validateStoryFilename("story.1.2.3.qa.1.foo.md").ok, false);
});

test("validateStoryPlanFilename — happy path", () => {
  const r = lib.validateStoryPlanFilename(
    "story.1.178.8.plan.example-feature.md",
  );
  assert.equal(r.ok, true);
  assert.deepEqual([r.prd, r.epic, r.story], [1, 178, 8]);
  assert.equal(r.name, "example-feature");
});

test("validateStoryPlanFilename — rejects missing 'plan' marker", () => {
  assert.equal(
    lib.validateStoryPlanFilename("story.1.2.3.example-feature.md").ok,
    false,
  );
});

// ===========================================================================
// scanExistingStoryIds / nextStoryId / assertUniqueStoryId — keyed on (P, E)
// ===========================================================================
test("scanExistingStoryIds — scoped to the epic (P, E), never E alone or a prefix", () => {
  const ids = lib.scanExistingStoryIds(
    [
      "story.1.2.1.foo.md",
      "story.1.2.2.bar", // directory
      "story.2.2.7.baz.md", // epic 2 of ANOTHER PRD — ignored
      "story.1.20.9.qux.md", // epic 1.20 — the old `^story\\.2\\.` prefix shape would read it
      "story.1.2.30.quux.md", // story 30 of epic 1.2 — counted
      "story.1.2.5.qa.1.x.md", // an artifact alone does not hold a number — doc-id's allocator counts documents (CR-12)
      "README.md",
    ],
    1,
    2,
  );
  assert.deepEqual(
    [...ids].sort((a, b) => a - b),
    [1, 2, 30],
  );
});

test("scanExistingStoryIds — rejects a bad prd or epic number", () => {
  assert.throws(() => lib.scanExistingStoryIds([], 0, 1), /positive integer/);
  assert.throws(() => lib.scanExistingStoryIds([], 1, "1"), /positive integer/);
  assert.throws(() => lib.scanExistingStoryIds([], 1), /positive integer/);
});

test("nextStoryId — doc-id's allocator: highest + 1 within (P, E), a gap is not refilled", () => {
  assert.equal(lib.nextStoryId([], 1, 1), 1);
  assert.equal(lib.nextStoryId(["story.1.1.1.a.md"], 1, 1), 2);
  assert.equal(
    lib.nextStoryId(["story.1.1.1.a.md", "story.1.1.3.c.md"], 1, 1),
    4,
  );
  // Isolation: epic 1 of PRD 2, and epic 1.10, do not move epic 1.1's counter.
  assert.equal(
    lib.nextStoryId(["story.2.1.4.a.md", "story.1.10.6.b.md"], 1, 1),
    1,
  );
});

test("assertUniqueStoryId — HALTs on an existing (P, E, S)", () => {
  assert.throws(
    () =>
      lib.assertUniqueStoryId(1, 2, 3, [
        "story.1.2.1.a.md",
        "story.1.2.3.b.md",
      ]),
    /HALT.*story\.1\.2\.3 already exists/,
  );
});

test("assertUniqueStoryId — passes when the number is free in this (P, E)", () => {
  assert.equal(
    lib.assertUniqueStoryId(2, 2, 3, ["story.1.2.3.a.md", "story.1.2.1.b.md"]),
    true,
  );
});

// ===========================================================================
// extractSourceCitations (shared helper, smoke)
// ===========================================================================
test("extractSourceCitations — finds story-style citations", () => {
  const md = `
Architectural source: [Source: docs/architecture/tech-stack.md#typescript].
Per [Source: docs/architecture/coding-standards.md#naming] we use kebab-case.
`;
  const out = lib.extractSourceCitations(md);
  assert.deepEqual(out, [
    "docs/architecture/tech-stack.md#typescript",
    "docs/architecture/coding-standards.md#naming",
  ]);
});

// ===========================================================================
// listTemplateSectionIds
// ===========================================================================
test("listTemplateSectionIds — extracts all top-level section ids from template", () => {
  const tpl = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const ids = lib.listTemplateSectionIds(tpl);
  for (const required of lib.REQUIRED_STORY_SECTION_IDS) {
    assert.ok(
      ids.includes(required),
      `template should declare section id "${required}", got: ${JSON.stringify(ids)}`,
    );
  }
});

test("listTemplateSectionIds — handles synthetic minimal template", () => {
  const synth = `template:
  id: x
sections:
  - id: alpha
    title: A
  - id: beta
    title: B
other_root:
  - id: ignored
`;
  assert.deepEqual(lib.listTemplateSectionIds(synth), ["alpha", "beta"]);
});

// ===========================================================================
// mergeSprintStatus — stories listKey
// ===========================================================================
test("mergeSprintStatus — appends new story under stories: list", () => {
  const input = `# Sprint status
tasks:
  - id: task.1.foo
    status: done
stories:
  - id: story.1.1.alpha
    status: done
`;
  const out = lib.mergeSprintStatus(input, {
    id: "story.1.2.beta",
    status: "ready-for-dev",
  });
  // Existing tasks block untouched.
  assert.match(out, /- id: task\.1\.foo\n {4}status: done/);
  // New story appended at end of stories block.
  assert.match(out, /- id: story\.1\.2\.beta\n {4}status: ready-for-dev/);
  // Existing story unchanged.
  assert.match(out, /- id: story\.1\.1\.alpha\n {4}status: done/);
});

test("mergeSprintStatus — updates story status in place", () => {
  const input = `stories:
  - id: story.1.1.alpha
    status: in-progress
`;
  const out = lib.mergeSprintStatus(input, {
    id: "story.1.1.alpha",
    status: "done",
  });
  assert.match(out, /- id: story\.1\.1\.alpha\n {4}status: done/);
  const dupCount = (out.match(/status:/g) || []).length;
  assert.equal(dupCount, 1, "should not duplicate status line");
});

test("mergeSprintStatus — creates stories: block if absent", () => {
  const out = lib.mergeSprintStatus(
    "tasks:\n  - id: task.1.foo\n    status: done\n",
    {
      id: "story.1.1.alpha",
      status: "ready-for-dev",
    },
  );
  assert.match(
    out,
    /stories:\n {2}- id: story\.1\.1\.alpha\n {4}status: ready-for-dev/,
  );
});

// ===========================================================================
// parseFrontmatter — smoke
// ===========================================================================
test("parseFrontmatter — story frontmatter shape", () => {
  const src = `---
id: story.1.2.example-feature
status: Draft
jira_key: null
jira_url: null
acceptance_criteria:
  - First
  - Second
---

# Body
`;
  const { frontmatter, body } = lib.parseFrontmatter(src);
  assert.equal(frontmatter.id, "story.1.2.example-feature");
  assert.equal(frontmatter.status, "Draft");
  assert.equal(frontmatter.jira_key, null);
  assert.deepEqual(frontmatter.acceptance_criteria, ["First", "Second"]);
  assert.match(body, /^# Body/);
});
