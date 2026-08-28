/**
 * Layer-1 unit tests for the dashboard push.
 *
 * Two halves, and the second is the one that matters.
 *
 * The payload tests assert the shape a consumer builds against: they are the
 * executable half of the contract written in README.md, so a field renamed here
 * without renaming it there fails rather than silently ships.
 *
 * The failure-policy tests exist because "a push failure must never abort the
 * run" is exactly the kind of property that gets assumed rather than verified.
 * Each of the three real failure modes — unresolvable host, non-2xx, timeout —
 * is provoked deliberately and asserted to warn once and resolve. `pushDashboard`
 * is documented as never rejecting; if that ever stops being true, an eight-hour
 * unattended run dies at 3am because a status POST could not reach a web server
 * nobody was watching.
 *
 * Run via: node --test evals/loop-supervisor/unit/dashboard.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import {
  buildDashboardPayload,
  pushDashboard,
  pushRunFrame,
  redactRemoteUrl,
  childEnvFor,
  parseArgs,
  applyConfig,
  UNREADABLE,
} from "../../../skills/loop-supervisor/scripts/run-loop.mjs";

// ── fixtures ─────────────────────────────────────────────────────────────────

/** A heartbeat as `writeCurrent` actually writes it. */
const CURRENT = {
  schemaVersion: 1,
  runId: "2026-08-29T01-02-03-000Z-4242",
  pid: 4242,
  adapter: "develop-next",
  iteration: 7,
  phase: "running",
  pipelineStep: 5,
  itemId: "T94",
  branch: "feature/task.94.example",
  prUrl: "https://github.com/o/r/pull/1",
  sessionId: "11111111-2222-3333-4444-555555555555",
  totals: { iterations: 6, costUsd: 12.4, turns: 300 },
  updatedAt: "2026-08-29T01:15:35.000Z",
};

/** Ledger rows as `appendLedger` writes them, one per classifier outcome. */
const LEDGER = [
  { runId: "r", iteration: 1, outcome: "progress", itemId: "T90" },
  { runId: "r", iteration: 2, outcome: "progress", itemId: "T91" },
  { runId: "r", iteration: 3, outcome: "idle", itemId: null },
  { runId: "r", iteration: 4, outcome: "incomplete", itemId: "T92" },
  { runId: "r", iteration: 5, outcome: "error", itemId: "T93" },
  { runId: "r", iteration: 6, outcome: "halt", itemId: "T94" },
];

const base = {
  runId: "run-1",
  command: "/develop-next",
  startedAt: "2026-08-29T01:00:00.000Z",
  reporterHost: "test-host",
  repoUrl: "git@github.com:o/r.git",
};

// ── payload shape ────────────────────────────────────────────────────────────

test("payload carries every field the documented contract names", () => {
  const p = buildDashboardPayload({
    ...base,
    current: CURRENT,
    elapsedSec: 812,
    ledger: LEDGER,
    totals: { iterations: 7, costUsd: 12.4 },
  });

  assert.equal(p.schemaVersion, 1);
  assert.equal(p.active, true);
  assert.equal(p.runId, "run-1");
  assert.equal(p.command, "/develop-next");
  assert.equal(p.startedAt, "2026-08-29T01:00:00.000Z");
  assert.equal(p.reporterHost, "test-host");
  assert.equal(p.repoUrl, "git@github.com:o/r.git");

  assert.deepEqual(p.current, {
    iteration: 7,
    phase: "running",
    pipelineStep: 5,
    itemId: "T94",
    branch: "feature/task.94.example",
    prUrl: "https://github.com/o/r/pull/1",
    sessionId: "11111111-2222-3333-4444-555555555555",
    elapsedSec: 812,
  });
});

test("schemaVersion is the same constant the ledger and current.json carry", () => {
  const p = buildDashboardPayload({ ...base, current: CURRENT, ledger: [] });
  // Not a literal check for its own sake: the whole point of the field is that a
  // consumer can version-check a frame against a value it may already have read
  // out of runs.jsonl, which is only true while there is exactly one of them.
  assert.equal(p.schemaVersion, CURRENT.schemaVersion);
});

test("totals count every classifier outcome, not just the three named in the example", () => {
  const p = buildDashboardPayload({
    ...base,
    current: CURRENT,
    ledger: LEDGER,
    totals: { iterations: 6, costUsd: 3.21 },
  });
  assert.equal(p.totals.iterations, 6);
  assert.equal(p.totals.costUsd, 3.21);
  assert.equal(p.totals.progressed, 2);
  assert.equal(p.totals.idle, 1);
  assert.equal(p.totals.incomplete, 1);
  assert.equal(p.totals.errored, 1);
  assert.equal(p.totals.halted, 1);
  // A dashboard that renders only progressed/halted/idle would show 6
  // iterations accounted for by 4. The histogram has to sum.
  const summed =
    p.totals.progressed +
    p.totals.idle +
    p.totals.incomplete +
    p.totals.errored +
    p.totals.halted +
    p.totals.done;
  assert.equal(summed, LEDGER.length);
});

test("recent is truncated to the trailing N rows, oldest first", () => {
  const many = Array.from({ length: 25 }, (_, i) => ({
    iteration: i + 1,
    outcome: "progress",
  }));
  const p = buildDashboardPayload({ ...base, ledger: many, recentLimit: 10 });
  assert.equal(p.recent.length, 10);
  assert.equal(p.recent[0].iteration, 16);
  assert.equal(p.recent[9].iteration, 25);
});

test("the final frame is active:false with a null current", () => {
  // Pushed after cleanup has removed current.json, which is what makes a
  // dashboard show a finished run rather than an iteration frozen mid-flight.
  const p = buildDashboardPayload({
    ...base,
    active: false,
    current: null,
    ledger: LEDGER,
    totals: { iterations: 6, costUsd: 1 },
  });
  assert.equal(p.active, false);
  assert.equal(p.current, null);
  assert.equal(p.totals.iterations, 6);
});

test("a torn heartbeat is published as no current, never as the sentinel", () => {
  const p = buildDashboardPayload({ ...base, current: UNREADABLE, ledger: [] });
  assert.equal(p.current, null);
});

test("reporterHost defaults to this machine", () => {
  const { reporterHost, ...noHost } = base;
  const p = buildDashboardPayload({ ...noHost, ledger: [] });
  assert.equal(p.reporterHost, os.hostname());
});

test("the token reaches the header and never the request body", async () => {
  // This test replaced a tautology. The previous version called
  // buildDashboardPayload — which has no token parameter — and asserted the
  // literal was absent from the result. It could not fail: deleting the token
  // header from pushDashboard entirely left it green, which is how QA found it.
  //
  // Driving the REAL push path is what makes the assertion load-bearing: a
  // future field that copied opts.dashboardToken into the frame would fail here.
  let seen = null;
  await pushRunFrame({
    cwd: "/nonexistent",
    runId: "run-1",
    command: "/develop-next",
    startedAt: base.startedAt,
    repoUrl: base.repoUrl,
    url: "https://dash.example/api/loop",
    token: "s3cret",
    totals: { iterations: 3, costUsd: 1 },
    readCurrentImpl: () => CURRENT,
    readLedgerImpl: () => LEDGER.map((r) => ({ ...r, runId: "run-1" })),
    fetchImpl: async (url, init) => {
      seen = init;
      return { ok: true, status: 200 };
    },
    warn: () => assert.fail("a successful push must not warn"),
  });

  assert.equal(seen.headers["X-Dash-Token"], "s3cret");
  assert.equal(
    seen.body.includes("s3cret"),
    false,
    "the token must never reach the serialised frame",
  );
});

// ── the token header and the request ─────────────────────────────────────────

test("a successful push sends the payload with the token header", async () => {
  let seen = null;
  const res = await pushDashboard(
    { hello: "world" },
    {
      url: "https://dash.example/api/loop",
      token: "s3cret",
      fetchImpl: async (url, init) => {
        seen = { url, init };
        return { ok: true, status: 200 };
      },
      warn: () => assert.fail("a successful push must not warn"),
    },
  );
  assert.deepEqual(res, { pushed: true });
  assert.equal(seen.url, "https://dash.example/api/loop");
  assert.equal(seen.init.method, "POST");
  assert.equal(seen.init.headers["X-Dash-Token"], "s3cret");
  assert.equal(seen.init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(seen.init.body), { hello: "world" });
});

test("no token means no token header — the push still goes out", async () => {
  let seen = null;
  const res = await pushDashboard(
    { a: 1 },
    {
      url: "https://dash.example/api/loop",
      token: null,
      fetchImpl: async (url, init) => {
        seen = init;
        return { ok: true, status: 204 };
      },
    },
  );
  assert.equal(res.pushed, true);
  assert.equal("X-Dash-Token" in seen.headers, false);
});

test("no --dashboard url makes the push a no-op that never calls fetch", async () => {
  const res = await pushDashboard(
    { a: 1 },
    {
      url: null,
      fetchImpl: async () => assert.fail("must not be called"),
      warn: () => assert.fail("an inert push must not warn"),
    },
  );
  assert.deepEqual(res, { pushed: false, reason: "no dashboard url" });
});

// ── the failure policy, proved by deliberate breakage ────────────────────────
//
// The three tests below are the reason this file exists. Each provokes one real
// failure mode and asserts the same two things: exactly one warning, and a
// resolved promise. `pushDashboard` must never reject, because the caller
// awaits it inside the loop and has no catch.

test("unresolvable host warns once and resolves", async () => {
  const warnings = [];
  const dnsError = new TypeError("fetch failed");
  dnsError.cause = new Error("getaddrinfo ENOTFOUND does-not-resolve.invalid");

  const res = await pushDashboard(
    { a: 1 },
    {
      url: "https://does-not-resolve.invalid/api/loop",
      fetchImpl: async () => {
        throw dnsError;
      },
      warn: (m) => warnings.push(m),
    },
  );

  assert.equal(res.pushed, false);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /dashboard push failed/);
  assert.match(warnings[0], /continuing/);
});

test("a non-2xx response warns once, names the status, and resolves", async () => {
  const warnings = [];
  const res = await pushDashboard(
    { a: 1 },
    {
      url: "https://dash.example/api/loop",
      fetchImpl: async () => ({ ok: false, status: 503 }),
      warn: (m) => warnings.push(m),
    },
  );

  assert.equal(res.pushed, false);
  assert.equal(res.reason, "http 503");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /503/);
  assert.match(warnings[0], /continuing/);
});

test("a timeout warns once and resolves", async () => {
  const warnings = [];
  const abort = new Error("The operation was aborted due to timeout");
  abort.name = "TimeoutError";

  const res = await pushDashboard(
    { a: 1 },
    {
      url: "https://dash.example/api/loop",
      timeoutMs: 25,
      fetchImpl: async () => {
        throw abort;
      },
      warn: (m) => warnings.push(m),
    },
  );

  assert.equal(res.pushed, false);
  assert.match(res.reason, /timed out after 25ms/);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /timed out/);
});

// Opt-in: this one performs a REAL DNS lookup. On a network whose resolver
// hijacks NXDOMAIN with a captive-portal 200 the push succeeds and the test
// fails for reasons that have nothing to do with the code. It stays valuable —
// it is the only case not injecting its own failure — so it is kept and gated
// rather than deleted. Run it with LOOP_SUPERVISOR_LIVE_NETWORK_TESTS=1.
test(
  "a genuinely unreachable host over the real network still resolves",
  {
    skip: process.env.LOOP_SUPERVISOR_LIVE_NETWORK_TESTS
      ? false
      : "set LOOP_SUPERVISOR_LIVE_NETWORK_TESTS=1 to run the live-network case",
  },
  async () => {
    const warnings = [];
    const res = await pushDashboard(
      { a: 1 },
      {
        url: "http://loop-supervisor-does-not-exist.invalid/api/loop",
        timeoutMs: 2000,
        warn: (m) => warnings.push(m),
      },
    );
    assert.equal(res.pushed, false);
    assert.equal(warnings.length, 1);
  },
);

test("a payload that will not serialise warns once instead of throwing", async () => {
  const warnings = [];
  const circular = {};
  circular.self = circular;
  const res = await pushDashboard(circular, {
    url: "https://dash.example/api/loop",
    fetchImpl: async () => assert.fail("must not reach fetch"),
    warn: (m) => warnings.push(m),
  });
  assert.equal(res.pushed, false);
  // Pin the reason, not just the outcome. Without this the test passes with the
  // inner JSON.stringify guard deleted: the same TypeError would fall through to
  // the outer catch and produce an identical pushed/warnings result.
  assert.equal(res.reason, "unserialisable payload");
  assert.equal(warnings.length, 1);
});

test("a runtime without fetch warns once instead of throwing", async () => {
  const warnings = [];
  // `null`, not `undefined`: a default parameter only fires on `undefined`, so
  // passing that would silently resolve to the real `globalThis.fetch` and test
  // the DNS path again. `null` is what reaches the typeof guard, which is the
  // same value the guard sees when a runtime genuinely has no fetch.
  const res = await pushDashboard(
    { a: 1 },
    {
      url: "https://dash.example/api/loop",
      fetchImpl: null,
      warn: (m) => warnings.push(m),
    },
  );
  assert.equal(res.pushed, false);
  assert.equal(res.reason, "no fetch");
  assert.equal(warnings.length, 1);
});

// ── flags and config ─────────────────────────────────────────────────────────

test("--dashboard and --dashboard-token parse", () => {
  const o = parseArgs([
    "run",
    "--dashboard",
    "https://dash.example/api/loop",
    "--dashboard-token",
    "s3cret",
  ]);
  assert.equal(o.dashboard, "https://dash.example/api/loop");
  assert.equal(o.dashboardToken, "s3cret");
});

test("both flags are absent by default", () => {
  const o = parseArgs(["run"]);
  assert.equal(o.dashboard, null);
  assert.equal(o.dashboardToken, null);
});

test("--dashboard needs a value", () => {
  assert.throws(
    () => parseArgs(["run", "--dashboard"]),
    /--dashboard needs a value/,
  );
});

test("config supplies dashboardUrl, and an explicit flag still wins", () => {
  const fromConfig = applyConfig(parseArgs(["run"]), {
    loopSupervisor: { dashboardUrl: "https://from-config/api" },
  });
  assert.equal(fromConfig.dashboard, "https://from-config/api");

  const fromFlag = applyConfig(
    parseArgs(["run", "--dashboard", "https://from-flag/api"]),
    { loopSupervisor: { dashboardUrl: "https://from-config/api" } },
  );
  assert.equal(fromFlag.dashboard, "https://from-flag/api");
});

test("the token is never read from config, only from the flag or the environment", () => {
  const prev = process.env.LOOP_SUPERVISOR_DASHBOARD_TOKEN;
  delete process.env.LOOP_SUPERVISOR_DASHBOARD_TOKEN;
  try {
    // A token key in skills-config.yaml is ignored: that file is committed, and
    // a credential read from it would be a credential in git history.
    const o = applyConfig(parseArgs(["run"]), {
      loopSupervisor: { dashboardToken: "should-be-ignored" },
    });
    assert.equal(o.dashboardToken, null);

    process.env.LOOP_SUPERVISOR_DASHBOARD_TOKEN = "from-env";
    assert.equal(
      applyConfig(parseArgs(["run"]), {}).dashboardToken,
      "from-env",
    );

    // The flag beats the environment.
    assert.equal(
      applyConfig(parseArgs(["run", "--dashboard-token", "from-flag"]), {})
        .dashboardToken,
      "from-flag",
    );
  } finally {
    if (prev === undefined) delete process.env.LOOP_SUPERVISOR_DASHBOARD_TOKEN;
    else process.env.LOOP_SUPERVISOR_DASHBOARD_TOKEN = prev;
  }
});

// ── the frame push at the RUN level ──────────────────────────────────────────
//
// Success Criterion 2 is a claim about the RUN — "leave the run's outcome and
// exit status unchanged" — not about pushDashboard. The tests above prove the
// layer below it. These drive `pushRunFrame`, which is the unit the loop
// actually calls, so the criterion is proved where it is stated.

const frameBase = {
  cwd: "/nonexistent",
  runId: "run-1",
  command: "/develop-next",
  startedAt: "2026-08-29T01:00:00.000Z",
  repoUrl: "git@github.com:o/r.git",
  url: "https://dash.example/api/loop",
  totals: { iterations: 3, costUsd: 1.5 },
  readCurrentImpl: () => CURRENT,
  readLedgerImpl: () => LEDGER.map((r) => ({ ...r, runId: "run-1" })),
};

test("the frame publishes only THIS run's ledger rows", async () => {
  // runs.jsonl is append-only across runs. Passing it whole made a second run
  // in the same tree publish the previous run's outcomes as its own, with
  // counts that disagreed with totals.iterations and a `recent` showing
  // iterations from a run that had already finished.
  let body = null;
  const mixed = [
    { runId: "OLD-run", iteration: 1, outcome: "progress" },
    { runId: "OLD-run", iteration: 2, outcome: "halt" },
    { runId: "run-1", iteration: 1, outcome: "progress" },
    { runId: "run-1", iteration: 2, outcome: "idle" },
  ];

  await pushRunFrame({
    ...frameBase,
    readLedgerImpl: () => mixed,
    totals: { iterations: 2, costUsd: 1 },
    fetchImpl: async (_u, init) => {
      body = JSON.parse(init.body);
      return { ok: true, status: 200 };
    },
  });

  assert.equal(body.totals.progressed, 1);
  assert.equal(body.totals.idle, 1);
  assert.equal(
    body.totals.halted,
    0,
    "the previous run's halt must not appear",
  );
  assert.equal(body.recent.length, 2);
  assert.deepEqual(
    body.recent.map((r) => r.runId),
    ["run-1", "run-1"],
  );
  // The contract the README states: the counts sum to iterations.
  const summed =
    body.totals.progressed +
    body.totals.idle +
    body.totals.incomplete +
    body.totals.errored +
    body.totals.halted +
    body.totals.done;
  assert.equal(summed, body.totals.iterations);
});

test("a torn or missing heartbeat does not stop the frame going out", async () => {
  let body = null;
  await pushRunFrame({
    ...frameBase,
    readCurrentImpl: () => UNREADABLE,
    fetchImpl: async (_u, init) => {
      body = JSON.parse(init.body);
      return { ok: true, status: 200 };
    },
  });
  assert.equal(body.current, null);
  assert.equal(body.active, true);
});

// SC2, proved at the level the criterion states it: every failure mode resolves,
// warns at most once, and returns a value the caller can ignore. The loop awaits
// this with no catch, so "never rejects" IS "the run's outcome is unchanged".
for (const [name, mode] of [
  [
    "unresolvable host",
    {
      fetchImpl: async () => {
        const e = new TypeError("fetch failed");
        e.cause = new Error("getaddrinfo ENOTFOUND");
        throw e;
      },
    },
  ],
  ["non-2xx", { fetchImpl: async () => ({ ok: false, status: 503 }) }],
  [
    "timeout",
    {
      fetchImpl: async () => {
        const e = new Error("aborted");
        e.name = "TimeoutError";
        throw e;
      },
    },
  ],
  [
    "a throwing ledger read",
    {
      readLedgerImpl: () => {
        throw new Error("EACCES");
      },
    },
  ],
  [
    "a throwing heartbeat read",
    {
      readCurrentImpl: () => {
        throw new Error("EIO");
      },
    },
  ],
  ["no fetch in the runtime", { fetchImpl: null }],
]) {
  test(`SC2: ${name} leaves the run able to continue`, async () => {
    const warnings = [];
    let result;
    // The assertion is the absence of a throw: pushRunFrame is documented as
    // never rejecting, and the loop relies on that with no catch of its own.
    await assert.doesNotReject(async () => {
      result = await pushRunFrame({
        ...frameBase,
        ...mode,
        warn: (m) => warnings.push(m),
      });
    });
    assert.equal(result.pushed, false);
    assert.ok(
      warnings.length <= 1,
      `warned ${warnings.length} times, expected at most 1`,
    );
  });
}

test("no dashboard url makes the whole frame path inert", async () => {
  const res = await pushRunFrame({
    ...frameBase,
    url: null,
    readLedgerImpl: () => assert.fail("must not read the ledger"),
    fetchImpl: async () => assert.fail("must not call fetch"),
    warn: () => assert.fail("must not warn"),
  });
  assert.deepEqual(res, { pushed: false, reason: "no dashboard url" });
});

// ── repoUrl redaction ────────────────────────────────────────────────────────

test("an HTTPS remote's embedded credential is stripped before publishing", () => {
  assert.equal(
    redactRemoteUrl("https://x-access-token:ghp_secret@github.com/o/r.git"),
    "https://github.com/o/r.git",
  );
  assert.equal(
    redactRemoteUrl("https://user@github.com/o/r.git"),
    "https://github.com/o/r.git",
  );
});

test("an SSH remote passes through untouched", () => {
  // scp-like syntax, not a URL — `git` here is a username, not a credential.
  assert.equal(
    redactRemoteUrl("git@github.com:o/r.git"),
    "git@github.com:o/r.git",
  );
  assert.equal(
    redactRemoteUrl("ssh://git@github.com/o/r.git"),
    "ssh://github.com/o/r.git",
  );
  assert.equal(redactRemoteUrl(null), null);
});

// ── the child-environment credential boundary ────────────────────────────────
//
// QA cycle 2 found this protection real but unheld: deleting the strip left the
// whole suite green, because it lived inline in main() where no test could reach
// it. That is the same shape as the vacuous token test cycle 1 found — a
// mitigation nothing enforces — so it is now a pure function with tests on it.

test("the spawned child never inherits the dashboard token", () => {
  const env = childEnvFor({
    PATH: "/usr/bin",
    HOME: "/home/x",
    LOOP_SUPERVISOR_DASHBOARD_TOKEN: "s3cret",
  });
  assert.equal("LOOP_SUPERVISOR_DASHBOARD_TOKEN" in env, false);
  assert.equal(JSON.stringify(env).includes("s3cret"), false);
});

test("everything else in the environment survives untouched", () => {
  // The child is a real Claude process: stripping more than the one variable
  // would break PATH resolution, credentials it legitimately needs, or the
  // terminal settings its output depends on.
  const source = {
    PATH: "/usr/bin",
    HOME: "/home/x",
    ANTHROPIC_API_KEY: "kept",
    TERM: "xterm",
    LOOP_SUPERVISOR_DASHBOARD_TOKEN: "s3cret",
  };
  const env = childEnvFor(source);
  assert.deepEqual(env, {
    PATH: "/usr/bin",
    HOME: "/home/x",
    ANTHROPIC_API_KEY: "kept",
    TERM: "xterm",
  });
  // and the source is not mutated — the supervisor still needs its own token
  assert.equal(source.LOOP_SUPERVISOR_DASHBOARD_TOKEN, "s3cret");
});

test("an environment without the token is passed through unchanged", () => {
  const source = { PATH: "/usr/bin" };
  assert.deepEqual(childEnvFor(source), { PATH: "/usr/bin" });
});
