/**
 * sync-jira-bug — unit tests.
 *
 * Behaviour, not source text. Every assertion here drives a real function with
 * real input and checks what came out; none of them grep the script for a string.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const bug = require("../scripts/sync-jira-bug.js");
const lib = require("../references/jira-sync.js");
const SH = require("../references/status-history.js");
const BD = require("../references/bug-doc.js");

const QUIET = { info() {}, warn() {} };

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sync-jira-bug-"));
}
function write(dir, name, body) {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf-8");
  return file;
}

// ===========================================================================
// Mode inference — the path is authoritative
// ===========================================================================

test("a story bug is recognised from its filename", () => {
  const m = bug.resolveBugMode("/x/docs/prd/a/story.7.4.bug.4.tap-target.md");
  assert.equal(m.mode, "story");
  assert.equal(m.bugId, "story.7.4.bug.4");
  assert.equal(m.parentKind, "story");
  assert.equal(m.parentId, "7.4");
  assert.equal(m.bugNumber, 4);
  assert.equal(m.bugStem, "story.7.4.bug.4.tap-target");
});

test("a three-part story id parses without swallowing the bug number", () => {
  // The id capture is lazy up to `.bug.`; a greedy one would read "8.5.3.bug.2"
  // as the id and lose the bug number entirely.
  const m = bug.resolveBugMode("/x/story.8.5.3.bug.2.sync-fails.md");
  assert.equal(m.parentId, "8.5.3");
  assert.equal(m.bugNumber, 2);
  assert.equal(m.bugId, "story.8.5.3.bug.2");
});

test("a task bug is recognised from its filename", () => {
  const m = bug.resolveBugMode(
    "/x/docs/tasks/task.67.qa/task.67.bug.3.names.md",
  );
  assert.equal(m.mode, "task");
  assert.equal(m.bugId, "task.67.bug.3");
  assert.equal(m.parentKind, "task");
  assert.equal(m.parentId, "67");
});

test("a general bug is recognised from its filename", () => {
  const m = bug.resolveBugMode("/x/docs/bugs/bug.12.a-thing/bug.12.a-thing.md");
  assert.equal(m.mode, "general");
  assert.equal(m.bugId, "bug.12");
  assert.equal(m.parentKind, "registry");
  assert.equal(m.parentId, null);
});

test("a filename matching no pattern is reported, not guessed at", () => {
  const m = bug.resolveBugMode("/x/some-notes.md");
  assert.equal(m.mode, "unknown");
  assert.equal(m.parentKind, null);
  assert.equal(m.warnings.length, 1);
  assert.match(m.warnings[0], /matches no bug naming pattern/);
});

test("a `related:` that disagrees with the path warns but does not win", () => {
  // A wrong parent link is worse than a missing one, so the structurally
  // guaranteed signal (the path) beats the free-text one.
  const m = bug.resolveBugMode(
    "/x/story.7.4.bug.4.tap-target.md",
    { related: "story 9.1" },
    "",
  );
  assert.equal(m.parentId, "7.4", "the document's claim overruled the path");
  assert.equal(m.warnings.length, 1);
  assert.match(m.warnings[0], /story 9\.1.*Path wins/s);
});

test("a hand-added story_id is tolerated and corroborated", () => {
  const agree = bug.resolveBugMode(
    "/x/story.7.4.bug.4.t.md",
    { story_id: "7.4" },
    "",
  );
  assert.deepEqual(agree.warnings, []);
  const disagree = bug.resolveBugMode(
    "/x/story.7.4.bug.4.t.md",
    { story_id: "9.9" },
    "",
  );
  assert.equal(disagree.warnings.length, 1);
});

test("a general bug's `none — cross-cutting` related value raises no warning", () => {
  const m = bug.resolveBugMode(
    "/x/bug.12.a-thing.md",
    { related: "none — cross-cutting (no single owner)" },
    "",
  );
  assert.deepEqual(m.warnings, []);
});

// ===========================================================================
// Reading both file shapes
// ===========================================================================

const HEADER_BODY = `# Bug: Tap target too small

**Bug ID**: story.7.4.bug.4
**Related**: [story 7.4](./story.7.4.tap-targets.md)
**Status**: ✅ Closed
**Priority**: High
**Severity**: Major
**Created**: 2026-07-21
**Assigned To**: {Developer Name}

## Bug Description

Small.
`;

test("the bold-line header block is parsed", () => {
  const h = bug.parseBugHeaderBlock(HEADER_BODY);
  assert.equal(h["Bug ID"], "story.7.4.bug.4");
  assert.equal(h.Priority, "High");
  assert.equal(h.Severity, "Major");
  assert.equal(h.Created, "2026-07-21");
});

test("an unfilled template placeholder is not read as a value", () => {
  const h = bug.parseBugHeaderBlock(HEADER_BODY);
  assert.equal(
    h["Assigned To"],
    undefined,
    "`{Developer Name}` was read as a real assignee",
  );
});

test("emoji decoration is stripped from the status value", () => {
  assert.equal(bug.parseBugHeaderBlock(HEADER_BODY).Status, "Closed");
  assert.equal(BD.stripDecoration("🔄 In Progress"), "In Progress");
  assert.equal(BD.stripDecoration("⚠️ Reopened"), "Reopened");
  assert.equal(BD.stripDecoration("🆕 New"), "New");
});

test("loose status spellings normalise onto the documented lifecycle", () => {
  const cases = {
    "✅ Closed": "closed",
    "🆕 New": "new",
    "🔄 In Progress": "in-progress",
    "✅ Ready for QA": "ready-for-qa",
    "⚠️ Reopened": "reopened",
    Fixed: "ready-for-qa",
    Resolved: "closed",
    Open: "new",
  };
  for (const [input, want] of Object.entries(cases)) {
    assert.equal(bug.normaliseBugStatus(input), want, `${input} → ${want}`);
  }
});

test("an unrecognised status word passes through rather than being invented", () => {
  assert.equal(bug.normaliseBugStatus("Triage"), "triage");
});

test("frontmatter wins per key; the header block fills the gaps", () => {
  const fields = bug.readBugFields(
    { status: "in-progress", severity: "Blocker" },
    { Status: "Closed", Priority: "High", Created: "2026-07-21" },
  );
  assert.equal(fields.status, "in-progress", "frontmatter must win");
  assert.equal(fields.severity, "Blocker");
  assert.equal(fields.priority, "High", "the header block must fill the gap");
  assert.equal(fields.created, "2026-07-21");
});

// ===========================================================================
// Frontmatter adoption
// ===========================================================================

test("a file with no frontmatter gets a minimal block, body byte-identical", () => {
  const out = bug.ensureFrontmatter(HEADER_BODY, {
    type: "bug",
    status: "closed",
    severity: "Major",
    priority: "High",
    created: "2026-07-21",
  });
  assert.ok(out.startsWith("---\n"));
  const { frontmatter, body } = lib.parseFrontmatter(out);
  assert.equal(frontmatter.type, "bug");
  assert.equal(frontmatter.status, "closed");
  assert.equal(frontmatter.severity, "Major");
  assert.equal(body, HEADER_BODY, "the body was not preserved verbatim");
});

test("adoption is idempotent — a second pass changes nothing", () => {
  const once = bug.ensureFrontmatter(HEADER_BODY, { status: "closed" });
  const twice = bug.ensureFrontmatter(once, { status: "closed" });
  assert.equal(twice, once);
});

test("a file that already has frontmatter is returned untouched", () => {
  const doc = "---\ntype: bug\n---\n\n# X\n";
  assert.equal(bug.ensureFrontmatter(doc, { status: "new" }), doc);
});

test("seeded keys keep the documented order regardless of input order", () => {
  const out = bug.ensureFrontmatter("# X\n", {
    description: "d",
    created: "2026-01-01",
    type: "bug",
    status: "new",
  });
  const keys = out
    .split("---")[1]
    .trim()
    .split("\n")
    .map((l) => l.split(":")[0]);
  assert.deepEqual(keys, ["type", "status", "created", "description"]);
});

test("adoption never produces an empty frontmatter block", () => {
  const out = bug.ensureFrontmatter("# X\n", {});
  assert.match(out, /^---\ntype: "?bug"?\n---\n/);
});

// ===========================================================================
// Card sections — one spec, three mode-dependent headings
// ===========================================================================

function cardHeadings(body) {
  const nodes = lib.buildCardSections(body, bug.BUG_CARD_SECTIONS, {
    sourceUrl: null,
    docLabel: "the bug report",
  });
  return nodes
    .filter((n) => n.type === "heading")
    .map((n) => n.content[0].text);
}

const BASE_BODY = `## Bug Description

It breaks.

## Reproduction Steps

1. Tap it.
2. Watch.
`;

test("all three violation headings resolve through the one alias array", () => {
  for (const heading of [
    "Scope & Impact",
    "Acceptance Criteria Violation",
    "Success Criteria Violation",
  ]) {
    const headings = cardHeadings(
      `${BASE_BODY}\n## ${heading}\n\n- AC-3 fails.\n`,
    );
    assert.deepEqual(
      headings,
      ["Summary", "Reproduction", "Impact"],
      `"${heading}" did not resolve to the Impact block`,
    );
  }
});

test("the Impact block is omitted, without warning, when absent", () => {
  const warnings = [];
  const nodes = lib.buildCardSections(BASE_BODY, bug.BUG_CARD_SECTIONS, {
    sourceUrl: null,
    docLabel: "the bug report",
    output: { info() {}, warn: (m) => warnings.push(m) },
  });
  const headings = nodes
    .filter((n) => n.type === "heading")
    .map((n) => n.content[0].text);
  assert.deepEqual(headings, ["Summary", "Reproduction"]);
  assert.deepEqual(
    warnings,
    [],
    "an optional section warned about its absence",
  );
});

test("Evidence is never published to the card", () => {
  // The largest section of a bug report and the fastest to go stale. The card is
  // a pointer at the document, not a copy of it.
  const headings = cardHeadings(
    `${BASE_BODY}\n## Evidence\n\n\`\`\`\nstack trace\n\`\`\`\n`,
  );
  assert.ok(!headings.includes("Evidence"));
});

test("the document's own history is never published to the card", () => {
  const headings = cardHeadings(
    `${BASE_BODY}\n## Status History\n\n| Date | Status | Changed By | Notes |\n| --- | --- | --- | --- |\n| 2026-01-01 | new | qa | Bug created |\n`,
  );
  assert.ok(!headings.includes("Status History"));
});

test("BUG_CARD_SECTIONS exposes exactly the three published blocks", () => {
  assert.deepEqual(
    bug.BUG_CARD_SECTIONS.map((s) => s.heading),
    ["Summary", "Reproduction", "Impact"],
  );
});

// ===========================================================================
// Source Documents — the point of the whole skill
// ===========================================================================

const BB = "https://bitbucket.org/ws/repo";

function sourceDocLinks(over = {}) {
  const adf = bug.buildDescriptionAdf({
    body: BASE_BODY,
    fields: { severity: "Major", priority: "High", status: "new" },
    bugBbUrl: `${BB}/src/develop/bug.md`,
    parentDocUrl: null,
    parentDocLabel: "Parent story document",
    parentKey: null,
    parentUrl: null,
    epicDocUrl: null,
    relatedDocLinks: [],
    linkResolver: null,
    output: QUIET,
    ...over,
  });
  const idx = adf.content.findIndex(
    (n) => n.type === "heading" && n.content[0].text === "Source Documents",
  );
  if (idx === -1) return null;
  return adf.content[idx + 1].content.map((li) => {
    const text = li.content[0].content[0];
    return { label: text.text, href: text.marks[0].attrs.href };
  });
}

test("a story bug's card links bug, parent doc, parent card and epic, in order", () => {
  const links = sourceDocLinks({
    parentDocUrl: `${BB}/src/develop/story.md`,
    parentDocLabel: "Parent story document",
    parentKey: "PROJ-123",
    parentUrl: "https://x.atlassian.net/browse/PROJ-123",
    epicDocUrl: `${BB}/src/develop/epic.md`,
  });
  assert.deepEqual(
    links.map((l) => l.label),
    [
      "Bug report",
      "Parent story document",
      "Parent card PROJ-123",
      "Parent epic",
    ],
  );
  assert.ok(links.every((l) => /^https:\/\//.test(l.href)));
});

test("a task bug's card links bug, parent doc and parent card — no epic", () => {
  const links = sourceDocLinks({
    parentDocUrl: `${BB}/src/develop/task.md`,
    parentDocLabel: "Parent task document",
    parentKey: "PROJ-9",
    parentUrl: "https://x.atlassian.net/browse/PROJ-9",
  });
  assert.deepEqual(
    links.map((l) => l.label),
    ["Bug report", "Parent task document", "Parent card PROJ-9"],
  );
});

test("a general bug's card links the bug report and the registry, and nothing else", () => {
  const links = sourceDocLinks({
    parentDocUrl: `${BB}/src/develop/docs/bugs/bug-registry.md`,
    parentDocLabel: "Bug registry",
  });
  assert.deepEqual(
    links.map((l) => l.label),
    ["Bug report", "Bug registry"],
  );
});

test("a parent with no card yet contributes its document but no card link", () => {
  const links = sourceDocLinks({
    parentDocUrl: `${BB}/src/develop/story.md`,
    parentKey: null,
    parentUrl: null,
  });
  assert.deepEqual(
    links.map((l) => l.label),
    ["Bug report", "Parent story document"],
  );
});

test("durable sibling artifacts are appended after the parent links", () => {
  const links = sourceDocLinks({
    parentDocUrl: `${BB}/src/develop/story.md`,
    relatedDocLinks: [
      { label: "Bug review", href: `${BB}/src/develop/review.md` },
      { label: "Definition of Done", href: `${BB}/src/develop/dod.md` },
    ],
  });
  assert.deepEqual(
    links.map((l) => l.label),
    ["Bug report", "Parent story document", "Bug review", "Definition of Done"],
  );
});

test("the Source Documents section is omitted entirely when there is nothing to link", () => {
  assert.equal(sourceDocLinks({ bugBbUrl: null }), null);
});

test("every Source Documents entry carries a real ADF link mark", () => {
  // The measured defect this skill exists to fix was a description whose ADF
  // contained ZERO link marks — the bug report was a bare plain-text path.
  const adf = bug.buildDescriptionAdf({
    body: BASE_BODY,
    fields: {},
    bugBbUrl: `${BB}/src/develop/bug.md`,
    parentDocUrl: `${BB}/src/develop/story.md`,
    parentDocLabel: "Parent story document",
    parentKey: "PROJ-1",
    parentUrl: "https://x.atlassian.net/browse/PROJ-1",
    epicDocUrl: null,
    relatedDocLinks: [],
    linkResolver: null,
    output: QUIET,
  });
  const marks = [];
  (function walk(n) {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== "object") return;
    for (const m of n.marks || []) if (m.type === "link") marks.push(m);
    if (n.content) walk(n.content);
  })(adf);
  assert.ok(marks.length >= 3, `expected >= 3 link marks, got ${marks.length}`);
  assert.ok(marks.every((m) => /^https?:\/\//.test(m.attrs.href)));
});

// ===========================================================================
// Sync label — unique per bug, not per directory
// ===========================================================================

test("the sync label is derived from the bug's own stem", () => {
  assert.equal(
    bug.syncLabelFor("/x/docs/prd/a/story.7.4.bug.4.tap-target.md"),
    "synced-from-story.7.4.bug.4.tap-target",
  );
});

test("sibling bugs in one directory get DIFFERENT sync labels", () => {
  // sync-jira-task labels by parent directory, which is unique for a task
  // because a task owns its directory. A bug does not. Labelling by directory
  // would make the idempotency search adopt the first card it found, so bug 2
  // would silently update bug 1's card.
  const dir = "/x/docs/prd/epic-7/";
  const a = bug.syncLabelFor(`${dir}story.7.4.bug.1.first.md`);
  const b = bug.syncLabelFor(`${dir}story.7.4.bug.2.second.md`);
  assert.notEqual(a, b);
});

test("a bug's sync label differs from its parent story's directory name", () => {
  const label = bug.syncLabelFor("/x/docs/prd/epic-7/story.7.4.bug.1.a.md");
  assert.ok(!label.endsWith("epic-7"));
});

// ===========================================================================
// Summary normalisation
// ===========================================================================

test("the summary is wrapped in the bug id, idempotently", () => {
  const once = bug.normaliseBugSummary(
    "Tap target too small",
    "story.7.4.bug.4",
  );
  assert.equal(once, "[story.7.4.bug.4] Tap target too small");
  assert.equal(bug.normaliseBugSummary(once, "story.7.4.bug.4"), once);
});

test("a leading `Bug:` prefix is dropped rather than nested in the bracket", () => {
  assert.equal(
    bug.normaliseBugSummary("Bug: Tap target too small", "bug.12"),
    "[bug.12] Tap target too small",
  );
});

test("a bracket carrying a DIFFERENT id is re-wrapped, not preserved", () => {
  assert.equal(
    bug.normaliseBugSummary("[bug.3] Old", "bug.12"),
    "[bug.12] [bug.3] Old",
  );
});

test("with no bug id the summary is returned unchanged", () => {
  assert.equal(bug.normaliseBugSummary("Plain", null), "Plain");
});

// ===========================================================================
// Status History — the bug-type Change Log
// ===========================================================================

const STUB_BUG = `---
type: bug
status: new
---

# Bug

## Bug Description

X.

## Status History

| Date | Status | Changed By | Notes |
| -------------- | ------ | ---------- | ------------ |
| 2026-09-01 | new | QA | Bug created |

---

## Resolution Summary

[Will be completed when bug is closed]
`;

test("a row is appended under the existing table, newest at the bottom", () => {
  const out = SH.upsertStatusHistory(STUB_BUG, {
    date: "2026-09-07",
    status: "in-progress",
    changedBy: "sync-jira-bug",
    notes: "Jira bug created (PROJ-42)",
  });
  const rows = SH.extractEntries(out);
  assert.equal(rows.length, 2);
  assert.match(rows[1], /2026-09-07 \| in-progress \| sync-jira-bug/);
  assert.match(rows[0], /2026-09-01/, "the existing row must stay first");
});

test("a missing section is created immediately BEFORE Resolution Summary", () => {
  const doc = STUB_BUG.replace(/## Status History[\s\S]*?\n---\n\n/, "");
  assert.ok(!/## Status History/.test(doc));
  const out = SH.upsertStatusHistory(doc, {
    date: "2026-09-07",
    status: "new",
    changedBy: "sync-jira-bug",
    notes: "Jira bug created (PROJ-1)",
  });
  assert.ok(
    out.indexOf("## Status History") < out.indexOf("## Resolution Summary"),
    "the section was inserted after Resolution Summary",
  );
  assert.equal(SH.extractEntries(out).length, 1);
});

test("with no Resolution Summary the section lands at EOF, never at the top", () => {
  const doc = "---\ntype: bug\n---\n\n# Bug\n\n## Bug Description\n\nX.\n";
  const out = SH.upsertStatusHistory(doc, {
    date: "2026-09-07",
    status: "new",
    changedBy: "sync-jira-bug",
    notes: "created",
  });
  assert.ok(
    out.indexOf("## Bug Description") < out.indexOf("## Status History"),
    "the section was inserted above the Bug Description",
  );
});

test("a Status History heading inside a code fence is not treated as the section", () => {
  const doc = `---
type: bug
---

# Bug

\`\`\`markdown
## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-01-01 | new | someone | illustrative |
\`\`\`

## Resolution Summary
`;
  const out = SH.upsertStatusHistory(doc, {
    date: "2026-09-07",
    status: "new",
    changedBy: "sync-jira-bug",
    notes: "created",
  });
  assert.match(
    out,
    /illustrative \|\n\`\`\`/,
    "a live row was appended inside the code fence",
  );
  assert.equal(
    (out.match(/^## Status History$/gm) || []).length,
    2,
    "a real section should have been created beside the illustrated one",
  );
});

test("a pipe in the notes is escaped so the table cannot break", () => {
  const row = SH.fmtEntry({
    date: "2026-09-07",
    status: "new",
    changedBy: "x",
    notes: "a|b",
  });
  const unescaped = (row.match(/(^|[^\\])\|/g) || []).length;
  assert.equal(unescaped, 5, `row had ${unescaped} unescaped pipes: ${row}`);
  assert.match(row, /a\\\|b/);
});

test("no entries means a byte-identical file", () => {
  // The property that keeps consecutive no-op syncs from churning history.
  let content = STUB_BUG;
  for (const entry of []) content = SH.upsertStatusHistory(content, entry);
  assert.equal(content, STUB_BUG);
});

test("a row is built for issue creation and for a real transition only", () => {
  const created = bug.buildStatusHistoryEntries({
    created: true,
    issueKey: "PROJ-42",
    statusOutcome: null,
    bugStatus: "new",
    date: "2026-09-07",
  });
  assert.equal(created.length, 1);
  assert.equal(created[0].notes, "Jira bug created (PROJ-42)");
  assert.equal(created[0].status, "new");
  assert.equal(created[0].changedBy, "sync-jira-bug");

  const transitioned = bug.buildStatusHistoryEntries({
    created: false,
    issueKey: "PROJ-42",
    statusOutcome: { transitioned: true, to: "Done" },
    bugStatus: "closed",
    date: "2026-09-07",
  });
  assert.equal(transitioned.length, 1);
  assert.match(transitioned[0].notes, /moved to "Done"/);

  const bodyOnly = bug.buildStatusHistoryEntries({
    created: false,
    issueKey: "PROJ-42",
    statusOutcome: { transitioned: false, reason: "already" },
    bugStatus: "closed",
    date: "2026-09-07",
  });
  assert.deepEqual(bodyOnly, [], "a body update must write no row");
});

test("the Status cell carries the BUG lifecycle word, not the Jira column", () => {
  // Two vocabularies. Putting a Jira column name in the Status column is how
  // they get conflated.
  const [row] = bug.buildStatusHistoryEntries({
    created: false,
    issueKey: "PROJ-42",
    statusOutcome: { transitioned: true, to: "Waiting for Review" },
    bugStatus: "ready-for-qa",
    date: "2026-09-07",
  });
  assert.equal(row.status, "ready-for-qa");
  assert.match(row.notes, /Waiting for Review/);
});

test("a bug file never receives a Change Log", () => {
  // bug-documents.md forbids it; change-log.js has no `bug` anchor, so a writer
  // reaching for docType:"bug" would silently append one at EOF.
  const dir = tmpdir();
  const file = write(dir, "bug.12.a-thing.md", STUB_BUG);
  bug.updateBugFile({
    filePath: file,
    issueKey: "PROJ-1",
    issueUrl: "https://x/browse/PROJ-1",
    bugFields: { status: "new", severity: "Major" },
    statusHistoryEntries: bug.buildStatusHistoryEntries({
      created: true,
      issueKey: "PROJ-1",
      statusOutcome: null,
      bugStatus: "new",
      date: "2026-09-07",
    }),
    lastSyncedAt: null,
    bodyHash: "a",
    metaHash: "b",
    output: QUIET,
  });
  const written = fs.readFileSync(file, "utf-8");
  assert.doesNotMatch(written, /## Change Log/);
  assert.doesNotMatch(written, /<!-- change-log-start -->/);
  assert.equal(SH.extractEntries(written).length, 2);
});

// ===========================================================================
// Issue links
// ===========================================================================

function stubHttp(routes) {
  const calls = [];
  return {
    calls,
    http: async (url, opts = {}) => {
      calls.push({ url, method: opts.method || "GET", body: opts.body });
      for (const [pattern, resp] of routes) {
        if (url.includes(pattern))
          return typeof resp === "function" ? resp(url, opts) : resp;
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
  };
}

const LINK_TYPES = {
  ok: true,
  status: 200,
  json: async () => ({
    issueLinkTypes: [
      { id: "10", name: "Blocks", inward: "is blocked by", outward: "blocks" },
      {
        id: "20",
        name: "Relates",
        inward: "relates to",
        outward: "relates to",
      },
    ],
  }),
};

test("resolveLinkType honours CANDIDATE order, not the board's order", () => {
  const r = bug.resolveLinkType([
    { id: "10", name: "Blocks" },
    { id: "20", name: "Relates" },
  ]);
  assert.equal(r.match.name, "Relates");
  assert.equal(r.rule, 'name="Relates"');
});

test("resolveLinkType matches case-insensitively", () => {
  assert.equal(
    bug.resolveLinkType([{ id: "1", name: "RELATES" }]).match.id,
    "1",
  );
});

test("a board with none of the candidates reports no-link-type, never guesses", () => {
  const r = bug.resolveLinkType([{ id: "1", name: "Duplicate" }]);
  assert.equal(r.match, null);
  assert.equal(r.reason, "no-link-type");
});

test("linkIssues posts a link when none exists", async () => {
  const { http, calls } = stubHttp([
    ["issueLinkType", LINK_TYPES],
    [
      "?fields=issuelinks",
      {
        ok: true,
        status: 200,
        json: async () => ({ fields: { issuelinks: [] } }),
      },
    ],
    ["/issueLink", { ok: true, status: 201, json: async () => ({}) }],
  ]);
  const r = await bug.linkIssues({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    fromKey: "PROJ-9",
    toKey: "PROJ-1",
    output: QUIET,
  });
  assert.equal(r.linked, true);
  assert.equal(r.type, "Relates");
  const post = calls.find((c) => c.method === "POST");
  assert.deepEqual(JSON.parse(post.body), {
    type: { name: "Relates" },
    inwardIssue: { key: "PROJ-9" },
    outwardIssue: { key: "PROJ-1" },
  });
});

test("linkIssues is idempotent — an existing link is not posted again", async () => {
  // This is what makes a second sync a no-op. Jira happily creates a DUPLICATE
  // link of the same type between the same pair, so an unconditional POST would
  // add one more identical row to the link panel on every run.
  const { http, calls } = stubHttp([
    ["issueLinkType", LINK_TYPES],
    [
      "?fields=issuelinks",
      {
        ok: true,
        status: 200,
        json: async () => ({
          fields: {
            issuelinks: [
              { type: { name: "Relates" }, outwardIssue: { key: "PROJ-1" } },
            ],
          },
        }),
      },
    ],
  ]);
  const r = await bug.linkIssues({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    fromKey: "PROJ-9",
    toKey: "PROJ-1",
    output: QUIET,
  });
  assert.equal(r.linked, false);
  assert.equal(r.reason, "already");
  assert.equal(
    calls.filter((c) => c.method === "POST").length,
    0,
    "a duplicate link was posted",
  );
});

test("a link to a DIFFERENT issue does not count as already linked", async () => {
  const { http } = stubHttp([
    ["issueLinkType", LINK_TYPES],
    [
      "?fields=issuelinks",
      {
        ok: true,
        status: 200,
        json: async () => ({
          fields: {
            issuelinks: [
              { type: { name: "Relates" }, outwardIssue: { key: "PROJ-77" } },
            ],
          },
        }),
      },
    ],
    ["/issueLink", { ok: true, status: 201, json: async () => ({}) }],
  ]);
  const r = await bug.linkIssues({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    fromKey: "PROJ-9",
    toKey: "PROJ-1",
    output: QUIET,
  });
  assert.equal(r.linked, true);
});

test("no usable link type degrades to a reported outcome, not a throw", async () => {
  const { http, calls } = stubHttp([
    [
      "issueLinkType",
      { ok: true, status: 200, json: async () => ({ issueLinkTypes: [] }) },
    ],
  ]);
  const r = await bug.linkIssues({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    fromKey: "PROJ-9",
    toKey: "PROJ-1",
    output: QUIET,
  });
  assert.equal(r.reason, "no-link-type");
  assert.equal(calls.filter((c) => c.method === "POST").length, 0);
});

test("a deferred link is reported as deferred, never as linked", async () => {
  const { http } = stubHttp([
    ["issueLinkType", LINK_TYPES],
    [
      "?fields=issuelinks",
      {
        ok: true,
        status: 200,
        json: async () => ({ fields: { issuelinks: [] } }),
      },
    ],
    ["/issueLink", { deferred: true, deferredRecord: "rec-1" }],
  ]);
  const r = await bug.linkIssues({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    fromKey: "PROJ-9",
    toKey: "PROJ-1",
    output: QUIET,
  });
  assert.equal(r.linked, false);
  assert.equal(r.reason, "deferred");
  assert.equal(r.record, "rec-1");
});

test("an HTTP failure on the link is non-fatal and reported", async () => {
  const { http } = stubHttp([
    ["issueLinkType", LINK_TYPES],
    [
      "?fields=issuelinks",
      {
        ok: true,
        status: 200,
        json: async () => ({ fields: { issuelinks: [] } }),
      },
    ],
    [
      "/issueLink",
      {
        ok: false,
        status: 403,
        json: async () => ({ errorMessages: ["nope"] }),
        text: async () => JSON.stringify({ errorMessages: ["nope"] }),
      },
    ],
  ]);
  const r = await bug.linkIssues({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    fromKey: "PROJ-9",
    toKey: "PROJ-1",
    output: QUIET,
  });
  assert.equal(r.linked, false);
  assert.equal(r.reason, "http-403");
});

test("linking an issue to itself is refused without a network call", async () => {
  const { http, calls } = stubHttp([]);
  const r = await bug.linkIssues({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    fromKey: "PROJ-9",
    toKey: "PROJ-9",
    output: QUIET,
  });
  assert.equal(r.reason, "self");
  assert.equal(calls.length, 0);
});

// ===========================================================================
// Status mapping
// ===========================================================================

test("every bug-lifecycle word resolves to a candidate list", () => {
  for (const s of [
    "new",
    "in-progress",
    "ready-for-qa",
    "closed",
    "reopened",
  ]) {
    const c = bug.STATUS_MAP[s];
    assert.ok(Array.isArray(c) && c.length, `"${s}" has no candidates`);
  }
});

test("closed leads with Closed; reopened leads with Reopened", () => {
  assert.equal(bug.STATUS_MAP.closed[0], "Closed");
  assert.equal(bug.STATUS_MAP.reopened[0], "Reopened");
});

test("ready-for-qa reuses the existing QA candidates", () => {
  assert.deepEqual(bug.STATUS_MAP["ready-for-qa"], [
    "Testing",
    "Ready for Testing",
    "In Testing",
    "QA",
    "In QA",
  ]);
});

test("the document lifecycle is unchanged by the bug additions", () => {
  // The four bug words were previously UNMAPPED and fell through to verbatim
  // pass-through. Adding them must not move any existing status.
  assert.deepEqual(bug.STATUS_MAP.draft, bug.STATUS_MAP.planned);
  assert.equal(bug.STATUS_MAP["in-progress"][0], "In Progress");
  assert.equal(bug.STATUS_MAP.accepted[0], "Done");
  assert.equal(bug.STATUS_MAP["ready-for-review"][0], "In Review");
  assert.equal(bug.STATUS_MAP.cancelled[0], "Cancelled");
});

test("reopened resolves a backwards move — the monotonicity guard does not fire", async () => {
  // A reopened bug is the one legitimate backward transition in the system. The
  // guard is driven by a caller-declared rank and this skill declares none, so
  // closed → reopened must resolve like any other transition.
  const { http } = stubHttp([
    [
      "/transitions",
      {
        ok: true,
        status: 200,
        json: async () => ({
          transitions: [
            { id: "31", name: "Reopen", to: { name: "Reopened" } },
            { id: "41", name: "Close", to: { name: "Done" } },
          ],
        }),
      },
    ],
  ]);
  const out = await lib.syncDocumentStatus({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    issueKey: "PROJ-9",
    localStatus: "reopened",
    currentStatus: "Done",
    docKind: "bug",
    output: QUIET,
  });
  assert.notEqual(
    out.reason,
    "would-regress",
    "the monotonicity guard blocked a legitimate reopen",
  );
  assert.equal(out.transitioned, true);
  assert.equal(out.to, "Reopened");
});

test("a closing bug can use the terminal statusCategory fallback", () => {
  // `closed` had to join TERMINAL_LOCAL_STATUSES for rule 4 to be available on a
  // board whose done column none of the candidate names guess.
  assert.equal(
    lib.isTerminalLocalStatus("closed"),
    true,
    "`closed` is not registered as a terminal local status",
  );
  const r = lib.resolveTransition({
    transitions: [
      {
        id: "5",
        name: "Finish",
        to: { name: "Shipped", statusCategory: { key: "done" } },
      },
    ],
    candidates: bug.STATUS_MAP.closed,
    currentStatus: "In Progress",
    terminal: lib.isTerminalLocalStatus("closed"),
  });
  assert.ok(r.match, "no transition resolved for a closing bug");
  assert.equal(r.match.to.name, "Shipped");
});

// ===========================================================================
// Neighbouring documents
// ===========================================================================

test("a task bug finds its parent task, not the task's QA report", () => {
  const dir = tmpdir();
  write(dir, "task.67.execute-the-gate.md", "# Task\n");
  write(dir, "task.67.qa.1.execute-the-gate.md", "# QA\n");
  write(dir, "task.67.plan.1.execute-the-gate.md", "# Plan\n");
  const file = write(dir, "task.67.bug.3.names.md", "# Bug\n");

  assert.equal(
    path.basename(bug.findParentDoc(file, "task", "67")),
    "task.67.execute-the-gate.md",
  );
});

test("a story bug finds its parent story", () => {
  const dir = tmpdir();
  write(dir, "story.7.4.tap-targets.md", "# Story\n");
  write(dir, "story.7.4.bug.1.other.md", "# Other bug\n");
  const file = write(dir, "story.7.4.bug.4.tap-target.md", "# Bug\n");

  assert.equal(
    path.basename(bug.findParentDoc(file, "story", "7.4")),
    "story.7.4.tap-targets.md",
  );
});

test("an unresolvable parent yields null rather than a plausible wrong file", () => {
  const dir = tmpdir();
  write(dir, "story.9.9.something-else.md", "# Other story\n");
  const file = write(dir, "story.7.4.bug.4.tap-target.md", "# Bug\n");
  assert.equal(bug.findParentDoc(file, "story", "7.4"), null);
});

test("related docs are the bug's own artifacts, not its parent's", () => {
  const dir = tmpdir();
  write(dir, "task.67.execute-the-gate.md", "# Task\n");
  write(dir, "task.67.qa.1.execute-the-gate.md", "# Task QA\n");
  write(dir, "task.67.bug.1.other.md", "# Sibling bug\n");
  write(dir, "task.67.bug.1.review.1.other.md", "# Sibling review\n");
  write(dir, "task.67.bug.3.review.1.names.md", "# Review\n");
  write(dir, "task.67.bug.3.dod.1.names.md", "# DoD\n");
  const file = write(dir, "task.67.bug.3.names.md", "# Bug\n");

  const found = bug.findRelatedBugDocs(
    file,
    "task.67.bug.3",
    "task.67.bug.3.names",
  );
  assert.deepEqual(
    found.map((d) => d.filename),
    ["task.67.bug.3.review.1.names.md", "task.67.bug.3.dod.1.names.md"],
  );
  assert.deepEqual(
    found.map((d) => d.label),
    ["Bug review", "Definition of Done"],
  );
});

test("both real artifact spellings are matched", () => {
  // `bug.11.dod.1.<name>.md` and `bug.1.<name>.dod.1.<name>.md` both exist.
  const dir = tmpdir();
  write(dir, "bug.11.dod.1.a-thing.md", "# DoD\n");
  write(dir, "bug.11.a-thing.review.1.a-thing.md", "# Review\n");
  const file = write(dir, "bug.11.a-thing.md", "# Bug\n");

  const found = bug.findRelatedBugDocs(file, "bug.11", "bug.11.a-thing");
  assert.deepEqual(
    found.map((d) => d.label),
    ["Bug review", "Definition of Done"],
  );
});

test("two artifacts of one kind are qualified by instance", () => {
  const dir = tmpdir();
  write(dir, "bug.11.review.1.a.md", "# R1\n");
  write(dir, "bug.11.review.2.a.md", "# R2\n");
  const file = write(dir, "bug.11.a.md", "# Bug\n");

  assert.deepEqual(
    bug.findRelatedBugDocs(file, "bug.11", "bug.11.a").map((d) => d.label),
    ["Bug review 1", "Bug review 2"],
  );
});

// ===========================================================================
// Hashing
// ===========================================================================

const HASH_ARGS = {
  body: BASE_BODY,
  bugBbUrl: `${BB}/src/develop/bug.md`,
  parentDocUrl: `${BB}/src/develop/story.md`,
  parentKey: "PROJ-1",
  epicDocUrl: null,
  relatedDocLinks: [],
  linkResolver: null,
};

test("hashBody is stable across identical input", () => {
  assert.equal(bug.hashBody(HASH_ARGS), bug.hashBody({ ...HASH_ARGS }));
});

test("hashBody ignores a section the card does not publish", () => {
  // Hashing the raw document would make an Evidence paste flip the hash and fire
  // a description PUT that changes nothing on the card.
  assert.equal(
    bug.hashBody({
      ...HASH_ARGS,
      body: `${BASE_BODY}\n## Evidence\n\nA new stack trace.\n`,
    }),
    bug.hashBody(HASH_ARGS),
  );
});

test("hashBody moves when the parent card appears", () => {
  assert.notEqual(
    bug.hashBody({ ...HASH_ARGS, parentKey: null }),
    bug.hashBody(HASH_ARGS),
  );
});

test("hashMeta depends only on the bug's own metadata", () => {
  const base = { severity: "Major", priority: "High", status: "new" };
  assert.equal(bug.hashMeta(base), bug.hashMeta({ ...base }));
  assert.notEqual(
    bug.hashMeta(base),
    bug.hashMeta({ ...base, status: "closed" }),
  );
  assert.equal(
    bug.hashMeta(base),
    bug.hashMeta({ ...base, description: "irrelevant" }),
  );
});

// ===========================================================================
// Args
// ===========================================================================

test("--no-link and --no-transition are independent flags", () => {
  const a = bug.parseArgs(["node", "s", "--file", "x.md", "--no-link"]);
  assert.equal(a.noLink, true);
  assert.equal(a.noTransition, false);
  const b = bug.parseArgs(["node", "s", "--file", "x.md", "--no-transition"]);
  assert.equal(b.noTransition, true);
  assert.equal(b.noLink, false);
});

test("an unknown flag throws rather than being ignored", () => {
  assert.throws(
    () => bug.parseArgs(["node", "s", "--file", "x.md", "--nope"]),
    /Unknown option: --nope/,
  );
});
