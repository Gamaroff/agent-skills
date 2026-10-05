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
 *   --min-pass  how many must pass (default: scenario.json `live.minPass`, else N)
 *
 * Runs are SEQUENTIAL — live runs share ~/.claude state and must not interleave. The driver
 * comes from the environment exactly as for runner.mjs (DRIVER=claude-cli for live).
 *
 * Output: one `run i/N: pass|fail` line per run, then `passed P/N (min K)`.
 * Exit codes: 0 when P >= K; 1 when P < K; 2 on a usage error.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(__dirname, "runner.mjs");

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
const runs = intFlag("--runs", runsRaw ?? process.env.EVAL_RUNS) ?? 5;
if (runs < 1) usage("--runs must be at least 1");
const minPass =
  intFlag("--min-pass", minRaw) ??
  (scenario.live && Number.isInteger(scenario.live.minPass)
    ? scenario.live.minPass
    : runs);
if (minPass > runs) usage(`--min-pass ${minPass} exceeds --runs ${runs}`);

let passed = 0;
for (let i = 1; i <= runs; i++) {
  const r = spawnSync(process.execPath, [RUNNER, scenarioDir], {
    stdio: ["ignore", "inherit", "inherit"],
    env: process.env,
  });
  const ok = r.status === 0;
  if (ok) passed++;
  process.stdout.write(`run ${i}/${runs}: ${ok ? "pass" : "fail"}\n`);
}
process.stdout.write(
  `${path.basename(path.resolve(scenarioDir))}: passed ${passed}/${runs} (min ${minPass})\n`,
);
process.exitCode = passed >= minPass ? 0 : 1;
