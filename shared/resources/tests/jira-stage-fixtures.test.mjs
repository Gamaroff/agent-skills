"use strict";
/**
 * Replays real transition payloads captured from a live Jira board and asserts
 * that each stage resolves to the transition it should.
 *
 * Every other test in this area feeds hand-written transition lists, which is
 * exactly why they cannot catch the things that actually went wrong here. Three
 * properties of a real board only show up in real payloads:
 *
 *  - **Transitions are position-dependent.** The same stage resolves
 *    differently, or not at all, depending on where the card currently sits. A
 *    fixture per status is the only honest way to test that.
 *
 *  - **Transition ids are not stable across issue types.** On this board id 21
 *    is "Ready for Showcase" for a Story and "Implemented" for a Development
 *    Task. Any implementation that reached for an id rather than a destination
 *    name would pass hand-written tests and corrupt a real board.
 *
 *  - **A status can exist in a workflow and be unreachable from most of it.**
 *    Blocked is in the Story workflow but is offered only from the testing
 *    columns. A stage that "should work" because the status exists is a
 *    different claim from one that works from here.
 *
 * Fixtures are `GET /rest/api/3/issue/{key}/transitions?expand=transitions.fields`
 * responses, trimmed to the fields the matcher reads. Filename encodes the issue
 * type and the status the card was in when captured.
 *
 * Run: node --test shared/resources/tests/jira-stage-fixtures.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "fixtures");

const lib = require(join(__dirname, "..", "jira-sync.js"));

const load = (name) =>
  JSON.parse(readFileSync(join(fixturesDir, name), "utf-8")).transitions;

// The record this board would ship: every stage on for a Story, the three that
// need columns this task workflow lacks turned off for the task type.
const RAPP_RECORD = {
  stages: {
    "in-qa": {
      enabled: true,
      rank: 40,
      candidates: ["Testing", "Ready for Testing"],
    },
    "ready-for-merge": {
      enabled: true,
      rank: 50,
      candidates: ["Waiting for merge"],
    },
    blocked: { enabled: true, rank: null, candidates: ["Blocked"] },
  },
  byIssueType: {
    "IT / DevOps Task": {
      "in-qa": { enabled: false, reason: "no Testing status" },
      "ready-for-merge": { enabled: false, reason: "no Waiting for merge" },
      blocked: { enabled: false, reason: "no Blocked status" },
    },
  },
};

/** What would `--stage <stage>` do from this fixture? */
function act(fixture, currentStatus, stage, issueType) {
  const spec = lib.resolveStage({ stage, issueType, record: RAPP_RECORD });
  if (!spec.enabled) return "disabled";
  const r = lib.resolveTransition({
    transitions: load(fixture),
    candidates: spec.candidates,
    currentStatus,
    terminal: spec.terminal,
  });
  return r.match
    ? (r.match.to && r.match.to.name) || r.match.name
    : `skip:${r.reason}`;
}

test("fixtures are present — this suite is worthless without them", () => {
  const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 8, `only ${files.length} fixtures found`);
});

// --- Story ladder ----------------------------------------------------------

test("Story: the full ladder resolves forward, one hop per stage", () => {
  const S = "Story";
  assert.equal(
    act("rapp-story-in-progress.json", "In Progress", "in-review", S),
    "Waiting for Review",
    "In Review is NOT reachable from In Progress here — Waiting for Review is",
  );
  assert.equal(
    act("rapp-story-waiting-for-review.json", "Waiting for Review", "in-qa", S),
    "Ready for Testing",
  );
  assert.equal(
    act(
      "rapp-story-ready-for-testing.json",
      "Ready for Testing",
      "ready-for-merge",
      S,
    ),
    "Waiting for merge",
  );
  assert.equal(
    act("rapp-story-testing.json", "Testing", "ready-for-merge", S),
    "Waiting for merge",
  );
});

test("Story: work-started is a no-op once the card has left Selected for Development", () => {
  // Not "already" — the card is past it. The guard is what stops the move; the
  // matcher alone would happily walk it backwards, which is the whole reason
  // the guard exists.
  assert.equal(
    act("rapp-story-in-review.json", "In Review", "work-started", "Story"),
    "skip:no-transition",
  );
});

test("Story: blocked is reachable ONLY from the testing columns", () => {
  const S = "Story";
  assert.equal(
    act("rapp-story-ready-for-testing.json", "Ready for Testing", "blocked", S),
    "Blocked",
  );
  assert.equal(
    act("rapp-story-testing.json", "Testing", "blocked", S),
    "Blocked",
  );
  // Everywhere else the status exists in the workflow but no transition leads
  // to it — a HALT outside the QA window cannot set Blocked on this board.
  for (const [f, s] of [
    ["rapp-story-in-progress.json", "In Progress"],
    ["rapp-story-waiting-for-review.json", "Waiting for Review"],
    ["rapp-story-in-review.json", "In Review"],
  ])
    assert.equal(act(f, s, "blocked", S), "skip:no-transition", `from ${s}`);
});

test("Story: Blocked is close to a dead end — only the testing columns lead out", () => {
  const S = "Story";
  assert.equal(
    act("rapp-story-blocked.json", "Blocked", "in-qa", S),
    "Testing",
  );
  assert.equal(
    act("rapp-story-blocked.json", "Blocked", "done", S),
    "skip:no-transition",
  );
  assert.equal(
    act("rapp-story-blocked.json", "Blocked", "in-review", S),
    "skip:no-transition",
  );
});

// --- IT / DevOps Task ------------------------------------------------------

test("IT / DevOps Task: review works, the column-less stages report disabled", () => {
  const T = "IT / DevOps Task";
  assert.equal(
    act("rapp-itdevops-task-in-progress.json", "In Progress", "in-review", T),
    "Waiting for Review",
  );
  // Re-signalling in-review from a status that IS a review status is a no-op,
  // even though "In Review" (an earlier candidate) is reachable from here via
  // "Start Review". The already-rule is checked before any destination match,
  // and that is the behaviour we want: a resumed pipeline re-running step 4
  // should not walk the card deeper into the review sub-ladder. Which review
  // column a team stops at is theirs to decide, not the pipeline's.
  assert.equal(
    act(
      "rapp-itdevops-task-waiting-for-review.json",
      "Waiting for Review",
      "in-review",
      T,
    ),
    "skip:already",
  );
  assert.ok(
    load("rapp-itdevops-task-waiting-for-review.json").some(
      (t) => t.to.name === "In Review",
    ),
    "In Review really is reachable from here — the no-op above is a choice, not a limitation",
  );
  for (const stage of ["in-qa", "ready-for-merge", "blocked"])
    assert.equal(
      act("rapp-itdevops-task-in-progress.json", "In Progress", stage, T),
      "disabled",
      stage,
    );
});

test("IT / DevOps Task: done needs no resolution from In Review, but does from earlier", () => {
  const need = (f, s) => {
    const r = lib.resolveTransition({
      transitions: load(f),
      candidates: lib.resolveStage({ stage: "done" }).candidates,
      currentStatus: s,
      terminal: true,
    });
    return lib.buildTransitionFields(r.match, { negative: false });
  };
  // "Review passed" -> Done carries no required fields...
  assert.equal(
    need("rapp-itdevops-task-in-review.json", "In Review").fields,
    null,
  );
  // ...while the generic Done transition demands a resolution, which is filled
  // from that transition's own allowedValues rather than guessed.
  const early = need(
    "rapp-itdevops-task-selected-for-development.json",
    "Selected for Development",
  );
  assert.ok(
    early.fields && early.fields.resolution,
    "resolution must be filled",
  );
  assert.deepEqual(early.unfillable, []);
});

// --- the id-instability trap ----------------------------------------------

test("transition id 21 means different things per issue type — destinations, never ids", () => {
  const storyById = load("rapp-story-in-progress.json").find(
    (t) => t.id === "21",
  );
  const taskById = load("rapp-itdevops-task-in-progress.json").find(
    (t) => t.id === "21",
  );
  assert.equal(storyById.to.name, "READY FOR SHOWCASE");
  assert.equal(taskById.to.name, "Waiting for Review");
  // Same id, opposite meanings. Matching on destination gets both right.
  assert.equal(
    act("rapp-story-in-progress.json", "In Progress", "in-review", "Story"),
    "Waiting for Review",
  );
  assert.notEqual(
    act("rapp-story-in-progress.json", "In Progress", "in-review", "Story"),
    "READY FOR SHOWCASE",
  );
});
