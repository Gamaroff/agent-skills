// Guards for the platform-aware skill filter in `install_skills()` (task 83).
//
// Three properties, in descending order of how badly a regression would hurt:
//
// (1) GRANDFATHER. An excluded skill that is ALREADY on disk is kept, never
//     deleted. Deleting one breaks a consumer's workflow days later and far
//     from the cause, so the branch that protects it — and the `continue` that
//     follows it — are asserted directly, not implied by a count.
// (2) RESOLUTION ORDER. `skills-config.yaml` beats `$TRACKER` beats `JIRA_URL`,
//     and anything unresolved lands on `github`, exactly as
//     resolve-platform.sh resolves it at runtime. Install time and run time
//     disagreeing about the platform is the whole class of bug here: before the
//     github default existed, a GitHub consumer running --update matched no
//     probe at all and the filter was silently inert on its own headline path.
// (3) CLASSIFICATION DRIFT. Every skills/*jira* and skills/*github* directory
//     appears in exactly one list. Hand-maintained lists rot; this repo has the
//     pattern already (package.json's per-skill test globs orphaned a suite
//     once). A new tracker skill must fail CI until somebody classifies it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const WIZARD = path.join(REPO, "scripts", "setup-consumer.sh");

// The two constants, mirrored here so the drift guard has something to compare
// the tree against. Kept as literals on purpose: reading them back out of the
// script would make the guard tautological.
const JIRA_ONLY = [
  "ensure-epic-jira-issue",
  "ensure-story-jira-issue",
  "ensure-task-jira-issue",
  "sync-jira-epic",
  "sync-jira-story",
  "sync-jira-task",
  "jira-epic-creator",
  "jira-sprint-manager",
  "jira-sprint-retrospective",
  "jira-sprint-review-prep",
  "jira-standup-auditor",
];

const GITHUB_ONLY = [
  "ensure-epic-github-issue",
  "ensure-story-github-issue",
  "ensure-task-github-issue",
  "sync-github-epic",
  "sync-github-story",
  "sync-github-task",
];

// Skills that must NEVER be excluded under either tracker. `create-pr`,
// `create-branch` and `create-issue` are the `vcs`-axis guard: each serves
// GitHub *and* Bitbucket from one skill by sourcing resolve-platform.sh
// internally, so there is no sibling to exclude and excluding one would remove
// a skill the consumer needs.
const NEVER_EXCLUDED = [
  "create-pr",
  "create-branch",
  "create-issue",
  "develop-story",
  "develop-task",
  "finalise",
];

/**
 * Source the wizard with SETUP_CONSUMER_NO_MAIN=1 and run `snippet` against its
 * function definitions. JIRA_URL is unset by default so an ambient one in the
 * developer's shell cannot silently flip a resolver assertion.
 */
function callFn(snippet, { cwd = REPO, env = {} } = {}) {
  const clean = { ...process.env };
  delete clean.JIRA_URL;
  delete clean.TRACKER;
  delete clean.ALL_SKILLS;
  return execFileSync(
    "bash",
    [
      "-c",
      `set -euo pipefail
       export SETUP_CONSUMER_NO_MAIN=1
       source '${WIZARD}'
       ${snippet}`,
    ],
    {
      cwd,
      env: { ...clean, ...env, SETUP_CONSUMER_NO_MAIN: "1" },
      encoding: "utf8",
    },
  ).trim();
}

/**
 * `prelude` runs AFTER the source, which matters: the wizard's flag parser runs
 * at source time and unconditionally assigns ALL_SKILLS=false, so an inherited
 * environment variable of that name never reaches the predicate. Setting it in
 * the prelude is the shape the real script produces when --all-skills is parsed.
 */
function excluded(name, tracker, prelude = "") {
  return (
    callFn(
      `${prelude}
       if _skill_excluded_for_tracker '${name}' '${tracker}'; then echo yes; else echo no; fi`,
    ) === "yes"
  );
}

function resolveTracker(cwd, env = {}) {
  return callFn("_resolve_install_tracker", { cwd, env });
}

function inTempRepo(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "skill-exclusion-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── 1. classification, both directions ───────────────────────────────────────

test("the 11 Jira-only skills are excluded under github and kept under jira", () => {
  for (const name of JIRA_ONLY) {
    assert.equal(excluded(name, "github"), true, `${name} under github`);
    assert.equal(excluded(name, "jira"), false, `${name} under jira`);
  }
});

test("the 6 GitHub-only skills are excluded under jira and kept under github", () => {
  for (const name of GITHUB_ONLY) {
    assert.equal(excluded(name, "jira"), true, `${name} under jira`);
    assert.equal(excluded(name, "github"), false, `${name} under github`);
  }
});

// ── 2. the vcs-axis guard ────────────────────────────────────────────────────

test("dual-platform skills are never excluded under either tracker", () => {
  for (const name of NEVER_EXCLUDED) {
    assert.equal(excluded(name, "github"), false, `${name} under github`);
    assert.equal(excluded(name, "jira"), false, `${name} under jira`);
  }
});

test("whole-line matching — a name that is only a substring is not excluded", () => {
  // `grep -qxF`, not `grep -qF`. Without -x, grep treats the SKILL NAME as the
  // pattern and each list entry as the haystack, so a shorter name matches any
  // classified skill it is a substring of: "sync-jira" would match the line
  // "sync-jira-epic" and be wrongly pruned. Assert that direction — a *longer*
  // name like sync-jira-epic-v2 is not matched by -F either, so testing it
  // proves nothing about -x.
  assert.equal(excluded("sync-jira", "github"), false);
  assert.equal(excluded("jira-sprint", "github"), false);
  assert.equal(excluded("sync-github", "jira"), false);
  // The opposite direction, for completeness — neither flag should match it.
  assert.equal(excluded("sync-jira-epic-v2", "github"), false);
});

// ── 3. --all-skills and the empty tracker ────────────────────────────────────

test("--all-skills disables the filter entirely", () => {
  // The integration test below drives the real `--all-skills` flag through the
  // parser; this one pins the predicate's own short-circuit.
  for (const name of [...JIRA_ONLY, ...GITHUB_ONLY]) {
    assert.equal(excluded(name, "github", "ALL_SKILLS=true"), false);
    assert.equal(excluded(name, "jira", "ALL_SKILLS=true"), false);
  }
});

test("an empty tracker excludes nothing", () => {
  for (const name of [...JIRA_ONLY, ...GITHUB_ONLY]) {
    assert.equal(excluded(name, ""), false, name);
  }
});

// ── 4. resolution order ──────────────────────────────────────────────────────

test("skills-config.yaml beats $TRACKER — the --update case", () => {
  // main() calls install_skills on --update and returns before select_platform,
  // so $TRACKER is unset there. A resolver trusting $TRACKER first would be
  // inert exactly where it is needed. Reversing the order fails this.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: github\n");
    assert.equal(resolveTracker(dir, { TRACKER: "jira" }), "github");
  });
});

test("an explicit tracker beats a stale JIRA_URL in .env", () => {
  // .env files outlive the setup that wrote them. Trusting one over an explicit
  // `tracker: github` would prune the six GitHub-sync skills the consumer uses.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: github\n");
    writeFileSync(path.join(dir, ".env"), "JIRA_URL=https://x.atlassian.net\n");
    assert.equal(resolveTracker(dir), "github");
  });
});

test("a JIRA_URL in .env resolves jira when no config key says otherwise", () => {
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, ".env"), "JIRA_URL=https://x.atlassian.net\n");
    assert.equal(resolveTracker(dir), "jira");
  });
});

test("a JIRA_URL in the environment resolves jira", () => {
  inTempRepo((dir) =>
    assert.equal(
      resolveTracker(dir, { JIRA_URL: "https://x.atlassian.net" }),
      "jira",
    ),
  );
});

test("nothing to go on resolves github, not empty", () => {
  // THE REGRESSION THIS FILE EXISTS FOR. write_skills_config writes a `tracker:`
  // key only for Jira consumers, so before the github default a GitHub consumer
  // on --update matched no probe, resolved to "", and excluded nothing — the
  // filter was inert on the one path task 83 was written to fix.
  inTempRepo((dir) => assert.equal(resolveTracker(dir), "github"));
});

test("the tracker: map form is not read as a platform", () => {
  // `tracker:` with a nested workflowFile carries no platform identity. The old
  // hazard was returning the literal string "workflowFile".
  inTempRepo((dir) => {
    writeFileSync(
      path.join(dir, "skills-config.yaml"),
      "tracker:\n  workflowFile: tracker-workflow.yaml\n",
    );
    const got = resolveTracker(dir);
    assert.notEqual(got, "workflowFile");
    assert.equal(got, "github");
  });
});

test("the resolver only ever returns jira or github", () => {
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: nonsense\n");
    assert.ok(["jira", "github"].includes(resolveTracker(dir)));
  });
});

// ── 5. classification drift guard ────────────────────────────────────────────

test("every tracker-specific skill in the tree is classified exactly once", () => {
  // Risk 3's mitigation. A new sync-jira-* skill that nobody classifies would
  // silently install on GitHub consumers, reverting this task's behaviour with
  // no error anywhere. This is the check that makes the lists maintainable.
  const skillsDir = path.join(REPO, "skills");
  const tracked = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => /jira|github/.test(n));

  const unclassified = tracked.filter(
    (n) => !JIRA_ONLY.includes(n) && !GITHUB_ONLY.includes(n),
  );
  assert.deepEqual(
    unclassified,
    [],
    `unclassified tracker skill(s): ${unclassified.join(", ")} — add each to SKILLS_JIRA_ONLY or SKILLS_GITHUB_ONLY in scripts/setup-consumer.sh (and to this test's mirrors)`,
  );

  const both = JIRA_ONLY.filter((n) => GITHUB_ONLY.includes(n));
  assert.deepEqual(both, [], "a skill may not appear in both lists");
});

test("the test's mirrors match the script's constants", () => {
  const readList = (name) =>
    callFn(`printf '%s' "$${name}"`).split("\n").filter(Boolean);
  assert.deepEqual(readList("SKILLS_JIRA_ONLY").sort(), [...JIRA_ONLY].sort());
  assert.deepEqual(
    readList("SKILLS_GITHUB_ONLY").sort(),
    [...GITHUB_ONLY].sort(),
  );
});

test("every classified skill actually exists in the tree", () => {
  for (const name of [...JIRA_ONLY, ...GITHUB_ONLY]) {
    assert.ok(
      existsSync(path.join(REPO, "skills", name, "SKILL.md")),
      `${name} is classified but has no skills/${name}/SKILL.md`,
    );
  }
});

// ── 6. install_skills integration, over a fixture tarball ────────────────────

/**
 * Build a tarball shaped like a release archive — `<root>/skills/<name>/SKILL.md`,
 * which `tar --strip-components=1` flattens to `skills/<name>/`.
 */
function makeFixtureTarball(dir, names) {
  const stage = path.join(dir, "stage", "agent-skills-fixture");
  for (const n of names) {
    mkdirSync(path.join(stage, "skills", n), { recursive: true });
    writeFileSync(
      path.join(stage, "skills", n, "SKILL.md"),
      `---\nname: ${n}\n---\n`,
    );
  }
  const tarball = path.join(dir, "skills.tar.gz");
  execFileSync("tar", [
    "-czf",
    tarball,
    "-C",
    path.join(dir, "stage"),
    "agent-skills-fixture",
  ]);
  return tarball;
}

const FIXTURE_SKILLS = [
  ...JIRA_ONLY,
  ...GITHUB_ONLY,
  "create-pr",
  "create-branch",
  "develop-task",
];

/**
 * Run install_skills against a local fixture tarball. `_version_tarball` is
 * overridden to a file:// URL so no network is touched, and `_resolve_skills_version`
 * is pinned so no release lookup happens either.
 */
function runInstall(dir, tarball, { env = {}, args = "" } = {}) {
  return execFileSync(
    "bash",
    [
      "-c",
      `set -uo pipefail
       export SETUP_CONSUMER_NO_MAIN=1
       source '${WIZARD}' ${args}
       _resolve_skills_version() { echo fixture; }
       _version_tarball() { echo 'file://${tarball}'; }
       install_skills`,
    ],
    {
      cwd: dir,
      input: "Y\n",
      env: (() => {
        const clean = { ...process.env };
        delete clean.JIRA_URL;
        delete clean.TRACKER;
        return { ...clean, ...env, SETUP_CONSUMER_NO_MAIN: "1" };
      })(),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}

const installed = (dir) => {
  const p = path.join(dir, ".agents", "skills");
  return existsSync(p) ? readdirSync(p).sort() : [];
};

test("fresh install with tracker github prunes the Jira-only skills", () => {
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: github\n");
    const tarball = makeFixtureTarball(dir, FIXTURE_SKILLS);
    const out = runInstall(dir, tarball);
    const got = installed(dir);

    for (const n of JIRA_ONLY)
      assert.ok(!got.includes(n), `${n} should be pruned`);
    for (const n of GITHUB_ONLY)
      assert.ok(got.includes(n), `${n} should install`);
    assert.ok(got.includes("create-pr"), "create-pr must always install");
    assert.equal(got.length, FIXTURE_SKILLS.length - JIRA_ONLY.length);
    assert.match(out, /skipped \(github\)/);
  });
});

test("fresh install with tracker jira prunes the GitHub-only skills", () => {
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: jira\n");
    const tarball = makeFixtureTarball(dir, FIXTURE_SKILLS);
    runInstall(dir, tarball);
    const got = installed(dir);

    for (const n of GITHUB_ONLY)
      assert.ok(!got.includes(n), `${n} should be pruned`);
    for (const n of JIRA_ONLY)
      assert.ok(got.includes(n), `${n} should install`);
    assert.equal(got.length, FIXTURE_SKILLS.length - GITHUB_ONLY.length);
  });
});

test("no config key and no JIRA_URL still prunes — the --update path", () => {
  // Companion to the resolver test above, at the level that actually matters:
  // this is a whole install with nothing to go on, which is what an existing
  // GitHub consumer running --update looks like.
  inTempRepo((dir) => {
    const tarball = makeFixtureTarball(dir, FIXTURE_SKILLS);
    runInstall(dir, tarball);
    const got = installed(dir);
    for (const n of JIRA_ONLY)
      assert.ok(!got.includes(n), `${n} should be pruned`);
    assert.ok(got.includes("sync-github-story"));
  });
});

test("GRANDFATHER — an excluded skill already on disk survives the install", () => {
  // The single most important assertion in this file. Deleting an installed
  // skill breaks a consumer's workflow days later and far from the cause.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: github\n");
    const preexisting = path.join(dir, ".agents", "skills", "sync-jira-story");
    mkdirSync(preexisting, { recursive: true });
    writeFileSync(
      path.join(preexisting, "SKILL.md"),
      "---\nname: sync-jira-story\n---\n",
    );
    writeFileSync(path.join(preexisting, "LOCAL-MARKER"), "do not delete me");

    const tarball = makeFixtureTarball(dir, FIXTURE_SKILLS);
    const out = runInstall(dir, tarball);

    assert.ok(
      installed(dir).includes("sync-jira-story"),
      "kept skill was deleted",
    );
    assert.ok(
      existsSync(path.join(preexisting, "LOCAL-MARKER")),
      "the kept skill's directory was replaced rather than left alone",
    );
    assert.match(
      out,
      /kept\s+sync-jira-story \(already installed; not pruned\)/,
    );
    assert.match(out, /1 kept/);
    // The other ten Jira skills are not on disk, so they are still pruned.
    for (const n of JIRA_ONLY.filter((n) => n !== "sync-jira-story")) {
      assert.ok(!installed(dir).includes(n), `${n} should be pruned`);
    }
  });
});

test("--all-skills installs everything regardless of tracker", () => {
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: github\n");
    const tarball = makeFixtureTarball(dir, FIXTURE_SKILLS);
    runInstall(dir, tarball, { args: "--all-skills" });
    assert.equal(installed(dir).length, FIXTURE_SKILLS.length);
  });
});

test("--dry-run writes nothing and names the tracker and exclusion set", () => {
  // Deliberately NOT asserting per-skill counts: the dry-run branch returns
  // before the tarball is downloaded, so it has no skill list to count, and
  // making it download one would put a network request in a dry run.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: github\n");
    const tarball = makeFixtureTarball(dir, FIXTURE_SKILLS);
    const out = runInstall(dir, tarball, { args: "--dry-run" });
    assert.equal(installed(dir).length, 0, "dry-run wrote to .agents/skills");
    assert.match(out, /tracker resolves to 'github'/);
    assert.match(out, /Jira-only skills/);
  });
});
