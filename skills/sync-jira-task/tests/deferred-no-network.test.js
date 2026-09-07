"use strict";

/**
 * A deferred run performs no transition, so it must make no post-transition
 * network call.
 *
 * `!deferred` is the third guard on the re-read added for task.96:
 *
 *   if (statusOutcome?.transitioned && result?.issueKey && !deferred) { … }
 *
 * The other two guards are exercised by the end-to-end suite — `transitioned`
 * by every convergence test (nothing moved on the second run), `issueKey` by
 * the create path. `!deferred` was not, and a guard nothing exercises is a
 * guard that can be deleted without any test noticing. Under a restricted
 * `access.tracker` the run records its intent instead of writing, so reaching
 * for a fresh timestamp would be both wrong (nothing moved) and a network call
 * the access mode exists to prevent.
 *
 * This lives in its own file because `ACCESS_ENV_AT_LOAD` is frozen when
 * `jira-sync.js` is first required — setting `ACCESS_TRACKER` inside a test in
 * the shared end-to-end file would be read after the freeze and silently do
 * nothing, which is exactly the shape of test that passes while proving
 * nothing.
 *
 * Run: node --test skills/sync-jira-task/tests/deferred-no-network.test.js
 */

// MUST precede the requires below — see the note above.
process.env.ACCESS_TRACKER = "read-only";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const taskSync = require("../scripts/sync-jira-task.js");
const {
  fakeJira,
  gitRepo,
  makeRunner,
  countRequests,
} = require("../references/fake-jira.js");

const runSync = makeRunner({
  module: taskSync,
  cliName: "sync-jira-task",
  env: { ACCESS_TRACKER: "read-only" },
});

const TASK_MD = `---
id: task.43
title: "Deferred run probe"
type: task
description: "A task used to prove a deferred run writes nothing."
status: in-progress
priority: High
created: 2026-09-07
updated: 2026-09-07
jira_key: "PROJ-901"
jira_url: "https://example.atlassian.net/browse/PROJ-901"
jira_last_synced_at: "2020-01-01T00:00:00.000Z"
---

# Technical Task: Deferred run probe

**Status:** In Progress

## 1. Overview

A task document that already carries a \`jira_key\`, so the run takes the update
path rather than the create path.

## 4. Scope

### In Scope

- Nothing; this document exists to be synced.

## 5. Breaking Changes

None.

## 9. Success Criteria

- [ ] The run defers rather than writes

## 10. Risk Assessment

None.

## 11. Rollback Plan

None.

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-07 | 1.0     | Initial draft | create-task |
`;

test("a deferred run makes no PUT and no post-transition timestamp re-read", async () => {
  const rel = "docs/tasks/task.43.deferred-run-probe";
  const root = gitRepo("task-deferred-", {
    [`${rel}/task.43.deferred-run-probe.md`]: TASK_MD,
  });
  const file = path.join(root, rel, "task.43.deferred-run-probe.md");

  const { state, fetchImpl } = fakeJira();
  // The card exists and is behind the document's status, so an unrestricted run
  // would both PUT and transition.
  state.issues["PROJ-901"] = {
    fields: { summary: "Deferred run probe", labels: [] },
    updated: "2020-01-01T00:00:00.000Z",
    status: "To Do",
  };

  await runSync(root, file, fetchImpl, ["--quiet"]);

  assert.equal(
    countRequests(state, { method: "PUT" }),
    0,
    "a deferred run issued a PUT — the access mode did not hold",
  );

  // THE ASSERTION THIS TEST EXISTS FOR: the post-transition re-read is a GET
  // for `fields=updated`. A deferred run moved nothing, so it must not ask for
  // a refreshed timestamp — that read is the network call the access mode
  // exists to prevent, and it is the call the guard governs. An earlier version
  // asserted only on transition POSTs, which is not that call.
  const timestampReads = state.requests.filter(
    (r) => r.method === "GET" && r.url.includes("fields=updated"),
  );
  assert.equal(
    timestampReads.length,
    0,
    "a deferred run issued a post-transition timestamp read",
  );

  const transitionPosts = state.requests.filter(
    (r) => r.method === "POST" && r.url.includes("/transitions"),
  );
  assert.equal(transitionPosts.length, 0, "a deferred run posted a transition");
});
