/**
 * Unit tests for `diffAgainstPayload` — the helper task.96 extracted so all four
 * `sync-jira-*` scripts diff the payload they are about to send rather than a
 * separately-rebuilt field set.
 *
 * These exist because the end-to-end suites prove the property but not the
 * mechanism, and because §8 of task.96 promises three things the e2e tests
 * cannot provide:
 *
 *   1. the diff input reports no `labels` change when Jira holds exactly the
 *      labels the payload sends (the builder no longer appends a
 *      `synced-from-*` label, so frontmatter labels ARE the sent set);
 *   2. a legacy card still carrying `synced-from-*` is reported as a label
 *      change ONCE (the PUT replaces `labels`, stripping it) and then
 *      converges;
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

// A label the PREVIOUS version of the skills appended to every card.
const LEGACY_LABEL = "synced-from-task-42";

// What Jira holds: the labels the payload sent.
const current = {
  summary: "Cache lib simplification",
  priority: "High",
  labels: ["backend"],
  updated: "2026-09-07T10:00:00.000Z",
};

// What `collectIssueFields` builds and PUTs.
const fields = {
  summary: "Cache lib simplification",
  priority: { name: "High" },
  labels: ["backend"],
};

const frontmatter = {
  jira_last_body_hash: "b1",
  jira_last_meta_hash: "m1",
  labels: ["backend"],
  priority: "High",
};

test("diffing the payload reports no label change when Jira holds exactly the sent labels", () => {
  const changed = lib.diffAgainstPayload({
    current,
    fields,
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(changed, [], `expected no changes, got: ${changed}`);
});

test("the real builder sends exactly the frontmatter labels — no sync label", () => {
  // Drives the REAL builder, not a hand-built object: the divergence this
  // suite once pinned (a builder appending `synced-from-*` that the diff did
  // not see) cannot recur while the builder's output equals the frontmatter
  // set. A builder that re-appended the label would fail here.
  const built = taskSync.collectIssueFields({
    summary: "Cache lib simplification",
    args: {},
    frontmatter: { labels: ["backend"], priority: "High" },
    descAdf: { type: "doc", version: 1, content: [] },
    taskTypeId: null,
    projectKey: null,
    livePriorities: null,
    output: SILENT,
  });

  assert.deepEqual(built.labels, ["backend"]);
  assert.deepEqual(built.labels, lib.sanitiseLabels(["backend"]));

  const changed = lib.diffAgainstPayload({
    current: { ...current, labels: built.labels },
    fields: built,
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(changed, [], "a no-op rerun must report no label change");
});

test("a legacy card still carrying synced-from-* is reported once, then converges", () => {
  // `putIssueAtomic` sends `{ fields }`, and Jira REPLACES `labels` on a PUT
  // (it does not merge). So the first sync after the label was dropped sees a
  // label change on a legacy card, sends `labels` without it, and strips it.
  const legacy = { ...current, labels: ["backend", LEGACY_LABEL] };

  const first = lib.diffAgainstPayload({
    current: legacy,
    fields,
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(first, ["labels"]);

  // After the PUT Jira holds exactly what was sent.
  const second = lib.diffAgainstPayload({
    current: { ...legacy, labels: fields.labels },
    fields,
    frontmatter,
    newBodyHash: "b1",
    newMetaHash: "m1",
  });
  assert.deepEqual(second, [], "the second run must change nothing");
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
    fields: { ...fields, labels: ["backend", "urgent"] },
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
