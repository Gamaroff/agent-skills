#!/usr/bin/env node
"use strict";
/**
 * Repeat runner — run one scenario N times and report a pass rate.
 *
 * One live run is one sample: a verdict scenario needs a rate, not a single green.
 *
 * Usage:
 *   node evals/shared/repeat.mjs <scenario-dir> [--runs N] [--min-pass K]
 *
 *   --runs      how many runs (default: $EVAL_RUNS, else 5)
 *   --min-pass  how many must pass, 1..N (default: scenario.json `live.minPass` capped at N, else N)
 *
 * `live.minPass` is calibrated for the default 5 runs; with fewer runs it is capped at N and the
 * output says so. An explicit --min-pass above --runs is still a usage error: that is a typo, not a
 * calibration (task.185 QA cycle 1, QA-2). A min-pass of 0 could never fail and is refused (CR-4).
 *
 * A SKIPPED run is not a pass. The runner exits 0 on a skip (no `claude` binary, or a scenario that
 * needs a live driver run under replay), which eval:all relies on; this runner sets EVAL_SKIP_EXIT so
 * a skip exits with its own code, and stops with exit 3 — could not run — on the first one. Counting
 * it as a pass reported `passed 5/5` with no agent run (task.185 QA cycle 1, CR-1).
 *
 * Runs are SEQUENTIAL — live runs share ~/.claude state and must not interleave. The driver
 * comes from the environment exactly as for runner.mjs (DRIVER=claude-cli for live).
 *
 * Output: one `run i/N: pass|fail` line per run, then `passed P/N (min K)`.
 * Exit codes: 0 when P >= K; 1 when P < K; 2 on a usage error; 3 when a run was skipped.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(__dirname, "runner.mjs");
const SKIP_EXIT = 3; // the runner's exit status for a skip, requested through EVAL_SKIP_EXIT

function usage(msg) {
  process.stderr.write(
    `repeat: ${msg}\nusage: repeat.mjs <scenario-dir> [--runs N] [--min-pass K]\n`,
  );
  process.exit(2);
}

function intFlag(name, raw) {
  if (raw === undefined) return undefined;
  if (!/^[0-9]+$/.test(String(raw)))
    usage(`${name} must be a non-negative integer, got "${raw}"`);
  return Number(raw);
}

const argv = process.argv.slice(2);
let scenarioDir;
let runsRaw;
let minRaw;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--runs") runsRaw = argv[++i];
  else if (a.startsWith("--runs=")) runsRaw = a.slice(7);
  else if (a === "--min-pass") minRaw = argv[++i];
  else if (a.startsWith("--min-pass=")) minRaw = a.slice(11);
  else if (a.startsWith("-")) usage(`unknown flag ${a}`);
  else if (scenarioDir === undefined) scenarioDir = a;
  else usage(`unexpected argument ${a}`);
}
if (!scenarioDir) usage("missing <scenario-dir>");
const scenarioFile = path.join(scenarioDir, "scenario.json");
if (!fs.existsSync(scenarioFile)) usage(`no scenario.json in ${scenarioDir}`);

const scenario = JSON.parse(fs.readFileSync(scenarioFile, "utf-8"));
// An empty EVAL_RUNS reads as unset, not as a malformed number.
const runs =
  intFlag("--runs", runsRaw ?? (process.env.EVAL_RUNS || undefined)) ?? 5;
if (runs < 1) usage("--runs must be at least 1");
let minPass = intFlag("--min-pass", minRaw);
let capNote = "";
if (minPass !== undefined) {
  if (minPass < 1)
    usage("--min-pass must be at least 1 — a threshold of 0 can never fail");
  if (minPass > runs) usage(`--min-pass ${minPass} exceeds --runs ${runs}`);
} else if (scenario.live && scenario.live.minPass !== undefined) {
  const k = scenario.live.minPass;
  if (!Number.isInteger(k) || k < 1)
    usage(
      `scenario.json live.minPass must be an integer of at least 1, got ${JSON.stringify(k)}`,
    );
  minPass = Math.min(k, runs);
  if (k > runs) capNote = `, live.minPass ${k} capped at --runs ${runs}`;
} else {
  minPass = runs;
}

let passed = 0;
for (let i = 1; i <= runs; i++) {
  const r = spawnSync(process.execPath, [RUNNER, scenarioDir], {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, EVAL_SKIP_EXIT: String(SKIP_EXIT) },
  });
  if (r.status === SKIP_EXIT) {
    process.stdout.write(`run ${i}/${runs}: skipped\n`);
    process.stderr.write(
      `repeat: could not run ${path.basename(path.resolve(scenarioDir))} — the runner skipped (see its line above); a skipped run is not a pass\n`,
    );
    process.exit(SKIP_EXIT);
  }
  const ok = r.status === 0;
  if (ok) passed++;
  process.stdout.write(`run ${i}/${runs}: ${ok ? "pass" : "fail"}\n`);
}
process.stdout.write(
  `${path.basename(path.resolve(scenarioDir))}: passed ${passed}/${runs} (min ${minPass}${capNote})\n`,
);
process.exitCode = passed >= minPass ? 0 : 1;
