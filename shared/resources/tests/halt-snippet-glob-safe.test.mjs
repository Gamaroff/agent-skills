// halt-snippet-glob-safe.test.mjs — the three HALT snippets remove the lock in bash AND zsh
// when the test-output glob matches nothing (task.124, Phase 2, obs #111).
//
// The defect: `rm -f .claude/state/develop-pipeline.lock .claude/state/test-output-*.log`
// in one argv. Under zsh — the default shell on every macOS host — an unmatched glob is a
// `nomatch` error that aborts the command BEFORE `rm` runs, so on every HALT that had no
// test logs to sweep the lock stayed in place. bash expands the unmatched glob to itself
// and `rm -f` ignores the missing file, so the one-argv form passed every bash test.
// `lint:shell` never sees a fence, which is why this test extracts the snippet with the
// repository's own fence reader (`qa-execute-snippets.mjs`'s `extractBlocks`) and runs it.
//
// Each block below is the smallest claim whose reverse turns it red:
//   A — every orchestrator's HALT snippet, run under zsh in a directory with a lock and NO
//       test logs, leaves no lock behind (and none under bash either);
//   B — the same snippet with a test log present removes both (the sweep still sweeps);
//   C — the one-argv form, reconstructed, FAILS under zsh — so this test would have been
//       red before the fix (mutation proof carried in the suite, not in a session log);
//   D — no canonical source spells the glob inside an `rm` argv any more.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const SKILLS = ["develop-task", "develop-story", "develop-bug"].map((s) =>
  path.join(ROOT, "skills", s, "SKILL.md"),
);
const STEP8 = path.join(
  ROOT,
  "shared",
  "resources",
  "develop-pipeline-step-8-commit.md",
);
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];

function haltSnippet(file) {
  const md = fs.readFileSync(file, "utf8");
  const blocks = extractBlocks(md).filter(
    (b) =>
      /develop-pipeline\.last-halt\.json/.test(b.code) &&
      /rm -f \.claude\/state\/develop-pipeline\.lock/.test(b.code),
  );
  assert.equal(
    blocks.length,
    1,
    `${path.relative(ROOT, file)}: expected exactly one HALT snippet, found ${blocks.length}`,
  );
  return blocks[0].code;
}

function runIn(shell, code, { withLog }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "halt-snippet-"));
  fs.mkdirSync(path.join(dir, ".claude", "state"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude", "state", "develop-pipeline.lock"),
    '{"current_step":5,"skill":"develop-task"}\n',
  );
  if (withLog)
    fs.writeFileSync(
      path.join(dir, ".claude", "state", "test-output-1-1.log"),
      "x\n",
    );
  // The snippet's `{placeholders}` are prose; bind them so jq gets strings.
  const script = code
    .replace(/\{halt_reason\}/g, "test")
    .replace(/\{halt_step\}/g, "5");
  const r = spawnSync(shell, ["-c", script], { cwd: dir, encoding: "utf8" });
  const state = path.join(dir, ".claude", "state");
  const out = {
    status: r.status,
    stderr: r.stderr,
    lock: fs.existsSync(path.join(state, "develop-pipeline.lock")),
    snapshot: fs.existsSync(
      path.join(state, "develop-pipeline.last-halt.json"),
    ),
    log: fs.existsSync(path.join(state, "test-output-1-1.log")),
  };
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

for (const file of SKILLS) {
  const rel = path.relative(ROOT, file);
  test(`A — ${rel}: HALT snippet removes the lock with an EMPTY glob under ${SHELLS.join(" and ")}`, () => {
    const code = haltSnippet(file);
    for (const sh of SHELLS) {
      const r = runIn(sh, code, { withLog: false });
      assert.equal(
        r.lock,
        false,
        `[${sh}] lock still present — stderr: ${r.stderr}`,
      );
      assert.equal(r.snapshot, true, `[${sh}] halt snapshot not written`);
    }
  });
  test(`B — ${rel}: HALT snippet still sweeps a test log that IS present`, () => {
    const code = haltSnippet(file);
    for (const sh of SHELLS) {
      const r = runIn(sh, code, { withLog: true });
      assert.equal(r.lock, false, `[${sh}] lock still present`);
      assert.equal(r.log, false, `[${sh}] test log not swept`);
    }
  });
}

test(
  "C — the pre-fix one-argv form fails under zsh (the test would have been red before task.124)",
  { skip: !hasZsh && "zsh not on this host" },
  () => {
    const code = haltSnippet(SKILLS[0]).replace(
      /rm -f \.claude\/state\/develop-pipeline\.lock\n\s*find [^\n]+$/,
      "rm -f .claude/state/develop-pipeline.lock .claude/state/test-output-*.log\n",
    );
    assert.match(
      code,
      /rm -f \.claude\/state\/develop-pipeline\.lock \.claude\/state\/test-output-\*\.log/,
      "reconstruction of the one-argv form failed",
    );
    const r = runIn("zsh", code, { withLog: false });
    assert.equal(
      r.lock,
      true,
      "under zsh the one-argv form must leave the lock behind — otherwise this suite proves nothing about the fix",
    );
    assert.match(r.stderr, /no matches found/);
    // …and bash never saw the problem, which is why it went unnoticed.
    assert.equal(runIn("bash", code, { withLog: false }).lock, false);
  },
);

test("D — no canonical source puts the test-output glob in an `rm` argv", () => {
  for (const file of [...SKILLS, STEP8]) {
    const md = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      md,
      /rm -f[^\n]*test-output-\*\.log/,
      `${path.relative(ROOT, file)} still spells the glob inside an rm argv`,
    );
    assert.doesNotMatch(
      md,
      /ls \.claude\/state\/test-output-\*\.log/,
      `${path.relative(ROOT, file)} still globs the logs through ls`,
    );
  }
  // …and each uses the find form.
  for (const file of [...SKILLS, STEP8]) {
    assert.match(
      fs.readFileSync(file, "utf8"),
      /find \.claude\/state -maxdepth 1 -name 'test-output-\*\.log'/,
      `${path.relative(ROOT, file)} must sweep with find`,
    );
  }
});
