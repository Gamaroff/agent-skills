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
import fs from "node:fs";
import path from "node:path";
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

// The gh stub's answers, set per case: the head branch, the PR's state as `gh pr view --json state`
// reports it after the merge, and `gh pr merge`'s exit code. The two are independent on purpose —
// the merge verdict is the state, never the exit code (task.188, obs #197).
function ghBody({ head = "feature/x", state = "MERGED", mergeExit = 0 } = {}) {
  return [
    'case "$*" in',
    head ? `  *headRefName*) echo ${head} ;;` : "",
    `  *"--json state"*) echo ${state} ;;`,
    `  *"pr merge"*) [ ${mergeExit} -eq 0 ] || { echo "merge failed" >&2; exit ${mergeExit}; } ;;`,
    "esac",
    "exit 0",
  ].join("\n");
}
const GH_OK = ghBody();
const GH_NO_HEAD = ghBody({ head: "" });
// The merge is refused (a conflict, or branch protection): the command fails and the PR stays open.
const GH_MERGE_FAILS = ghBody({ state: "OPEN", mergeExit: 1 });

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

      // The merge verdict (task.188, obs #197). `gh pr merge` exits non-zero when a local follow-up
      // fails after the server merged; it can also exit 0 on a PR that did not merge. The PR's state
      // decides both. The last two rows are the control: a block that only rewords the exit check
      // passes the first rows and fails these.
      for (const c of [
        { tree: "clean", mergeExit: 1, state: "MERGED", ok: true },
        { tree: "dirty", mergeExit: 1, state: "MERGED", ok: true },
        { tree: "clean", mergeExit: 1, state: "OPEN", ok: false },
        { tree: "dirty", mergeExit: 1, state: "OPEN", ok: false },
        { tree: "clean", mergeExit: 0, state: "OPEN", ok: false },
        { tree: "dirty", mergeExit: 0, state: "OPEN", ok: false },
      ]) {
        test(`[${sh}] ${site.file} — ${c.tree} tree, merge exits ${c.mergeExit}, PR ${c.state} → ${c.ok ? "exits 0, remote branch deleted" : "halts, deletes nothing"}`, async () => {
          const fx = fixtureRepo();
          try {
            await gitAsync(fx.work, "checkout", "-q", "develop");
            if (c.tree === "dirty")
              write(fx.work, "package.json", '{"another":"session"}\n');
            const gh = ghStub(
              fx.dir,
              ghBody({ state: c.state, mergeExit: c.mergeExit }),
            );
            const r = await runAsync(sh, siteScript(site), {
              cwd: fx.work,
              bin: gh.bin,
            });
            const out = `stdout: ${r.stdout}\nstderr: ${r.stderr}`;
            assert.equal(mergeCalls(gh.argvLog).length, 1, out);
            if (c.ok) {
              assert.equal(
                r.status,
                0,
                `a merge that landed read as failed — ${out}`,
              );
              assert.equal(
                await remoteHasAsync(fx, "feature/x"),
                false,
                `the remote branch of a merged PR survived — ${out}`,
              );
            } else {
              assert.notEqual(
                r.status,
                0,
                `a PR that is ${c.state} read as merged — ${out}`,
              );
              assert.ok(
                await remoteHasAsync(fx, "feature/x"),
                `the head branch of an UNMERGED PR was deleted — ${out}`,
              );
            }
          } finally {
            cleanup(fx.dir);
          }
        });
      }

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

// ── Step 0.1 reconciliation: flags advance from evidence before any routing (task.188) ─────

const DN_MERGE_RECONCILE = "# Step 0.1 reconciliation, merge flag.";
const DN_ROW_RECONCILE = "# Step 0.1 reconciliation, tick flag";
const DB_MERGE_RECONCILE = "# Step 0.1 reconciliation (develop-batch)";
const SELECTOR = `${ROOT}/skills/develop-next/scripts/select-next.mjs`;
// The merge-flag block resolves its own platform (task.188 QA cycle 2, CR2-1); point its sourced paths
// at this checkout, since the fixture repository has no .agents/skills.
const DN_REFS = {
  ".agents/skills/develop-next/references/resolve-platform.sh": `${ROOT}/skills/develop-next/references/resolve-platform.sh`,
  ".agents/skills/develop-next/references/bitbucket-auth.sh": `${ROOT}/skills/develop-next/references/bitbucket-auth.sh`,
};

function readState(work, name) {
  return JSON.parse(
    fs.readFileSync(path.join(work, ".claude/state", name), "utf8"),
  );
}

function writeState(work, name, obj) {
  write(work, `.claude/state/${name}`, `${JSON.stringify(obj, null, 2)}\n`);
}

describe(
  "develop-next Step 0.1 reconciliation, executed",
  { concurrency: true },
  () => {
    for (const sh of SHELLS) {
      for (const c of [
        { prNumber: 7, mergedPr: "", state: "MERGED", merged: true, calls: 1 },
        { prNumber: 7, mergedPr: "", state: "OPEN", merged: false, calls: 1 },
        { prNumber: 7, mergedPr: "", state: "CLOSED", merged: false, calls: 1 },
        {
          prNumber: null,
          mergedPr: "7",
          state: "MERGED",
          merged: true,
          calls: 1,
        },
        {
          prNumber: null,
          mergedPr: "",
          state: "MERGED",
          merged: false,
          calls: 0,
        },
      ]) {
        test(`[${sh}] merge flag: prNumber ${c.prNumber}, merged-PR query '${c.mergedPr}', PR ${c.state} → merged: ${c.merged}`, async () => {
          const fx = fixtureRepo();
          try {
            writeState(fx.work, "develop-next.state.json", {
              item: "T9",
              source: "roadmap",
              dispatched: true,
              prNumber: c.prNumber,
              merged: false,
              ticked: false,
            });
            const gh = ghStub(fx.dir, ghBody({ state: c.state }));
            // No VCS injected: the block resolves its own platform (task.188 QA cycle 2, CR2-1).
            const code = bind(
              blockBy(
                readDoc("skills/develop-next/SKILL.md"),
                DN_MERGE_RECONCILE,
              ),
              { "<mergedPr>": c.mergedPr, ...DN_REFS },
            );
            const r = await runAsync(sh, code, { cwd: fx.work, bin: gh.bin });
            assert.equal(
              r.status,
              0,
              `stdout: ${r.stdout}\nstderr: ${r.stderr}`,
            );
            const st = readState(fx.work, "develop-next.state.json");
            assert.equal(st.merged, c.merged, r.stdout);
            assert.equal(
              st.ticked,
              false,
              "reconciling merged must not touch ticked",
            );
            if (c.merged) assert.equal(st.prNumber, 7);
            assert.equal(
              ghCalls(gh.argvLog).filter((l) => l.includes("--json state"))
                .length,
              c.calls,
            );
          } finally {
            cleanup(fx.dir);
          }
        });
      }

      // CR2-1 (task.188 QA cycle 2): every fenced block is its own shell, so nothing item 6 bound
      // reaches this one. Run with VCS explicitly unset — as a real run is — the block must resolve
      // the platform itself and reconcile, neither refuse nor fall silently to a no-op.
      test(`[${sh}] merge flag: with VCS unset the block resolves the platform itself and reconciles`, async () => {
        const fx = fixtureRepo();
        try {
          writeState(fx.work, "develop-next.state.json", {
            item: "T9",
            prNumber: 7,
            merged: false,
            ticked: false,
          });
          const gh = ghStub(fx.dir, ghBody({ state: "MERGED" }));
          const code =
            "unset VCS BB_API BB_CURL_AUTH\n" +
            bind(
              blockBy(
                readDoc("skills/develop-next/SKILL.md"),
                DN_MERGE_RECONCILE,
              ),
              { "<mergedPr>": "", ...DN_REFS },
            );
          const r = await runAsync(sh, code, { cwd: fx.work, bin: gh.bin });
          assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
          assert.equal(
            readState(fx.work, "develop-next.state.json").merged,
            true,
            r.stdout,
          );
          assert.deepEqual(
            ghCalls(gh.argvLog).filter((l) => l.includes("--json state")),
            ["pr view 7 --json state -q .state"],
          );
        } finally {
          cleanup(fx.dir);
        }
      });

      test(`[${sh}] merge flag: an already-merged file is not re-queried and stays merged`, async () => {
        const fx = fixtureRepo();
        try {
          writeState(fx.work, "develop-next.state.json", {
            item: "T9",
            prNumber: 7,
            merged: true,
            ticked: false,
          });
          const gh = ghStub(fx.dir, ghBody({ state: "OPEN" }));
          const code = bind(
            blockBy(
              readDoc("skills/develop-next/SKILL.md"),
              DN_MERGE_RECONCILE,
            ),
            { "<mergedPr>": "", ...DN_REFS },
          );
          const r = await runAsync(sh, code, { cwd: fx.work, bin: gh.bin });
          assert.equal(r.status, 0, r.stderr);
          assert.equal(
            readState(fx.work, "develop-next.state.json").merged,
            true,
          );
          assert.deepEqual(ghCalls(gh.argvLog), []);
        } finally {
          cleanup(fx.dir);
        }
      });

      // The roadmap row is read on origin, through the selector's parser, by the exact id. T1 and T10
      // are the prefix traps a loose pattern would tick; T11 is archived to roadmap-history.md; T12 is
      // ticked only in the local checkout. The failure rows are the third answer (task.188 QA cycle 1,
      // QA-1): a look that fails reads `unknown` and exits 1 — never `not-ticked`, which would route
      // to a duplicate Step 4 tick.
      for (const c of [
        { item: "T9", want: "ticked" },
        { item: "T10", want: "not-ticked" },
        { item: "T1", want: "not-ticked" },
        { item: "T11", want: "ticked" },
        { item: "T12", want: "not-ticked" },
        // CR2-2 (task.188 QA cycle 2): Step 4 committed the tick and the push never landed.
        {
          item: "T12",
          want: "ticked-unpushed",
          commitLocal: true,
          label: "committed locally, not pushed",
        },
        {
          item: "T9",
          want: "ticked",
          noHistory: true,
          label: "no history file",
        },
        {
          item: "T9",
          want: "unknown",
          base: "no-such-branch",
          label: "fetch fails",
        },
        {
          item: "T9",
          want: "unknown",
          roadmap: "docs/development/missing.md",
          label: "roadmap not on origin",
        },
        {
          item: "T9",
          want: "unknown",
          selector: "/nonexistent/select-next.mjs",
          label: "parser cannot load",
        },
      ]) {
        test(`[${sh}] tick flag: row ${c.item}${c.label ? ` (${c.label})` : ""} reads ${c.want}`, async () => {
          const fx = fixtureRepo();
          try {
            git(fx.work, "checkout", "-q", "develop");
            write(
              fx.work,
              "docs/development/roadmap.md",
              "# Roadmap\n\n## PHASE 1 — fixture\n\n" +
                "- [x] **T9** Done row · deps: none\n" +
                "- [ ] **T10** Open row · deps: none\n" +
                "- [x] **T100** Done row whose id starts with T10 · deps: none\n",
            );
            if (!c.noHistory)
              write(
                fx.work,
                "docs/development/roadmap-history.md",
                "# Roadmap History\n\n## PHASE 0 — archived\n\n- [x] **T11** Archived row · deps: none\n",
              );
            git(fx.work, "add", "-A");
            git(fx.work, "commit", "-q", "-m", "roadmap");
            git(fx.work, "push", "-q", "origin", "develop");
            write(
              fx.work,
              "docs/development/roadmap.md",
              "# Roadmap\n\n## PHASE 1 — fixture\n\n- [x] **T12** Local only · deps: none\n",
            );
            if (c.commitLocal) {
              git(fx.work, "add", "-A");
              git(
                fx.work,
                "commit",
                "-q",
                "-m",
                "tick T12 (push never landed)",
              );
            }
            fs.mkdirSync(path.join(fx.work, ".claude/state"), {
              recursive: true,
            });
            const code = bind(
              blockBy(
                readDoc("skills/develop-next/SKILL.md"),
                DN_ROW_RECONCILE,
              ),
              {
                "<baseBranch>": c.base ?? "develop",
                "<roadmapPath>": c.roadmap ?? "docs/development/roadmap.md",
                "<item>": c.item,
                "$PWD/.agents/skills/develop-next/scripts/select-next.mjs":
                  c.selector ?? SELECTOR,
              },
            );
            const r = await runAsync(sh, code, { cwd: fx.work });
            const out = `stdout: ${r.stdout}\nstderr: ${r.stderr}`;
            assert.equal(r.status, c.want === "unknown" ? 1 : 0, out);
            assert.match(
              r.stdout,
              new RegExp(`: ${c.want}(\\s|\\(|$)`, "m"),
              out,
            );
            if (c.want === "unknown")
              assert.doesNotMatch(r.stdout, /: (not-)?ticked\s*$/m, out);
            assert.equal(
              fs.existsSync(
                path.join(fx.work, ".claude/state/dn-roadmap-row.md"),
              ),
              false,
              "the scratch copy is removed",
            );
          } finally {
            cleanup(fx.dir);
          }
        });
      }

      test(`[${sh}] develop-batch: merged advances only for a non-terminal item whose PR is MERGED`, async () => {
        const fx = fixtureRepo();
        try {
          writeState(fx.work, "develop-batch.state.json", {
            items: [
              {
                id: "T1",
                prNumber: 7,
                merged: false,
                ticked: false,
                halted: false,
              },
              {
                id: "T2",
                prNumber: 8,
                merged: false,
                ticked: false,
                halted: true,
              },
              {
                id: "T3",
                prNumber: null,
                merged: false,
                ticked: false,
                halted: false,
              },
            ],
          });
          const gh = ghStub(fx.dir, ghBody({ state: "MERGED" }));
          const code = blockBy(
            readDoc("skills/develop-batch/SKILL.md"),
            DB_MERGE_RECONCILE,
          );
          const r = await runAsync(sh, code, { cwd: fx.work, bin: gh.bin });
          assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
          const items = readState(fx.work, "develop-batch.state.json").items;
          assert.deepEqual(
            items.map((i) => i.merged),
            [true, false, false],
          );
          assert.deepEqual(
            ghCalls(gh.argvLog).filter((l) => l.includes("--json state")),
            ["pr view 7 --json state -q .state"],
          );
        } finally {
          cleanup(fx.dir);
        }
      });

      test(`[${sh}] develop-batch: an OPEN PR leaves the item unmerged`, async () => {
        const fx = fixtureRepo();
        try {
          writeState(fx.work, "develop-batch.state.json", {
            items: [
              {
                id: "T1",
                prNumber: 7,
                merged: false,
                ticked: false,
                halted: false,
              },
            ],
          });
          const gh = ghStub(fx.dir, ghBody({ state: "OPEN" }));
          const code = blockBy(
            readDoc("skills/develop-batch/SKILL.md"),
            DB_MERGE_RECONCILE,
          );
          const r = await runAsync(sh, code, { cwd: fx.work, bin: gh.bin });
          assert.equal(r.status, 0, r.stderr);
          assert.equal(
            readState(fx.work, "develop-batch.state.json").items[0].merged,
            false,
          );
        } finally {
          cleanup(fx.dir);
        }
      });
    }
  },
);
