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
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neverRan, spawnBudget } from "../spawn-budget.mjs";

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
];
const git = (cwd, ...args) =>
  execFileSync("git", [...GIT, ...args], { cwd, encoding: "utf8" }).trim();

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

const GREEN = [{ status: "completed", conclusion: "success" }];

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

test("reduceChecks: decided only at completed, skipped/neutral pass, zero is NONE, partial is not green", () => {
  const r = eng.reduceChecks;
  assert.equal(r({}), "NONE");
  assert.equal(r({ checkRuns: GREEN }), "SUCCESS");
  assert.equal(
    r({
      checkRuns: [
        { status: "completed", conclusion: "skipped" },
        { status: "completed", conclusion: "neutral" },
      ],
    }),
    "SUCCESS",
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
    });
    writeFileSync(
      join(dir, "skills-config.yaml"),
      "qa:\n  testArtifactGlobs:\n    - 'x/**'\n",
    );
    assert.deepEqual(eng.readConfig(dir).patterns, [...eng.DEFAULT_PATTERNS]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
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
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
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
      rmSync(dir, { recursive: true, force: true });
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

const cleanup = (dir) => rmSync(dir, { recursive: true, force: true });

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
    commit(dir, { "src/b.ts": "export const b = 2;\n" }, "more code");
    commit(dir, { "docs/last.md": "# last\n" }, "docs on top");
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
        statuses: { [green]: [{ state: "success" }] },
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
        return resp(200, { values: [{ state: "SUCCESSFUL" }] });
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
  *"commits/${green}/check-runs"*) echo '{"status":"completed","conclusion":"success"}' ;;
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

import { existsSync, readFileSync, readdirSync } from "node:fs";

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
  *"commits/${green}/check-runs"*) echo '{"status":"completed","conclusion":"success"}' ;;
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

test("configuration.md documents all three ci.docsOnly keys, the **/*.md spelling and the block-list rule", () => {
  const doc = readFileSync(
    join(REPO, "docs", "reference", "configuration.md"),
    "utf8",
  );
  for (const key of [
    "ci.docsOnly.enabled",
    "ci.docsOnly.patterns",
    "ci.docsOnly.checkCommand",
  ]) {
    assert.ok(doc.includes(`| \`${key}\``), `${key} needs a key-reference row`);
  }
  assert.match(doc, /\*\*Spell it `\*\*\/\*\.md`, not `\*\.md`:\*\*/);
  assert.match(doc, /block list/);
  assert.ok(doc.includes("## The docs-only CI rule"));
});
