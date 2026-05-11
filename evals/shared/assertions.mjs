"use strict";
/**
 * Structural assertions for end-to-end eval scenarios.
 *
 * Never assert prose equality on LLM output. Instead, assert structure:
 *   - sections exist
 *   - frontmatter keys/values are present
 *   - source citations appear
 *   - tracker payload shape matches
 *   - answer queue was fully drained (no skipped prompts)
 *
 * Each assertion returns { ok: bool, reason: string } so the runner can
 * aggregate failures without throwing.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharedLib = require("../../shared/resources/create-skills-lib.js");

export function fileExists(p) {
  return { ok: fs.existsSync(p), reason: fs.existsSync(p) ? "" : `missing file: ${p}` };
}

export function fileAbsent(p) {
  const exists = fs.existsSync(p);
  return { ok: !exists, reason: exists ? `file should not exist: ${p}` : "" };
}

export function fileMatches(p, re) {
  if (!fs.existsSync(p)) return { ok: false, reason: `missing file: ${p}` };
  const content = fs.readFileSync(p, "utf-8");
  const ok = re.test(content);
  return { ok, reason: ok ? "" : `${p} does not match ${re}` };
}

export function frontmatterHas(p, expectedKeys) {
  if (!fs.existsSync(p)) return { ok: false, reason: `missing file: ${p}` };
  const content = fs.readFileSync(p, "utf-8");
  const { frontmatter } = sharedLib.parseFrontmatter(content);
  const missing = expectedKeys.filter(k => !(k in frontmatter));
  return {
    ok: missing.length === 0,
    reason: missing.length === 0 ? "" : `${p} missing frontmatter keys: ${missing.join(", ")}`,
  };
}

export function frontmatterEquals(p, expected) {
  if (!fs.existsSync(p)) return { ok: false, reason: `missing file: ${p}` };
  const content = fs.readFileSync(p, "utf-8");
  const { frontmatter } = sharedLib.parseFrontmatter(content);
  for (const [k, v] of Object.entries(expected)) {
    if (frontmatter[k] !== v) {
      return {
        ok: false,
        reason: `${p} frontmatter[${k}]: expected ${JSON.stringify(v)}, got ${JSON.stringify(frontmatter[k])}`,
      };
    }
  }
  return { ok: true, reason: "" };
}

export function hasAtLeastNSourceCitations(p, n) {
  if (!fs.existsSync(p)) return { ok: false, reason: `missing file: ${p}` };
  const content = fs.readFileSync(p, "utf-8");
  const citations = sharedLib.extractSourceCitations(content);
  return {
    ok: citations.length >= n,
    reason: citations.length >= n
      ? ""
      : `${p}: expected >= ${n} [Source: …] citations, got ${citations.length}`,
  };
}

export function trackerPayloadMatches(payloadPath, expectedShape) {
  if (!fs.existsSync(payloadPath)) {
    return { ok: false, reason: `tracker payload not written: ${payloadPath}` };
  }
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(payloadPath, "utf-8"));
  } catch (e) {
    return { ok: false, reason: `tracker payload not valid JSON: ${e.message}` };
  }
  for (const [k, expected] of Object.entries(expectedShape)) {
    const actual = getByPath(payload, k);
    const reMatch = typeof expected === "string" && expected.match(/^\/(.+)\/([gimsuy]*)$/);
    if (reMatch) {
      const re = new RegExp(reMatch[1], reMatch[2]);
      if (typeof actual !== "string" || !re.test(actual)) {
        return { ok: false, reason: `payload.${k}: expected match ${expected}, got ${JSON.stringify(actual)}` };
      }
    } else if (actual !== expected) {
      return { ok: false, reason: `payload.${k}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}` };
    }
  }
  return { ok: true, reason: "" };
}

function getByPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function answerQueueDrained(remainingAnswers) {
  return {
    ok: remainingAnswers.length === 0,
    reason: remainingAnswers.length === 0
      ? ""
      : `answer queue not drained — ${remainingAnswers.length} unused entries: ${
          remainingAnswers.slice(0, 3).map(a => a.matches).join(", ")
        }${remainingAnswers.length > 3 ? "…" : ""}`,
  };
}

export function aggregate(results) {
  const failures = results.filter(r => !r.ok);
  return {
    ok: failures.length === 0,
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    failures,
  };
}

// ---------------------------------------------------------------------------
// develop-task pipeline assertions
// ---------------------------------------------------------------------------

/**
 * Assert that a branch matching namePattern exists in a git repo at repoPath.
 *
 * In replay mode, the fixture should include a `.eval/branches.json` file
 * (array of branch name strings). When that file exists, it is used instead
 * of running `git branch --list`, so the assertion works in sandboxes that
 * aren't real git repos.
 *
 * @param {string} repoPath     Path to a git repo or replay sandbox
 * @param {string} namePattern  Regex string or branch name
 */
export function branchExists(repoPath, namePattern) {
  const re = new RegExp(namePattern);
  const branchesFile = path.join(repoPath, ".eval", "branches.json");

  let branches;
  if (fs.existsSync(branchesFile)) {
    try {
      branches = JSON.parse(fs.readFileSync(branchesFile, "utf-8"));
    } catch (e) {
      return { ok: false, reason: `branchExists: could not parse ${branchesFile}: ${e.message}` };
    }
  } else {
    // Live mode — actually run git
    const { spawnSync } = require("node:child_process");
    const result = spawnSync("git", ["branch", "--list"], { cwd: repoPath, encoding: "utf-8" });
    if (result.error || result.status !== 0) {
      return { ok: false, reason: `branchExists: git branch --list failed in ${repoPath}` };
    }
    branches = result.stdout.split("\n").map(s => s.replace(/^[* ]+/, "").trim()).filter(Boolean);
  }

  const matched = branches.some(b => re.test(b));
  return {
    ok: matched,
    reason: matched ? "" : `no branch matching ${namePattern} found in ${repoPath} (branches: ${branches.join(", ") || "(none)"})`,
  };
}

/**
 * Assert that all expected pipeline steps ran in order (order-sensitive subset).
 *
 * Reads a JSON file at eventsPath containing an array of RecordedEvent objects
 * (shape: { skill, status, timestamp }). The replay fixture should include
 * `.eval/pipeline-events.json` for this assertion to work deterministically.
 *
 * @param {string}   eventsPath     Path to a JSON file with RecordedEvent[]
 * @param {string[]} expectedSteps  Ordered list of skill names to verify
 */
export function pipelineStepsRan(eventsPath, expectedSteps) {
  if (!fs.existsSync(eventsPath)) {
    return { ok: false, reason: `pipelineStepsRan: events file not found: ${eventsPath}` };
  }
  let events;
  try {
    events = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
  } catch (e) {
    return { ok: false, reason: `pipelineStepsRan: could not parse ${eventsPath}: ${e.message}` };
  }
  const actual = events.filter(e => e.status === "started").map(e => e.skill);
  let i = 0;
  for (const expected of expectedSteps) {
    const found = actual.indexOf(expected, i);
    if (found === -1) {
      return { ok: false, reason: `pipelineStepsRan: step "${expected}" missing or out of order (actual: ${actual.join(", ")})` };
    }
    i = found + 1;
  }
  return { ok: true, reason: "" };
}

/**
 * Assert that a skill was invoked at most maxIter times (guards loop caps).
 *
 * Reads the same RecordedEvent[] JSON file used by pipelineStepsRan.
 *
 * @param {string} eventsPath  Path to a JSON file with RecordedEvent[]
 * @param {string} skill       Skill name to count
 * @param {number} maxIter     Maximum allowed invocations
 */
export function loopBoundedAt(eventsPath, skill, maxIter) {
  if (!fs.existsSync(eventsPath)) {
    return { ok: false, reason: `loopBoundedAt: events file not found: ${eventsPath}` };
  }
  let events;
  try {
    events = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
  } catch (e) {
    return { ok: false, reason: `loopBoundedAt: could not parse ${eventsPath}: ${e.message}` };
  }
  const count = events.filter(e => e.skill === skill && e.status === "started").length;
  return {
    ok: count <= maxIter,
    reason: count <= maxIter ? "" : `loopBoundedAt: skill "${skill}" ran ${count} times (max ${maxIter})`,
  };
}

/**
 * Assert a GitHub PR receipt indicates a PR was created on the expected base.
 *
 * Reads a JSON receipt file at receiptPath. The receipt may come from
 * gh-sandbox.mjs (live) or a fixture `.eval/gh-receipt.json` (replay).
 * If the receipt has `skipped: true`, the assertion is skipped (not failed).
 *
 * @param {string} receiptPath                Path to a JSON GhReceipt file
 * @param {object} opts
 * @param {string} [opts.base]                Expected base branch name
 * @param {string} [opts.titlePattern]        Regex string for PR title
 */
export function prCreated(receiptPath, opts = {}) {
  if (!fs.existsSync(receiptPath)) {
    return { ok: false, reason: `prCreated: receipt file not found: ${receiptPath}` };
  }
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, "utf-8"));
  } catch (e) {
    return { ok: false, reason: `prCreated: could not parse ${receiptPath}: ${e.message}` };
  }
  if (receipt.skipped) {
    // Skip, not fail — GH_TOKEN absent is an acceptable CI condition
    return { ok: true, reason: "" };
  }
  if (!receipt.pr) {
    return { ok: false, reason: `prCreated: receipt has no pr field` };
  }
  if (opts.base && receipt.pr.baseRefName !== opts.base) {
    return { ok: false, reason: `prCreated: expected base "${opts.base}", got "${receipt.pr.baseRefName}"` };
  }
  if (opts.titlePattern) {
    const re = new RegExp(opts.titlePattern);
    if (!re.test(receipt.pr.title ?? "")) {
      return { ok: false, reason: `prCreated: title "${receipt.pr.title}" does not match ${opts.titlePattern}` };
    }
  }
  return { ok: true, reason: "" };
}

/**
 * Assert no lock files remain under dirPath after pipeline completes.
 *
 * Searches recursively for files matching *.lock. The develop-task pipeline
 * should always clean up `.claude/state/develop-pipeline.lock` on completion.
 *
 * @param {string} dirPath  Directory to search
 */
export function noLockFilesLeft(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return { ok: false, reason: `noLockFilesLeft: directory not found: ${dirPath}` };
  }
  const lockFiles = findFiles(dirPath, ".lock");
  return {
    ok: lockFiles.length === 0,
    reason: lockFiles.length === 0 ? "" : `noLockFilesLeft: found ${lockFiles.length} lock file(s): ${lockFiles.slice(0, 3).join(", ")}`,
  };
}

// ---------------------------------------------------------------------------
// develop-story pipeline assertions
// ---------------------------------------------------------------------------

/**
 * Assert a GitHub PR receipt shows the PR targets an epic branch (not develop).
 *
 * Reads a JSON receipt file at receiptPath (shape: { skipped, pr: { baseRefName, ... } }).
 * Skipped receipts pass — GH_TOKEN absent is acceptable in CI.
 *
 * @param {string} receiptPath  Path to a JSON GhReceipt file
 * @param {number} epicNum      Epic number (e.g. 5 → base must match /^feature\/epic\.5\./)
 */
export function prTargetsEpicBranch(receiptPath, epicNum) {
  if (!fs.existsSync(receiptPath)) {
    return { ok: false, reason: `prTargetsEpicBranch: receipt file not found: ${receiptPath}` };
  }
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, "utf-8"));
  } catch (e) {
    return { ok: false, reason: `prTargetsEpicBranch: could not parse ${receiptPath}: ${e.message}` };
  }
  if (receipt.skipped) return { ok: true, reason: "" };
  if (!receipt.pr) return { ok: false, reason: "prTargetsEpicBranch: receipt has no pr field" };
  const expected = new RegExp(`^feature/epic\\.${epicNum}\\.`);
  const actual = receipt.pr.baseRefName ?? "";
  if (actual === "develop") {
    return { ok: false, reason: `prTargetsEpicBranch: PR targets develop — expected epic branch matching ${expected}` };
  }
  const ok = expected.test(actual);
  return {
    ok,
    reason: ok ? "" : `prTargetsEpicBranch: base "${actual}" does not match ${expected}`,
  };
}

/**
 * Assert that a branch matching the epic pattern exists in a git repo at repoPath.
 *
 * In replay mode, reads `.eval/branches.json`. In live mode, runs `git branch --list`.
 *
 * @param {string} repoPath  Path to a git repo or replay sandbox
 * @param {number} epicNum   Epic number (e.g. 5 → matches /^feature\/epic\.5\./)
 */
export function epicBranchExists(repoPath, epicNum) {
  const namePattern = `^feature/epic\\.${epicNum}\\.`;
  return branchExists(repoPath, namePattern);
}

/**
 * Assert resume was detected and the expected step reached the expected iteration count.
 *
 * Reads a JSON file at eventsPath containing an array of RecordedEvent objects.
 *
 * @param {string} eventsPath                 Path to a JSON file with RecordedEvent[]
 * @param {{ expectedStep: string, expectedIter: number }} opts
 */
export function resumeRehydrated(eventsPath, opts = {}) {
  if (!fs.existsSync(eventsPath)) {
    return { ok: false, reason: `resumeRehydrated: events file not found: ${eventsPath}` };
  }
  let events;
  try {
    events = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
  } catch (e) {
    return { ok: false, reason: `resumeRehydrated: could not parse ${eventsPath}: ${e.message}` };
  }
  const resumeEvent = events.find(
    e => e.skill === "resume-detector" || /resume/i.test(String(e.skill ?? "")),
  );
  if (!resumeEvent) {
    return { ok: false, reason: "resumeRehydrated: no resume detection event found in events" };
  }
  if (opts.expectedStep && opts.expectedIter != null) {
    const stepCount = events.filter(
      e => e.skill === opts.expectedStep && e.status === "started",
    ).length;
    if (stepCount < opts.expectedIter) {
      return {
        ok: false,
        reason: `resumeRehydrated: expected "${opts.expectedStep}" to reach iter ${opts.expectedIter}, got ${stepCount}`,
      };
    }
  }
  return { ok: true, reason: "" };
}

/** Recursive file search by extension. */
function findFiles(dir, ext) {
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findFiles(full, ext));
      } else if (entry.name.endsWith(ext)) {
        results.push(full);
      }
    }
  } catch {
    // Permission errors etc. — skip
  }
  return results;
}
