"use strict";
/**
 * The ONE table of assertion names a scenario may use, and how each is called.
 *
 * runner.mjs dispatches through it and repeat.mjs validates against it, so the set of known names
 * cannot drift from the dispatcher: a name is known exactly when it has an entry here (task.186 A2).
 * It lives outside runner.mjs because runner.mjs calls main() on load — importing it would start a
 * run.
 *
 * Each entry takes the resolved args and the run context `{ remainingAnswers }`.
 */
import * as A from "../assertions.mjs";

const DISPATCH = Object.freeze({
  fileExists: (args) => A.fileExists(...args),
  fileAbsent: (args) => A.fileAbsent(...args),
  fileMatches: (args) => A.fileMatches(args[0], new RegExp(args[1])),
  noFileMatching: (args) => A.noFileMatching(args[0], new RegExp(args[1])),
  fileDoesNotMatch: (args) => A.fileDoesNotMatch(args[0], new RegExp(args[1])),
  frontmatterHas: (args) => A.frontmatterHas(...args),
  frontmatterEquals: (args) => A.frontmatterEquals(...args),
  hasAtLeastNSourceCitations: (args) => A.hasAtLeastNSourceCitations(...args),
  trackerPayloadMatches: (args) => A.trackerPayloadMatches(...args),
  answerQueueDrained: (_args, ctx) =>
    A.answerQueueDrained(ctx.remainingAnswers),
  // develop-task pipeline assertions
  branchExists: (args) => A.branchExists(...args),
  pipelineStepsRan: (args) => A.pipelineStepsRan(args[0], args[1]),
  loopBoundedAt: (args) => A.loopBoundedAt(args[0], args[1], args[2]),
  prCreated: (args) =>
    A.prCreated(args[0], typeof args[1] === "object" ? args[1] : {}),
  noLockFilesLeft: (args) => A.noLockFilesLeft(...args),
  // develop-story pipeline assertions
  prTargetsBranch: (args) => A.prTargetsBranch(args[0], args[1]),
  resumeRehydrated: (args) =>
    A.resumeRehydrated(args[0], typeof args[1] === "object" ? args[1] : {}),
});

export const ASSERTION_FNS = Object.freeze(Object.keys(DISPATCH));

/** Run one assertion. An unknown name is a failed result; validate first so it never gets here. */
export function dispatchAssertion(fn, args, ctx) {
  if (!Object.hasOwn(DISPATCH, fn))
    return { ok: false, reason: `unknown assertion fn: ${fn}` };
  return DISPATCH[fn](args, ctx);
}

/**
 * Every problem with a scenario's assertion lists, as human-readable strings; empty when they are
 * well-formed. Checks `assertions` and `liveAssertions` both, whatever driver will run, so a typo in
 * a live-only list is caught by a replay run too.
 */
export function assertionListProblems(scenario) {
  const problems = [];
  for (const key of ["assertions", "liveAssertions"]) {
    const list = scenario[key];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      problems.push(`${key} must be an array`);
      continue;
    }
    list.forEach((a, i) => {
      const fn = a && typeof a === "object" ? a.fn : undefined;
      if (typeof fn !== "string" || !Object.hasOwn(DISPATCH, fn))
        problems.push(
          `${key}[${i}]: unknown assertion fn ${JSON.stringify(fn)}`,
        );
    });
  }
  return problems;
}
