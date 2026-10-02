// Run: command node --test shared/resources/tests/context-pressure.test.mjs
//
// task.157 — the context-pressure engine: decide() bands, hysteresis, freshness and repeat; the
// session-id guard; record/check end to end; and the hook I/O contract (exit 0, never 2; stdout
// empty or exactly one JSON object).

import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  DEFAULTS,
  check,
  decide,
  prune,
  readEnv,
  record,
  stateDir,
  validSessionId,
} from "../context-pressure.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(HERE, "..", "context-pressure.mjs");
const TMP = [];
after(() => TMP.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
function tmpdir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-pressure-"));
  TMP.push(d);
  return d;
}

const NOW = Date.parse("2026-10-02T12:00:00Z");
const cfg = { ...DEFAULTS };
const fresh = (pct, extra = {}) => ({
  pct,
  at: new Date(NOW - 60000).toISOString(),
  ...extra,
});

/** Feed a sequence of readings through decide(), carrying state the way check() does. */
function run(pcts) {
  let state = null;
  return pcts.map((pct) => {
    state = { ...(state || {}), pct, at: new Date(NOW - 60000).toISOString() };
    const r = decide(state, NOW, cfg);
    state = r.next;
    return r.text === null
      ? null
      : r.text.includes("Recommend a continuation handoff")
        ? "firm"
        : "soft";
  });
}

test("decide: 59 says nothing; 60 enters soft once; 61 on the next prompt says nothing (hysteresis)", () => {
  assert.deepEqual(run([59, 60, 61]), [null, "soft", null]);
});

test("decide: 75 enters firm, then firm repeats only every REPEAT prompts", () => {
  // prompt 1 soft-entry at 60, prompt 2 firm-entry at 75, then 3..6 silent, 7 = 2 + REPEAT re-emits
  assert.deepEqual(run([60, 75, 76, 77, 78, 79, 80, 81]), [
    "soft",
    "firm",
    null,
    null,
    null,
    null,
    "firm",
    null,
  ]);
});

test("decide: jumping straight past FIRM emits firm, not soft", () => {
  assert.deepEqual(run([10, 90]), [null, "firm"]);
});

test("decide: a fall below a band (after /compact) then a rise re-emits", () => {
  assert.deepEqual(run([65, 30, 65]), ["soft", null, "soft"]);
});

test("decide: a stale reading says nothing, even at 95%", () => {
  const stale = {
    pct: 95,
    at: new Date(NOW - (cfg.maxAgeMin * 60000 + 1000)).toISOString(),
  };
  const r = decide(stale, NOW, cfg);
  assert.equal(r.text, null);
  assert.equal(r.next.prompts, 1, "the prompt is still counted");
  assert.equal(
    r.next.band,
    undefined,
    "a stale reading does not move the band",
  );
});

test("decide: missing, empty or corrupt state says nothing", () => {
  for (const s of [
    null,
    undefined,
    {},
    { pct: "80", at: new Date(NOW).toISOString() },
    { pct: 80, at: "not a date" },
    { pct: NaN, at: new Date(NOW).toISOString() },
  ]) {
    assert.equal(decide(s, NOW, cfg).text, null, JSON.stringify(s));
  }
});

test("decide: the note names session-handoff and the measured percentage and age", () => {
  const { text } = decide(fresh(62.4), NOW, cfg);
  assert.match(text, /session-handoff continue mode/);
  assert.match(text, /62% full/);
  assert.match(text, /1 min ago/);
  assert.ok(
    text.split(/\s+/).length <= 70,
    `note is short: ${text.split(/\s+/).length} words`,
  );
});

test("readEnv: overrides apply; invalid values fall back; FIRM below SOFT is raised", () => {
  assert.deepEqual(readEnv({}), { ...DEFAULTS });
  const o = readEnv({
    CONTEXT_PRESSURE_SOFT: "40",
    CONTEXT_PRESSURE_FIRM: "50",
    CONTEXT_PRESSURE_MAX_AGE_MIN: "3",
    CONTEXT_PRESSURE_REPEAT: "2",
  });
  assert.equal(o.soft, 40);
  assert.equal(o.firm, 50);
  assert.equal(o.maxAgeMin, 3);
  assert.equal(o.repeat, 2);
  const bad = readEnv({
    CONTEXT_PRESSURE_SOFT: "x",
    CONTEXT_PRESSURE_FIRM: "-5",
    CONTEXT_PRESSURE_MAX_AGE_MIN: "0",
    CONTEXT_PRESSURE_REPEAT: "1.5",
  });
  assert.deepEqual(
    [bad.soft, bad.firm, bad.maxAgeMin, bad.repeat],
    [60, 75, 15, 5],
  );
  assert.equal(
    readEnv({ CONTEXT_PRESSURE_SOFT: "80", CONTEXT_PRESSURE_FIRM: "70" }).firm,
    80,
  );
});

test("stateDir: explicit dir, then XDG_STATE_HOME, then ~/.local/state", () => {
  assert.equal(stateDir({ CONTEXT_PRESSURE_STATE_DIR: "/x" }, "/h"), "/x");
  assert.equal(
    stateDir({ XDG_STATE_HOME: "/xdg" }, "/h"),
    "/xdg/agent-skills/context-pressure",
  );
  assert.equal(
    stateDir({}, "/h"),
    "/h/.local/state/agent-skills/context-pressure",
  );
});

test("validSessionId: a UUID passes; traversal, separators, empty and over-long ids do not", () => {
  assert.equal(validSessionId("3f2c9a1e-0b7d-4c55-9e3a-1d2f3a4b5c6d"), true);
  for (const id of ["../x", "a/b", "", "x".repeat(200), "a.b", null, 7])
    assert.equal(validSessionId(id), false, String(id));
});

test("record: an invalid session id writes nothing anywhere under the parent of the state dir", () => {
  const root = tmpdir();
  const env = { CONTEXT_PRESSURE_STATE_DIR: path.join(root, "state") };
  fs.mkdirSync(env.CONTEXT_PRESSURE_STATE_DIR);
  const listing = () => fs.readdirSync(root, { recursive: true }).sort();
  const before = listing();
  for (const id of ["../x", "a/b", "", "x".repeat(200), "../../etc/passwd"]) {
    const ok = record(
      JSON.stringify({
        session_id: id,
        context_window: { used_percentage: 80 },
      }),
      { env },
    );
    assert.equal(ok, false, id);
  }
  assert.deepEqual(listing(), before);
});

test("record: a null used_percentage (before the first API call) writes nothing", () => {
  const env = { CONTEXT_PRESSURE_STATE_DIR: path.join(tmpdir(), "s") };
  assert.equal(
    record(
      JSON.stringify({
        session_id: "s1",
        context_window: { used_percentage: null },
      }),
      { env },
    ),
    false,
  );
});

test("record keeps check-owned fields; check writes them back", () => {
  const env = { CONTEXT_PRESSURE_STATE_DIR: path.join(tmpdir(), "s") };
  record(
    JSON.stringify({
      session_id: "s1",
      context_window: { used_percentage: 61, context_window_size: 200000 },
    }),
    { env, nowMs: NOW },
  );
  assert.match(
    check(JSON.stringify({ session_id: "s1" }), { env, nowMs: NOW }),
    /61% full/,
  );
  record(
    JSON.stringify({
      session_id: "s1",
      context_window: { used_percentage: 63 },
    }),
    { env, nowMs: NOW },
  );
  const file = JSON.parse(
    fs.readFileSync(
      path.join(env.CONTEXT_PRESSURE_STATE_DIR, "s1.json"),
      "utf8",
    ),
  );
  assert.equal(file.pct, 63);
  assert.equal(file.band, "soft");
  assert.equal(file.prompts, 1);
  assert.equal(file.window, 200000);
  assert.equal(
    check(JSON.stringify({ session_id: "s1" }), { env, nowMs: NOW }),
    "",
    "still soft: hysteresis",
  );
});

test("prune: deletes state files older than the window, at most once per hour", () => {
  const dir = tmpdir();
  const old = path.join(dir, "old.json");
  const young = path.join(dir, "young.json");
  fs.writeFileSync(old, "{}");
  fs.writeFileSync(young, "{}");
  const eightDaysAgo = (NOW - 8 * 86400000) / 1000;
  fs.utimesSync(old, eightDaysAgo, eightDaysAgo);
  fs.utimesSync(young, NOW / 1000, NOW / 1000);
  prune(dir, NOW);
  assert.equal(fs.existsSync(old), false);
  assert.equal(fs.existsSync(young), true);
  // marker is fresh: a second old file survives a prune within the hour
  fs.writeFileSync(old, "{}");
  fs.utimesSync(old, eightDaysAgo, eightDaysAgo);
  fs.utimesSync(path.join(dir, ".pruned"), NOW / 1000, NOW / 1000);
  prune(dir, NOW + 1000);
  assert.equal(fs.existsSync(old), true);
});

// ── CLI: the hook contract ──────────────────────────────────────────────────────────────────────

function cli(args, input, env) {
  return spawnSync(process.execPath, [ENGINE, ...args], {
    input,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("hook end to end: record 80% then check prints one UserPromptSubmit object naming session-handoff and 80%", () => {
  const env = { CONTEXT_PRESSURE_STATE_DIR: path.join(tmpdir(), "s") };
  const r1 = cli(
    ["record"],
    JSON.stringify({
      session_id: "e2e",
      context_window: { used_percentage: 80 },
    }),
    env,
  );
  assert.equal(r1.status, 0);
  assert.equal(r1.stdout, "");
  const r2 = cli(
    ["check"],
    JSON.stringify({ session_id: "e2e", prompt: "hello" }),
    env,
  );
  assert.equal(r2.status, 0);
  const out = JSON.parse(r2.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(out.hookSpecificOutput.additionalContext, /session-handoff/);
  assert.match(out.hookSpecificOutput.additionalContext, /80%/);
});

test("contract: check exits 0 on every input, never 2, and prints nothing or exactly one JSON object", () => {
  const dir = path.join(tmpdir(), "s");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "corrupt.json"), "{not json");
  fs.writeFileSync(path.join(dir, "arr.json"), "[1,2]");
  const env = { CONTEXT_PRESSURE_STATE_DIR: dir };
  cli(
    ["record"],
    JSON.stringify({
      session_id: "ok",
      context_window: { used_percentage: 99 },
    }),
    env,
  );
  const inputs = [
    "",
    "not json",
    "null",
    "[]",
    "{}",
    '{"session_id":"../x"}',
    '{"session_id":"nobody"}',
    '{"session_id":"corrupt"}',
    '{"session_id":"arr"}',
    '{"session_id":"ok"}',
  ];
  let objects = 0;
  for (const input of inputs) {
    const r = cli(["check"], input, env);
    assert.equal(r.status, 0, `exit for ${input}`);
    if (r.stdout !== "") {
      const lines = r.stdout.trim().split("\n");
      assert.equal(lines.length, 1, `one line for ${input}`);
      assert.equal(
        JSON.parse(lines[0]).hookSpecificOutput.hookEventName,
        "UserPromptSubmit",
      );
      objects++;
    }
  }
  assert.equal(objects, 1, "only the valid fresh reading speaks");
  for (const args of [["check"], ["record"], ["nonsense"], []])
    assert.equal(
      cli(args, "{", { CONTEXT_PRESSURE_STATE_DIR: "/dev/null/x" }).status,
      0,
      args.join(" "),
    );
});

test("a failed state write leaves no .tmp behind; prune removes an old stray .tmp (QA cycle 1 CR-8)", () => {
  const dir = path.join(tmpdir(), "s");
  fs.mkdirSync(path.join(dir, "blocked.json"), { recursive: true }); // rename onto a directory fails
  const env = { CONTEXT_PRESSURE_STATE_DIR: dir };
  assert.equal(
    record(
      JSON.stringify({
        session_id: "blocked",
        context_window: { used_percentage: 70 },
      }),
      { env },
    ),
    false,
  );
  assert.deepEqual(
    fs.readdirSync(dir).filter((n) => n.endsWith(".tmp")),
    [],
  );
  const stray = path.join(dir, "old.json.123.tmp");
  fs.writeFileSync(stray, "{");
  const t = (NOW - 8 * 86400000) / 1000;
  fs.utimesSync(stray, t, t);
  prune(dir, NOW);
  assert.equal(fs.existsSync(stray), false);
});
