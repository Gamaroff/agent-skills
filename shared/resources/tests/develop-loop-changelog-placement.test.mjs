// develop-loop-changelog-placement.test.mjs — Step 3's CHANGELOG placement block fails a new entry
// that sits inside a shipped release, and passes one under [Unreleased] (task.283; obs #30).
//
// task.184's plan said to edit task 183's bullet "in [Unreleased] › Fixed"; it had shipped under
// `## [v0.53.0]`. CHANGELOG.md is outside ci.docsOnly.patterns, so the 5c review could only record
// the misplacement and /finalise halted at AC10 over a one-line move.
//
// This RUNS the block cut from the shipped document (the executed-prose harness), in a throwaway
// repository with an `origin/develop`, under bash and zsh when present. Grepping the document would
// prove the text exists, not that it works.

import test from "node:test";
import assert from "node:assert/strict";
import {
  SHELLS,
  readDoc,
  blockBy,
  bind,
  fixtureRepo,
  git,
  write,
  run,
  cleanup,
} from "./lib/executed-prose.mjs";

const STEP3 = "shared/resources/develop-pipeline-step-3-develop-loop.md";
const ANCHOR = "CHANGELOG placement for NEW entries";

const BASE_CHANGELOG = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "### Added",
  "",
  "- **Existing unreleased entry.**",
  "",
  "## [v1.1.0] - 2026-11-01",
  "",
  "### Fixed",
  "",
  "- **Shipped fix.**",
  "",
  "## [v1.0.0] - 2026-10-01",
  "",
  "- **First release.**",
  "",
].join("\n");

const block = bind(blockBy(readDoc(STEP3), ANCHOR), { "{base}": "develop" });

/** A repo whose origin/develop holds BASE_CHANGELOG, then `edit(text) -> text` applied in the work tree. */
function scenario(edit) {
  const { dir, work } = fixtureRepo();
  write(work, "CHANGELOG.md", BASE_CHANGELOG);
  git(work, "add", "-A");
  git(work, "commit", "-q", "-m", "changelog base");
  git(work, "push", "-q", "origin", "HEAD:develop");
  git(work, "fetch", "-q", "origin");
  write(work, "CHANGELOG.md", edit(BASE_CHANGELOG));
  return { dir, work };
}

const insertAfter = (text, anchor, line) =>
  text.replace(anchor, `${anchor}\n${line}`);

for (const shell of SHELLS) {
  test(`${shell}: a new entry under [Unreleased] passes (control)`, () => {
    const { dir, work } = scenario((t) =>
      insertAfter(
        t,
        "- **Existing unreleased entry.**",
        "- **New unreleased entry.**",
      ),
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 0, r.stdout + r.stderr);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: a new entry below the first release heading fails — the task.184 shape`, () => {
    const { dir, work } = scenario((t) =>
      insertAfter(t, "- **Shipped fix.**", "- **Misplaced new entry.**"),
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /below the first release heading \(line 9\)/);
      assert.match(r.stdout, /at line\(s\): 14 — move it/);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: an edit to a shipped entry is not a new entry and passes`, () => {
    const { dir, work } = scenario((t) =>
      t.replace("- **Shipped fix.**", "- **Shipped fix, reworded.**"),
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 0, r.stdout + r.stderr);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: no CHANGELOG change, or no CHANGELOG.md at all, passes`, () => {
    const { dir, work } = scenario((t) => t);
    try {
      assert.equal(run(shell, block, { cwd: work }).status, 0);
      git(work, "rm", "-q", "-f", "CHANGELOG.md");
      assert.equal(run(shell, block, { cwd: work }).status, 0);
    } finally {
      cleanup(dir);
    }
  });
}

test("non-vacuity: the block is found and {base} was bound to a remote ref", () => {
  assert.ok(block.includes("origin/develop"), "{base} was bound");
});
