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
