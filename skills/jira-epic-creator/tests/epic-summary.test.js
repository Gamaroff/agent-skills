"use strict";
/**
 * The epic summary rule is ONE function (task 205): doc-id.js `epicSummary`.
 *
 * jira-create-epic.js and sync-jira-epic.js each carried their own copy of a
 * `[Epic N]` normaliser with the same regexes; a fix to one would not reach the
 * other. Both now resolve to the shared helper, and this test fails if either
 * grows its own copy again.
 *
 * Run: node --test skills/jira-epic-creator/tests/epic-summary.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const creator = require("../scripts/jira-create-epic.js");
const docId = require("../references/doc-id.js");

test("jira-create-epic normalises through doc-id's epicSummary, not a copy", () => {
  assert.equal(creator.normaliseEpicSummary, docId.epicSummary);
});

test("jira-create-epic produces [Epic P.E] from the frontmatter pair", () => {
  const pair = { prd: 1, epic: 2 };
  assert.equal(
    creator.normaliseEpicSummary("[Epic 2] Foo", pair),
    "[Epic 1.2] Foo",
  );
  assert.equal(creator.normaliseEpicSummary("Foo", pair), "[Epic 1.2] Foo");
  assert.equal(creator.normaliseEpicSummary("Epic 2: Foo", {}), "Foo");
});
