// probe-base-binding.test.mjs — the resume contract's working-tree probe binds its base from
// RECORDED STATE on every report variant, and HALTs when it cannot (task.130 Phase 1;
// PR #436 review CR-1; gate-6 future 1).
//
// The defect this closes: the probe's fallback chain read the task/story report's
// `| Feature branch base | … |` row and then defaulted to `develop`. The bug-variant report
// (implementation-report-template.md § Bug variant) carries no such row — its base lives on one
// line, `**Branch model:** hotfix (base: main, PR target: main)` — so every develop-bug hotfix
// resumed before Step 4 was probed against origin/develop, and the (a) discard keyed on that
// comparison. A replay fixture is a recording and cannot go red when the sed arm is reverted
// (review 1, Q2), so this test EXECUTES the block: it is cut from the contract with the
// repository's own fence reader, `{implementation-report-path}` is bound to a fixture, `gh` is a
// stub on PATH, and the block runs under bash and zsh.
//
// Each block below is the smallest claim whose reverse turns it red:
//   A — a task-variant report's table row binds `develop`      (revert nothing: baseline)
//   B — a bug-variant report's Branch-model line binds `main`  (delete the second sed arm → red)
//   C — neither shape → exit 1, HALT text naming both shapes, nothing discarded
//                                                                (restore `BASE_BRANCH=develop` → red)
//   D — the stderr label differs by cause: a failing `gh` says "gh pr view failed: <line>",
//       a branch with no PR (gh's own "no pull requests found", or an empty exit-0) says
//       "no PR on this branch"
//   E — no transcript, in any case, contains `git checkout` — the base is bound before any
//       entry is classified, and a HALT classifies nothing

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
const CONTRACT = path.join(
  ROOT,
  "shared",
  "resources",
  "develop-pipeline-resume-contract.md",
);
const FIXTURES = path.join(HERE, "fixtures", "probe-base");
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];

// ── Extraction ────────────────────────────────────────────────────────────────
//
// The probe block is the ONE bash fence carrying the `The base is RECORDED STATE` anchor. The
// binding sub-block is cut from `GH_ERR=$(mktemp)` up to and including the
// `BASE_REF="origin/$BASE_BRANCH"` line — the same extraction qa-execute-snippets performs for
// the whole fence, narrowed to the lines under proof so the classification loop that follows
// (which needs a real git tree) is not run here.

function bindingBlock() {
  const md = fs.readFileSync(CONTRACT, "utf8");
  const blocks = extractBlocks(md).filter((b) =>
    /The base is RECORDED STATE/.test(b.code),
  );
  assert.equal(
    blocks.length,
    1,
    `expected exactly one probe block carrying the anchor, found ${blocks.length}`,
  );
  const lines = blocks[0].code.split("\n");
  const start = lines.findIndex((l) => /GH_ERR=\$\(mktemp\)/.test(l));
  const end = lines.findIndex((l) =>
    /BASE_REF="origin\/\$BASE_BRANCH"/.test(l),
  );
  assert.ok(start >= 0, "binding block start (`GH_ERR=$(mktemp)`) not found");
  assert.ok(
    end > start,
    "binding block end (`BASE_REF=`) not found after start",
  );
  // Strip the block's leading indentation (it sits inside `if [ -n "$DIRTY" ]; then`).
  return lines
    .slice(start, end + 1)
    .map((l) => l.replace(/^ {2}/, ""))
    .join("\n");
}

// ── Stub gh ───────────────────────────────────────────────────────────────────

const GH_STUBS = {
  // gh's own wording for a branch with no PR: exit 1, this line on stderr.
  noPr: '#!/bin/sh\necho "no pull requests found for branch \\"feature/x\\"" >&2\nexit 1\n',
  // A genuinely failing gh: exit 1 with an unrelated error.
  failing: '#!/bin/sh\necho "gh: HTTP 401: Bad credentials" >&2\nexit 1\n',
  // An exit-0 gh that prints nothing (a PR with an empty base is not a thing; this is the
  // degenerate "no output" arm the label must still read as no PR).
  empty: "#!/bin/sh\nexit 0\n",
};

function runProbe(shell, fixture, stubKind) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "probe-base-"));
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "gh"), GH_STUBS[stubKind], { mode: 0o755 });
  const report = path.join(dir, "report.md");
  fs.copyFileSync(path.join(FIXTURES, fixture), report);
  // `{implementation-report-path}` is prose in the contract; bind it. Echo the binding so the
  // test reads what the block bound rather than inferring it.
  const script =
    bindingBlock().replace(/\{implementation-report-path\}/g, report) +
    '\necho "BOUND=$BASE_BRANCH REF=$BASE_REF"\n';
  // No rc files: zsh reads ~/.zshenv even under `-c`, and a PATH it re-prepends puts the real
  // `gh` ahead of the stub — the test then measures the host, not the block.
  const argv =
    shell === "zsh"
      ? ["-f", "-c", script]
      : ["--noprofile", "--norc", "-c", script];
  const r = spawnSync(shell, argv, {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// ── A / B — the two report shapes bind ────────────────────────────────────────

for (const sh of SHELLS) {
  test(`A [${sh}] — task-variant table row binds develop`, () => {
    const r = runProbe(sh, "table-row.md", "noPr");
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /BOUND=develop REF=origin\/develop/);
  });

  test(`B [${sh}] — bug-variant Branch-model line binds main`, () => {
    const r = runProbe(sh, "branch-model-line.md", "noPr");
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /BOUND=main REF=origin\/main/);
  });

  // ── C — neither shape is a HALT, not a guess ─────────────────────────────────

  test(`C [${sh}] — neither shape → exit 1, HALT names both shapes, nothing bound`, () => {
    const r = runProbe(sh, "neither.md", "noPr");
    assert.equal(r.status, 1, `expected exit 1; stdout: ${r.stdout}`);
    assert.match(r.stdout, /HALT: cannot bind the probe base/);
    assert.match(r.stdout, /\| Feature branch base \|/);
    assert.match(r.stdout, /\*\*Branch model:\*\*/);
    assert.match(r.stdout, /Nothing was discarded/);
    assert.doesNotMatch(r.stdout, /BOUND=/, "the block ran past the HALT");
  });

  // ── D — the stderr label is by cause ────────────────────────────────────────

  test(`D [${sh}] — stderr label: no PR (gh's own line) vs failing gh vs empty gh`, () => {
    const noPr = runProbe(sh, "neither.md", "noPr");
    assert.match(noPr.stderr, /probe: no PR on this branch/);
    assert.doesNotMatch(noPr.stderr, /gh pr view failed/);

    const failing = runProbe(sh, "neither.md", "failing");
    assert.match(
      failing.stderr,
      /probe: gh pr view failed: gh: HTTP 401: Bad credentials/,
    );
    assert.doesNotMatch(failing.stderr, /no PR on this branch/);

    const empty = runProbe(sh, "neither.md", "empty");
    assert.match(empty.stderr, /probe: no PR on this branch/);
  });

  // ── E — no checkout in any transcript ───────────────────────────────────────

  test(`E [${sh}] — no case runs git checkout`, () => {
    for (const [fixture, stub] of [
      ["table-row.md", "noPr"],
      ["branch-model-line.md", "noPr"],
      ["neither.md", "noPr"],
      ["neither.md", "failing"],
    ]) {
      const r = runProbe(sh, fixture, stub);
      assert.doesNotMatch(r.stdout + r.stderr, /git checkout/);
    }
  });
}

// ── F — the contract no longer carries the `develop` default ─────────────────

test("F — the probe block has no `BASE_BRANCH=develop` fallback and no 'classifying against origin/develop' line", () => {
  const code = bindingBlock();
  assert.doesNotMatch(code, /BASE_BRANCH=develop\b/);
  assert.doesNotMatch(code, /classifying against origin\/develop/);
  // The bug-variant arm is present (the mutation B guards behaviour; this guards the text).
  assert.match(code, /\\\*\\\*Branch model:\\\*\\\*/);
});
