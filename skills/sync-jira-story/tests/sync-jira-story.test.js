"use strict";
/**
 * sync-jira-story tests — node:test (no external deps).
 * Run: node --test tests/
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const lib = require("../scripts/sync-jira-story.js");

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------
test("parseFrontmatter — basic key/value", () => {
  const src = `---
title: 'Story 1.2: Hello'
priority: 'high'
---

# Body
`;
  const { frontmatter, body } = lib.parseFrontmatter(src);
  assert.equal(frontmatter.title, "Story 1.2: Hello");
  assert.equal(frontmatter.priority, "high");
  assert.match(body, /^# Body/);
});

test("parseFrontmatter — body containing horizontal rule (---) is preserved verbatim", () => {
  const src = `---
title: 'X'
jira_epic: "PROJ-14"
---

# Heading

Section A

---

Section B with second hr

---

End.
`;
  const { frontmatter, body } = lib.parseFrontmatter(src);
  assert.equal(frontmatter.title, "X");
  assert.equal(frontmatter.jira_epic, "PROJ-14");
  // Both rules and surrounding paragraphs must survive intact
  assert.ok(body.includes("Section A"));
  assert.ok(body.includes("Section B with second hr"));
  assert.ok(body.match(/---/g).length >= 2, "expected 2+ horizontal rules in body");
  assert.ok(body.includes("End."));
});

test("parseFrontmatter — YAML block array (multi-line dash list)", () => {
  const src = `---
title: 'X'
acceptance_criteria:
  - First criterion
  - "Second with quotes"
  - Third
labels:
  - alpha
  - beta
---

body
`;
  const { frontmatter } = lib.parseFrontmatter(src);
  assert.deepEqual(frontmatter.acceptance_criteria, ["First criterion", "Second with quotes", "Third"]);
  assert.deepEqual(frontmatter.labels, ["alpha", "beta"]);
});

test("parseFrontmatter — inline array form still works", () => {
  const src = `---
title: 'X'
labels: [a, b, "c d"]
empty: []
---

body
`;
  const { frontmatter } = lib.parseFrontmatter(src);
  assert.deepEqual(frontmatter.labels, ["a", "b", "c d"]);
  assert.deepEqual(frontmatter.empty, []);
});

test("parseFrontmatter — missing close tag returns full content as body", () => {
  const src = `---\ntitle: 'X'\n# no close tag\n`;
  const { frontmatter, body } = lib.parseFrontmatter(src);
  assert.deepEqual(frontmatter, {});
  assert.equal(body, src);
});

// ---------------------------------------------------------------------------
// upsertChangelog
// ---------------------------------------------------------------------------
test("upsertChangelog — inserts when no changelog exists, before first ## section", () => {
  const src = `# Title\n\nIntro.\n\n## Section\n\nbody\n`;
  const out = lib.upsertChangelog(src, lib.fmtEntry("Initial Jira story created"));
  assert.ok(out.includes(lib.CL_START));
  assert.ok(out.includes(lib.CL_END));
  assert.ok(out.indexOf(lib.CL_START) < out.indexOf("## Section"), "changelog must precede ## Section");
});

test("upsertChangelog — appends entry within existing markers", () => {
  const initial = lib.upsertChangelog(`# T\n\n## S\n\nbody\n`, lib.fmtEntry("Entry one"));
  const out = lib.upsertChangelog(initial, lib.fmtEntry("Entry two"));
  assert.match(out, /Entry one/);
  assert.match(out, /Entry two/);
  // Only one CL block
  assert.equal(out.match(new RegExp(lib.CL_START, "g")).length, 1);
  assert.equal(out.match(new RegExp(lib.CL_END,   "g")).length, 1);
});

test("upsertChangelog — preserves entries from hand-written `## Change Log` heading without markers", () => {
  const src = `# Title

## Change Log

| Date (UTC) | Change |
|------------|--------|
| 2026-01-01 09:00 | Manually written entry |

## Other Section

stuff
`;
  const out = lib.upsertChangelog(src, lib.fmtEntry("New auto entry"));
  // Must not duplicate the heading
  assert.equal(out.match(/## Change Log/g).length, 1, "only one Change Log heading allowed");
  // Must preserve original entry
  assert.match(out, /Manually written entry/);
  // Must add the new entry
  assert.match(out, /New auto entry/);
  // Must wrap in markers now
  assert.ok(out.includes(lib.CL_START));
  assert.ok(out.includes(lib.CL_END));
  // Other section preserved
  assert.match(out, /## Other Section/);
});

test("upsertChangelog — idempotent format on repeated wrapping", () => {
  let out = `# T\n\nbody\n`;
  out = lib.upsertChangelog(out, lib.fmtEntry("a"));
  out = lib.upsertChangelog(out, lib.fmtEntry("b"));
  out = lib.upsertChangelog(out, lib.fmtEntry("c"));
  assert.equal(out.match(new RegExp(lib.CL_START, "g")).length, 1);
  assert.equal(out.match(new RegExp(lib.CL_END,   "g")).length, 1);
});

// ---------------------------------------------------------------------------
// diffFields + hash
// ---------------------------------------------------------------------------
test("diffFields — identical inputs produce no changes", () => {
  const prev = { summary: "S", priority: "High", labels: ["a", "b"] };
  const next = { summary: "S", priority: "High", labels: ["a", "b"] };
  const changed = lib.diffFields({ prev, next, prevDescHash: "abc", newDescHash: "abc" });
  assert.deepEqual(changed, []);
});

test("diffFields — detects each field independently", () => {
  const prev = { summary: "S", priority: "High", labels: ["a"] };
  assert.deepEqual(
    lib.diffFields({ prev, next: { summary: "T", priority: "High", labels: ["a"] }, prevDescHash: "x", newDescHash: "x" }),
    ["summary"]
  );
  assert.deepEqual(
    lib.diffFields({ prev, next: { summary: "S", priority: "Low", labels: ["a"] }, prevDescHash: "x", newDescHash: "x" }),
    ["priority"]
  );
  assert.deepEqual(
    lib.diffFields({ prev, next: { summary: "S", priority: "High", labels: ["b"] }, prevDescHash: "x", newDescHash: "x" }),
    ["labels"]
  );
  assert.deepEqual(
    lib.diffFields({ prev, next: { summary: "S", priority: "High", labels: ["a"] }, prevDescHash: "x", newDescHash: "y" }),
    ["description"]
  );
});

test("diffFields — label order does not matter", () => {
  const prev = { summary: "S", priority: "", labels: ["b", "a"] };
  const next = { summary: "S", priority: "", labels: ["a", "b"] };
  assert.deepEqual(lib.diffFields({ prev, next, prevDescHash: "h", newDescHash: "h" }), []);
});

test("hashDescriptionInput — stable for identical input, differs on body change", () => {
  const args = { body: "## User Story\n\nAs a user…\n", frontmatter: {}, epicBbUrl: null, storyBbUrl: null };
  const h1 = lib.hashDescriptionInput(args);
  const h2 = lib.hashDescriptionInput(args);
  assert.equal(h1, h2);
  const h3 = lib.hashDescriptionInput({ ...args, body: "## User Story\n\nAs a user changed.\n" });
  assert.notEqual(h1, h3);
});

// ---------------------------------------------------------------------------
// normalisePriority + sanitiseLabels
// ---------------------------------------------------------------------------
test("normalisePriority — known synonyms map to canonical names", () => {
  assert.equal(lib.normalisePriority("critical"), "Highest");
  assert.equal(lib.normalisePriority("normal"), "Medium");
  assert.equal(lib.normalisePriority("trivial"), "Lowest");
  assert.equal(lib.normalisePriority("HIGH"), "High");
});

test("normalisePriority — unknown returns undefined and warns", () => {
  // Capture stderr by patching console.warn — simple silence
  const origWarn = console.warn;
  let warned = false;
  console.warn = () => { warned = true; };
  try {
    assert.equal(lib.normalisePriority("urgent-asap"), undefined);
    assert.ok(warned, "warning should have been emitted");
  } finally {
    console.warn = origWarn;
  }
});

test("normalisePriority — empty/null returns undefined", () => {
  assert.equal(lib.normalisePriority(""), undefined);
  assert.equal(lib.normalisePriority(null), undefined);
  assert.equal(lib.normalisePriority(undefined), undefined);
});

test("sanitiseLabels — filters empty / whitespace entries", () => {
  assert.deepEqual(lib.sanitiseLabels(""), undefined);
  assert.deepEqual(lib.sanitiseLabels(",,"), undefined);
  assert.deepEqual(lib.sanitiseLabels("a,,b , ,c"), ["a", "b", "c"]);
  assert.deepEqual(lib.sanitiseLabels(["a", "", " ", "b"]), ["a", "b"]);
  assert.deepEqual(lib.sanitiseLabels([]), undefined);
});

// ---------------------------------------------------------------------------
// guardConcurrentEdit
// ---------------------------------------------------------------------------
test("guardConcurrentEdit — passes when Jira not advanced past last sync", () => {
  assert.doesNotThrow(() => lib.guardConcurrentEdit({
    jiraUpdated:  "2026-04-28T10:00:00.000Z",
    lastSyncedAt: "2026-04-28T10:00:00.000Z",
    force: false,
  }));
});

test("guardConcurrentEdit — throws when Jira advanced past last sync", () => {
  assert.throws(
    () => lib.guardConcurrentEdit({
      jiraUpdated:  "2026-04-28T11:00:00.000Z",
      lastSyncedAt: "2026-04-28T10:00:00.000Z",
      force: false,
    }),
    /updated since last local sync/
  );
});

test("guardConcurrentEdit — --force overrides the abort", () => {
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    assert.doesNotThrow(() => lib.guardConcurrentEdit({
      jiraUpdated:  "2026-04-28T11:00:00.000Z",
      lastSyncedAt: "2026-04-28T10:00:00.000Z",
      force: true,
    }));
  } finally {
    console.warn = origWarn;
  }
});

test("guardConcurrentEdit — no last sync (first run) skips guard", () => {
  assert.doesNotThrow(() => lib.guardConcurrentEdit({
    jiraUpdated: "2026-04-28T11:00:00.000Z",
    lastSyncedAt: undefined,
    force: false,
  }));
});

// ---------------------------------------------------------------------------
// buildDescriptionAdf — structural assertions
// ---------------------------------------------------------------------------
test("buildDescriptionAdf — produces valid ADF doc with table for changelog", () => {
  const doc = lib.buildDescriptionAdf({
    body: "## User Story\n\nAs a developer I want X.\n\n## Acceptance Criteria\n\n- AC1\n- AC2\n",
    frontmatter: { story_type: "feature_enhancement", estimated_effort_hours: "4", jira_epic: "PROJ-14" },
    epicBbUrl: "https://bitbucket.org/org/repo/src/HEAD/epic.md",
    storyBbUrl: "https://bitbucket.org/org/repo/src/HEAD/story.md",
    changelogEntries: ["| 2026-04-28 09:40 | Initial Jira story created |"],
  });
  assert.equal(doc.type, "doc");
  assert.equal(doc.version, 1);
  // Find table node
  const table = doc.content.find(n => n.type === "table");
  assert.ok(table, "table node present");
  assert.equal(table.content.length, 2, "header row + 1 data row");
  // Bullet list with link nodes
  const bullet = doc.content.find(n => n.type === "bulletList");
  assert.ok(bullet);
  const linkText = bullet.content[0].content[0].content[0];
  assert.equal(linkText.marks[0].type, "link");
  assert.match(linkText.marks[0].attrs.href, /bitbucket\.org/);
});

test("buildDescriptionAdf — omits sections with no body match", () => {
  const doc = lib.buildDescriptionAdf({
    body: "# Just a title\n\nNothing else.\n",
    frontmatter: {},
    epicBbUrl: null,
    storyBbUrl: null,
    changelogEntries: [],
  });
  // No headings, no metadata, no source-doc list — empty doc body
  assert.equal(doc.content.length, 0);
});

// ---------------------------------------------------------------------------
// parseJiraError
// ---------------------------------------------------------------------------
test("parseJiraError — extracts errorMessages and field errors", async () => {
  const fake = {
    text: async () => JSON.stringify({
      errorMessages: ["Invalid project."],
      errors: { priority: "Field 'priority' cannot be set." },
    }),
  };
  const msg = await lib.parseJiraError(fake);
  assert.match(msg, /Invalid project/);
  assert.match(msg, /priority: Field 'priority' cannot be set/);
});

test("parseJiraError — falls back to raw text on non-JSON response", async () => {
  const fake = { text: async () => "Plain text error" };
  assert.equal(await lib.parseJiraError(fake), "Plain text error");
});

// ---------------------------------------------------------------------------
// rewriteFrontmatter
// ---------------------------------------------------------------------------
test("rewriteFrontmatter — preserves body containing ---", () => {
  const src = `---
title: 'X'
---

# Body

---

After rule.
`;
  const out = lib.rewriteFrontmatter(src, fm => fm + "\nadded: \"yes\"");
  assert.match(out, /added: "yes"/);
  assert.match(out, /After rule\./);
  assert.match(out, /---\n\nAfter rule/, "body horizontal rule preserved");
});

// ---------------------------------------------------------------------------
// mapStatus
// ---------------------------------------------------------------------------
test("mapStatus — strips emoji and maps to canonical Jira status", () => {
  assert.equal(lib.mapStatus("📋 Planned"), "To Do");
  assert.equal(lib.mapStatus("🚧 In Progress"), "In Progress");
  assert.equal(lib.mapStatus("✅ Done"), "Done");
  assert.equal(lib.mapStatus("🚫 Blocked"), "Blocked");
});

test("mapStatus — case-insensitive", () => {
  assert.equal(lib.mapStatus("PLANNED"), "To Do");
  assert.equal(lib.mapStatus("doing"), "In Progress");
  assert.equal(lib.mapStatus("Completed"), "Done");
});

test("mapStatus — passes unmapped values through (custom workflow)", () => {
  // Used by SKILL.md: any custom status name (e.g. "Code Review") flows
  // through to Jira's transition matcher, allowing custom workflows.
  assert.equal(lib.mapStatus("Code Review"), "Code Review");
  assert.equal(lib.mapStatus("🔍 Code Review"), "Code Review");
});

test("mapStatus — empty/null returns null", () => {
  assert.equal(lib.mapStatus(""), null);
  assert.equal(lib.mapStatus(null), null);
  assert.equal(lib.mapStatus(undefined), null);
});

test("mapStatus — covers the full canonical lifecycle (no passthrough)", () => {
  // Regression: draft/ready-for-review/accepted were previously missing from
  // the map and leaked through verbatim, producing no Jira transition.
  assert.equal(lib.mapStatus("draft"), "To Do");
  assert.equal(lib.mapStatus("planned"), "To Do");
  assert.equal(lib.mapStatus("ready-for-development"), "To Do");
  assert.equal(lib.mapStatus("in-progress"), "In Progress");
  assert.equal(lib.mapStatus("ready-for-review"), "In Review");
  assert.equal(lib.mapStatus("accepted"), "Done");
  assert.equal(lib.mapStatus("cancelled"), "Cancelled");
});

test("mapStatus — honours a project-supplied status map (custom workflow vocab)", () => {
  // frontmatter status is lowercase-kebab; the map is keyed accordingly
  const custom = { "ready-for-development": "Selected for Development" };
  assert.equal(lib.mapStatus("ready-for-development", custom), "Selected for Development");
  assert.equal(lib.mapStatus("📋 Ready-for-development", custom), "Selected for Development");
  // unmapped keys still pass through emoji-stripped
  assert.equal(lib.mapStatus("Code Review", custom), "Code Review");
});

test("loadStatusMap — merges skills-config.yaml jira.statusMap over defaults", () => {
  const fs = require("fs"), os = require("os"), path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statusmap-"));
  fs.writeFileSync(path.join(dir, "skills-config.yaml"),
    "jira:\n  statusMap:\n    ready-for-development: Selected for Development\n    accepted: Shipped\n");
  const map = lib.loadStatusMap(dir);
  assert.equal(map["ready-for-development"], "Selected for Development"); // override wins
  assert.equal(map["accepted"], "Shipped");                              // override wins
  assert.equal(map["in-progress"], "In Progress");                       // default retained
  fs.rmSync(dir, { recursive: true, force: true });
});

test("loadStatusMap — falls back to defaults when no config present", () => {
  const fs = require("fs"), os = require("os"), path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statusmap-none-"));
  const map = lib.loadStatusMap(dir);
  assert.equal(map["ready-for-development"], "To Do");
  assert.equal(map["accepted"], "Done");
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// parseJiraScalar / loadDevEstimateField — Jira custom field id config
// ---------------------------------------------------------------------------
test("parseJiraScalar — reads a scalar key under jira:", () => {
  assert.equal(lib.parseJiraScalar("jira:\n  devEstimateField: customfield_10594\n", "devEstimateField"), "customfield_10594");
});

test("parseJiraScalar — does not collide with deeper statusMap children", () => {
  const cfg = "jira:\n  statusMap:\n    devEstimateField: NotThis\n  devEstimateField: customfield_42\n";
  assert.equal(lib.parseJiraScalar(cfg, "devEstimateField"), "customfield_42");
});

test("parseJiraScalar — strips quotes and returns '' when absent", () => {
  assert.equal(lib.parseJiraScalar('jira:\n  devEstimateField: "customfield_99"\n', "devEstimateField"), "customfield_99");
  assert.equal(lib.parseJiraScalar("jira:\n  statusMap:\n    accepted: Done\n", "devEstimateField"), "");
  assert.equal(lib.parseJiraScalar("prd:\n  prdShardedLocation: docs/prd\n", "devEstimateField"), "");
});

test("parseJiraScalar — strips a trailing inline comment, preserves in-value '#'", () => {
  // the reported bug: scaffolded config carries a trailing comment
  assert.equal(lib.parseJiraScalar("jira:\n  devEstimateField: customfield_10594  # optional — Jira field id\n", "devEstimateField"), "customfield_10594");
  // quoted value with a trailing comment
  assert.equal(lib.parseJiraScalar('jira:\n  devEstimateField: "customfield_10594"  # c\n', "devEstimateField"), "customfield_10594");
  // a '#' that is part of the value (no preceding space) is preserved
  assert.equal(lib.parseJiraScalar("jira:\n  devEstimateField: abc#def\n", "devEstimateField"), "abc#def");
  // a comment-only value collapses to ''
  assert.equal(lib.parseJiraScalar("jira:\n  devEstimateField:  # nothing set\n", "devEstimateField"), "");
});

test("loadStatusMap — tolerates inline comments on the statusMap opener and value lines", () => {
  const fs = require("fs"), os = require("os"), path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statusmap-comment-"));
  // mirrors the setup-consumer scaffold shape (trailing comment after `statusMap:`)
  fs.writeFileSync(path.join(dir, "skills-config.yaml"),
    "jira:  # tracker block\n  statusMap:                          # local document status -> Jira status\n    ready-for-development: Selected for Development  # dev queue\n    accepted: Done\n");
  const map = lib.loadStatusMap(dir);
  assert.equal(map["ready-for-development"], "Selected for Development");
  assert.equal(map["accepted"], "Done");
  assert.equal(map["in-progress"], "In Progress"); // default retained
  fs.rmSync(dir, { recursive: true, force: true });
});

test("loadDevEstimateField — reads jira.devEstimateField from skills-config.yaml", () => {
  const fs = require("fs"), os = require("os"), path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devest-"));
  fs.writeFileSync(path.join(dir, "skills-config.yaml"), "jira:\n  devEstimateField: customfield_10594\n  statusMap:\n    accepted: Done\n");
  assert.equal(lib.loadDevEstimateField(dir), "customfield_10594");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("loadDevEstimateField — returns '' when config or key absent", () => {
  const fs = require("fs"), os = require("os"), path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devest-none-"));
  assert.equal(lib.loadDevEstimateField(dir), "");
  fs.writeFileSync(path.join(dir, "skills-config.yaml"), "jira:\n  statusMap:\n    accepted: Done\n");
  assert.equal(lib.loadDevEstimateField(dir), "");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("collectIssueFields — writes the dev-estimate custom field when configured (numeric only)", () => {
  const modPath = require.resolve("../scripts/sync-jira-story.js");
  const prev = process.env.JIRA_DEV_ESTIMATE_FIELD;
  process.env.JIRA_DEV_ESTIMATE_FIELD = "customfield_10594";
  delete require.cache[modPath];
  const freshLib = require(modPath);
  try {
    const numeric = freshLib.collectIssueFields({
      args: {}, frontmatter: { title: "S", estimated_effort_hours: 4 },
      descAdf: { type: "doc", content: [] },
      storyTypeId: null, projectKey: null,
      livePriorities: null, output: { warn() {}, info() {} },
      syncLabel: "synced-from-foo", epicKey: null, useEpicLink: false,
    });
    assert.equal(numeric.customfield_10594, 4);
    assert.deepEqual(numeric.timetracking, { originalEstimate: "4h", remainingEstimate: "4h" });

    const nonNumeric = freshLib.collectIssueFields({
      args: {}, frontmatter: { title: "S", estimated_effort_hours: "1d 4h" },
      descAdf: { type: "doc", content: [] },
      storyTypeId: null, projectKey: null,
      livePriorities: null, output: { warn() {}, info() {} },
      syncLabel: "synced-from-foo", epicKey: null, useEpicLink: false,
    });
    assert.equal(nonNumeric.customfield_10594, undefined); // non-numeric → custom field skipped
  } finally {
    if (prev === undefined) delete process.env.JIRA_DEV_ESTIMATE_FIELD;
    else process.env.JIRA_DEV_ESTIMATE_FIELD = prev;
    delete require.cache[modPath];
  }
});

test("collectIssueFields — omits the dev-estimate custom field when unconfigured", () => {
  const fields = lib.collectIssueFields({
    args: {}, frontmatter: { title: "S", estimated_effort_hours: 4 },
    descAdf: { type: "doc", content: [] },
    storyTypeId: null, projectKey: null,
    livePriorities: null, output: { warn() {}, info() {} },
    syncLabel: "synced-from-foo", epicKey: null, useEpicLink: false,
  });
  assert.equal(fields.customfield_10594, undefined);
  assert.deepEqual(fields.timetracking, { originalEstimate: "4h", remainingEstimate: "4h" });
});

// ---------------------------------------------------------------------------
// syncLabelFor
// ---------------------------------------------------------------------------
test("syncLabelFor — derives label from parent dir name", () => {
  assert.equal(
    lib.syncLabelFor("/abs/docs/prd/x/epics/epic.1.foo/stories/story.1.2.bar/story.1.2.bar.md"),
    "synced-from-story.1.2.bar"
  );
});

test("syncLabelFor — replaces whitespace with dashes (no Jira labels with spaces)", () => {
  assert.equal(
    lib.syncLabelFor("/abs/docs/some dir with spaces/file.md"),
    "synced-from-some-dir-with-spaces"
  );
});

// ---------------------------------------------------------------------------
// collectIssueFields — epic-link selection + includeDescription
// ---------------------------------------------------------------------------
test("collectIssueFields — team-managed sets parent.key, NOT customfield_10014", () => {
  const fields = lib.collectIssueFields({
    args: {}, frontmatter: { title: "S", priority: "high" },
    descAdf: { type: "doc", content: [] },
    storyTypeId: "10001", projectKey: "RB",
    livePriorities: null, output: { warn() {}, info() {} },
    syncLabel: "synced-from-foo", epicKey: "PROJ-14", useEpicLink: false,
  });
  assert.deepEqual(fields.parent, { key: "PROJ-14" });
  assert.equal(fields.customfield_10014, undefined);
  assert.equal(fields.summary, "S");
  assert.equal(fields.priority.name, "High");
  assert.ok(fields.labels.includes("synced-from-foo"));
});

test("collectIssueFields — classic sets customfield_10014, NOT parent", () => {
  const fields = lib.collectIssueFields({
    args: {}, frontmatter: { title: "S" },
    descAdf: { type: "doc", content: [] },
    storyTypeId: "10001", projectKey: "RB",
    livePriorities: null, output: { warn() {}, info() {} },
    syncLabel: "synced-from-foo", epicKey: "PROJ-14", useEpicLink: true,
  });
  assert.equal(fields.customfield_10014, "PROJ-14");
  assert.equal(fields.parent, undefined);
});

test("collectIssueFields — includeDescription:false omits description (used on label/summary-only updates)", () => {
  const fields = lib.collectIssueFields({
    args: {}, frontmatter: { title: "S" },
    descAdf: { type: "doc", content: [] },
    includeDescription: false,
    storyTypeId: null, projectKey: null,
    livePriorities: null, output: { warn() {}, info() {} },
    syncLabel: "synced-from-foo", epicKey: null, useEpicLink: false,
  });
  assert.equal(fields.description, undefined);
  assert.equal(fields.summary, "S");
});

test("collectIssueFields — sync label always injected when missing, not duplicated", () => {
  const f1 = lib.collectIssueFields({
    args: { labels: "alpha,beta" }, frontmatter: { title: "S" },
    descAdf: { type: "doc", content: [] },
    storyTypeId: null, projectKey: null,
    livePriorities: null, output: { warn() {}, info() {} },
    syncLabel: "synced-from-x", epicKey: null, useEpicLink: false,
  });
  assert.deepEqual(f1.labels, ["alpha", "beta", "synced-from-x"]);

  const f2 = lib.collectIssueFields({
    args: { labels: "alpha,synced-from-x" }, frontmatter: { title: "S" },
    descAdf: { type: "doc", content: [] },
    storyTypeId: null, projectKey: null,
    livePriorities: null, output: { warn() {}, info() {} },
    syncLabel: "synced-from-x", epicKey: null, useEpicLink: false,
  });
  assert.deepEqual(f2.labels, ["alpha", "synced-from-x"]);
});

// ---------------------------------------------------------------------------
// upsertInlineLine — code-block masking
// ---------------------------------------------------------------------------
test("upsertInlineLine — does NOT rewrite matches inside fenced code blocks", () => {
  const src = `# Title

\`\`\`markdown
**Jira Story**: [SAMPLE-1](https://example/SAMPLE-1)
\`\`\`

Some prose.
`;
  const out = lib.upsertInlineLine(
    src,
    /^\*\*Jira Story\*\*:.*$/m,
    "**Jira Story**: [PROJ-99](https://real/PROJ-99)"
  );
  // Code-block sample preserved verbatim
  assert.match(out, /SAMPLE-1/);
  // New line inserted outside the code block
  assert.match(out, /PROJ-99/);
  // Code fence count preserved
  assert.equal(out.match(/```/g).length, 2);
});

test("upsertInlineLine — replaces existing line outside code blocks", () => {
  const src = `# Title

**Jira Story**: [OLD-1](https://x/OLD-1)

Body.
`;
  const out = lib.upsertInlineLine(
    src,
    /^\*\*Jira Story\*\*:.*$/m,
    "**Jira Story**: [NEW-1](https://x/NEW-1)"
  );
  assert.match(out, /NEW-1/);
  assert.doesNotMatch(out, /OLD-1/);
});

test("upsertInlineLine — inserts after first H1 when no existing line", () => {
  const src = `# Story 1.2: Foo\n\nIntro.\n`;
  const out = lib.upsertInlineLine(
    src,
    /^\*\*Jira Story\*\*:.*$/m,
    "**Jira Story**: [PROJ-1](https://x/PROJ-1)"
  );
  assert.match(out, /^# Story 1\.2: Foo\n\n\*\*Jira Story\*\*: \[PROJ-1\]/);
});

// ---------------------------------------------------------------------------
// withCodeBlocksMasked — independent assertion
// ---------------------------------------------------------------------------
test("withCodeBlocksMasked — round-trips multiple fenced blocks", () => {
  const src = "Pre.\n\n```\nA\n```\n\nMid.\n\n```js\nB\n```\n\nEnd.";
  const out = lib.withCodeBlocksMasked(src, m => m.replace(/Mid/g, "MIDDLE"));
  assert.match(out, /MIDDLE/);
  assert.match(out, /```\nA\n```/);
  assert.match(out, /```js\nB\n```/);
});

// ---------------------------------------------------------------------------
// createStoryWithRetry — flips parent/Epic Link on 400
// ---------------------------------------------------------------------------
function makeMockResp({ status = 200, body = "{}", headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
    headers: { get: k => headers[k.toLowerCase()] || null },
  };
}

test("createStoryWithRetry — 400 mentioning parent flips to Epic Link customfield and retries", async () => {
  const calls = [];
  const http = async (url, opts) => {
    calls.push(JSON.parse(opts.body).fields);
    if (calls.length === 1) {
      return makeMockResp({
        status: 400,
        body: JSON.stringify({ errors: { parent: "Field 'parent' cannot be set on this issue type." } }),
      });
    }
    return makeMockResp({ status: 201, body: JSON.stringify({ key: "PROJ-99" }) });
  };
  const auth = { baseUrl: "https://j", email: "e", token: "t" };
  const fields = { summary: "S", parent: { key: "PROJ-14" } };
  const out = { warn() {}, info() {} };
  const resp = await lib.createStoryWithRetry({ http, auth, fields, output: out });
  assert.equal(resp.status, 201);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].parent, { key: "PROJ-14" });
  assert.equal(calls[1].parent, undefined);
  assert.equal(calls[1].customfield_10014, "PROJ-14");
});

test("createStoryWithRetry — 400 mentioning epic_link flips to parent and retries", async () => {
  const calls = [];
  const http = async (url, opts) => {
    calls.push(JSON.parse(opts.body).fields);
    if (calls.length === 1) {
      return makeMockResp({
        status: 400,
        body: JSON.stringify({ errors: { customfield_10014: "Epic Link is not valid." } }),
      });
    }
    return makeMockResp({ status: 201, body: JSON.stringify({ key: "PROJ-99" }) });
  };
  const fields = { summary: "S", customfield_10014: "PROJ-14" };
  const resp = await lib.createStoryWithRetry({
    http, auth: { baseUrl: "https://j", email: "e", token: "t" },
    fields, output: { warn() {}, info() {} },
  });
  assert.equal(resp.status, 201);
  assert.deepEqual(calls[1].parent, { key: "PROJ-14" });
});

test("createStoryWithRetry — non-parent 400 errors propagate immediately", async () => {
  const http = async () => makeMockResp({
    status: 400,
    body: JSON.stringify({ errors: { summary: "Summary too long." } }),
  });
  await assert.rejects(
    () => lib.createStoryWithRetry({
      http, auth: { baseUrl: "https://j", email: "e", token: "t" },
      fields: { summary: "S", parent: { key: "PROJ-14" } },
      output: { warn() {}, info() {} },
    }),
    /Summary too long/
  );
});

// ---------------------------------------------------------------------------
// Shared lib reliability — HTTP retry on 5xx and 429
// ---------------------------------------------------------------------------
const sharedLib = require("../references/jira-sync.js");

test("makeHttp — retries 5xx with exponential backoff (then succeeds)", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls < 3) return makeMockResp({ status: 503, body: "transient" });
    return makeMockResp({ status: 200, body: '{"ok":true}' });
  };
  const http = sharedLib.makeHttp({ fetchImpl, retries: 3, retryDelayMs: 1 });
  const resp = await http("https://j/x");
  assert.equal(resp.status, 200);
  assert.equal(calls, 3);
});

test("makeHttp — retries 429 honoring Retry-After (numeric seconds)", async () => {
  let calls = 0;
  const ts = [];
  const fetchImpl = async () => {
    ts.push(Date.now());
    calls++;
    if (calls === 1) return makeMockResp({ status: 429, headers: { "retry-after": "0" } });
    return makeMockResp({ status: 200, body: "{}" });
  };
  const http = sharedLib.makeHttp({ fetchImpl, retries: 2, retryDelayMs: 1 });
  const resp = await http("https://j/x");
  assert.equal(resp.status, 200);
  assert.equal(calls, 2);
});

test("makeHttp — 4xx (other than 429) fails fast without retry", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return makeMockResp({ status: 400, body: "bad" });
  };
  const http = sharedLib.makeHttp({ fetchImpl, retries: 5, retryDelayMs: 1 });
  const resp = await http("https://j/x");
  assert.equal(resp.status, 400);
  assert.equal(calls, 1);
});

test("parseRetryAfter — handles seconds and HTTP-date forms", () => {
  assert.equal(sharedLib.parseRetryAfter("5"), 5000);
  assert.equal(sharedLib.parseRetryAfter("0"), 0);
  assert.equal(sharedLib.parseRetryAfter(null), null);
  assert.equal(sharedLib.parseRetryAfter(""), null);
  assert.equal(sharedLib.parseRetryAfter("not-a-date"), null);
  // Date in the past returns 0, not negative
  assert.equal(sharedLib.parseRetryAfter("Wed, 01 Jan 2020 00:00:00 GMT"), 0);
});

// ---------------------------------------------------------------------------
// findExistingByLabel — multi-match warning
// ---------------------------------------------------------------------------
test("findExistingByLabel — warns and adopts first when multiple issues carry the label", async () => {
  const http = async () => makeMockResp({
    status: 200,
    body: JSON.stringify({
      issues: [
        { key: "PROJ-50", fields: { updated: "2026-04-28T10:00:00.000Z" } },
        { key: "PROJ-51", fields: { updated: "2026-04-28T10:01:00.000Z" } },
      ],
    }),
  });
  const warns = [];
  const out = { warn: m => warns.push(m), info() {} };
  const found = await sharedLib.findExistingByLabel({
    http, baseUrl: "https://j", email: "e", token: "t",
    projectKey: "RB", label: "synced-from-foo", output: out,
  });
  assert.equal(found.key, "PROJ-50");
  assert.equal(warns.length, 1);
  assert.match(warns[0], /Multiple Jira issues match label/);
  assert.match(warns[0], /PROJ-50, PROJ-51/);
});

test("findExistingByLabel — returns null on empty issues array", async () => {
  const http = async () => makeMockResp({
    status: 200, body: JSON.stringify({ issues: [] }),
  });
  const found = await sharedLib.findExistingByLabel({
    http, baseUrl: "https://j", email: "e", token: "t",
    projectKey: "RB", label: "synced-from-foo",
  });
  assert.equal(found, null);
});

// ---------------------------------------------------------------------------
// parseArgs — --no-write
// ---------------------------------------------------------------------------
test("parseArgs — --no-write parsed as boolean flag", () => {
  const opts = lib.parseArgs(["node", "script", "--file", "x.md", "--no-write"]);
  assert.equal(opts.noWrite, true);
  assert.equal(opts.dryRun, false);
  assert.equal(opts.file, "x.md");
});

test("parseArgs — --no-write absent defaults to false", () => {
  const opts = lib.parseArgs(["node", "script", "--file", "x.md"]);
  assert.equal(opts.noWrite, false);
});

// ---------------------------------------------------------------------------
// stripRemotePrefix — pure parse step behind getCurrentBranchUpstream()
// ---------------------------------------------------------------------------
test("stripRemotePrefix — strips remote name, preserves slashes in branch", () => {
  assert.equal(lib.stripRemotePrefix("origin/main"), "main");
  assert.equal(lib.stripRemotePrefix("origin/feature/story.5.1.foo"), "feature/story.5.1.foo");
  assert.equal(lib.stripRemotePrefix("upstream/release/1.2"), "release/1.2");
});

test("stripRemotePrefix — empty or shape-less ref returns null", () => {
  assert.equal(lib.stripRemotePrefix(""), null);
  assert.equal(lib.stripRemotePrefix("weirdnoref"), null);
});

test("parseArgs — --doc-branch overrides the resolved branch", () => {
  const opts = lib.parseArgs(["node", "script", "--file", "x.md", "--doc-branch", "develop"]);
  assert.equal(opts.docBranch, "develop");
});

test("parseArgs — --doc-branch absent defaults to null", () => {
  const opts = lib.parseArgs(["node", "script", "--file", "x.md"]);
  assert.equal(opts.docBranch, null);
});

// ---------------------------------------------------------------------------
// normaliseStorySummary — canonical "[Story N.N] {title}" bracket form
// ---------------------------------------------------------------------------
test("normaliseStorySummary — already-bracketed is unchanged (idempotent)", () => {
  assert.equal(lib.normaliseStorySummary("[Story 1.3] Foo", "9.9"), "[Story 1.3] Foo");
});

test("normaliseStorySummary — colon-prefixed is rewrapped in brackets", () => {
  assert.equal(lib.normaliseStorySummary("Story 1.3: Foo", "9.9"), "[Story 1.3] Foo");
});

test("normaliseStorySummary — bare title resolves id from the filename fallback", () => {
  assert.equal(lib.normaliseStorySummary("Foo", "1.3"), "[Story 1.3] Foo");
});

test("normaliseStorySummary — no id resolvable leaves the summary unchanged", () => {
  assert.equal(lib.normaliseStorySummary("Foo", undefined), "Foo");
  assert.equal(lib.normaliseStorySummary("Foo", null), "Foo");
});

// ---------------------------------------------------------------------------
// findRelatedDocs — co-located story artifacts
// ---------------------------------------------------------------------------
function makeStoryDir(files) {
  const fs = require("fs"), os = require("os"), path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "related-docs-"));
  const storyDir = path.join(dir, "story.2.4.demo");
  fs.mkdirSync(storyDir);
  files.forEach(f => fs.writeFileSync(path.join(storyDir, f), "x"));
  return path.join(storyDir, "story.2.4.demo.md");
}

test("findRelatedDocs — links durable artifacts and skips point-in-time ones", () => {
  const path = require("path");
  const card = makeStoryDir([
    "story.2.4.demo.md",
    "story.2.4.plan.demo.md",
    "story.2.4.review.1.demo.md",
    "story.2.4.qa.1.demo.md",
    "story.2.4.implementation.1.demo.md",
    "story.2.4.dod.1.demo.md",
    "story.2.4.validate.2026-05-13.md", // dated run — excluded
    "sprint-review-summary.md",         // point-in-time — excluded
    "story.2.4.gate.1.demo.yml",        // not markdown — excluded
  ]);
  const found = lib.findRelatedDocs(card);
  assert.deepEqual(found.map(d => d.label), [
    "Implementation plan", "Story review", "QA assessment",
    "Implementation report", "Definition of Done",
  ]);
  // the card itself is never listed as its own related doc
  assert.ok(!found.some(d => path.basename(d.file) === "story.2.4.demo.md"));
});

test("findRelatedDocs — qualifies repeated artifact types with their instance number", () => {
  const card = makeStoryDir([
    "story.2.4.demo.md",
    "story.2.4.review.1.demo.md",
    "story.2.4.review.2.demo.md",
    "story.2.4.qa.1.demo.md",
  ]);
  const labels = lib.findRelatedDocs(card).map(d => d.label);
  assert.deepEqual(labels, ["Story review 1", "Story review 2", "QA assessment"]);
});

test("findRelatedDocs — a story folder with no companions yields no links", () => {
  assert.deepEqual(lib.findRelatedDocs(makeStoryDir(["story.2.4.demo.md"])), []);
});

test("relatedDocInfo — unknown artifact types are not linked", () => {
  assert.equal(lib.relatedDocInfo("story.2.4.validate.2026-05-13.md"), null);
  assert.equal(lib.relatedDocInfo("sprint-review-summary.md"), null);
  assert.equal(lib.relatedDocInfo("story.2.4.plan.demo.md").label, "Implementation plan");
});
