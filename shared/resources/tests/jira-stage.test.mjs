"use strict";
/**
 * Unit tests for the pipeline-stage machinery in shared/resources/jira-sync.js
 * and the jira-stage.js CLI.
 *
 * Three of these guard properties that are easy to break by accident and
 * expensive to discover in production:
 *
 *  - the three new stages must stay OFF by default, because consumers upgrade
 *    by replacing a skill directory wholesale and a stage that flipped on would
 *    start moving cards into columns nobody asked about;
 *  - the worklog retry must fire at most once and only on a matching message,
 *    because worklogs are cumulative and cannot be silently undone;
 *  - the overlapping stages must resolve to the SAME candidate lists as the
 *    document statuses they shadow, or /sync-jira-* and /develop-* can be
 *    configured to disagree about one transition on one board.
 *
 * Run: node --test shared/resources/tests/jira-stage.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const lib = require(join(__dirname, "..", "jira-sync.js"));
const {
  DEFAULT_STAGE_MAP,
  STAGE_NAMES,
  DEFAULT_STATUS_MAP,
  resolveStage,
  resolveStatusRank,
  buildTransitionUpdate,
  transitionToStatus,
  WORKLOG_VALIDATOR_RE,
} = lib;

// --- helpers ---------------------------------------------------------------

const ok = (body = {}) => ({
  ok: true,
  status: 204,
  json: async () => body,
  text: async () => JSON.stringify(body),
});
const fail = (status, body) => ({
  ok: false,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});
const silent = { log() {}, info() {}, warn() {}, err() {}, emit() {} };

// A stub `http` that answers the transitions GET with `transitions` and records
// every POST body it is handed.
function stubHttp({ transitions = [], postResponses = [] }) {
  const posts = [];
  let i = 0;
  const http = async (url, opts = {}) => {
    if ((opts.method || "GET") === "GET")
      return { ok: true, status: 200, json: async () => ({ transitions }) };
    posts.push(JSON.parse(opts.body));
    const r = postResponses[i++];
    return r || ok();
  };
  return { http, posts };
}

const T = (id, name, to, fields = {}) => ({
  id,
  name,
  to: { name: to, statusCategory: { key: "indeterminate" } },
  fields,
});

// --- stage vocabulary ------------------------------------------------------

test("the three new stages are OFF by default, the three legacy ones ON", () => {
  const on = STAGE_NAMES.filter((s) => resolveStage({ stage: s }).enabled);
  const off = STAGE_NAMES.filter((s) => !resolveStage({ stage: s }).enabled);
  assert.deepEqual(on.sort(), ["done", "in-review", "work-started"]);
  assert.deepEqual(off.sort(), ["blocked", "in-qa", "ready-for-merge"]);
});

test("overlapping stages alias the document-status candidate lists exactly", () => {
  // If these ever diverge, a project can configure /sync-jira-story and
  // /develop-story to fire different transitions for the same board position.
  assert.deepEqual(resolveStage({ stage: "work-started" }).candidates, [
    ...DEFAULT_STATUS_MAP["in-progress"],
  ]);
  assert.deepEqual(resolveStage({ stage: "in-review" }).candidates, [
    ...DEFAULT_STATUS_MAP["ready-for-review"],
  ]);
  assert.deepEqual(resolveStage({ stage: "done" }).candidates, [
    ...DEFAULT_STATUS_MAP.accepted,
  ]);
});

test("an unknown stage is reported, never guessed at", () => {
  const r = resolveStage({ stage: "shipped" });
  assert.equal(r.known, false);
  assert.equal(r.enabled, undefined);
});

test("only `done` is terminal", () => {
  assert.deepEqual(
    STAGE_NAMES.filter((s) => resolveStage({ stage: s }).terminal),
    ["done"],
  );
});

// --- record layering -------------------------------------------------------

test("record.stages enables a stage and can replace its candidates", () => {
  const record = {
    stages: { "in-qa": { enabled: true, candidates: ["Verifying"] } },
  };
  const r = resolveStage({ stage: "in-qa", record });
  assert.equal(r.enabled, true);
  assert.deepEqual(r.candidates, ["Verifying"]);
});

test("byIssueType overrides record.stages, and is matched case-insensitively", () => {
  const record = {
    stages: { "in-qa": { enabled: true } },
    byIssueType: {
      "IT / DevOps Task": {
        "in-qa": { enabled: false, reason: "no Testing status" },
      },
    },
  };
  assert.equal(
    resolveStage({ stage: "in-qa", issueType: "Story", record }).enabled,
    true,
  );
  const task = resolveStage({
    stage: "in-qa",
    issueType: "it / devops task",
    record,
  });
  assert.equal(task.enabled, false);
  assert.equal(task.reason, "no Testing status");
});

test("a malformed record layer is ignored rather than throwing", () => {
  for (const record of [
    null,
    {},
    { stages: "nope" },
    { stages: { "in-qa": 7 } },
  ])
    assert.equal(resolveStage({ stage: "in-qa", record }).enabled, false);
});

// --- status rank -----------------------------------------------------------

test("status rank comes from the record first, then the built-in ladder", () => {
  assert.equal(resolveStatusRank("In Progress"), 20);
  assert.equal(resolveStatusRank("Waiting for Review"), 30);
  assert.equal(
    resolveStatusRank("Waiting for Review", {
      statusRank: { "waiting for review": 55 },
    }),
    55,
  );
});

test("a status no stage names is unranked, so the guard has no opinion on it", () => {
  assert.equal(resolveStatusRank("READY FOR SHOWCASE"), null);
  assert.equal(resolveStatusRank("Blocked"), null);
  assert.equal(resolveStatusRank(""), null);
});

// --- monotonicity guard ----------------------------------------------------

test("a transition that would move an issue backwards is refused", async () => {
  const { http, posts } = stubHttp({
    transitions: [T("1", "In Progress", "In Progress")],
  });
  const res = await transitionToStatus({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    issueKey: "K-1",
    targetStatus: ["In Progress"],
    currentStatus: "Waiting for merge", // rank 50 > requested 20
    minRank: 20,
    output: silent,
  });
  assert.equal(res.transitioned, false);
  assert.equal(res.reason, "would-regress");
  assert.equal(posts.length, 0, "must not POST at all");
});

test("--allow-regress lets the same move through", async () => {
  const { http, posts } = stubHttp({
    transitions: [T("1", "In Progress", "In Progress")],
  });
  const res = await transitionToStatus({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    issueKey: "K-1",
    targetStatus: ["In Progress"],
    currentStatus: "Waiting for merge",
    minRank: 20,
    allowRegress: true,
    output: silent,
  });
  assert.equal(res.transitioned, true);
  assert.equal(posts.length, 1);
});

test("an unranked current status does not block the move", async () => {
  const { http } = stubHttp({
    transitions: [T("1", "In Progress", "In Progress")],
  });
  const res = await transitionToStatus({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    issueKey: "K-1",
    targetStatus: ["In Progress"],
    currentStatus: "READY FOR SHOWCASE",
    minRank: 20,
    output: silent,
  });
  assert.equal(res.transitioned, true);
});

// --- worklog ---------------------------------------------------------------

test("buildTransitionUpdate uses the `update` verb, and omits comment/started", () => {
  assert.deepEqual(buildTransitionUpdate({ worklogTimeSpent: "1m" }), {
    worklog: [{ add: { timeSpent: "1m" } }],
  });
  assert.equal(buildTransitionUpdate({ worklogTimeSpent: "  " }), null);
  assert.equal(buildTransitionUpdate({}), null);
});

test("the validator regex matches Jira's wording, not arbitrary 400s", () => {
  assert.ok(
    WORKLOG_VALIDATOR_RE.test(
      "Please enter the time spent in order to move the task.",
    ),
  );
  assert.ok(WORKLOG_VALIDATOR_RE.test("You must log work first"));
  assert.equal(
    WORKLOG_VALIDATOR_RE.test("Set the release(s) where the issue is merged"),
    false,
  );
});

test("a time-spent 400 is retried exactly once, with the worklog attached", async () => {
  const { http, posts } = stubHttp({
    transitions: [T("21", "Implemented", "Waiting for Review")],
    postResponses: [
      fail(400, {
        errorMessages: [
          "Please enter the time spent in order to move the task.",
        ],
      }),
      ok(),
    ],
  });
  const res = await transitionToStatus({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    issueKey: "K-1",
    targetStatus: ["Waiting for Review"],
    currentStatus: "In Progress",
    worklogTimeSpent: "1m",
    output: silent,
  });
  assert.equal(res.transitioned, true);
  assert.equal(res.loggedWork, true);
  assert.equal(posts.length, 2, "exactly one retry");
  assert.equal(posts[0].update, undefined, "first attempt carries no worklog");
  assert.deepEqual(posts[1].update, {
    worklog: [{ add: { timeSpent: "1m" } }],
  });
});

test("no retry when the 400 is about something else", async () => {
  // Attaching a worklog to a transition that did not ask for one is itself
  // rejected, so a blanket retry would break transitions that merely failed
  // for an unrelated reason.
  const { http, posts } = stubHttp({
    transitions: [T("21", "Implemented", "Waiting for Review")],
    postResponses: [
      fail(400, {
        errorMessages: ["Set the release(s) where the issue is merged"],
      }),
    ],
  });
  const res = await transitionToStatus({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    issueKey: "K-1",
    targetStatus: ["Waiting for Review"],
    currentStatus: "In Progress",
    worklogTimeSpent: "1m",
    output: silent,
  });
  assert.equal(res.transitioned, false);
  assert.equal(posts.length, 1, "no retry");
});

test("no retry when no duration is configured — a value is never invented", async () => {
  const { http, posts } = stubHttp({
    transitions: [T("21", "Implemented", "Waiting for Review")],
    postResponses: [
      fail(400, {
        errorMessages: [
          "Please enter the time spent in order to move the task.",
        ],
      }),
    ],
  });
  const res = await transitionToStatus({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    issueKey: "K-1",
    targetStatus: ["Waiting for Review"],
    currentStatus: "In Progress",
    output: silent,
  });
  assert.equal(res.transitioned, false);
  assert.equal(posts.length, 1);
});

test("a retry that also fails does not retry again", async () => {
  const { http, posts } = stubHttp({
    transitions: [T("21", "Implemented", "Waiting for Review")],
    postResponses: [
      fail(400, { errorMessages: ["Please enter the time spent."] }),
      fail(400, { errorMessages: ["Please enter the time spent."] }),
      ok(),
    ],
  });
  const res = await transitionToStatus({
    http,
    baseUrl: "https://x",
    email: "e",
    token: "t",
    issueKey: "K-1",
    targetStatus: ["Waiting for Review"],
    currentStatus: "In Progress",
    worklogTimeSpent: "1m",
    output: silent,
  });
  assert.equal(res.transitioned, false);
  assert.equal(posts.length, 2, "one attempt plus one retry, never more");
});

// --- CLI contract ----------------------------------------------------------

test("the CLI refuses an unknown stage with exit 2, and never transitions", async () => {
  const cli = require(join(__dirname, "..", "jira-stage.js"));
  const r = await cli.run({
    argv: ["node", "jira-stage.js", "--issue", "K-1", "--stage", "shipped"],
  });
  assert.equal(r.exitCode, 2);
});

test("the CLI requires both --issue and --stage", async () => {
  const cli = require(join(__dirname, "..", "jira-stage.js"));
  assert.equal(
    (await cli.run({ argv: ["node", "jira-stage.js", "--stage", "done"] }))
      .exitCode,
    2,
  );
  assert.equal(
    (await cli.run({ argv: ["node", "jira-stage.js", "--issue", "K-1"] }))
      .exitCode,
    2,
  );
});

test("describeAlternatives names a reachable status a LATER stage wants", () => {
  const cli = require(join(__dirname, "..", "jira-stage.js"));
  const hints = cli.describeAlternatives(
    [T("1", "Implemented", "Waiting for Review")],
    "work-started",
    { stages: { "in-review": { enabled: true } } },
    "Story",
  );
  assert.equal(hints.length, 1);
  assert.match(hints[0], /Waiting for Review.*in-review/);
});

test("describeAlternatives stays quiet about stages that are not enabled", () => {
  const cli = require(join(__dirname, "..", "jira-stage.js"));
  // in-qa is off by default, so a reachable Testing status is not a suggestion.
  assert.deepEqual(
    cli.describeAlternatives(
      [T("1", "Start Testing", "Testing")],
      "in-review",
      {},
      "Story",
    ),
    [],
  );
});

// --- ladder walking --------------------------------------------------------
//
// The properties under test here are the ones a single-hop implementation gets
// silently wrong: that transitions are re-read after every hop, that a blocked
// hop is reported as a card parked mid-ladder rather than as success or as a
// no-op, and that an aborted cycle is never dressed up as a completed walk.

const tw = require(join(__dirname, "..", "tracker-workflow.js"));
const { parseYamlSubset } = require(join(__dirname, "..", "yaml-subset.js"));
const fromYaml = (text) =>
  tw.buildWorkflow(parseYamlSubset(text), { source: "file", path: "<test>" });

// A ladder with a gate column between In Progress and Waiting for Review, so a
// move to review has to walk through it.
const GATE_LADDER = `
statuses:
  - Backlog
  - In Progress
  - Ready for Showcase
  - Waiting for Review
  - Done

pipeline:
  work-started: In Progress
  in-review: Waiting for Review
  done: Done
`;

// A stub whose transition list DEPENDS ON POSITION — a fresh list per GET, in
// order. A walk that cached the first list would read hop 2's options from hop
// 1's position and is caught here; a plain stubHttp cannot catch it, because
// replaying one list makes caching indistinguishable from re-fetching.
function stubWalk(perGet, { postResponses = [] } = {}) {
  const gets = [];
  const posts = [];
  let g = 0;
  let p = 0;
  const http = async (url, opts = {}) => {
    if ((opts.method || "GET") === "GET") {
      const list = perGet[Math.min(g, perGet.length - 1)];
      gets.push(url);
      g++;
      return { ok: true, status: 200, json: async () => ({ transitions: list }) };
    }
    posts.push(JSON.parse(opts.body));
    const r = postResponses[p++];
    return r || ok();
  };
  return { http, posts, gets, getCount: () => g };
}

const walkArgs = (extra) => ({
  baseUrl: "https://x.atlassian.net",
  email: "e@x",
  token: "t",
  issueKey: "K-1",
  output: silent,
  ...extra,
});

test("walk — a directly reachable target is one hop, identical to today", async () => {
  const wf = fromYaml(GATE_LADDER);
  const s = stubWalk([[T("1", "Start", "In Progress")]]);
  const res = await lib.walkLadder(
    walkArgs({
      http: s.http,
      from: "Backlog",
      targets: ["In Progress"],
      workflow: wf,
    }),
  );
  assert.equal(res.reason, "walked");
  assert.equal(res.landed, "In Progress");
  assert.equal(res.hops.length, 1);
  // Exactly one GET and one POST — the baseline a one-rung ladder must not
  // exceed. With n=1 the documented budget is 1 + 2n counted from the CLI,
  // whose extra call is the issue read; walkLadder itself owns the 2n.
  assert.equal(s.getCount(), 1);
  assert.equal(s.posts.length, 1);
});

test("walk — two rungs up walks through the gate, re-fetching between hops", async () => {
  const wf = fromYaml(GATE_LADDER);
  // Position-dependent: Waiting for Review is NOT offered from In Progress, and
  // is offered only once the card is in the showcase column.
  const s = stubWalk([
    [T("21", "Ready for Showcase", "Ready for Showcase")],
    [T("99", "Send to Review", "Waiting for Review")],
  ]);
  const res = await lib.walkLadder(
    walkArgs({
      http: s.http,
      from: "In Progress",
      targets: ["Waiting for Review"],
      workflow: wf,
    }),
  );
  assert.equal(res.reason, "walked");
  assert.equal(res.landed, "Waiting for Review");
  assert.equal(res.hops.length, 2);
  assert.deepEqual(
    res.hops.map((h) => h.to),
    ["Ready for Showcase", "Waiting for Review"],
  );
  assert.equal(s.getCount(), 2, "one GET per hop — never cached");
  assert.equal(s.posts.length, 2);
  // The second POST fired the transition only reachable FROM the gate.
  assert.equal(s.posts[1].transition.id, "99");
});

test("walk — a blocked second hop parks the card and says where", async () => {
  const wf = fromYaml(GATE_LADDER);
  // The gate is reachable; nothing leads onward from it. A real board shape.
  const s = stubWalk([
    [T("21", "Ready for Showcase", "Ready for Showcase")],
    [T("50", "Back to Work", "In Progress")],
  ]);
  const res = await lib.walkLadder(
    walkArgs({
      http: s.http,
      from: "In Progress",
      targets: ["Waiting for Review"],
      workflow: wf,
    }),
  );
  assert.equal(res.reason, "walk-incomplete");
  assert.equal(res.landed, "Ready for Showcase", "names the gate it stopped in");
  assert.equal(res.transitioned, true, "it DID move — just not all the way");
  assert.deepEqual(res.remaining, [["Waiting for Review"]]);
  // Distinguishable from a card that never moved at all: three outcomes, three
  // shapes. `landed !== from` is the discriminator.
  assert.notEqual(res.landed, res.from);
});

test("walk — a cycle is stopped and reported as incomplete, never as walked", async () => {
  // A ladder whose gate offers only a route back to where the walk started.
  const wf = fromYaml(GATE_LADDER);
  const s = stubWalk([
    [T("21", "Ready for Showcase", "Ready for Showcase")],
    [T("22", "Back", "In Progress")],
    [T("21", "Ready for Showcase", "Ready for Showcase")],
  ]);
  const res = await lib.walkLadder(
    walkArgs({
      http: s.http,
      from: "In Progress",
      // Target the status the walk STARTED from, so the target rung is a status
      // already visited and the loop guard has to fire.
      targets: ["In Progress"],
      workflow: wf,
      allowRegress: true,
    }),
  );
  assert.equal(
    res.reason,
    "walk-incomplete",
    "an aborted cycle is a BLOCKED walk, not a completed one",
  );
  assert.notEqual(res.reason, "walked");
  assert.ok("landed" in res && "remaining" in res);
});

test("walk — a rung resolves via a NON-first name, not just names[0]", async () => {
  const wf = fromYaml(`
statuses:
  - Backlog
  - In Progress
  - names:
      - In Review
      - Waiting for Review

pipeline:
  in-review: In Review
`);
  // The board spells the column "Waiting for Review" — the rung's SECOND name.
  // Collapsing the rung to names[0] would send the card to "In Review", which
  // this board does not have, and the walk would skip.
  const rung = tw.resolveMoment("in-review", wf);
  assert.ok(rung.targets.length > 1, "the fixture must actually offer two names");
  const s = stubWalk([[T("7", "Review", "Waiting for Review")]]);
  const res = await lib.walkLadder(
    walkArgs({
      http: s.http,
      from: "In Progress",
      targets: rung.targets,
      workflow: wf,
    }),
  );
  assert.equal(res.reason, "walked");
  assert.equal(res.landed, "Waiting for Review");
});

// --- the terminal fallback, narrowed --------------------------------------

const DONE_ONLY = [
  {
    id: "161",
    name: "Done",
    to: { name: "Done", statusCategory: { key: "done" } },
    fields: {},
  },
];

test("terminal — a retargeted done does NOT fire the done-category fallback", async () => {
  // `done` pointed at the gate column, which is not the ladder's last rung.
  const wf = fromYaml(`
statuses:
  - In Progress
  - Ready for Showcase
  - Done

pipeline:
  done: Ready for Showcase
`);
  const moment = tw.resolveMoment("done", wf);
  assert.equal(moment.isLastRung, false, "precondition: retargeted off the end");
  const terminal = lib.isTerminalMoment("done") && moment.isLastRung;
  assert.equal(terminal, false);

  // The board offers exactly ONE done-category transition, which is precisely
  // the shape that used to make rule 4 fire with confidence.
  const s = stubWalk([DONE_ONLY]);
  const res = await lib.walkLadder(
    walkArgs({
      http: s.http,
      from: "In Progress",
      targets: moment.targets,
      workflow: wf,
      terminal,
      localStatus: "done",
    }),
  );
  assert.equal(res.transitioned, false);
  assert.equal(s.posts.length, 0, "nothing was fired — a skip, not a wrong move");
  assert.notEqual(res.landed, "Done");
});

test("terminal — when the target IS the last rung the fallback still works", async () => {
  const wf = fromYaml(`
statuses:
  - In Progress
  - Done

pipeline:
  done: Done
`);
  const moment = tw.resolveMoment("done", wf);
  assert.equal(moment.isLastRung, true);
  // The board's transition is named "Done" and leads to "Done", so it would
  // match on name alone. Rename the destination so ONLY rule 4 can match it.
  const s = stubWalk([
    [
      {
        id: "161",
        name: "Close",
        to: { name: "Closed", statusCategory: { key: "done" } },
        fields: {},
      },
    ],
  ]);
  const res = await lib.walkLadder(
    walkArgs({
      http: s.http,
      from: "In Progress",
      targets: moment.targets,
      workflow: wf,
      terminal: lib.isTerminalMoment("done") && moment.isLastRung,
      localStatus: "accepted",
    }),
  );
  assert.equal(res.reason, "walked");
  assert.equal(res.landed, "Closed");
  assert.equal(s.posts[0].transition.id, "161");
});

// --- ladder-aware ranking --------------------------------------------------

test("rank — a rung declared only in the ladder is ranked, and guards a regress", async () => {
  const wf = fromYaml(GATE_LADDER);
  // "Ready for Showcase" is deliberately absent from DEFAULT_STATUS_RANK — its
  // own comment names this column as the example it leaves unranked.
  assert.equal(
    resolveStatusRank("Ready for Showcase", {}),
    null,
    "precondition: unranked without a ladder, so the guard has no opinion",
  );
  assert.equal(
    resolveStatusRank("Ready for Showcase", {}, wf),
    2,
    "declaring the rung ranks it",
  );

  // A resumed run re-firing `work-started` must not drag the card back out of
  // the gate it has already reached.
  const s = stubWalk([[T("50", "Back to Work", "In Progress")]]);
  const res = await lib.walkLadder(
    walkArgs({
      http: s.http,
      from: "Ready for Showcase",
      targets: ["In Progress"],
      workflow: wf,
      minRank: tw.rankOf("In Progress", wf),
    }),
  );
  assert.equal(res.reason, "would-regress");
  assert.equal(s.posts.length, 0, "the backwards transition was never fired");
});

test("rank — the legacy chain is untouched when no ladder is supplied", () => {
  // The regression signal for document/epic/story/task sync, none of which pass
  // a workflow: same inputs, same answers as before ladders existed.
  assert.equal(resolveStatusRank("In Progress", {}), 20);
  assert.equal(resolveStatusRank("Done", {}), 60);
  assert.equal(resolveStatusRank("Nonsense Column", {}), null);
  assert.equal(resolveStatusRank("In Progress", { statusRank: { "in progress": 5 } }), 5);
});

test("rank — in ladder mode an off-ladder status is null, not a legacy rank", () => {
  const wf = fromYaml(GATE_LADDER);
  // The scale trap: "Ready for Testing" is 40 on the legacy scale but absent
  // from this ladder, whose ranks are indices 0-4. Returning 40 here would be
  // compared against a target rung of, say, 3 and read as a regress, refusing an
  // ordinary forward move. Off-ladder means no opinion.
  assert.equal(resolveStatusRank("Ready for Testing", {}), 40);
  assert.equal(resolveStatusRank("Ready for Testing", {}, wf), null);
});

// --- the transitions parameter --------------------------------------------

test("transitionToStatus — a supplied transitions list suppresses the GET", async () => {
  const s = stubWalk([[T("1", "Go", "In Progress")]]);
  const res = await transitionToStatus({
    ...walkArgs({ http: s.http }),
    targetStatus: ["In Progress"],
    currentStatus: "Backlog",
    transitions: [T("1", "Go", "In Progress")],
  });
  assert.equal(res.transitioned, true);
  assert.equal(s.getCount(), 0, "no GET — the caller had already fetched");
  assert.equal(s.posts.length, 1);
});

test("transitionToStatus — without the parameter it still fetches its own", async () => {
  const s = stubWalk([[T("1", "Go", "In Progress")]]);
  const res = await transitionToStatus({
    ...walkArgs({ http: s.http }),
    targetStatus: ["In Progress"],
    currentStatus: "Backlog",
  });
  assert.equal(res.transitioned, true);
  assert.equal(s.getCount(), 1);
});

// --- CLI contract for the new flags ---------------------------------------

test("--print-plan needs no --issue, no credentials and no network", async () => {
  const cli = require(join(__dirname, "..", "jira-stage.js"));
  // A fetchImpl that throws: any network call at all fails this test.
  const boom = () => {
    throw new Error("--print-plan must not touch the network");
  };
  const r = await cli.run({
    argv: ["node", "jira-stage.js", "--stage", "done", "--print-plan", "--quiet"],
    fetchImpl: boom,
  });
  assert.equal(r.exitCode, 0);
  assert.equal(r.reason, "plan");
  assert.ok(Array.isArray(r.hops) && r.hops.length >= 1);
});

test("--print-plan reports whether the plan spans a real distance", async () => {
  const cli = require(join(__dirname, "..", "jira-stage.js"));
  const without = await cli.run({
    argv: ["node", "jira-stage.js", "--stage", "done", "--print-plan", "--quiet"],
  });
  assert.equal(without.spansFrom, false);
  const with_ = await cli.run({
    argv: [
      "node", "jira-stage.js", "--stage", "done", "--print-plan", "--quiet",
      "--from", "In Progress",
    ],
  });
  assert.equal(with_.spansFrom, true);
});

test("--print-plan still refuses an unknown stage with exit 2", async () => {
  const cli = require(join(__dirname, "..", "jira-stage.js"));
  const r = await cli.run({
    argv: ["node", "jira-stage.js", "--stage", "shipped", "--print-plan"],
  });
  assert.equal(r.exitCode, 2);
});

test("--from and --print-plan are documented in USAGE", () => {
  const cli = require(join(__dirname, "..", "jira-stage.js"));
  assert.match(cli.USAGE, /--print-plan/);
  assert.match(cli.USAGE, /--from/);
});

test("parseArgs accepts the new flags and defaults them off", () => {
  const cli = require(join(__dirname, "..", "jira-stage.js"));
  const base = cli.parseArgs(["node", "x", "--issue", "K-1", "--stage", "done"]);
  assert.equal(base.printPlan, false);
  assert.equal(base.from, "");
  const full = cli.parseArgs([
    "node", "x", "--stage", "done", "--print-plan", "--from", "In Progress",
    "--issue-type", "Story",
  ]);
  assert.equal(full.printPlan, true);
  assert.equal(full.from, "In Progress");
  assert.equal(full.issueType, "Story");
});
