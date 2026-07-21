"use strict";
/**
 * Skill-specific assertion helpers for develop-story pipeline evals.
 *
 * Path-based assertions (usable from runner.mjs scenarios via $SANDBOX tokens):
 *   branchExists, pipelineStepsRan, loopBoundedAt, prCreated, noLockFilesLeft,
 *   prTargetsBranch, resumeRehydrated
 *
 * These are registered in evals/shared/assertions.mjs and the runner switch.
 * This file re-exports them for documentation and programmatic test use.
 *
 * Higher-level object-based wrappers (for programmatic/smoke scenarios):
 *   prTargetsBranchFromReceipt — takes a GhReceipt object directly
 *   resumeRehydratedFromEvents — takes a RecordedEvent[] array directly
 */

export {
  branchExists,
  pipelineStepsRan,
  loopBoundedAt,
  prCreated,
  noLockFilesLeft,
  prTargetsBranch,
  resumeRehydrated,
} from "../shared/assertions.mjs";

/**
 * Assert a GhReceipt object (not path) shows the PR targets the expected base.
 *
 * Story branches are cut from `develop` and PR back to `develop` (flat Gitflow),
 * so the default expected base is "develop"; pass "main" to override.
 *
 * @param {{ skipped?: boolean, pr?: { baseRefName?: string } } | null} receipt
 * @param {string} [expectedBase]  Expected base branch name (default "develop")
 */
export function prTargetsBranchFromReceipt(receipt, expectedBase = "develop") {
  if (!receipt || receipt.skipped) return { ok: true, reason: "" };
  if (!receipt.pr) return { ok: false, reason: "no pr field in receipt" };
  const actual = receipt.pr.baseRefName ?? "";
  const ok = actual === expectedBase;
  return {
    ok,
    reason: ok ? "" : `expected base "${expectedBase}", got "${actual}"`,
  };
}

/**
 * Assert resume was detected and a step reached the expected iteration count.
 * Takes a RecordedEvent[] array directly (for smoke tests).
 *
 * @param {import("../shared/lib/pipeline-recorder.mjs").RecordedEvent[]} events
 * @param {{ expectedStep: string, expectedIter: number }} opts
 */
export function resumeRehydratedFromEvents(
  events,
  { expectedStep, expectedIter },
) {
  const resumeEvent = events.find(
    (e) =>
      e.skill === "resume-detector" || /resume/i.test(String(e.skill ?? "")),
  );
  if (!resumeEvent)
    return { ok: false, reason: "no resume detection event in events array" };
  const stepCount = events.filter(
    (e) => e.skill === expectedStep && e.status === "started",
  ).length;
  if (stepCount < expectedIter) {
    return {
      ok: false,
      reason: `"${expectedStep}" reached iter ${stepCount} — expected ≥${expectedIter}`,
    };
  }
  return { ok: true, iters: stepCount };
}
