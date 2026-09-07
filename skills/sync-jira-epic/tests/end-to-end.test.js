"use strict";

/**
 * End-to-end: sync an epic twice against a fake Jira, then READ THE PAYLOAD BACK.
 *
 * Same two convergence defects as the story and task suites — see
 * `skills/sync-jira-task/tests/end-to-end.test.js` for the full account.
 *
 * Epic is the careful one, and not for the reason a grep suggests. It already
 * has a post-transition re-read of `updated` — but only inside the skip branch,
 * which is gated on `current && changedFields.length === 0 && !args.force`
 * (`sync-jira-epic.js:948`). Defect 1 guarantees `changedFields` always
 * contains `labels`, so that gate never opens and the correct code behind it is
 * dead. Epic is not half-fixed in practice; it is equally broken, with a fix
 * that cannot run.
 *
 * That is why the skip-path test below asserts the skip path is **entered**
 * (`action === "skip"`), not merely that no abort occurred. A test that only
 * checks for the absence of an abort passes for the wrong reason today — it
 * never reaches the code it is meant to exercise — and would keep passing
 * through a regression.
 *
 * Run: node --test skills/sync-jira-epic/tests/end-to-end.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const epicSync = require("../scripts/sync-jira-epic.js");
const {
  fakeJira,
  gitRepo,
  makeRunner,
  putCount,
} = require("../references/fake-jira.js");

const runSync = makeRunner({ module: epicSync, cliName: "sync-jira-epic" });

const EPIC_MD = `---
type: epic
status: in-progress
priority: High
created: 2026-09-07
updated: 2026-09-07
description: "Checkout flow hardening"
---

# Epic 7: Checkout flow hardening

**Status:** In Progress

## Epic Goal

Make the checkout flow survive a mis-tap, a slow network and a back button.

## Epic Description

Three stories covering tap targets, retry behaviour and navigation state.

## Stories Breakdown

| Story | Title        | Status      |
| ----- | ------------ | ----------- |
| 7.4   | Tap targets  | In Progress |

## Success Criteria

- [ ] Checkout completes on a 3G connection
- [ ] No control below 44px

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-07 | 1.0     | Initial draft | create-epic |
`;

function repoWithEpic() {
  const root = gitRepo("epic-e2e-", {
    "docs/prd/epic.7.checkout.md": EPIC_MD,
  });
  return { root, epic: path.join(root, "docs/prd/epic.7.checkout.md") };
}

// ===========================================================================
// Defect 1 — the label diff, and the PUT it fires
// ===========================================================================

test("an epic synced twice reports no field changes and issues no second PUT", async () => {
  const { root, epic } = repoWithEpic();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, epic, fetchImpl, ["--quiet"]);
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
  const before = fs.readFileSync(epic, "utf-8");

  const second = await runSync(root, epic, fetchImpl, ["--quiet"]);

  // Epic's no-change fast path returns early, before a `result` is built — so
  // `skipped: true` IS the "nothing changed" signal here, where the siblings
  // report it through `changeSummary`.
  assert.equal(
    second.skipped,
    true,
    "the second run thought something had changed",
  );
  assert.equal(
    Object.keys(state.issues).length,
    1,
    "a second card was created",
  );
  assert.equal(
    putCount(state, key),
    putsAfterCreate,
    "the second run issued a PUT for a document that had not changed",
  );

  const after = fs.readFileSync(epic, "utf-8");
  const strip = (t) => t.replace(/^jira_last_synced_at:.*$/m, "");
  assert.equal(strip(after), strip(before), "the second run rewrote the file");
});

// ===========================================================================
// The skip path — asserted on ENTRY, not on the absence of an abort
// ===========================================================================

test("an unchanged epic ENTERS the skip path, reaching the re-read behind its gate", async () => {
  const { root, epic } = repoWithEpic();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, epic, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;

  const second = await runSync(root, epic, fetchImpl, ["--quiet"]);

  // THE ASSERTION THAT MATTERS. `skipped` is set only inside the
  // `changedFields.length === 0` branch at :948. While defect 1 stands,
  // `changedFields` always contains "labels", the gate never opens, and the
  // post-transition re-read at :990 is unreachable. Asserting merely that no
  // abort occurred would pass for the wrong reason.
  assert.equal(
    second.skipped,
    true,
    "the skip path was not entered — the no-change fast path is unreachable, " +
      "so the re-read behind its gate is dead code",
  );
  // And the skip is a real skip: entering the fast path must also mean no PUT.
  // (The previous assertion here compared putCount to itself and was therefore
  // always true — it asserted nothing.)
  assert.equal(
    putCount(state, key),
    0,
    "an update-path PUT was issued on a run that reported itself as skipped",
  );
});

// ===========================================================================
// Defect 2 — the post-transition timestamp on the UPDATE path
// ===========================================================================

test("an epic whose card transitioned can be synced again without --force", async () => {
  const { root, epic } = repoWithEpic();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, epic, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;

  assert.notEqual(
    state.issues[key].status,
    "To Do",
    "no transition fired — this test cannot see the defect it targets",
  );

  // Before the fix this threw "Jira issue updated since last local sync" over
  // the transition the FIRST run performed.
  const second = await runSync(root, epic, fetchImpl, ["--quiet"]);
  assert.equal(
    second.skipped,
    true,
    "the run after a transition did not converge",
  );
});

test("the UPDATE path also refreshes the timestamp after a transition", async () => {
  const { root, epic } = repoWithEpic();
  const { state, fetchImpl } = fakeJira();

  await runSync(root, epic, fetchImpl, ["--quiet"]);

  // Two edits, and BOTH are needed for this test to reach the site it names.
  //
  // The body edit forces the UPDATE path (the body hash moves, so the skip gate
  // does not fire). It must land inside a card section — `Epic Goal` — or the
  // hash does not change at all.
  //
  // The STATUS edit is what makes the update run actually transition. Without
  // it, run 1 has already moved the card to In Progress and frontmatter still
  // says `in-progress`, so `syncDocumentStatus` returns
  // `transitioned: false, reason: "already"` — and the re-read at `:1428`, the
  // one site §2.4 identifies as never fixed, is skipped. The test would still
  // go red if the block were deleted, but only because run 1 (the CREATE path)
  // needs the same block: it would be passing for the wrong reason.
  const body = fs.readFileSync(epic, "utf-8");
  const edited = body
    .replace(
      "Make the checkout flow survive a mis-tap, a slow network and a back button.",
      "Make checkout survive a mis-tap, a slow network, a back button and a retry.",
    )
    .replace("status: in-progress", "status: done")
    .replace("**Status:** In Progress", "**Status:** Done");
  assert.notEqual(edited, body, "the fixture edit did not apply");
  assert.match(edited, /^status: done$/m, "the status edit did not apply");
  fs.writeFileSync(epic, edited);

  const second = await runSync(root, epic, fetchImpl, ["--quiet"]);
  assert.notEqual(
    second.skipped,
    true,
    "expected the UPDATE path — this test cannot see the defect it targets " +
      "if the run skipped",
  );

  // The assertion that stops this test silently ceasing to exercise the update
  // path: the run must have genuinely transitioned, not reported "already".
  assert.equal(
    second.statusOutcome?.transitioned,
    true,
    "the update run did not transition — the post-transition re-read at :1428 " +
      "was never reached, so this test proves nothing about it",
  );

  // The card may have transitioned during that run. The timestamp written back
  // must be the post-transition one, or this next run aborts on our own write.
  const third = await runSync(root, epic, fetchImpl, ["--quiet"]);
  assert.equal(
    third.skipped,
    true,
    "the run after an update-path transition did not converge",
  );
});

// ===========================================================================
// The counterweight — the guard must still catch a REAL concurrent edit
// ===========================================================================

test("a genuine remote edit still trips the concurrent-edit guard", async () => {
  const { root, epic } = repoWithEpic();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, epic, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;

  state.issues[key].updated = new Date(Date.now() + 60_000).toISOString();

  await assert.rejects(
    () => runSync(root, epic, fetchImpl, ["--quiet"]),
    /updated since last local sync/i,
    "the guard did not fire on a genuine remote edit — the fix disabled it",
  );
});
