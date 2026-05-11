"use strict";
/**
 * Skill-specific assertion helpers for develop-task pipeline evals.
 *
 * Path-based assertions (usable from runner.mjs scenarios via $SANDBOX tokens):
 *   branchExists, pipelineStepsRan, loopBoundedAt, prCreated, noLockFilesLeft
 *
 * These are registered in evals/shared/assertions.mjs and the runner switch.
 * This file re-exports them for documentation and programmatic test use.
 *
 * Higher-level object-based wrappers (for programmatic/smoke scenarios):
 *   branchExistsInRepo    — takes a git-sandbox Sandbox object
 *   pipelineStepsRanFromEvents — takes a RecordedEvent[] array directly
 *   loopBoundedAtFromEvents    — takes a RecordedEvent[] array directly
 */

export {
  branchExists,
  pipelineStepsRan,
  loopBoundedAt,
  prCreated,
  noLockFilesLeft,
} from "../shared/assertions.mjs";

/**
 * Assert a branch exists in a git-sandbox Sandbox object (live/smoke mode).
 *
 * @param {import("../shared/lib/git-sandbox.mjs").Sandbox} sandbox
 * @param {string|RegExp} namePattern
 */
export async function branchExistsInRepo(sandbox, namePattern) {
  const re = namePattern instanceof RegExp ? namePattern : new RegExp(namePattern);
  const branches = await sandbox.branchList();
  const matched = branches.some(b => re.test(b));
  return {
    ok: matched,
    reason: matched ? "" : `no branch matching ${namePattern} (branches: ${branches.join(", ") || "(none)"})`,
  };
}

/**
 * Assert all expected steps ran in order from a RecordedEvent[] array.
 *
 * @param {import("../shared/lib/pipeline-recorder.mjs").RecordedEvent[]} events
 * @param {string[]} expectedSteps
 */
export function pipelineStepsRanFromEvents(events, expectedSteps) {
  const actual = events.filter(e => e.status === "started").map(e => e.skill);
  let i = 0;
  for (const expected of expectedSteps) {
    const found = actual.indexOf(expected, i);
    if (found === -1) {
      return { ok: false, reason: `step "${expected}" missing or out of order (actual: ${actual.join(", ")})` };
    }
    i = found + 1;
  }
  return { ok: true, reason: "" };
}

/**
 * Assert skill invocations are bounded at maxIter from a RecordedEvent[] array.
 *
 * @param {import("../shared/lib/pipeline-recorder.mjs").RecordedEvent[]} events
 * @param {string} skill
 * @param {number} maxIter
 */
export function loopBoundedAtFromEvents(events, skill, maxIter) {
  const count = events.filter(e => e.skill === skill && e.status === "started").length;
  return {
    ok: count <= maxIter,
    reason: count <= maxIter ? "" : `skill "${skill}" ran ${count} times (max ${maxIter})`,
  };
}
