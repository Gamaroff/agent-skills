/**
 * Layer-1 unit tests for the loop-supervisor CLI's pure surface.
 *
 * The loop body itself spawns processes and is covered by the cheap end-to-end
 * run; what is unit-tested here is everything that decides WITHOUT spawning —
 * argv parsing, the budget ceilings, absolute binary resolution (gotcha 4), the
 * rendered-log projection, and the `claude` argv itself.
 *
 * The argv test is not ceremony: `--output-format stream-json` REQUIRES
 * `--verbose`, and a version bump that silently dropped it would produce empty
 * logs for a whole night's run.
 *
 * Run via: node --test evals/loop-supervisor/unit/run-loop.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import {
  parseArgs,
  parseDuration,
  buildClaudeArgs,
  buildPrompt,
  budgetExceeded,
  renderStreamLine,
  resolveBinary,
  transcriptPathFor,
  isPidAlive,
  applyConfig,
  readCurrent,
  readLedger,
  notifyTerminalStop,
} from "../../../skills/loop-supervisor/scripts/run-loop.mjs";
import fs from "node:fs";

// ── argv ─────────────────────────────────────────────────────────────────────

test("run is the default subcommand", () => {
  assert.equal(parseArgs([]).subcommand, "run");
  assert.equal(
    parseArgs(["--adapter", "generic", "--command", "hi"]).subcommand,
    "run",
  );
});

test("dry-run is recognised as a subcommand", () => {
  assert.equal(parseArgs(["dry-run"]).subcommand, "dry-run");
});

test("an unknown subcommand is rejected, not silently treated as run", () => {
  // `watch` was the example here until task 63 made it a real subcommand.
  // Keep an example that is genuinely unknown, or this asserts nothing.
  assert.throws(() => parseArgs(["sprint"]), /unknown subcommand/);
});

test("an unknown option is rejected rather than ignored", () => {
  assert.throws(() => parseArgs(["run", "--turbo"]), /unknown option/);
});

test("a flag missing its value is rejected", () => {
  assert.throws(() => parseArgs(["run", "--adapter"]), /needs a value/);
});

test("defaults match the documented ones", () => {
  const o = parseArgs([]);
  assert.equal(o.adapter, "develop-next");
  assert.equal(o.base, "develop");
  assert.equal(o.maxIdle, 2);
  assert.equal(o.maxResumeAttempts, 2);
  assert.equal(o.onError, "stop");
  assert.equal(o.cooldown, 10);
  assert.equal(o.maxTurns, null, "--max-turns is wired but unset by default");
  assert.equal(o.maxIterations, null);
});

test("the generic adapter requires --command for a real run", () => {
  assert.throws(
    () => parseArgs(["run", "--adapter", "generic"]),
    /--command is required/,
  );
});

test("the generic adapter does NOT require --command for a dry-run", () => {
  assert.doesNotThrow(() => parseArgs(["dry-run", "--adapter", "generic"]));
});

test("--on-error only accepts stop or continue", () => {
  assert.equal(
    parseArgs(["run", "--on-error", "continue"]).onError,
    "continue",
  );
  assert.throws(
    () => parseArgs(["run", "--on-error", "retry-twice"]),
    /--on-error must be/,
  );
});

// ── durations ────────────────────────────────────────────────────────────────

test("parseDuration handles s/m/h/d and bare seconds", () => {
  assert.equal(parseDuration("30s"), 30_000);
  assert.equal(parseDuration("90m"), 5_400_000);
  assert.equal(parseDuration("8h"), 28_800_000);
  assert.equal(parseDuration("1d"), 86_400_000);
  assert.equal(parseDuration("45"), 45_000);
});

test("parseDuration rejects nonsense instead of coercing it to 0", () => {
  assert.throws(() => parseDuration("soon"), /bad duration/);
  assert.throws(() => parseDuration("8 fortnights"), /bad duration/);
});

// ── the claude argv ──────────────────────────────────────────────────────────

test("stream-json is always accompanied by --verbose", () => {
  const a = buildClaudeArgs({
    prompt: "/develop-next",
    sessionId: "s",
    settingsPath: "/x.json",
  });
  const i = a.indexOf("--output-format");
  assert.equal(a[i + 1], "stream-json");
  assert.ok(
    a.includes("--verbose"),
    "claude 2.1.250 REQUIRES --verbose with stream-json; without it a whole night logs nothing",
  );
});

test("the session id is pinned so the transcript stays resumable", () => {
  const a = buildClaudeArgs({
    prompt: "p",
    sessionId: "abc-123",
    settingsPath: "/x.json",
  });
  assert.equal(a[a.indexOf("--session-id") + 1], "abc-123");
});

test("permission mode is acceptEdits — not plan mode, not skip-permissions", () => {
  const a = buildClaudeArgs({
    prompt: "p",
    sessionId: "s",
    settingsPath: "/x.json",
  });
  assert.equal(a[a.indexOf("--permission-mode") + 1], "acceptEdits");
  assert.ok(!a.includes("--dangerously-skip-permissions"));
  assert.ok(!a.includes("plan"));
});

test("settings are pinned so a run does not inherit local settings drift", () => {
  const a = buildClaudeArgs({
    prompt: "p",
    sessionId: "s",
    settingsPath: "/pinned.json",
  });
  assert.equal(a[a.indexOf("--settings") + 1], "/pinned.json");
});

test("--max-turns is omitted when unset and present when set", () => {
  assert.ok(
    !buildClaudeArgs({
      prompt: "p",
      sessionId: "s",
      settingsPath: "/x",
    }).includes("--max-turns"),
  );
  const a = buildClaudeArgs({
    prompt: "p",
    sessionId: "s",
    settingsPath: "/x",
    maxTurns: 40,
  });
  assert.equal(a[a.indexOf("--max-turns") + 1], "40");
});

test("the prompt is passed with -p as the first pair", () => {
  const a = buildClaudeArgs({
    prompt: "/develop-next",
    sessionId: "s",
    settingsPath: "/x",
  });
  assert.equal(a[0], "-p");
  assert.equal(a[1], "/develop-next");
});

test("buildPrompt uses the adapter's command, and --command overrides it", () => {
  assert.equal(
    buildPrompt({ name: "develop-next", command: "/develop-next" }, {}),
    "/develop-next",
  );
  assert.equal(
    buildPrompt(
      { name: "develop-next", command: "/develop-next" },
      { command: "/develop-batch" },
    ),
    "/develop-batch",
  );
  assert.equal(
    buildPrompt(
      { name: "generic", command: null },
      { command: "reply with OK" },
    ),
    "reply with OK",
  );
});

// ── budget ───────────────────────────────────────────────────────────────────

const totals = (o) =>
  Object.assign(
    { iterations: 0, costUsd: 0, consecutiveIdle: 0, startedAtMs: 1000 },
    o,
  );

test("no ceilings configured means the budget never trips", () => {
  assert.equal(
    budgetExceeded(totals({ iterations: 999 }), parseArgs([]), 10 ** 12),
    null,
  );
});

test("--max-iterations trips AT the ceiling, not one past it", () => {
  const o = parseArgs(["run", "--max-iterations", "2"]);
  assert.equal(budgetExceeded(totals({ iterations: 1 }), o, 2000), null);
  assert.match(
    budgetExceeded(totals({ iterations: 2 }), o, 2000),
    /max-iterations/,
  );
});

test("--max-cost trips at the ceiling — a spent budget is not a ceiling", () => {
  const o = parseArgs(["run", "--max-cost", "1.5"]);
  assert.equal(budgetExceeded(totals({ costUsd: 1.4 }), o, 2000), null);
  assert.match(budgetExceeded(totals({ costUsd: 1.5 }), o, 2000), /max-cost/);
});

test("--max-duration trips on elapsed wall clock", () => {
  const o = parseArgs(["run", "--max-duration", "30s"]);
  assert.equal(budgetExceeded(totals({}), o, 1000 + 29_000), null);
  assert.match(budgetExceeded(totals({}), o, 1000 + 30_000), /max-duration/);
});

test("--max-idle catches silent spinning", () => {
  const o = parseArgs(["run", "--max-idle", "2"]);
  assert.equal(budgetExceeded(totals({ consecutiveIdle: 1 }), o, 2000), null);
  assert.match(
    budgetExceeded(totals({ consecutiveIdle: 2 }), o, 2000),
    /max-idle/,
  );
});

// ── gotcha 4: absolute binaries ──────────────────────────────────────────────

test("resolveBinary('node') returns the running interpreter, absolutely", () => {
  const p = resolveBinary("node");
  assert.ok(
    path.isAbsolute(p),
    "an nvm shell function is not a binary — the path must be absolute",
  );
  assert.equal(p, process.execPath);
});

test("resolveBinary throws rather than returning a bare name to spawn", () => {
  assert.throws(
    () => resolveBinary("definitely-not-a-real-binary-xyz"),
    /absolute path/,
  );
});

// ── rendered log ─────────────────────────────────────────────────────────────

test("assistant text is rendered", () => {
  const out = renderStreamLine({
    type: "assistant",
    message: { content: [{ type: "text", text: "Selected T62." }] },
  });
  assert.equal(out, "Selected T62.");
});

test("tool calls render their NAME only — never their input", () => {
  const out = renderStreamLine({
    type: "assistant",
    message: {
      content: [
        {
          type: "tool_use",
          name: "Bash",
          input: { command: "x".repeat(5000) },
        },
      ],
    },
  });
  assert.equal(out, "  → Bash");
  assert.ok(
    !out.includes("xxxx"),
    "a tool input can be a whole file; this log is for a human at 3am",
  );
});

test("the result envelope renders as a one-line summary", () => {
  const out = renderStreamLine({
    type: "result",
    subtype: "success",
    num_turns: 12,
    total_cost_usd: 0.42,
  });
  assert.match(out, /subtype=success/);
  assert.match(out, /turns=12/);
  assert.match(out, /\$0\.4200/);
});

test("uninteresting stream lines render nothing", () => {
  assert.equal(renderStreamLine({ type: "stream_event" }), null);
  assert.equal(renderStreamLine({ type: "system", subtype: "init" }), null);
  assert.equal(renderStreamLine(null), null);
  assert.equal(renderStreamLine("not an object"), null);
});

test("empty assistant text renders nothing rather than a blank line", () => {
  assert.equal(
    renderStreamLine({
      type: "assistant",
      message: { content: [{ type: "text", text: "   " }] },
    }),
    null,
  );
});

// ── transcript path + pid liveness ───────────────────────────────────────────

test("transcriptPathFor points at where claude --resume will look", () => {
  const p = transcriptPathFor("/Users/x/Dev/repo", "abc-123", "/Users/x");
  assert.equal(
    p,
    path.join(
      "/Users/x",
      ".claude",
      "projects",
      "-Users-x-Dev-repo",
      "abc-123.jsonl",
    ),
  );
});

test("transcriptPathFor slugs dots as well as slashes", () => {
  assert.match(transcriptPathFor("/a/b.c/d", "s", "/h"), /-a-b-c-d/);
});

test("isPidAlive is true for this process and false for an implausible pid", () => {
  assert.equal(isPidAlive(process.pid), true);
  assert.equal(isPidAlive(4_194_303), false);
});

// ── LS-1: config must never override an explicitly-supplied flag ─────────────
//
// The bug this pins: presence was inferred by comparing the parsed value against
// DEFAULTS, so `--base develop` was indistinguishable from "not supplied" and a
// config `baseBranch: main` won over it. `--base` is the ref the progress oracle
// watches, so the wrong ref makes tickCommitOracle never fire — every healthy
// iteration classifies `idle`, and --max-idle ends a working loop while
// reporting no progress. A silent wrong answer, which is the failure class this
// whole component exists to detect.

const CFG = {
  loopSupervisor: {
    baseBranch: "main",
    roadmapPath: "docs/from-config.md",
    cooldownSeconds: 300,
  },
};

test("LS-1: an explicit flag EQUAL TO THE DEFAULT still beats config", () => {
  const o = applyConfig(
    parseArgs(["run", "--base", "develop", "--cooldown", "10"]),
    CFG,
  );
  assert.equal(
    o.base,
    "develop",
    "`--base develop` was named by the caller; config must not win",
  );
  assert.equal(
    o.cooldown,
    10,
    "`--cooldown 10` was named by the caller; config must not win",
  );
});

test("LS-1: an explicit flag DIFFERENT from the default also beats config", () => {
  const o = applyConfig(
    parseArgs(["run", "--base", "release", "--cooldown", "5"]),
    CFG,
  );
  assert.equal(o.base, "release");
  assert.equal(o.cooldown, 5);
});

test("LS-1: config still fills in options the caller did NOT name", () => {
  const o = applyConfig(parseArgs(["run"]), CFG);
  assert.equal(o.base, "main");
  assert.equal(o.roadmap, "docs/from-config.md");
  assert.equal(o.cooldown, 300);
});

test("LS-1: --roadmap is covered by the same rule", () => {
  const o = applyConfig(parseArgs(["run", "--roadmap", "docs/mine.md"]), CFG);
  assert.equal(o.roadmap, "docs/mine.md");
});

test("LS-1: explicit tracking is per-option, not all-or-nothing", () => {
  const o = applyConfig(parseArgs(["run", "--base", "develop"]), CFG);
  assert.equal(o.base, "develop", "named — caller wins");
  assert.equal(o.cooldown, 300, "not named — config fills in");
  assert.equal(o.roadmap, "docs/from-config.md", "not named — config fills in");
});

test("LS-1: an empty config leaves explicitly-supplied values untouched", () => {
  const o = applyConfig(
    parseArgs(["run", "--base", "develop", "--cooldown", "10"]),
    {},
  );
  assert.equal(o.base, "develop");
  assert.equal(o.cooldown, 10);
});

test("LS-1: applyConfig tolerates an opts object with no `explicit` set", () => {
  // A caller that did not build opts via parseArgs gets config-fills-everything,
  // which is the safe reading of "nothing was explicitly supplied".
  const o = applyConfig({ base: "develop", cooldown: 10, roadmap: null }, CFG);
  assert.equal(o.base, "main");
  assert.equal(o.cooldown, 300);
});

test("LS-1: parseArgs records exactly the options that were named", () => {
  const o = parseArgs([
    "run",
    "--base",
    "develop",
    "--max-idle",
    "4",
    "--json",
  ]);
  assert.ok(o.explicit.has("base"));
  assert.ok(o.explicit.has("maxIdle"));
  assert.ok(o.explicit.has("json"));
  assert.ok(!o.explicit.has("cooldown"));
  assert.ok(!o.explicit.has("adapter"));
});

test("LS-1: the oracle ref survives a disagreeing config end to end", () => {
  // The concrete failure: base=main from config while the branch ticks land on
  // develop => oracle never fires => everything reads `idle`.
  const o = applyConfig(parseArgs(["run", "--base", "develop"]), CFG);
  assert.notEqual(
    o.base,
    "main",
    "the oracle must watch the ref the operator named",
  );
});

// ── task 63: status / watch subcommands and the notification flags ──────────

test("T63: status and watch are accepted subcommands", () => {
  for (const sub of ["run", "dry-run", "status", "watch"]) {
    assert.equal(parseArgs([sub]).subcommand, sub);
  }
});

test("T63: an unknown subcommand still throws, and the message lists all four", () => {
  assert.throws(
    () => parseArgs(["stats"]),
    (e) => {
      assert.match(e.message, /unknown subcommand/);
      for (const sub of ["run", "dry-run", "status", "watch"]) {
        assert.ok(
          e.message.includes(sub),
          `expected the error to offer ${sub}`,
        );
      }
      return true;
    },
  );
});

test("T63: --notify and --webhook parse — the flag switch throws on anything unregistered", () => {
  const o = parseArgs([
    "status",
    "--notify",
    "--webhook",
    "https://ntfy.sh/x",
    "--json",
  ]);
  assert.equal(o.notify, true);
  assert.equal(o.webhook, "https://ntfy.sh/x");
  assert.equal(o.json, true);
  assert.equal(parseArgs(["run"]).notify, false);
  assert.equal(parseArgs(["run"]).webhook, null);
  assert.throws(() => parseArgs(["run", "--notifyy"]), /unknown option/);
  assert.throws(
    () => parseArgs(["run", "--webhook"]),
    /--webhook needs a value/,
  );
});

test("T63: --command is not required for the read-only subcommands", () => {
  // The generic-adapter guard is scoped to `run`; a pure reader needs no prompt.
  assert.doesNotThrow(() => parseArgs(["status", "--adapter", "generic"]));
  assert.doesNotThrow(() => parseArgs(["watch", "--adapter", "generic"]));
  assert.throws(
    () => parseArgs(["run", "--adapter", "generic"]),
    /--command is required/,
  );
});

test("T63: the readers return empty rather than throwing when there is no state", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "ls-empty-"));
  assert.equal(readCurrent(empty), null);
  assert.deepEqual(readLedger(empty), []);
});

test("T63: readLedger skips a torn final line and keeps every complete one", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ls-torn-"));
  const root = path.join(dir, ".claude", "state", "loop-supervisor");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "runs.jsonl"),
    '{"iteration":1,"outcome":"progress"}\n' +
      '{"iteration":2,"outcome":"done"}\n' +
      '{"iteration":3,"outc\n',
  );
  const rows = readLedger(dir);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.iteration),
    [1, 2],
  );
});

test("T63: readCurrent parses a heartbeat written by writeCurrent", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ls-cur-"));
  const root = path.join(dir, ".claude", "state", "loop-supervisor");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "current.json"),
    JSON.stringify({ runId: "r", pid: 7, iteration: 2, phase: "running" }),
  );
  assert.equal(readCurrent(dir).pid, 7);
  assert.equal(readCurrent(dir).phase, "running");
});

test("T63: a failing osascript warns and returns — it never throws at the caller", () => {
  const warnings = [];
  let fired;
  assert.doesNotThrow(() => {
    fired = notifyTerminalStop(
      { notify: true, webhook: null },
      {
        ok: false,
        outcome: "halt",
        reason: "pipeline HALT",
        iterations: 2,
        costUsd: 1,
      },
      {
        platform: "darwin",
        run: () => ({ status: 1 }),
        warn: (m) => warnings.push(m),
      },
    );
  });
  assert.deepEqual(fired, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /run unaffected/);
});

test("T63: a failing webhook warns and does not stop the other transport", () => {
  const warnings = [];
  const fired = notifyTerminalStop(
    { notify: true, webhook: "https://ntfy.sh/x" },
    {
      ok: true,
      outcome: "done",
      reason: "roadmap-complete",
      iterations: 3,
      costUsd: 0.5,
    },
    {
      platform: "darwin",
      run: () => ({ status: 0 }),
      post: () => {
        throw new Error("ECONNREFUSED");
      },
      warn: (m) => warnings.push(m),
    },
  );
  // osascript still fired even though the webhook blew up.
  assert.deepEqual(fired, ["osascript"]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /webhook/);
  assert.match(warnings[0], /run unaffected/);
});

test("T63: a rejected webhook promise warns asynchronously without an unhandled rejection", async () => {
  const warnings = [];
  const fired = notifyTerminalStop(
    { notify: false, webhook: "https://ntfy.sh/x" },
    { ok: true, outcome: "done", reason: "done", iterations: 1, costUsd: 0 },
    {
      post: () => Promise.reject(new Error("HTTP 500")),
      warn: (m) => warnings.push(m),
    },
  );
  assert.deepEqual(fired, ["webhook"]);
  await new Promise((r) => setImmediate(r));
  assert.match(warnings[0], /HTTP 500/);
});

test("T63: --notify on a non-darwin platform warns instead of shelling out", () => {
  const warnings = [];
  let ran = false;
  const fired = notifyTerminalStop(
    { notify: true, webhook: null },
    { ok: true, outcome: "done", reason: "done", iterations: 1, costUsd: 0 },
    {
      platform: "linux",
      run: () => {
        ran = true;
        return { status: 0 };
      },
      warn: (m) => warnings.push(m),
    },
  );
  assert.equal(ran, false);
  assert.deepEqual(fired, []);
  assert.match(warnings[0], /macOS-only/);
});

test("T63: neither flag set fires nothing at all", () => {
  const warnings = [];
  const fired = notifyTerminalStop(
    { notify: false, webhook: null },
    { ok: true, outcome: "done", reason: "done", iterations: 1, costUsd: 0 },
    { warn: (m) => warnings.push(m) },
  );
  assert.deepEqual(fired, []);
  assert.deepEqual(warnings, []);
});

test("T63: the webhook body is ntfy-shaped — message as body, title and priority as headers", () => {
  const calls = [];
  notifyTerminalStop(
    { notify: false, webhook: "https://ntfy.sh/topic" },
    {
      ok: false,
      outcome: "halt",
      reason: "pipeline HALT at step 5",
      iterations: 4,
      costUsd: 2,
    },
    { post: (url, body, headers) => calls.push({ url, body, headers }) },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://ntfy.sh/topic");
  assert.match(calls[0].body, /pipeline HALT at step 5/);
  assert.match(calls[0].headers.Title, /STOPPED/);
  assert.equal(calls[0].headers.Priority, "high");
});
