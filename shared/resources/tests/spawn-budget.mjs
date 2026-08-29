/**
 * Spawn budget for test suites that fork a child per assertion — bug.2.
 *
 * WHY THIS EXISTS
 * ---------------
 * Roughly a fifth of this repo's test files `spawnSync` a child per assertion. Each child's
 * latency is a function of how loaded the machine is, and a dev box running `npm test` is
 * usually also running the agent pipelines that asked for it. Measured on a 16-core box: a full
 * suite whose slowest test takes 2.8s idle takes 16.2s with sixteen competing spawn loops — a
 * ~6x inflation that no change to the code under test can prevent.
 *
 * A bare `timeout: 20000` chosen against an idle machine therefore is not the generous margin it
 * looks like. It sat about 1.2x above the loaded worst case, which is close enough to be hit and
 * rare enough to look like a mystery when it is. Two merges have already gone through over a red
 * local suite because of it (task.62, task.63).
 *
 * `access-config-parity.test.mjs` worked this out first and fixed it locally, with a 60s budget
 * and a retry for a probe that never started. This module is that remedy extracted so the next
 * spawn-heavy suite inherits it instead of rediscovering it. It is the "shared spawn helper with
 * a generous env-tunable timeout" the bug asked for.
 *
 * WHY ENV-TUNABLE
 * ---------------
 * A slower or smaller CI box must be adjustable without a commit, and without editing assertion
 * logic. Precedence is specific-then-general so one suite can be loosened alone:
 *
 *   {PREFIX}_SPAWN_TIMEOUT_MS  >  TEST_SPAWN_TIMEOUT_MS  >  60000
 *   {PREFIX}_SPAWN_RETRIES     >  TEST_SPAWN_RETRIES     >  2
 *
 * WHY NOT JUST RAISE THE NUMBERS IN PLACE
 * ---------------------------------------
 * Because the bare literals are the thing that keeps coming back. Eleven of them across two files
 * had each been chosen separately, and the one file that fixed its own could not help its
 * neighbour. `tests/test-harness-concurrency.test.js` pins that: a spawn timeout literal in a test
 * file is a failure, so the budget cannot be quietly forked again.
 */

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRIES = 2;

function readInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * The spawn budget for one suite.
 *
 * @param {string} prefix Suite-specific env prefix, e.g. "PARITY" → PARITY_SPAWN_TIMEOUT_MS.
 * @returns {{timeoutMs: number, retries: number}}
 */
export function spawnBudget(prefix) {
  const specificTimeout = prefix ? process.env[`${prefix}_SPAWN_TIMEOUT_MS`] : undefined;
  const specificRetries = prefix ? process.env[`${prefix}_SPAWN_RETRIES`] : undefined;
  return {
    timeoutMs: readInt(
      specificTimeout ?? process.env.TEST_SPAWN_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
    ),
    retries: readInt(specificRetries ?? process.env.TEST_SPAWN_RETRIES, DEFAULT_RETRIES),
  };
}

/**
 * True when a spawnSync result means "the child never produced an answer" — killed on timeout,
 * or never started at all (fork pressure, EAGAIN) — as opposed to a child that ran and exited
 * non-zero. Only the former is worth retrying; the latter is a result.
 *
 * A CHILD THAT NEVER RAN IS NOT AN ANSWER. Treating it as one is how a loaded box turns into a
 * reported behavioural divergence that never happened.
 */
export function neverRan(result) {
  return Boolean(result.error) || Boolean(result.signal) || result.status === null;
}
