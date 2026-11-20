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
import fs from "node:fs";
import path from "node:path";
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
function scenario(edit, base = BASE_CHANGELOG) {
  const { dir, work } = fixtureRepo();
  write(work, "CHANGELOG.md", base);
  git(work, "add", "-A");
  git(work, "commit", "-q", "-m", "changelog base");
  git(work, "push", "-q", "origin", "HEAD:develop");
  git(work, "fetch", "-q", "origin");
  write(work, "CHANGELOG.md", edit(base));
  return { dir, work };
}

// The same document under a "## [1.x.y]" heading style (no "v"), and one with no release heading.
const DIGIT_STYLE = BASE_CHANGELOG.replaceAll("## [v", "## [");
const NO_RELEASE = BASE_CHANGELOG.split("## [v1.1.0]")[0];

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
      assert.match(r.stdout, /1 more bullet\(s\) below the first release/);
      assert.match(r.stdout, /Misplaced new entry/);
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

  test(`${shell}: an edit beside a new entry in one hunk still fails the new entry (mixed hunk)`, () => {
    const { dir, work } = scenario((t) =>
      t.replace(
        "- **Shipped fix.**",
        "- **Shipped fix, reworded.**\n- **Misplaced new entry.**",
      ),
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /below the first release heading/);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: a "* " bullet below the first release heading fails`, () => {
    const { dir, work } = scenario((t) =>
      insertAfter(t, "- **Shipped fix.**", "* **Misplaced star bullet.**"),
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: a "## [1.1.0]" heading style (no v) is found and fails a misplaced entry`, () => {
    const { dir, work } = scenario(
      (t) => insertAfter(t, "- **Shipped fix.**", "- **Misplaced new entry.**"),
      DIGIT_STYLE,
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /below the first release heading/);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: no release heading at all passes, and says placement was not checked`, () => {
    const { dir, work } = scenario(
      (t) =>
        insertAfter(t, "- **Existing unreleased entry.**", "- **New entry.**"),
      NO_RELEASE,
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /no release heading .* placement is not checked/);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: an unfetched base HALTs instead of passing (could not look)`, () => {
    const { dir, work } = scenario((t) =>
      insertAfter(t, "- **Shipped fix.**", "- **Misplaced new entry.**"),
    );
    try {
      const unfetched = bind(blockBy(readDoc(STEP3), ANCHOR), {
        "{base}": "nonexistent",
      });
      const r = run(shell, unfetched, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /origin\/nonexistent is not a ref/);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: a git diff that fails with the base present HALTs (corrupt index)`, () => {
    const { dir, work } = scenario((t) =>
      insertAfter(t, "- **Shipped fix.**", "- **Misplaced new entry.**"),
    );
    try {
      fs.writeFileSync(path.join(work, ".git", "index"), "not an index");
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /git diff against the merge base failed/);
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

// A new bullet that REPLACES a non-bullet line is still one more bullet (T283-QA-10). Each shape
// below defeated the per-hunk rule; the section bullet count sees all three.
const REPLACEMENTS = {
  "a heading and the blank line under it": (t) =>
    t.replace("### Fixed\n\n", "- **Misplaced new entry.**\n"),
  "a blank line": (t) =>
    t.replace(
      "- **Shipped fix.**\n\n## [v1.0.0]",
      "- **Shipped fix.**\n- **Misplaced new entry.**\n## [v1.0.0]",
    ),
};
const WITH_PROSE = BASE_CHANGELOG.replace(
  "- **Shipped fix.**\n",
  "- **Shipped fix.**\nProse line.\n",
);

for (const shell of SHELLS) {
  for (const [name, edit] of Object.entries(REPLACEMENTS)) {
    test(`${shell}: a new bullet replacing ${name} fails`, () => {
      const { dir, work } = scenario(edit);
      try {
        const r = run(shell, block, { cwd: work });
        assert.equal(r.status, 1, r.stdout + r.stderr);
        assert.match(r.stdout, /1 more bullet\(s\) below the first release/);
      } finally {
        cleanup(dir);
      }
    });
  }

  test(`${shell}: a new bullet replacing a prose line fails`, () => {
    const { dir, work } = scenario(
      (t) => t.replace("Prose line.\n", "- **Misplaced new entry.**\n"),
      WITH_PROSE,
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: a base that moved on is not counted against the branch (merge base)`, () => {
    const { dir, work } = scenario((t) =>
      insertAfter(t, "- **Shipped fix.**", "- **Misplaced new entry.**"),
    );
    try {
      // origin/develop gains a shipped bullet this branch never saw. Against the base TIP the branch
      // would look one bullet short and the misplaced entry would be masked.
      const other = path.join(dir, "other");
      git(dir, "clone", "-q", path.join(dir, "origin.git"), other);
      git(other, "config", "user.email", "t@example.com");
      git(other, "config", "user.name", "t");
      write(
        other,
        "CHANGELOG.md",
        insertAfter(
          BASE_CHANGELOG,
          "- **Shipped fix.**",
          "- **Shipped later on the base.**",
        ),
      );
      git(other, "commit", "-q", "-am", "base moves on");
      git(other, "push", "-q", "origin", "HEAD:develop");
      git(work, "fetch", "-q", "origin");
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: a CHANGELOG new in this branch is not compared, and says so`, () => {
    const { dir, work } = fixtureRepo();
    try {
      write(work, "CHANGELOG.md", BASE_CHANGELOG);
      git(work, "add", "CHANGELOG.md");
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /does not exist at the merge base/);
    } finally {
      cleanup(dir);
    }
  });
}

// Stated limits and failure paths (QA cycle 4, CR-1..CR-4). Each pins a behaviour the block claims.
for (const shell of SHELLS) {
  const misplaced = (t) =>
    insertAfter(t, "- **Shipped fix.**", "- **Misplaced new entry.**");

  test(`${shell}: an unusable TMPDIR does not turn a misplaced entry into a pass`, () => {
    const { dir, work } = scenario(misplaced);
    try {
      const r = run(shell, block, {
        cwd: work,
        env: { TMPDIR: "/nonexistent/dir" },
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /Misplaced new entry/);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: a caller running under set -e still gets the answer`, () => {
    const { dir, work } = scenario(misplaced);
    try {
      const r = run(shell, `set -e\n${block}`, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /1 more bullet\(s\)/);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: a shallow clone with no merge base HALTs and names the remedy`, () => {
    const { dir, work } = scenario(misplaced);
    try {
      // An unrelated root commit: HEAD and origin/develop share no ancestor.
      git(work, "checkout", "-q", "--orphan", "unrelated");
      git(work, "commit", "-q", "-m", "orphan", "--allow-empty");
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /no merge base/);
      assert.match(r.stdout, /unshallow/);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: a release cut HALTs (stated limit)`, () => {
    const { dir, work } = scenario((t) =>
      t.replace(
        "## [v1.0.0]",
        "## [v1.0.1] - 2026-02-01\n\n- **Cut release entry.**\n\n## [v1.0.0]",
      ),
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 1, r.stdout + r.stderr);
    } finally {
      cleanup(dir);
    }
  });

  test(`${shell}: an added bullet offset by a removed one passes (stated limit)`, () => {
    const { dir, work } = scenario((t) =>
      t
        .replace("- **Shipped fix.**\n", "- **Shipped fix.**\n- **Added.**\n")
        .replace("- **First release.**\n", ""),
    );
    try {
      const r = run(shell, block, { cwd: work });
      assert.equal(r.status, 0, r.stdout + r.stderr);
    } finally {
      cleanup(dir);
    }
  });
}
