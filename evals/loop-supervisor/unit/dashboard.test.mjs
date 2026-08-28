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

test("the token never appears anywhere in a serialised frame", () => {
  // The frame is written to logs and handed to a consumer. A token that reached
  // it would outlive the run that authorised it.
  const p = buildDashboardPayload({
    ...base,
    current: CURRENT,
    ledger: LEDGER,
    totals: { iterations: 6, costUsd: 1 },
  });
  assert.equal(JSON.stringify(p).includes("s3cret"), false);
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

test("a genuinely unreachable host over the real network still resolves", async () => {
  // The three tests above inject the failure. This one does not: it uses the
  // real `fetch` against a hostname that cannot resolve, so the assertion
  // survives a future refactor that changes which errors Node throws.
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
});

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
