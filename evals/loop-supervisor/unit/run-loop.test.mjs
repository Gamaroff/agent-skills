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
} from "../../../skills/loop-supervisor/scripts/run-loop.mjs";

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
  assert.throws(() => parseArgs(["watch"]), /unknown subcommand/);
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
