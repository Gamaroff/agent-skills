"use strict";
/**
 * Skill-specific assertion helpers for develop-story pipeline evals.
 *
 * Path-based assertions (usable from runner.mjs scenarios via $SANDBOX tokens):
 *   branchExists, pipelineStepsRan, loopBoundedAt, prCreated, noLockFilesLeft,
 *   prTargetsEpicBranch, epicBranchExists, resumeRehydrated
 *
 * These are registered in evals/shared/assertions.mjs and the runner switch.
 * This file re-exports them for documentation and programmatic test use.
 *
 * Higher-level object-based wrappers (for programmatic/smoke scenarios):
 *   epicBranchExistsInRepo   — takes a git-sandbox Sandbox object
 *   epicBranchBasedOn        — takes a git-sandbox Sandbox object + expected base
 *   prTargetsEpicBranchFromReceipt — takes a GhReceipt object directly
 *   resumeRehydratedFromEvents     — takes a RecordedEvent[] array directly
 */

export {
  branchExists,
  pipelineStepsRan,
  loopBoundedAt,
  prCreated,
  noLockFilesLeft,
  prTargetsEpicBranch,
  epicBranchExists,
  resumeRehydrated,
} from "../shared/assertions.mjs";

/**
 * Assert an epic branch exists in a git-sandbox Sandbox object (live/smoke mode).
 *
 * @param {import("../shared/lib/git-sandbox.mjs").Sandbox} sandbox
 * @param {number} epicNum
 */
export async function epicBranchExistsInRepo(sandbox, epicNum) {
  const re = new RegExp(`^feature/epic\\.${epicNum}\\.`);
  const branches = await sandbox.branchList();
  const matched = branches.some(b => re.test(b));
  return {
    ok: matched,
    reason: matched ? "" : `no epic branch for epic ${epicNum} found (branches: ${branches.join(", ") || "(none)"})`,
  };
}

/**
 * Assert an epic branch is based on the expected base branch.
 *
 * Uses rev-list ancestor check — stronger than plain merge-base.
 *
 * @param {import("../shared/lib/git-sandbox.mjs").Sandbox} sandbox
 * @param {number} epicNum
 * @param {string} expectedBase  e.g. "develop" or "main"
 */
export async function epicBranchBasedOn(sandbox, epicNum, expectedBase = "develop") {
  const branches = await sandbox.branchList();
  const epicBranch = branches.find(b => new RegExp(`^feature/epic\\.${epicNum}\\.`).test(b));
  if (!epicBranch) return { ok: false, reason: `no epic branch for epic ${epicNum} found` };
  // Assert expectedBase is an ancestor of epicBranch
  const result = await sandbox.run("git", [
    "merge-base", "--is-ancestor", expectedBase, epicBranch,
  ]).then(() => ({ ok: true })).catch(() => ({ ok: false }));
  return {
    ok: result.ok,
    reason: result.ok ? "" : `epic branch "${epicBranch}" is not based on "${expectedBase}"`,
  };
}

/**
 * Assert a GhReceipt object (not path) shows PR targets an epic branch.
 *
 * @param {{ skipped?: boolean, pr?: { baseRefName?: string } } | null} receipt
 * @param {number} epicNum
 */
export function prTargetsEpicBranchFromReceipt(receipt, epicNum) {
  if (!receipt || receipt.skipped) return { ok: true, reason: "" };
  if (!receipt.pr) return { ok: false, reason: "no pr field in receipt" };
  const expected = new RegExp(`^feature/epic\\.${epicNum}\\.`);
  const actual = receipt.pr.baseRefName ?? "";
  if (actual === "develop") {
    return { ok: false, reason: `PR targets develop — expected epic branch matching ${expected}` };
  }
  const ok = expected.test(actual);
  return { ok, reason: ok ? "" : `base "${actual}" does not match ${expected}` };
}

/**
 * Assert resume was detected and a step reached the expected iteration count.
 * Takes a RecordedEvent[] array directly (for smoke tests).
 *
 * @param {import("../shared/lib/pipeline-recorder.mjs").RecordedEvent[]} events
 * @param {{ expectedStep: string, expectedIter: number }} opts
 */
export function resumeRehydratedFromEvents(events, { expectedStep, expectedIter }) {
  const resumeEvent = events.find(
    e => e.skill === "resume-detector" || /resume/i.test(String(e.skill ?? "")),
  );
  if (!resumeEvent) return { ok: false, reason: "no resume detection event in events array" };
  const stepCount = events.filter(e => e.skill === expectedStep && e.status === "started").length;
  if (stepCount < expectedIter) {
    return {
      ok: false,
      reason: `"${expectedStep}" reached iter ${stepCount} — expected ≥${expectedIter}`,
    };
  }
  return { ok: true, iters: stepCount };
}
