"use strict";
/**
 * sync-jira-epic tests — node:test (no external deps).
 * Run: node --test tests/*.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const lib = require("../scripts/sync-jira-epic.js");

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------
test("parseFrontmatter — basic key/value", () => {
  const src = `---\ntitle: 'Epic 1: Foundation'\npriority: 'high'\n---\n\n# Body\n`;
  const { frontmatter, body } = lib.parseFrontmatter(src);
  assert.equal(frontmatter.title, "Epic 1: Foundation");
  assert.equal(frontmatter.priority, "high");
  assert.match(body, /^# Body/);
});

test("parseFrontmatter — preserves body containing horizontal rule", () => {
  const src = `---\ntitle: 'X'\n---\n\n# Body\n\n---\n\nMore text.\n`;
  const { body } = lib.parseFrontmatter(src);
  assert.match(body, /---/);
  assert.match(body, /More text\./);
});

// ---------------------------------------------------------------------------
// upsertChangelog
// ---------------------------------------------------------------------------
test("upsertChangelog — wraps existing hand-written ## Change Log", () => {
  const src = `# Title\n\n## Change Log\n\n| Date (UTC) | Change |\n|------------|--------|\n| 2026-01-01 09:00 | Manual entry |\n\n## Other\n\nstuff\n`;
  const out = lib.upsertChangelog(src, lib.fmtEntry("Auto entry"));
  assert.equal(out.match(/## Change Log/g).length, 1);
  assert.match(out, /Manual entry/);
  assert.match(out, /Auto entry/);
  assert.ok(out.includes(lib.CL_START));
});

// ---------------------------------------------------------------------------
// diffFields with body/meta hash split
// ---------------------------------------------------------------------------
test("diffFields — separate body/meta hashes detect description vs metadata change", () => {
  const prev = { summary: "S", priority: "Medium", labels: [] };
  const next = { summary: "S", priority: "Medium", labels: [] };

  // Only meta changed
  let changed = lib.diffFields({
    prev, next,
    prevBodyHash: "B1", newBodyHash: "B1",
    prevMetaHash: "M1", newMetaHash: "M2",
  });
  assert.deepEqual(changed, ["metadata"]);

  // Body changed
  changed = lib.diffFields({
    prev, next,
    prevBodyHash: "B1", newBodyHash: "B2",
    prevMetaHash: "M1", newMetaHash: "M1",
  });
  assert.deepEqual(changed, ["description"]);
});

// ---------------------------------------------------------------------------
// hashBody / hashMeta
// ---------------------------------------------------------------------------
test("hashBody — stable across runs, differs on body change", () => {
  const args = { body: "## Epic Goal\n\nFoo.\n", prdBbUrl: null, epicBbUrl: null };
  const h1 = lib.hashBody(args);
  const h2 = lib.hashBody(args);
  assert.equal(h1, h2);
  const h3 = lib.hashBody({ ...args, body: "## Epic Goal\n\nBar.\n" });
  assert.notEqual(h1, h3);
});

test("hashMeta — depends only on epic_type/prd_source/sprints/status", () => {
  const h1 = lib.hashMeta({ epic_type: "X", prd_source: "p.md", estimated_sprints: 3, status: "todo", labels: ["a"] });
  const h2 = lib.hashMeta({ epic_type: "X", prd_source: "p.md", estimated_sprints: 3, status: "todo", labels: ["b"] });
  assert.equal(h1, h2, "labels must not affect meta hash");
  const h3 = lib.hashMeta({ epic_type: "Y", prd_source: "p.md", estimated_sprints: 3, status: "todo" });
  assert.notEqual(h1, h3);
});

// ---------------------------------------------------------------------------
// extractStoriesTable / storiesTableToAdf
// ---------------------------------------------------------------------------
test("extractStoriesTable — parses pipe-table rows under Stories Breakdown", () => {
  const body = `## Epic Goal\n\nGoal.\n\n## Stories Breakdown\n\n| ID | Title | Effort |\n|----|-------|--------|\n| 1.1 | Setup | 2h |\n| 1.2 | Build | 4h |\n\n## Other\n\nx\n`;
  const rows = lib.extractStoriesTable(body);
  assert.deepEqual(rows[0], ["ID", "Title", "Effort"]);
  assert.deepEqual(rows[1], ["1.1", "Setup", "2h"]);
  assert.equal(rows.length, 3);
});

test("extractStoriesTable — returns null when section missing", () => {
  assert.equal(lib.extractStoriesTable("# Hello\n"), null);
});

test("storiesTableToAdf — emits ADF table with header + body", () => {
  const adf = lib.storiesTableToAdf([
    ["ID", "Title"],
    ["1.1", "Setup"],
  ]);
  assert.equal(adf.type, "table");
  assert.equal(adf.content.length, 2);
  assert.equal(adf.content[0].content[0].type, "tableHeader");
  assert.equal(adf.content[1].content[0].type, "tableCell");
});

// ---------------------------------------------------------------------------
// buildDescriptionAdf
// ---------------------------------------------------------------------------
test("buildDescriptionAdf — produces ADF doc with epic sections + stories table", () => {
  const doc = lib.buildDescriptionAdf({
    body: "## Epic Goal\n\nGoal text.\n\n## Epic Description\n\nDesc.\n\n## Stories Breakdown\n\n| ID | Title |\n|----|-------|\n| 1 | A |\n",
    frontmatter: { epic_type: "foundation", prd_source: "p.md", estimated_sprints: 2 },
    prdBbUrl: "https://bitbucket.org/o/r/src/main/p.md",
    epicBbUrl: "https://bitbucket.org/o/r/src/main/e.md",
    changelogEntries: ["| 2026-04-28 09:40 | Initial Jira epic created |"],
  });
  assert.equal(doc.type, "doc");
  const headings = doc.content.filter(n => n.type === "heading").map(h => h.content[0].text);
  assert.ok(headings.includes("Change Log"));
  assert.ok(headings.includes("Source Documents"));
  assert.ok(headings.includes("Epic Goal"));
  assert.ok(headings.includes("Epic Description"));
  assert.ok(headings.includes("Metadata"));
  assert.ok(headings.includes("Stories Breakdown"));
  assert.ok(headings.includes("Story Requirements"));
});

test("buildDescriptionAdf — strips ** ** markers from Epic Description", () => {
  const doc = lib.buildDescriptionAdf({
    body: "## Epic Description\n\n**Existing System Context:** baseline.\n",
    frontmatter: {},
    prdBbUrl: null, epicBbUrl: null,
    changelogEntries: [],
  });
  const text = JSON.stringify(doc);
  assert.doesNotMatch(text, /\*\*Existing System Context:\*\*/);
  assert.match(text, /Existing System Context:/);
});

// ---------------------------------------------------------------------------
// resolvePrdPath
// ---------------------------------------------------------------------------
test("resolvePrdPath — null on empty input", () => {
  assert.equal(lib.resolvePrdPath(null, "/tmp"), null);
  assert.equal(lib.resolvePrdPath("", "/tmp"), null);
});

test("resolvePrdPath — non-existent path returns null without throwing", () => {
  assert.equal(lib.resolvePrdPath("docs/prd/no.md", "/nonexistent-root-xyz"), null);
});

// ---------------------------------------------------------------------------
// mapStatus
// ---------------------------------------------------------------------------
test("mapStatus — strips emoji and maps to Jira canonical status", () => {
  assert.equal(lib.mapStatus("📝 planned"), "To Do");
  assert.equal(lib.mapStatus("🚀 in progress"), "In Progress");
  assert.equal(lib.mapStatus("✅ done"), "Done");
  assert.equal(lib.mapStatus("Unknown"), "Unknown");
  assert.equal(lib.mapStatus(null), null);
});

// ---------------------------------------------------------------------------
// syncLabelFor
// ---------------------------------------------------------------------------
test("syncLabelFor — derives label from epic dir name", () => {
  const fp = path.resolve("/x/docs/prd/foo/epics/epic.1.foundation/epic.1.foundation.md");
  assert.equal(lib.syncLabelFor(fp), "synced-from-epic.1.foundation");
});

// ---------------------------------------------------------------------------
// upsertFrontmatterKeys (lib re-export)
// ---------------------------------------------------------------------------
test("upsertFrontmatterKeys — updates jira_key in place", () => {
  const src = `---\ntitle: "X"\njira_key: "OLD-1"\n---\n\nbody\n`;
  const out = lib.upsertFrontmatterKeys(src, { jira_key: "PROJ-99" });
  assert.match(out, /jira_key: "PROJ-99"/);
  assert.doesNotMatch(out, /OLD-1/);
});

// ---------------------------------------------------------------------------
// parseJiraError
// ---------------------------------------------------------------------------
test("parseJiraError — extracts errorMessages and field errors", async () => {
  const fake = {
    text: async () => JSON.stringify({
      errorMessages: ["Project not found"],
      errors: { customfield_10011: "Field required for create" },
    }),
  };
  const msg = await lib.parseJiraError(fake);
  assert.match(msg, /Project not found/);
  assert.match(msg, /customfield_10011/);
});

// ---------------------------------------------------------------------------
// EPIC_SECTIONS
// ---------------------------------------------------------------------------
test("EPIC_SECTIONS — exposes Epic Goal + Epic Description", () => {
  assert.deepEqual(lib.EPIC_SECTIONS, ["Epic Goal", "Epic Description"]);
});

// ---------------------------------------------------------------------------
// VERSION export + constants
// ---------------------------------------------------------------------------
test("VERSION — semver string exported", () => {
  assert.match(lib.VERSION, /^\d+\.\d+\.\d+$/);
});

test("CHANGELOG_DESCRIPTION_LIMIT — positive integer", () => {
  assert.ok(Number.isInteger(lib.CHANGELOG_DESCRIPTION_LIMIT) && lib.CHANGELOG_DESCRIPTION_LIMIT > 0);
});

test("STORY_REQUIREMENTS_TEXT — non-empty string referencing co-location", () => {
  assert.equal(typeof lib.STORY_REQUIREMENTS_TEXT, "string");
  assert.ok(lib.STORY_REQUIREMENTS_TEXT.length > 0);
});

// ---------------------------------------------------------------------------
// inlineToAdfNodes
// ---------------------------------------------------------------------------
test("inlineToAdfNodes — plain text → single text node", () => {
  const nodes = lib.inlineToAdfNodes("Just text");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, "text");
  assert.equal(nodes[0].text, "Just text");
});

test("inlineToAdfNodes — markdown link → text + link node", () => {
  const nodes = lib.inlineToAdfNodes("See [Story 1.1](https://example.com/x) here");
  assert.equal(nodes.length, 3);
  assert.equal(nodes[0].text, "See ");
  assert.equal(nodes[1].text, "Story 1.1");
  assert.equal(nodes[1].marks?.[0]?.type, "link");
  assert.equal(nodes[1].marks?.[0]?.attrs?.href, "https://example.com/x");
  assert.equal(nodes[2].text, " here");
});

test("inlineToAdfNodes — multiple links in one string", () => {
  const nodes = lib.inlineToAdfNodes("[a](u1) and [b](u2)");
  const linked = nodes.filter(n => n.marks?.[0]?.type === "link");
  assert.equal(linked.length, 2);
  assert.equal(linked[0].marks[0].attrs.href, "u1");
  assert.equal(linked[1].marks[0].attrs.href, "u2");
});

test("inlineToAdfNodes — empty string → single empty text node", () => {
  const nodes = lib.inlineToAdfNodes("");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].text, "");
});

// ---------------------------------------------------------------------------
// splitTableRow
// ---------------------------------------------------------------------------
test("splitTableRow — leading/trailing pipes stripped", () => {
  assert.deepEqual(lib.splitTableRow("| a | b | c |"), ["a", "b", "c"]);
});

test("splitTableRow — bare-pipe row (no surround pipes)", () => {
  assert.deepEqual(lib.splitTableRow("a | b | c"), ["a", "b", "c"]);
});

test("splitTableRow — escaped \\| preserved as literal pipe inside cell", () => {
  assert.deepEqual(lib.splitTableRow("| left \\| right | next |"), ["left | right", "next"]);
});

// ---------------------------------------------------------------------------
// extractStoriesTable — separator edge cases
// ---------------------------------------------------------------------------
test("extractStoriesTable — separator with colons (alignment markers)", () => {
  const body = "## Stories Breakdown\n\n| ID | Title |\n|:---|:------:|\n| 1.1 | A |\n";
  const rows = lib.extractStoriesTable(body);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[1], ["1.1", "A"]);
});

test("extractStoriesTable — table with inline link in cell", () => {
  const body = "## Stories Breakdown\n\n| ID | Story |\n|----|-------|\n| 1.1 | [link](https://x) |\n";
  const rows = lib.extractStoriesTable(body);
  assert.equal(rows[1][1], "[link](https://x)");
});

test("storiesTableToAdf — link in cell renders as ADF link mark", () => {
  const adf = lib.storiesTableToAdf([["ID", "Story"], ["1.1", "[Story 1.1](https://example.com)"]]);
  const cellPara = adf.content[1].content[1].content[0];
  const linkNode = cellPara.content.find(n => n.marks?.[0]?.type === "link");
  assert.ok(linkNode, "expected link node in cell paragraph");
  assert.equal(linkNode.marks[0].attrs.href, "https://example.com");
});

// ---------------------------------------------------------------------------
// mapStatus — extended canonical mappings
// ---------------------------------------------------------------------------
test("mapStatus — backlog and review variants", () => {
  assert.equal(lib.mapStatus("backlog"), "To Do");
  assert.equal(lib.mapStatus("in review"), "In Review");
  assert.equal(lib.mapStatus("ready for review"), "In Review");
  assert.equal(lib.mapStatus("ready"), "Ready");
});

test("mapStatus — won't do variants normalise", () => {
  assert.equal(lib.mapStatus("won't do"), "Won't Do");
  assert.equal(lib.mapStatus("wont do"), "Won't Do");
});

// ---------------------------------------------------------------------------
// findExistingByLabel — POST /search/jql shape
// ---------------------------------------------------------------------------
test("findExistingByLabel — POSTs to /rest/api/3/search/jql with JSON body", async () => {
  const calls = [];
  const fakeHttp = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      json: async () => ({ issues: [{ key: "PROJ-42", fields: { updated: "2026-04-28T09:00:00.000+0000" } }] }),
    };
  };
  const result = await lib.findExistingByLabel({
    http: fakeHttp, baseUrl: "https://x.atlassian.net",
    email: "a@b", token: "t", projectKey: "RB", label: "synced-from-epic.1.foo",
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/api\/3\/search\/jql$/);
  assert.equal(calls[0].opts.method, "POST");
  const body = JSON.parse(calls[0].opts.body);
  assert.match(body.jql, /project = "RB"/);
  assert.match(body.jql, /labels = "synced-from-epic.1.foo"/);
  assert.deepEqual(body.fields, ["summary", "updated"]);
  assert.equal(result.key, "PROJ-42");
  assert.equal(result.updated, "2026-04-28T09:00:00.000+0000");
});

test("findExistingByLabel — empty issues array returns null", async () => {
  const fakeHttp = async () => ({ ok: true, json: async () => ({ issues: [] }) });
  const result = await lib.findExistingByLabel({
    http: fakeHttp, baseUrl: "x", email: "a", token: "t", projectKey: "RB", label: "L",
  });
  assert.equal(result, null);
});

test("findExistingByLabel — non-OK response returns null", async () => {
  const fakeHttp = async () => ({ ok: false, status: 410, text: async () => "Gone" });
  const result = await lib.findExistingByLabel({
    http: fakeHttp, baseUrl: "x", email: "a", token: "t", projectKey: "RB", label: "L",
  });
  assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// fetchUpdatedTimestamp — non-throwing
// ---------------------------------------------------------------------------
test("fetchUpdatedTimestamp — returns null on non-OK without throwing", async () => {
  const fakeHttp = async () => ({ ok: false, status: 500 });
  const ts = await lib.fetchUpdatedTimestamp({
    http: fakeHttp, baseUrl: "x", email: "a", token: "t", issueKey: "PROJ-1",
  });
  assert.equal(ts, null);
});

test("fetchUpdatedTimestamp — returns timestamp on success", async () => {
  const fakeHttp = async () => ({
    ok: true,
    json: async () => ({ fields: { updated: "2026-04-28T10:00:00.000+0000" } }),
  });
  const ts = await lib.fetchUpdatedTimestamp({
    http: fakeHttp, baseUrl: "x", email: "a", token: "t", issueKey: "PROJ-1",
  });
  assert.equal(ts, "2026-04-28T10:00:00.000+0000");
});

test("fetchUpdatedTimestamp — swallows http throws and returns null", async () => {
  const fakeHttp = async () => { throw new Error("network blew up"); };
  const ts = await lib.fetchUpdatedTimestamp({
    http: fakeHttp, baseUrl: "x", email: "a", token: "t", issueKey: "PROJ-1",
  });
  assert.equal(ts, null);
});

// ---------------------------------------------------------------------------
// guardConcurrentEdit
// ---------------------------------------------------------------------------
test("guardConcurrentEdit — no-op when no lastSyncedAt", () => {
  assert.doesNotThrow(() => lib.guardConcurrentEdit({
    jiraUpdated: "2026-04-28T10:00:00.000+0000",
    lastSyncedAt: null,
  }));
});

test("guardConcurrentEdit — throws when Jira newer than local", () => {
  assert.throws(() => lib.guardConcurrentEdit({
    jiraUpdated: "2026-04-28T11:00:00.000+0000",
    lastSyncedAt: "2026-04-28T10:00:00.000+0000",
  }), /updated since last local sync/);
});

test("guardConcurrentEdit — passes when Jira older or equal", () => {
  assert.doesNotThrow(() => lib.guardConcurrentEdit({
    jiraUpdated: "2026-04-28T09:00:00.000+0000",
    lastSyncedAt: "2026-04-28T10:00:00.000+0000",
  }));
});

test("guardConcurrentEdit — --force overrides and warns", () => {
  const warns = [];
  assert.doesNotThrow(() => lib.guardConcurrentEdit({
    jiraUpdated: "2026-04-28T11:00:00.000+0000",
    lastSyncedAt: "2026-04-28T10:00:00.000+0000",
    force: true,
    output: { warn: m => warns.push(m) },
  }));
  assert.equal(warns.length, 1);
  assert.match(warns[0], /--force in effect/);
});

// ---------------------------------------------------------------------------
// collectCreateFields / collectUpdateFields
// ---------------------------------------------------------------------------
test("collectCreateFields — includes project + issuetype on create", () => {
  const fields = lib.collectCreateFields({
    args: {}, frontmatter: {}, descAdf: { type: "doc", content: [] },
    livePriorities: null, output: { warn: () => {} },
    syncLabel: "synced-from-epic.1.x", summary: "S",
    epicTypeId: "10001", projectKey: "RB",
  });
  assert.equal(fields.project.key, "RB");
  assert.equal(fields.issuetype.id, "10001");
  assert.equal(fields.summary, "S");
  assert.ok(fields.labels.includes("synced-from-epic.1.x"));
});

test("collectUpdateFields — omits project + issuetype (Jira refuses on PUT)", () => {
  const fields = lib.collectUpdateFields({
    args: {}, frontmatter: {}, descAdf: { type: "doc", content: [] },
    livePriorities: null, output: { warn: () => {} },
    syncLabel: "synced-from-epic.1.x", summary: "S",
  });
  assert.equal(fields.project, undefined);
  assert.equal(fields.issuetype, undefined);
  assert.ok(fields.labels.includes("synced-from-epic.1.x"));
});

test("collectCommonFields — preserves user-supplied labels and adds sync label", () => {
  const fields = lib.collectCommonFields({
    args: { labels: "alpha,beta" }, frontmatter: {},
    descAdf: { type: "doc", content: [] },
    livePriorities: null, output: { warn: () => {} },
    syncLabel: "synced-from-epic.1.x", summary: "S",
  });
  assert.ok(fields.labels.includes("alpha"));
  assert.ok(fields.labels.includes("beta"));
  assert.ok(fields.labels.includes("synced-from-epic.1.x"));
});

test("collectCommonFields — does not duplicate sync label if already present", () => {
  const fields = lib.collectCommonFields({
    args: { labels: "synced-from-epic.1.x,other" }, frontmatter: {},
    descAdf: { type: "doc", content: [] },
    livePriorities: null, output: { warn: () => {} },
    syncLabel: "synced-from-epic.1.x", summary: "S",
  });
  const count = fields.labels.filter(l => l === "synced-from-epic.1.x").length;
  assert.equal(count, 1);
});

// ---------------------------------------------------------------------------
// buildDescriptionAdf — Change Log cap
// ---------------------------------------------------------------------------
test("buildDescriptionAdf — Change Log cap limits rendered rows", () => {
  const entries = [];
  for (let i = 0; i < lib.CHANGELOG_DESCRIPTION_LIMIT + 5; i++) {
    entries.push(`| 2026-04-${String((i % 28) + 1).padStart(2, "0")} 09:00 | entry ${i} |`);
  }
  const doc = lib.buildDescriptionAdf({
    body: "## Epic Goal\n\nx.\n",
    frontmatter: {},
    prdBbUrl: null, epicBbUrl: null,
    changelogEntries: entries,
  });
  const tables = doc.content.filter(n => n.type === "table");
  const cl = tables[0];
  assert.equal(cl.content.length, lib.CHANGELOG_DESCRIPTION_LIMIT + 1);
  const lastRowText = JSON.stringify(cl.content[cl.content.length - 1]);
  assert.match(lastRowText, /entry \d+/);
  assert.doesNotMatch(lastRowText, /entry 0\b/);
});

// ---------------------------------------------------------------------------
// parseArgs — --version / --verbose
// ---------------------------------------------------------------------------
// parseArgs expects full process.argv (slices index 2+).
test("parseArgs — --version flag set", () => {
  const args = lib.parseArgs(["node", "sync-jira-epic.js", "--version"]);
  assert.equal(args.version, true);
});

test("parseArgs — -V short form sets version", () => {
  const args = lib.parseArgs(["node", "sync-jira-epic.js", "-V"]);
  assert.equal(args.version, true);
});

test("parseArgs — --verbose flag set", () => {
  const args = lib.parseArgs(["node", "sync-jira-epic.js", "--verbose"]);
  assert.equal(args.verbose, true);
});

test("parseArgs — -v short form sets verbose", () => {
  const args = lib.parseArgs(["node", "sync-jira-epic.js", "-v"]);
  assert.equal(args.verbose, true);
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
