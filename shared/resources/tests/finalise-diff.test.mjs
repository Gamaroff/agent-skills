/**
 * finalise-diff.sh — the one reader of a PR's whole change (task 321).
 *
 * /finalise Step 3a used to hand its acceptance agents `gh pr diff`, else `git diff HEAD~1 HEAD`,
 * else an empty file, with stderr discarded and nothing recorded. On PR #937 the forge refused the
 * diff and the fallback gave 1 file of 250; on Bitbucket every run was graded on its last commit.
 * Each case below is one row of the task's § 8 table, driven against a temporary repository with a
 * bare origin and a stub `gh` (and, for Bitbucket, a stub `curl`). No case reaches the network.
 *
 * Mutation proofs (task 321 § 9), each recorded in the QA report:
 *   - drop the source lookup (exclude nothing)       → "a bundled copy is excluded …" goes red
 *   - drop the `[ ! -s "$OUT" ]` empty-result rule    → "every changed file is a bundled copy …" goes red
 *   - drop the forge arm's empty check               → "the branch adds nothing and the forge diff is empty" goes red
 *
 * Run via: node --test shared/resources/tests/finalise-diff.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  SHELLS,
  readDoc,
  blockBy,
  git,
  fixtureRepo,
  ghStub,
  ghCalls,
  run,
  cleanup,
} from "./lib/executed-prose.mjs";

const SCRIPT = path.join(ROOT, "shared", "resources", "finalise-diff.sh");

function commit(work, files, msg) {
  for (const [rel, text] of Object.entries(files)) {
    const p = path.join(work, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  }
  git(work, "add", "-A");
  git(work, "commit", "-q", "-m", msg);
  return git(work, "rev-parse", "HEAD").trim();
}

// A config file that pins the forge, so the host's own skills-config.yaml or environment never
// decides which arm runs.
function pinVcs(dir, vcs) {
  const f = path.join(dir, `vcs-${vcs}.yaml`);
  fs.writeFileSync(f, `vcs: ${vcs}\n`);
  return f;
}

// A `gh` that answers `pr view` with this PR, and `pr diff` with `diff` (a string), or fails.
function githubStub(
  dir,
  { number = 7, head, base = "develop", branch = "feature/x", diff = null },
) {
  const diffFile = path.join(dir, "forge.diff");
  if (diff !== null) fs.writeFileSync(diffFile, diff);
  return ghStub(
    dir,
    [
      'case "$1 $2" in',
      `  "pr view") echo "${number} ${head} ${base} ${branch}" ;;`,
      diff === null
        ? '  "pr diff") echo "HTTP 406: PullRequest.diff too_large" >&2; exit 1 ;;'
        : `  "pr diff") cat "${diffFile}" ;;`,
      '  *) echo "unexpected gh call: $*" >&2; exit 9 ;;',
      "esac",
    ].join("\n"),
  );
}

function names(out) {
  const f = `${out}.names`;
  if (!fs.existsSync(f)) return null;
  return fs
    .readFileSync(f, "utf8")
    .split("\0")
    .filter((s) => s !== "");
}

function diffFiles(out) {
  return [
    ...fs.readFileSync(out, "utf8").matchAll(/^diff --git a\/(.*) b\/\1$/gm),
  ].map((m) => m[1]);
}

function reader(shell, work, { pr = 7, bin, env = {}, out }) {
  const args = pr === null ? "" : `--pr ${pr}`;
  return run(shell, `bash "${SCRIPT}" --out "${out}" ${args}`, {
    cwd: work,
    bin,
    env: { GIT_CONFIG_GLOBAL: "/dev/null", ...env },
  });
}

function withRepo(fn) {
  const fx = fixtureRepo();
  try {
    return fn(fx);
  } finally {
    cleanup(fx.dir);
  }
}

for (const shell of SHELLS) {
  test(`[${shell}] the PR head is HEAD: all three commits, source=merge-base, and the forge is not asked`, () => {
    withRepo(({ dir, work }) => {
      commit(work, { "a.txt": "a\n" }, "one");
      commit(work, { "b.txt": "b\n" }, "two");
      const head = commit(work, { "c.txt": "c\n" }, "three");
      // `pr diff` fails: today's fallback would have read one commit and exited 0.
      const { bin, argvLog } = githubStub(dir, { head });
      const out = path.join(work, ".claude/state/pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /^source=merge-base base=[0-9a-f]{12} head=[0-9a-f]{12} files=3 excluded=0$/m,
      );
      assert.deepEqual(diffFiles(out).sort(), ["a.txt", "b.txt", "c.txt"]);
      assert.deepEqual(names(out).sort(), ["a.txt", "b.txt", "c.txt"]);
      assert.equal(
        ghCalls(argvLog).some((c) => c.startsWith("pr diff")),
        false,
        "the forge's diff is not asked for when git has the change",
      );
    });
  });

  test(`[${shell}] a Bitbucket remote reads the change from git: source=merge-base`, () => {
    withRepo(({ dir, work, origin }) => {
      commit(work, { "a.txt": "a\n" }, "one");
      const head = commit(work, { "b.txt": "b\n" }, "two");
      // pr-read.sh derives the workspace from the configured URL; the fetch goes to the bare origin.
      git(
        work,
        "remote",
        "set-url",
        "origin",
        "git@bitbucket.org:acme/wallet.git",
      );
      git(
        work,
        "config",
        `url.${origin}.insteadOf`,
        "git@bitbucket.org:acme/wallet.git",
      );
      const body = path.join(dir, "bb.json");
      fs.writeFileSync(
        body,
        JSON.stringify({
          id: 7,
          source: {
            commit: { hash: head.slice(0, 12) },
            branch: { name: "feature/x" },
          },
          destination: { branch: { name: "develop" } },
        }),
      );
      const bin = path.join(dir, "bbbin");
      fs.mkdirSync(bin);
      fs.writeFileSync(
        path.join(bin, "curl"),
        `#!/bin/sh\nout=""\nwhile [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift 2 ;; *) shift ;; esac; done\n[ -n "$out" ] && cat "${body}" > "$out"\nprintf 200\n`,
        { mode: 0o755 },
      );
      // No gh at all: a Bitbucket run must not need it.
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: {
          SKILLS_CONFIG_FILE: pinVcs(dir, "bitbucket"),
          BITBUCKET_ACCESS_TOKEN: "t",
        },
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /^source=merge-base .* files=2 excluded=0$/m);
      assert.deepEqual(names(out).sort(), ["a.txt", "b.txt"]);
    });
  });

  test(`[${shell}] the PR is merged and the checkout is the base: source=forge, names from the patch`, () => {
    withRepo(({ dir, work }) => {
      const head = commit(
        work,
        { "a.txt": "a\n", "dir with space/b.txt": "b\n" },
        "one",
      );
      git(work, "checkout", "-q", "develop");
      git(work, "merge", "-q", "--no-ff", "-m", "merge", "feature/x");
      git(work, "push", "-q", "origin", "develop");
      const forge = git(work, "diff", "HEAD~1", "HEAD");
      const { bin } = githubStub(dir, { head, diff: forge });
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /^source=forge pr=7 files=2$/m);
      assert.deepEqual(names(out).sort(), ["a.txt", "dir with space/b.txt"]);
      assert.equal(fs.readFileSync(out, "utf8"), forge);
    });
  });

  test(`[${shell}] the PR is merged, the checkout is the base, and gh fails: unresolved, exit 1, empty file`, () => {
    withRepo(({ dir, work }) => {
      const head = commit(work, { "a.txt": "a\n" }, "one");
      git(work, "checkout", "-q", "develop");
      git(work, "merge", "-q", "--no-ff", "-m", "merge", "feature/x");
      git(work, "push", "-q", "origin", "develop");
      const { bin } = githubStub(dir, { head });
      const out = path.join(work, "pr.diff");
      fs.writeFileSync(out, "a stale patch of an earlier run\n");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /^unresolved: no change between origin\/develop .* gh pr diff 7 failed: HTTP 406/m,
      );
      assert.equal(
        fs.readFileSync(out, "utf8"),
        "",
        "the stale patch is truncated",
      );
      assert.deepEqual(names(out), []);
    });
  });

  test(`[${shell}] no PR: unresolved, exit 1`, () => {
    withRepo(({ work }) => {
      commit(work, { "a.txt": "a\n" }, "one");
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, { pr: null, out });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /^unresolved: no PR number/m);
      assert.equal(fs.readFileSync(out, "utf8"), "");
    });
  });

  test(`[${shell}] the branch adds nothing and the forge diff is empty: unresolved, exit 1`, () => {
    withRepo(({ dir, work }) => {
      const head = git(work, "rev-parse", "HEAD").trim();
      const { bin } = githubStub(dir, { head, diff: "" });
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /^unresolved: no change between .* returned an empty diff$/m,
      );
    });
  });

  test(`[${shell}] the PR is open and the checkout is another branch: the PR's head is diffed, not HEAD`, () => {
    withRepo(({ dir, work }) => {
      const head = commit(work, { "pr-file.txt": "pr\n" }, "the PR");
      git(work, "checkout", "-q", "-b", "elsewhere", "develop");
      commit(work, { "other.txt": "other\n" }, "another branch");
      const { bin } = githubStub(dir, { head });
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, new RegExp(`head=${head.slice(0, 12)} files=1 `));
      assert.deepEqual(names(out), ["pr-file.txt"]);
    });
  });

  test(`[${shell}] a bundled copy is excluded from the patch and kept in the names; a hand-written references/ file is kept in both`, () => {
    withRepo(({ dir, work }) => {
      git(work, "checkout", "-q", "develop");
      commit(
        work,
        {
          "shared/resources/tool.md": "v1\n",
          "skills/s/references/tool.md": "v1\n",
        },
        "base copies",
      );
      git(work, "push", "-q", "origin", "develop");
      git(work, "checkout", "-q", "-B", "feature/x");
      const head = commit(
        work,
        {
          "shared/resources/tool.md": "v2\n",
          "skills/s/references/tool.md": "v2\n",
          "skills/s/references/hand-written.md": "mine\n",
        },
        "change",
      );
      const { bin } = githubStub(dir, { head });
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /files=2 excluded=1$/m);
      assert.deepEqual(diffFiles(out).sort(), [
        "shared/resources/tool.md",
        "skills/s/references/hand-written.md",
      ]);
      assert.deepEqual(names(out).sort(), [
        "shared/resources/tool.md",
        "skills/s/references/hand-written.md",
        "skills/s/references/tool.md",
      ]);
    });
  });

  test(`[${shell}] every changed file is a bundled copy: unresolved, and the names list is kept`, () => {
    withRepo(({ dir, work }) => {
      git(work, "checkout", "-q", "develop");
      commit(
        work,
        {
          "shared/resources/tool.md": "v1\n",
          "skills/s/references/tool.md": "v0\n",
        },
        "base",
      );
      git(work, "push", "-q", "origin", "develop");
      git(work, "checkout", "-q", "-B", "feature/x");
      const head = commit(
        work,
        { "skills/s/references/tool.md": "v1\n" },
        "re-bundle",
      );
      const { bin } = githubStub(dir, { head });
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /^unresolved: every changed file is a bundled copy/m,
      );
      assert.equal(fs.readFileSync(out, "utf8"), "");
      assert.deepEqual(names(out), ["skills/s/references/tool.md"]);
    });
  });

  test(`[${shell}] a repository with no shared/resources/ keeps every file in the patch`, () => {
    withRepo(({ dir, work }) => {
      const head = commit(
        work,
        { "skills/s/references/tool.md": "x\n", "lib/a.js": "a\n" },
        "change",
      );
      const { bin } = githubStub(dir, { head });
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /files=2 excluded=0$/m);
      assert.deepEqual(diffFiles(out).sort(), [
        "lib/a.js",
        "skills/s/references/tool.md",
      ]);
    });
  });

  test(`[${shell}] a path with a space, a quote or a newline is in the names list exactly, NUL-delimited`, () => {
    withRepo(({ dir, work }) => {
      const odd = ["with space.txt", `with "quote".txt`, "with\nnewline.txt"];
      const head = commit(
        work,
        Object.fromEntries(odd.map((f) => [f, "x\n"])),
        "odd names",
      );
      const { bin } = githubStub(dir, { head });
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.deepEqual(names(out).sort(), [...odd].sort());
    });
  });

  test(`[${shell}] a base branch absent on the remote: unresolved, with the fetch's reason`, () => {
    withRepo(({ dir, work }) => {
      const head = commit(work, { "a.txt": "a\n" }, "one");
      const { bin } = githubStub(dir, { head, base: "no-such-base" });
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /^unresolved: git fetch origin no-such-base failed: .*no-such-base/m,
      );
      assert.equal(fs.readFileSync(out, "utf8"), "");
    });
  });

  test(`[${shell}] a usage error exits 2, and a failed PR read is unresolved`, () => {
    withRepo(({ dir, work }) => {
      const noOut = run(shell, `bash "${SCRIPT}" --pr 7`, { cwd: work });
      assert.equal(noOut.status, 2, noOut.stdout + noOut.stderr);
      assert.match(noOut.stderr, /--out is required/);
      const badPr = run(shell, `bash "${SCRIPT}" --out x --pr seven`, {
        cwd: work,
      });
      assert.equal(badPr.status, 2, badPr.stdout + badPr.stderr);
      const { bin } = ghStub(dir, "exit 1");
      const out = path.join(work, "pr.diff");
      const r = reader(shell, work, {
        bin,
        out,
        env: { SKILLS_CONFIG_FILE: pinVcs(dir, "github") },
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /^unresolved: could not read PR #7: gh pr view 7 returned no PR$/m,
      );
    });
  });
}

// ── The shipped Step 3a lines, executed ──────────────────────────────────────────────────────
//
// The diff lines are cut from finalise's own Step 3a block — from `DIFF_FILE=` to the `**PR diff:**`
// printf — and run in a consumer-shaped repository whose `.agents/skills/finalise/references` is this
// tree's shared/resources/. Each of the three answers must reach the running summary's line, and a
// wrong call (exit 2) must halt rather than be recorded.
function step3aDiffLines() {
  const block = blockBy(
    readDoc("skills/finalise/SKILL.md"),
    "references/finalise-diff.sh",
  );
  const lines = block.split("\n");
  const from = lines.findIndex((l) => l.startsWith("DIFF_FILE="));
  const to = lines.findIndex((l) => l.startsWith("printf '**PR diff:**"));
  assert.ok(
    from >= 0 && to > from,
    "Step 3a's diff lines were not found in order",
  );
  return lines.slice(from, to + 1).join("\n");
}

function consumer(work) {
  const refs = path.join(work, ".agents", "skills", "finalise");
  fs.mkdirSync(refs, { recursive: true });
  fs.symlinkSync(
    path.join(ROOT, "shared", "resources"),
    path.join(refs, "references"),
  );
}

for (const shell of SHELLS) {
  test(`[${shell}] Step 3a records a **PR diff:** line for merge-base, forge and unresolved`, () => {
    const code = step3aDiffLines();
    assert.doesNotMatch(
      code,
      /finalise-rerun-scope\.js scope/,
      "the rerun-scope fence must stay unique",
    );
    withRepo(({ dir, work }) => {
      const cfg = pinVcs(dir, "github");
      const env = { GIT_CONFIG_GLOBAL: "/dev/null", SKILLS_CONFIG_FILE: cfg };
      const head = commit(work, { "a.txt": "a\n" }, "one");
      consumer(work); // after the commit: an installed skill tree is not part of the change

      const { bin } = githubStub(dir, {
        head,
        diff: "diff --git a/a.txt b/a.txt\n",
      });
      const mb = run(shell, `PR_NUMBER=7\n${code}`, { cwd: work, bin, env });
      assert.equal(mb.status, 0, mb.stdout + mb.stderr);
      assert.match(
        mb.stdout,
        /^\*\*PR diff:\*\* source=merge-base .* files=1 excluded=0$/m,
      );

      const none = run(shell, `PR_NUMBER=\n${code}`, { cwd: work, bin, env });
      assert.equal(
        none.status,
        0,
        "unresolved is recorded, not a HALT: " + none.stderr,
      );
      assert.match(none.stdout, /^\*\*PR diff:\*\* unresolved: no PR number/m);

      // Merged: the checkout is the base, so only the forge has the change.
      git(work, "checkout", "-q", "develop");
      git(work, "merge", "-q", "--no-ff", "-m", "merge", "feature/x");
      git(work, "push", "-q", "origin", "develop");
      const forge = run(shell, `PR_NUMBER=7\n${code}`, { cwd: work, bin, env });
      assert.equal(forge.status, 0, forge.stdout + forge.stderr);
      assert.match(
        forge.stdout,
        /^\*\*PR diff:\*\* source=forge pr=7 files=1$/m,
      );

      const wrong = run(shell, `PR_NUMBER=seven\n${code}`, {
        cwd: work,
        bin,
        env,
      });
      assert.equal(wrong.status, 1, wrong.stdout + wrong.stderr);
      assert.match(
        wrong.stdout,
        /^HALT: finalise-diff\.sh was called wrongly/m,
      );
      assert.doesNotMatch(wrong.stdout, /\*\*PR diff:\*\*/);
    });
  });
}
