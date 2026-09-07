"use strict";

/**
 * End-to-end: sync a story twice against a fake Jira, then READ THE PAYLOAD BACK.
 *
 * Same two convergence defects as the task and epic suites — see
 * `skills/sync-jira-task/tests/end-to-end.test.js` for the full account.
 *
 * Story differs from its siblings in one way that matters here: it *does* have
 * a skip-when-no-diff gate (`skippedNoChanges`), so the PUT count is
 * assertable. Two consecutive syncs of an unchanged document should issue one
 * PUT, not two. That assertion is the one the change summary cannot make on its
 * own — suppressing the message without fixing the diff would leave the summary
 * clean and the write still firing.
 *
 * Run: node --test skills/sync-jira-story/tests/end-to-end.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const storySync = require("../scripts/sync-jira-story.js");
const {
  fakeJira,
  gitRepo,
  makeRunner,
  putCount,
  descriptionOf,
} = require("../references/fake-jira.js");

const runSync = makeRunner({ module: storySync, cliName: "sync-jira-story" });

const EPIC_MD = `---
type: epic
jira_key: PROJ-500
---

# Epic 7: Checkout
`;

const STORY_MD = `---
type: story
status: in-progress
priority: High
jira_epic: PROJ-500
epic_source: ../epic.7.checkout.md
created: 2026-09-07
updated: 2026-09-07
description: "Tap targets meet the 44px minimum"
---

# Story 7.4: Tap targets meet the 44px minimum

**Status:** In Progress

## Story

As a shopper, I want controls I can actually hit, so that checkout does not
fail on a mis-tap.

## Acceptance Criteria

1. Every interactive control is at least 44px in its smallest dimension.
2. The confirm control is measured in the regression suite.

## Tasks / Subtasks

- [ ] Measure the current controls
- [ ] Raise the ones below the minimum

## Dev Notes

The confirm control currently renders at 24px.

## Change Log

| Date       | Version | Description   | Author       |
| ---------- | ------- | ------------- | ------------ |
| 2026-09-07 | 1.0     | Initial draft | create-story |
`;

function repoWithStory() {
  const dir = "docs/prd/epic-7";
  const root = gitRepo("story-e2e-", {
    "docs/prd/epic.7.checkout.md": EPIC_MD,
    [`${dir}/story.7.4.tap-targets.md`]: STORY_MD,
  });
  return { root, story: path.join(root, dir, "story.7.4.tap-targets.md") };
}

// ===========================================================================
// Defect 1 — the label diff, and the PUT it fires
// ===========================================================================

test("a story synced twice reports no field changes and issues no second PUT", async () => {
  const { root, story } = repoWithStory();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, story, fetchImpl, ["--quiet"]);
  assert.equal(first.isUpdate, false, "the first run should have created");
  const key = first.result.issueKey;
  assert.match(key, /^PROJ-\d+$/);

  const syncLabel = (state.issues[key].fields.labels || []).find((l) =>
    l.startsWith("synced-from-"),
  );
  assert.ok(
    syncLabel,
    "the create payload should carry a synced-from-* label — " +
      "without it there is no divergence to test",
  );

  const before = fs.readFileSync(story, "utf-8");

  const second = await runSync(root, story, fetchImpl, ["--quiet"]);

  assert.equal(second.result.issueKey, key);
  assert.equal(
    Object.keys(state.issues).length,
    1,
    "a second card was created",
  );

  // THE ASSERTION. Before the fix this reads "Updated: labels", because the
  // diff compares a frontmatter rebuild (no sync label) against a Jira issue
  // that has one.
  assert.equal(
    second.changeSummary,
    "Sync (no field changes detected)",
    "the second run thought something had changed",
  );

  // And the counter-assertion: the skip gate must actually skip the write.
  // Asserting the count, never the wall-clock — a timing assertion here would
  // be load-flaky.
  // The literal, not a delta against the create: creating is a POST, so the
  // expected count is exactly 0 and saying so is stronger than `0 === 0`.
  assert.equal(
    putCount(state, key),
    0,
    "the second run issued a PUT for a document that had not changed",
  );

  const after = fs.readFileSync(story, "utf-8");
  const strip = (t) => t.replace(/^jira_last_synced_at:.*$/m, "");
  assert.equal(strip(after), strip(before), "the second run rewrote the file");
});

test("--force still pushes a PUT on an unchanged document", async () => {
  const { root, story } = repoWithStory();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, story, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;
  const before = putCount(state, key);

  // Someone blanks the card in the Jira UI. Nothing about the DOCUMENT has
  // changed, so the skip gate would fire — `--force` is the documented
  // override and this is the repair path it exists for.
  state.issues[key].fields.description = {
    type: "doc",
    version: 1,
    content: [],
  };

  await runSync(root, story, fetchImpl, ["--quiet", "--force"]);

  assert.ok(
    putCount(state, key) > before,
    "--force issued no PUT — the skip gate swallowed the override",
  );

  // A PUT is necessary but not sufficient. The two-pass build strips
  // `description` whenever the diff reports no change — which is always true on
  // a forced unchanged sync — so without the `args.force` term the forced write
  // carries only the three fields the diff just proved identical, and repairs
  // nothing. Assert the repair, not just the write.
  const put = state.requests.filter((r) => r.method === "PUT").pop();
  assert.ok(
    "description" in put.body.fields,
    "the forced PUT carried no description — it cannot repair a blanked card",
  );
  assert.ok(
    JSON.stringify(descriptionOf(state, key)).length > 100,
    "the card's description was not restored",
  );

  // And the summary must not read the bare "Updated: " that an unconditional
  // template produces when `changedFields` is empty — which `--force` is the
  // only way to reach. Task and epic have always used a ternary here.
  const forced = await runSync(root, story, fetchImpl, ["--quiet", "--force"]);
  assert.equal(
    forced.changeSummary,
    "Sync (no field changes detected — forced)",
    "a forced sync with no field changes produced a malformed summary",
  );
});

test("a payload-only frontmatter edit is not swallowed by the skip gate", async () => {
  const { root, story } = repoWithStory();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, story, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;

  // `due_date` is carried by the PAYLOAD but compared by neither `diffFields`
  // nor — before this fix — `hashMeta`. Making the skip gate reachable turned
  // an edit to it into a silent no-op that still reported success: the run said
  // "no field changes detected", issued no PUT, and the date never reached the
  // card. Every field the payload sends and the diff does not compare must move
  // the meta hash, or the gate swallows it.
  fs.writeFileSync(
    story,
    fs
      .readFileSync(story, "utf-8")
      .replace("priority: High", "priority: High\ndue_date: 2026-12-01"),
  );

  const second = await runSync(root, story, fetchImpl, ["--quiet"]);

  assert.notEqual(
    second.changeSummary,
    "Sync (no field changes detected)",
    "a due_date edit was reported as no change — the skip gate swallowed it",
  );
  assert.ok(putCount(state, key) > 0, "no PUT was issued for a real edit");
  assert.equal(
    state.issues[key].fields.duedate,
    "2026-12-01",
    "the due date never reached Jira",
  );
});

// ===========================================================================
// Defect 2 — the post-transition timestamp
// ===========================================================================

test("a story whose card transitioned can be synced again without --force", async () => {
  const { root, story } = repoWithStory();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, story, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;

  assert.notEqual(
    state.issues[key].status,
    "To Do",
    "no transition fired — this test cannot see the defect it targets",
  );

  // THE ASSERTION. Before the fix the first run persisted the *pre*-transition
  // `updated`, so this run throws "Jira issue updated since last local sync"
  // over a change this tool made moments earlier.
  const second = await runSync(root, story, fetchImpl, ["--quiet"]);

  assert.equal(second.result.issueKey, key);
  assert.equal(
    second.changeSummary,
    "Sync (no field changes detected)",
    "the second run thought something had changed",
  );
});

// ===========================================================================
// The counterweight — the guard must still catch a REAL concurrent edit
// ===========================================================================

test("a genuine remote edit still trips the concurrent-edit guard", async () => {
  const { root, story } = repoWithStory();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, story, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;

  // Someone else edits the card in the Jira UI.
  state.issues[key].updated = new Date(Date.now() + 60_000).toISOString();

  // Every other test in this file rewards the guard staying quiet. This is the
  // one that stops the fix becoming a worse bug than the defect.
  await assert.rejects(
    () => runSync(root, story, fetchImpl, ["--quiet"]),
    /updated since last local sync/i,
    "the guard did not fire on a genuine remote edit — the fix disabled it",
  );
});
