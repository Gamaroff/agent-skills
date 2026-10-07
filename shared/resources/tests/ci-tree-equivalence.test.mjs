// ci-tree-equivalence — task.172. One docs-only CI rule at every pipeline CI wait.
//
// Three layers, because the engine is a decision and the decision is only trustworthy if each part
// of how it is reached is held:
//
//   1. the pure core, table-driven, one row per step of the decision order;
//   2. the CLI against REAL temporary git repositories, with `gh` and the Bitbucket fetch faked —
//      the diff, the first-parent walk, the rename trap and the 20-ancestor bound are git's
//      behaviour, and a fake git would only test the fake;
//   3. the call-site wiring (added with the sites), because an engine nobody calls saves nothing.
//
// Every "no" must exit 1 and only tree-equivalent may exit 0: a shell `if` cannot round a "no" up
// to green, which is the property the whole rule rests on.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSensitive, neverRan, spawnBudget } from "../spawn-budget.mjs";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_PATH = join(__dirname, "..", "ci-tree-equivalence.js");
const eng = require(ENGINE_PATH);
const { REASONS } = eng;
const CLI_BUDGET = spawnBudget("CI_TREE_EQ");

// ── fixtures ──────────────────────────────────────────────────────────────

const GIT = [
  "-c",
  "user.name=t",
  "-c",
  "user.email=t@t",
  "-c",
  "commit.gpgsign=false",
  // No background maintenance. By default every `git commit` spawns
  // `git maintenance run --auto --detach`, and once the loose-object estimate
  // crosses gc.auto it repacks into .git while the test is deleting the
  // fixture: rmSync then fails with ENOTEMPTY (obs #282, CR3-7 on CI).
  "-c",
  "maintenance.auto=false",
  "-c",
  "gc.auto=0",
];
const git = (cwd, ...args) =>
  execFileSync("git", [...GIT, ...args], { cwd, encoding: "utf8" }).trim();

/** Teardown must not be able to fail a test, so it retries a transient ENOTEMPTY/EBUSY. */
const cleanup = (dir) =>
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

function mkRepo({ config } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ci-tree-eq-"));
  git(dir, "init", "-q", "-b", "main");
  if (config !== undefined)
    writeFileSync(join(dir, "skills-config.yaml"), config);
  return dir;
}

function commit(dir, files, msg = "c", { rm = [] } = {}) {
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  for (const p of rm) git(dir, "rm", "-q", "-f", p);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--allow-empty", "-m", msg);
  return git(dir, "rev-parse", "HEAD");
}

test("fixture: a commit spawns no background git maintenance, so teardown cannot race a repack (obs #282)", () => {
  // Without maintenance.auto=false every commit spawns a detached
  // `git maintenance run --auto`; CR3-7 failed on CI when one repacked .git
  // while rmSync was deleting it. Trace the commit and look for the child.
  const dir = mkRepo();
  const trace = join(dir, "..", `${dir.split("/").pop()}.trace.json`);
  const before = process.env.GIT_TRACE2_EVENT;
  process.env.GIT_TRACE2_EVENT = trace;
  try {
    commit(dir, { "a.txt": "1\n" }, "traced");
  } finally {
    if (before === undefined) delete process.env.GIT_TRACE2_EVENT;
    else process.env.GIT_TRACE2_EVENT = before;
  }
  try {
    const events = readFileSync(trace, "utf8");
    // Non-vacuity: the trace saw the commit itself, so an empty match below means something.
    assert.match(
      events,
      /"argv":\[[^\]]*"commit"/,
      "the trace recorded no commit",
    );
    assert.doesNotMatch(events, /"argv":\[[^\]]*"(maintenance|gc)"/);
  } finally {
    cleanup(dir);
    rmSync(trace, { force: true });
  }
});

// Timestamps matter: an ancestor whose newest check is younger than ci.docsOnly.settleSeconds (default
// 300 s) is still PENDING, and one with no timestamp cannot be shown to have settled (CR3-1). A long-ago
// completion is a settled one.
const LONG_AGO = "2020-01-01T00:00:00Z";
const GREEN = [
  { status: "completed", conclusion: "success", completed_at: LONG_AGO },
];

/**
 * An `exec` that answers `gh` from a table and everything else (git) for real. `checks[sha]` is a
 * list of CheckRuns, or "FAIL" to make the call fail; `statuses[sha]` likewise for StatusContexts.
 * `log` records every gh call, so a test can count ancestor reads.
 */
function fakeExec({ checks = {}, statuses = {}, log = [] } = {}) {
  return (cmd, args, opts) => {
    if (cmd !== "gh") return execFileSync(cmd, args, opts);
    log.push(args.join(" "));
    const m = /commits\/([0-9a-f]+)\/(check-runs|status)/.exec(args.join(" "));
    if (!m) throw new Error(`unexpected gh call: ${args.join(" ")}`);
    const table = m[2] === "check-runs" ? checks : statuses;
    const v = table[m[1]];
    if (v === "FAIL") throw new Error("gh: HTTP 500");
    return (v || []).map((o) => JSON.stringify(o)).join("\n");
  };
}

const sink = () => {
  let out = "";
  return {
    write: (s) => (out += s),
    get text() {
      return out;
    },
  };
};

async function runEngine(dir, argv, deps = {}) {
  const stdout = sink();
  const stderr = sink();
  const r = await eng.run({
    argv,
    cwd: dir,
    env: { VCS: "github", ...(deps.env || {}) },
    stdout,
    stderr,
    ...deps,
  });
  return { ...r, stdout: stdout.text, stderr: stderr.text };
}

// ── 1. the pure core ─────────────────────────────────────────────────────

const A = (sha, changed, rollup) => ({ sha, changed, rollup });
const DOCS = ["docs/a.md", "README.md"];

test("only PENDING and NONE heads are candidates: every other rollup is not-applicable", async () => {
  for (const headRollup of [
    "SUCCESS",
    "FAILURE",
    "CANCELLED",
    "UNKNOWN",
    "",
    undefined,
  ]) {
    const r = await eng.classifyTreeEquivalence({
      headRollup,
      ancestors: [A("g1", DOCS, "SUCCESS")],
      patterns: eng.DEFAULT_PATTERNS,
      enabled: true,
    });
    assert.equal(r.reason, REASONS.NOT_APPLICABLE, `head ${headRollup}`);
    assert.equal(r.greenSha, null);
    assert.equal(
      r.reads.diffs,
      0,
      "a non-candidate head must not read a single ancestor",
    );
  }
});

test("a PENDING and a NONE head over a green docs-only ancestor are tree-equivalent", async () => {
  for (const headRollup of ["PENDING", "NONE", "pending"]) {
    const r = await eng.classifyTreeEquivalence({
      headRollup,
      ancestors: [A("g1", DOCS, "SUCCESS")],
      patterns: eng.DEFAULT_PATTERNS,
      enabled: true,
    });
    assert.equal(r.reason, REASONS.TREE_EQUIVALENT, headRollup);
    assert.equal(r.greenSha, "g1");
  }
});

test("enabled:false is decided first, before anything is read", async () => {
  const r = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [A("g1", () => assert.fail("must not read"), "SUCCESS")],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: false,
  });
  assert.equal(r.reason, REASONS.DISABLED);
});

test("a code path in the delta stops the walk with code-changed and reads no checks", async () => {
  const r = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [
      A("n1", ["docs/a.md", "src/a.ts"], () =>
        assert.fail("rollup read after a code path"),
      ),
      A("g1", DOCS, "SUCCESS"),
    ],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(r.reason, REASONS.CODE_CHANGED);
  assert.match(r.detail, /src\/a\.ts/);
  assert.equal(r.reads.rollups, 0);
});

test("a green ancestor two docs-commits back is found; the non-green docs ancestor is walked past", async () => {
  const r = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [
      A("p1", DOCS, "PENDING"),
      A("n2", DOCS, "NONE"),
      A("g1", DOCS, "SUCCESS"),
      A("old", ["src/x.ts"], "SUCCESS"),
    ],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(r.reason, REASONS.TREE_EQUIVALENT);
  assert.equal(r.greenSha, "g1");
  assert.deepEqual(
    r.reads,
    { diffs: 3, rollups: 3 },
    "1 + docs-only commits on top, no more",
  );
});

test("a FAILURE or CANCELLED ancestor is not green and is walked past, never accepted", async () => {
  for (const bad of ["FAILURE", "CANCELLED", "PENDING", "NONE"]) {
    const r = await eng.classifyTreeEquivalence({
      headRollup: "PENDING",
      ancestors: [A("b1", DOCS, bad)],
      patterns: eng.DEFAULT_PATTERNS,
      enabled: true,
    });
    assert.equal(r.reason, REASONS.NO_GREEN_ANCESTOR, bad);
  }
});

test("zero checks (NONE) on an ancestor is never green", async () => {
  const r = await eng.classifyTreeEquivalence({
    headRollup: "NONE",
    ancestors: [A("z1", DOCS, "NONE")],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(r.reason, REASONS.NO_GREEN_ANCESTOR);
});

test("a diff that cannot be computed is unverifiable — null is not []", async () => {
  const unknownDiff = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [A("g1", null, "SUCCESS")],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(unknownDiff.reason, REASONS.UNVERIFIABLE);
  const noChange = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [A("g1", [], "SUCCESS")],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(
    noChange.reason,
    REASONS.TREE_EQUIVALENT,
    "an empty diff really is nothing changed",
  );
});

test("an ancestor whose checks could not be read is unverifiable, not skipped", async () => {
  const r = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [A("u1", DOCS, "UNKNOWN"), A("g1", DOCS, "SUCCESS")],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(r.reason, REASONS.UNVERIFIABLE);
});

test("no ancestors at all is no-green-ancestor", async () => {
  const r = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(r.reason, REASONS.NO_GREEN_ANCESTOR);
});

test("exitCodeFor: 0 for tree-equivalent and for nothing else", () => {
  for (const reason of Object.values(REASONS)) {
    assert.equal(
      eng.exitCodeFor(reason),
      reason === REASONS.TREE_EQUIVALENT ? 0 : 1,
      reason,
    );
  }
});

// ── patterns ─────────────────────────────────────────────────────────────

test("the default patterns read as intended: **/*.md reaches nested markdown, `*.md` would not", () => {
  const { matchesAnyGlob } = require("../glob-match.js");
  const d = eng.DEFAULT_PATTERNS;
  for (const yes of [
    "README.md",
    "skills/x/SKILL.md",
    "docs/a/b.yml",
    "CHANGELOG.md",
  ]) {
    assert.equal(matchesAnyGlob(yes, d), true, yes);
  }
  for (const no of [".github/workflows/ci.yml", "src/a.ts", "package.json"]) {
    assert.equal(matchesAnyGlob(no, d), false, no);
  }
  assert.equal(
    matchesAnyGlob("skills/x/SKILL.md", ["*.md"]),
    false,
    "the premise of the spelling",
  );
  assert.equal(
    matchesAnyGlob("skills/x/SKILL.md", ["docs/**"]),
    false,
    "the repository override",
  );
});

// ── rollup reduction ─────────────────────────────────────────────────────

test("reduceChecks: decided only at completed, any skipped or neutral check is NONE, zero is NONE, partial is not green", () => {
  const r = eng.reduceChecks;
  assert.equal(r({}), "NONE");
  assert.equal(r({ checkRuns: GREEN }), "SUCCESS");
  // CR-2 (QA cycle 1) and CR2-2 (cycle 2): for an ANCESTOR, which is the whole evidence, green means every
  // check ran and succeeded. ANY skipped or neutral check makes it NONE: a paths-filter "changes" job
  // can succeed while the test jobs are skipped, and that is not verification.
  assert.equal(
    r({
      checkRuns: [
        { status: "completed", conclusion: "skipped" },
        { status: "completed", conclusion: "neutral" },
      ],
    }),
    "NONE",
  );
  assert.equal(
    r({ checkRuns: [{ status: "completed", conclusion: "skipped" }] }),
    "NONE",
  );
  assert.equal(
    r({
      checkRuns: [
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "skipped" },
      ],
    }),
    "NONE",
    "a success beside a skipped job is the paths-filter shape: not evidence on its own",
  );
  assert.equal(
    r({
      checkRuns: [
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "success" },
      ],
    }),
    "SUCCESS",
  );
  assert.equal(
    r({
      checkRuns: [{ status: "completed", conclusion: "skipped" }],
      statuses: [{ state: "success" }],
    }),
    "NONE",
    "a skipped check run still disqualifies, whatever else succeeded",
  );
  assert.equal(r({ checkRuns: [{ status: "in_progress" }] }), "PENDING");
  assert.equal(
    r({ checkRuns: [{ status: "queued", conclusion: null }] }),
    "PENDING",
  );
  assert.equal(
    r({ checkRuns: [...GREEN, { status: "in_progress" }] }),
    "PENDING",
    "one green lane while another is still running is not a green rollup",
  );
  assert.equal(
    r({
      checkRuns: [...GREEN, { status: "completed", conclusion: "failure" }],
    }),
    "FAILURE",
  );
  assert.equal(
    r({ checkRuns: [{ status: "completed", conclusion: "cancelled" }] }),
    "CANCELLED",
  );
  assert.equal(r({ statuses: [{ state: "success" }] }), "SUCCESS");
  assert.equal(r({ statuses: [{ state: "pending" }] }), "PENDING");
  assert.equal(r({ statuses: [{ state: "error" }] }), "FAILURE");
});

test("reduceBitbucketStatuses: empty is NONE, never green", () => {
  const r = eng.reduceBitbucketStatuses;
  assert.equal(r([]), "NONE");
  assert.equal(r(undefined), "NONE");
  assert.equal(
    r([{ state: "SUCCESSFUL" }, { state: "SUCCESSFUL" }]),
    "SUCCESS",
  );
  assert.equal(
    r([{ state: "SUCCESSFUL" }, { state: "INPROGRESS" }]),
    "PENDING",
  );
  assert.equal(r([{ state: "FAILED" }, { state: "SUCCESSFUL" }]), "FAILURE");
  assert.equal(r([{ state: "STOPPED" }]), "CANCELLED");
  assert.equal(
    r([{ state: "SOMETHING_NEW" }]),
    "PENDING",
    "an unknown state is undecided, not green",
  );
});

// ── config ───────────────────────────────────────────────────────────────

test("readConfig: no file or no block gives the defaults", () => {
  const dir = mkRepo();
  try {
    const c = eng.readConfig(dir);
    assert.deepEqual(c, {
      enabled: true,
      patterns: [...eng.DEFAULT_PATTERNS],
      checkCommand: "",
      checkTimeoutSeconds: eng.DEFAULT_CHECK_TIMEOUT_SECONDS,
      settleSeconds: eng.DEFAULT_SETTLE_SECONDS,
    });
    writeFileSync(
      join(dir, "skills-config.yaml"),
      "qa:\n  testArtifactGlobs:\n    - 'x/**'\n",
    );
    assert.deepEqual(eng.readConfig(dir).patterns, [...eng.DEFAULT_PATTERNS]);
  } finally {
    cleanup(dir);
  }
});

test("readConfig: a block list, enabled and checkCommand are read", () => {
  const dir = mkRepo({
    config:
      'ci:\n  docsOnly:\n    enabled: false\n    patterns:\n      - "docs/**"\n    checkCommand: "npm run ci:fast"\n',
  });
  try {
    assert.deepEqual(eng.readConfig(dir), {
      enabled: false,
      patterns: ["docs/**"],
      checkCommand: "npm run ci:fast",
      checkTimeoutSeconds: eng.DEFAULT_CHECK_TIMEOUT_SECONDS,
      settleSeconds: eng.DEFAULT_SETTLE_SECONDS,
    });
  } finally {
    cleanup(dir);
  }
});

test("readConfig: a wrong-typed value is a usage error naming the key, never the defaults", () => {
  const cases = [
    ['ci:\n  docsOnly:\n    patterns: ["docs/**"]\n', /ci\.docsOnly\.patterns/], // inline list parses as a string
    ["ci:\n  docsOnly:\n    patterns: docs\n", /ci\.docsOnly\.patterns/],
    ["ci:\n  docsOnly:\n    enabled: maybe\n", /ci\.docsOnly\.enabled/],
    ["ci:\n  docsOnly:\n    checkCommand: 5\n", /ci\.docsOnly\.checkCommand/],
  ];
  for (const [config, key] of cases) {
    const dir = mkRepo({ config });
    try {
      assert.throws(() => eng.readConfig(dir), key, config);
    } finally {
      cleanup(dir);
    }
  }
});

// ── 2. the CLI against real git ──────────────────────────────────────────

/** A repo whose first commit is code (green) with `n` docs-only commits on top. */
function greenThenDocs(n, { config } = {}) {
  const dir = mkRepo({ config });
  const green = commit(dir, { "src/a.ts": "export const a = 1;\n" }, "code");
  for (let i = 0; i < n; i += 1)
    commit(dir, { [`docs/n${i}.md`]: `# ${i}\n` }, `docs ${i}`);
  return { dir, green };
}

test("CLI: two markdown commits over a green ancestor are tree-equivalent, exit 0, clean JSON", async () => {
  const { dir, green } = greenThenDocs(2);
  try {
    const log = [];
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN }, log }),
    });
    assert.equal(r.exitCode, 0, r.stdout + r.stderr);
    const j = JSON.parse(r.stdout);
    assert.equal(j.reason, "tree-equivalent");
    assert.equal(j.greenSha, green);
    assert.deepEqual(j.changed.sort(), ["docs/n0.md", "docs/n1.md"]);
    assert.ok(
      log.length <= 2 * 3,
      `at most 1 + docs-only-commits-on-top ancestors may be read (2 gh calls each), saw ${log.length}`,
    );
  } finally {
    cleanup(dir);
  }
});

test("CLI: a head that is SUCCESS or FAILURE is never tree-equivalent, whatever its diff", async () => {
  const { dir, green } = greenThenDocs(1);
  try {
    for (const head of ["SUCCESS", "FAILURE", "CANCELLED", "UNKNOWN"]) {
      const r = await runEngine(dir, ["--head-rollup", head, "--json"], {
        exec: fakeExec({ checks: { [green]: GREEN } }),
      });
      assert.equal(r.exitCode, 1, head);
      assert.equal(JSON.parse(r.stdout).reason, "not-applicable", head);
    }
  } finally {
    cleanup(dir);
  }
});

test("CLI: a code path anywhere in the delta is code-changed and exits 1", async () => {
  const { dir, green } = greenThenDocs(1);
  try {
    // Code and docs in the SAME head commit: the delta from the first ancestor already holds the
    // code, so no undecided ancestor stands between the head and it and the answer is final. (Code
    // beneath a docs-only commit whose own CI has not run is NOT final — see CR4-1.)
    commit(
      dir,
      { "src/b.ts": "export const b = 2;\n", "docs/last.md": "# last\n" },
      "code and docs on top",
    );
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "code-changed");
  } finally {
    cleanup(dir);
  }
});

test("CLI: a rename out of code into docs is code-changed — --no-renames is load-bearing", async () => {
  const dir = mkRepo();
  try {
    const green = commit(dir, { "src/a.ts": "export const a = 1;\n" }, "code");
    commit(dir, { "docs/a.md": "export const a = 1;\n" }, "move", {
      rm: ["src/a.ts"],
    });
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(
      r.exitCode,
      1,
      "deleting src/a.ts is a code change even when the new name is docs",
    );
    assert.equal(JSON.parse(r.stdout).reason, "code-changed");
  } finally {
    cleanup(dir);
  }
});

test("CLI: an ancestor with no checks is not green; the walk ends no-green-ancestor", async () => {
  const { dir } = greenThenDocs(2);
  try {
    const r = await runEngine(dir, ["--head-rollup", "NONE", "--json"], {
      exec: fakeExec(),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "no-green-ancestor");
  } finally {
    cleanup(dir);
  }
});

test("CLI: a failing gh read is unverifiable, never 'no CI'", async () => {
  const { dir, green } = greenThenDocs(1);
  try {
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: "FAIL" } }),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "unverifiable");
  } finally {
    cleanup(dir);
  }
});

test("CLI: a commit status context is read as well as the check runs", async () => {
  const { dir, green } = greenThenDocs(1);
  try {
    const ok = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({
        checks: { [green]: GREEN },
        statuses: { [green]: [{ state: "success", updated_at: LONG_AGO }] },
      }),
    });
    assert.equal(ok.exitCode, 0);
    const red = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({
        checks: { [green]: GREEN },
        statuses: { [green]: [{ state: "failure" }] },
      }),
    });
    assert.equal(
      red.exitCode,
      1,
      "a red StatusContext on the ancestor makes it not green",
    );
  } finally {
    cleanup(dir);
  }
});

test("CLI: only the first 20 first-parent ancestors are examined", async () => {
  const { dir, green } = greenThenDocs(21); // green is the 22nd commit: 21 docs commits on top
  try {
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "no-green-ancestor");
    const near = greenThenDocs(20); // green is exactly the 20th ancestor
    try {
      const ok = await runEngine(
        near.dir,
        ["--head-rollup", "PENDING", "--json"],
        {
          exec: fakeExec({ checks: { [near.green]: GREEN } }),
        },
      );
      assert.equal(ok.exitCode, 0, "the 20th ancestor is inside the bound");
    } finally {
      cleanup(near.dir);
    }
  } finally {
    cleanup(dir);
  }
});

test("CLI: ci.docsOnly.enabled:false restores today's behaviour — disabled, exit 1", async () => {
  const { dir, green } = greenThenDocs(1, {
    config: "ci:\n  docsOnly:\n    enabled: false\n",
  });
  try {
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "disabled");
  } finally {
    cleanup(dir);
  }
});

test("CLI: the repository override docs/** rejects a SKILL.md edit that the default would accept", async () => {
  const dir = mkRepo({
    config: 'ci:\n  docsOnly:\n    patterns:\n      - "docs/**"\n',
  });
  try {
    const green = commit(dir, { "src/a.ts": "x\n" }, "code");
    commit(dir, { "skills/x/SKILL.md": "# skill\n" }, "edit a skill");
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "code-changed");
    const def = mkRepo();
    try {
      const g2 = commit(def, { "src/a.ts": "x\n" }, "code");
      commit(def, { "skills/x/SKILL.md": "# skill\n" }, "edit a skill");
      const r2 = await runEngine(def, ["--head-rollup", "PENDING", "--json"], {
        exec: fakeExec({ checks: { [g2]: GREEN } }),
      });
      assert.equal(
        r2.exitCode,
        0,
        "under the consumer default the same edit is docs",
      );
    } finally {
      cleanup(def);
    }
  } finally {
    cleanup(dir);
  }
});

test("CLI: checkCommand runs after a tree-equivalent finding; non-zero is check-failed, exit 1", async () => {
  const mk = (cmd) =>
    greenThenDocs(1, {
      config: `ci:\n  docsOnly:\n    checkCommand: "${cmd}"\n`,
    });
  const bad = mk("exit 3");
  try {
    const r = await runEngine(bad.dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [bad.green]: GREEN } }),
      spawn: (cmd, args, opts) =>
        require("node:child_process").spawnSync(cmd, args, {
          ...opts,
          stdio: "ignore",
        }),
    });
    assert.equal(r.exitCode, 1);
    const j = JSON.parse(r.stdout);
    assert.equal(j.reason, "check-failed");
    assert.equal(j.checkExit, 3);
    assert.equal(
      j.greenSha,
      bad.green,
      "the finding is kept so the record can say what was checked",
    );
  } finally {
    cleanup(bad.dir);
  }
  const good = mk("true");
  try {
    const r = await runEngine(
      good.dir,
      ["--head-rollup", "PENDING", "--json"],
      {
        exec: fakeExec({ checks: { [good.green]: GREEN } }),
        spawn: (cmd, args, opts) =>
          require("node:child_process").spawnSync(cmd, args, {
            ...opts,
            stdio: "ignore",
          }),
      },
    );
    assert.equal(r.exitCode, 0);
    assert.equal(JSON.parse(r.stdout).checkExit, 0);
  } finally {
    cleanup(good.dir);
  }
});

test("CLI: checkCommand does not run on a 'no' — it is the last gate, not a first one", async () => {
  const marker = join(tmpdir(), `ci-tree-eq-marker-${process.pid}`);
  const { dir } = greenThenDocs(1, {
    config: `ci:\n  docsOnly:\n    checkCommand: "touch ${marker}"\n`,
  });
  try {
    let ran = false;
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec(), // no green ancestor
      spawn: () => {
        ran = true;
        return { status: 0 };
      },
    });
    assert.equal(r.exitCode, 1);
    assert.equal(ran, false);
  } finally {
    cleanup(dir);
  }
});

test("CLI: usage errors exit 2 and name the problem; a malformed block never falls back to defaults", async () => {
  const { dir } = greenThenDocs(1);
  try {
    for (const argv of [
      [],
      ["--head-rollup"],
      ["--head-rollup", "PENDING", "--bogus"],
      ["--head-rollup", "PENDING", "--platform", "svn"],
    ]) {
      const r = await runEngine(dir, argv, { exec: fakeExec() });
      assert.equal(r.exitCode, 2, JSON.stringify(argv));
      assert.match(r.stderr, /usage:/);
    }
  } finally {
    cleanup(dir);
  }
  const bad = greenThenDocs(1, {
    config: 'ci:\n  docsOnly:\n    patterns: ["docs/**"]\n',
  });
  try {
    const r = await runEngine(bad.dir, ["--head-rollup", "PENDING"], {
      exec: fakeExec(),
    });
    assert.equal(r.exitCode, 2);
    assert.match(r.stderr, /ci\.docsOnly\.patterns/);
  } finally {
    cleanup(bad.dir);
  }
});

test("CLI: an unexpected failure exits 1 as unverifiable — a throw must never read as a pass", async () => {
  const { dir } = greenThenDocs(1);
  try {
    const exec = (cmd, args, opts) => {
      if (cmd === "git" && args[0] === "rev-list")
        throw new Error("fatal: shallow");
      return execFileSync(cmd, args, opts);
    };
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec,
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "unverifiable");
  } finally {
    cleanup(dir);
  }
});

test("CLI: a git diff that fails (a shallow clone lacking the ancestor) is unverifiable — never docs-only", async () => {
  const { dir, green } = greenThenDocs(1);
  try {
    const exec = (cmd, args, opts) => {
      if (cmd === "git" && args[0] === "diff")
        throw new Error("fatal: bad object");
      return fakeExec({ checks: { [green]: GREEN } })(cmd, args, opts);
    };
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec,
    });
    assert.equal(r.exitCode, 1);
    assert.equal(
      JSON.parse(r.stdout).reason,
      "unverifiable",
      "a diff that cannot be read must not collapse to []",
    );
  } finally {
    cleanup(dir);
  }
});

test("CLI: a throw outside any handled read (HEAD cannot be resolved) exits 1 as unverifiable, in text and JSON mode", async () => {
  const { dir } = greenThenDocs(1);
  try {
    const exec = (cmd, args, opts) => {
      if (cmd === "git" && args[0] === "rev-parse")
        throw new Error("fatal: not a git repository");
      return execFileSync(cmd, args, opts);
    };
    for (const argv of [
      ["--head-rollup", "PENDING", "--json"],
      ["--head-rollup", "PENDING"],
    ]) {
      const r = await runEngine(dir, argv, { exec });
      assert.equal(
        r.exitCode,
        1,
        `${argv.join(" ")} — a throw must never read as a pass`,
      );
      assert.match(r.stdout, /unverifiable/);
    }
  } finally {
    cleanup(dir);
  }
});

test("CR-2: an ancestor whose only checks were skipped is not green; the walk ends no-green-ancestor", async () => {
  const { dir, green } = greenThenDocs(2);
  try {
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({
        checks: { [green]: [{ status: "completed", conclusion: "skipped" }] },
      }),
    });
    assert.equal(
      r.exitCode,
      1,
      "a skipped-only ancestor launders a commit CI never ran",
    );
    assert.equal(JSON.parse(r.stdout).reason, "no-green-ancestor");
  } finally {
    cleanup(dir);
  }
});

test("CR-1: a head that changes code AND widens ci.docsOnly.patterns in the same delta is code-changed", async () => {
  for (const widen of [
    'ci:\n  docsOnly:\n    patterns:\n      - "**"\n',
    'ci:\n  docsOnly:\n    checkCommand: "true"\n',
    'ci:\n  docsOnly:\n    patterns:\n      - "**"\n    checkCommand: "true"\n',
  ]) {
    const dir = mkRepo();
    try {
      const green = commit(
        dir,
        { "src/a.js": "export const a = 1;\n" },
        "code",
      );
      commit(
        dir,
        {
          "src/a.js": "export const a = 2; // unreviewed\n",
          "skills-config.yaml": widen,
        },
        "code + widen",
      );
      const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
        exec: fakeExec({ checks: { [green]: GREEN } }),
      });
      assert.equal(
        r.exitCode,
        1,
        `the commit decided its own diff under config ${JSON.stringify(widen)}`,
      );
      assert.equal(JSON.parse(r.stdout).reason, "code-changed");
      assert.match(
        JSON.parse(r.stdout).detail,
        /skills-config\.yaml|src\/a\.js/,
      );
    } finally {
      cleanup(dir);
    }
  }
});

test("CR-1: a config change is code even when it is the ONLY change, at any depth; the owner's committed config still applies elsewhere", async () => {
  const dir = mkRepo();
  try {
    const green = commit(dir, { "src/a.js": "x\n" }, "code");
    commit(
      dir,
      {
        "skills-config.yaml": 'ci:\n  docsOnly:\n    patterns:\n      - "**"\n',
      },
      "config only",
    );
    const only = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(
      only.exitCode,
      1,
      "changing the rule's own configuration is never a docs change",
    );
    const nested = mkRepo();
    try {
      const g2 = commit(nested, { "src/a.js": "x\n" }, "code");
      commit(nested, { "pkg/skills-config.yaml": "ci: {}\n" }, "nested config");
      const r2 = await runEngine(
        nested,
        ["--head-rollup", "PENDING", "--json"],
        {
          exec: fakeExec({ checks: { [g2]: GREEN } }),
        },
      );
      assert.equal(
        r2.exitCode,
        1,
        "a config file at any depth is not documentation",
      );
    } finally {
      cleanup(nested);
    }
  } finally {
    cleanup(dir);
  }
  // The trust boundary, stated as a test: a config the OWNER committed before the green commit is the
  // owner's rule and applies; only a change in the delta being judged is distrusted.
  const owned = mkRepo({
    config: 'ci:\n  docsOnly:\n    patterns:\n      - "notes/**"\n',
  });
  try {
    git(owned, "add", "-A");
    const g3 = commit(owned, { "src/a.js": "x\n" }, "code + owner config");
    commit(owned, { "notes/n.txt": "n\n" }, "a note");
    const ok = await runEngine(owned, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [g3]: GREEN } }),
    });
    assert.equal(
      ok.exitCode,
      0,
      "the owner's committed patterns apply to paths other than the config",
    );
  } finally {
    cleanup(owned);
  }
});

test("CR-4: a file whose NAME the matcher would normalise into docs/** is code, not documentation", async () => {
  assert.equal(eng.isDocsPath("docs/a.md", eng.DEFAULT_PATTERNS), true);
  assert.equal(eng.isDocsPath("docs/a.md", ["docs/**"]), true);
  for (const evil of [
    "docs\\evil.js",
    " docs/x.js",
    "/docs/x.js",
    "docs/x.js ",
    "./docs/x.js",
  ]) {
    assert.equal(
      eng.isDocsPath(evil, ["docs/**"]),
      false,
      `${JSON.stringify(evil)} is normalised by the matcher into a docs path`,
    );
  }
  const dir = mkRepo();
  try {
    const green = commit(dir, { "src/a.js": "x\n" }, "code");
    commit(
      dir,
      { "docs\\evil.js": "process.exit(0)\n" },
      "backslash name at the root",
    );
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
      env: {},
    });
    const j = JSON.parse(r.stdout);
    assert.equal(r.exitCode, 1);
    assert.equal(j.reason, "code-changed");
  } finally {
    cleanup(dir);
  }
});

test("CR-5: --pr is recorded in the JSON for the caller's log and no decision reads it", async () => {
  const { dir, green } = greenThenDocs(1);
  try {
    const withPr = await runEngine(
      dir,
      ["--head-rollup", "PENDING", "--pr", "543", "--json"],
      {
        exec: fakeExec({ checks: { [green]: GREEN } }),
      },
    );
    const without = await runEngine(
      dir,
      ["--head-rollup", "PENDING", "--json"],
      {
        exec: fakeExec({ checks: { [green]: GREEN } }),
      },
    );
    assert.equal(JSON.parse(withPr.stdout).pr, "543");
    assert.equal(JSON.parse(without.stdout).pr, null);
    assert.equal(
      withPr.exitCode,
      without.exitCode,
      "the PR number must not change the answer",
    );
  } finally {
    cleanup(dir);
  }
});

// ── QA cycle 2 (refute pass): CR2-1 .. CR2-9 ─────────────────────────────

test("CR2-1: a red docs-only ancestor stops the walk; the head inherits its red", async () => {
  const red = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [A("r1", DOCS, "FAILURE"), A("g1", DOCS, "SUCCESS")],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(red.reason, REASONS.NO_GREEN_ANCESTOR);
  assert.match(red.detail, /r1 is red/);
  assert.equal(red.greenSha, null, "an older green commit must not be named");
  // CANCELLED is walked past: cancel-in-progress cancels the run of every superseded push.
  const cancelled = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [A("c1", DOCS, "CANCELLED"), A("g1", DOCS, "SUCCESS")],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(cancelled.reason, REASONS.TREE_EQUIVALENT);
  assert.equal(cancelled.greenSha, "g1");
});

test("CR2-1: CLI — code c1, green code c2, RED docs c3, docs head c4 is not tree-equivalent", async () => {
  const dir = mkRepo();
  try {
    commit(dir, { "src/a.js": "1\n" }, "c1");
    const c2 = commit(dir, { "src/a.js": "2\n" }, "c2");
    const c3 = commit(dir, { "docs/a.md": "x\n" }, "c3 docs, CI red");
    commit(dir, { "docs/b.md": "y\n" }, "c4 docs head");
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({
        checks: {
          [c2]: GREEN,
          [c3]: [{ status: "completed", conclusion: "failure" }],
        },
      }),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "no-green-ancestor");
  } finally {
    cleanup(dir);
  }
});

test("CR2-2: a success beside skipped jobs (the paths-filter shape) is not a green ancestor; an older fully green one still is", async () => {
  const SKIPPED_MIX = [
    ...GREEN,
    { status: "completed", conclusion: "skipped" },
  ];
  const { dir, green } = greenThenDocs(2);
  try {
    const only = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: SKIPPED_MIX } }),
    });
    assert.equal(only.exitCode, 1);
    assert.equal(JSON.parse(only.stdout).reason, "no-green-ancestor");
  } finally {
    cleanup(dir);
  }
  const r = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [
      A("mix", DOCS, eng.reduceChecks({ checkRuns: SKIPPED_MIX })),
      A("full", DOCS, eng.reduceChecks({ checkRuns: [...GREEN, ...GREEN] })),
    ],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(r.reason, REASONS.TREE_EQUIVALENT);
  assert.equal(
    r.greenSha,
    "full",
    "the walk continues past the skipped-mix ancestor to the fully green one",
  );
});

test("CR2-3: a --head that is not the checked-out HEAD is unverifiable and runs no check", async () => {
  const { dir, green } = greenThenDocs(2, {
    config: 'ci:\n  docsOnly:\n    checkCommand: "true"\n',
  });
  try {
    const earlier = git(dir, "rev-parse", "HEAD~1");
    let ran = false;
    const r = await runEngine(
      dir,
      ["--head-rollup", "PENDING", "--head", earlier, "--json"],
      {
        exec: fakeExec({ checks: { [green]: GREEN } }),
        spawn: () => {
          ran = true;
          return { status: 0 };
        },
      },
    );
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "unverifiable");
    assert.match(JSON.parse(r.stdout).detail, /not the checked-out HEAD/);
    assert.equal(
      ran,
      false,
      "the local check must not run against another tree",
    );
    const same = await runEngine(
      dir,
      [
        "--head-rollup",
        "PENDING",
        "--head",
        git(dir, "rev-parse", "HEAD"),
        "--json",
      ],
      {
        exec: fakeExec({ checks: { [green]: GREEN } }),
        spawn: () => ({ status: 0 }),
      },
    );
    assert.equal(
      same.exitCode,
      0,
      "the checked-out HEAD, spelled as a full sha, is accepted",
    );
  } finally {
    cleanup(dir);
  }
});

test("CR2-4: an unknown or case-mangled ci.docsOnly key is a usage error naming it", async () => {
  for (const [config, needle] of [
    ['ci:\n  docsOnly:\n    checkcommand: "false"\n', /checkcommand/],
    ["ci:\n  docsOnly:\n    pattern:\n      - 'x'\n", /pattern/],
    ["ci:\n  docsonly:\n    enabled: false\n", /docsonly/],
  ]) {
    const { dir } = greenThenDocs(1, { config });
    try {
      const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
        exec: fakeExec(),
      });
      assert.equal(r.exitCode, 2, config);
      assert.match(r.stderr, needle);
    } finally {
      cleanup(dir);
    }
  }
});

test("CR2-5: a submodule pointer under a docs pattern is code, and diff.ignoreSubmodules cannot hide it", async () => {
  for (const hide of [false, true]) {
    const dir = mkRepo();
    try {
      const green = commit(dir, { "src/a.js": "x\n" }, "code");
      if (hide) git(dir, "config", "diff.ignoreSubmodules", "all");
      git(
        dir,
        "update-index",
        "--add",
        "--cacheinfo",
        `160000,${green},docs/vendor`,
      );
      git(dir, "commit", "-q", "-m", "bump a gitlink under docs/");
      const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
        exec: fakeExec({ checks: { [green]: GREEN } }),
      });
      assert.equal(r.exitCode, 1, `ignoreSubmodules hidden=${hide}`);
      assert.equal(JSON.parse(r.stdout).reason, "code-changed");
      assert.match(JSON.parse(r.stdout).detail, /gitlink/);
    } finally {
      cleanup(dir);
    }
  }
});

test("CR2-6: both GitHub reads paginate — a failing status beyond the first page cannot be missed", async () => {
  const { dir, green } = greenThenDocs(1);
  try {
    const log = [];
    await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN }, log }),
    });
    const calls = log.filter((l) => l.includes(green));
    assert.equal(calls.length, 2, "one check-runs read and one status read");
    for (const c of calls) assert.match(c, /--paginate/, c);
  } finally {
    cleanup(dir);
  }
});

test("CR2-7: a checkCommand that hangs is killed at ci.docsOnly.checkTimeoutSeconds and is check-failed", async () => {
  const { dir, green } = greenThenDocs(1, {
    config:
      'ci:\n  docsOnly:\n    checkCommand: "sleep 20"\n    checkTimeoutSeconds: 1\n',
  });
  try {
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    // The bound is proven by the finding below (a check that was not killed would end tree-equivalent),
    // not by a wall-clock threshold, which would be load-sensitive.
    assert.equal(r.exitCode, 1);
    const j = JSON.parse(r.stdout);
    assert.equal(j.reason, "check-failed");
    assert.match(j.detail, /timed out after 1s/);
  } finally {
    cleanup(dir);
  }
  for (const bad of ["0", "-3", "1.5", "soon"]) {
    const t = greenThenDocs(1, {
      config: `ci:\n  docsOnly:\n    checkTimeoutSeconds: ${bad}\n`,
    });
    try {
      const r = await runEngine(t.dir, ["--head-rollup", "PENDING"], {
        exec: fakeExec(),
      });
      assert.equal(r.exitCode, 2, bad);
      assert.match(r.stderr, /checkTimeoutSeconds/);
    } finally {
      cleanup(t.dir);
    }
  }
});

test("CR2-8: an empty option value (an unbound shell variable) is a usage error, never a silent default", async () => {
  const { dir } = greenThenDocs(1);
  try {
    for (const argv of [
      ["--head-rollup", "PENDING", "--head", ""],
      ["--head-rollup", ""],
      ["--head-rollup", "PENDING", "--pr", ""],
    ]) {
      const r = await runEngine(dir, argv, { exec: fakeExec() });
      assert.equal(r.exitCode, 2, JSON.stringify(argv));
      assert.match(r.stderr, /non-empty value/);
    }
  } finally {
    cleanup(dir);
  }
});

test("CR2-9: run from a subdirectory the engine still finds the repository's config", async () => {
  const { dir, green } = greenThenDocs(1, {
    config: "ci:\n  docsOnly:\n    enabled: false\n",
  });
  try {
    const sub = join(dir, "src");
    const r = await runEngine(sub, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(
      JSON.parse(r.stdout).reason,
      "disabled",
      "the root config applies, not the defaults",
    );
  } finally {
    cleanup(dir);
  }
});

// ── QA cycle 3 (safety re-probe): CR3-1 .. CR3-8 ─────────────────────────

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

test("CR3-1: an ancestor whose newest check completed inside the settle window is PENDING, not green", async () => {
  const s = eng.settle;
  const now = Date.parse("2026-10-01T12:00:00Z");
  assert.equal(
    s("SUCCESS", ["2026-10-01T11:59:30Z"], 300, now),
    "PENDING",
    "30 s old: still registering",
  );
  assert.equal(
    s("SUCCESS", ["2026-10-01T11:50:00Z"], 300, now),
    "SUCCESS",
    "10 min old: settled",
  );
  assert.equal(
    s("SUCCESS", ["2026-10-01T11:50:00Z", "2026-10-01T11:59:59Z"], 300, now),
    "PENDING",
    "the NEWEST stamp decides",
  );
  assert.equal(
    s("SUCCESS", [], 300, now),
    "PENDING",
    "no timestamp: cannot be shown to have settled",
  );
  assert.equal(s("SUCCESS", ["not a date"], 300, now), "PENDING");
  assert.equal(s("SUCCESS", [undefined], 300, now), "PENDING");
  assert.equal(
    s("SUCCESS", ["2026-10-01T11:59:59Z"], 0, now),
    "SUCCESS",
    "settleSeconds 0 turns the guard off",
  );
  assert.equal(
    s("FAILURE", ["2026-10-01T11:59:59Z"], 300, now),
    "FAILURE",
    "only a SUCCESS is held back",
  );
});

test("CR3-1: CLI — one fast lane completed a moment ago is not a green ancestor; a settled one is; the window is configurable", async () => {
  const { dir, green } = greenThenDocs(2);
  try {
    const fresh = [
      { status: "completed", conclusion: "success", completed_at: iso(10_000) },
    ];
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: fresh } }),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "no-green-ancestor");
    const old = [
      {
        status: "completed",
        conclusion: "success",
        completed_at: iso(3_600_000),
      },
    ];
    const ok = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: old } }),
    });
    assert.equal(ok.exitCode, 0);
    const none = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({
        checks: { [green]: [{ status: "completed", conclusion: "success" }] },
      }),
    });
    assert.equal(
      none.exitCode,
      1,
      "a success with no timestamp is not shown to have settled",
    );
  } finally {
    cleanup(dir);
  }
  const off = greenThenDocs(1, {
    config: "ci:\n  docsOnly:\n    settleSeconds: 0\n",
  });
  try {
    const r = await runEngine(off.dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({
        checks: {
          [off.green]: [
            {
              status: "completed",
              conclusion: "success",
              completed_at: iso(1000),
            },
          ],
        },
      }),
    });
    assert.equal(r.exitCode, 0, "settleSeconds: 0 disables the guard");
  } finally {
    cleanup(off.dir);
  }
  for (const bad of ["-1", "2.5", "soon"]) {
    const t = greenThenDocs(1, {
      config: `ci:\n  docsOnly:\n    settleSeconds: ${bad}\n`,
    });
    try {
      const r = await runEngine(t.dir, ["--head-rollup", "PENDING"], {
        exec: fakeExec(),
      });
      assert.equal(r.exitCode, 2, bad);
      assert.match(r.stderr, /settleSeconds/);
    } finally {
      cleanup(t.dir);
    }
  }
});

test("CR3-2: a YAML block scalar checkCommand is refused, not run as a redirection that exits 0", async () => {
  for (const scalar of [">-", ">", "|", "|+", ">2-"]) {
    const config = `ci:\n  docsOnly:\n    checkCommand: ${scalar}\n      npm run x && exit 1\n`;
    const { dir, green } = greenThenDocs(1, { config });
    try {
      const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
        exec: fakeExec({ checks: { [green]: GREEN } }),
      });
      assert.equal(r.exitCode, 2, scalar);
      assert.match(r.stderr, /block scalar/);
      assert.equal(
        existsSync(join(dir, "-")),
        false,
        "no stray file created by a redirection",
      );
    } finally {
      cleanup(dir);
    }
  }
  const ok = greenThenDocs(1, {
    config:
      'ci:\n  docsOnly:\n    checkCommand: "echo a > /dev/null && true"\n',
  });
  try {
    const r = await runEngine(ok.dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [ok.green]: GREEN } }),
    });
    assert.equal(r.exitCode, 0, "a one-line command containing > is fine");
  } finally {
    cleanup(ok.dir);
  }
});

test("CR3-3: a ci block that is not a mapping, or a near-miss spelling, is a usage error — never the defaults", async () => {
  for (const [config, needle] of [
    ["ci: { docsOnly: { enabled: false } }\n", /ci must be a block mapping/],
    ["ci: false\n", /ci must be a block mapping/],
    ["ci: nope\n", /ci must be a block mapping/],
    ["ci:\n  docs-only:\n    enabled: false\n", /docs-only/],
    ["ci:\n  docs_only:\n    enabled: false\n", /docs_only/],
    ["CI:\n  docsOnly:\n    enabled: false\n", /looks like ci/],
    [
      "ci:\n  docsOnly: { enabled: false }\n",
      /ci\.docsOnly must be a block mapping/,
    ],
  ]) {
    const { dir } = greenThenDocs(1, { config });
    try {
      const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
        exec: fakeExec(),
      });
      assert.equal(r.exitCode, 2, config);
      assert.match(r.stderr, needle, config);
    } finally {
      cleanup(dir);
    }
  }
  const empty = greenThenDocs(1, { config: "ci:\n" });
  try {
    const r = await runEngine(
      empty.dir,
      ["--head-rollup", "PENDING", "--json"],
      {
        exec: fakeExec({ checks: { [empty.green]: GREEN } }),
      },
    );
    assert.equal(r.exitCode, 0, "an empty ci block is 'not configured'");
  } finally {
    cleanup(empty.dir);
  }
});

test("CR3-4: the one-shot rollup reads in develop-next and develop-batch print their value", () => {
  for (const skill of ["develop-next", "develop-batch"]) {
    const text = waitSites.find((x) => x.skill === skill).text;
    assert.match(
      text,
      /CI_ROLLUP=\$\(gh pr view[\s\S]*?echo "UNKNOWN"\)\n *# [^\n]*\n *echo "CI rollup: \$CI_ROLLUP"/,
      `${skill}: the assignment is silent, so the next block cannot re-bind it`,
    );
  }
});

test("CR3-5: a Bitbucket next link is followed only on the Bitbucket API; the credential never leaves it", async () => {
  const { dir } = bbRepo();
  try {
    const urls = [];
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      env: bbEnv,
      fetchImpl: async (url) => {
        urls.push(url);
        return resp(200, {
          values: [{ state: "SUCCESSFUL", updated_on: LONG_AGO }],
          next: "https://evil.example/steal",
        });
      },
    });
    assert.deepEqual(
      urls.filter((u) => !u.startsWith("https://api.bitbucket.org/2.0/")),
      [],
      "no request may go to another host with the Authorization header",
    );
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "unverifiable");
    const same = [];
    const ok = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      env: bbEnv,
      fetchImpl: async (url) => {
        same.push(url);
        return same.length === 1
          ? resp(200, {
              values: [{ state: "SUCCESSFUL", updated_on: LONG_AGO }],
              next: "https://api.bitbucket.org/2.0/repositories/acme/repo/commit/x/statuses?page=2",
            })
          : resp(200, {
              values: [{ state: "SUCCESSFUL", updated_on: LONG_AGO }],
            });
      },
    });
    assert.equal(
      ok.exitCode,
      0,
      "a next link on the Bitbucket API is followed",
    );
  } finally {
    cleanup(dir);
  }
});

test("CR3-6: the configuration comes from the commit judged — an uncommitted edit that widens it is not consulted", async () => {
  const dir = mkRepo({
    config: 'ci:\n  docsOnly:\n    patterns:\n      - "docs/**"\n',
  });
  try {
    const green = commit(dir, { "src/a.js": "1\n" }, "code + narrow config");
    commit(dir, { "src/b.js": "2 unreviewed\n" }, "code on top");
    writeFileSync(
      join(dir, "skills-config.yaml"),
      'ci:\n  docsOnly:\n    patterns:\n      - "**"\n',
    );
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(
      r.exitCode,
      1,
      "the dirty widened config decided a committed delta",
    );
    assert.equal(JSON.parse(r.stdout).reason, "code-changed");
    // and a config that exists only on disk (never committed) is 'not configured'
    const bare = mkRepo();
    try {
      const g2 = commit(bare, { "src/a.js": "1\n" }, "code");
      commit(bare, { "README.md": "r\n" }, "docs");
      writeFileSync(
        join(bare, "skills-config.yaml"),
        "ci:\n  docsOnly:\n    enabled: false\n",
      );
      const r2 = await runEngine(bare, ["--head-rollup", "PENDING", "--json"], {
        exec: fakeExec({ checks: { [g2]: GREEN } }),
      });
      assert.equal(
        JSON.parse(r2.stdout).reason,
        "tree-equivalent",
        "an uncommitted config is not the rule's configuration",
      );
    } finally {
      cleanup(bare);
    }
  } finally {
    cleanup(dir);
  }
});

test("CR3-7: a huge delta cannot truncate the --json record through a pipe, and the process drains before it exits", () => {
  const dir = mkRepo();
  const green = commit(dir, { "src/a.js": "1\n" }, "code");
  const files = {};
  for (let i = 0; i < 4000; i += 1)
    files[`docs/section-${String(i).padStart(5, "0")}/page-${i}.md`] = "x\n";
  commit(dir, files, "a very large docs-only commit");
  const bin = fakeGhOnPath(green);
  try {
    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      VCS: "github",
    };
    // A shell pipeline so the child writes to a PIPE, the shape that truncated.
    let r;
    for (let attempt = 0; attempt <= CLI_BUDGET.retries; attempt += 1) {
      r = spawnSync(
        "sh",
        [
          "-c",
          `"${process.execPath}" "${ENGINE_PATH}" --head-rollup PENDING --json | cat`,
        ],
        {
          cwd: dir,
          env,
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          timeout: CLI_BUDGET.timeoutMs,
        },
      );
      if (!neverRan(r)) break;
    }
    assert.ok(!neverRan(r), `the CLI never ran: ${r.error ?? r.signal}`);
    const j = JSON.parse(r.stdout);
    assert.equal(j.reason, "tree-equivalent");
    assert.equal(j.changedCount, 4000, "the full count is kept");
    assert.equal(
      j.changed.length,
      200,
      "the listing is capped so the record stays small",
    );
    assert.ok(
      r.stdout.length < 60_000,
      `the record is ${r.stdout.length} bytes`,
    );
  } finally {
    cleanup(dir);
    cleanup(bin);
  }
  const src = readFileSync(ENGINE_PATH, "utf8");
  assert.ok(
    !/process\.exit\([^)]/.test(src),
    "process.exit(code) with output pending is the truncation",
  );
});

test("CR3-8: the gitlink marker is rejected before any pattern, so a broad `**` cannot accept a submodule bump", async () => {
  assert.equal(eng.isDocsPath(":gitlink:docs/vendor", ["**"]), false);
  assert.equal(eng.isDocsPath(":gitlink:docs/vendor", ["*"]), false);
  const dir = mkRepo({
    config: 'ci:\n  docsOnly:\n    patterns:\n      - "**"\n',
  });
  try {
    const green = commit(dir, { "src/a.js": "x\n" }, "code + broad config");
    git(
      dir,
      "update-index",
      "--add",
      "--cacheinfo",
      `160000,${green},docs/vendor`,
    );
    git(dir, "commit", "-q", "-m", "bump a gitlink");
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "code-changed");
  } finally {
    cleanup(dir);
  }
});

test("review CR-10: the 6c poll turns the rule OFF when jq is missing, so a configured check is not re-run every 30 s", () => {
  assert.match(
    finalise,
    /command -v jq >\/dev\/null 2>&1 \|\| \{[^\n]*ENGINE=""; \}/,
  );
  const { dir, green } = greenThenDocs(1);
  try {
    const head = git(dir, "rev-parse", "HEAD");
    // A PATH with the tools the poll needs but NOT jq.
    const bin = pollBin(head, green);
    for (const tool of ["bash", "sh", "cut", "git", "cat", "dirname", "env"]) {
      const found = spawnSync("sh", ["-c", `command -v ${tool}`], {
        encoding: "utf8",
      }).stdout.trim();
      if (found) symlinkSync(found, join(bin, tool));
    }
    symlinkSync(process.execPath, join(bin, "node"));
    const work = mkdtempSync(join(tmpdir(), "ci-tree-eq-nojq-"));
    const script = join(work, "poll.sh");
    const result = join(work, "result.txt");
    const rollupFile = join(work, "rollup.txt");
    writeFileSync(script, pollScript());
    writeFileSync(rollupFile, "PENDING");
    const log = join(work, "engine.log");
    writeFileSync(log, "");
    const shim = countingEngine(log);
    try {
      const r = spawnSync(
        "bash",
        [script, "42", head, "90", result, "3", shim],
        {
          cwd: dir,
          env: { PATH: bin, VCS: "github", FAKE_ROLLUP_FILE: rollupFile },
          encoding: "utf8",
          timeout: CLI_BUDGET.timeoutMs,
        },
      );
      assert.ok(!neverRan(r), `the poll never ran: ${r.error ?? r.signal}`);
      assert.equal(
        readFileSync(result, "utf8").trim(),
        `PENDING ${head} 3 90s TREE_EQ=`,
      );
      assert.equal(
        readFileSync(log, "utf8").split("\n").filter(Boolean).length,
        0,
        "the engine was never asked",
      );
      assert.match(r.stderr, /jq not found/);
    } finally {
      cleanup(work);
      rmSync(shim, { force: true });
      cleanup(bin);
    }
  } finally {
    cleanup(dir);
  }
});

// ── Bitbucket ────────────────────────────────────────────────────────────

function bbRepo() {
  const { dir, green } = greenThenDocs(1);
  git(dir, "remote", "add", "origin", "git@bitbucket.org:acme/repo.git");
  return { dir, green };
}
const bbEnv = { VCS: "bitbucket", BITBUCKET_ACCESS_TOKEN: "t" };
const resp = (status, body) => ({ status, json: async () => body });

test("Bitbucket: SUCCESSFUL statuses on the ancestor are tree-equivalent", async () => {
  const { dir, green } = bbRepo();
  try {
    const urls = [];
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      env: bbEnv,
      fetchImpl: async (url) => {
        urls.push(url);
        return resp(200, {
          values: [{ state: "SUCCESSFUL", updated_on: LONG_AGO }],
        });
      },
    });
    assert.equal(r.exitCode, 0, r.stdout);
    assert.equal(JSON.parse(r.stdout).greenSha, green);
    assert.match(
      urls[0],
      /repositories\/acme\/repo\/commit\/[0-9a-f]+\/statuses/,
    );
  } finally {
    cleanup(dir);
  }
});

test("Bitbucket: a 403 is unverifiable — never 'no CI'", async () => {
  const { dir } = bbRepo();
  try {
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      env: bbEnv,
      fetchImpl: async () => resp(403, {}),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "unverifiable");
  } finally {
    cleanup(dir);
  }
});

test("Bitbucket: an empty status list is NONE, so the walk ends no-green-ancestor", async () => {
  const { dir } = bbRepo();
  try {
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      env: bbEnv,
      fetchImpl: async () => resp(200, { values: [] }),
    });
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "no-green-ancestor");
  } finally {
    cleanup(dir);
  }
});

test("Bitbucket: no credential is unverifiable, and a partial page list is not decided on", async () => {
  const { dir } = bbRepo();
  try {
    const none = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      env: { VCS: "bitbucket" },
      fetchImpl: async () =>
        assert.fail("must not call out without a credential"),
    });
    assert.equal(JSON.parse(none.stdout).reason, "unverifiable");
    const endless = await runEngine(
      dir,
      ["--head-rollup", "PENDING", "--json"],
      {
        env: bbEnv,
        fetchImpl: async () =>
          resp(200, {
            values: [{ state: "SUCCESSFUL" }],
            next: "https://api.bitbucket.org/next",
          }),
      },
    );
    assert.equal(JSON.parse(endless.stdout).reason, "unverifiable");
  } finally {
    cleanup(dir);
  }
});

// ── a real process, through a fake gh on PATH ────────────────────────────

function spawnCli(dir, argv, env) {
  let r;
  for (let attempt = 0; attempt <= CLI_BUDGET.retries; attempt += 1) {
    r = spawnSync(process.execPath, [ENGINE_PATH, ...argv], {
      cwd: dir,
      env,
      encoding: "utf8",
      timeout: CLI_BUDGET.timeoutMs,
    });
    if (!neverRan(r)) return r;
  }
  return r;
}

function fakeGhOnPath(green) {
  const bin = mkdtempSync(join(tmpdir(), "ci-tree-eq-bin-"));
  const gh = join(bin, "gh");
  writeFileSync(
    gh,
    `#!/bin/sh
case "$*" in
  *"commits/${green}/check-runs"*) echo '{"status":"completed","conclusion":"success","completed_at":"2020-01-01T00:00:00Z"}' ;;
  *) : ;;
esac
`,
  );
  chmodSync(gh, 0o755);
  return bin;
}

test("process: exit 0 only for tree-equivalent; stdout is pure JSON; the check's own output goes to stderr", () => {
  const { dir, green } = greenThenDocs(1, {
    config: 'ci:\n  docsOnly:\n    checkCommand: "echo from-the-check"\n',
  });
  const bin = fakeGhOnPath(green);
  try {
    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      VCS: "github",
    };
    const yes = spawnCli(dir, ["--head-rollup", "PENDING", "--json"], env);
    assert.ok(!neverRan(yes), `the CLI never ran: ${yes.error ?? yes.signal}`);
    assert.equal(yes.status, 0, yes.stderr);
    assert.equal(
      JSON.parse(yes.stdout).reason,
      "tree-equivalent",
      "stdout must be parseable JSON",
    );
    assert.match(yes.stderr, /from-the-check/);
    const no = spawnCli(dir, ["--head-rollup", "SUCCESS"], env);
    assert.equal(no.status, 1);
    const usage = spawnCli(dir, [], env);
    assert.equal(usage.status, 2);
  } finally {
    cleanup(dir);
    cleanup(bin);
  }
});

test("process: invoked through a symlinked directory it still runs (the .agents/skills shape)", async () => {
  const { symlinkSync } = await import("node:fs");
  const { dir, green } = greenThenDocs(1);
  const bin = fakeGhOnPath(green);
  const linkParent = mkdtempSync(join(tmpdir(), "ci-tree-eq-link-"));
  try {
    const link = join(linkParent, "linked");
    symlinkSync(dirname(ENGINE_PATH), link, "dir");
    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      VCS: "github",
    };
    let r;
    for (let attempt = 0; attempt <= CLI_BUDGET.retries; attempt += 1) {
      r = spawnSync(
        process.execPath,
        [
          join(link, "ci-tree-equivalence.js"),
          "--head-rollup",
          "PENDING",
          "--json",
        ],
        {
          cwd: dir,
          env,
          encoding: "utf8",
          timeout: CLI_BUDGET.timeoutMs,
        },
      );
      if (!neverRan(r)) break;
    }
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
    assert.equal(JSON.parse(r.stdout).reason, "tree-equivalent");
  } finally {
    cleanup(dir);
    cleanup(bin);
    cleanup(linkParent);
  }
});

// ── 3. the call sites ────────────────────────────────────────────────────
//
// An engine nobody calls saves nothing, and a call site that calls it wrongly is worse than none.
// The population is DERIVED, not listed: every SKILL.md that carries the rollup REDUCTION (the jq
// that maps a statusCheckRollup to PENDING/SUCCESS/…). It is keyed on the reduction and not on the
// token `statusCheckRollup`, which review-pr also mentions — as context for a reviewer, with no CI
// wait — so a key on the token would be red at the wrong site (obs #135). The floor is 3.

import { readdirSync } from "node:fs";

const REPO = join(__dirname, "..", "..", "..");
const REDUCTION = 'or . == "STARTUP_FAILURE"';

const waitSites = readdirSync(join(REPO, "skills"))
  .filter((s) => existsSync(join(REPO, "skills", s, "SKILL.md")))
  .map((s) => ({
    skill: s,
    text: readFileSync(join(REPO, "skills", s, "SKILL.md"), "utf8"),
  }))
  .filter(({ text }) => text.includes(REDUCTION));

test("the population of CI-wait sites is derived and non-vacuous: finalise, develop-next, develop-batch", () => {
  assert.ok(
    waitSites.length >= 3,
    `found ${waitSites.length} sites carrying the rollup reduction`,
  );
  for (const must of ["finalise", "develop-next", "develop-batch"]) {
    assert.ok(
      waitSites.some((s) => s.skill === must),
      `${must} must carry the reduction`,
    );
  }
});

for (const { skill, text } of waitSites) {
  test(`${skill}: the PENDING/NONE arm calls its OWN bundled engine with --head-rollup and records tree-equivalent`, () => {
    const call = `.agents/skills/${skill}/references/ci-tree-equivalence.js`;
    assert.ok(
      text.includes(call),
      `${skill} must call ${call}, not another skill's copy`,
    );
    assert.ok(
      /PENDING\|NONE\)[\s\S]{0,400}ci-tree-equivalence\.js[\s\S]{0,200}--head-rollup/.test(
        text,
      ),
      `${skill}: the engine call must sit inside the PENDING|NONE arm`,
    );
    assert.ok(
      text.includes("(tree-equivalent to"),
      `${skill} must record the commit CI verified`,
    );
    assert.ok(
      existsSync(
        join(REPO, "skills", skill, "references", "ci-tree-equivalence.js"),
      ),
      `${skill}: the engine is not bundled — run npm run bundle`,
    );
  });
}

// ── the 6c poll: the writer and the reader, run together ──────────────────

const finalise = readFileSync(
  join(REPO, "skills", "finalise", "SKILL.md"),
  "utf8",
);
const pollMatch = /cat > "\$POLL" <<'POLLEOF'\n([\s\S]*?)\nPOLLEOF/.exec(
  finalise,
);

function pollScript() {
  assert.ok(
    pollMatch,
    "the 6c poll heredoc was not found in skills/finalise/SKILL.md",
  );
  const stub = /^rollup\(\) \{ : [^\n]*\}$/m;
  assert.ok(
    stub.test(pollMatch[1]),
    "the heredoc's rollup() stub changed shape; update this extraction",
  );
  return pollMatch[1].replace(stub, 'rollup() { cat "$FAKE_ROLLUP_FILE"; }');
}

/** A bin dir with a fake gh (PR head, check count, ancestor checks) and a no-op sleep. */
function pollBin(head, green) {
  const bin = mkdtempSync(join(tmpdir(), "ci-tree-eq-poll-"));
  writeFileSync(
    join(bin, "gh"),
    `#!/bin/sh
case "$*" in
  *headRefOid*) echo "${head}" ;;
  *"statusCheckRollup | length"*) echo 3 ;;
  *"commits/${green}/check-runs"*) echo '{"status":"completed","conclusion":"success","completed_at":"2020-01-01T00:00:00Z"}' ;;
  *) : ;;
esac
`,
  );
  writeFileSync(join(bin, "sleep"), "#!/bin/sh\nexit 0\n");
  chmodSync(join(bin, "gh"), 0o755);
  chmodSync(join(bin, "sleep"), 0o755);
  return bin;
}

/** The real engine behind a shim that counts how many times the poll asked it. */
function countingEngine(log) {
  const shim = join(
    tmpdir(),
    `ci-tree-eq-shim-${process.pid}-${Math.random().toString(36).slice(2)}.js`,
  );
  writeFileSync(
    shim,
    `require("fs").appendFileSync(${JSON.stringify(log)}, "x\\n");
require(${JSON.stringify(ENGINE_PATH)}).run().then((r) => process.exit(r.exitCode));
`,
  );
  return shim;
}

function runPoll({
  dir,
  head,
  green,
  rollup = "PENDING",
  maxWait = 120,
  withEngine = true,
}) {
  const bin = pollBin(head, green);
  const work = mkdtempSync(join(tmpdir(), "ci-tree-eq-work-"));
  const script = join(work, "poll.sh");
  const result = join(work, "result.txt");
  const rollupFile = join(work, "rollup.txt");
  const log = join(work, "engine.log");
  writeFileSync(script, pollScript());
  writeFileSync(rollupFile, rollup);
  writeFileSync(log, "");
  const shim = countingEngine(log);
  try {
    let r;
    for (let attempt = 0; attempt <= CLI_BUDGET.retries; attempt += 1) {
      r = spawnSync(
        "bash",
        [
          script,
          "42",
          head,
          String(maxWait),
          result,
          "3",
          ...(withEngine ? [shim] : []),
        ],
        {
          cwd: dir,
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            VCS: "github",
            FAKE_ROLLUP_FILE: rollupFile,
          },
          encoding: "utf8",
          timeout: CLI_BUDGET.timeoutMs,
        },
      );
      if (!neverRan(r)) break;
    }
    assert.ok(!neverRan(r), `the poll never ran: ${r.error ?? r.signal}`);
    const line = readFileSync(result, "utf8").trim();
    const calls = readFileSync(log, "utf8").split("\n").filter(Boolean).length;
    return { line, calls, stderr: r.stderr };
  } finally {
    cleanup(bin);
    cleanup(work);
    rmSync(shim, { force: true });
  }
}

test("6c poll: a docs-only PENDING head concludes SUCCESS with TREE_EQ=<green sha12> after one 30 s step", () => {
  const { dir, green } = greenThenDocs(2);
  try {
    const head = git(dir, "rev-parse", "HEAD");
    const r = runPoll({ dir, head, green });
    assert.equal(
      r.line,
      `SUCCESS ${head} 3 30s TREE_EQ=${green.slice(0, 12)}`,
      r.stderr,
    );
    assert.equal(r.calls, 1);
  } finally {
    cleanup(dir);
  }
});

test("6c poll: a code head does NOT write a sha; the answer is latched, so the engine is asked once, not every 30 s", () => {
  const { dir, green } = greenThenDocs(1);
  try {
    commit(dir, { "src/b.ts": "export const b = 2;\n" }, "code on top");
    const head = git(dir, "rev-parse", "HEAD");
    const r = runPoll({ dir, head, green, maxWait: 120 });
    assert.equal(r.line, `PENDING ${head} 3 120s TREE_EQ=`, r.stderr);
    assert.equal(
      r.calls,
      1,
      "code-changed cannot change on a pinned head — it must be latched",
    );
  } finally {
    cleanup(dir);
  }
});

test("6c poll: no green ancestor yet is NOT latched — the ancestor's run may finish, so it is asked again", () => {
  const { dir } = greenThenDocs(1);
  try {
    const head = git(dir, "rev-parse", "HEAD");
    const r = runPoll({ dir, head, green: "0".repeat(40), maxWait: 90 });
    assert.equal(r.line, `PENDING ${head} 3 90s TREE_EQ=`, r.stderr);
    // WAITED 30 and 60 each run decided(); at 90 the loop ends on MAX_WAIT without a further one.
    assert.equal(
      r.calls,
      2,
      "asked on every 30 s step until MAX_WAIT, never latched",
    );
  } finally {
    cleanup(dir);
  }
});

test("6c poll: without an ENGINE argument the rule is off and the poll waits exactly as before", () => {
  const { dir, green } = greenThenDocs(1);
  try {
    const head = git(dir, "rev-parse", "HEAD");
    const r = runPoll({ dir, head, green, maxWait: 60, withEngine: false });
    assert.equal(r.line, `PENDING ${head} 3 60s TREE_EQ=`);
    assert.equal(r.calls, 0);
  } finally {
    cleanup(dir);
  }
});

test("6c poll: a FAILURE head stays terminal and never consults the engine", () => {
  const { dir, green } = greenThenDocs(1);
  try {
    const head = git(dir, "rev-parse", "HEAD");
    const r = runPoll({ dir, head, green, rollup: "FAILURE" });
    assert.equal(r.line, `FAILURE ${head} 3 30s TREE_EQ=`);
    assert.equal(r.calls, 0);
  } finally {
    cleanup(dir);
  }
});

test("6c reader: reads the writer's line with five names — WAITED stays '30s', and the record names the commit", () => {
  const readLine = /^\s*read -r CI_ROLLUP_2 [^\n]*< "\$RESULT"$/m.exec(
    finalise,
  );
  const treeLine = /^\s*CI_TREE_EQ_2=[^\n]*$/m.exec(finalise);
  const echoLine = /^\s*echo "CI reading 2:[^\n]*"$/m.exec(finalise);
  assert.ok(
    readLine && treeLine && echoLine,
    "the 6c reader's read / CI_TREE_EQ_2 / echo lines were not found",
  );
  const reader = [
    readLine[0],
    treeLine[0],
    echoLine[0],
    'echo "WAITED=[$WAITED]"',
  ].join("\n");
  const run = (line) => {
    const work = mkdtempSync(join(tmpdir(), "ci-tree-eq-reader-"));
    try {
      writeFileSync(join(work, "result.txt"), `${line}\n`);
      return spawnSync(
        "bash",
        [
          "-c",
          `RESULT=${join(work, "result.txt")}; CI_HEAD_2=abcdef1234567890; ${reader}`,
        ],
        {
          encoding: "utf8",
          timeout: CLI_BUDGET.timeoutMs,
        },
      ).stdout;
    } finally {
      cleanup(work);
    }
  };
  const treeEq = run("SUCCESS abcdef1234567890 3 30s TREE_EQ=0123456789ab");
  assert.match(
    treeEq,
    /WAITED=\[30s\]/,
    "with four names WAITED would absorb TREE_EQ=… (measured)",
  );
  assert.match(
    treeEq,
    /CI reading 2: SUCCESS \(tree-equivalent to 0123456789ab\) @ abcdef123456/,
  );
  const plain = run("SUCCESS abcdef1234567890 3 60s TREE_EQ=");
  assert.match(plain, /WAITED=\[60s\]/);
  assert.match(
    plain,
    /CI reading 2: SUCCESS @ abcdef123456 over 3 checks after 60s/,
  );
  assert.doesNotMatch(
    plain,
    /tree-equivalent/,
    "a real SUCCESS must never be labelled tree-equivalent",
  );
});

// ── config and docs ──────────────────────────────────────────────────────

test("this repository's own skills-config.yaml override parses (a block list, not a string) and keeps executable markdown out", () => {
  const { matchesAnyGlob } = require("../glob-match.js");
  const cfg = eng.readConfig(REPO); // throws a usage error if the block were an inline list
  assert.ok(Array.isArray(cfg.patterns) && cfg.patterns.length > 0);
  assert.equal(
    matchesAnyGlob("skills/finalise/SKILL.md", cfg.patterns),
    false,
    "a SKILL.md is executable prose here",
  );
  assert.equal(
    matchesAnyGlob("docs/tasks/task.1.x/task.1.x.md", cfg.patterns),
    true,
  );
  assert.match(cfg.checkCommand, /ci:fast/);
  assert.match(
    cfg.checkCommand,
    /eval:all/,
    "ci:fast alone misses task-registry-drift",
  );
});

test("configuration.md documents all five ci.docsOnly keys, the **/*.md spelling and the block-list rule", () => {
  const doc = readFileSync(
    join(REPO, "docs", "reference", "configuration.md"),
    "utf8",
  );
  for (const key of [
    "ci.docsOnly.enabled",
    "ci.docsOnly.patterns",
    "ci.docsOnly.checkCommand",
    "ci.docsOnly.checkTimeoutSeconds",
    "ci.docsOnly.settleSeconds",
  ]) {
    assert.ok(doc.includes(`| \`${key}\``), `${key} needs a key-reference row`);
  }
  assert.match(doc, /\*\*Spell it `\*\*\/\*\.md`, not `\*\.md`:\*\*/);
  assert.match(doc, /block list/);
  assert.ok(doc.includes("## The docs-only CI rule"));
});

// ── CR2-8: the new prose blocks fail loudly on an unbound input ───────────
//
// Every fenced block is its own shell, so an input bound by an earlier block is gone. An unbound
// CI_ROLLUP silently skipped the rule, an unbound PR_HEAD reached `--head ""`, and an unbound
// CI_TREE_EQ in the Step 7 comment wrote plain SUCCESS, the record the rule forbids. A grep over the
// source text cannot see an unbound variable, so these RUN the extracted blocks.

import { dedent } from "./_dedent.mjs";

function armBlock(text) {
  const blocks = [...text.matchAll(/```bash\n([\s\S]*?)\n *```/g)].map(
    (m) => m[1],
  );
  const hit = blocks.find(
    (b) => b.includes("CI_ROLLUP:?") && b.includes("ci-tree-equivalence.js"),
  );
  assert.ok(
    hit,
    "the PENDING/NONE arm block (with its input guard) was not found",
  );
  return dedent(hit);
}

const shellsAvailable = ["bash", "zsh"].filter(
  (sh) => spawnSync(sh, ["-c", "exit 0"]).status === 0,
);

for (const { skill, text } of waitSites) {
  test(`${skill}: the arm block aborts, naming the variable, when its input is unbound — bash and zsh`, () => {
    const block = armBlock(text).replace(/<PR#>/g, "7");
    assert.match(block, /CI_ROLLUP:\?/);
    assert.ok(shellsAvailable.includes("bash"), "bash is required");
    for (const sh of shellsAvailable) {
      const run = (env) =>
        spawnSync(sh, ["-c", block], {
          env: { PATH: process.env.PATH, ...env },
          encoding: "utf8",
          timeout: CLI_BUDGET.timeoutMs,
        });
      const unbound = run({});
      assert.notEqual(
        unbound.status,
        0,
        `${sh}: an unbound CI_ROLLUP must not be a quiet skip`,
      );
      assert.match(
        unbound.stderr,
        /CI_ROLLUP/,
        `${sh}: the message names the variable`,
      );
      const bound = run({
        CI_ROLLUP: "SUCCESS",
        PR_HEAD: "abc",
        PR_ID: "7",
        PR_NUMBER: "7",
      });
      assert.equal(
        bound.status,
        0,
        `${sh}: bound inputs run clean (the engine is absent, so the rule says no): ${bound.stderr}`,
      );
    }
  });
}

test('develop-next\'s arm also refuses an unbound PR_HEAD, so `--head ""` is unreachable', () => {
  const next = waitSites.find((s) => s.skill === "develop-next");
  const block = armBlock(next.text);
  const r = spawnSync("bash", ["-c", block], {
    env: { PATH: process.env.PATH, CI_ROLLUP: "NONE", PR_ID: "7" },
    encoding: "utf8",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /PR_HEAD/);
});

test("finalise Step 7 canonical comment: an UNSET CI_TREE_EQ / CI_TREE_EQ_2 aborts, an EMPTY one passes", () => {
  const f = waitSites.find((s) => s.skill === "finalise").text;
  const m = /( *: "\$\{CI_TREE_EQ\?[^\n]*\\\n *"\$\{CI_TREE_EQ_2\?[^\n]*)/.exec(
    f,
  );
  assert.ok(m, "the Step 7 unset-guard was not found");
  const guard = dedent(m[1]);
  for (const sh of shellsAvailable) {
    const run = (env) =>
      spawnSync(sh, ["-c", guard], {
        env: { PATH: process.env.PATH, ...env },
        encoding: "utf8",
      });
    assert.notEqual(run({}).status, 0, `${sh}: both unset`);
    assert.match(
      run({ CI_TREE_EQ: "" }).stderr,
      /CI_TREE_EQ_2/,
      `${sh}: only reading 2 unset`,
    );
    assert.equal(
      run({ CI_TREE_EQ: "", CI_TREE_EQ_2: "" }).status,
      0,
      `${sh}: empty means the reading waited`,
    );
    assert.equal(
      run({ CI_TREE_EQ: "0123456789ab", CI_TREE_EQ_2: "" }).status,
      0,
      `${sh}: set is fine`,
    );
  }
});

// ── QA cycle 4: CR4-1, CR4-2 ─────────────────────────────────────────────

test("CR4-1: code-changed is final only when no nearer ancestor was walked past undecided", async () => {
  // C (docs-only delta to the head) has no result yet; B beneath it has code. If C turns green the
  // head's delta is docs only, so reporting code-changed here would be a "no" that can still flip.
  for (const undecided of ["PENDING", "NONE", "CANCELLED"]) {
    const r = await eng.classifyTreeEquivalence({
      headRollup: "PENDING",
      ancestors: [
        A("c1", ["docs/a.md"], undecided),
        A("b1", ["docs/a.md", "src/c.ts"], "SUCCESS"),
      ],
      patterns: eng.DEFAULT_PATTERNS,
      enabled: true,
    });
    assert.equal(r.reason, REASONS.NO_GREEN_ANCESTOR, undecided);
    assert.match(r.detail, /c1/, "names the undecided ancestor");
    assert.match(r.detail, /src\/c\.ts/, "names the code path");
    assert.match(r.detail, /not decided/);
  }
  // the control: no undecided ancestor stands before the code, so the answer is final
  const final = await eng.classifyTreeEquivalence({
    headRollup: "PENDING",
    ancestors: [A("b1", ["docs/a.md", "src/c.ts"], "SUCCESS")],
    patterns: eng.DEFAULT_PATTERNS,
    enabled: true,
  });
  assert.equal(final.reason, REASONS.CODE_CHANGED);
});

test("CR4-1: CLI — B (code, green long ago), C (code, green 60 s ago), H (docs) is not code-changed; 400 s later it is tree-equivalent", async () => {
  const dir = mkRepo();
  try {
    const b = commit(dir, { "src/b.ts": "1\n" }, "B code");
    const c = commit(dir, { "src/c.ts": "2\n" }, "C code");
    commit(dir, { "docs/h.md": "# h\n" }, "H docs");
    const at = (msAgo) => [
      { status: "completed", conclusion: "success", completed_at: iso(msAgo) },
    ];
    const young = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [b]: GREEN, [c]: at(60_000) } }),
    });
    assert.equal(young.exitCode, 1);
    assert.equal(
      JSON.parse(young.stdout).reason,
      "no-green-ancestor",
      "a settle window is a delay, not a verdict",
    );
    const settled = await runEngine(
      dir,
      ["--head-rollup", "PENDING", "--json"],
      {
        exec: fakeExec({ checks: { [b]: GREEN, [c]: at(400_000) } }),
      },
    );
    assert.equal(settled.exitCode, 0);
    assert.equal(JSON.parse(settled.stdout).reason, "tree-equivalent");
  } finally {
    cleanup(dir);
  }
});

test("CR4-1: the 6c poll re-asks while a nearer ancestor is undecided — the answer is not latched", () => {
  const dir = mkRepo();
  try {
    const green = commit(dir, { "src/b.ts": "1\n" }, "B code (green)");
    commit(dir, { "src/c.ts": "2\n" }, "C code (no checks yet)");
    commit(dir, { "docs/h.md": "# h\n" }, "H docs");
    const head = git(dir, "rev-parse", "HEAD");
    const r = runPoll({ dir, head, green, maxWait: 90 });
    assert.equal(r.line, `PENDING ${head} 3 90s TREE_EQ=`, r.stderr);
    assert.equal(
      r.calls,
      2,
      "asked on every 30 s step until MAX_WAIT: C's run may still finish green",
    );
  } finally {
    cleanup(dir);
  }
});

test("CR4-2: text with content that does not parse to a mapping is refused, not read as 'not configured'", () => {
  for (const bad of [
    "ci docsOnly\nenabled false\n",
    "- a\n- b\n",
    "skills-config.yaml\n", // what a symlinked file reads as through git show
    "\uFEFF- a\n",
    "just a sentence",
  ]) {
    assert.throws(
      () => eng.parseConfig(bad),
      /does not parse to a mapping/,
      JSON.stringify(bad),
    );
  }
  // nothing significant is "not configured", and so is a mapping with other keys
  for (const ok of [
    "",
    "\n\n",
    "# a comment\n",
    "---\n",
    "# c\n---\n...\n",
    "\uFEFF",
    "other: 1\n",
  ]) {
    assert.deepEqual(
      eng.parseConfig(ok),
      eng.defaultConfig(),
      JSON.stringify(ok),
    );
  }
  assert.equal(
    eng.parseConfig("\uFEFFci:\r\n  docsOnly:\r\n    enabled: false\r\n")
      .enabled,
    false,
    "a BOM and CRLF still read",
  );
});

test("CR4-2: a skills-config.yaml committed as a symlink is refused at the commit judged — the opt-out in its target is not ignored", async () => {
  const dir = mkRepo();
  try {
    writeFileSync(
      join(dir, "real.yaml"),
      "ci:\n  docsOnly:\n    enabled: false\n",
    );
    symlinkSync("real.yaml", join(dir, "skills-config.yaml"));
    const green = commit(dir, { "src/a.ts": "1\n" }, "code + symlinked config");
    commit(dir, { "README.md": "r\n" }, "docs");
    assert.equal(
      git(dir, "ls-tree", "HEAD", "skills-config.yaml").split(/\s/)[0],
      "120000",
      "fixture: the config really is a symlink in the commit",
    );
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(
      r.exitCode,
      2,
      "refused, not defaulted to tree-equivalent (exit 0)",
    );
    assert.match(r.stderr, /not a regular file/);
    // the working-tree reader refuses the same shape
    assert.throws(() => eng.readConfig(dir), /not a regular file/);
  } finally {
    cleanup(dir);
  }
});

test("CR4-2: a regular config file is still read at the commit judged (the mode check does not refuse the ordinary case)", async () => {
  for (const mode of ["100644", "100755"]) {
    const dir = mkRepo({ config: "ci:\n  docsOnly:\n    enabled: false\n" });
    try {
      if (mode === "100755") chmodSync(join(dir, "skills-config.yaml"), 0o755);
      const green = commit(dir, { "src/a.ts": "1\n" }, "code");
      commit(dir, { "README.md": "r\n" }, "docs");
      assert.equal(
        git(dir, "ls-tree", "HEAD", "skills-config.yaml").split(/\s/)[0],
        mode,
      );
      const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
        exec: fakeExec({ checks: { [green]: GREEN } }),
      });
      assert.equal(JSON.parse(r.stdout).reason, "disabled", mode);
    } finally {
      cleanup(dir);
    }
  }
});

// ── QA cycle 5: CR5-1, CR5-2, CR5-3 ──────────────────────────────────────

const OPT_OUT = "ci:\n  docsOnly:\n    enabled: false\n";

test("CR5-1: a leading BOM does not defeat the parse when a key or a document marker precedes ci", async () => {
  for (const [name, text] of [
    ["BOM then another key", `﻿version: 2\n${OPT_OUT}`],
    ["BOM then a document marker", `﻿---\n${OPT_OUT}`],
    ["BOM then a comment and a key", `﻿# owner config\nversion: 2\n${OPT_OUT}`],
    [
      "BOM, CRLF, another key",
      `﻿version: 2\r\nci:\r\n  docsOnly:\r\n    enabled: false\r\n`,
    ],
  ]) {
    assert.equal(eng.parseConfig(text).enabled, false, name);
  }
  // and through git, at the commit judged: the opt-out in a BOM'd file with a key before ci holds
  const dir = mkRepo({ config: `﻿version: 2\n${OPT_OUT}` });
  try {
    const green = commit(dir, { "src/a.ts": "1\n" }, "code");
    commit(dir, { "README.md": "r\n" }, "docs");
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(JSON.parse(r.stdout).reason, "disabled");
  } finally {
    cleanup(dir);
  }
});

test("CR5-2: a row the parse does not consume is refused — the parse must account for every significant row", () => {
  const refused = [
    [
      "enabled written beside docsOnly instead of under it",
      "ci:\n  docsOnly:\n  enabled: false\n",
      /unknown key "enabled"/,
    ],
    [
      "a first row indented deeper than a later ci row",
      `  other: 1\n${OPT_OUT}`,
      /accounts for/,
    ],
    [
      "a duplicated key collapses into one",
      "ci:\n  docsOnly:\n    enabled: true\n    enabled: false\n",
      /accounts for/,
    ],
    [
      "a row dedented out of its block",
      "ci:\n    docsOnly:\n  enabled: false\n",
      /accounts for|unknown key/,
    ],
  ];
  for (const [name, text, why] of refused) {
    assert.throws(() => eng.parseConfig(text), why, name);
  }
  // the specific diagnostic still wins over the general net
  assert.throws(
    () =>
      eng.parseConfig(
        "ci:\n  docsOnly:\n    checkCommand: >-\n      npm run x\n",
      ),
    /block scalar/,
  );
  // ordinary configurations are not refused: comments, other keys, a block list, blank lines, CRLF
  const ordinary = [
    '# owner\n\nother: 1\nnested:\n  a: b\nci:\n  docsOnly:\n    patterns:\n      - "docs/**"\n      - "**/*.md"\n    enabled: true # on\n',
    "---\nci:\n  docsOnly:\n    settleSeconds: 0\n",
    "ci:\r\n  docsOnly:\r\n    enabled: false\r\n",
    "unrelated: true",
  ];
  for (const text of ordinary) {
    assert.doesNotThrow(
      () => eng.parseConfig(text),
      JSON.stringify(text).slice(0, 60),
    );
  }
});

test("CR5-3: the mode check and the read are anchored to the same place — --workspace-root on a subdirectory still sees a root opt-out", async () => {
  const dir = mkRepo({ config: OPT_OUT });
  try {
    const green = commit(dir, { "sub/a.ts": "1\n" }, "code");
    commit(dir, { "README.md": "r\n" }, "docs");
    const sub = join(dir, "sub");
    const r = await runEngine(
      dir,
      ["--head-rollup", "PENDING", "--workspace-root", sub, "--json"],
      { exec: fakeExec({ checks: { [green]: GREEN } }) },
    );
    assert.equal(
      JSON.parse(r.stdout).reason,
      "disabled",
      "the root configuration must be read when the workspace root is a subdirectory",
    );
    const direct = eng.readConfigAtCommit(
      (c, a, o) => execFileSync(c, a, o),
      sub,
      git(dir, "rev-parse", "HEAD"),
    );
    assert.equal(direct.enabled, false);
  } finally {
    cleanup(dir);
  }
});

// ── QA cycle 6: CR6-1, CR6-2, CR6-3 ──────────────────────────────────────

// The two documented shapes in docs/reference/configuration.md that hold a list of maps, verbatim.
const DEVELOP_BATCH_RESOURCES = `developBatch: # optional — develop-batch parallel fan-out
  maxParallel: 4
  resources: # optional — named execution resources
    - name: local
      capacity: 1
      testCommand: "npm test"
    - name: build-box
      capacity: 3
      testCommand: "ssh build-box make test"
      probe: # optional capacity probe
        command: "curl -fsS --max-time 5 $PROBE_URL/health"
        intervalSec: 60
        timeoutSec: 10
`;
const RETRO_IDENTITIES = `retrospective:
  location: docs/development/sprints
  identities: # optional — enables per-person commit figures
    - jira: Ada Lovelace # Jira display name
      git: ada@example.com # git author email
`;

test("CR6-1: a list of maps elsewhere in the file does not make the engine refuse it", async () => {
  for (const [name, section] of [
    ["developBatch.resources", DEVELOP_BATCH_RESOURCES],
    ["retrospective.identities", RETRO_IDENTITIES],
    ["the minimum list of maps", "x:\n  - name: a\n    capacity: 1\n"],
  ]) {
    // no ci block: not configured, the defaults
    assert.equal(eng.parseConfig(section).enabled, true, `${name}, no ci`);
    // an opt-out before and after the section is read, not dropped
    assert.equal(
      eng.parseConfig(`${OPT_OUT}${section}`).enabled,
      false,
      `${name}, ci first`,
    );
    assert.equal(
      eng.parseConfig(`${section}${OPT_OUT}`).enabled,
      false,
      `${name}, ci last`,
    );
  }
  // through git: the engine answers on the opt-out instead of exiting 2 on the configuration
  const dir = mkRepo({ config: `${DEVELOP_BATCH_RESOURCES}${OPT_OUT}` });
  try {
    const green = commit(dir, { "src/a.ts": "1\n" }, "code");
    commit(dir, { "README.md": "r\n" }, "docs");
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
    });
    assert.equal(JSON.parse(r.stdout).reason, "disabled");
  } finally {
    cleanup(dir);
  }
});

test("CR6-2: a row the parse dropped is refused whatever else the file holds — no miscount elsewhere can offset it", () => {
  const dup = (a, b) =>
    `ci:\n  docsOnly:\n    enabled: ${a}\n    enabled: ${b}\n`;
  // exactly ONE map element: the over-count the old check made is then exactly the one row a
  // duplicate drops, which is the offset (two elements would not cancel)
  const section = RETRO_IDENTITIES;
  for (const [name, text] of [
    [
      "duplicate (true, false), list of maps before ci",
      section + dup(true, false),
    ],
    [
      "duplicate (false, true), list of maps before ci",
      section + dup(false, true),
    ],
    [
      "duplicate (true, false), list of maps after ci",
      dup(true, false) + section,
    ],
    [
      "duplicate (false, true), list of maps after ci",
      dup(false, true) + section,
    ],
    [
      "a first row indented deeper than ci, with a list of maps after it",
      `  other: 1\n${OPT_OUT}${section}`,
    ],
  ]) {
    assert.throws(
      () => eng.parseConfig(text),
      /under ci but the parse accounts for/,
      name,
    );
  }
});

test("CR6-3: a document marker with a trailing comment is a marker, not a row the parse never reads", () => {
  assert.equal(
    eng.parseConfig(`--- # owner config\n${OPT_OUT}`).enabled,
    false,
  );
  assert.equal(eng.parseConfig(`${OPT_OUT}... # end\n`).enabled, false);
  // and a file of nothing but such a marker is "not configured", not "content that is no mapping"
  assert.equal(eng.parseConfig("--- # nothing here\n").enabled, true);
});

// ── DoD security gate, task.172: four findings in the engine since phase 2 ────────────────────────

test("SEC-1: a checkCommand that times out leaves no child process running", async () => {
  const pidFile = join(tmpdir(), `ci-tree-eq-pid-${process.pid}`);
  const { dir, green } = greenThenDocs(1, {
    config: `ci:\n  docsOnly:\n    checkTimeoutSeconds: 1\n    checkCommand: "sleep 30 & echo $! > ${pidFile}; wait"\n`,
  });
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  let pid = 0;
  try {
    const r = await runEngine(dir, ["--head-rollup", "PENDING", "--json"], {
      exec: fakeExec({ checks: { [green]: GREEN } }),
      spawn: (cmd, args, opts) =>
        spawnSync(cmd, args, { ...opts, stdio: "ignore" }),
    });
    assert.equal(JSON.parse(r.stdout).reason, "check-failed");
    assert.match(JSON.parse(r.stdout).detail, /timed out/);
    pid = Number(readFileSync(pidFile, "utf8").trim());
    assert.ok(pid > 1, "the check recorded its child's pid");
    // the group kill is synchronous; allow one tick for the kernel to reap
    for (let i = 0; i < 20 && alive(pid); i += 1)
      await new Promise((res) => setTimeout(res, 50));
    assert.equal(
      alive(pid),
      false,
      "the child of the timed-out check must be dead",
    );
  } finally {
    if (pid > 1 && alive(pid)) process.kill(pid, "SIGKILL");
    rmSync(pidFile, { force: true });
    cleanup(dir);
  }
});

// A reference implementation of the glob semantics, as a RegExp, for SMALL inputs only. The matcher
// used to BE this (with a run-collapse guard) and was exponential on `*a` repeated; it is kept here
// so a differential test can hold the replacement to the same answers.
function refGlob(glob, path) {
  let out = "^";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      let run = 0;
      while (glob[i + run] === "*") run++;
      if (run > 2) i += run - 2;
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          out += "(?:.*/)?";
          i += 3;
          continue;
        }
        out += ".*";
        i += 2;
        continue;
      }
      out += "[^/]*";
      i += 1;
      continue;
    }
    out += c === "?" ? "[^/]" : c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    i += 1;
  }
  return new RegExp(`${out}$`).test(path);
}

test("SEC-2: the glob matcher is linear whatever the pattern, and agrees with the regex it replaced", () => {
  const { globMatch, matchesAnyGlob } = require("../glob-match.js");
  // the shapes that were exponential: a wildcard alternating with a literal, and repeated `**/`
  for (const [name, glob, path] of [
    ["*a x40", "*a".repeat(40), `${"a".repeat(40)}c`],
    ["**/ x40", "**/".repeat(40), `${"a/".repeat(25)}b`],
    ["*a**/? x30", "*a**/?*".repeat(30), `${"a/".repeat(100)}c`],
  ]) {
    const t0 = Date.now();
    matchesAnyGlob(path, [glob]);
    assert.ok(
      Date.now() - t0 < 1000,
      loadSensitive(`${name} must answer in well under a second`),
    );
  }
  // differential: 20,000 deterministic small cases, including line terminators
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const gAlpha = ["a", "b", "/", ".", "*", "**", "?", "**/", "a", "*"];
  const pAlpha = ["a", "b", "/", ".", "\n", "\r"];
  let trues = 0;
  for (let i = 0; i < 20000; i += 1) {
    let g = "";
    for (let k = 1 + Math.floor(rnd() * 7); k > 0; k -= 1) g += pick(gAlpha);
    let p = "";
    for (let k = Math.floor(rnd() * 9); k > 0; k -= 1) p += pick(pAlpha);
    const want = refGlob(g, p);
    if (want) trues += 1;
    assert.equal(
      globMatch(g, p),
      want,
      `${JSON.stringify(g)} vs ${JSON.stringify(p)}`,
    );
  }
  assert.ok(
    trues > 500,
    `non-vacuity: the sample must contain matches (${trues})`,
  );
  // the bounds: an oversized glob or path never matches, and never hangs
  assert.equal(globMatch("a".repeat(2000), "a".repeat(2000)), false);
  assert.equal(globMatch("**", "a".repeat(5000)), false);
});

test("SEC-3: checkCommand is not run over uncommitted code; uncommitted documentation is allowed", async () => {
  const marker = join(tmpdir(), `ci-tree-eq-dirty-${process.pid}`);
  const mk = () =>
    greenThenDocs(1, {
      config: `ci:\n  docsOnly:\n    checkCommand: "touch ${marker}"\n`,
    });
  rmSync(marker, { force: true });
  const spawnReal = (cmd, args, opts) =>
    spawnSync(cmd, args, { ...opts, stdio: "ignore" });
  const code = mk();
  try {
    writeFileSync(
      join(code.dir, "src", "a.ts"),
      "export const a = 2; // uncommitted\n",
    );
    const r = await runEngine(
      code.dir,
      ["--head-rollup", "PENDING", "--json"],
      {
        exec: fakeExec({ checks: { [code.green]: GREEN } }),
        spawn: spawnReal,
      },
    );
    assert.equal(r.exitCode, 1);
    assert.equal(JSON.parse(r.stdout).reason, "unverifiable");
    assert.match(
      JSON.parse(r.stdout).detail,
      /uncommitted changes outside documentation \(src\/a\.ts\)/,
    );
    assert.equal(
      existsSync(marker),
      false,
      "the check must not run over uncommitted code",
    );
  } finally {
    cleanup(code.dir);
  }
  const untracked = mk();
  try {
    writeFileSync(join(untracked.dir, "scratch.js"), "1\n");
    const r = await runEngine(
      untracked.dir,
      ["--head-rollup", "PENDING", "--json"],
      {
        exec: fakeExec({ checks: { [untracked.green]: GREEN } }),
        spawn: spawnReal,
      },
    );
    assert.equal(
      JSON.parse(r.stdout).reason,
      "unverifiable",
      "an untracked code file counts",
    );
  } finally {
    cleanup(untracked.dir);
  }
  const docs = mk();
  try {
    writeFileSync(join(docs.dir, "docs", "n0.md"), "# edited, uncommitted\n");
    writeFileSync(join(docs.dir, "docs", "new.md"), "# untracked\n");
    const r = await runEngine(
      docs.dir,
      ["--head-rollup", "PENDING", "--json"],
      {
        exec: fakeExec({ checks: { [docs.green]: GREEN } }),
        spawn: spawnReal,
      },
    );
    assert.equal(r.exitCode, 0, r.stdout + r.stderr);
    assert.equal(
      existsSync(marker),
      true,
      "documentation-only dirt does not stop the check",
    );
  } finally {
    rmSync(marker, { force: true });
    cleanup(docs.dir);
  }
});

test("SEC-4: a path with a dot or empty segment is never documentation", () => {
  const globs = ["docs/**", "**/*.md"];
  for (const bad of [
    "docs/../src/a.js",
    "docs/./a.md",
    "docs//a.md",
    "docs/a/../../src/b.js",
    "../docs/a.md",
    "docs/a.md/",
  ]) {
    assert.equal(eng.isDocsPath(bad, globs), false, bad);
  }
  for (const ok of [
    "docs/a.md",
    "docs/a/b.md",
    "README.md",
    "docs/.hidden.md",
    "docs/a..b.md",
  ]) {
    assert.equal(eng.isDocsPath(ok, globs), true, ok);
  }
});
