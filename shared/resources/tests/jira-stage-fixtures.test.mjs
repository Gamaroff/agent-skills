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

// --- ladder walking against real payloads ----------------------------------
//
// Everything above resolves ONE hop. These replay a multi-hop walk, which is
// where position-dependence stops being a footnote and becomes the mechanism:
// the destination of hop 2 is not offered from where hop 1 started, so a walk
// that reused the first transition list would resolve nothing and skip.
//
// NOTE ON COVERAGE. The demo walk named in task.38 —
// `In Progress → READY FOR SHOWCASE → Waiting for Review` — cannot be replayed
// end-to-end yet: the transitions available *from* the showcase column are
// captured nowhere. `id=21` (rapp-story-in-progress) and `id=151`
// (rapp-story-waiting-for-review) are both transitions *into* it. Capturing
// `rapp-story-ready-for-showcase.json` needs a real issue parked in that column
// and is tracked as an open item on the task.
//
// So the two-hop proof below uses a path this board HAS captured at both ends,
// and the uppercase-destination assertion is kept separately against the real
// `id=21`. Between them they cover the same two properties the showcase walk
// was chosen to demonstrate.

const tw = require(join(__dirname, "..", "tracker-workflow.js"));
const { parseYamlSubset } = require(join(__dirname, "..", "yaml-subset.js"));
const fromYaml = (text) =>
  tw.buildWorkflow(parseYamlSubset(text), { source: "file", path: "<test>" });

const silent = { log() {}, info() {}, warn() {}, err() {}, emit() {} };

/**
 * Replay a walk against real captured payloads, one fixture per position.
 *
 * The GET sequence is keyed by hop, exactly as a live board would answer it:
 * fixture[0] is what the board offers from the starting column, fixture[1] what
 * it offers once the first transition has fired, and so on.
 */
function replayWalk({ fixtures, from, targets, workflow, ...rest }) {
  const posts = [];
  let g = 0;
  const http = async (url, opts = {}) => {
    if ((opts.method || "GET") === "GET") {
      const list = load(fixtures[Math.min(g, fixtures.length - 1)]);
      g++;
      return { ok: true, status: 200, json: async () => ({ transitions: list }) };
    }
    posts.push(JSON.parse(opts.body));
    return { ok: true, status: 204, json: async () => ({}), text: async () => "" };
  };
  return lib
    .walkLadder({
      http,
      baseUrl: "https://rapp.atlassian.net",
      email: "e@x",
      token: "t",
      issueKey: "RAPP-1",
      from,
      targets,
      workflow,
      output: silent,
      ...rest,
    })
    .then((res) => ({ res, posts, getCount: g }));
}

test("Story walk: Waiting for Review → In Review → Ready for Testing, re-fetched per hop", async () => {
  // A ladder that declares In Review between the review column and testing, so
  // reaching Ready for Testing from Waiting for Review must pass through it.
  const wf = fromYaml(`
statuses:
  - Selected for Development
  - In Progress
  - Waiting for Review
  - In Review
  - Ready for Testing
  - Waiting for merge
  - Done

pipeline:
  in-qa: Ready for Testing
`);
  const { res, posts, getCount } = await replayWalk({
    fixtures: [
      "rapp-story-waiting-for-review.json", // offers 401 Start Review → In Review
      "rapp-story-in-review.json", // offers 61 Review Passed → Ready for Testing
    ],
    from: "Waiting for Review",
    targets: tw.resolveMoment("in-qa", wf).targets,
    workflow: wf,
  });

  assert.equal(res.reason, "walked");
  assert.equal(res.landed, "Ready for Testing");
  assert.equal(getCount, 2, "transitions re-read after the hop");
  assert.deepEqual(
    posts.map((p) => p.transition.id),
    ["401", "61"],
    "the real captured transition ids, in ladder order",
  );

  // The property that makes the re-fetch load-bearing rather than tidy: hop 2's
  // transition is simply not on offer from where hop 1 began.
  const fromReview = load("rapp-story-waiting-for-review.json");
  assert.equal(
    fromReview.some((t) => t.id === "61"),
    false,
    "Review Passed is not offered from Waiting for Review — only from In Review",
  );
});

test("Story walk: the destination is matched case-insensitively (UPPERCASE board column)", async () => {
  // This board spells the column READY FOR SHOWCASE. The ladder spells it in
  // title case. Matching is on the stripped, case-folded name, so `id=21`
  // resolves — an exact-string matcher would skip and the gate would never open.
  const wf = fromYaml(`
statuses:
  - In Progress
  - Ready for Showcase

pipeline:
  ready-for-merge: Ready for Showcase
`);
  const moment = tw.resolveMoment("ready-for-merge", wf);
  assert.equal(moment.isLastRung, true, "last rung of THIS ladder");

  const { res, posts } = await replayWalk({
    fixtures: ["rapp-story-in-progress.json"],
    from: "In Progress",
    targets: moment.targets,
    workflow: wf,
  });
  assert.equal(res.reason, "walked");
  assert.equal(res.landed, "READY FOR SHOWCASE", "the board's own spelling");
  assert.equal(posts[0].transition.id, "21");
});

test("Story: a retargeted done skips rather than firing the board's real Done", async () => {
  // `done` pointed at the showcase gate. From In Progress the board offers
  // exactly one done-category transition (id=161 → Done), which is the shape
  // that used to make rule 4 fire with confidence — and send the card to Done.
  const wf = fromYaml(`
statuses:
  - In Progress
  - Ready for Showcase
  - Waiting for merge
  - Done

pipeline:
  done: Ready for Showcase
`);
  const moment = tw.resolveMoment("done", wf);
  assert.equal(moment.isLastRung, false);

  const doneCategory = load("rapp-story-in-progress.json").filter(
    (t) => t.to && t.to.statusCategory && t.to.statusCategory.key === "done",
  );
  assert.equal(doneCategory.length, 1, "precondition: exactly one, so rule 4 would be unambiguous");

  // Rebuild the ladder so the gate is NOT reachable in one hop either, forcing
  // the question "is there another way to finish?" that rule 4 used to answer.
  const { res, posts } = await replayWalk({
    fixtures: ["rapp-story-testing.json"], // offers no route to the showcase column
    from: "Testing",
    targets: moment.targets,
    workflow: wf,
    terminal: lib.isTerminalMoment("done") && moment.isLastRung,
    localStatus: "done",
  });

  assert.equal(res.transitioned, false);
  assert.equal(posts.length, 0, "a skip — nothing fired");
  assert.notEqual(res.landed, "Done");
});

test("Story: when done IS the last rung, the category fallback is still available", async () => {
  const wf = fromYaml(`
statuses:
  - Testing
  - Waiting for merge
  - Done

pipeline:
  done: Done
`);
  const moment = tw.resolveMoment("done", wf);
  assert.equal(moment.isLastRung, true);

  // From In Review the task workflow offers "Review passed" → Done: the name
  // matches neither the rung nor the destination spelling by action name, so
  // this lands via the done-category rule.
  const { res, posts } = await replayWalk({
    fixtures: ["rapp-itdevops-task-in-review.json"],
    from: "In Review",
    targets: moment.targets,
    workflow: wf,
    terminal: lib.isTerminalMoment("done") && moment.isLastRung,
    localStatus: "accepted",
  });
  assert.equal(res.landed, "Done");
  assert.equal(posts[0].transition.id, "241");
});
