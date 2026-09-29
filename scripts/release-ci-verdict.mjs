#!/usr/bin/env node
/**
 * release-ci-verdict.mjs — what did CI conclude for the commit about to be released?
 *
 * WHY THIS EXISTS
 * ---------------
 * `release.sh` used to certify a release on a local test run, and a local run is a claim about one
 * machine. On 2026-09-21 it passed while the `Test` workflow on `develop` had been red for five
 * consecutive pushes (obs #150, citing obs #149). The release is now certified by the verdict CI
 * recorded for the SHA — this module reads it and reduces it to one word.
 *
 * THE RULE
 * --------
 * Reduce the runs of each workflow, then take the worst workflow verdict
 * (`red` > `pending` > `unverifiable` > `green`):
 *
 *   any run failure / timed_out / startup_failure / action_required   → red
 *   else any run whose status is not `completed`                        → pending
 *   else at least one run with conclusion `success`                     → green
 *   else (no runs, or only cancelled / skipped / neutral)               → unverifiable (required)
 *                                                                          ignored     (whenPresent)
 *
 * Several runs per workflow is normal: the release commit is pushed to `main`, then to `develop` by
 * the sync step, so one SHA carries two `Test` runs. One red among them is red.
 *
 * FAILS CLOSED
 * ------------
 * `gh` missing, unauthenticated, failing, or printing something that is not a JSON array is
 * `unverifiable`, never `green`. A gate that cannot read its input must not report a pass.
 *
 * CLI: `release-ci-verdict.mjs --sha <40-hex> [--repo <owner/name>] [--json]` — prints one object
 * whose `reason` is
 * `green`, `red`, `pending` or `unverifiable`. Exit 0 green, 1 anything else, 2 usage.
 */
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The workflows that decide a release — the one definition. `tests/release-ci-verdict.test.js`
 * holds it equal to `.github/workflows/*.yml`: a rename there without a rename here fails at PR time.
 */
export const WORKFLOWS = Object.freeze({
  // push to main is unconditional — a missing run is unverifiable, not green
  required: Object.freeze(["Test", "ShellCheck"]),
  // push.paths-filtered — absent is fine, present-and-not-green is not
  whenPresent: Object.freeze(["Validate Skills", "Docs link check"]),
});

const RED_CONCLUSIONS = new Set([
  "failure",
  "timed_out",
  "startup_failure",
  "action_required",
]);
const RANK = { green: 0, unverifiable: 1, pending: 2, red: 3 };
const CAUSES = {
  red: (r) => RED_CONCLUSIONS.has(r.conclusion),
  pending: (r) => r.status !== "completed",
  unverifiable: () => true,
};

/**
 * GitHub's own shape for owner/name: an owner is letters, digits and single hyphens, neither first
 * nor last; a repository is letters, digits, `-`, `_` and `.`, but never `.` or `..`. The
 * looser `[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+` admitted `../x` (QA cycle 2, probe PRB2-1).
 */
export function isRepoSlug(value) {
  const m = /^([A-Za-z0-9](?:-?[A-Za-z0-9])*)\/([A-Za-z0-9_.-]+)$/.exec(
    String(value),
  );
  return m !== null && m[2] !== "." && m[2] !== "..";
}

/** One workflow's verdict from its runs, or null when the runs give no answer. */
function workflowVerdict(runs) {
  if (runs.some((r) => RED_CONCLUSIONS.has(r.conclusion))) return "red";
  if (runs.some((r) => r.status !== "completed")) return "pending";
  if (runs.some((r) => r.conclusion === "success")) return "green";
  return null;
}

/**
 * @param {Array<{workflowName, status, conclusion, event, databaseId, url}>} runs
 * @returns {{ reason: "green"|"red"|"pending"|"unverifiable", sha: string,
 *             workflows: Array<{ name, verdict, runs: Array<{ id, status, conclusion, event, url }> }>,
 *             detail: string }}
 */
export function ciVerdict(runs, workflows = WORKFLOWS, sha = "") {
  if (!Array.isArray(runs)) {
    return {
      reason: "unverifiable",
      sha,
      workflows: [],
      detail: "the run list is not an array",
    };
  }
  const out = [];
  const consider = [
    ...workflows.required.map((name) => ({ name, required: true })),
    ...workflows.whenPresent.map((name) => ({ name, required: false })),
  ];
  for (const { name, required } of consider) {
    const mine = runs.filter((r) => r && r.workflowName === name);
    const verdict = workflowVerdict(mine);
    if (verdict === null && !required) continue;
    out.push({
      name,
      verdict: verdict ?? "unverifiable",
      runs: mine.map((r) => ({
        id: r.databaseId,
        status: r.status,
        conclusion: r.conclusion,
        event: r.event,
        url: r.url,
      })),
    });
  }
  const reason = out.reduce(
    (worst, w) => (RANK[w.verdict] > RANK[worst] ? w.verdict : worst),
    "green",
  );
  const notGreen = out.filter((w) => w.verdict !== "green");
  const detail =
    notGreen.length === 0
      ? `${out.map((w) => w.name).join(", ")} green`
      : notGreen
          .map((w) => {
            // The run that PRODUCED the verdict, not merely the first with a URL: one SHA carries
            // a main run and a develop run, and "Test: red (url)" must not link the green one
            // (QA cycle 2, CR2-2). No causing run with a URL → no URL, never a wrong one.
            const url = w.runs.find(
              (r) => CAUSES[w.verdict]?.(r) && r.url,
            )?.url;
            const why =
              w.runs.length === 0 ? "no run for this commit" : w.verdict;
            return `${w.name}: ${why}${url ? ` (${url})` : ""}`;
          })
          .join("; ");
  return { reason, sha, workflows: out, detail };
}

/**
 * Fetch the runs CI recorded for one SHA. Any spawn error (including `gh` not installed), a
 * non-zero exit or output that is not a JSON array is `{ error }` — the caller reports it as
 * `unverifiable`.
 */
/**
 * `repo` (owner/name) is passed as `-R` when given. Without it gh infers the repository from the
 * git remotes, and a clone with several remotes and no default makes gh fail — which fails closed
 * (unverifiable), but refuses a green release for a reason that has nothing to do with CI (QA
 * cycle 1, CR-2). release.sh passes its REPO_SLUG.
 */
export function fetchRuns(sha, { spawn = spawnSync, repo = "" } = {}) {
  const r = spawn(
    "gh",
    [
      ...(repo ? ["-R", repo] : []),
      "run",
      "list",
      "--commit",
      sha,
      "--json",
      "workflowName,status,conclusion,event,databaseId,url",
      "--limit",
      "50",
    ],
    { encoding: "utf8", timeout: 60_000 },
  );
  if (r.error)
    return { error: `gh could not run: ${r.error.code ?? r.error.message}` };
  if (r.status !== 0) {
    const msg =
      String(r.stderr ?? "")
        .trim()
        .split("\n")[0] || `exit ${r.status}`;
    return { error: `gh run list failed: ${msg}` };
  }
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    return { error: "gh run list printed something that is not JSON" };
  }
  if (!Array.isArray(parsed))
    return { error: "gh run list did not print a JSON array" };
  return { runs: parsed };
}

const USAGE =
  "usage: release-ci-verdict.mjs --sha <40-hex> [--repo <owner/name>] [--json]";

/** @returns {number} exit code — 0 green, 1 anything else, 2 usage */
export function main(
  argv,
  { spawn = spawnSync, stdout = process.stdout, stderr = process.stderr } = {},
) {
  let sha = "";
  let json = false;
  let repo = "";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--sha") sha = argv[++i] ?? "";
    else if (a === "--repo") repo = argv[++i] ?? "";
    else if (a === "--help" || a === "-h") {
      stderr.write(USAGE + "\n");
      return 0;
    } else {
      stderr.write(`unknown argument: ${a}\n${USAGE}\n`);
      return 2;
    }
  }
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    stderr.write(`--sha must be a full 40-character commit SHA\n${USAGE}\n`);
    return 2;
  }
  if (repo !== "" && !isRepoSlug(repo)) {
    stderr.write(`--repo must be owner/name\n${USAGE}\n`);
    return 2;
  }
  const fetched = fetchRuns(sha, { spawn, repo });
  const result = fetched.error
    ? { reason: "unverifiable", sha, workflows: [], detail: fetched.error }
    : ciVerdict(fetched.runs, WORKFLOWS, sha);
  const exitCode = result.reason === "green" ? 0 : 1;
  stdout.write(
    json
      ? JSON.stringify({ ...result, exitCode }) + "\n"
      : `CI ${result.reason} for ${sha.slice(0, 8)} — ${result.detail}\n`,
  );
  return exitCode;
}

// Compare real paths: the script can be reached through a symlinked layout, where argv[1] arrives
// symlinked and import.meta.url is already real (obs #126 — the form security-probe.mjs uses).
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isInvokedDirectly()) {
  process.exitCode = main(process.argv.slice(2));
}
