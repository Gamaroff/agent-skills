// changelog-cites.test.mjs — the one CHANGELOG citation check (task.248, obs #43).
//
// changelog-cites.sh is /finalise 6d's check, moved so develop's completion checklist and the QA
// skills' docs check run the same one. Each case lays the script out as a consumer install does
// (beside changelog-enforce.sh, read-config.sh and doc-id.js) and calls it from bash AND zsh, the
// two shells the callers' blocks run in. The last test runs 6d's own block and pins its messages:
// the move must not change one word of them.
//
// Run: node --test shared/resources/tests/changelog-cites.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { zshAvailable } from "../qa-execute-snippets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..", "..", "..");
const SRC = path.join(REPO_ROOT, "shared/resources");
const INSTALL = [
  "changelog-cites.sh",
  "changelog-enforce.sh",
  "read-config.sh",
  "doc-id.js",
];
const OPTED_IN = "changelog:\n  enforce: true\n";
const CHANGELOG = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "- **New work (task 248).** Body.",
  "- **Short id (task 24).** Body.",
  "",
  "## [v0.1.0] - 2026-01-01",
  "",
  "- **Released work (task 302).** Body.",
  "",
].join("\n");

// zsh is installed in CI (.github/workflows/test.yml); tests/ci-tool-skips.test.js fails CI when a
// suite that calls zshAvailable() would skip the zsh arm. Locally a missing zsh is a skip.
const SHELLS = ["bash", ...(zshAvailable() ? ["zsh"] : [])];

function inConsumer(
  shell,
  script,
  { changelog = CHANGELOG, config = OPTED_IN, installed = INSTALL } = {},
) {
  const dir = mkdtempSync(path.join(tmpdir(), "changelog-cites-"));
  try {
    const refs = path.join(dir, ".agents/skills/finalise/references");
    mkdirSync(refs, { recursive: true });
    for (const f of installed)
      copyFileSync(path.join(SRC, f), path.join(refs, f));
    if (config !== null)
      writeFileSync(path.join(dir, "skills-config.yaml"), config);
    if (changelog !== null)
      writeFileSync(path.join(dir, "CHANGELOG.md"), changelog);
    return spawnSync(shell, ["-c", script], {
      cwd: dir,
      encoding: "utf8",
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const cites = (shell, stem, opts) => {
  const r = inConsumer(
    shell,
    `out=$(bash .agents/skills/finalise/references/changelog-cites.sh ${stem}); echo "rc=$? $out"`,
    opts,
  );
  const m = /^rc=(\d+) (.*)$/m.exec(r.stdout);
  assert.ok(m, `no result line: ${r.stdout}${r.stderr}`);
  return { rc: Number(m[1]), out: m[2] };
};

for (const shell of SHELLS) {
  test(`[${shell}] 0 cites, 1 missing — only [Unreleased] counts`, () => {
    assert.deepEqual(cites(shell, "task.248"), {
      rc: 0,
      out: "cites (task 248)",
    });
    assert.deepEqual(cites(shell, "task.303"), {
      rc: 1,
      out: "missing (task 303)",
    });
    assert.equal(
      cites(shell, "task.302").rc,
      1,
      "a citation under a released version is not cited",
    );
  });

  test(`[${shell}] prefix controls: (task 248) does not cite task.24's absence, nor (task 24) task.248's`, () => {
    // task.24 IS cited in the fixture, so drop it: the risky direction is a longer id satisfying a shorter stem.
    const only248 = CHANGELOG.replace("- **Short id (task 24).** Body.\n", "");
    assert.equal(
      cites(shell, "task.24", { changelog: only248 }).rc,
      1,
      "(task 248) must not satisfy task.24",
    );
    const only24 = CHANGELOG.replace("- **New work (task 248).** Body.\n", "");
    assert.equal(
      cites(shell, "task.248", { changelog: only24 }).rc,
      1,
      "(task 24) must not satisfy task.248",
    );
  });

  test(`[${shell}] 3 not applicable: enforcement off, no CHANGELOG.md, a story or bug stem`, () => {
    assert.deepEqual(cites(shell, "task.303", { config: null }), {
      rc: 3,
      out: "not-applicable: changelog checks not enabled",
    });
    assert.equal(
      cites(shell, "task.303", { config: "changelog:\n  enforce: false\n" }).rc,
      3,
    );
    assert.deepEqual(cites(shell, "task.303", { changelog: null }), {
      rc: 3,
      out: "not-applicable: no CHANGELOG.md",
    });
    for (const stem of ["story.1.2.3", "bug.4", "task.67.bug.3"])
      assert.equal(cites(shell, stem).rc, 3, stem);
    // A story in a repository with no CHANGELOG.md is told so, as 6d always said.
    assert.equal(
      cites(shell, "story.1.2.3", { changelog: null }).out,
      "not-applicable: no CHANGELOG.md",
    );
  });

  test(`[${shell}] 2 usage: no stem, two stems, a stem doc-id.js cannot read`, () => {
    for (const stem of [
      "",
      "task.248 task.249",
      "task.x",
      "task.248.qa-applies",
      "CHANGELOG.md",
    ])
      assert.equal(cites(shell, stem).rc, 2, `'${stem}'`);
  });

  // task.248 QA cycle 1, T248-QA-3: doc-id.js reads a basename, so a path parsed
  // as its last segment and a story path exited 3, which 6d passes silently.
  test(`[${shell}] 2 usage: a path is never a stem`, () => {
    for (const stem of [
      "../task.248",
      "docs/tasks/task.248",
      "x/story.1.2.3",
      "/task.248",
    ]) {
      const r = cites(shell, stem);
      assert.equal(r.rc, 2, `'${stem}': ${r.out}`);
      assert.match(r.out, /is a path, not a work-item id/);
    }
  });

  test(`[${shell}] 4 unknown: an opt-in that cannot be read is never read as off`, () => {
    const r = cites(shell, "task.303", {
      installed: INSTALL.filter((f) => f !== "read-config.sh"),
    });
    assert.deepEqual(r, { rc: 4, out: "unknown: unknown" });
  });
}

// ── 6d's messages, word for word ────────────────────────────────────────────

function sixDBlock() {
  const finalise = readFileSync(
    path.join(REPO_ROOT, "skills/finalise/SKILL.md"),
    "utf8",
  );
  const start = finalise.indexOf("6d. **CHANGELOG citation check");
  const end = finalise.indexOf("7. **Add Canonical PR Comment", start);
  const m = finalise.slice(start, end).match(/```bash\n([\s\S]*?)\n[ \t]*```/);
  assert.ok(m, "finalise 6d: no bash block");
  const lines = m[1].split("\n");
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length),
  );
  return lines.map((l) => l.slice(indent)).join("\n");
}

const NO_ENTRY =
  "HALT: no-changelog-entry — CHANGELOG.md [Unreleased] does not cite (task 303). Add the entry, commit and push it, then re-run /finalise: 6a skips the acceptance commit it already made and 6c re-reads CI on the new head";
const UNKNOWN =
  "HALT: changelog-unknown — changelog-enforce.sh answered 'unknown', not on or off; check .agents/skills/finalise/references/ holds changelog-enforce.sh and read-config.sh, then re-run /finalise";

for (const shell of SHELLS) {
  test(`[${shell}] 6d's HALT and not-applicable lines are unchanged by the move`, () => {
    const run = (stem, opts) =>
      inConsumer(shell, `STEM='${stem}'\n${sixDBlock()}`, opts);
    let r = run("task.303");
    assert.equal(r.status, 1);
    assert.equal(r.stdout.trim(), NO_ENTRY);
    r = run("task.303", {
      installed: INSTALL.filter((f) => f !== "read-config.sh"),
    });
    assert.equal(r.status, 1);
    assert.equal(r.stdout.trim(), UNKNOWN);
    r = run("task.303", { config: null });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "6d: changelog checks not enabled");
    r = run("task.303", { changelog: null });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "6d: no CHANGELOG.md — not applicable");
    r = run("task.248");
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });
}
