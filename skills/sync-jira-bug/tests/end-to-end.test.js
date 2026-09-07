/**
 * End-to-end: sync a bug twice against a fake Jira, then READ THE ADF BACK.
 *
 * The acceptance criterion for this skill is stated in terms of what the API
 * holds, not what a page renders: a bug card whose description carries live
 * links to its bug file, its parent document and its parent's card, and whose
 * second run changes nothing.
 *
 * The measured failure this skill exists to fix was invisible from the rendered
 * page. On a live board, bug card RAPP-713 and its siblings RAPP-706/707/708
 * each had a description whose ADF contained **zero** `link` marks — the bug
 * report was a bare plain-text path — with `parent: null` and an empty
 * `remotelink` list. The card looked fine and linked to nothing.
 *
 * So these tests assert against the JSON the script actually PUT/POSTed, which
 * is the same bytes `GET /issue/{key}?fields=description` would return. They do
 * not stand in for the live run against a real tenant — a fake Jira cannot prove
 * a real board accepts the payload — but they do prove the half that was broken.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const bugSync = require("../scripts/sync-jira-bug.js");

// The fake Jira, the ADF readers and the repo/runner helpers are shared with
// the story, task and epic end-to-end suites. Source of truth:
// shared/resources/fake-jira.js, vendored here by `npm run bundle`.
const {
  BB,
  BASE,
  fakeJira,
  hrefsIn,
  descriptionOf,
  gitRepo,
  makeRunner,
} = require("../references/fake-jira.js");

const BUG_MD = `---
type: bug
status: in-progress
severity: 'Major'
priority: 'High'
created: 2026-09-07
related: 'story 7.4'
description: 'Tap target below the 44px minimum'
---

# Bug: Tap target below the 44px minimum

## Bug Description

The primary control renders at 24px, below the 44px minimum. It violates
[the story](./story.7.4.tap-targets.md) acceptance criteria.

## Reproduction Steps

1. Open the checkout screen.
2. Measure the confirm control.

## Acceptance Criteria Violation

- AC-3 requires a 44px minimum tap target.

## Status History

| Date       | Status | Changed By | Notes       |
| ---------- | ------ | ---------- | ----------- |
| 2026-09-01 | new    | QA         | Bug created |

## Resolution Summary

[Will be completed when bug is closed]
`;

// ---------------------------------------------------------------------------
// A repo on disk, because the script resolves paths and links from a real tree.
// ---------------------------------------------------------------------------
function repoWithStoryBug() {
  const root = gitRepo("bug-e2e-", {
    "docs/prd/epic.7.checkout.md": "---\ntype: epic\n---\n\n# Epic 7\n",
    "docs/prd/epic-7/story.7.4.tap-targets.md":
      "---\ntype: story\njira_key: PROJ-123\nepic_source: ../epic.7.checkout.md\n---\n\n# Story 7.4\n",
    "docs/prd/epic-7/story.7.4.bug.4.review.1.tap-target.md": "# Bug review\n",
    "docs/prd/epic-7/story.7.4.bug.4.tap-target.md": BUG_MD,
  });
  return {
    root,
    bug: path.join(root, "docs/prd/epic-7/story.7.4.bug.4.tap-target.md"),
  };
}

const runSync = makeRunner({
  module: bugSync,
  cliName: "sync-jira-bug",
});

// ===========================================================================
// The acceptance criterion
// ===========================================================================

test("a story bug synced twice produces ONE card, fully linked, and the second run changes nothing", async () => {
  const { root, bug } = repoWithStoryBug();
  const { state, fetchImpl } = fakeJira();

  // ---- first run: create -------------------------------------------------
  const first = await runSync(root, bug, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;
  assert.equal(key, "PROJ-901");
  assert.equal(first.isUpdate, false);

  // ---- the ADF, read back ------------------------------------------------
  const hrefs = hrefsIn(descriptionOf(state, key));
  assert.ok(
    hrefs.length >= 4,
    `expected >= 4 link marks in the description ADF, got ${hrefs.length}: ${JSON.stringify(hrefs, null, 2)}`,
  );

  const relPath = (p) => `${BB}/src/develop/${p}`;
  for (const want of [
    relPath("docs/prd/epic-7/story.7.4.bug.4.tap-target.md"), // the bug file
    relPath("docs/prd/epic-7/story.7.4.tap-targets.md"), // the parent story doc
    `${BASE}/browse/PROJ-123`, // the parent's CARD
    relPath("docs/prd/epic.7.checkout.md"), // the epic doc
  ]) {
    assert.ok(
      hrefs.includes(want),
      `the card does not link ${want}\nlinks were:\n${hrefs.join("\n")}`,
    );
  }

  // Not one relative or plain-text path survived into the published ADF — the
  // exact defect measured on RAPP-713.
  assert.ok(
    hrefs.every((h) => /^https?:\/\//.test(h)),
    `a non-absolute href reached the card: ${hrefs.filter((h) => !/^https?:\/\//.test(h))}`,
  );

  // ---- the issue link ----------------------------------------------------
  assert.equal(state.links.length, 1);
  assert.deepEqual(state.links[0], {
    type: { name: "Relates" },
    inwardIssue: { key },
    outwardIssue: { key: "PROJ-123" },
  });
  assert.equal(first.linkOutcome.linked, true);

  // ---- the local file ----------------------------------------------------
  const afterFirst = fs.readFileSync(bug, "utf-8");
  assert.match(afterFirst, /^jira_key: "?PROJ-901"?$/m);
  assert.match(afterFirst, /^\*\*Jira\*\*: \[PROJ-901\]/m);
  assert.match(
    afterFirst,
    /\| .* \| in-progress \| sync-jira-bug \| Jira bug created \(PROJ-901\) \|/,
  );

  // ---- second run: no-op -------------------------------------------------
  const before = fs.readFileSync(bug, "utf-8");
  const linksBefore = state.links.length;
  const second = await runSync(root, bug, fetchImpl, ["--quiet"]);

  assert.equal(second.isUpdate, true, "the second run created a second card");
  assert.equal(second.result.issueKey, key);
  assert.equal(
    second.changeSummary,
    "Sync (no field changes detected)",
    "the second run thought something had changed",
  );
  assert.equal(second.linkOutcome.reason, "already");
  assert.equal(
    state.links.length,
    linksBefore,
    "a duplicate issue link was created",
  );
  assert.equal(
    Object.keys(state.issues).length,
    1,
    "a second card was created",
  );

  // The bug file is byte-identical apart from the refreshed sync timestamp,
  // which moves because the fake Jira's `updated` moves on every PUT.
  const after = fs.readFileSync(bug, "utf-8");
  const strip = (t) => t.replace(/^jira_last_synced_at:.*$/m, "");
  assert.equal(
    strip(after),
    strip(before),
    "the second run rewrote the document",
  );

  // And the description it holds is the same document as before.
  assert.deepEqual(hrefsIn(descriptionOf(state, key)), hrefs);
});

test("deleting jira_key adopts the existing card instead of creating a second", async () => {
  // The synced-from-* label search is the sole guarantor of idempotent create
  // when the write-back does not happen.
  const { root, bug } = repoWithStoryBug();
  const { state, fetchImpl } = fakeJira();

  await runSync(root, bug, fetchImpl, ["--quiet"]);
  assert.equal(Object.keys(state.issues).length, 1);

  fs.writeFileSync(
    bug,
    fs.readFileSync(bug, "utf-8").replace(/^jira_key:.*\n/m, ""),
    "utf-8",
  );

  const again = await runSync(root, bug, fetchImpl, ["--quiet"]);
  assert.equal(
    Object.keys(state.issues).length,
    1,
    "the label search failed to adopt the existing card",
  );
  assert.equal(again.result.issueKey, "PROJ-901");
});

test("a general bug's card links the bug report and the registry, and takes no issue link", async () => {
  const dir = gitRepo("bug-e2e-gen-", {
    "docs/bugs/bug-registry.md": "# Bug Registry\n",
  });
  const bug = path.join(dir, "docs/bugs/bug.12.a-thing/bug.12.a-thing.md");
  fs.mkdirSync(path.dirname(bug), { recursive: true });
  fs.writeFileSync(
    bug,
    `---
type: bug
status: new
severity: 'Minor'
priority: 'Low'
created: 2026-09-07
related: 'none — cross-cutting (no single owner)'
description: 'A cross-cutting thing'
---

# Bug: A cross-cutting thing

## Bug Description

It is broken everywhere.

## Reproduction Steps

1. Look.

## Scope & Impact

- Affects every screen.
`,
  );

  const { state, fetchImpl } = fakeJira();
  const res = await runSync(dir, bug, fetchImpl, ["--quiet"]);
  const hrefs = hrefsIn(descriptionOf(state, res.result.issueKey));

  assert.deepEqual(hrefs, [
    `${BB}/src/develop/docs/bugs/bug.12.a-thing/bug.12.a-thing.md`,
    `${BB}/src/develop/docs/bugs/bug-registry.md`,
  ]);
  assert.equal(state.links.length, 0, "a cross-cutting bug was given a parent");
  assert.equal(res.linkOutcome, null);
});

test("a bug with NO frontmatter is created, keyed, and converges on the second run", async () => {
  const dir = gitRepo("bug-e2e-nf-", {
    "docs/tasks/task.67.qa-gate/task.67.qa-gate.md":
      "---\ntype: task\njira_key: PROJ-500\n---\n\n# Task 67\n",
    "docs/tasks/task.67.qa-gate/task.67.bug.3.names.md": `# Bug: Obfuscated names

**Bug ID**: task.67.bug.3
**Related**: task 67
**Status**: 🔄 In Progress
**Priority**: High
**Severity**: Major
**Created**: 2026-07-21

## Bug Description

Names are obfuscated.

## Reproduction Steps

1. Run it.

## Success Criteria Violation

- SC-2 is not met.
`,
  });
  const bug = path.join(
    dir,
    "docs/tasks/task.67.qa-gate/task.67.bug.3.names.md",
  );
  const originalBody = fs.readFileSync(bug, "utf-8");

  const { state, fetchImpl } = fakeJira();
  const first = await runSync(dir, bug, fetchImpl, ["--quiet"]);

  const written = fs.readFileSync(bug, "utf-8");
  assert.ok(written.startsWith("---\n"), "frontmatter was not adopted");
  assert.match(written, /^jira_key: "?PROJ-901"?$/m);
  assert.match(
    written,
    /^status: "?in-progress"?$/m,
    "the emoji status was not mapped",
  );
  assert.match(written, /^severity: "?Major"?$/m);

  // The body survived verbatim apart from the two upserted link lines.
  const body = written
    .slice(written.indexOf("\n---\n", 3) + 5)
    .replace(/^\n+/, "");
  const stripped = body
    .replace(/^\*\*Jira\*\*:.*\n/m, "")
    .replace(/^\*\*Bug File\*\*:.*\n/m, "")
    .replace(/## Status History[\s\S]*$/m, "")
    .replace(/\n{3,}/g, "\n\n");
  assert.equal(stripped.trim(), originalBody.trim());

  // Linked to the parent task's card, and the card links the task document.
  assert.equal(state.links[0].outwardIssue.key, "PROJ-500");
  const hrefs = hrefsIn(descriptionOf(state, first.result.issueKey));
  assert.ok(hrefs.includes(`${BASE}/browse/PROJ-500`));
  assert.ok(
    hrefs.includes(
      `${BB}/src/develop/docs/tasks/task.67.qa-gate/task.67.qa-gate.md`,
    ),
  );

  // Second run converges: one card, one link, no new history row.
  const before = fs.readFileSync(bug, "utf-8");
  const second = await runSync(dir, bug, fetchImpl, ["--quiet"]);
  assert.equal(Object.keys(state.issues).length, 1);
  assert.equal(state.links.length, 1);
  assert.equal(second.changeSummary, "Sync (no field changes detected)");
  const strip = (t) => t.replace(/^jira_last_synced_at:.*$/m, "");
  assert.equal(strip(fs.readFileSync(bug, "utf-8")), strip(before));
});

test("a parent with no card links the document only, and the link lands on a later run", async () => {
  const { root, bug } = repoWithStoryBug();
  const story = path.join(root, "docs/prd/epic-7/story.7.4.tap-targets.md");
  fs.writeFileSync(
    story,
    fs.readFileSync(story, "utf-8").replace(/^jira_key:.*\n/m, ""),
  );

  const { state, fetchImpl } = fakeJira();
  const first = await runSync(root, bug, fetchImpl, ["--quiet"]);

  assert.equal(
    state.links.length,
    0,
    "a link was made to a card that does not exist",
  );
  assert.equal(first.linkOutcome, null);
  const hrefs = hrefsIn(descriptionOf(state, first.result.issueKey));
  assert.ok(
    hrefs.includes(
      `${BB}/src/develop/docs/prd/epic-7/story.7.4.tap-targets.md`,
    ),
    "the parent document was not linked either",
  );
  assert.ok(!hrefs.some((h) => h.includes("/browse/PROJ-123")));

  // The parent gets its card later; the bug's next sync is what connects them.
  fs.writeFileSync(
    story,
    fs
      .readFileSync(story, "utf-8")
      .replace("type: story", "type: story\njira_key: PROJ-123"),
  );
  const second = await runSync(root, bug, fetchImpl, ["--quiet"]);
  assert.equal(second.linkOutcome.linked, true);
  assert.equal(state.links.length, 1);
  assert.ok(
    hrefsIn(descriptionOf(state, first.result.issueKey)).includes(
      `${BASE}/browse/PROJ-123`,
    ),
    "the card link was made but the description was not refreshed",
  );
});
