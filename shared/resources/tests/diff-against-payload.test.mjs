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
// The real builder, so the counter-example pins the defect rather than diffFields.
const taskSync = require("../../../skills/sync-jira-task/scripts/sync-jira-task.js");

const SILENT = { info() {}, warn() {}, err() {}, emit() {} };

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

test("THE COUNTER-EXAMPLE: the real builder's labels differ from the frontmatter rebuild", () => {
  // The defect, asserted permanently rather than proven by a mutation that is
  // reverted a moment later.
  //
  // This drives the REAL builder — `sync-jira-task`'s `collectIssueFields` —
  // rather than a hand-built object, because the defect was never in
  // `diffFields`: it was in the disagreement between what the builder SENDS and
  // what the old code DIFFED. A test that hand-builds both sides pins
  // `diffFields` and would stay green if a caller reverted to the frontmatter
  // rebuild, which is precisely the vacuity this task exists to eliminate.
  const built = taskSync.collectIssueFields({
    summary: "Cache lib simplification",
    args: {},
    frontmatter: { labels: ["backend"], priority: "High" },
    descAdf: { type: "doc", version: 1, content: [] },
    taskTypeId: null,
    projectKey: null,
    livePriorities: null,
    output: SILENT,
    syncLabel: SYNC_LABEL,
  });

  const rebuilt = lib.sanitiseLabels(["backend"]) || [];

  assert.ok(
    built.labels.includes(SYNC_LABEL),
    "the builder no longer appends the sync label — the defect's precondition " +
      "is gone and this counter-example no longer means anything",
  );
  assert.ok(
    !rebuilt.includes(SYNC_LABEL),
    "the frontmatter rebuild now contains the sync label — the two sets no " +
      "longer diverge, so the defect cannot be demonstrated",
  );

  // Feeding the rebuild to the diff reports the spurious change. Feeding the
  // built payload does not. That gap IS the bug.
  const withRebuild = lib.diffFields({
    prev: { ...current, labels: built.labels },
    next: { summary: built.summary, priority: "High", labels: rebuilt },
    prevBodyHash: "b1",
    newBodyHash: "b1",
    prevMetaHash: "m1",
    newMetaHash: "m1",
  });
  assert.deepEqual(withRebuild, ["labels"], "the defect no longer reproduces");

  const withPayload = lib.diffAgainstPayload({
    current: { ...current, labels: built.labels },
    fields: built,
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(withPayload, [], "the fix no longer converges");
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

// ---------------------------------------------------------------------------
// normaliseListForHash — the hash input for payload-only list fields
// ---------------------------------------------------------------------------

test("list order does not change the hash input", () => {
  assert.equal(
    lib.normaliseListForHash(["api", "web"]),
    lib.normaliseListForHash(["web", "api"]),
    "a cosmetic frontmatter reorder would fire a spurious `Updated: metadata` " +
      "PUT, which also republishes the whole description",
  );
});

test("a scalar and a one-element list hash identically", () => {
  // The payload maps `components: api` and `components: [api]` to the same
  // array, so the hash must not distinguish them.
  assert.equal(
    lib.normaliseListForHash("api"),
    lib.normaliseListForHash(["api"]),
  );
});

test("the hash key MIRRORS the payload's coercion, including whitespace", () => {
  // The invariant is mirroring, not cleverness, and it is asymmetric: a hash
  // that distinguishes what the payload collapses costs a spurious PUT, while
  // one that collapses what the payload distinguishes loses an edit silently.
  // The payload does `String(name)` with no trim, so the hash must too — an
  // earlier revision trimmed, which is the losing direction.
  assert.notEqual(
    lib.normaliseListForHash([" api"]),
    lib.normaliseListForHash(["api"]),
    "a whitespace-only edit changes what is sent to Jira but not the hash — " +
      "the skip gate would swallow it",
  );
  // And objects collapse in the hash exactly as they collapse in the payload,
  // which is correct: there is no payload difference for the gate to lose.
  assert.equal(
    lib.normaliseListForHash([{ a: 1 }]),
    lib.normaliseListForHash([{ b: 2 }]),
  );
});

test("empty, null and undefined all normalise to the same empty key", () => {
  assert.equal(lib.normaliseListForHash(undefined), "");
  assert.equal(lib.normaliseListForHash(null), "");
  assert.equal(lib.normaliseListForHash(""), "");
});

test("a real membership change still moves the hash input", () => {
  assert.notEqual(
    lib.normaliseListForHash(["api"]),
    lib.normaliseListForHash(["api", "web"]),
    "adding a component no longer registers — the skip gate would swallow it",
  );
});
