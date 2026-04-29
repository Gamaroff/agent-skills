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
  assert.ok(body.match(/---/g).length >= 2, "expected 2+ horizontal rules in body");
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
test("upsertChangelog — inserts when no changelog exists, before first ## section", () => {
  const src = `# Title\n\nIntro.\n\n## Section\n\nbody\n`;
  const out = lib.upsertChangelog(src, lib.fmtEntry("Initial Jira task created"));
  assert.ok(out.includes(lib.CL_START));
  assert.ok(out.includes(lib.CL_END));
  assert.ok(out.indexOf(lib.CL_START) < out.indexOf("## Section"), "changelog must precede ## Section");
});

test("upsertChangelog — appends entry within existing markers", () => {
  const initial = lib.upsertChangelog(`# T\n\n## S\n\nbody\n`, lib.fmtEntry("Entry one"));
  const out = lib.upsertChangelog(initial, lib.fmtEntry("Entry two"));
  assert.match(out, /Entry one/);
  assert.match(out, /Entry two/);
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
  assert.equal(out.match(/## Change Log/g).length, 1, "only one Change Log heading allowed");
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
  const args = { body: "## Overview\n\nDo a thing.\n", frontmatter: {}, taskBbUrl: null };
  const h1 = lib.hashDescriptionInput(args);
  const h2 = lib.hashDescriptionInput(args);
  assert.equal(h1, h2);
  const h3 = lib.hashDescriptionInput({ ...args, body: "## Overview\n\nDo a different thing.\n" });
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
    body: `## Overview

Refactor cache layer.

## Implementation Plan

Steps go here.
`,
    frontmatter: { category: "refactoring", estimated_effort_hours: "24", status: "📋 Planned" },
    taskBbUrl: "https://bitbucket.org/org/repo/src/HEAD/task.md",
    changelogEntries: ["| 2026-04-28 09:40 | Initial Jira task created |"],
  });
  assert.equal(doc.type, "doc");
  assert.equal(doc.version, 1);
  const table = doc.content.find(n => n.type === "table");
  assert.ok(table, "table node present");
  assert.equal(table.content.length, 2, "header row + 1 data row");
  const bullet = doc.content.find(n => n.type === "bulletList");
  assert.ok(bullet, "source-doc bullet list present");
  const linkText = bullet.content[0].content[0].content[0];
  assert.equal(linkText.marks[0].type, "link");
  assert.match(linkText.marks[0].attrs.href, /bitbucket\.org/);
});

test("buildDescriptionAdf — renders task-specific sections (Overview, Implementation Plan, etc.)", () => {
  const body = `## Overview

Top-level summary.

## Motivation

Why we need this.

## Implementation Plan

- [ ] Phase 1
- [ ] Phase 2

## Risk Assessment

High risk: thing.

## Rollback Plan

Revert commit.
`;
  const doc = lib.buildDescriptionAdf({ body, frontmatter: {}, taskBbUrl: null, changelogEntries: [] });
  const headings = doc.content.filter(n => n.type === "heading").map(n => n.content[0].text);
  assert.ok(headings.includes("Overview"));
  assert.ok(headings.includes("Motivation"));
  assert.ok(headings.includes("Implementation Plan"));
  assert.ok(headings.includes("Risk Assessment"));
  assert.ok(headings.includes("Rollback Plan"));
});

test("buildDescriptionAdf — does not render User Story / Acceptance Criteria (story-only sections)", () => {
  const body = `## User Story

As a user.

## Acceptance Criteria

- AC1
`;
  const doc = lib.buildDescriptionAdf({ body, frontmatter: {}, taskBbUrl: null, changelogEntries: [] });
  const headings = doc.content.filter(n => n.type === "heading").map(n => n.content[0].text);
  assert.ok(!headings.includes("User Story"), "story-only sections must be absent");
  assert.ok(!headings.includes("Acceptance Criteria"), "story-only sections must be absent");
});

test("buildDescriptionAdf — omits sections with no body match", () => {
  const doc = lib.buildDescriptionAdf({
    body: "# Just a title\n\nNothing else.\n",
    frontmatter: {},
    taskBbUrl: null,
    changelogEntries: [],
  });
  assert.equal(doc.content.length, 0);
});

test("TASK_SECTIONS — exposes the 11 task-doc section headings", () => {
  assert.ok(Array.isArray(lib.TASK_SECTIONS));
  assert.equal(lib.TASK_SECTIONS.length, 11);
  assert.ok(lib.TASK_SECTIONS.includes("Overview"));
  assert.ok(lib.TASK_SECTIONS.includes("Rollback Plan"));
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
// New tests — recommendations #2-#20
// ---------------------------------------------------------------------------

const lib_inner = require("../../_lib/jira-sync.js");

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
  assert.ok(nodes[0].content.some(n => n.type === "hardBreak"));
});

test("textToAdfNodes — mixes paragraphs and bullet lists across blocks", () => {
  const nodes = lib_inner.textToAdfNodes("Intro paragraph.\n\n- a\n- b\n\nMore prose.");
  const types = nodes.map(n => n.type);
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
  const out = lib.upsertFrontmatterKeys(src, { jira_key: "RB-47", jira_url: "https://x/RB-47" });
  assert.match(out, /jira_key: "RB-47"/);
  assert.match(out, /jira_url: "https:\/\/x\/RB-47"/);
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
    lib.diffFields({ prev, next, prevBodyHash: "a", newBodyHash: "a", prevMetaHash: "x", newMetaHash: "y" }),
    ["metadata"]
  );
  // body changed → "description" (metadata not double-reported)
  assert.deepEqual(
    lib.diffFields({ prev, next, prevBodyHash: "a", newBodyHash: "b", prevMetaHash: "x", newMetaHash: "y" }),
    ["description"]
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

test("syncLabelFor — derives stable label from task dir name", () => {
  const label = task.syncLabelFor("/repo/docs/development/tasks/task.1.cache-lib/task.1.cache-lib.md");
  assert.equal(label, "synced-from-task.1.cache-lib");
});

test("hashBody — stable across runs, differs on body change", () => {
  const a = task.hashBody({ body: "## Overview\n\nThing.\n", taskBbUrl: "https://bb/x" });
  const b = task.hashBody({ body: "## Overview\n\nThing.\n", taskBbUrl: "https://bb/x" });
  const c = task.hashBody({ body: "## Overview\n\nDifferent.\n", taskBbUrl: "https://bb/x" });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("hashMeta — depends only on category/effort/status frontmatter fields", () => {
  const m1 = task.hashMeta({ category: "refactor", estimated_effort_hours: 8, status: "Planned" });
  const m2 = task.hashMeta({ category: "refactor", estimated_effort_hours: 8, status: "Planned", title: "X" });
  const m3 = task.hashMeta({ category: "refactor", estimated_effort_hours: 8, status: "Done" });
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
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch, retries: 2, retryDelayMs: 1 });
  const r = await http("http://x");
  assert.equal(r.ok, true);
  assert.equal(n, 3, "should have retried twice");
});

test("makeHttp — does not retry on 4xx", async () => {
  let n = 0;
  const fakeFetch = async () => { n++; return { status: 404, ok: false, text: async () => "nope" }; };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch, retries: 3, retryDelayMs: 1 });
  const r = await http("http://x");
  assert.equal(r.status, 404);
  assert.equal(n, 1, "no retry on 4xx");
});

// #2 — status transitions
test("transitionToStatus — finds matching transition by to.name", async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, method: opts?.method || "GET" });
    if (url.endsWith("/transitions") && (!opts || !opts.method || opts.method === "GET")) {
      return {
        ok: true, status: 200,
        json: async () => ({ transitions: [
          { id: "11", name: "Start", to: { name: "In Progress" } },
          { id: "21", name: "Resolve", to: { name: "Done" } },
        ] }),
      };
    }
    return { ok: true, status: 204, json: async () => ({}), text: async () => "" };
  };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const out = await lib_inner.transitionToStatus({
    http, baseUrl: "https://j", email: "e", token: "t",
    issueKey: "RB-1", targetStatus: "In Progress", currentStatus: "To Do",
  });
  assert.equal(out.transitioned, true);
  assert.equal(calls.filter(c => c.method === "POST").length, 1);
});

test("transitionToStatus — no-op when target equals current", async () => {
  const fakeFetch = async () => { throw new Error("should not call fetch"); };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const out = await lib_inner.transitionToStatus({
    http, baseUrl: "https://j", email: "e", token: "t",
    issueKey: "RB-1", targetStatus: "Done", currentStatus: "Done",
  });
  assert.equal(out.transitioned, false);
  assert.equal(out.reason, "already");
});

// #11 — board type
test("getBoardType — returns scrum/kanban", async () => {
  const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({ type: "kanban" }) });
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const t = await lib_inner.getBoardType({ http, baseUrl: "https://j", email: "e", token: "t", boardId: "1" });
  assert.equal(t, "kanban");
});

test("moveToBacklog — skips on Kanban board", async () => {
  let postCalled = false;
  const fakeFetch = async (url, opts) => {
    if (opts?.method === "POST") { postCalled = true; }
    if (url.includes("/configuration")) return { ok: true, status: 200, json: async () => ({ type: "kanban" }) };
    return { ok: true, status: 204, text: async () => "" };
  };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const r = await lib_inner.moveToBacklog({
    http, baseUrl: "https://j", email: "e", token: "t",
    boardId: "1", issueKey: "RB-1", output: lib_inner.makeOutput({ quiet: true }),
  });
  assert.equal(r.moved, false);
  assert.equal(postCalled, false, "no POST on Kanban");
});

// #16 — live priority resolution
test("resolveLivePriorities — builds map keyed by lower-cased name", async () => {
  const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ([
    { name: "Highest" }, { name: "High" }, { name: "Medium" }, { name: "Low" }, { name: "Lowest" },
  ]) });
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const map = await lib_inner.resolveLivePriorities({ http, baseUrl: "https://j", email: "e", token: "t" });
  assert.equal(map.high, "High");
  assert.equal(map.lowest, "Lowest");
});

test("normalisePriority — uses live priorities when available", () => {
  const live = { urgent: "Urgent", high: "High", highest: "Urgent" };
  assert.equal(lib.normalisePriority("urgent", live), "Urgent", "direct live match");
  assert.equal(lib.normalisePriority("high", live), "High", "lower-case match");
  assert.equal(lib.normalisePriority("blocker", live), "Urgent", "synonym blocker→Highest→live[highest]=Urgent");
});

// #8 — idempotent create via label search
test("findExistingByLabel — returns key when issue with label exists", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("/search")) return {
      ok: true, status: 200,
      json: async () => ({ issues: [{ key: "RB-99", fields: { updated: "2026-04-28T10:00:00.000Z" } }] }),
    };
    return { ok: false, status: 404, text: async () => "" };
  };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const r = await lib_inner.findExistingByLabel({
    http, baseUrl: "https://j", email: "e", token: "t",
    projectKey: "RB", label: "synced-from-task.1.x",
  });
  assert.equal(r.key, "RB-99");
});

// #3 — atomic PUT with returnIssue
test("putIssueAtomic — parses fields.updated from response body", async () => {
  const fakeFetch = async () => ({
    ok: true, status: 200,
    json: async () => ({ fields: { updated: "2026-04-28T11:00:00.000Z" } }),
  });
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const r = await lib_inner.putIssueAtomic({
    http, baseUrl: "https://j", email: "e", token: "t",
    issueKey: "RB-1", fields: { summary: "X" },
  });
  assert.equal(r.updated, "2026-04-28T11:00:00.000Z");
});

// #4 — fail-loud timestamp fetch
test("fetchUpdatedTimestampStrict — throws on missing fields.updated", async () => {
  const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({ fields: {} }) });
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  await assert.rejects(
    lib_inner.fetchUpdatedTimestampStrict({ http, baseUrl: "https://j", email: "e", token: "t", issueKey: "RB-1" }),
    /missing fields\.updated/,
  );
});

// #12 — issue type cache
test("getIssueTypeId — caches type id and avoids second network call", async () => {
  const tmpRoot = require("fs").mkdtempSync(require("os").tmpdir() + "/jira-cache-");
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    return { ok: true, status: 200, json: async () => ({ issueTypes: [{ id: "10001", name: "Task" }] }) };
  };
  const http = lib_inner.makeHttp({ fetchImpl: fakeFetch });
  const id1 = await lib_inner.getIssueTypeId({
    http, baseUrl: "https://j", email: "e", token: "t",
    projectKey: "RB", typeName: "Task", repoRoot: tmpRoot,
  });
  const id2 = await lib_inner.getIssueTypeId({
    http, baseUrl: "https://j", email: "e", token: "t",
    projectKey: "RB", typeName: "Task", repoRoot: tmpRoot,
  });
  assert.equal(id1, "10001");
  assert.equal(id2, "10001");
  assert.equal(calls, 1, "second call served from cache");
});
