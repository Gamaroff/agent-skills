#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finalise-fix-and-recheck.mjs. Regenerate via `npm run bundle`.
/**
 * finalise-fix-and-recheck — evaluate the fix-and-recheck preconditions for
 * /finalise Step 8a (task.128, obs #121).
 *
 * Usage:
 *   node <this-file> --finding <path.json> [--json]
 *
 * The finding file carries the five inputs the preconditions read:
 *   {
 *     "severity": "low",                       // from the agent YAML; absent = not low
 *     "commits": 1,                             // commits the fix takes
 *     "touched": ["lib/x.sh"],                  // paths the fix changes
 *     "filesSummary": ["lib/x.sh"],             // the work item's Files Summary / File List
 *     "mutationProof": { "test": "tests/x.test.js", "redOnRevert": true },
 *     "otherFindingsOpen": []                   // medium+ findings, or other FAIL sections
 *   }
 *
 * Exit codes (repository convention):
 *   0  every precondition holds — proceed through fix-and-recheck
 *   1  at least one does not — take the existing Step 8 halt; `failed[]` names them
 *   2  usage error (missing/unreadable finding file, malformed JSON)
 *
 * WHY A TABLE AND NOT A JUDGEMENT. On task.121 the finalise security agent found
 * a one-line fail-closed defect in the very script the task delivered, and
 * finalise had two exits: accept, or halt a hands-free run for a human. The run
 * fixed it inline and recorded a deviation. The next run has the same choice and
 * had no rule. The preconditions in finalise-fix-and-recheck-preconditions.json
 * are each checkable from the record; this file checks them, and nothing else
 * decides. A missing input is a failed precondition, never a pass.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// bundle-dependency: shared/resources/finalise-fix-and-recheck-preconditions.json
const TABLE_URL = new URL(
  "./finalise-fix-and-recheck-preconditions.json",
  import.meta.url,
);

/** The pinned table, read once. Exported so a test asserts the ids, not a copy. */
export const PRECONDITIONS = Object.freeze(
  JSON.parse(readFileSync(TABLE_URL, "utf8")).preconditions.map((p) =>
    Object.freeze({ ...p }),
  ),
);

const isList = (v) => Array.isArray(v);

/**
 * One check per precondition id. The keys of this map ARE the evaluator's
 * vocabulary; the test asserts they equal the table's ids exactly, in both
 * directions, so a precondition cannot be added to the table without a check
 * or checked without a row.
 */
const CHECKS = Object.freeze({
  "severity-low": (f) =>
    f.severity === "low"
      ? null
      : f.severity === undefined || f.severity === null
        ? "finding carries no `severity` — not low (the agent did not answer)"
        : `severity is "${f.severity}", not low`,
  "single-commit": (f) =>
    Number.isInteger(f.commits) && f.commits === 1
      ? null
      : `fix is ${f.commits === undefined ? "an unknown number of" : f.commits} commit(s), not 1`,
  "inside-files-summary": (f) => {
    if (!isList(f.touched) || f.touched.length === 0) {
      return "no `touched` paths recorded";
    }
    if (!isList(f.filesSummary)) return "no `filesSummary` recorded";
    const outside = f.touched.filter((p) => !f.filesSummary.includes(p));
    return outside.length === 0
      ? null
      : `outside the Files Summary: ${outside.join(", ")}`;
  },
  "mutation-proved": (f) => {
    const m = f.mutationProof;
    if (!m || typeof m !== "object") return "no `mutationProof` recorded";
    if (typeof m.test !== "string" || m.test.trim() === "") {
      return "mutationProof names no test";
    }
    return m.redOnRevert === true
      ? null
      : `${m.test} did not go red on revert (redOnRevert: ${m.redOnRevert})`;
  },
  "no-other-finding-open": (f) =>
    !isList(f.otherFindingsOpen)
      ? "no `otherFindingsOpen` recorded"
      : f.otherFindingsOpen.length === 0
        ? null
        : `${f.otherFindingsOpen.length} other finding(s) open: ${f.otherFindingsOpen.join("; ")}`,
});

/** The ids the evaluator knows. Exported for the parity test. */
export const CHECK_IDS = Object.freeze(Object.keys(CHECKS));

/**
 * Evaluate a finding against every precondition.
 *
 * @returns {{proceed: boolean, checked: string[], failed: Array<{id: string, detail: string}>}}
 */
export function evaluateFixAndRecheck(finding) {
  if (!finding || typeof finding !== "object" || Array.isArray(finding)) {
    throw new TypeError("evaluateFixAndRecheck: finding must be an object");
  }
  const failed = [];
  const checked = [];
  for (const p of PRECONDITIONS) {
    const check = CHECKS[p.id];
    if (!check) {
      // A row with no check is a precondition nothing enforces; refuse rather
      // than skip it, because skipping reads as "held".
      failed.push({
        id: p.id,
        detail: "no check implemented for this precondition",
      });
      continue;
    }
    checked.push(p.id);
    const detail = check(finding);
    if (detail !== null) failed.push({ id: p.id, detail });
  }
  return { proceed: failed.length === 0, checked, failed };
}

export function main(argv = process.argv.slice(2)) {
  let findingPath;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--finding") {
      const operand = argv[i + 1];
      if (operand === undefined || operand.startsWith("--")) {
        process.stderr.write("--finding requires a path\n");
        return 2;
      }
      findingPath = operand;
      i += 1;
    } else {
      process.stderr.write(`unknown argument: ${a}\n`);
      return 2;
    }
  }
  if (!findingPath) {
    process.stderr.write("--finding <path.json> is required\n");
    return 2;
  }
  let finding;
  try {
    finding = JSON.parse(readFileSync(findingPath, "utf8"));
  } catch (e) {
    process.stderr.write(`cannot read --finding: ${e.message}\n`);
    return 2;
  }
  let result;
  try {
    result = evaluateFixAndRecheck(finding);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    return 2;
  }
  const reason = result.proceed ? "proceed" : "halt";
  if (json) {
    process.stdout.write(
      `${JSON.stringify({ reason, exitCode: result.proceed ? 0 : 1, ...result }, null, 2)}\n`,
    );
  } else if (result.proceed) {
    process.stdout.write(
      `proceed — all ${result.checked.length} preconditions hold\n`,
    );
  } else {
    process.stdout.write(
      `halt — ${result.failed.length} precondition(s) fail:\n` +
        result.failed.map((f) => `  ${f.id}: ${f.detail}\n`).join(""),
    );
  }
  return result.proceed ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main();
}
