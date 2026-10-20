// resolve-pr-number.test.mjs — finalise judges its own PR, not the first one its document cites
// (task 175; observation #184).
//
// finalise Step 3a read `pr_number:` and, when that was absent, the first `PR #N` anywhere in the
// body. Inside a pipeline the frontmatter never has `pr_number:` yet, so the body rule always ran,
// and three runs picked a PR their document merely cited (task.146 → #472, task.147 → #207,
// task.166 → #505). resolve-pr-number.sh reads the sources that KNOW the PR first — the caller, the
// branch, the pipeline lock — and confirms a body citation against the current branch before using
// it.
//
// Part 1 runs the resolver in a fixture repository (branch `feature/x`) with a `gh` stub, one case
// per rung, each with the rungs above it empty, under every shell in SHELLS. Part 2 pins finalise
// itself: Step 3a calls the resolver, and no finalise site derives the number from the document.

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  SHELLS,
  readDoc,
  fixtureRepo,
  write,
  run,
  git,
  ghStub,
  ghCalls,
  cleanup,
} from "./lib/executed-prose.mjs";

const SCRIPT = path.join(ROOT, "shared/resources/resolve-pr-number.sh");
const DOC_DIR = "docs/tasks/task.9.fx";
const DOC = `${DOC_DIR}/task.9.fx.md`;
const SHA = "a".repeat(40);

// The stub answers what pr-read.sh asks: `gh pr view [N] --json … --jq …`, printing the jq-shaped
// line "number head base headBranch" itself. `branchPr` is the current branch's PR (null: none);
// `prs` maps a PR number to its head branch.
function stubBody({ branchPr = null, prs = {} } = {}) {
  const arms = Object.entries(prs)
    .map(([n, head]) => `    ${n}) echo "${n} ${SHA} develop ${head}" ;;`)
    .join("\n");
  return [
    'if [ "$1" = "pr" ] && [ "$2" = "view" ]; then',
    '  case "$3" in',
    branchPr === null
      ? "    --json) exit 1 ;;"
      : `    --json) echo "${branchPr} ${SHA} develop feature/x" ;;`,
    arms,
    "    *) exit 1 ;;",
    "  esac",
    "  exit 0",
    "fi",
    "exit 1",
  ]
    .filter(Boolean)
    .join("\n");
}

function docText({ frontmatterPr = null, body = "" } = {}) {
  const fm = ["---", "id: task.9", "type: task", "status: in-progress"];
  if (frontmatterPr !== null) fm.push(`pr_number: ${frontmatterPr}`);
  fm.push("---");
  return `${fm.join("\n")}\n\n# Task 9\n\n${body}\n`;
}

function lock(work, { dir = DOC_DIR, prUrl = "" } = {}) {
  write(
    work,
    ".claude/state/develop-pipeline.lock",
    JSON.stringify({
      skill: "develop-task",
      task_or_story_directory: dir,
      pr_url: prUrl,
    }),
  );
}

// One fixture per case: { work, bin, argvLog }.
function fixture(t, { doc, branchPr = null, prs = {} } = {}) {
  const f = fixtureRepo();
  t.after(() => cleanup(f.dir));
  write(f.work, DOC, doc ?? docText());
  write(f.work, "skills-config.yaml", "vcs: github\ntracker: github\n");
  const { bin, argvLog } = ghStub(f.dir, stubBody({ branchPr, prs }));
  return { work: f.work, dir: f.dir, bin, argvLog };
}

function resolve(shell, fx, args = ["--doc", DOC, "--json"], env = {}) {
  const quoted = args.map((a) => `'${a}'`).join(" ");
  return run(shell, `bash '${SCRIPT}' ${quoted}`, {
    cwd: fx.work,
    bin: fx.bin,
    env,
  });
}

const parse = (r) => JSON.parse(r.stdout.trim());

for (const shell of SHELLS) {
  describe(`resolve-pr-number.sh rungs (${shell})`, () => {
    test("explicit: --pr wins and no gh call is made", (t) => {
      const fx = fixture(t, { branchPr: 550 });
      const r = resolve(shell, fx, ["--doc", DOC, "--pr", "7", "--json"]);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(parse(r), { pr: 7, source: "explicit" });
      assert.deepEqual(ghCalls(fx.argvLog), []);
    });

    test("branch: the current branch's PR beats a stale pr_number: and a cited PR", (t) => {
      const fx = fixture(t, {
        branchPr: 550,
        doc: docText({
          frontmatterPr: 999,
          body: "Follows obs #204, merged via PR #505.",
        }),
      });
      const r = resolve(shell, fx);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(parse(r), { pr: 550, source: "branch" });
    });

    test("lock: the lock's pr_url answers when its directory is this document's", (t) => {
      const fx = fixture(t, { doc: docText({ frontmatterPr: 552 }) });
      lock(fx.work, {
        dir: `./${DOC_DIR}/`,
        prUrl: "https://github.com/o/r/pull/551",
      });
      const r = resolve(shell, fx);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(parse(r), { pr: 551, source: "lock" });
    });

    test("lock: another work item's lock is skipped, never used", (t) => {
      const fx = fixture(t, { doc: docText({ frontmatterPr: 552 }) });
      write(fx.work, "docs/tasks/task.8.other/task.8.other.md", "x\n");
      lock(fx.work, {
        dir: "docs/tasks/task.8.other",
        prUrl: "https://github.com/o/r/pull/551",
      });
      const r = resolve(shell, fx);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(parse(r), { pr: 552, source: "frontmatter" });
      assert.match(
        r.stderr,
        /lock: the lock is for 'docs\/tasks\/task\.8\.other'/,
      );
    });

    test("frontmatter: pr_number: answers when the branch and the lock do not", (t) => {
      const fx = fixture(t, { doc: docText({ frontmatterPr: 550 }) });
      const r = resolve(shell, fx);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(parse(r), { pr: 550, source: "frontmatter" });
    });

    test("frontmatter: a pr_number: line in the body is not frontmatter", (t) => {
      const fx = fixture(t, {
        doc: docText({ body: "```yaml\npr_number: 789\n```" }),
      });
      const r = resolve(shell, fx);
      assert.equal(r.status, 1, r.stdout);
      assert.equal(parse(r).pr, null);
    });

    test("body: a cited PR whose head is another branch is refused — exit 1, no number", (t) => {
      const fx = fixture(t, {
        prs: { 505: "feature/obs-204" },
        doc: docText({ body: "obs #204's change merged via PR #505." }),
      });
      const r = resolve(shell, fx);
      assert.equal(r.status, 1, r.stdout);
      assert.deepEqual(parse(r), { pr: null, source: "none", reason: "none" });
      assert.match(
        r.stderr,
        /PR #505 cited, but its head branch is 'feature\/obs-204'/,
      );

      const plain = resolve(shell, fx, ["--doc", DOC]);
      assert.equal(plain.status, 1);
      assert.equal(plain.stdout, "", "a refused resolution prints no number");
    });

    test("body: a cited PR whose head IS the current branch is used", (t) => {
      const fx = fixture(t, {
        prs: { 550: "feature/x" },
        doc: docText({ body: "Implemented in PR #550." }),
      });
      const r = resolve(shell, fx);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(parse(r), { pr: 550, source: "body" });
    });

    test("none: no source at all → exit 1 and no number", (t) => {
      const fx = fixture(t);
      const r = resolve(shell, fx, ["--doc", DOC]);
      assert.equal(r.status, 1);
      assert.equal(r.stdout, "");
    });

    test("usage errors exit 2", (t) => {
      const fx = fixture(t);
      for (const args of [
        [],
        ["--doc"],
        ["--doc", "docs/missing.md"],
        ["--doc", DOC, "--pr", "abc"],
        ["--doc", DOC, "--pr", "0"],
        ["--doc", DOC, "--bogus"],
      ]) {
        const r = resolve(shell, fx, args);
        assert.equal(
          r.status,
          2,
          `args ${JSON.stringify(args)} → ${r.status}: ${r.stderr}`,
        );
        assert.equal(r.stdout, "");
      }
    });

    test("Bitbucket: the branch rung reads the one open PR from the branch", (t) => {
      const fx = fixture(t);
      write(fx.work, "skills-config.yaml", "vcs: bitbucket\ntracker: github\n");
      git(
        fx.work,
        "config",
        "remote.origin.url",
        "git@bitbucket.org:acme/wallet.git",
      );
      const body = path.join(fx.dir, "bb-body.json");
      fs.writeFileSync(
        body,
        JSON.stringify({
          values: [
            {
              id: 601,
              source: {
                branch: { name: "feature/x" },
                commit: { hash: "abcdef123456" },
              },
              destination: { branch: { name: "develop" } },
            },
          ],
        }),
      );
      fs.writeFileSync(
        path.join(fx.bin, "curl"),
        '#!/bin/sh\nout=""\nwhile [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift 2 ;; *) shift ;; esac; done\n' +
          `[ -n "$out" ] && cat '${body}' > "$out"\nprintf 200\n`,
        { mode: 0o755 },
      );
      const r = resolve(shell, fx, ["--doc", DOC, "--json"], {
        BITBUCKET_ACCESS_TOKEN: "t",
      });
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(parse(r), { pr: 601, source: "branch" });
    });
  });
}

// ── Part 2: finalise uses the resolver, and nothing in it derives the number from the document ──

const FINALISE = "skills/finalise/SKILL.md";
const PROMPTS = [
  "shared/resources/finalise-dod-ac-prompt.md",
  "shared/resources/finalise-dod-fix-evidence-prompt.md",
];

// Each of these is a way finalise used to take a PR number from the document body.
const FORBIDDEN = [
  ["the body regex", "PR #([0-9]+)|pull/([0-9]+)"],
  ["the prompts' derivation bullet", "PR number from frontmatter"],
  ["Step 7.2's body-to-frontmatter copy", "add if only in body"],
  [
    "the bug-mode note's citation of the old rule",
    "Step 3a's existing derivation",
  ],
];

describe("finalise resolves the PR number through resolve-pr-number.sh", () => {
  test("Step 3a calls the resolver (non-vacuity floor)", () => {
    const text = readDoc(FINALISE);
    const at = text.indexOf("#### Step 3a: Prepare Shared Context");
    assert.ok(at >= 0, "finalise has no Step 3a heading");
    const end = text.indexOf("\n#### ", at + 1);
    const step3a = text.slice(at, end < 0 ? undefined : end);
    const calls = step3a
      .split("\n")
      .filter((l) => l.includes("resolve-pr-number.sh --doc "));
    assert.equal(calls.length, 1, "Step 3a calls the resolver exactly once");
    // No PR argument reaches finalise, so a `--pr` here would read a variable nothing binds.
    assert.doesNotMatch(calls[0], /--pr\b/, "Step 3a's call passes no --pr");
  });

  for (const file of [FINALISE, ...PROMPTS]) {
    test(`${file} derives no PR number from the document`, () => {
      const text = readDoc(file);
      for (const [what, literal] of FORBIDDEN) {
        assert.ok(
          !text.includes(literal),
          `${file} still carries ${what}: ${literal}`,
        );
      }
    });
  }

  test("both agent prompts read the number they are given", () => {
    for (const file of PROMPTS) {
      assert.match(
        readDoc(file),
        /The PR number is `<PR_NUMBER>`, resolved by the caller/,
        file,
      );
    }
  });
});
