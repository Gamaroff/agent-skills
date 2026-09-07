/**
 * Unit tests for `diffAgainstPayload` — the helper task.96 extracted so all four
 * `sync-jira-*` scripts diff the payload they are about to send rather than a
 * separately-rebuilt field set.
 *
 * These exist because the end-to-end suites prove the property but not the
 * mechanism, and because §8 of task.96 promises three things the e2e tests
 * cannot provide:
 *
 *   1. the corrected diff input reports no `labels` change when Jira already
 *      carries the `synced-from-*` label;
 *   2. a STANDING counter-example — the same comparison fed the frontmatter
 *      rebuild DOES report a change. Without this the defect is only ever
 *      demonstrated by a transient mutation that leaves nothing behind;
 *   3. negative cases isolating each guard condition.
 *
 * Run: node --test shared/resources/tests/diff-against-payload.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lib = require("../jira-sync.js");

const SYNC_LABEL = "synced-from-task-42";

// What Jira holds: the labels the payload sent, sync label included.
const current = {
  summary: "Cache lib simplification",
  priority: "High",
  labels: ["backend", SYNC_LABEL],
  updated: "2026-09-07T10:00:00.000Z",
};

// What `collectIssueFields` builds and PUTs — note the appended sync label.
const fields = {
  summary: "Cache lib simplification",
  priority: { name: "High" },
  labels: ["backend", SYNC_LABEL],
};

const frontmatter = {
  jira_last_body_hash: "b1",
  jira_last_meta_hash: "m1",
  labels: ["backend"], // the frontmatter set — WITHOUT the sync label
  priority: "High",
};

test("diffing the payload reports no label change when Jira already carries the sync label", () => {
  const changed = lib.diffAgainstPayload({
    current,
    fields,
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(changed, [], `expected no changes, got: ${changed}`);
});

test("THE COUNTER-EXAMPLE: the frontmatter rebuild reports a spurious label change", () => {
  // This is the defect, asserted directly and permanently rather than proven by
  // a mutation that is reverted a moment later. `sanitiseLabels(frontmatter.labels)`
  // is what all four scripts fed the diff before task.96; it omits the sync
  // label that `collectIssueFields` appends, so the sets can never converge.
  const changed = lib.diffFields({
    prev: current,
    next: {
      summary: fields.summary,
      priority: "High",
      labels: lib.sanitiseLabels(frontmatter.labels) || [],
    },
    prevBodyHash: "b1",
    newBodyHash: "b1",
    prevMetaHash: "m1",
    newMetaHash: "m1",
  });
  assert.deepEqual(
    changed,
    ["labels"],
    "the frontmatter rebuild no longer reports the spurious change — if this " +
      "fails, the defect this task fixed can no longer be demonstrated, and " +
      "the fix's counter-example is gone",
  );
});

test("a real summary change is still reported", () => {
  const changed = lib.diffAgainstPayload({
    current,
    fields: { ...fields, summary: "Something else" },
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(changed, ["summary"]);
});

test("a real priority change is still reported", () => {
  const changed = lib.diffAgainstPayload({
    current,
    fields: { ...fields, priority: { name: "Low" } },
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(changed, ["priority"]);
});

test("a real label change is still reported", () => {
  const changed = lib.diffAgainstPayload({
    current,
    fields: { ...fields, labels: ["backend", "urgent", SYNC_LABEL] },
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(changed, ["labels"]);
});

test("a body-hash move is reported as `description`", () => {
  const changed = lib.diffAgainstPayload({
    current,
    fields,
    frontmatter,
    newBodyHash: "b2",
    newMetaHash: "m1",
  });
  assert.deepEqual(changed, ["description"]);
});

test("a meta-hash move is reported as `metadata`", () => {
  const changed = lib.diffAgainstPayload({
    current,
    fields,
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m2",
  });
  assert.deepEqual(changed, ["metadata"]);
});

test("a null `current` returns the full create-path list", () => {
  // Reachable on the create path and on a --dry-run update, where no caller
  // fetches `current`. Every one of the four call sites used this exact
  // fallback array before the extraction, so the helper must reproduce it.
  const changed = lib.diffAgainstPayload({
    current: null,
    fields,
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(changed, ["summary", "description", "priority", "labels"]);
});

test("a payload with no priority compares as null rather than throwing", () => {
  const changed = lib.diffAgainstPayload({
    current: { ...current, priority: null },
    fields: { summary: fields.summary, labels: fields.labels },
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(changed, []);
});
