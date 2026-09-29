/**
 * consumer-root.test.mjs — the consumer-root helper works, and the hazard it
 * exists for does not depend on the developer's checkout.
 *
 * A snippet that sources `.agents/skills/<name>/references/…` resolves only in a
 * consumer-shaped root. At this repository's root it resolves only through the
 * gitignored `.agents/skills -> ../skills` symlink, which CI does not have, so a
 * test that runs such a snippet from the repo root is green locally and red on
 * every CI push (obs #149). Two cases, one snippet:
 *
 *   - from makeConsumerRoot()'s root it succeeds (the helper does its job);
 *   - from a bare temporary directory it fails (the PREMISE: the path is not
 *     resolvable without the link — if this ever passes, the helper is
 *     protecting against nothing and this test is certifying an assumption).
 *
 * Behaviour, not source text: both cases spawn bash and read its exit status.
 * Run: node --test evals/shared/tests/consumer-root.test.mjs
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeConsumerRoot } from "../lib/consumer-root.mjs";

// Task 154 AC6: this file runs in under 10 s. Timed from module load, so every
// test and fixture counts; a failing root after-hook fails the run.
const FILE_BUDGET_MS = 10_000;
const FILE_STARTED = process.hrtime.bigint();
after(() => {
  const ms = Number(process.hrtime.bigint() - FILE_STARTED) / 1e6;
  assert.ok(
    ms < FILE_BUDGET_MS,
    `this file took ${Math.round(ms)} ms, over its ${FILE_BUDGET_MS} ms budget (task 154 AC6)`,
  );
});

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const HELPER_REL = ".agents/skills/finalise/references/newest-numbered.sh";
const SNIPPET = `source ${HELPER_REL} && type newest_numbered >/dev/null`;

function runSnippet(cwd) {
  return spawnSync("bash", ["--noprofile", "--norc", "-c", SNIPPET], {
    cwd,
    encoding: "utf-8",
  });
}

test("the helper's root resolves .agents/skills/… and the sourced function loads", () => {
  const root = makeConsumerRoot(REPO, "consumer-root-test-");
  assert.ok(
    existsSync(path.join(root, HELPER_REL)),
    `${HELPER_REL} is not reachable from the consumer root`,
  );
  const r = runSnippet(root);
  assert.equal(
    r.status,
    0,
    `snippet failed in the consumer root:\n${r.stderr}`,
  );
});

test("premise: the same snippet fails from a bare directory with no .agents/skills", () => {
  const bare = mkdtempSync(path.join(tmpdir(), "consumer-root-bare-"));
  try {
    const r = runSnippet(bare);
    assert.notEqual(
      r.status,
      0,
      "the snippet resolved without .agents/skills — the consumer root guards nothing",
    );
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }
});
