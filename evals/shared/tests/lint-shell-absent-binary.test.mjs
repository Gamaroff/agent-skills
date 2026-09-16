/**
 * Behavioural check for `scripts/lint-shell.sh`'s absent-binary branch.
 *
 * WHY THIS EXISTS
 * ---------------
 * Task 111's success criterion 4 — "missing `shellcheck` is reported, not
 * silently passed" — shipped with a MANUAL probe only
 * (`PATH=/usr/bin:/bin bash scripts/lint-shell.sh`, recorded in the
 * implementation report). `/finalise` refused the criterion on the citation
 * rule: an implemented branch with no test that runs per-PR is a claim. This
 * file is that test. The parity test names the script as the workflow's twin
 * but never executes it, and `shellcheck.yml` lints its syntax, not its
 * behaviour.
 *
 * WHAT IS ASSERTED
 * ----------------
 *   1. With NO `shellcheck` on PATH the script prints the skip message on
 *      stdout and exits 0 — loud, and never a failure for a contributor who
 *      lacks the binary.
 *   2. With a stub `shellcheck` on PATH the skip branch is NOT taken: the
 *      script reaches the lint and reports `shellcheck: clean`. Without this
 *      direction, a script that skipped unconditionally would pass check 1.
 *
 * PATH is replaced, not amended: a temp bin directory holding symlinks to
 * `bash`, `git`, `grep` and `sed` (the externals the script itself calls) and,
 * for check 2, a stub `shellcheck`. `command -v` is a builtin, so it sees
 * exactly that directory.
 *
 * Hermetic: bash only, no network, no model calls, the real shellcheck is
 * never run.
 *
 * Run: node --test evals/shared/tests/lint-shell-absent-binary.test.mjs
 * Mutation that must go red: delete the `if ! command -v shellcheck` block in
 * scripts/lint-shell.sh → check 1 fails (non-zero exit, no skip message).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "lint-shell.sh");
const SKIP_MESSAGE = "shellcheck not installed — lane skipped";

function which(name) {
  const r = spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" });
  assert.equal(r.status, 0, `${name} must be resolvable to build the sandbox PATH`);
  return r.stdout.trim();
}

/** A PATH holding only bash and git (plus whatever `extra` writes into it). */
function sandboxPath(extra = () => {}) {
  const bin = mkdtempSync(path.join(tmpdir(), "lint-shell-bin-"));
  for (const tool of ["bash", "git", "grep", "sed"]) symlinkSync(which(tool), path.join(bin, tool));
  extra(bin);
  return bin;
}

function runLintShell(bin) {
  return spawnSync(path.join(bin, "bash"), [SCRIPT], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { PATH: bin, HOME: process.env.HOME ?? "/" },
  });
}

test("lint-shell.sh — shellcheck absent: skip message on stdout, exit 0", () => {
  const bin = sandboxPath();
  try {
    const r = runLintShell(bin);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\nstderr: ${r.stderr}`);
    assert.match(r.stdout, new RegExp(SKIP_MESSAGE), `skip message missing from stdout:\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /shellcheck: clean/, "the lint must not report clean when it did not run");
  } finally {
    rmSync(bin, { recursive: true, force: true });
  }
});

test("lint-shell.sh — shellcheck present: the skip branch is not taken", () => {
  const bin = sandboxPath((dir) => {
    const stub = path.join(dir, "shellcheck");
    writeFileSync(stub, '#!/usr/bin/env bash\n[ "${1:-}" = "--version" ] && echo "version: 0.0.0-stub"\nexit 0\n');
    chmodSync(stub, 0o755);
  });
  try {
    const r = runLintShell(bin);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\nstderr: ${r.stderr}`);
    assert.doesNotMatch(r.stdout, new RegExp(SKIP_MESSAGE), "skip branch taken although shellcheck was on PATH");
    assert.match(r.stdout, /shellcheck: clean/, `lint did not run to completion:\n${r.stdout}`);
  } finally {
    rmSync(bin, { recursive: true, force: true });
  }
});
