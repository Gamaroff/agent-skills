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
jira_epic: "RB-14"
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
  assert.equal(frontmatter.jira_epic, "RB-14");
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
    frontmatter: { story_type: "feature_enhancement", estimated_effort_hours: "4", jira_epic: "RB-14" },
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

// ---------------------------------------------------------------------------
// syncLabelFor
// ---------------------------------------------------------------------------
test("syncLabelFor — derives label from parent dir name", () => {
  assert.equal(
    lib.syncLabelFor("/abs/docs/prds/x/epics/epic.1.foo/stories/story.1.2.bar/story.1.2.bar.md"),
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
    syncLabel: "synced-from-foo", epicKey: "RB-14", useEpicLink: false,
  });
  assert.deepEqual(fields.parent, { key: "RB-14" });
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
    syncLabel: "synced-from-foo", epicKey: "RB-14", useEpicLink: true,
  });
  assert.equal(fields.customfield_10014, "RB-14");
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
    "**Jira Story**: [RB-99](https://real/RB-99)"
  );
  // Code-block sample preserved verbatim
  assert.match(out, /SAMPLE-1/);
  // New line inserted outside the code block
  assert.match(out, /RB-99/);
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
    "**Jira Story**: [RB-1](https://x/RB-1)"
  );
  assert.match(out, /^# Story 1\.2: Foo\n\n\*\*Jira Story\*\*: \[RB-1\]/);
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
    return makeMockResp({ status: 201, body: JSON.stringify({ key: "RB-99" }) });
  };
  const auth = { baseUrl: "https://j", email: "e", token: "t" };
  const fields = { summary: "S", parent: { key: "RB-14" } };
  const out = { warn() {}, info() {} };
  const resp = await lib.createStoryWithRetry({ http, auth, fields, output: out });
  assert.equal(resp.status, 201);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].parent, { key: "RB-14" });
  assert.equal(calls[1].parent, undefined);
  assert.equal(calls[1].customfield_10014, "RB-14");
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
    return makeMockResp({ status: 201, body: JSON.stringify({ key: "RB-99" }) });
  };
  const fields = { summary: "S", customfield_10014: "RB-14" };
  const resp = await lib.createStoryWithRetry({
    http, auth: { baseUrl: "https://j", email: "e", token: "t" },
    fields, output: { warn() {}, info() {} },
  });
  assert.equal(resp.status, 201);
  assert.deepEqual(calls[1].parent, { key: "RB-14" });
});

test("createStoryWithRetry — non-parent 400 errors propagate immediately", async () => {
  const http = async () => makeMockResp({
    status: 400,
    body: JSON.stringify({ errors: { summary: "Summary too long." } }),
  });
  await assert.rejects(
    () => lib.createStoryWithRetry({
      http, auth: { baseUrl: "https://j", email: "e", token: "t" },
      fields: { summary: "S", parent: { key: "RB-14" } },
      output: { warn() {}, info() {} },
    }),
    /Summary too long/
  );
});

// ---------------------------------------------------------------------------
// Shared lib reliability — HTTP retry on 5xx and 429
// ---------------------------------------------------------------------------
const sharedLib = require("../../_lib/jira-sync.js");

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
        { key: "RB-50", fields: { updated: "2026-04-28T10:00:00.000Z" } },
        { key: "RB-51", fields: { updated: "2026-04-28T10:01:00.000Z" } },
      ],
    }),
  });
  const warns = [];
  const out = { warn: m => warns.push(m), info() {} };
  const found = await sharedLib.findExistingByLabel({
    http, baseUrl: "https://j", email: "e", token: "t",
    projectKey: "RB", label: "synced-from-foo", output: out,
  });
  assert.equal(found.key, "RB-50");
  assert.equal(warns.length, 1);
  assert.match(warns[0], /Multiple Jira issues match label/);
  assert.match(warns[0], /RB-50, RB-51/);
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
