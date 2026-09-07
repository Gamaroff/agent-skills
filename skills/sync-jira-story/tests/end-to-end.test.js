"use strict";

/**
 * End-to-end: sync a story twice against a fake Jira, then READ THE PAYLOAD BACK.
 *
 * Same two convergence defects as the task and epic suites — see
 * `skills/sync-jira-task/tests/end-to-end.test.js` for the full account.
 *
 * Story differs from its siblings in one way that matters here: it *does* have
 * a skip-when-no-diff gate (`skippedNoChanges` at `:915`), so the PUT count is
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
} = require("../../../tests/lib/fake-jira.js");

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

  const putsAfterCreate = putCount(state, key);
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
  assert.equal(
    putCount(state, key),
    putsAfterCreate,
    "the second run issued a PUT for a document that had not changed",
  );

  const after = fs.readFileSync(story, "utf-8");
  const strip = (t) => t.replace(/^jira_last_synced_at:.*$/m, "");
  assert.equal(strip(after), strip(before), "the second run rewrote the file");
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
