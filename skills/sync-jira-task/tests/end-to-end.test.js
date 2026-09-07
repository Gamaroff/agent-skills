"use strict";

/**
 * End-to-end: sync a task twice against a fake Jira, then READ THE PAYLOAD BACK.
 *
 * These tests exist because a full unit suite passed while two convergence
 * defects were live. The unit tests asserted `diffFields` and
 * `collectIssueFields` each behaved correctly *in isolation*; nothing asserted
 * that the two agreed with each other. They did not: the diff was fed a label
 * set rebuilt from frontmatter, while the payload sent a set with the
 * `synced-from-*` idempotency label appended. The sets could never match, so
 * every run reported `Updated: labels`.
 *
 * The second defect is the same shape. A transition is a write and bumps Jira's
 * `updated`; persisting the pre-transition value tells the *next* run that Jira
 * has moved, which is exactly what `guardConcurrentEdit` aborts on. The card
 * synced once and then refused every subsequent run over a change this tool
 * made itself.
 *
 * Note on the PUT count: `sync-jira-task` has no skip-when-no-diff gate and
 * PUTs unconditionally, so its write count is 2 before and after the fix.
 * Adding a gate is out of scope for task.96 — see its §4. What is asserted here
 * is the change summary, which is the whole of what defect 1 breaks on this
 * script.
 *
 * Run: node --test skills/sync-jira-task/tests/end-to-end.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const taskSync = require("../scripts/sync-jira-task.js");
const {
  fakeJira,
  gitRepo,
  makeRunner,
} = require("../../../tests/lib/fake-jira.js");

const runSync = makeRunner({ module: taskSync, cliName: "sync-jira-task" });

const TASK_MD = `---
id: task.42
title: "Cache lib simplification"
type: task
description: "Collapse the two cache wrappers into one."
status: in-progress
priority: High
created: 2026-09-07
updated: 2026-09-07
---

# Technical Task: Cache lib simplification

**Status:** In Progress

## 1. Overview

The cache library grew a second wrapper that duplicates the first. This task
collapses them into one and deletes the dead path.

## 2. Motivation

Two wrappers mean two places to fix any cache bug, and they have already
drifted once.

## 4. Scope

### In Scope

- Collapse the wrappers.

### Out of Scope

- Changing the eviction policy.

## 5. Breaking Changes

None to any public interface.

## 6. Implementation Plan

### Phase 1: Collapse

- [ ] Merge the wrappers

## 9. Success Criteria

- [ ] One wrapper remains
- [ ] No behaviour change

## 10. Risk Assessment

Low. The second wrapper has no callers outside the first.

## 11. Rollback Plan

Revert the commit; there is no persisted state to unwind.

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-07 | 1.0     | Initial draft | create-task |
`;

function repoWithTask() {
  const rel = "docs/tasks/task.42.cache-lib-simplification";
  const root = gitRepo("task-e2e-", {
    [`${rel}/task.42.cache-lib-simplification.md`]: TASK_MD,
  });
  return {
    root,
    task: path.join(root, rel, "task.42.cache-lib-simplification.md"),
  };
}

// ===========================================================================
// Defect 1 — the label diff
// ===========================================================================

test("a task synced twice reports no field changes on the second run", async () => {
  const { root, task } = repoWithTask();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, task, fetchImpl, ["--quiet"]);
  assert.equal(first.isUpdate, false, "the first run should have created");
  const key = first.result.issueKey;
  assert.match(key, /^PROJ-\d+$/);

  // The payload that was actually sent carries the idempotency label.
  const created = state.issues[key];
  const syncLabel = (created.fields.labels || []).find((l) =>
    l.startsWith("synced-from-"),
  );
  assert.ok(
    syncLabel,
    "the create payload should carry a synced-from-* label — " +
      "without it there is no divergence to test",
  );

  const before = fs.readFileSync(task, "utf-8");
  const second = await runSync(root, task, fetchImpl, ["--quiet"]);

  assert.equal(second.isUpdate, true, "the second run created a second card");
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

  // And the document is untouched apart from the refreshed sync timestamp,
  // which moves because the fake's `updated` moves on every PUT.
  const after = fs.readFileSync(task, "utf-8");
  const strip = (t) => t.replace(/^jira_last_synced_at:.*$/m, "");
  assert.equal(strip(after), strip(before), "the second run rewrote the file");
});

test("the diff is fed the label set that is actually sent, not a frontmatter rebuild", async () => {
  const { root, task } = repoWithTask();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, task, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;
  const sent = state.issues[key].fields.labels.slice().sort();

  await runSync(root, task, fetchImpl, ["--quiet"]);

  // The PUT on the second run must carry the same label set the card already
  // holds. If the diff were right but the payload wrong, the summary assertion
  // above would pass while the card drifted.
  const puts = state.requests.filter(
    (r) => r.method === "PUT" && r.url.includes(`/issue/${key}`),
  );
  assert.ok(puts.length >= 1, "expected at least one PUT");
  const lastLabels = (puts[puts.length - 1].body.fields.labels || [])
    .slice()
    .sort();
  assert.deepEqual(
    lastLabels,
    sent,
    "the payload's label set drifted between runs",
  );
});

// ===========================================================================
// Defect 2 — the post-transition timestamp
// ===========================================================================

test("a task whose card transitioned can be synced again without --force", async () => {
  const { root, task } = repoWithTask();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, task, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;

  // The create path drove a transition: the card left "To Do".
  assert.notEqual(
    state.issues[key].status,
    "To Do",
    "no transition fired — this test cannot see the defect it targets",
  );

  // THE ASSERTION. Before the fix the first run persisted the *pre*-transition
  // `updated`, so this run throws "Jira issue updated since last local sync" —
  // over a change this tool made moments earlier, recoverable only with
  // --force.
  const second = await runSync(root, task, fetchImpl, ["--quiet"]);

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
  const { root, task } = repoWithTask();
  const { state, fetchImpl } = fakeJira();

  const first = await runSync(root, task, fetchImpl, ["--quiet"]);
  const key = first.result.issueKey;

  // Someone else edits the card in the Jira UI.
  state.issues[key].updated = new Date(Date.now() + 60_000).toISOString();

  // Every other test in this file rewards the guard staying quiet. This is the
  // one that stops the fix becoming a worse bug than the defect: the cheapest
  // way to make them all pass is to stop the guard firing at all.
  await assert.rejects(
    () => runSync(root, task, fetchImpl, ["--quiet"]),
    /updated since last local sync/i,
    "the guard did not fire on a genuine remote edit — the fix disabled it",
  );
});
