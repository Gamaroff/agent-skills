// merge-delete-branch-guard.test.mjs — no merge site switches branches on a dirty tree, and the
// remote branch is still deleted (task.147; obs #142, part 3).
//
// `gh pr merge --delete-branch` also switches the local checkout off the PR branch. On a tree
// dirty with another session's edits that switch aborts, and the remote delete is skipped with it
// (task.128: the remote branch had to be removed by hand). A recurrence chained the merge to the
// next commit and raced the index lock three times (2026-09-21, PRs #452–#458).
//
// The population is the task's own enumeration — every `gh pr merge … --delete-branch` in shipped
// sources — with a floor, so a new site is checked the day it appears and a vanished one is noticed.
// Each site's block is cut from its document and run against a `gh` stub that records its argv.

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  ROOT,
  SHELLS,
  readDoc,
  blockBy,
  bind,
  fixtureRepo,
  write,
  git,
  gitAsync,
  ghStub,
  ghCalls,
  runAsync,
  cleanup,
} from "./lib/executed-prose.mjs";

function population() {
  const r = spawnSync(
    "git",
    [
      "grep",
      "-n",
      "gh pr merge",
      "--",
      "shared/resources/*.md",
      "skills/*/SKILL.md",
      "skills/*/scripts/*",
      "scripts/*",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  return r.stdout
    .split("\n")
    .filter(
      (l) => l && !l.includes("/references/") && l.includes("--delete-branch"),
    )
    .map((l) => {
      const [file, , ...rest] = l.split(":");
      return { file, line: rest.join(":").trim() };
    });
}

const SITES = population();

test("the merge-site population is non-vacuous (floor 2)", () => {
  assert.ok(
    SITES.length >= 2,
    `expected ≥ 2 --delete-branch merge sites, found ${SITES.length}`,
  );
});

// The block's documented INPUTS, and nothing else: VCS (Step 0), PR_ID (Step 3) and mergeStrategy
// (skills-config). Nothing the block itself should provide is supplied here. QA cycle 1 found this
// PRELUDE defining HALT(), a prose pseudo-command in develop-next, which gave the test a working
// exit that the shipped block did not have. A failed merge then fell through to the remote delete,
// and the test could not see it (task.147 CR-1).
const PRELUDE = "VCS=github\nPR_ID=7\nmergeStrategy=squash\n";

function siteScript(site) {
  const code = blockBy(
    readDoc(site.file),
    site.line,
    `${site.file}: ${site.line}`,
  );
  return PRELUDE + bind(code, { "<PR#>": "7", "<mergeStrategy>": "squash" });
}

const GH_OK = 'case "$*" in *headRefName*) echo feature/x ;; esac\nexit 0';
const GH_NO_HEAD = "exit 0";
// The merge is refused (a conflict, or branch protection); every other gh call answers.
const GH_MERGE_FAILS =
  'case "$*" in *headRefName*) echo feature/x ;; *"pr merge"*) echo "merge refused" >&2; exit 1 ;; esac\nexit 0';

function mergeCalls(argvLog) {
  return ghCalls(argvLog).filter((c) => c.startsWith("pr merge"));
}

async function remoteHasAsync(fx, branch) {
  return (
    (
      await gitAsync(fx.work, "ls-remote", "--heads", "origin", branch)
    ).trim() !== ""
  );
}

function remoteHas(fx, branch) {
  return git(fx.work, "ls-remote", "--heads", "origin", branch).trim() !== "";
}

describe("executed against fixtures", { concurrency: true }, () => {
  for (const site of SITES) {
    for (const sh of SHELLS) {
      test(`[${sh}] ${site.file} — clean tree keeps --delete-branch`, async () => {
        const fx = fixtureRepo();
        try {
          await gitAsync(fx.work, "checkout", "-q", "develop");
          const gh = ghStub(fx.dir, GH_OK);
          const r = await runAsync(sh, siteScript(site), {
            cwd: fx.work,
            bin: gh.bin,
          });
          assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
          const calls = mergeCalls(gh.argvLog);
          assert.equal(
            calls.length,
            1,
            `merge calls: ${JSON.stringify(calls)}`,
          );
          assert.match(calls[0], /--delete-branch/);
        } finally {
          cleanup(fx.dir);
        }
      });

      test(`[${sh}] ${site.file} — dirty tree merges without --delete-branch and deletes the remote branch`, async () => {
        const fx = fixtureRepo();
        try {
          await gitAsync(fx.work, "checkout", "-q", "develop");
          write(fx.work, "package.json", '{"another":"session"}\n');
          const gh = ghStub(fx.dir, GH_OK);
          assert.ok(
            await remoteHasAsync(fx, "feature/x"),
            "fixture: origin must hold feature/x",
          );
          const r = await runAsync(sh, siteScript(site), {
            cwd: fx.work,
            bin: gh.bin,
          });
          assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
          const calls = mergeCalls(gh.argvLog);
          assert.equal(
            calls.length,
            1,
            `merge calls: ${JSON.stringify(calls)}`,
          );
          assert.doesNotMatch(calls[0], /--delete-branch/);
          assert.equal(
            await remoteHasAsync(fx, "feature/x"),
            false,
            "the remote branch survived the merge",
          );
          assert.equal(
            (
              await gitAsync(fx.work, "rev-parse", "--abbrev-ref", "HEAD")
            ).trim(),
            "develop",
          );
        } finally {
          cleanup(fx.dir);
        }
      });

      test(`[${sh}] ${site.file} — a refused merge on a dirty tree halts and deletes nothing`, async () => {
        const fx = fixtureRepo();
        try {
          await gitAsync(fx.work, "checkout", "-q", "develop");
          write(fx.work, "package.json", '{"another":"session"}\n');
          const gh = ghStub(fx.dir, GH_MERGE_FAILS);
          const r = await runAsync(sh, siteScript(site), {
            cwd: fx.work,
            bin: gh.bin,
          });
          assert.notEqual(r.status, 0, "a refused merge must not exit 0");
          assert.ok(
            await remoteHasAsync(fx, "feature/x"),
            "the head branch of an UNMERGED PR was deleted",
          );
        } finally {
          cleanup(fx.dir);
        }
      });

      test(`[${sh}] ${site.file} — a merged PR whose branch is already gone still exits 0`, async () => {
        const fx = fixtureRepo();
        try {
          await gitAsync(fx.work, "checkout", "-q", "develop");
          write(fx.work, "package.json", '{"another":"session"}\n');
          // GitHub's "automatically delete head branches" removed it at merge time.
          await gitAsync(
            fx.work,
            "push",
            "-q",
            "origin",
            "--delete",
            "feature/x",
          );
          const gh = ghStub(fx.dir, GH_OK);
          const r = await runAsync(sh, siteScript(site), {
            cwd: fx.work,
            bin: gh.bin,
          });
          assert.equal(
            r.status,
            0,
            `a merge that happened must not read as failed: ${r.stdout}${r.stderr}`,
          );
          assert.equal(mergeCalls(gh.argvLog).length, 1);
          assert.match(r.stdout + r.stderr, /not deleted/);
        } finally {
          cleanup(fx.dir);
        }
      });

      test(`[${sh}] ${site.file} — an unbindable head branch halts before any merge`, async () => {
        const fx = fixtureRepo();
        try {
          const gh = ghStub(fx.dir, GH_NO_HEAD);
          const r = await runAsync(sh, siteScript(site), {
            cwd: fx.work,
            bin: gh.bin,
          });
          assert.notEqual(r.status, 0);
          assert.deepEqual(mergeCalls(gh.argvLog), []);
          assert.ok(
            await remoteHasAsync(fx, "feature/x"),
            "a branch was deleted on an empty binding",
          );
        } finally {
          cleanup(fx.dir);
        }
      });
    }
  }
});

// ── develop-next Step 4: the post-merge re-sync is a step of its own ──────────

const RESYNC =
  "git checkout <baseBranch> && git pull --ff-only origin <baseBranch>";

test("develop-next Step 4 re-syncs in a block of its own, chained to no commit or merge", () => {
  const md = readDoc("skills/develop-next/SKILL.md");
  const step4 = md.slice(md.indexOf("## Step 4 — Record the acceptance"));
  const block = blockBy(step4, RESYNC, "the Step 4 re-sync");
  assert.doesNotMatch(block, /git commit/);
  assert.doesNotMatch(block, /gh pr merge/);
  // It is the first thing Step 4 does: nothing runnable precedes it in the section.
  assert.ok(
    step4.indexOf(RESYNC) <
      step4.indexOf("```bash", step4.indexOf(RESYNC) + RESYNC.length),
  );
  assert.ok(step4.indexOf(RESYNC) < step4.indexOf("### `item.source`"));
});

describe("executed against fixtures", { concurrency: true }, () => {
  for (const sh of SHELLS) {
    test(`[${sh}] the re-sync block runs: back on the base, fast-forwarded to origin`, async () => {
      const fx = fixtureRepo();
      try {
        // The platform merged: origin/develop moved on without this checkout.
        write(fx.work, "merged.txt", "merged\n");
        git(fx.work, "add", "-A");
        git(fx.work, "commit", "-q", "-m", "merged on the platform");
        git(fx.work, "push", "-q", "origin", "HEAD:develop");
        git(fx.work, "reset", "-q", "--hard", "HEAD~1");
        const md = readDoc("skills/develop-next/SKILL.md");
        const code = bind(blockBy(md, RESYNC), { "<baseBranch>": "develop" });
        const r = await runAsync(sh, code, { cwd: fx.work });
        assert.equal(r.status, 0, r.stderr);
        assert.equal(
          git(fx.work, "rev-parse", "--abbrev-ref", "HEAD").trim(),
          "develop",
        );
        assert.equal(
          git(fx.work, "rev-parse", "HEAD").trim(),
          git(fx.work, "rev-parse", "origin/develop").trim(),
        );
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] a re-sync whose checkout the dirty tree blocks halts, and the run stays put`, async () => {
      const fx = fixtureRepo();
      try {
        // develop moves README on; the feature checkout has an uncommitted README edit, so the
        // switch to develop would overwrite it and git refuses.
        git(fx.work, "checkout", "-q", "develop");
        write(fx.work, "README.md", "moved on\n");
        git(fx.work, "commit", "-q", "-am", "develop moves");
        git(fx.work, "push", "-q", "origin", "develop");
        git(fx.work, "checkout", "-q", "feature/x");
        write(fx.work, "README.md", "another session's edit\n");
        const md = readDoc("skills/develop-next/SKILL.md");
        const code = bind(blockBy(md, RESYNC), { "<baseBranch>": "develop" });
        const r = await runAsync(sh, code, { cwd: fx.work });
        assert.notEqual(r.status, 0, "a failed checkout must not exit 0");
        assert.match(r.stdout, /HALT: re-sync/);
        assert.equal(
          git(fx.work, "rev-parse", "--abbrev-ref", "HEAD").trim(),
          "feature/x",
        );
      } finally {
        cleanup(fx.dir);
      }
    });
  }
});
