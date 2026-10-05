#!/usr/bin/env node
"use strict";
/**
 * Repeat runner — run one or more scenarios N times each and report a pass rate per scenario.
 *
 * One live run is one sample: a verdict scenario needs a rate, not a single green.
 *
 * Usage:
 *   node evals/shared/repeat.mjs <scenario-dir>... [--runs N] [--min-pass K]
 *
 *   --runs      runs per scenario (default: $EVAL_RUNS, empty reads as unset, else 5)
 *   --min-pass  how many runs must pass, 1..N, applied to every scenario. Default per scenario:
 *               scenario.json `live.minPass`, a count calibrated for 5 runs and SCALED to N
 *               (ceil(minPass × N / 5)), else N. The output names any scaling.
 *
 * This program owns the pass-rate exit status, so a caller never has to re-map it (task.185 QA
 * cycle 2: an npm loop collapsed exit 3 to 1). The contract is the table in
 * evals/shared/README.md § "Repeat runner — live pass rates":
 *   0  every scenario met its min-pass
 *   1  at least one scenario fell below its min-pass (and every run of every scenario ran)
 *   2  usage error — bad flag, missing value, missing or malformed scenario.json
 *   3  could not run — any run that was not a verdict: SKIPPED (driver unavailable, or a live-only
 *      scenario under replay), a DRIVER ERROR (claude -p exited non-zero: no credit, crash,
 *      timeout), or anything else the runner did instead of judging (setup error, unknown DRIVER,
 *      a crash, a signal, a spawn failure). It stops at the first such run: the rest would not run
 *      either, and no pass rate is printed for runs that did not happen.
 *
 * The verdict is POSITIVE: the runner exits EVAL_FAIL_EXIT only when assertions ran and failed,
 * and 0 when they passed. Every other status is could-not-run — so a new way for the runner to fail
 * cannot be misread as a failed run (task.185 QA cycle 3; cycles 1–2 enumerated non-verdict exits
 * one at a time). EVAL_SKIP_EXIT is still requested because the runner's default for a skip is 0,
 * which would otherwise read as a pass; EVAL_DRIVER_ERROR_EXIT only sharpens the message.
 *
 * Runs are SEQUENTIAL — live runs share ~/.claude state and must not interleave. The driver
 * comes from the environment exactly as for runner.mjs (DRIVER=claude-cli for live).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(__dirname, "runner.mjs");
const SKIP_EXIT = 3; // the runner's status for a skip, requested through EVAL_SKIP_EXIT
const DRIVER_ERROR_EXIT = 4; // … and for a driver error, through EVAL_DRIVER_ERROR_EXIT
const FAIL_EXIT = 5; // the runner's status when assertions RAN and failed, through EVAL_FAIL_EXIT
const CALIBRATED_RUNS = 5; // live.minPass is a count out of this many runs
const COULD_NOT_RUN = 3;

function usage(msg) {
  process.stderr.write(
    `repeat: ${msg}\nusage: repeat.mjs <scenario-dir>... [--runs N] [--min-pass K]\n`,
  );
  process.exit(2);
}

function intFlag(name, raw) {
  if (raw === undefined) return undefined;
  if (!/^[0-9]+$/.test(String(raw)))
    usage(`${name} must be a non-negative integer, got "${raw}"`);
  return Number(raw);
}

// A value flag must be followed by its value; a trailing `--runs` used to fall back silently.
function valueOf(argv, i, name) {
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("-")) usage(`${name} needs a value`);
  return v;
}

const argv = process.argv.slice(2);
const scenarioDirs = [];
let runsRaw;
let minRaw;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--runs") runsRaw = valueOf(argv, i++, "--runs");
  else if (a.startsWith("--runs=")) runsRaw = a.slice(7);
  else if (a === "--min-pass") minRaw = valueOf(argv, i++, "--min-pass");
  else if (a.startsWith("--min-pass=")) minRaw = a.slice(11);
  else if (a.startsWith("-")) usage(`unknown flag ${a}`);
  else scenarioDirs.push(a);
}
if (scenarioDirs.length === 0) usage("missing <scenario-dir>");

const runs =
  runsRaw !== undefined
    ? intFlag("--runs", runsRaw)
    : (intFlag("$EVAL_RUNS", process.env.EVAL_RUNS || undefined) ?? 5);
if (runs < 1) usage("--runs must be at least 1");
const explicitMin = intFlag("--min-pass", minRaw);
if (explicitMin !== undefined) {
  if (explicitMin < 1)
    usage("--min-pass must be at least 1 — a threshold of 0 can never fail");
  if (explicitMin > runs)
    usage(`--min-pass ${explicitMin} exceeds --runs ${runs}`);
}

// Read and check every scenario before running any, so a typo in the third directory does not
// surface after the first two have spent their live runs.
const plans = scenarioDirs.map((dir) => {
  const file = path.join(dir, "scenario.json");
  if (!fs.existsSync(file)) usage(`no scenario.json in ${dir}`);
  let scenario;
  try {
    scenario = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    usage(`${file} is not valid JSON: ${e.message}`);
  }
  const name = path.basename(path.resolve(dir));
  if (explicitMin !== undefined)
    return { dir, name, minPass: explicitMin, note: "" };
  const k = scenario.live ? scenario.live.minPass : undefined;
  if (k === undefined) return { dir, name, minPass: runs, note: "" };
  if (!Number.isInteger(k) || k < 1 || k > CALIBRATED_RUNS)
    usage(
      `${file}: live.minPass must be an integer from 1 to ${CALIBRATED_RUNS}, got ${JSON.stringify(k)}`,
    );
  const minPass = Math.max(1, Math.ceil((k * runs) / CALIBRATED_RUNS));
  const note =
    runs === CALIBRATED_RUNS
      ? ""
      : `, live.minPass ${k}/${CALIBRATED_RUNS} scaled to ${minPass}/${runs}`;
  return { dir, name, minPass, note };
});

const childEnv = {
  ...process.env,
  EVAL_SKIP_EXIT: String(SKIP_EXIT),
  EVAL_DRIVER_ERROR_EXIT: String(DRIVER_ERROR_EXIT),
  EVAL_FAIL_EXIT: String(FAIL_EXIT),
};

// Why a run was not a verdict — a short label for the run line and a reason for the message; null
// when it was one (0 or FAIL_EXIT).
function notAVerdict(r) {
  if (r.error)
    return [
      "not started",
      `the runner could not be started (${r.error.message})`,
    ];
  if (r.status === null)
    return ["killed", `the runner was killed by ${r.signal || "a signal"}`];
  if (r.status === 0 || r.status === FAIL_EXIT) return null;
  if (r.status === SKIP_EXIT) return ["skipped", "the runner skipped the run"];
  if (r.status === DRIVER_ERROR_EXIT)
    return ["driver error", "the driver errored"];
  return [
    "not judged",
    `the runner exited ${r.status} without judging the run (setup error, unknown DRIVER, crash)`,
  ];
}

let anyBelow = false;
for (const plan of plans) {
  let passed = 0;
  for (let i = 1; i <= runs; i++) {
    const r = spawnSync(process.execPath, [RUNNER, plan.dir], {
      stdio: ["ignore", "inherit", "inherit"],
      env: childEnv,
    });
    const notRun = notAVerdict(r);
    if (notRun) {
      process.stdout.write(`run ${i}/${runs}: ${notRun[0]}\n`);
      process.stderr.write(
        `repeat: could not run ${plan.name} — ${notRun[1]} (see its output above); ` +
          `no pass rate is reported for runs that did not happen\n`,
      );
      process.exit(COULD_NOT_RUN);
    }
    const ok = r.status === 0;
    if (ok) passed++;
    process.stdout.write(`run ${i}/${runs}: ${ok ? "pass" : "fail"}\n`);
  }
  if (passed < plan.minPass) anyBelow = true;
  process.stdout.write(
    `${plan.name}: passed ${passed}/${runs} (min ${plan.minPass}${plan.note})\n`,
  );
}
process.exitCode = anyBelow ? 1 : 0;
