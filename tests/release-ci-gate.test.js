"use strict";
/**
 * `scripts/release.sh` reads CI's verdict before its local test, and refuses on anything but green
 * (task 153, obs #150). The real script runs in a scratch clone of a scratch bare origin, with `gh`
 * and `npm` stubbed on PATH:
 *
 *   - `gh` prints a canned `gh run list` array, or exits non-zero like an unauthenticated CLI;
 *   - `npm` records that it was called (a marker file) and exits with a chosen code.
 *
 * The marker file is what makes "refused BEFORE the local test" observable: a CI check moved after
 * `npm run test:clean-checkout`, or deleted, leaves the marker behind (mutations M3 and M4).
 *
 * The scratch origin refuses every push to `main` with a pre-receive hook, the way GitHub's branch
 * protection does: `main`'s required check runs on pull_request only, so a pushed commit is refused
 * unless an admin bypasses it — and the release script used to need that bypass on every release
 * (v0.57.0: "Bypassed rule violations for refs/heads/main"). The release commit is now made by
 * `--prepare` on `develop` and travels to `main` in a PR; `--tag` only pushes a tag. A full
 * `--tag` run against this origin succeeds only while that holds.
 *
 * Assertions are on exit status, output and the origin's refs, never on elapsed time — this suite
 * spawns bash and git per case, the load-sensitive shape the task names.
 *
 * Run: node --test tests/release-ci-gate.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const REPO = path.join(__dirname, "..");

let budget;
test.before(async () => {
  const { spawnBudget } = await import(
    pathToFileURL(path.join(REPO, "shared", "resources", "spawn-budget.mjs"))
      .href
  );
  budget = spawnBudget("RELEASE_GATE");
});

const TEMP_DIRS = [];
test.after(() => {
  for (const d of TEMP_DIRS) fs.rmSync(d, { recursive: true, force: true });
});

// Isolate git from the developer's own config (signing, hooks, default branch).
const GIT_ENV = {
  GIT_CONFIG_GLOBAL: os.devNull,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};

function sh(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...GIT_ENV },
    timeout: budget.timeoutMs,
  });
  if (r.status !== 0)
    throw new Error(`${cmd} ${args.join(" ")}: ${r.stderr || r.error}`);
  return r.stdout.trim();
}

const run = (workflowName, conclusion, id) => ({
  workflowName,
  status: "completed",
  conclusion,
  event: "push",
  databaseId: id,
  url: `https://github.com/o/r/actions/runs/${id}`,
});
const GREEN = [run("Test", "success", 1), run("ShellCheck", "success", 2)];
const RED = [run("Test", "failure", 3), run("ShellCheck", "success", 4)];

/** main after a merged release-prep PR: the version section is written, [Unreleased] is empty. */
const PREPARED =
  "# Changelog\n\n## [Unreleased]\n\n## [v0.0.1] - 2026-10-14\n\n### Fixed\n\n- something (task 153)\n";
/** develop before --prepare: entries wait under [Unreleased]. */
const UNRELEASED =
  "# Changelog\n\n## [Unreleased]\n\n### Fixed\n\n- something (task 153)\n";

/**
 * A scratch origin + clone on `main`, with `develop` present and both pushed — then the origin
 * refuses every further push to `main`, as branch protection does.
 */
function sandbox({ verdictStub = "", changelog = PREPARED } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-ci-gate-"));
  TEMP_DIRS.push(root);
  const origin = path.join(root, "origin.git");
  const work = path.join(root, "work");
  const bin = path.join(root, "bin");
  sh("git", ["init", "--bare", "-q", "-b", "main", origin], root);
  sh("git", ["clone", "-q", origin, work], root);
  fs.mkdirSync(path.join(work, "scripts"));
  for (const f of ["release.sh", "release-ci-verdict.mjs"]) {
    fs.copyFileSync(
      path.join(REPO, "scripts", f),
      path.join(work, "scripts", f),
    );
  }
  // Replaces the verdict module BEFORE the initial commit, so the tree stays clean for pre-flight.
  if (verdictStub)
    fs.writeFileSync(
      path.join(work, "scripts", "release-ci-verdict.mjs"),
      verdictStub,
    );
  fs.writeFileSync(path.join(work, "CHANGELOG.md"), changelog);
  sh("git", ["checkout", "-q", "-b", "main"], work);
  sh("git", ["add", "."], work);
  sh("git", ["commit", "-q", "-m", "init"], work);
  sh("git", ["push", "-q", "origin", "main"], work);
  sh("git", ["branch", "develop"], work);
  sh("git", ["push", "-q", "-u", "origin", "develop"], work);
  fs.writeFileSync(
    path.join(origin, "hooks", "pre-receive"),
    '#!/bin/sh\nwhile read -r old new ref; do\n  if [ "$ref" = refs/heads/main ]; then\n    echo "protected branch: main only moves by pull request" >&2\n    exit 1\n  fi\ndone\n',
    { mode: 0o755 },
  );

  fs.mkdirSync(bin);
  // gh: GH_EXIT non-zero → an auth-style failure; otherwise print the fixture file.
  fs.writeFileSync(
    path.join(bin, "gh"),
    '#!/bin/sh\necho "$*" >> "$GH_ARGS_LOG"\nif [ "${GH_EXIT:-0}" != 0 ]; then\n  echo "To get started with GitHub CLI, please run:  gh auth login" >&2\n  exit "$GH_EXIT"\nfi\ncase "$*" in\n  *"pr list"*) printf "%s\\n" "$GH_PR_LIST" ;;\n  *"pr create"*) echo https://github.com/o/r/pull/9 ;;\n  *) cat "$GH_FIXTURE" ;;\nesac\n',
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(bin, "npm"),
    '#!/bin/sh\necho "$*" >> "$NPM_MARKER"\n[ "$*" = "$NPM_FAIL_ON" ] && exit 1\nexit "${NPM_EXIT:-0}"\n',
    { mode: 0o755 },
  );
  // curl: only --retry's published-Release guard calls it; answer "not published".
  fs.writeFileSync(path.join(bin, "curl"), "#!/bin/sh\nprintf 404\n", {
    mode: 0o755,
  });
  return { root, work, bin };
}

function release(
  args,
  {
    runs = GREEN,
    ghExit = 0,
    npmExit = 0,
    npmFailOn = "",
    tag = "",
    verdictStub = "",
    changelog = PREPARED,
    branch = "main",
    prList = "",
  } = {},
) {
  const box = sandbox({ verdictStub, changelog });
  if (branch !== "main") sh("git", ["checkout", "-q", branch], box.work);
  if (tag) {
    sh("git", ["tag", "-a", tag, "-m", tag], box.work);
    sh("git", ["push", "-q", "origin", tag], box.work);
  }
  const fixture = path.join(box.root, "runs.json");
  fs.writeFileSync(fixture, JSON.stringify(runs));
  const marker = path.join(box.root, "npm-called");
  const ghArgs = path.join(box.root, "gh-args");
  const originRef = (ref) =>
    sh(
      "git",
      ["--git-dir", path.join(box.root, "origin.git"), "rev-parse", ref],
      box.root,
    );
  const mainBefore = originRef("main");
  const r = spawnSync("bash", [path.join("scripts", "release.sh"), ...args], {
    cwd: box.work,
    encoding: "utf8",
    env: {
      ...process.env,
      ...GIT_ENV,
      PATH: `${box.bin}${path.delimiter}${process.env.PATH}`,
      GH_FIXTURE: fixture,
      GH_EXIT: String(ghExit),
      NPM_MARKER: marker,
      GH_ARGS_LOG: ghArgs,
      NPM_EXIT: String(npmExit),
      NPM_FAIL_ON: npmFailOn,
      GH_PR_LIST: prList,
      NO_COLOR: "1",
    },
    timeout: budget.timeoutMs,
  });
  const out = `${r.stdout}\n${r.stderr}`;
  const tags = sh("git", ["tag"], box.work);
  const ghCalls = fs.existsSync(ghArgs) ? fs.readFileSync(ghArgs, "utf8") : "";
  const originTags = sh(
    "git",
    ["--git-dir", path.join(box.root, "origin.git"), "tag"],
    box.root,
  );
  return {
    status: r.status,
    out,
    npmCalled: fs.existsSync(marker),
    npmCalls: fs.existsSync(marker) ? fs.readFileSync(marker, "utf8") : "",
    tags,
    ghCalls,
    originTags,
    originRef,
    mainBefore,
    mainAfter: originRef("main"),
    clean: sh("git", ["status", "--porcelain"], box.work) === "",
    work: box.work,
  };
}

test("red CI refuses before the local test runs, naming the workflow and the escape hatch", () => {
  const r = release(["--tag"], { runs: RED });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /CI is red for [0-9a-f]{8} — refusing to release/);
  assert.match(
    r.out,
    /Test: red \(https:\/\/github.com\/o\/r\/actions\/runs\/3\)/,
  );
  assert.match(r.out, /--skip-ci-check/);
  assert.equal(
    r.npmCalled,
    false,
    "npm ran — the CI check did not come BEFORE the local test",
  );
  assert.equal(r.tags, "", "nothing tagged");
  assert.match(
    r.ghCalls,
    /^-R Gamaroff\/agent-skills run list --commit [0-9a-f]{40} /,
    "gh is pinned to REPO_SLUG (CR-2)",
  );
});

test("gh failing (unauthenticated) refuses as unverifiable", () => {
  const r = release(["--tag"], { ghExit: 4 });
  assert.equal(r.status, 1, r.out);
  assert.match(
    r.out,
    /CI is unverifiable for [0-9a-f]{8} — refusing to release/,
  );
  assert.match(r.out, /gh auth login/);
  assert.equal(r.npmCalled, false);
});

test("a required workflow with no run refuses as unverifiable", () => {
  const r = release(["--tag"], { runs: [run("Test", "success", 5)] });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /CI is unverifiable/);
  assert.match(r.out, /ShellCheck: no run for this commit/);
  assert.equal(r.npmCalled, false);
});

test("pending CI refuses with the re-run-when-it-finishes instruction", () => {
  const r = release(["--tag"], {
    runs: [
      { ...run("Test", "", 6), status: "in_progress" },
      run("ShellCheck", "success", 7),
    ],
  });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /CI is pending/);
  assert.match(r.out, /still running .* re-run when it finishes/);
  assert.equal(r.npmCalled, false);
});

test("green CI reaches the local test; a red local test prints the LOAD-SENSITIVE re-run rule", () => {
  const r = release(["--tag"], { runs: GREEN, npmExit: 1 });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /CI green for [0-9a-f]{8}/);
  assert.equal(r.npmCalled, true, "green CI must reach the local test");
  assert.match(r.out, /npm run test:clean-checkout failed/);
  assert.match(r.out, /LOAD-SENSITIVE, re-run that file alone/);
  assert.match(r.out, /traps\.md § Load-sensitive tests/);
  assert.equal(r.tags, "");
});

test("--dry-run with red CI prints the verdict and 'Would have REFUSED'", () => {
  const r = release(["--dry-run", "--tag"], { runs: RED });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /CI is red for [0-9a-f]{8}/);
  assert.match(r.out, /A real run would refuse here/);
  assert.match(r.out, /Would have REFUSED: CI red for [0-9a-f]{8}/);
});

test("--dry-run with green CI does not print 'Would have REFUSED'", () => {
  const r = release(["--dry-run", "--tag"], { runs: GREEN });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /Releasing: v0\.0\.1/);
  assert.doesNotMatch(r.out, /REFUSED/);
});

test("--skip-ci-check --dry-run with red CI proceeds, warning that it is unverified", () => {
  const r = release(["--skip-ci-check", "--dry-run", "--tag"], { runs: RED });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /Proceeding UNVERIFIED against CI \(--skip-ci-check\)/);
  assert.match(r.out, /Releasing: v0\.0\.1/);
  assert.doesNotMatch(r.out, /REFUSED/);
});

test("--skip-ci-check with red CI proceeds to the local test", () => {
  const r = release(["--skip-ci-check", "--tag"], { runs: RED, npmExit: 1 });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /UNVERIFIED against CI/);
  assert.equal(r.npmCalled, true);
});

test("--retry skips the CI check (it re-tags an existing release and keeps its own guard)", () => {
  const r = release(["--dry-run", "--retry"], { runs: RED, tag: "v0.0.1" });
  assert.equal(r.status, 0, r.out);
  assert.doesNotMatch(r.out, /CI verdict/);
  assert.doesNotMatch(r.out, /REFUSED/);
  assert.match(r.out, /Would have retried: v0\.0\.1/);
});

test("a verdict module that prints something unrecognisable refuses as unverifiable — never green", () => {
  for (const out of [
    "",
    "greenish\tlooks fine",
    "no tab at all",
    "GREEN\tshouting",
    "green",
    "green\n",
    "green\nred\tx",
    "green\tok\nred\tx",
  ]) {
    const r = release(["--tag"], {
      verdictStub: `process.stdout.write(${JSON.stringify(out)}); process.exitCode = 0;\n`,
    });
    assert.equal(r.status, 1, JSON.stringify(out) + "\n" + r.out);
    assert.match(r.out, /CI is unverifiable/);
    assert.equal(r.npmCalled, false);
  }
});

test("a module that prints green but exits non-zero is unverifiable, not green (CR4-1)", () => {
  const r = release(["--tag"], {
    verdictStub:
      'process.stdout.write("green\\tTest, ShellCheck green\\n"); process.exitCode = 1;\n',
  });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /CI is unverifiable/);
  assert.match(r.out, /said green but exited 1/);
  assert.equal(r.npmCalled, false);
});

// ── The release never pushes to main (the branch-protection bypass) ──────────

test("--tag tags main's tip and pushes only the tag, against an origin that refuses every push to main", () => {
  const r = release(["--tag"]);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /Pushed tag v0\.0\.1/);
  assert.equal(r.originTags, "v0.0.1", "the tag reached origin");
  assert.equal(r.mainAfter, r.mainBefore, "main did not move");
  assert.equal(
    r.originRef("v0.0.1^{commit}"),
    r.mainBefore,
    "the tag is on the commit CI certified — main's tip, not a commit made after it",
  );
  assert.doesNotMatch(r.out, /protected branch/);
  assert.match(r.out, /develop synced with main/);
  assert.equal(r.clean, true);
});

test("a bare bump flag refuses and names the two halves, before anything runs", () => {
  for (const bump of ["--patch", "--minor", "--major"]) {
    const r = release([bump]);
    assert.equal(r.status, 1, r.out);
    assert.match(
      r.out,
      new RegExp(`${bump} now goes with --prepare, run on develop`),
    );
    assert.match(r.out, /release\.sh --tag/);
    assert.equal(r.npmCalled, false);
    assert.equal(r.ghCalls, "", "refused before the CI check");
    assert.equal(r.originTags, "");
  }
});

test("each half refuses the other half's branch", () => {
  const onMain = release(["--prepare", "--patch"], { changelog: UNRELEASED });
  assert.equal(onMain.status, 1, onMain.out);
  assert.match(
    onMain.out,
    /--prepare runs on develop, hotfix\/\* or release\/\*/,
  );
  const onDevelop = release(["--tag"], { branch: "develop" });
  assert.equal(onDevelop.status, 1, onDevelop.out);
  assert.match(onDevelop.out, /--tag runs on main \(currently on develop\)/);
  assert.equal(onDevelop.ghCalls, "", "refused before the CI check");
});

test("--prepare commits the release on develop, pushes it and opens the PR into main — main untouched", () => {
  const r = release(["--prepare", "--minor"], {
    branch: "develop",
    changelog: UNRELEASED,
  });
  assert.equal(r.status, 0, r.out);
  assert.equal(r.mainAfter, r.mainBefore, "main did not move");
  assert.equal(r.originTags, "", "--prepare tags nothing");
  const log = sh("git", ["log", "-1", "--format=%s", "origin/develop"], r.work);
  assert.equal(
    log,
    "chore(release): v0.1.0",
    "the release commit is on origin/develop",
  );
  const changelog = sh("git", ["show", "origin/develop:CHANGELOG.md"], r.work);
  assert.match(
    changelog,
    /## \[Unreleased\]\n\n## \[v0\.1\.0\] - \d{4}-\d{2}-\d{2}\n\n### Fixed\n\n- something \(task 153\)/,
  );
  assert.match(
    r.ghCalls,
    /pr create -R Gamaroff\/agent-skills --base main --head develop --title Release prep — v0\.1\.0/,
  );
  assert.match(r.npmCalls, /run generate-catalog\nrun bundle\n/);
  assert.match(r.out, /release\.sh --tag/);
});

test("--prepare reuses a release-prep PR already open from the branch", () => {
  const r = release(["--prepare", "--patch"], {
    branch: "develop",
    changelog: UNRELEASED,
    prList: "https://github.com/o/r/pull/7",
  });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /already open .*pull\/7/);
  assert.doesNotMatch(r.ghCalls, /pr create/);
});

test("--prepare refuses an empty [Unreleased] and a version already prepared", () => {
  const empty = release(["--prepare", "--patch"], { branch: "develop" });
  assert.equal(empty.status, 1, empty.out);
  assert.match(empty.out, /already has a \[v0\.0\.1\] section/);
  const nothing = release(["--prepare", "--patch"], {
    branch: "develop",
    changelog: "# Changelog\n\n## [Unreleased]\n\n### Fixed\n",
  });
  assert.equal(nothing.status, 1, nothing.out);
  assert.match(nothing.out, /\[Unreleased\] section in CHANGELOG\.md is empty/);
  assert.equal(nothing.mainAfter, nothing.mainBefore);
});

test("--tag refuses a release that was not prepared, before the local test", () => {
  const cases = [
    [
      UNRELEASED,
      "",
      /has no \[vX\.Y\.Z\] section — this release was not prepared/,
    ],
    [PREPARED, "v0.0.1", /\[v0\.0\.1\], which is not newer than v0\.0\.1/],
    [
      PREPARED.replace(
        "## [v0.0.1]",
        "- landed after prepare (task 999)\n\n## [v0.0.1]",
      ),
      "",
      /\[Unreleased\] on main has entries that would ship in v0\.0\.1 unlisted/,
    ],
  ];
  for (const [changelog, tag, message] of cases) {
    const r = release(["--tag"], { changelog, tag });
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, message);
    assert.equal(r.npmCalled, false, "refused before the local test");
    assert.equal(r.originTags, tag, "nothing new tagged");
  }
});

test("--tag refuses stale generated files rather than committing to main, and restores the tree", () => {
  const r = release(["--tag"], { npmFailOn: "run check:generated" });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /stale — refusing to tag/);
  assert.equal(r.originTags, "");
  assert.equal(r.mainAfter, r.mainBefore);
  assert.equal(r.clean, true);
});
