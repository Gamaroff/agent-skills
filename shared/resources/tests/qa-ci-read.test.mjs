// qa-ci-read.test.mjs — the QA gate's one-time CI read (task.238, obs #45).
//
// qa-ci-read.sh is what /qa-task and /qa-story run at their gate step. Each case feeds it a recorded
// API shape through a `gh` or `curl` stub and asserts the finding it maps — one per completed
// failure, none for an undecided state, none on a head mismatch — and the base check that splits a
// fresh red (a top_issue) from one already red on the PR base (pre-existing, kept out of /qa-fix's
// queue). The bucketing traps are /finalise's: a running CheckRun's `conclusion: ""` is undecided,
// never green or red; ACTION_REQUIRED is a failure; CANCELLED is undecided; a Bitbucket 403 is a
// failed read, never "no CI".

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, fixtureRepo, git, cleanup } from "./lib/executed-prose.mjs";

const SCRIPT = path.join(ROOT, "shared/resources/qa-ci-read.sh");

// A stub `gh` and `curl` reading their answers from files in `fix/`, logging argv to `calls`.
function stubs(dir) {
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, "gh"),
    `#!/bin/sh
FIX="${dir}/fix"
echo "gh $*" >> "${dir}/calls"
case "$1 $2" in
  "pr view") cat "$FIX/pr.json" ;;
  "run list") [ -f "$FIX/base-run" ] && cat "$FIX/base-run" ;;
  "run view") [ -f "$FIX/base-job" ] && cat "$FIX/base-job" ;;
esac
exit 0
`,
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(bin, "curl"),
    `#!/bin/sh
FIX="${dir}/fix"
echo "curl $*" >> "${dir}/calls"
out=""; url=""
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    -w|--header|--user|-H|-u) shift 2 ;;
    *) url="$1"; shift ;;
  esac
done
case "$url" in
  */pipelines/*) cp "$FIX/pipelines.json" "$out"; cat "$FIX/pipelines-code" 2>/dev/null || printf 200 ;;
  */pullrequests/*) cp "$FIX/bb-pr.json" "$out"; printf 200 ;;
esac
`,
    { mode: 0o755 },
  );
  fs.mkdirSync(path.join(dir, "fix"));
  return bin;
}

function setup() {
  const fx = fixtureRepo();
  const bin = stubs(fx.dir);
  const head = git(fx.work, "rev-parse", "HEAD").trim();
  const fix = (name, body) =>
    fs.writeFileSync(
      path.join(fx.dir, "fix", name),
      typeof body === "string" ? body : JSON.stringify(body),
    );
  const read = (vcs) => {
    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      BITBUCKET_ACCESS_TOKEN: "t",
    };
    delete env.BITBUCKET_USERNAME;
    const r = spawnSync("bash", [SCRIPT, "--vcs", vcs, "--pr", "7"], {
      cwd: fx.work,
      env,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, `exit ${r.status}:\n${r.stdout}${r.stderr}`);
    const state = r.stdout.match(/^CI_STATE=(\S+)/m)?.[1];
    const findings = r.stdout
      .split("\n")
      .filter((l) => l.startsWith("CI_FINDING\t"))
      .map((l) => l.split("\t"));
    const summary = r.stdout.match(/^CI_SUMMARY=(.*)$/m)?.[1];
    const calls = fs.existsSync(path.join(fx.dir, "calls"))
      ? fs.readFileSync(path.join(fx.dir, "calls"), "utf8")
      : "";
    return { state, findings, summary, calls, out: r.stdout };
  };
  return { fx, head, fix, read };
}

const checkRun = (name, status, conclusion, wf = "CI") => ({
  __typename: "CheckRun",
  name,
  status,
  conclusion,
  workflowName: wf,
  detailsUrl: `https://github.com/o/r/actions/runs/1/job/${name}`,
});

// ── GitHub ──────────────────────────────────────────────────────────────────────────────────────

const GH_CASES = [
  // [label, rollup, base job conclusion (or null for no base run), expected state, expected kinds]
  [
    "a COMPLETED/FAILURE CheckRun, green on base",
    [checkRun("test", "COMPLETED", "FAILURE")],
    "success",
    "FAILURE",
    ["top_issue"],
  ],
  [
    "a COMPLETED/ACTION_REQUIRED CheckRun is a failure",
    [checkRun("deploy", "COMPLETED", "ACTION_REQUIRED")],
    "success",
    "FAILURE",
    ["top_issue"],
  ],
  [
    'an IN_PROGRESS CheckRun with conclusion "" is undecided, never green or red',
    [checkRun("test", "IN_PROGRESS", "")],
    null,
    "PENDING",
    [],
  ],
  [
    "a CANCELLED run is undecided",
    [checkRun("test", "COMPLETED", "CANCELLED")],
    null,
    "CANCELLED",
    [],
  ],
  [
    "a StatusContext state FAILURE is a failure with no base reading",
    [
      {
        __typename: "StatusContext",
        context: "ci/legacy",
        state: "FAILURE",
        targetUrl: "https://ci.example/1",
      },
    ],
    null,
    "FAILURE",
    ["top_issue"],
  ],
  ["an empty rollup is no CI", [], null, "NONE", []],
  [
    "a green rollup maps nothing",
    [checkRun("test", "COMPLETED", "SUCCESS")],
    null,
    "SUCCESS",
    [],
  ],
  [
    "red on the base too is pre-existing, never a top_issue",
    [checkRun("test", "COMPLETED", "FAILURE")],
    "failure",
    "FAILURE",
    ["pre-existing"],
  ],
  [
    "red with no completed base run is a top_issue (the control)",
    [checkRun("test", "COMPLETED", "FAILURE")],
    null,
    "FAILURE",
    ["top_issue"],
  ],
  [
    "one finding per completed failure, none for the pending lane beside it",
    [
      checkRun("test", "COMPLETED", "FAILURE"),
      checkRun("e2e", "IN_PROGRESS", ""),
      checkRun("lint", "COMPLETED", "TIMED_OUT"),
    ],
    "success",
    "FAILURE",
    ["top_issue", "top_issue"],
  ],
];

for (const [label, rollup, baseJob, state, kinds] of GH_CASES) {
  test(`github: ${label}`, () => {
    const { fx, head, fix, read } = setup();
    try {
      fix("pr.json", {
        headRefOid: head,
        baseRefName: "develop",
        statusCheckRollup: rollup,
      });
      if (baseJob) {
        fix("base-run", "4242\n");
        fix("base-job", `${baseJob}\n`);
      }
      const r = read("github");
      assert.equal(r.state, state, r.out);
      assert.deepEqual(
        r.findings.map((f) => f[1]),
        kinds,
        r.out,
      );
      assert.ok(r.summary?.startsWith(`CI on ${head.slice(0, 12)}: `), r.out);
      if (kinds.includes("pre-existing"))
        assert.match(r.summary, /1 failed \(1 pre-existing\)/);
    } finally {
      cleanup(fx.dir);
    }
  });
}

test("github: a PR head that is not the local HEAD maps nothing and reads no base run", () => {
  const { fx, fix, read } = setup();
  try {
    fix("pr.json", {
      headRefOid: "0".repeat(40),
      baseRefName: "develop",
      statusCheckRollup: [checkRun("test", "COMPLETED", "FAILURE")],
    });
    const r = read("github");
    assert.equal(r.state, "HEAD_MISMATCH", r.out);
    assert.deepEqual(r.findings, []);
    assert.doesNotMatch(r.calls, /run list/);
  } finally {
    cleanup(fx.dir);
  }
});

test("github: the base check reads the same workflow on the PR base branch, completed only", () => {
  const { fx, head, fix, read } = setup();
  try {
    fix("pr.json", {
      headRefOid: head,
      baseRefName: "main",
      statusCheckRollup: [checkRun("test", "COMPLETED", "FAILURE", "Validate")],
    });
    fix("base-run", "99\n");
    fix("base-job", "failure\n");
    const r = read("github");
    assert.match(
      r.calls,
      /gh run list --branch main --workflow Validate --status completed --limit 1/,
    );
    assert.match(r.calls, /gh run view 99 --json jobs/);
  } finally {
    cleanup(fx.dir);
  }
});

test("github: a gh read failure is UNKNOWN, never a finding and never green", () => {
  const { fx, read } = setup();
  try {
    // No pr.json: the stub's cat fails and prints nothing.
    const r = read("github");
    assert.equal(r.state, "UNKNOWN", r.out);
    assert.deepEqual(r.findings, []);
  } finally {
    cleanup(fx.dir);
  }
});

// ── Bitbucket ───────────────────────────────────────────────────────────────────────────────────

const pipeline = (
  n,
  commit,
  state,
  result,
  ref = "feature/x",
  selector = { type: "branches", pattern: "**" },
) => ({
  build_number: n,
  target: { ref_name: ref, commit: { hash: commit }, selector },
  state: { name: state, ...(result ? { result: { name: result } } : {}) },
});
const custom = { type: "custom", pattern: "nightly" };

function bbSetup() {
  const s = setup();
  git(
    s.fx.work,
    "remote",
    "set-url",
    "origin",
    "git@bitbucket.org:ws/repo.git",
  );
  s.fix("bb-pr.json", {
    source: { commit: { hash: s.head.slice(0, 12) } },
    destination: { branch: { name: "develop" } },
  });
  return s;
}

const BB_CASES = [
  [
    "FAILED for the head SHA, green on base → a top_issue",
    (h) => [
      pipeline(12, h, "COMPLETED", "FAILED"),
      pipeline(11, "b".repeat(40), "COMPLETED", "SUCCESSFUL", "develop"),
    ],
    "FAILURE",
    ["top_issue"],
  ],
  [
    "FAILED for the head SHA and on base → pre-existing",
    (h) => [
      pipeline(12, h, "COMPLETED", "FAILED"),
      pipeline(11, "b".repeat(40), "COMPLETED", "FAILED", "develop"),
    ],
    "FAILURE",
    ["pre-existing"],
  ],
  [
    // task.238 bug.7: the base reading is the same pipeline (selector type and pattern), never
    // whichever pipeline ran last on the base.
    "a red base pipeline of another selector is not the same check → a top_issue",
    (h) => [
      pipeline(42, "d".repeat(40), "COMPLETED", "FAILED", "develop", custom),
      pipeline(41, h, "COMPLETED", "FAILED"),
      pipeline(40, "b".repeat(40), "COMPLETED", "SUCCESSFUL", "develop"),
    ],
    "FAILURE",
    ["top_issue"],
  ],
  [
    "no base pipeline of the same selector → a top_issue (no base evidence)",
    (h) => [
      pipeline(12, h, "COMPLETED", "FAILED"),
      pipeline(11, "b".repeat(40), "COMPLETED", "FAILED", "develop", custom),
    ],
    "FAILURE",
    ["top_issue"],
  ],
  [
    // CR4-8: a rerun of the same pipeline supersedes the earlier one.
    "a FAILED head pipeline superseded by a green rerun of the same selector → green",
    (h) => [
      pipeline(13, h, "COMPLETED", "SUCCESSFUL"),
      pipeline(12, h, "COMPLETED", "FAILED"),
    ],
    "SUCCESS",
    [],
  ],
  [
    "IN_PROGRESS → nothing",
    (h) => [pipeline(12, h, "IN_PROGRESS")],
    "PENDING",
    [],
  ],
  [
    "STOPPED → undecided, nothing",
    (h) => [pipeline(12, h, "COMPLETED", "STOPPED")],
    "CANCELLED",
    [],
  ],
  [
    "no pipeline for the head SHA → none",
    () => [pipeline(12, "c".repeat(40), "COMPLETED", "FAILED")],
    "NONE",
    [],
  ],
];

for (const [label, values, state, kinds] of BB_CASES) {
  test(`bitbucket: ${label}`, () => {
    const { fx, head, fix, read } = bbSetup();
    try {
      fix("pipelines.json", { values: values(head) });
      const r = read("bitbucket");
      assert.equal(r.state, state, r.out);
      assert.deepEqual(
        r.findings.map((f) => f[1]),
        kinds,
        r.out,
      );
      assert.doesNotMatch(r.calls, /^gh /m, "the Bitbucket read called gh");
    } finally {
      cleanup(fx.dir);
    }
  });
}

test('bitbucket: HTTP 403 on /pipelines/ is a failed read, never "no CI"', () => {
  const { fx, head, fix, read } = bbSetup();
  try {
    fix("pipelines.json", {
      values: [pipeline(12, head, "COMPLETED", "FAILED")],
    });
    fix("pipelines-code", "403");
    const r = read("bitbucket");
    assert.equal(r.state, "UNKNOWN", r.out);
    assert.match(r.summary, /403/);
    assert.deepEqual(r.findings, []);
  } finally {
    cleanup(fx.dir);
  }
});

test("bitbucket: a PR head that is not the local HEAD maps nothing", () => {
  const { fx, head, fix, read } = bbSetup();
  try {
    fix("bb-pr.json", {
      source: { commit: { hash: "d".repeat(12) } },
      destination: { branch: { name: "develop" } },
    });
    fix("pipelines.json", {
      values: [pipeline(12, head, "COMPLETED", "FAILED")],
    });
    const r = read("bitbucket");
    assert.equal(r.state, "HEAD_MISMATCH", r.out);
    assert.deepEqual(r.findings, []);
  } finally {
    cleanup(fx.dir);
  }
});

// ── SC-5: a read, never a wait ──────────────────────────────────────────────────────────────────

test("the engine never waits: no sleep, --watch or until loop", () => {
  const code = fs
    .readFileSync(SCRIPT, "utf8")
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  assert.doesNotMatch(code, /\bsleep\b/);
  assert.doesNotMatch(code, /--watch/);
  assert.doesNotMatch(code, /\buntil\b/);
});

test("usage errors exit 2", () => {
  // Each case asserts its own message: os.tmpdir() is not a git checkout, so with a validation
  // removed the case still exits 2 at `git rev-parse` — exit 2 alone held nothing (task.238 DoD 1).
  for (const [args, message] of [
    [[], /--vcs must be github or bitbucket/],
    [["--vcs", "gitlab", "--pr", "1"], /--vcs must be github or bitbucket/],
    [["--vcs", "github"], /--pr must be a PR number/],
    [["--vcs", "github", "--pr", "x"], /--pr must be a PR number/],
  ]) {
    const r = spawnSync("bash", [SCRIPT, ...args], {
      cwd: os.tmpdir(),
      encoding: "utf8",
    });
    assert.equal(r.status, 2, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, message, args.join(" "));
  }
});
