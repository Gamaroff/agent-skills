/**
 * Layer-1 unit tests for the loop-supervisor engine registry (task 213).
 *
 * Two halves. The table and its two parsers are pure and tested by calling
 * them — never by grepping the source for flag names. Then one full `run`
 * iteration per engine, driven through a fake engine binary that prints a
 * canned stream and exits: no network, no model call, and the iteration goes
 * through the same spawn → parseResult → classify → ledger path a real night
 * does.
 *
 * The agy fixtures are real captures (agy 1.4.2, plan file "Verified facts"):
 * agy-result.ndjson is a SUCCESS run, agy-result-error.ndjson an invalid
 * --model (status ERROR, exit 1). The control case the task demands — a status
 * the captures never show — is constructed here, and must classify as an error
 * on its own, with the process exiting 0.
 *
 * Run via: node --test evals/loop-supervisor/unit/engines.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { spawnBudget } from "../../../shared/resources/spawn-budget.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const {
  ENGINES,
  resolveEngine,
  assertSupported,
} = require("../../../skills/loop-supervisor/references/engines.js");
const {
  classify,
} = require("../../../skills/loop-supervisor/references/classify.js");

const { timeoutMs: SPAWN_TIMEOUT_MS } = spawnBudget("LOOP_SUPERVISOR_ENGINES");
const RUN_LOOP = path.resolve(
  here,
  "../../../skills/loop-supervisor/scripts/run-loop.mjs",
);
const FIXTURES = path.join(here, "fixtures");
const readLines = (f) =>
  fs
    .readFileSync(path.join(FIXTURES, f), "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

// ── the table ────────────────────────────────────────────────────────────────

const SUPPORT_KEYS = [
  "maxTurns",
  "cost",
  "pinnedSession",
  "settingsFile",
  "effort",
  "skipPermissions",
];

test("every engine entry has the full shape, and every supports key is a boolean", () => {
  assert.deepEqual(Object.keys(ENGINES).sort(), ["agy", "claude"]);
  for (const [name, e] of Object.entries(ENGINES)) {
    assert.equal(e.name, name);
    assert.equal(typeof e.binary, "string");
    for (const fn of [
      "buildArgs",
      "parseResult",
      "renderLine",
      "transcriptPath",
    ]) {
      assert.equal(typeof e[fn], "function", `${name}.${fn}`);
    }
    assert.deepEqual(
      Object.keys(e.supports).sort(),
      [...SUPPORT_KEYS].sort(),
      name,
    );
    for (const k of SUPPORT_KEYS)
      assert.equal(typeof e.supports[k], "boolean", `${name}.${k}`);
  }
});

test("an unknown engine is refused with the known names listed", () => {
  assert.throws(
    () => resolveEngine("gpt"),
    /unknown engine "gpt" \(known: claude, agy\)/,
  );
  // A prototype key is not an engine.
  assert.throws(() => resolveEngine("toString"), /unknown engine/);
  assert.equal(resolveEngine("agy").name, "agy");
});

// ── claude ───────────────────────────────────────────────────────────────────

const CTX = { prompt: "p", sessionId: "s", settingsPath: "/x.json" };

test("claude: --model and --effort follow --settings and precede --max-turns", () => {
  const a = ENGINES.claude.buildArgs({
    ...CTX,
    model: "opus",
    effort: "high",
    maxTurns: 9,
  });
  assert.deepEqual(a.slice(-6), [
    "--model",
    "opus",
    "--effort",
    "high",
    "--max-turns",
    "9",
  ]);
  assert.equal(a[a.indexOf("--settings") + 1], "/x.json");
});

test("claude: with model and effort unset the argv carries neither flag", () => {
  const a = ENGINES.claude.buildArgs(CTX);
  assert.ok(!a.includes("--model") && !a.includes("--effort"));
  assert.equal(a.length, 12);
});

test("claude: parseResult normalises the result line and ignores every other line", () => {
  assert.equal(ENGINES.claude.parseResult({ type: "assistant" }), null);
  assert.equal(ENGINES.claude.parseResult(null), null);
  assert.deepEqual(
    ENGINES.claude.parseResult({
      type: "result",
      subtype: "error_max_turns",
      is_error: true,
      num_turns: 7,
      total_cost_usd: 0.5,
      session_id: "abc",
    }),
    {
      subtype: "error_max_turns",
      isError: true,
      numTurns: 7,
      costUsd: 0.5,
      sessionId: "abc",
    },
  );
});

// ── agy ──────────────────────────────────────────────────────────────────────

test("agy: the argv matches the Phase 0 findings — print mode, stream-json, accept-edits", () => {
  const a = ENGINES.agy.buildArgs({
    ...CTX,
    model: "gemini-3.8-flash-low",
    effort: "low",
  });
  assert.deepEqual(a, [
    "-p",
    "p",
    "--output-format",
    "stream-json",
    "--mode",
    "accept-edits",
    "--model",
    "gemini-3.8-flash-low",
    "--effort",
    "low",
  ]);
  // --conversation RESUMES; a fresh id is not pinned (Phase 0), so it is never sent.
  assert.ok(!a.includes("--conversation"));
});

test("agy: no skip-permissions flag unless the operator asked for it", () => {
  assert.ok(
    !ENGINES.agy.buildArgs(CTX).includes("--dangerously-skip-permissions"),
  );
  assert.ok(
    ENGINES.agy
      .buildArgs({ ...CTX, skipPermissions: true })
      .includes("--dangerously-skip-permissions"),
  );
});

test("agy: the real SUCCESS capture parses as a success with its conversation id", () => {
  const envs = readLines("agy-result.ndjson")
    .map((o) => ENGINES.agy.parseResult(o))
    .filter(Boolean);
  assert.equal(envs.length, 1, "exactly one result line in the capture");
  assert.deepEqual(envs[0], {
    subtype: "success",
    isError: false,
    numTurns: 1,
    costUsd: null,
    sessionId: "980f4517-bf4b-4147-b2b5-74cb721416c4",
  });
});

test("agy: the real ERROR capture parses as an error with no session id", () => {
  const [env] = readLines("agy-result-error.ndjson").map((o) =>
    ENGINES.agy.parseResult(o),
  );
  assert.equal(env.isError, true);
  assert.equal(env.subtype, "error_error");
  assert.equal(env.sessionId, null, "an empty conversation_id is no id");
});

test("agy control: a status the captures never show is an error (fail closed)", () => {
  for (const result of [
    { status: "CANCELLED" },
    { status: "success" },
    {},
    null,
  ]) {
    const env = ENGINES.agy.parseResult({ event: "result", result });
    assert.equal(env.isError, true, JSON.stringify(result));
  }
});

test("agy control: an unknown status classifies the iteration as error even on exit 0", () => {
  const env = ENGINES.agy.parseResult({
    event: "result",
    result: { status: "CANCELLED" },
  });
  const out = classify({
    spawned: true,
    exitCode: 0,
    subtype: env.subtype,
    isError: env.isError,
  });
  assert.equal(out.outcome, "error");
});

test("agy: non-result lines are not envelopes", () => {
  const lines = readLines("agy-result.ndjson").filter(
    (o) => o.event !== "result",
  );
  assert.ok(lines.length >= 3);
  for (const o of lines) assert.equal(ENGINES.agy.parseResult(o), null);
  // claude's parser must not mistake an agy line for its own, nor the reverse.
  for (const o of readLines("agy-result.ndjson"))
    assert.equal(ENGINES.claude.parseResult(o), null);
});

test("agy: the human log shows tool names and the final result, not text fragments", () => {
  const tool = {
    event: "step_update",
    step_update: {
      step_type: "tool",
      state: "ACTIVE",
      tool_name: "run_command",
    },
  };
  assert.equal(ENGINES.agy.renderLine(tool), "  → run_command");
  assert.equal(
    ENGINES.agy.renderLine({
      event: "step_update",
      step_update: { step_type: "agent_response", text_delta: "o" },
    }),
    null,
  );
  const last = readLines("agy-result.ndjson").at(-1);
  assert.equal(
    ENGINES.agy.renderLine(last),
    "ok\n--- result: status=SUCCESS turns=1 ---",
  );
});

test("agy: no transcript path the supervisor can name", () => {
  assert.equal(ENGINES.agy.transcriptPath("/repo", "id"), null);
});

// ── refusals ─────────────────────────────────────────────────────────────────

test("agy refuses --max-turns and --max-cost, naming the flag and the engine", () => {
  assert.throws(
    () => assertSupported(ENGINES.agy, { maxTurns: 5 }),
    /--max-turns is not supported by the agy engine/,
  );
  assert.throws(
    () => assertSupported(ENGINES.agy, { maxCost: 1 }),
    /--max-cost is not supported by the agy engine/,
  );
  // A zero ceiling is still a ceiling the engine cannot honour.
  assert.throws(
    () => assertSupported(ENGINES.agy, { maxCost: 0 }),
    /--max-cost/,
  );
});

test("claude refuses --dangerously-skip-permissions; agy accepts it", () => {
  assert.throws(
    () => assertSupported(ENGINES.claude, { skipPermissions: true }),
    /--dangerously-skip-permissions is not supported by the claude engine/,
  );
  assert.doesNotThrow(() =>
    assertSupported(ENGINES.agy, { skipPermissions: true }),
  );
});

test("--effort is honoured by both engines, and nothing unrequested is refused", () => {
  for (const e of Object.values(ENGINES)) {
    assert.doesNotThrow(() => assertSupported(e, { effort: "high" }), e.name);
    assert.doesNotThrow(
      () =>
        assertSupported(e, {
          maxTurns: null,
          maxCost: null,
          effort: null,
          skipPermissions: false,
        }),
      e.name,
    );
  }
});

// ── one full run iteration per engine, through a fake binary ─────────────────

const CLAUDE_STREAM = [
  {
    type: "assistant",
    message: { content: [{ type: "text", text: "working" }] },
  },
  {
    type: "result",
    subtype: "success",
    is_error: false,
    num_turns: 3,
    total_cost_usd: 0.25,
    session_id: "x",
  },
]
  .map((o) => JSON.stringify(o))
  .join("\n");

/**
 * One `run --max-iterations 1` in a fresh git repo, with `engine` replaced on
 * PATH by a script that prints `stream` and exits `code`. Returns the ledger row.
 */
function runOnce(engine, stream, code, extra = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ls-engine-"));
  const bin = path.join(root, "bin");
  const work = path.join(root, "work");
  fs.mkdirSync(bin);
  fs.mkdirSync(work);
  const streamFile = path.join(root, "stream.ndjson");
  fs.writeFileSync(streamFile, stream + "\n");
  const fake = path.join(bin, engine);
  fs.writeFileSync(fake, `#!/bin/sh\ncat "${streamFile}"\nexit ${code}\n`);
  fs.chmodSync(fake, 0o755);
  const git = (...a) => execFileSync("git", a, { cwd: work, stdio: "ignore" });
  git("init", "-q");
  git(
    "-c",
    "user.email=t@t",
    "-c",
    "user.name=t",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    "init",
  );
  const r = spawnSync(
    process.execPath,
    [
      RUN_LOOP,
      "run",
      "--engine",
      engine,
      "--adapter",
      "generic",
      "--command",
      "x",
      "--max-iterations",
      "1",
      "--cooldown",
      "0",
      "--on-error",
      "continue",
      "--json",
      ...extra,
    ],
    {
      cwd: work,
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      timeout: SPAWN_TIMEOUT_MS,
    },
  );
  const ledger = path.join(work, ".claude/state/loop-supervisor/runs.jsonl");
  const rows = fs.existsSync(ledger)
    ? fs
        .readFileSync(ledger, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
  let summary = null;
  try {
    summary = JSON.parse(r.stdout);
  } catch {
    summary = null;
  }
  // A git repo per call: leaked across runs, these exhaust /tmp's inodes.
  fs.rmSync(root, { recursive: true, force: true });
  return { row: rows.find((x) => x.spawned), summary, stderr: r.stderr };
}

test("run: a claude iteration reads cost, turns and the pinned session from its stream", () => {
  const { row, summary } = runOnce("claude", CLAUDE_STREAM, 0);
  assert.ok(row, "a spawned ledger row");
  assert.equal(row.subtype, "success");
  assert.equal(row.costUsd, 0.25);
  assert.equal(row.turns, 3);
  // The pinned uuid, never the stream's session_id: claude was told which id to use.
  assert.match(row.sessionId, /^[0-9a-f-]{36}$/);
  assert.notEqual(row.sessionId, "x");
  assert.ok(row.transcriptPath.endsWith(`${row.sessionId}.jsonl`));
  assert.equal(summary.engine, "claude");
  assert.equal(summary.costUsd, 0.25);
});

test("run: an agy SUCCESS iteration takes its session id from the stream, cost unknown", () => {
  const stream = fs
    .readFileSync(path.join(FIXTURES, "agy-result.ndjson"), "utf8")
    .trim();
  const { row, summary } = runOnce("agy", stream, 0);
  assert.ok(row, "a spawned ledger row");
  assert.equal(row.subtype, "success");
  assert.notEqual(row.outcome, "error");
  assert.equal(row.sessionId, "980f4517-bf4b-4147-b2b5-74cb721416c4");
  assert.equal(row.transcriptPath, null);
  assert.equal(row.costUsd, null);
  assert.equal(row.turns, 1);
  assert.equal(summary.costUsd, null, "unknown, not $0");
});

test("run: an agy result with an unknown status classifies as error though the process exits 0", () => {
  const stream = JSON.stringify({
    event: "result",
    result: { conversation_id: "c", status: "CANCELLED" },
  });
  const { row } = runOnce("agy", stream, 0);
  assert.equal(row.outcome, "error");
  assert.equal(row.exitCode, 0);
  assert.equal(row.subtype, "error_cancelled");
});

test("run: the real agy ERROR capture classifies as error", () => {
  const stream = fs
    .readFileSync(path.join(FIXTURES, "agy-result-error.ndjson"), "utf8")
    .trim();
  const { row } = runOnce("agy", stream, 1);
  assert.equal(row.outcome, "error");
  assert.equal(row.sessionId, null);
});
