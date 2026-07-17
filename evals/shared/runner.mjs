#!/usr/bin/env node
"use strict";
/**
 * Eval runner for skill end-to-end scenarios.
 *
 * Usage:
 *   node evals/shared/runner.mjs <scenario-dir>
 *
 * Driver selection (DRIVER env, default = replay):
 *   replay      — copy scenarios/<name>/replay/** into a sandbox; no agent
 *                 invoked. CI gate.
 *   claude-sdk  — programmatic @anthropic-ai/claude-agent-sdk (stub).
 *   claude-cli  — shell out to `claude -p` (no SDK dep).
 *   <custom>    — drop a module at drivers/<name>.mjs implementing the
 *                 AgentDriver contract (see drivers/types.mjs).
 *
 * Legacy MODE=replay|live still works (deprecated): MODE=live → claude-sdk.
 *
 * Exit codes: 0 all assertions pass; 1 any failure or driver error.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as A from "./assertions.mjs";
import { cleanupFromReceipt } from "./lib/tracker-cleanup.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function die(msg) {
  process.stderr.write(`runner: ${msg}\n`);
  process.exit(1);
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function readJSONL(p) {
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function makeSandbox(scenarioName) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `eval-${scenarioName}-`));
}

function resolvePath(p, sandbox) {
  return p.replace(/^\$SANDBOX/, sandbox);
}

function resolveDriverName() {
  if (process.env.DRIVER) return process.env.DRIVER;
  if (process.env.MODE === "live") {
    process.stderr.write(
      "runner: MODE=live is deprecated — use DRIVER=claude-sdk\n",
    );
    return "claude-sdk";
  }
  if (process.env.MODE === "replay") return "replay";
  return "replay";
}

async function loadDriver(name) {
  const p = path.join(__dirname, "drivers", `${name}.mjs`);
  if (!fs.existsSync(p))
    die(`unknown driver: ${name} (no such file: drivers/${name}.mjs)`);
  const mod = await import(pathToFileURL(p).href);
  const d = mod.default;
  if (
    !d ||
    typeof d.run !== "function" ||
    typeof d.isAvailable !== "function"
  ) {
    die(`driver ${name} does not satisfy AgentDriver contract`);
  }
  return d;
}

function runAssertions(assertions, ctx, pathResolver) {
  const resolve = pathResolver || ((p, sb) => resolvePath(p, sb));
  const results = [];
  for (const a of assertions) {
    const args = (a.args || []).map((v) =>
      typeof v === "string" ? resolve(v, ctx.sandbox) : v,
    );
    switch (a.fn) {
      case "fileExists":
        results.push(A.fileExists(...args));
        break;
      case "fileAbsent":
        results.push(A.fileAbsent(...args));
        break;
      case "fileMatches":
        results.push(A.fileMatches(args[0], new RegExp(args[1])));
        break;
      case "frontmatterHas":
        results.push(A.frontmatterHas(...args));
        break;
      case "frontmatterEquals":
        results.push(A.frontmatterEquals(...args));
        break;
      case "hasAtLeastNSourceCitations":
        results.push(A.hasAtLeastNSourceCitations(...args));
        break;
      case "trackerPayloadMatches":
        results.push(A.trackerPayloadMatches(...args));
        break;
      case "answerQueueDrained":
        results.push(A.answerQueueDrained(ctx.remainingAnswers));
        break;
      // develop-task pipeline assertions
      case "branchExists":
        results.push(A.branchExists(...args));
        break;
      case "pipelineStepsRan":
        results.push(A.pipelineStepsRan(args[0], args[1]));
        break;
      case "loopBoundedAt":
        results.push(A.loopBoundedAt(args[0], args[1], args[2]));
        break;
      case "prCreated":
        results.push(
          A.prCreated(args[0], typeof args[1] === "object" ? args[1] : {}),
        );
        break;
      case "noLockFilesLeft":
        results.push(A.noLockFilesLeft(...args));
        break;
      // develop-story pipeline assertions
      case "prTargetsBranch":
        results.push(A.prTargetsBranch(args[0], args[1]));
        break;
      case "resumeRehydrated":
        results.push(
          A.resumeRehydrated(
            args[0],
            typeof args[1] === "object" ? args[1] : {},
          ),
        );
        break;
      default:
        results.push({ ok: false, reason: `unknown assertion fn: ${a.fn}` });
    }
  }
  return results;
}

/**
 * Run a single driver stage, optionally killing on marker file appearance.
 *
 * For replay mode or drivers without runInterruptible, killOn is ignored
 * (the stage completes normally — fixtures don't need kill semantics).
 */
async function runStage(driver, ctx, stage = {}) {
  if (!stage.killOn) return driver.run(ctx);
  if (stage.killOn.type !== "marker") {
    process.stderr.write(
      `runner: unsupported killOn.type "${stage.killOn.type}" — running stage normally\n`,
    );
    return driver.run(ctx);
  }
  if (typeof driver.runInterruptible !== "function") {
    process.stderr.write(
      "runner: killOn requires driver.runInterruptible — running stage normally\n",
    );
    return driver.run(ctx);
  }
  const markerPath = resolvePath(stage.killOn.path, ctx.sandbox);
  const { promise: runPromise, kill } = driver.runInterruptible(ctx);
  const markerWatchInterval = 250;
  const markerPromise = new Promise((resolve) => {
    if (fs.existsSync(markerPath)) {
      resolve();
      return;
    }
    const iv = setInterval(() => {
      if (fs.existsSync(markerPath)) {
        clearInterval(iv);
        resolve();
      }
    }, markerWatchInterval);
  });
  const winner = await Promise.race([
    runPromise.then(() => "done"),
    markerPromise.then(() => "marker"),
  ]);
  if (winner === "marker") {
    process.stderr.write(
      `runner: marker found at ${markerPath} — signalling driver\n`,
    );
    kill();
  }
  return runPromise.catch(() => ({ remainingAnswers: [] }));
}

async function main() {
  const scenarioDir = process.argv[2];
  if (!scenarioDir) die("usage: runner.mjs <scenario-dir>");
  if (!fs.existsSync(scenarioDir)) die(`no such scenario: ${scenarioDir}`);
  const absScenarioDir = path.resolve(scenarioDir);

  const scenario = readJSON(path.join(absScenarioDir, "scenario.json"));
  const envFromFile = fs.existsSync(path.join(absScenarioDir, "env.json"))
    ? readJSON(path.join(absScenarioDir, "env.json"))
    : {};
  for (const [k, v] of Object.entries(envFromFile)) process.env[k] = String(v);

  const driverName = resolveDriverName();
  const driver = await loadDriver(driverName);

  if (scenario.requiresLiveDriver && driverName === "replay") {
    process.stderr.write(
      `[${driverName}] skipped: scenario "${path.basename(absScenarioDir)}" requires a live driver (DRIVER=claude-sdk or claude-cli)\n`,
    );
    process.exit(0);
  }

  const avail = await driver.isAvailable();
  const scenarioName = path.basename(absScenarioDir);
  if (!avail.ok) {
    process.stderr.write(`[${driverName}] skipped: ${avail.reason}\n`);
    process.exit(0); // skip ≠ fail
  }

  const sandbox = makeSandbox(scenarioName);
  process.stderr.write(
    `[${driverName}] ${scenarioName} → sandbox: ${sandbox}\n`,
  );

  const driverEnv = {
    ...envFromFile,
    SCENARIO_DIR: absScenarioDir,
  };
  const skillRoot = scenario.skill
    ? path.join(REPO_ROOT, "skills", scenario.skill)
    : "";

  const baseCtx = {
    sandbox,
    skill: scenario.skill || "",
    skillRoot,
    answers: readJSONL(path.join(absScenarioDir, "answers.jsonl")),
    env: driverEnv,
  };

  let driverResult;
  let combinedEventsPath;

  try {
    if (Array.isArray(scenario.stages)) {
      // Multi-stage run: iterate stages, concatenate events
      const combinedEvents = [];
      let remainingAnswers = [...baseCtx.answers];

      for (const stage of scenario.stages) {
        const stageCtx = {
          ...baseCtx,
          prompt: stage.command || scenario.prompt || "",
          answers: remainingAnswers,
        };
        process.stderr.write(
          `[${driverName}] stage: ${stage.phase || "unnamed"}\n`,
        );
        const stageResult = await runStage(driver, stageCtx, stage);
        remainingAnswers = stageResult.remainingAnswers || [];

        // Collect events written by this stage
        const eventsFile = path.join(sandbox, ".eval", "pipeline-events.json");
        if (fs.existsSync(eventsFile)) {
          try {
            const stageEvents = JSON.parse(
              fs.readFileSync(eventsFile, "utf-8"),
            );
            combinedEvents.push(...stageEvents);
            // Remove so next stage starts fresh
            fs.rmSync(eventsFile);
          } catch {
            /* ignore parse errors */
          }
        }
      }

      // Write combined events
      combinedEventsPath = path.join(
        sandbox,
        ".eval",
        "pipeline-events-combined.json",
      );
      fs.mkdirSync(path.join(sandbox, ".eval"), { recursive: true });
      fs.writeFileSync(combinedEventsPath, JSON.stringify(combinedEvents));
      driverResult = { remainingAnswers };
    } else {
      // Single-stage run (existing behaviour)
      const driverCtx = { ...baseCtx, prompt: scenario.prompt || "" };
      driverResult = await driver.run(driverCtx);
    }
  } catch (e) {
    process.stderr.write(`[${driverName}] driver error: ${e.message}\n`);
    if (!process.env.KEEP_SANDBOX)
      fs.rmSync(sandbox, { recursive: true, force: true });
    process.exit(1);
  }

  // Resolve $EVENTS_COMBINED token in assertions
  const combinedPath =
    combinedEventsPath ||
    path.join(sandbox, ".eval", "pipeline-events-combined.json");
  function resolvePathExtended(p, sandbox) {
    return resolvePath(p, sandbox).replace(/\$EVENTS_COMBINED/g, combinedPath);
  }

  const ctx = {
    sandbox,
    remainingAnswers: driverResult.remainingAnswers || [],
  };
  const results = runAssertions(
    scenario.assertions || [],
    ctx,
    resolvePathExtended,
  );
  const agg = A.aggregate(results);

  for (const f of agg.failures) process.stderr.write(`  ✗ ${f.reason}\n`);
  process.stderr.write(
    `[${driverName}] ${scenarioName}: ${agg.passed}/${agg.total} assertions passed\n`,
  );

  // Cleanup any real tracker side effects BEFORE wiping the sandbox.
  // Runs regardless of assertion outcome — we never want a failed test to
  // leak a live issue.
  if (process.env.EVAL_CLEANUP === "1") {
    try {
      const r = cleanupFromReceipt(sandbox);
      if (r.cleaned)
        process.stderr.write(`[cleanup] ${r.platform} ${r.issueKey} removed\n`);
    } catch (e) {
      process.stderr.write(`[cleanup] failed: ${e.message}\n`);
    }
  }

  if (!process.env.KEEP_SANDBOX)
    fs.rmSync(sandbox, { recursive: true, force: true });
  process.exit(agg.ok ? 0 : 1);
}

main().catch((e) => die(e.stack || e.message));
