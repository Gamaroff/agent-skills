"use strict";
/**
 * sync-jira-task tests — node:test (no external deps).
 * Run: node --test tests/
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const lib = require("../scripts/sync-jira-task.js");

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------
test("parseFrontmatter — basic key/value", () => {
  const src = `---
title: 'Task 1: Cache-lib Simplification'
priority: 'High'
category: 'refactoring'
---

# Body
`;
  const { frontmatter, body } = lib.parseFrontmatter(src);
  assert.equal(frontmatter.title, "Task 1: Cache-lib Simplification");
  assert.equal(frontmatter.priority, "High");
  assert.equal(frontmatter.category, "refactoring");
  assert.match(body, /^# Body/);
});

test("parseFrontmatter — body containing horizontal rule (---) is preserved verbatim", () => {
  const src = `---
title: 'X'
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
  assert.ok(body.includes("Section A"));
  assert.ok(body.includes("Section B with second hr"));
  assert.ok(
    body.match(/---/g).length >= 2,
    "expected 2+ horizontal rules in body",
  );
  assert.ok(body.includes("End."));
});

test("parseFrontmatter — YAML block array (multi-line dash list)", () => {
  const src = `---
title: 'X'
labels:
  - alpha
  - beta
---

body
`;
  const { frontmatter } = lib.parseFrontmatter(src);
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
// Previously asserted the changelog "must precede ## Section". That WAS the defect:
// inserting before the first `##` is how a Change Log ended up above the Epic Goal.
// Task.42's Breaking Change 2 replaces that fallback with a doc-type anchor, falling
// back to end-of-document. `upsertChangelog` passes no docType, so this takes the EOF path.
test("upsertChangelog — inserts at EOF when no changelog and no anchor exists", () => {
  const src = `# Title\n\nIntro.\n\n## Section\n\nbody\n`;
  const out = lib.upsertChangelog(
    src,
    lib.fmtEntry("Initial Jira task created"),
  );
  assert.ok(out.includes(lib.CL_START));
  assert.ok(out.includes(lib.CL_END));
  assert.ok(
    out.indexOf(lib.CL_START) > out.indexOf("## Section"),
    "changelog must NOT be inserted above the first body section",
  );
});

test("upsertChangelog — appends entry within existing markers", () => {
  const initial = lib.upsertChangelog(
    `# T\n\n## S\n\nbody\n`,
    lib.fmtEntry("Entry one"),
  );
  const out = lib.upsertChangelog(initial, lib.fmtEntry("Entry two"));
  assert.match(out, /Entry one/);
  assert.match(out, /Entry two/);
  assert.equal(out.match(new RegExp(lib.CL_START, "g")).length, 1);
  assert.equal(out.match(new RegExp(lib.CL_END, "g")).length, 1);
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
  assert.equal(
    out.match(/## Change Log/g).length,
    1,
    "only one Change Log heading allowed",
  );
  assert.match(out, /Manually written entry/);
  assert.match(out, /New auto entry/);
  assert.ok(out.includes(lib.CL_START));
  assert.ok(out.includes(lib.CL_END));
  assert.match(out, /## Other Section/);
});

test("upsertChangelog — idempotent format on repeated wrapping", () => {
  let out = `# T\n\nbody\n`;
  out = lib.upsertChangelog(out, lib.fmtEntry("a"));
  out = lib.upsertChangelog(out, lib.fmtEntry("b"));
  out = lib.upsertChangelog(out, lib.fmtEntry("c"));
  assert.equal(out.match(new RegExp(lib.CL_START, "g")).length, 1);
  assert.equal(out.match(new RegExp(lib.CL_END, "g")).length, 1);
});

// ---------------------------------------------------------------------------
// diffFields + hash
// ---------------------------------------------------------------------------
test("diffFields — identical inputs produce no changes", () => {
  const prev = { summary: "S", priority: "High", labels: ["a", "b"] };
  const next = { summary: "S", priority: "High", labels: ["a", "b"] };
  const changed = lib.diffFields({
    prev,
    next,
    prevDescHash: "abc",
    newDescHash: "abc",
  });
  assert.deepEqual(changed, []);
});

test("diffFields — detects each field independently", () => {
  const prev = { summary: "S", priority: "High", labels: ["a"] };
  assert.deepEqual(
    lib.diffFields({
      prev,
      next: { summary: "T", priority: "High", labels: ["a"] },
      prevDescHash: "x",
      newDescHash: "x",
    }),
    ["summary"],
  );
  assert.deepEqual(
    lib.diffFields({
      prev,
      next: { summary: "S", priority: "Low", labels: ["a"] },
      prevDescHash: "x",
      newDescHash: "x",
    }),
    ["priority"],
  );
  assert.deepEqual(
    lib.diffFields({
      prev,
      next: { summary: "S", priority: "High", labels: ["b"] },
      prevDescHash: "x",
      newDescHash: "x",
    }),
    ["labels"],
  );
  assert.deepEqual(
    lib.diffFields({
      prev,
      next: { summary: "S", priority: "High", labels: ["a"] },
      prevDescHash: "x",
      newDescHash: "y",
    }),
    ["description"],
  );
});

test("diffFields — label order does not matter", () => {
  const prev = { summary: "S", priority: "", labels: ["b", "a"] };
  const next = { summary: "S", priority: "", labels: ["a", "b"] };
  assert.deepEqual(
    lib.diffFields({ prev, next, prevDescHash: "h", newDescHash: "h" }),
    [],
  );
});

test("hashDescriptionInput — stable for identical input, differs on body change", () => {
  const args = {
    body: "## Overview\n\nDo a thing.\n",
    frontmatter: {},
    taskBbUrl: null,
  };
  const h1 = lib.hashDescriptionInput(args);
  const h2 = lib.hashDescriptionInput(args);
  assert.equal(h1, h2);
  const h3 = lib.hashDescriptionInput({
    ...args,
    body: "## Overview\n\nDo a different thing.\n",
  });
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
  const origWarn = console.warn;
  let warned = false;
  console.warn = () => {
    warned = true;
  };
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
  assert.doesNotThrow(() =>
    lib.guardConcurrentEdit({
      jiraUpdated: "2026-04-28T10:00:00.000Z",
      lastSyncedAt: "2026-04-28T10:00:00.000Z",
      force: false,
    }),
  );
});

test("guardConcurrentEdit — throws when Jira advanced past last sync", () => {
  assert.throws(
    () =>
      lib.guardConcurrentEdit({
        jiraUpdated: "2026-04-28T11:00:00.000Z",
        lastSyncedAt: "2026-04-28T10:00:00.000Z",
        force: false,
      }),
    /updated since last local sync/,
  );
});

test("guardConcurrentEdit — --force overrides the abort", () => {
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    assert.doesNotThrow(() =>
      lib.guardConcurrentEdit({
        jiraUpdated: "2026-04-28T11:00:00.000Z",
        lastSyncedAt: "2026-04-28T10:00:00.000Z",
        force: true,
      }),
    );
  } finally {
    console.warn = origWarn;
  }
});

test("guardConcurrentEdit — no last sync (first run) skips guard", () => {
  assert.doesNotThrow(() =>
    lib.guardConcurrentEdit({
      jiraUpdated: "2026-04-28T11:00:00.000Z",
      lastSyncedAt: undefined,
      force: false,
    }),
  );
});

// ---------------------------------------------------------------------------
// buildDescriptionAdf — structural assertions
// ---------------------------------------------------------------------------
const headingsOf = (doc) =>
  doc.content.filter((n) => n.type === "heading").map((n) => n.content[0].text);

test("buildDescriptionAdf — produces a valid ADF doc with summary, metadata and links", () => {
  const doc = lib.buildDescriptionAdf({
    body: `## Overview

Refactor cache layer.

## Success Criteria

- Cache hit rate above 90%.
`,
    frontmatter: {
      category: "refactoring",
      estimated_effort_hours: "24",
      status: "📋 Planned",
    },
    taskBbUrl: "https://bitbucket.org/org/repo/src/HEAD/task.md",
  });
  assert.equal(doc.type, "doc");
  assert.equal(doc.version, 1);
  assert.deepEqual(headingsOf(doc), ["Summary", "Success Criteria", "Metadata", "Source Documents"]);
  // Links come LAST and the task file leads them.
  const bullet = doc.content.filter((n) => n.type === "bulletList").at(-1);
  assert.ok(bullet, "source-doc bullet list present");
  const linkText = bullet.content[0].content[0].content[0];
  assert.equal(linkText.marks[0].type, "link");
  assert.equal(linkText.text, "Task document");
  assert.match(linkText.marks[0].attrs.href, /bitbucket\.org/);
});

// The card is a POINTER. Republishing the document's changelog onto it added
// length on every sync and duplicated what Jira's own issue history already holds.
test("buildDescriptionAdf — never publishes the document's Change Log", () => {
  const doc = lib.buildDescriptionAdf({
    body: "## Overview\n\nRefactor cache layer.\n\n## Change Log\n\n| 2026-04-28 | created |\n",
    frontmatter: {},
    taskBbUrl: null,
  });
  assert.ok(!headingsOf(doc).includes("Change Log"));
  assert.ok(!doc.content.some((n) => n.type === "table"), "no changelog table on the card");
});

test("buildDescriptionAdf — publishes only the card sections, not the whole document", () => {
  // This list was ELEVEN sections — effectively the entire task document,
  // republished verbatim onto the card. The card is a pointer now: Summary,
  // Success Criteria, and Breaking Changes when it exists. Everything else is
  // one click away in the linked file.
  const body = `## Overview

Top-level summary.

## Motivation

Why we need this.

## Implementation Plan

- [ ] Phase 1
- [ ] Phase 2

## Success Criteria

- [ ] Criterion one

## Risk Assessment

High risk: thing.

## Rollback Plan

Revert commit.
`;
  const doc = lib.buildDescriptionAdf({ body, frontmatter: {}, taskBbUrl: null });
  assert.deepEqual(headingsOf(doc), ["Summary", "Success Criteria"]);
});

// Breaking Changes is the one detail kept beyond the summary: a board reader
// must not have to open a file to discover it. Absent from most tasks, so it
// must not leave an empty heading behind — nor warn on every sync.
test("buildDescriptionAdf — Breaking Changes appears only when present, and never warns", () => {
  const warnings = [];
  const withBc = lib.buildDescriptionAdf({
    body: "## Overview\n\nSummary.\n\n## Breaking Changes\n\n- API v1 removed\n",
    frontmatter: {}, taskBbUrl: null,
    output: { warn: (m) => warnings.push(String(m)) },
  });
  assert.deepEqual(headingsOf(withBc), ["Summary", "Breaking Changes"]);

  const without = lib.buildDescriptionAdf({
    body: "## Overview\n\nSummary.\n",
    frontmatter: {}, taskBbUrl: null,
    output: { warn: (m) => warnings.push(String(m)) },
  });
  assert.deepEqual(headingsOf(without), ["Summary"]);
  assert.deepEqual(
    warnings.filter((w) => /Breaking Changes/.test(w)),
    [],
    "an optional section must not warn — that trains operators to ignore the warning that matters",
  );
});

test("buildDescriptionAdf — does not render User Story / Acceptance Criteria (story-only sections)", () => {
  const body = `## User Story

As a user.

## Acceptance Criteria

- AC1
`;
  const doc = lib.buildDescriptionAdf({
    body,
    frontmatter: {},
    taskBbUrl: null,
  });
  const headings = doc.content
    .filter((n) => n.type === "heading")
    .map((n) => n.content[0].text);
  assert.ok(
    !headings.includes("User Story"),
    "story-only sections must be absent",
  );
  assert.ok(
    !headings.includes("Acceptance Criteria"),
    "story-only sections must be absent",
  );
});

test("buildDescriptionAdf — omits sections with no body match", () => {
  const doc = lib.buildDescriptionAdf({
    body: "# Just a title\n\nNothing else.\n",
    frontmatter: {},
    taskBbUrl: null,
  });
  assert.equal(doc.content.length, 0);
});

test("buildDescriptionAdf — an empty body warns when given an output handle", () => {
  // This assertion exists because its absence let a real defect ship. The case
  // above asserts the empty document and stops there, so a card whose heading
  // style did not match TASK_SECTIONS synced "successfully", reported nothing,
  // and published a Jira description with no body at all. Silence was the bug.
  const warnings = [];
  const doc = lib.buildDescriptionAdf({
    body: "# Just a title\n\nNothing else.\n",
    frontmatter: {},
    taskBbUrl: null,
    output: { warn: (m) => warnings.push(String(m)) },
  });

  assert.equal(doc.content.length, 0);
  assert.equal(
    warnings.length,
    1,
    "an all-missing extraction must say so exactly once",
  );
  assert.match(warnings[0], /no body/i);
});

test("buildDescriptionAdf — numbered headings render the same as unnumbered", () => {
  // create-task's template emits `## 1. Overview`; sync-jira-task's section list
  // is unnumbered. These must agree, or every card created the intended way
  // publishes an empty description.
  const headings = (doc) =>
    doc.content
      .filter((n) => n.type === "heading")
      .map((n) => n.content[0].text);

  const numbered = lib.buildDescriptionAdf({
    body: "## 1. Overview\n\nalpha\n\n## 9. Success Criteria\n\n- beta\n",
    frontmatter: {},
    taskBbUrl: null,
  });

  assert.deepEqual(headings(numbered), ["Summary", "Success Criteria"]);
  assert.deepEqual(
    numbered,
    lib.buildDescriptionAdf({
      body: "## Overview\n\nalpha\n\n## Success Criteria\n\n- beta\n",
      frontmatter: {},
      taskBbUrl: null,
    }),
    "numbering must not change the rendered ADF — otherwise it churns the body hash",
  );
});

test("TASK_CARD_SECTIONS — exposes the three card sections, not the whole document", () => {
  assert.ok(Array.isArray(lib.TASK_CARD_SECTIONS));
  assert.deepEqual(
    lib.TASK_CARD_SECTIONS.map((s) => s.heading),
    ["Summary", "Success Criteria", "Breaking Changes"],
  );
  assert.deepEqual(lib.TASK_CARD_SECTIONS[0].names, ["Overview"]);
});

// ---------------------------------------------------------------------------
// parseJiraError
// ---------------------------------------------------------------------------
test("parseJiraError — extracts errorMessages and field errors", async () => {
  const fake = {
    text: async () =>
      JSON.stringify({
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
  const out = lib.rewriteFrontmatter(src, (fm) => fm + '\nadded: "yes"');
  assert.match(out, /added: "yes"/);
  assert.match(out, /After rule\./);
  assert.match(out, /---\n\nAfter rule/, "body horizontal rule preserved");
});

// ---------------------------------------------------------------------------
// New tests — recommendations #2-#20
// ---------------------------------------------------------------------------

const lib_inner = require("../references/jira-sync.js");

// #9 — strict isEntryRow regex
test("isEntryRow — accepts only `| YYYY-MM-DD HH:MM |` rows", () => {
  assert.ok(lib.isEntryRow("| 2026-04-28 09:40 | Initial Jira task created |"));
  assert.ok(!lib.isEntryRow("| Foo | Bar |"), "rejects body table row");
  assert.ok(!lib.isEntryRow("| Date (UTC) | Change |"), "rejects header");
  assert.ok(!lib.isEntryRow("|------------|--------|"), "rejects separator");
  assert.ok(!lib.isEntryRow("| 28/04/2026 | bad date |"));
});

test("extractEntries — ignores body markdown tables outside changelog block", () => {
  const src = `# Title

## Some Section

| Foo | Bar |
|-----|-----|
| a   | b   |

${lib.CL_START}
## Change Log

| Date (UTC) | Change |
|------------|--------|
| 2026-04-28 09:40 | Initial Jira task created |
${lib.CL_END}
`;
  const entries = lib.extractEntries(src);
  assert.equal(entries.length, 1);
  assert.match(entries[0], /Initial Jira task created/);
});

// #10 — bullet/ordered list ADF
test("blockToAdf — converts bullet list block to ADF bulletList", () => {
  const nodes = lib_inner.blockToAdf("- one\n- two\n- three");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, "bulletList");
  assert.equal(nodes[0].content.length, 3);
  assert.equal(nodes[0].content[0].content[0].content[0].text, "one");
});

test("blockToAdf — converts ordered list block to ADF orderedList", () => {
  const nodes = lib_inner.blockToAdf("1. first\n2. second");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, "orderedList");
  assert.equal(nodes[0].content.length, 2);
});

test("blockToAdf — non-list paragraph uses hardBreaks", () => {
  const nodes = lib_inner.blockToAdf("line one\nline two");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, "paragraph");
  assert.ok(nodes[0].content.some((n) => n.type === "hardBreak"));
});

test("textToAdfNodes — mixes paragraphs and bullet lists across blocks", () => {
  const nodes = lib_inner.textToAdfNodes(
    "Intro paragraph.\n\n- a\n- b\n\nMore prose.",
  );
  const types = nodes.map((n) => n.type);
  assert.deepEqual(types, ["paragraph", "bulletList", "paragraph"]);
});

// #13 — in-place frontmatter update
test("upsertFrontmatterKeys — updates existing key in place, no reorder", () => {
  const src = `---
title: 'X'
priority: 'High'
status: 'Planned'
---

body
`;
  const out = lib.upsertFrontmatterKeys(src, { priority: "Low" });
  const lines = out.split("\n");
  assert.equal(lines[1], "title: 'X'", "title unchanged");
  assert.equal(lines[2], `priority: "Low"`, "priority updated in place");
  assert.equal(lines[3], "status: 'Planned'", "status unchanged");
});

test("upsertFrontmatterKeys — appends keys not present", () => {
  const src = `---
title: 'X'
---

body
`;
  const out = lib.upsertFrontmatterKeys(src, {
    jira_key: "PROJ-47",
    jira_url: "https://x/PROJ-47",
  });
  assert.match(out, /jira_key: "PROJ-47"/);
  assert.match(out, /jira_url: "https:\/\/x\/PROJ-47"/);
});

test("upsertFrontmatterKeys — null/undefined value removes existing key", () => {
  const src = `---
title: 'X'
old_key: 'gone'
---

body
`;
  const out = lib.upsertFrontmatterKeys(src, { old_key: null });
  assert.ok(!out.includes("old_key"));
});

// #5 — body/meta hash split
test("diffFields — separate body/meta hashes detect description vs metadata change", () => {
  const prev = { summary: "S", priority: "High", labels: [] };
  const next = { summary: "S", priority: "High", labels: [] };
  // body unchanged, meta changed → "metadata"
  assert.deepEqual(
    lib.diffFields({
      prev,
      next,
      prevBodyHash: "a",
      newBodyHash: "a",
      prevMetaHash: "x",
      newMetaHash: "y",
    }),
    ["metadata"],
  );
  // body changed → "description" (metadata not double-reported)
  assert.deepEqual(
    lib.diffFields({
      prev,
      next,
      prevBodyHash: "a",
      newBodyHash: "b",
      prevMetaHash: "x",
      newMetaHash: "y",
    }),
    ["description"],
  );
});

// task script unit tests
const task = require("../scripts/sync-jira-task.js");

test("mapStatus — strips emoji and maps to Jira canonical status", () => {
  assert.equal(task.mapStatus("📋 Planned"), "To Do");
  assert.equal(task.mapStatus("🚧 In Progress"), "In Progress");
  assert.equal(task.mapStatus("✅ Done"), "Done");
  assert.equal(task.mapStatus("Blocked"), "Blocked");
  assert.equal(task.mapStatus(""), null);
  assert.equal(task.mapStatus(null), null);
});

test("mapStatus — covers the full canonical lifecycle (no passthrough)", () => {
  assert.equal(task.mapStatus("draft"), "To Do");
  assert.equal(task.mapStatus("ready-for-development"), "To Do");
  assert.equal(task.mapStatus("ready-for-review"), "In Review");
  assert.equal(task.mapStatus("accepted"), "Done");
  assert.equal(task.mapStatus("cancelled"), "Cancelled");
});

test("mapStatus — honours a project-supplied status map", () => {
  const custom = { "ready-for-development": "Selected for Development" };
  assert.equal(
    task.mapStatus("ready-for-development", custom),
    "Selected for Development",
  );
});

test("loadStatusMap — merges jira.statusMap over defaults", () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statusmap-task-"));
  fs.writeFileSync(
    path.join(dir, "skills-config.yaml"),
    "jira:\n  statusMap:\n    accepted: Shipped\n",
  );
  const map = task.loadStatusMap(dir);
  assert.equal(map["accepted"], "Shipped");
  assert.equal(map["in-progress"][0], "In Progress");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("syncLabelFor — derives stable label from task dir name", () => {
  const label = task.syncLabelFor(
    "/repo/docs/tasks/task.1.cache-lib/task.1.cache-lib.md",
  );
  assert.equal(label, "synced-from-task.1.cache-lib");
});

test("hashBody — stable across runs, differs on body change", () => {
  const a = task.hashBody({
    body: "## Overview\n\nThing.\n",
    taskBbUrl: "https://bb/x",
  });
  const b = task.hashBody({
    body: "## Overview\n\nThing.\n",
    taskBbUrl: "https://bb/x",
  });
  const c = task.hashBody({
    body: "## Overview\n\nDifferent.\n",
    taskBbUrl: "https://bb/x",
  });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("hashMeta — depends only on category/effort/status frontmatter fields", () => {
  const m1 = task.hashMeta({
    category: "refactor",
    estimated_effort_hours: 8,
    status: "Planned",
  });
  const m2 = task.hashMeta({
    category: "refactor",
    estimated_effort_hours: 8,
    status: "Planned",
    title: "X",
  });
  const m3 = task.hashMeta({
    category: "refactor",
    estimated_effort_hours: 8,
    status: "Done",
  });
  assert.equal(m1, m2, "title change should not affect meta hash");
  assert.notEqual(m1, m3, "status change must change meta hash");
});

// #14 — retry on 5xx
test("makeHttp — retries on 500 then succeeds", async () => {
  let n = 0;
  const fakeFetch = async () => {
    n++;
    if (n < 3) return { status: 500, ok: false, text: async () => "boom" };
    return { status: 200, ok: true, json: async () => ({ ok: 1 }) };
  };
  const http = lib_inner.makeHttp({
    fetchImpl: fakeFetch,
    retries: 2,
    retryDelayMs: 1,
  });
  const r = await http("http://x");
  assert.equal(r.ok, true);
  assert.equal(n, 3, "should have retried twice");
});

test("makeHttp — does not retry on 4xx", async () => {
  let n = 0;
  const fakeFetch = async () => {
    n++;
    return { status: 404, ok: false, text: async () => "nope" };
  };
  const http = lib_inner.makeHttp({
    fetchImpl: fakeFetch,
    retries: 3,
    retryDelayMs: 1,
  });
  const r = await http("http://x");
  assert.equal(r.status, 404);
  assert.equal(n, 1, "no retry on 4xx");
});

// #2 — status transitions
test("transitionToStatus — finds matching transition by to.name", async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, method: opts?.method || "GET" });
    if (
      url.includes("/transitions") &&
      (!opts || !opts.method || opts.method === "GET")
    ) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          transitions: [
            { id: "11", name: "Start", to: { name: "In Progress" } },
            { id: "21", name: "Resolve", to: { name: "Done" } },
          ],
        }),
      };
    }
    return {
      ok: true,
      status: 204,
      json: async () => ({}),
      text: async () => "",
    };
  };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const out = await lib_inner.transitionToStatus({
    http,
    baseUrl: "https://j",
    email: "e",
    token: "t",
    issueKey: "PROJ-1",
    targetStatus: "In Progress",
    currentStatus: "To Do",
  });
  assert.equal(out.transitioned, true);
  assert.equal(calls.filter((c) => c.method === "POST").length, 1);
});

test("transitionToStatus — no-op when target equals current", async () => {
  const fakeFetch = async () => {
    throw new Error("should not call fetch");
  };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const out = await lib_inner.transitionToStatus({
    http,
    baseUrl: "https://j",
    email: "e",
    token: "t",
    issueKey: "PROJ-1",
    targetStatus: "Done",
    currentStatus: "Done",
  });
  assert.equal(out.transitioned, false);
  assert.equal(out.reason, "already");
});

// #11 — board type
test("getBoardType — returns scrum/kanban", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ type: "kanban" }),
  });
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const t = await lib_inner.getBoardType({
    http,
    baseUrl: "https://j",
    email: "e",
    token: "t",
    boardId: "1",
  });
  assert.equal(t, "kanban");
});

test("moveToBacklog — skips on Kanban board", async () => {
  let postCalled = false;
  const fakeFetch = async (url, opts) => {
    if (opts?.method === "POST") {
      postCalled = true;
    }
    if (url.includes("/configuration"))
      return { ok: true, status: 200, json: async () => ({ type: "kanban" }) };
    return { ok: true, status: 204, text: async () => "" };
  };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const r = await lib_inner.moveToBacklog({
    http,
    baseUrl: "https://j",
    email: "e",
    token: "t",
    boardId: "1",
    issueKey: "PROJ-1",
    output: lib_inner.makeOutput({ quiet: true }),
  });
  assert.equal(r.moved, false);
  assert.equal(postCalled, false, "no POST on Kanban");
});

// #16 — live priority resolution
test("resolveLivePriorities — builds map keyed by lower-cased name", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => [
      { name: "Highest" },
      { name: "High" },
      { name: "Medium" },
      { name: "Low" },
      { name: "Lowest" },
    ],
  });
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const map = await lib_inner.resolveLivePriorities({
    http,
    baseUrl: "https://j",
    email: "e",
    token: "t",
  });
  assert.equal(map.high, "High");
  assert.equal(map.lowest, "Lowest");
});

test("normalisePriority — uses live priorities when available", () => {
  const live = { urgent: "Urgent", high: "High", highest: "Urgent" };
  assert.equal(
    lib.normalisePriority("urgent", live),
    "Urgent",
    "direct live match",
  );
  assert.equal(lib.normalisePriority("high", live), "High", "lower-case match");
  assert.equal(
    lib.normalisePriority("blocker", live),
    "Urgent",
    "synonym blocker→Highest→live[highest]=Urgent",
  );
});

// #8 — idempotent create via label search
test("findExistingByLabel — returns key when issue with label exists", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("/search"))
      return {
        ok: true,
        status: 200,
        json: async () => ({
          issues: [
            { key: "PROJ-99", fields: { updated: "2026-04-28T10:00:00.000Z" } },
          ],
        }),
      };
    return { ok: false, status: 404, text: async () => "" };
  };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const r = await lib_inner.findExistingByLabel({
    http,
    baseUrl: "https://j",
    email: "e",
    token: "t",
    projectKey: "RB",
    label: "synced-from-task.1.x",
  });
  assert.equal(r.key, "PROJ-99");
});

// #3 — atomic PUT with returnIssue
test("putIssueAtomic — parses fields.updated from response body", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ fields: { updated: "2026-04-28T11:00:00.000Z" } }),
  });
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const r = await lib_inner.putIssueAtomic({
    http,
    baseUrl: "https://j",
    email: "e",
    token: "t",
    issueKey: "PROJ-1",
    fields: { summary: "X" },
  });
  assert.equal(r.updated, "2026-04-28T11:00:00.000Z");
});

// #4 — fail-loud timestamp fetch
test("fetchUpdatedTimestampStrict — throws on missing fields.updated", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ fields: {} }),
  });
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  await assert.rejects(
    lib_inner.fetchUpdatedTimestampStrict({
      http,
      baseUrl: "https://j",
      email: "e",
      token: "t",
      issueKey: "PROJ-1",
    }),
    /missing fields\.updated/,
  );
});

// #12 — issue type cache
test("getIssueTypeId — caches type id and avoids second network call", async () => {
  const tmpRoot = require("fs").mkdtempSync(
    require("os").tmpdir() + "/jira-cache-",
  );
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    return {
      ok: true,
      status: 200,
      json: async () => ({ issueTypes: [{ id: "10001", name: "Task" }] }),
    };
  };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const id1 = await lib_inner.getIssueTypeId({
    http,
    baseUrl: "https://j",
    email: "e",
    token: "t",
    projectKey: "RB",
    typeName: "Task",
    repoRoot: tmpRoot,
  });
  const id2 = await lib_inner.getIssueTypeId({
    http,
    baseUrl: "https://j",
    email: "e",
    token: "t",
    projectKey: "RB",
    typeName: "Task",
    repoRoot: tmpRoot,
  });
  assert.equal(id1, "10001");
  assert.equal(id2, "10001");
  assert.equal(calls, 1, "second call served from cache");
});

// ---------------------------------------------------------------------------
// stripRemotePrefix — pure parse step behind getCurrentBranchUpstream()
// ---------------------------------------------------------------------------
test("stripRemotePrefix — strips remote name, preserves slashes in branch", () => {
  assert.equal(lib.stripRemotePrefix("origin/main"), "main");
  assert.equal(
    lib.stripRemotePrefix("origin/feature/story.5.1.foo"),
    "feature/story.5.1.foo",
  );
  assert.equal(lib.stripRemotePrefix("upstream/release/1.2"), "release/1.2");
});

test("stripRemotePrefix — empty or shape-less ref returns null", () => {
  assert.equal(lib.stripRemotePrefix(""), null);
  assert.equal(lib.stripRemotePrefix("weirdnoref"), null);
});

test("parseArgs — --doc-branch overrides the resolved branch", () => {
  const opts = lib.parseArgs([
    "node",
    "script",
    "--file",
    "x.md",
    "--doc-branch",
    "develop",
  ]);
  assert.equal(opts.docBranch, "develop");
});

test("parseArgs — --doc-branch absent defaults to null", () => {
  const opts = lib.parseArgs(["node", "script", "--file", "x.md"]);
  assert.equal(opts.docBranch, null);
});

// ---------------------------------------------------------------------------
// normaliseTaskSummary — canonical "[Task N] {title}" bracket form
// ---------------------------------------------------------------------------
test("normaliseTaskSummary — already-bracketed is unchanged (idempotent)", () => {
  assert.equal(lib.normaliseTaskSummary("[Task 5] Foo", "9"), "[Task 5] Foo");
});

test("normaliseTaskSummary — colon-prefixed is rewrapped in brackets", () => {
  assert.equal(lib.normaliseTaskSummary("Task 5: Foo", "9"), "[Task 5] Foo");
});

test("normaliseTaskSummary — bare title resolves id from the filename fallback", () => {
  assert.equal(lib.normaliseTaskSummary("Foo", "5"), "[Task 5] Foo");
});

test("normaliseTaskSummary — no id resolvable leaves the summary unchanged", () => {
  assert.equal(lib.normaliseTaskSummary("Foo", undefined), "Foo");
  assert.equal(lib.normaliseTaskSummary("Foo", null), "Foo");
});

// ---------------------------------------------------------------------------
// parseJiraScalar / loadDevEstimateField — Jira custom field id config
// ---------------------------------------------------------------------------
test("parseJiraScalar — reads a scalar key under jira:, ignores statusMap children", () => {
  assert.equal(
    lib.parseJiraScalar(
      "jira:\n  devEstimateField: customfield_10594\n",
      "devEstimateField",
    ),
    "customfield_10594",
  );
  const cfg =
    "jira:\n  statusMap:\n    devEstimateField: NotThis\n  devEstimateField: customfield_42\n";
  assert.equal(lib.parseJiraScalar(cfg, "devEstimateField"), "customfield_42");
  assert.equal(
    lib.parseJiraScalar(
      "jira:\n  statusMap:\n    accepted: Done\n",
      "devEstimateField",
    ),
    "",
  );
});

test("parseJiraScalar — strips a trailing inline comment, preserves in-value '#'", () => {
  assert.equal(
    lib.parseJiraScalar(
      "jira:\n  devEstimateField: customfield_10594  # optional — Jira field id\n",
      "devEstimateField",
    ),
    "customfield_10594",
  );
  assert.equal(
    lib.parseJiraScalar(
      'jira:\n  devEstimateField: "customfield_10594"  # c\n',
      "devEstimateField",
    ),
    "customfield_10594",
  );
  assert.equal(
    lib.parseJiraScalar(
      "jira:\n  devEstimateField: abc#def\n",
      "devEstimateField",
    ),
    "abc#def",
  );
});

test("loadStatusMap — tolerates inline comments on the statusMap opener and value lines", () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statusmap-task-comment-"));
  fs.writeFileSync(
    path.join(dir, "skills-config.yaml"),
    "jira:\n  statusMap:                          # local document status -> Jira status\n    accepted: Shipped  # done column\n",
  );
  const map = task.loadStatusMap(dir);
  assert.equal(map["accepted"], "Shipped");
  assert.equal(map["in-progress"][0], "In Progress");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("loadDevEstimateField — reads jira.devEstimateField, '' when absent", () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devest-task-"));
  assert.equal(lib.loadDevEstimateField(dir), "");
  fs.writeFileSync(
    path.join(dir, "skills-config.yaml"),
    "jira:\n  devEstimateField: customfield_10594\n",
  );
  assert.equal(lib.loadDevEstimateField(dir), "customfield_10594");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("collectIssueFields — writes dev-estimate custom field when configured (numeric only)", () => {
  const modPath = require.resolve("../scripts/sync-jira-task.js");
  const prev = process.env.JIRA_DEV_ESTIMATE_FIELD;
  process.env.JIRA_DEV_ESTIMATE_FIELD = "customfield_10594";
  delete require.cache[modPath];
  const freshLib = require(modPath);
  try {
    const numeric = freshLib.collectIssueFields({
      summary: "T",
      args: {},
      frontmatter: { title: "T", estimated_effort_hours: 24 },
      descAdf: { type: "doc", content: [] },
      taskTypeId: null,
      projectKey: null,
      livePriorities: null,
      output: { warn() {}, info() {} },
      syncLabel: "synced-from-task.5",
    });
    assert.equal(numeric.customfield_10594, 24);
    assert.deepEqual(numeric.timetracking, {
      originalEstimate: "24h",
      remainingEstimate: "24h",
    });

    const nonNumeric = freshLib.collectIssueFields({
      summary: "T",
      args: {},
      frontmatter: { title: "T", estimated_effort_hours: "~1 day" },
      descAdf: { type: "doc", content: [] },
      taskTypeId: null,
      projectKey: null,
      livePriorities: null,
      output: { warn() {}, info() {} },
      syncLabel: "synced-from-task.5",
    });
    assert.equal(nonNumeric.customfield_10594, undefined);
  } finally {
    if (prev === undefined) delete process.env.JIRA_DEV_ESTIMATE_FIELD;
    else process.env.JIRA_DEV_ESTIMATE_FIELD = prev;
    delete require.cache[modPath];
  }
});

test("collectIssueFields — omits dev-estimate custom field when unconfigured", () => {
  const fields = lib.collectIssueFields({
    summary: "T",
    args: {},
    frontmatter: { title: "T", estimated_effort_hours: 24 },
    descAdf: { type: "doc", content: [] },
    taskTypeId: null,
    projectKey: null,
    livePriorities: null,
    output: { warn() {}, info() {} },
    syncLabel: "synced-from-task.5",
  });
  assert.equal(fields.customfield_10594, undefined);
  assert.deepEqual(fields.timetracking, {
    originalEstimate: "24h",
    remainingEstimate: "24h",
  });
});

// ---------------------------------------------------------------------------
// resolveRelativeLink / makeRelativeLinkResolver — relative doc links must
// become absolute Bitbucket URLs, since Jira has no "relative to this file"
// base path once the markdown is copied into a description.
// ---------------------------------------------------------------------------
test("resolveRelativeLink — rewrites an existing sibling-file link to an absolute Bitbucket URL", () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relative-link-"));
  const filePath = path.join(dir, "task.9.card.md");
  const siblingPath = path.join(dir, "task.9.runbook.md");
  fs.writeFileSync(filePath, "# card\n");
  fs.writeFileSync(siblingPath, "# runbook\n");

  const href = lib.resolveRelativeLink("task.9.runbook.md", {
    filePath,
    repoRoot: dir,
    bbBase: "https://bitbucket.org/org/repo",
    branch: "develop",
  });
  assert.equal(
    href,
    "https://bitbucket.org/org/repo/src/develop/task.9.runbook.md",
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test("resolveRelativeLink — preserves a #fragment after resolving the path part", () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relative-link-frag-"));
  const filePath = path.join(dir, "task.4.card.md");
  const siblingPath = path.join(dir, "task.4.runbook.md");
  fs.writeFileSync(filePath, "# card\n");
  fs.writeFileSync(siblingPath, "# runbook\n");

  const href = lib.resolveRelativeLink("task.4.runbook.md#step-0", {
    filePath,
    repoRoot: dir,
    bbBase: "https://bitbucket.org/org/repo",
    branch: "HEAD",
  });
  assert.equal(
    href,
    "https://bitbucket.org/org/repo/src/HEAD/task.4.runbook.md#step-0",
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test("resolveRelativeLink — leaves absolute URLs, mailto:, and in-page anchors unchanged", () => {
  const ctx = {
    filePath: "/repo/docs/task.md",
    repoRoot: "/repo",
    bbBase: "https://bitbucket.org/org/repo",
    branch: "HEAD",
  };
  assert.equal(
    lib.resolveRelativeLink(
      "https://mediastreamag.atlassian.net/browse/RAPP-540",
      ctx,
    ),
    "https://mediastreamag.atlassian.net/browse/RAPP-540",
  );
  assert.equal(
    lib.resolveRelativeLink("mailto:someone@example.com", ctx),
    "mailto:someone@example.com",
  );
  assert.equal(
    lib.resolveRelativeLink("#success-criteria", ctx),
    "#success-criteria",
  );
});

test("resolveRelativeLink — a broken/typo'd relative link is left as-authored, not masked", () => {
  const ctx = {
    filePath: "/repo/docs/task.md",
    repoRoot: "/repo",
    bbBase: "https://bitbucket.org/org/repo",
    branch: "HEAD",
  };
  assert.equal(
    lib.resolveRelativeLink("task.4.runbok.md", ctx),
    "task.4.runbok.md",
  );
});

test("resolveRelativeLink — no bbBase (Bitbucket base undetected) is a no-op", () => {
  const ctx = {
    filePath: "/repo/docs/task.md",
    repoRoot: "/repo",
    bbBase: null,
    branch: "HEAD",
  };
  assert.equal(
    lib.resolveRelativeLink("task.4.runbook.md", ctx),
    "task.4.runbook.md",
  );
});

test("makeRelativeLinkResolver — returns null when bbBase is unset (Bitbucket base undetected)", () => {
  assert.equal(
    lib.makeRelativeLinkResolver({
      filePath: "/repo/docs/task.md",
      repoRoot: "/repo",
      bbBase: null,
    }),
    null,
  );
});

// ---------------------------------------------------------------------------
// findRelatedDocs / labelForRelatedDoc — co-located sibling docs (runbooks,
// scan reports) are discovered structurally so a synced Jira issue always
// links them, without anyone remembering a frontmatter field.
// ---------------------------------------------------------------------------
test("findRelatedDocs — lists sibling .md files, excludes the task file itself and non-.md files", () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "related-docs-"));
  const filePath = path.join(dir, "task.4.containerize-framework-runtime.md");
  fs.writeFileSync(filePath, "# card\n");
  fs.writeFileSync(path.join(dir, "task.4.runbook.md"), "# runbook\n");
  fs.writeFileSync(
    path.join(dir, "task.4.trivy-scan-2026-07-14.md"),
    "# scan\n",
  );
  fs.writeFileSync(path.join(dir, "notes.txt"), "not markdown\n");

  const related = lib.findRelatedDocs(filePath).map((p) => path.basename(p));
  assert.deepEqual(related, [
    "task.4.runbook.md",
    "task.4.trivy-scan-2026-07-14.md",
  ]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("findRelatedDocs — a task with no siblings returns an empty list", () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "related-docs-empty-"));
  const filePath = path.join(dir, "task.13.card.md");
  fs.writeFileSync(filePath, "# card\n");

  assert.deepEqual(lib.findRelatedDocs(filePath), []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("labelForRelatedDoc — special-cases runbook filenames, backtick-quotes everything else", () => {
  assert.equal(
    lib.labelForRelatedDoc("task.13.runbook.md"),
    "Execution runbook on Bitbucket",
  );
  assert.equal(
    lib.labelForRelatedDoc("task.4.trivy-scan-2026-07-14.md"),
    "`task.4.trivy-scan-2026-07-14.md` on Bitbucket",
  );
});

// ---------------------------------------------------------------------------
// buildDescriptionAdf — Source Documents section now includes related docs
// and renders relative in-body links through the resolver.
// ---------------------------------------------------------------------------
test("buildDescriptionAdf — Source Documents lists the task file plus each related doc", () => {
  const doc = lib.buildDescriptionAdf({
    body: "## Overview\n\nSee runbook.\n",
    frontmatter: {},
    taskBbUrl: "https://bitbucket.org/org/repo/src/HEAD/task.13.card.md",
    relatedDocLinks: [
      {
        label: "Execution runbook on Bitbucket",
        href: "https://bitbucket.org/org/repo/src/HEAD/task.13.runbook.md",
      },
    ],
  });
  const bullet = doc.content.find((n) => n.type === "bulletList");
  assert.ok(bullet, "Source Documents bullet list present");
  assert.equal(bullet.content.length, 2, "task file + 1 related doc");
  const hrefs = bullet.content.map(
    (li) => li.content[0].content[0].marks[0].attrs.href,
  );
  assert.deepEqual(hrefs, [
    "https://bitbucket.org/org/repo/src/HEAD/task.13.card.md",
    "https://bitbucket.org/org/repo/src/HEAD/task.13.runbook.md",
  ]);
});

test("buildDescriptionAdf — with no taskBbUrl and no related docs, omits the Source Documents section", () => {
  const doc = lib.buildDescriptionAdf({
    body: "## Overview\n\nNothing to link.\n",
    frontmatter: {},
    taskBbUrl: null,
    relatedDocLinks: [],
  });
  const headings = doc.content
    .filter((n) => n.type === "heading")
    .map((n) => n.content[0].text);
  assert.ok(!headings.includes("Source Documents"));
});

test("buildDescriptionAdf — rewrites a relative in-body link via linkResolver", () => {
  const resolver = (href) =>
    href === "task.13.runbook.md"
      ? "https://bitbucket.org/org/repo/src/HEAD/task.13.runbook.md"
      : href;
  const doc = lib.buildDescriptionAdf({
    body: "## Overview\n\nSee the [runbook](task.13.runbook.md) for detail.\n",
    frontmatter: {},
    taskBbUrl: null,
    relatedDocLinks: [],
    linkResolver: resolver,
  });
  const overview = doc.content.find((n) => n.type === "paragraph");
  const linkNode = overview.content.find(
    (n) => n.marks && n.marks[0].type === "link",
  );
  assert.equal(
    linkNode.marks[0].attrs.href,
    "https://bitbucket.org/org/repo/src/HEAD/task.13.runbook.md",
  );
});

// ---------------------------------------------------------------------------
// Workflow-agnostic transition resolution
// ---------------------------------------------------------------------------
const TR = {
  start:      { id: "11",  name: "In Progress", to: { name: "In Progress", statusCategory: { key: "indeterminate" } } },
  implemented:{ id: "21",  name: "Implemented", to: { name: "Waiting for Review", statusCategory: { key: "indeterminate" } } },
  backToDev:  { id: "101", name: "Selected for Development", to: { name: "Selected for Development", statusCategory: { key: "new" } } },
  done:       { id: "161", name: "Done", to: { name: "Done", statusCategory: { key: "done" } } },
  readyTest:  { id: "341", name: "Ready for Testing", to: { name: "Ready for Testing", statusCategory: { key: "indeterminate" } } },
  cancelled:  { id: "171", name: "Cancel", to: { name: "Cancelled", statusCategory: { key: "done" } } },
};

test("resolveTransition — matches to.name, candidates in order", () => {
  const r = lib_inner.resolveTransition({
    transitions: [TR.start, TR.done],
    candidates: ["In Progress", "Doing"],
    currentStatus: "Selected for Development",
  });
  assert.equal(r.match.id, "11");
  assert.match(r.rule, /to\.name="In Progress"/);
});

test("resolveTransition — falls back to the transition NAME when no to.name matches", () => {
  // The real-world shape this was built for: the action is called "Implemented"
  // and the destination is "Waiting for Review". Matching only to.name misses it
  // unless "Waiting for Review" is itself a candidate.
  const r = lib_inner.resolveTransition({
    transitions: [TR.implemented, TR.backToDev],
    candidates: ["In Review", "Implemented"],
    currentStatus: "In Progress",
  });
  assert.equal(r.match.id, "21");
  assert.match(r.rule, /name="Implemented"/);
});

test("resolveTransition — to.name across ALL candidates beats a name match", () => {
  // "Implemented" (a name match, candidate #1) must lose to "Waiting for Review"
  // (a to.name match, candidate #2) — destinations are more reliable than actions.
  const r = lib_inner.resolveTransition({
    transitions: [TR.implemented],
    candidates: ["Implemented", "Waiting for Review"],
    currentStatus: "In Progress",
  });
  assert.match(r.rule, /to\.name="Waiting for Review"/);
});

test("resolveTransition — 'already' when the current status is any candidate", () => {
  const r = lib_inner.resolveTransition({
    transitions: [TR.start, TR.done],
    candidates: ["To Do", "Selected for Development"],
    currentStatus: "Selected for Development",
  });
  assert.equal(r.match, null);
  assert.equal(r.reason, "already");
});

test("resolveTransition — terminal status falls back to the unique done-category transition", () => {
  // "Cancelled" exists in no workflow here, but the local status is terminal and
  // exactly one transition leads to a done status.
  const r = lib_inner.resolveTransition({
    transitions: [TR.start, TR.done],
    candidates: ["Cancelled", "Rejected"],
    currentStatus: "In Progress",
    terminal: true,
  });
  assert.equal(r.match.id, "161");
  assert.match(r.rule, /statusCategory=done/);
});

test("resolveTransition — REGRESSION: never infers a non-terminal target from statusCategory", () => {
  // Guard for a bug caught by dry-running against a live board: allowing a
  // statusCategory fallback for "indeterminate" made `ready-for-review` resolve
  // to "In Progress" and `in-progress` resolve to "Waiting for Review". A wrong
  // transition is worse than none, so non-terminal statuses must skip instead.
  const r = lib_inner.resolveTransition({
    transitions: [TR.start],            // sole indeterminate transition
    candidates: ["In Review", "Code Review"],
    currentStatus: "Selected for Development",
    terminal: false,
  });
  assert.equal(r.match, null, "must not fall back to the lone In Progress transition");
  assert.equal(r.reason, "no-transition");
});

test("resolveTransition — ambiguous terminal is reported, not guessed", () => {
  const r = lib_inner.resolveTransition({
    transitions: [TR.done, TR.cancelled],
    candidates: ["Shipped"],
    currentStatus: "In Progress",
    terminal: true,
  });
  assert.equal(r.match, null);
  assert.equal(r.reason, "ambiguous-terminal");
});

// ---------------------------------------------------------------------------
// buildTransitionFields — satisfying required transition screens
// ---------------------------------------------------------------------------
const RESOLUTION_FIELD = {
  resolution: {
    required: true,
    allowedValues: [
      { id: "10000", name: "Done" },
      { id: "10001", name: "Won't Do" },
      { id: "10002", name: "Duplicate" },
    ],
  },
};

test("buildTransitionFields — no required fields leaves the payload untouched", () => {
  const out = lib_inner.buildTransitionFields({ id: "11", name: "Start" });
  assert.equal(out.fields, null);
  assert.deepEqual(out.unfillable, []);
});

test("buildTransitionFields — fills a required resolution from allowedValues", () => {
  const out = lib_inner.buildTransitionFields({ id: "161", fields: RESOLUTION_FIELD });
  assert.deepEqual(out.fields, { resolution: { id: "10000" } });
  assert.deepEqual(out.unfillable, []);
});

test("buildTransitionFields — a negative local status picks a negative resolution", () => {
  const out = lib_inner.buildTransitionFields({ id: "161", fields: RESOLUTION_FIELD }, { negative: true });
  assert.deepEqual(out.fields, { resolution: { id: "10001" } }); // Won't Do
});

test("buildTransitionFields — an explicit preference wins", () => {
  const out = lib_inner.buildTransitionFields(
    { id: "161", fields: RESOLUTION_FIELD }, { resolutionPref: "Duplicate" });
  assert.deepEqual(out.fields, { resolution: { id: "10002" } });
});

test("buildTransitionFields — unknown preference falls back to what the workflow offers", () => {
  const out = lib_inner.buildTransitionFields(
    { id: "161", fields: RESOLUTION_FIELD }, { resolutionPref: "Not A Real Resolution" });
  assert.deepEqual(out.fields, { resolution: { id: "10000" } });
});

test("buildTransitionFields — a required field it cannot fill is reported, not invented", () => {
  const out = lib_inner.buildTransitionFields({
    id: "161",
    fields: { ...RESOLUTION_FIELD, customfield_10050: { required: true, allowedValues: [] } },
  });
  assert.deepEqual(out.unfillable, ["customfield_10050"]);
});

// ---------------------------------------------------------------------------
// transitionToStatus — end-to-end payload behaviour
// ---------------------------------------------------------------------------
function transitionHarness(transitions, { postStatus = 204 } = {}) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, method: (opts && opts.method) || "GET", body: opts && opts.body });
    if (!opts || !opts.method || opts.method === "GET")
      return { ok: true, status: 200, json: async () => ({ transitions }) };
    return {
      ok: postStatus < 400, status: postStatus,
      json: async () => ({ errorMessages: ["Field 'resolution' is required"] }),
      text: async () => "",
    };
  };
  return { calls, http: lib_inner.makeHttp({ fetchImpl }) };
}

const BASE = { baseUrl: "https://j", email: "e", token: "t", issueKey: "PROJ-1" };

test("transitionToStatus — asks Jira for the transition field schema", async () => {
  const { calls, http } = transitionHarness([TR.start]);
  await lib_inner.transitionToStatus({ ...BASE, http, targetStatus: ["In Progress"], currentStatus: "To Do" });
  assert.match(calls[0].url, /expand=transitions\.fields/,
    "without the expand, required fields are invisible and the POST 400s blind");
});

test("transitionToStatus — sends a resolution when the transition requires one", async () => {
  const { calls, http } = transitionHarness([{ ...TR.done, fields: RESOLUTION_FIELD }]);
  const out = await lib_inner.transitionToStatus({
    ...BASE, http, targetStatus: ["Done"], currentStatus: "In Progress", localStatus: "accepted",
  });
  assert.equal(out.transitioned, true);
  const post = calls.find((c) => c.method === "POST");
  assert.deepEqual(JSON.parse(post.body), { transition: { id: "161" }, fields: { resolution: { id: "10000" } } });
});

test("transitionToStatus — omits `fields` entirely when nothing is required", async () => {
  // Boards without required fields must keep the exact payload they always had.
  const { calls, http } = transitionHarness([TR.start]);
  await lib_inner.transitionToStatus({
    ...BASE, http, targetStatus: ["In Progress"], currentStatus: "To Do", localStatus: "in-progress",
  });
  const post = calls.find((c) => c.method === "POST");
  assert.deepEqual(JSON.parse(post.body), { transition: { id: "11" } });
});

test("transitionToStatus — refuses to POST when a required field cannot be filled", async () => {
  const { calls, http } = transitionHarness([
    { ...TR.done, fields: { approver: { required: true, allowedValues: [] } } },
  ]);
  const out = await lib_inner.transitionToStatus({
    ...BASE, http, targetStatus: ["Done"], currentStatus: "In Progress", localStatus: "accepted",
  });
  assert.equal(out.transitioned, false);
  assert.equal(out.reason, "required-fields");
  assert.deepEqual(out.unfillable, ["approver"]);
  assert.equal(calls.filter((c) => c.method === "POST").length, 0, "must not fire a request known to fail");
});

test("transitionToStatus — makes no network call at all when already in a candidate status", async () => {
  const http = lib_inner.makeHttp({ fetchImpl: async () => { throw new Error("should not call fetch"); } });
  const out = await lib_inner.transitionToStatus({
    ...BASE, http, targetStatus: ["To Do", "Selected for Development"],
    currentStatus: "Selected for Development", localStatus: "planned",
  });
  assert.equal(out.transitioned, false);
  assert.equal(out.reason, "already");
});

test("transitionToStatus — a failed POST is reported, never thrown", async () => {
  const { http } = transitionHarness([{ ...TR.done, fields: RESOLUTION_FIELD }], { postStatus: 400 });
  const out = await lib_inner.transitionToStatus({
    ...BASE, http, targetStatus: ["Done"], currentStatus: "In Progress", localStatus: "accepted",
  });
  assert.equal(out.transitioned, false);
  assert.equal(out.reason, "http-400");
});

// ---------------------------------------------------------------------------
// summariseStatusOutcome — the sync must not report success on a silent skip
// ---------------------------------------------------------------------------
test("summariseStatusOutcome — a skip warns and, under --fail-on-status-skip, exits non-zero", () => {
  const warnings = [];
  const output = { warn: (m) => warnings.push(m), info: () => {} };
  const outcome = { transitioned: false, reason: "no-transition", issueKey: "PROJ-1", localStatus: "accepted", from: "In Progress" };

  assert.equal(lib_inner.summariseStatusOutcome(outcome, { output }), 0, "advisory by default");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Status NOT synced for PROJ-1/);

  assert.equal(lib_inner.summariseStatusOutcome(outcome, { output, failOnSkip: true }), 1);
});

test("summariseStatusOutcome — success, 'already' and 'no-target' are silent and zero", () => {
  const warnings = [];
  const output = { warn: (m) => warnings.push(m), info: () => {} };
  for (const o of [{ transitioned: true }, { reason: "already" }, { reason: "no-target" }, null]) {
    assert.equal(lib_inner.summariseStatusOutcome(o, { output, failOnSkip: true }), 0);
  }
  assert.deepEqual(warnings, []);
});

test("transitionToStatus — resolves the current status on create before deciding", async () => {
  // A freshly created issue has no prior status for the caller to pass. Without
  // looking it up, the already-check cannot fire and the sync hunts for a
  // transition into the status the issue is already in — which Jira never offers
  // as a self-transition — warning loudly about a non-problem.
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push(url);
    if (url.includes("?fields=status"))
      return { ok: true, status: 200, json: async () => ({ fields: { status: { name: "Selected for Development" } } }) };
    if (url.includes("/transitions"))
      return { ok: true, status: 200, json: async () => ({ transitions: [TR.start, TR.done] }) };
    return { ok: true, status: 204, json: async () => ({}), text: async () => "" };
  };
  const out = await lib_inner.transitionToStatus({
    ...BASE, http: lib_inner.makeHttp({ fetchImpl }),
    targetStatus: ["To Do", "Backlog", "Selected for Development"],
    currentStatus: null, localStatus: "planned",
  });
  assert.equal(out.reason, "already");
  assert.equal(calls.filter((u) => u.includes("/transitions")).length, 0, "no transition fetch needed");
});

// ---------------------------------------------------------------------------
// Document-link branch resolution (task.55 defect B)
//
// The bug these cover: getDefaultBranch() asked git, git correctly answered
// `main`, and the sync emitted document links to a branch the documents are not
// on. git is not wrong — it cannot know a repo's docs live on `develop` and
// reach `main` only via a release. So the durable branch comes from config.
// ---------------------------------------------------------------------------

const fs = require("fs");
const os = require("os");
const path = require("path");

function withConfig(yaml, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docbranch-"));
  try {
    if (yaml !== null) {
      fs.writeFileSync(path.join(dir, "skills-config.yaml"), yaml);
    }
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("parseTopLevelScalar — reads a key from a non-jira top-level block", () => {
  const cfg = "developNext:\n  baseBranch: develop\n";
  assert.equal(
    lib.parseTopLevelScalar(cfg, "developNext", "baseBranch"),
    "develop",
  );
});

test("parseTopLevelScalar — does not read across blocks", () => {
  const cfg = "jira:\n  docBranch: release\ndevelopNext:\n  baseBranch: develop\n";
  assert.equal(lib.parseTopLevelScalar(cfg, "jira", "baseBranch"), "");
  assert.equal(lib.parseTopLevelScalar(cfg, "developNext", "docBranch"), "");
});

test("parseJiraScalar — still delegates correctly after generalisation", () => {
  assert.equal(
    lib.parseJiraScalar("jira:\n  docBranch: develop\n", "docBranch"),
    "develop",
  );
});

test("loadDocBranchSetting — reads jira.docBranch", () => {
  withConfig("jira:\n  docBranch: develop\n", (dir) => {
    assert.equal(lib.loadDocBranchSetting(dir), "develop");
  });
});

test("loadDocBranchSetting — falls back to developNext.baseBranch", () => {
  withConfig("developNext:\n  baseBranch: develop\n", (dir) => {
    assert.equal(lib.loadDocBranchSetting(dir), "develop");
  });
});

test("loadDocBranchSetting — jira.docBranch wins over developNext.baseBranch", () => {
  const cfg = "jira:\n  docBranch: release\ndevelopNext:\n  baseBranch: develop\n";
  withConfig(cfg, (dir) => {
    assert.equal(lib.loadDocBranchSetting(dir), "release");
  });
});

test("loadDocBranchSetting — returns '' when neither key is set", () => {
  withConfig("jira:\n  devEstimateField: customfield_1\n", (dir) => {
    assert.equal(lib.loadDocBranchSetting(dir), "");
  });
});

test("loadDocBranchSetting — returns '' when there is no config file at all", () => {
  withConfig(null, (dir) => {
    assert.equal(lib.loadDocBranchSetting(dir), "");
  });
});

test("resolveDocBranch — an explicit --doc-branch beats config", () => {
  withConfig("jira:\n  docBranch: develop\n", (dir) => {
    assert.equal(lib.resolveDocBranch("hotfix/x", dir), "hotfix/x");
  });
});

test("resolveDocBranch — config beats the current branch's upstream", () => {
  // The regression that started this: a feature branch DOES contain the doc, so
  // linking to it resolves today and 404s once the branch is deleted on merge.
  withConfig("jira:\n  docBranch: develop\n", (dir) => {
    assert.equal(lib.resolveDocBranch(null, dir), "develop");
  });
});

test("resolveDocBranch — blank explicit value is ignored, not treated as a branch", () => {
  withConfig("jira:\n  docBranch: develop\n", (dir) => {
    assert.equal(lib.resolveDocBranch("   ", dir), "develop");
    assert.equal(lib.resolveDocBranch("", dir), "develop");
  });
});

test("resolveDocBranch — with no config set, behaviour is unchanged (git decides)", () => {
  // Inertness guard: repos that never had this problem must not acquire one.
  withConfig(null, (dir) => {
    const resolved = lib.resolveDocBranch(null, dir);
    const expected = lib.getCurrentBranchUpstream() || lib.gitDefaultBranch();
    assert.equal(resolved, expected);
  });
});

test("getDefaultBranch — stays git-only; config must NOT leak into it", () => {
  // Guards the CR-2 fix: getDefaultBranch is the public name for git's default
  // branch. resolveDocBranch is the config-aware path. If these ever merge again,
  // an exported function starts returning something its name does not promise.
  const prev = process.env.JIRA_DOC_BRANCH;
  process.env.JIRA_DOC_BRANCH = "develop";
  try {
    assert.equal(lib.getDefaultBranch(), lib.gitDefaultBranch());
  } finally {
    if (prev === undefined) delete process.env.JIRA_DOC_BRANCH;
    else process.env.JIRA_DOC_BRANCH = prev;
  }
});

test("gitDefaultBranch — is never overridden by config (git's answer stays available)", () => {
  const prev = process.env.JIRA_DOC_BRANCH;
  process.env.JIRA_DOC_BRANCH = "totally-not-a-real-branch";
  try {
    assert.notEqual(lib.gitDefaultBranch(), "totally-not-a-real-branch");
  } finally {
    if (prev === undefined) delete process.env.JIRA_DOC_BRANCH;
    else process.env.JIRA_DOC_BRANCH = prev;
  }
});
