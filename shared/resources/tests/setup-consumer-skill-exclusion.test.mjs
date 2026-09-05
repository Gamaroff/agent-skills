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
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
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
const RESOLVER = path.join(REPO, "shared", "resources", "resolve-platform.sh");

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
 * The environment every helper here starts from: the developer's, minus every
 * variable either resolver consults. An ambient one silently flips a resolver
 * assertion, which is the worst shape a test failure can take — it fails against
 * correct code, or passes without testing the fixture.
 *
 * Kept as ONE list rather than per-helper copies. It was THREE copies once —
 * `callFn`, `runtimeTracker` and `runInstall` — and the rot is visible in the
 * shape they had: the first scrubbed three variables, and the two written after
 * it by copying scrubbed two apiece, each having quietly dropped one. Only
 * `runtimeTracker`'s omission was ever exposed (it dropped `SKILLS_CONFIG_FILE`,
 * which resolve-platform.sh honours as an override of *which file to read*, so
 * an exported value redirected every parity case away from its fixture) — but a
 * list maintained in three places was going to lose an entry somewhere, and
 * which copy got caught first was luck. If you add a variable either resolver
 * reads, add it here, and resist adding a second list anywhere.
 *
 *   JIRA_URL                — identity fallback in BOTH resolvers
 *   SKILLS_CONFIG_FILE      — resolve-platform.sh: names the config file to read
 *   AGENT_SKILLS_ACCESS_*   — resolve-platform.sh: an invalid value makes it
 *                             `return 1`, leaving TRACKER unset or stale
 *   TRACKER / ALL_SKILLS    — setup-consumer.sh globals the tests set explicitly
 */
function hermeticEnv(env = {}) {
  const clean = { ...process.env };
  for (const k of [
    "JIRA_URL",
    "SKILLS_CONFIG_FILE",
    "AGENT_SKILLS_ACCESS_TRACKER",
    "AGENT_SKILLS_ACCESS_VCS",
    "TRACKER",
    "ALL_SKILLS",
  ]) {
    delete clean[k];
  }
  return { ...clean, ...env };
}

/**
 * Source the wizard with SETUP_CONSUMER_NO_MAIN=1 and run `snippet` against its
 * function definitions, in the scrubbed environment above.
 */
function callFn(snippet, { cwd = REPO, env = {} } = {}) {
  const clean = hermeticEnv();
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

/**
 * Resolve TRACKER the way the INSTALLER does, mapping its exit-status contract
 * onto the same vocabulary `runtimeTracker` uses:
 *
 *   rc 0 → the tracker string        rc 2 → "<refused>"        rc 3 → "<unresolved>"
 *
 * The condition form is not a style choice. `source`ing the wizard brings its
 * `set -euo pipefail` into this shell, so a BARE `v=$(_resolve_install_tracker)`
 * is killed by errexit the moment the resolver refuses — which reports a
 * deliberate refusal as a crashed harness. That is the same defect class the
 * wizard's own call sites carry a comment about.
 */
/** Like `callFn`, but returns the snippet's STDERR — some behaviour is only visible there. */
function callFnStderr(snippet, { cwd = REPO, env = {} } = {}) {
  const clean = hermeticEnv();
  const res = spawnSync(
    "bash",
    [
      "-c",
      `set -uo pipefail
       export SETUP_CONSUMER_NO_MAIN=1
       source '${WIZARD}'
       ${snippet}`,
    ],
    {
      cwd,
      env: { ...clean, ...env, SETUP_CONSUMER_NO_MAIN: "1" },
      encoding: "utf8",
    },
  );
  return res.stderr || "";
}

function resolveTracker(cwd, env = {}) {
  return callFn(
    `rc=0; v=$(_resolve_install_tracker 2>/dev/null) || rc=$?
     case $rc in
       0) printf '%s' "$v" ;;
       2) printf '<refused>' ;;
       3) printf '<unresolved>' ;;
       *) printf '<rc%s>' "$rc" ;;
     esac`,
    { cwd, env },
  );
}

/**
 * Resolve TRACKER the way a skill does at RUN time — by sourcing
 * resolve-platform.sh, the real thing, not a re-implementation. Comparing the
 * two resolvers directly is what makes the parity test below falsifiable: an
 * assertion against a hardcoded expectation would still pass if both sides
 * drifted together.
 */
function runtimeTracker(cwd, env = {}) {
  // Print the resolver's own exit status alongside the value. Without it a
  // future regression that makes resolve-platform.sh REFUSE a legal config is
  // reported as "the two resolvers disagree", which sends the reader to the
  // wrong file.
  const out = execFileSync(
    "bash",
    [
      "-c",
      `source '${RESOLVER}' >/dev/null 2>&1; rc=$?; printf '%s\\n%s' "$rc" "\${TRACKER:-}"`,
    ],
    { cwd, env: hermeticEnv(env), encoding: "utf8" },
  );
  const [rc, ...rest] = out.split("\n");
  // A REFUSAL is a legitimate resolution outcome, not a harness failure: the
  // resolver is contracted to reject an unrecognised `tracker:` scalar. Report
  // it in the same vocabulary `resolveTracker` uses so the two can be compared
  // directly — the whole point of the parity assertion.
  //
  // This used to `assert.equal(rc, "0")`, which made the refusal case
  // untestable through this helper: the assertion fired before any comparison
  // could happen, and the parity gap on `tracker: bitbucket` stayed invisible.
  if (rc !== "0") return "<refused>";
  return rest.join("\n").trim();
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

// NOTE: this no longer pins what its name says. The installer does not read
// $TRACKER any more (the rung was removed with the local implementation), and
// resolve-platform.sh unsets TRACKER before doing anything, so the injected
// value cannot influence the result under any implementation. What it still
// pins is that an explicit config key resolves to github. Kept, renamed in
// spirit by this comment rather than deleted, because the config-key half is a
// real assertion.
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

test("the resolver never emits a raw config token as a tracker", () => {
  // The property being protected is that a garbage `tracker:` value can never
  // reach the filter AS a tracker — `_skill_excluded_for_tracker "x" "nonsense"`
  // matches no classification list, so every skill would be kept and the filter
  // would be silently inert.
  //
  // Task 91 changed HOW that is guaranteed. This test used to assert the value
  // was coerced to `jira` or `github`; the installer got there by falling
  // through its `case` to the github default. That silent coercion was itself a
  // divergence — resolve-platform.sh refuses the same config, and
  // configuration.md has always documented that it halts the run — so a repo
  // with a typo'd tracker installed a github-filtered set whose skills then
  // refused to start. Refusing is now the guarantee, and it is the stronger one:
  // the operator is told which file and which value, rather than getting a
  // working-looking install of the wrong half of the skills.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: nonsense\n");
    const got = resolveTracker(dir);
    assert.equal(
      got,
      "<refused>",
      "an unrecognised scalar is refused, not coerced",
    );
    assert.ok(
      !["nonsense"].includes(got),
      "and the raw token never escapes as a tracker value",
    );
  });
});

// ── 4b. install-time / run-time parity on how the VALUE is spelled ───────────

// The order was mirrored from the start; the value parsing was not. The
// installer read the config with `awk '{print $2}'` against a `[a-z]` pattern,
// so a quoted scalar did not match the pattern at all and a CRLF line left a
// trailing carriage return on the token — both fell through to the `github`
// default while resolve-platform.sh parsed them as `jira`. The consequence was
// a Jira repo installing with none of its eleven Jira skills, silently, the
// failure surfacing days later inside a pipeline step.
//
// Each case asserts the two resolvers AGREE, and separately what they agree on.
//
// HONEST NOTE ON WHAT THE AGREEMENT HALF PROVES SINCE DELEGATION. In a bare temp
// repo `_locate_resolver` finds this repo's own shared/resources/resolve-platform.sh
// — the very file `runtimeTracker` sources — so the two sides cannot disagree by
// construction, and `assert.equal(install, runtime)` is close to a tautology for
// every row below. That is the intended end state (one implementation, not two),
// but it means the line carrying information TODAY is `assert.equal(install, expected)`.
//
// The agreement assertion is kept because it stops being a tautology the moment
// the installer stops delegating — which is exactly the regression worth
// catching, and the reason the original two-implementation drift went unnoticed
// for so long. It is a regression detector, not present-tense proof.
const PARITY_CASES = [
  ["tracker: jira\n", "jira", "bare scalar"],
  ['tracker: "jira"\n', "jira", "double-quoted"],
  ["tracker: 'jira'\n", "jira", "single-quoted"],
  ["tracker: jira\r\n", "jira", "CRLF line ending"],
  ['tracker: "github"\n', "github", "double-quoted github"],
  ["tracker: github\r\n", "github", "CRLF github"],
  ["tracker: jira   # which tracker\n", "jira", "trailing comment"],
  ["tracker: jira    \n", "jira", "trailing whitespace"],
  ["tracker: auto\n", "github", "auto with no JIRA_URL"],
  ["tracker:\n  workflowFile: tracker-workflow.yaml\n", "github", "map form"],
  // ── added by task 91 ──────────────────────────────────────────────────────
  // An unrecognised scalar. configuration.md has always promised this halts the
  // run, and resolve-platform.sh has always delivered that — but the installer
  // fell through its `case` to the github default and filtered on the guess, so
  // a repo with a typo'd tracker installed a github set while every skill in it
  // refused to start. Both sides now refuse.
  ["tracker: bitbucket\n", "<refused>", "unrecognised scalar"],
  // A tab separator. `yaml.safe_load` rejects it, so the runtime's typed bulk
  // read reports the file unparseable and falls back to detection → github. The
  // installer's `awk` was happy to treat a tab as whitespace and read `jira`.
  //
  // This one is why the delegation had to be WHOLESALE: `read_config_key` alone
  // returns `jira` here, so delegating only the config read would have moved the
  // divergence down a layer rather than closing it.
  ["tracker:\tjira\n", "github", "tab separator"],
];

for (const [config, expected, label] of PARITY_CASES) {
  test(`install and run time agree on \`${label}\``, () => {
    inTempRepo((dir) => {
      writeFileSync(path.join(dir, "skills-config.yaml"), config);
      const install = resolveTracker(dir);
      const runtime = runtimeTracker(dir);
      assert.equal(
        install,
        runtime,
        `installer resolved "${install}" but resolve-platform.sh resolved "${runtime}" — ` +
          `install time and run time must not disagree about what platform this repo is`,
      );
      assert.equal(install, expected, `${label} should resolve ${expected}`);
    });
  });
}

test("a lone unmatched quote is not silently repaired", () => {
  // Strip a MATCHED pair only. `tracker: "jira` is malformed, not a Jira repo,
  // and should land on the default rather than be guessed at.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), 'tracker: "jira\n');
    assert.equal(resolveTracker(dir), "github");
  });
});

test("install and run time agree on a `.env`-only JIRA_URL", () => {
  // HISTORY, so the reversal is not mistaken for drift. Until task 91 this test
  // was called "the .env probe is a DELIBERATE asymmetry, not an oversight" and
  // asserted the OPPOSITE of what it asserts now: installer `jira`, runtime
  // `github`. The asymmetry really was deliberate — `_resolve_install_tracker`
  // read `.env` because the installer runs once, often in a plain shell, while
  // skills run later in a shell that already has JIRA_URL. Deleting the probe
  // to reach parity was rejected (task.83.bug.2): it trades a rare disagreement
  // for a common one.
  //
  // Task 91 closed it from the other side — resolve-platform.sh now reads `.env`
  // too, below the process environment and below the config key. That is a
  // behaviour change for every skill, and the old test's failure message said
  // exactly this: "if you changed that, update the installer and this test
  // together". This is that update.
  //
  // Needs a fixture DIRECTORY, not just a config string, so it cannot join
  // PARITY_CASES — both resolvers read `.env` relative to the working directory.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, ".env"), "JIRA_URL=https://x.atlassian.net\n");
    const install = resolveTracker(dir);
    const runtime = runtimeTracker(dir);
    assert.equal(
      install,
      runtime,
      `installer resolved "${install}" but resolve-platform.sh resolved "${runtime}" — ` +
        `a JIRA_URL in .env must not install one platform's skills and run as the other`,
    );
    assert.equal(
      install,
      "jira",
      "a JIRA_URL in .env implies jira on both sides",
    );
  });
});

test("an explicit `tracker:` key still beats a stale JIRA_URL in .env", () => {
  // The documented one-line opt-out for the behaviour change above, and the
  // mitigation the CHANGELOG points at. If this ever goes red, a repo that
  // pinned `tracker: github` to protect itself from a stale .env has lost that
  // protection — which is the migration hazard, not a cosmetic ordering detail.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: github\n");
    writeFileSync(
      path.join(dir, ".env"),
      "JIRA_URL=https://stale.atlassian.net\n",
    );
    assert.equal(
      runtimeTracker(dir),
      "github",
      "config key beats .env at run time",
    );
    assert.equal(
      resolveTracker(dir),
      "github",
      "config key beats .env at install time",
    );
  });
});

test("a non-tracker refusal does not block the install and does not blame `tracker:`", () => {
  // THE REGRESSION GUARD FOR QA CYCLE 1's HIGH FINDING.
  //
  // Delegating to resolve-platform.sh imported its ENTIRE failure surface, and
  // every non-zero return was mapped onto "your tracker: key is wrong".
  // resolve-platform.sh returns 1 from at least five places that have nothing
  // to do with `tracker:` — the access.vcs guard, validate_access_mode, the
  // `access:`-as-a-scalar guard, an unreadable SKILLS_CONFIG_FILE redirect, and
  // the fail-closed unparseable branch. So a repo with a perfectly good
  // `tracker: github` and a restricted access key could not install AT ALL, and
  // was told to fix a key that was already correct. The old implementation
  // never sourced the resolver, so that repo installed fine — a regression.
  //
  // Identity resolves BEFORE access in that file, so the tracker is known even
  // when the run is refused. The installer must use it.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: github\n");
    const got = resolveTracker(dir, { AGENT_SKILLS_ACCESS_VCS: "read-only" });
    assert.equal(
      got,
      "github",
      "an access.vcs refusal must not stop the installer resolving a tracker that is plainly stated",
    );
    assert.notEqual(
      got,
      "<refused>",
      "and must not be reported as a tracker rejection",
    );
  });
});

/**
 * Point the installer's resolver locator at a file WE control, by planting it
 * where `_locate_resolver`'s second candidate looks. This is the only way to
 * exercise what the installer does with a resolver that is present and readable
 * but not functional — the state an interrupted install leaves behind, and the
 * one no test reached until QA cycle 2.
 */
function withPlantedResolver(body, dir) {
  const d = path.join(dir, ".agents", "skills", "x", "references");
  mkdirSync(d, { recursive: true });
  writeFileSync(path.join(d, "resolve-platform.sh"), body);
}

test("a resolver that sources cleanly but sets no TRACKER is refused, not believed", () => {
  // THE REGRESSION GUARD FOR QA CYCLE 2's HIGH.
  //
  // The installer used to carry the resolver's exit status and its TRACKER back
  // on two lines and split on the newline. COMMAND SUBSTITUTION STRIPS TRAILING
  // NEWLINES, so an empty TRACKER collapsed the payload to a bare "0": both
  // halves of the split returned "0", the success test passed, and the function
  // returned the literal string "0" AS A TRACKER. "0" matches no entry in either
  // classification list, so `_skill_excluded_for_tracker` excluded nothing — the
  // filter kept every skill and reported success.
  //
  // That is strictly worse than the bug it replaced, which at least failed
  // loudly. The trigger is a readable file that is not a working resolver, which
  // is exactly what an interrupted install leaves behind — and `_locate_resolver`
  // checks only readability.
  //
  // Asserting `<refused>` rather than `!== "0"` deliberately: the point is not
  // that one particular wrong string is absent, it is that no tracker is
  // produced at all.
  inTempRepo((dir) => {
    withPlantedResolver("true\n", dir);
    assert.equal(
      resolveTracker(dir),
      "<refused>",
      "a resolver that sets no TRACKER must yield no tracker",
    );
  });
});

test("a resolver that emits an ILLEGAL tracker is refused, not trusted", () => {
  // `_locate_resolver` selects a file on READABILITY alone — it never checks
  // that the file is a resolver — so a stale or partially-written copy under
  // .agents/skills/ was trusted verbatim. A planted `TRACKER=bitbucket` was
  // accepted, and `_skill_excluded_for_tracker` then matched no list and KEPT
  // BOTH skill sets: the filter silently inert, which is the same outcome as
  // the newline defect reached through a different door.
  //
  // The real resolver cannot produce this (validate_enum refuses), so the whole
  // exposure was in trusting the located file rather than in any config a user
  // can write. `bitbucket` is the right probe: it is a legal `vcs` value, so it
  // is the shape a plausible corruption would take.
  inTempRepo((dir) => {
    withPlantedResolver("TRACKER=bitbucket\n", dir);
    assert.equal(resolveTracker(dir), "<refused>");
  });
});

test("a resolver that fails silently still produces an explanation", () => {
  // The rc-non-zero twin of the empty-TRACKER case. A resolver that returns
  // non-zero without writing to stderr left the caller printing "see the
  // resolver's message above" with nothing above it — the same unhelpful shape
  // that was fixed for rc=0 one cycle earlier and left standing here.
  //
  // Asserted through stderr because that is where the defect lived; the return
  // code was already correct.
  inTempRepo((dir) => {
    withPlantedResolver("return 1\n", dir);
    const err = callFnStderr("_resolve_install_tracker || true", { cwd: dir });
    assert.match(
      err,
      /without explanation/,
      "a silent failure must still name the file it could not use",
    );
  });
});

test("a resolver that returns non-zero without setting TRACKER is also refused", () => {
  // The sibling case, and the reason the bug above survived review: an rc of 1
  // collapsed to "1", which is neither "0" nor a legal tracker, so it landed on
  // the correct branch by luck. Pinning both means a future change cannot fix
  // one by breaking the other.
  inTempRepo((dir) => {
    withPlantedResolver("return 1\n", dir);
    assert.equal(resolveTracker(dir), "<refused>");
  });
});

test("a planted resolver that DOES set TRACKER is believed", () => {
  // The positive control. Without it, the two tests above would pass against an
  // implementation that refuses every planted resolver for the wrong reason —
  // e.g. one that never finds them at all.
  inTempRepo((dir) => {
    withPlantedResolver("TRACKER=jira\n", dir);
    assert.equal(
      resolveTracker(dir),
      "jira",
      "the planted resolver must actually be the one being consulted",
    );
  });
});

test("a refusal that happens BEFORE identity is resolved still stops the install", () => {
  // The half of the failure surface the discriminator does NOT cover, pinned so
  // the code and its comment cannot drift apart again.
  //
  // `resolve-platform.sh` unsets TRACKER at the top and does not assign it until
  // the Identity block, so any refusal before that point leaves TRACKER empty —
  // the "rc≠0 but TRACKER is legal, so proceed" branch cannot fire. An earlier
  // version of the comment in `_resolve_install_tracker` claimed the
  // SKILLS_CONFIG_FILE redirect guard was covered by that branch. It is not.
  //
  // Stopping is the RIGHT behaviour here — the resolver could not read a config
  // at all, so every skill would refuse at run time too. What must not happen is
  // the installer blaming `skills-config.yaml`, since the complaint is about a
  // different file entirely.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: github\n");
    assert.equal(
      resolveTracker(dir, { SKILLS_CONFIG_FILE: "/nonexistent/nope.yaml" }),
      "<refused>",
      "a pre-identity refusal must not be mistaken for a resolved tracker",
    );
  });
});

test("an illegal `tracker:` is still refused even when nothing else is wrong", () => {
  // The other side of the discriminator above: the resolver leaves the OFFENDING
  // value in TRACKER, which is not a legal one, so this must still be rc 2.
  // Without this pair, a fix for the test above could pass by accepting
  // everything.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: bitbucket\n");
    assert.equal(resolveTracker(dir), "<refused>");
  });
});

// `.env` value spellings. These need a fixture DIRECTORY, so they cannot join
// PARITY_CASES.
//
// HONEST NOTE ON WHAT THE AGREEMENT ASSERTION PROVES HERE: not much. In a bare
// temp repo `_locate_resolver` finds this repo's own
// `shared/resources/resolve-platform.sh` — the very file `runtimeTracker`
// sources — so the two sides cannot disagree by construction, and
// `assert.equal(install, runtime)` is close to a tautology for these rows. It is
// kept because it stops being a tautology the moment the installer stops
// delegating, which is exactly the regression worth catching. The line that
// carries information TODAY is `assert.equal(install, expected)`.
const DOTENV_CASES = [
  ["JIRA_URL=https://x.atlassian.net\n", "jira", "plain assignment"],
  // Was MISSED by the original `^JIRA_URL=.+`. A shell that sourced this .env
  // has JIRA_URL exported and resolves jira; an un-sourced one resolved github
  // — the exact install-vs-run split this rung exists to close.
  ["export JIRA_URL=https://x.atlassian.net\n", "jira", "export prefix"],
  ["  export   JIRA_URL=https://x\n", "jira", "indented export with spaces"],
  ['JIRA_URL="https://x.atlassian.net"\n', "jira", "double-quoted value"],
  // Was a FALSE POSITIVE: the carriage return satisfies `.+`, so an emptied key
  // resolved jira. CRLF is the precise spelling task 83 was written to fix.
  ["JIRA_URL=\r\n", "github", "empty value, CRLF line ending"],
  ['JIRA_URL=""\n', "github", "quoted empty value"],
  ["JIRA_URL=''\n", "github", "single-quoted empty value"],
  ["JIRA_URL=\n", "github", "empty value"],
  ["#JIRA_URL=https://x\n", "github", "commented out"],
  ["MYJIRA_URL=https://x\n", "github", "a different key that ends in JIRA_URL"],
  // LAST match wins, matching what a shell that sources the file would do. The
  // first-match rule reported the first pair as set, which is the same
  // install-vs-run asymmetry this rung exists to close, one level down.
  ["JIRA_URL=https://x\nJIRA_URL=\n", "github", "set then emptied (last wins)"],
  ["JIRA_URL=\nJIRA_URL=https://x\n", "jira", "emptied then set (last wins)"],
];

for (const [dotenv, expected, label] of DOTENV_CASES) {
  test(`install and run time agree on .env \`${label}\``, () => {
    inTempRepo((dir) => {
      writeFileSync(path.join(dir, ".env"), dotenv);
      const install = resolveTracker(dir);
      const runtime = runtimeTracker(dir);
      assert.equal(
        install,
        runtime,
        `installer resolved "${install}" but resolve-platform.sh resolved "${runtime}" — ` +
          `a .env spelling must not install one platform's skills and run as the other`,
      );
      assert.equal(install, expected, `${label} should resolve ${expected}`);
    });
  });
}

test("an empty `JIRA_URL=` in .env is not 'set'", () => {
  // RENAMED. This was called "the process environment still beats .env" and
  // never set a process-environment JIRA_URL — it wrote an empty one to `.env`
  // and asserted github twice, which is an empty-value test, not a precedence
  // test. A test whose name claims a property it does not exercise is worse
  // than a missing one: it makes the property look covered.
  //
  // The precedence it claimed to pin now lives where it can actually be
  // observed — `resolve-platform.test.sh`, scenario "env JIRA_URL wins over an
  // emptied .env", which sets both and so can tell them apart.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, ".env"), "JIRA_URL=\n");
    assert.equal(
      runtimeTracker(dir),
      "github",
      "an empty JIRA_URL= is not set",
    );
    assert.equal(resolveTracker(dir), "github", "and the installer agrees");
  });
});

test("an ambient SKILLS_CONFIG_FILE cannot redirect a fixture", () => {
  // The regression guard for the scrub list. resolve-platform.sh honours
  // SKILLS_CONFIG_FILE as an override of WHICH FILE to read, so an exported
  // value points the runtime resolver at someone else's config while the
  // installer still reads ./skills-config.yaml — and every parity case above
  // fails against code that is correct. Pointed the decoy at the OPPOSITE
  // tracker so a scrub that stops working cannot pass by coincidence.
  inTempRepo((dir) => {
    const decoyDir = mkdtempSync(path.join(tmpdir(), "skill-exclusion-decoy-"));
    try {
      writeFileSync(path.join(dir, "skills-config.yaml"), "tracker: jira\n");
      writeFileSync(
        path.join(decoyDir, "skills-config.yaml"),
        "tracker: github\n",
      );
      process.env.SKILLS_CONFIG_FILE = path.join(
        decoyDir,
        "skills-config.yaml",
      );
      assert.equal(runtimeTracker(dir), "jira", "the decoy won at run time");
      assert.equal(
        resolveTracker(dir),
        "jira",
        "the decoy won at install time",
      );
    } finally {
      delete process.env.SKILLS_CONFIG_FILE;
      rmSync(decoyDir, { recursive: true, force: true });
    }
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
  // Ship the REAL resolver (and the config reader it sources) in the fixture, as
  // the release archive does. Without it every install test resolved the tracker
  // through `_locate_resolver`'s THIRD candidate — this repo's own checkout — so
  // the `release` origin and the `_tmpdir` argument were never exercised by
  // anything, and the real-install comment claiming "$_tmpdir carries a copy of
  // the resolver" was unverified. If a future archive stopped shipping
  // shared/resources/, the suite would have stayed green while every consumer
  // without a checkout got a hard install failure.
  mkdirSync(path.join(stage, "shared", "resources"), { recursive: true });
  for (const f of ["resolve-platform.sh", "read-config.sh"]) {
    copyFileSync(
      path.join(REPO, "shared", "resources", f),
      path.join(stage, "shared", "resources", f),
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
      env: { ...hermeticEnv(env), SETUP_CONSUMER_NO_MAIN: "1" },
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}

const installed = (dir) => {
  const p = path.join(dir, ".agents", "skills");
  return existsSync(p) ? readdirSync(p).sort() : [];
};

test("the tarball's own resolver is what a real install resolves with", () => {
  // Pins `_locate_resolver`'s first candidate — the copy inside the extracted
  // archive, which is the version whose skills will actually run after the
  // install. Nothing exercised it before: the fixture shipped no resolver, so
  // every install test silently fell through to this repo's checkout.
  inTempRepo((dir) => {
    const tarball = makeFixtureTarball(dir, FIXTURE_SKILLS);
    const stage = path.join(dir, "stage", "agent-skills-fixture");
    const out = callFn(`_locate_resolver '${stage}'`, { cwd: dir });
    const [origin, resolverPath] = out.split("\t");
    assert.equal(
      origin,
      "release",
      "the extracted archive must win over any installed copy",
    );
    assert.ok(
      resolverPath.startsWith(stage),
      `resolved ${resolverPath}, which is outside the archive`,
    );
  });
});

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

test("a `.env`-only JIRA_URL installs the set its skills will actually resolve", () => {
  // THE INTEGRATION TEST FOR THE HEADLINE BUG. The parity tests above prove the
  // two resolvers agree; this proves that agreement reaches DISK, which is the
  // thing a consumer experiences.
  //
  // Before task 91 this exact fixture — no `tracker:` key, JIRA_URL only in
  // `.env` — installed the JIRA set (installer probed `.env`) while every skill
  // in it resolved `github` at run time (the resolver did not). The six
  // GitHub-only skills the repo would actually reach for were pruned, silently,
  // and the failure surfaced days later inside a pipeline step as a skill that
  // is not on disk.
  //
  // Asserting the installed set against `runtimeTracker(dir)` rather than
  // against a hardcoded "jira" is deliberate: if a future change flips the
  // resolution, this test follows it and keeps checking the property that
  // matters — install set matches run-time answer — instead of going red for
  // the wrong reason.
  inTempRepo((dir) => {
    writeFileSync(path.join(dir, ".env"), "JIRA_URL=https://x.atlassian.net\n");
    const tarball = makeFixtureTarball(dir, FIXTURE_SKILLS);
    runInstall(dir, tarball);
    const got = installed(dir);

    const runtime = runtimeTracker(dir);
    assert.equal(
      runtime,
      "jira",
      "precondition: skills resolve jira in this repo",
    );

    // The set on disk must be the one a `jira` repo needs.
    for (const n of GITHUB_ONLY)
      assert.ok(
        !got.includes(n),
        `${n} should be pruned — this repo runs as ${runtime}`,
      );
    for (const n of JIRA_ONLY)
      assert.ok(
        got.includes(n),
        `${n} must install — this repo runs as ${runtime}`,
      );
    assert.ok(got.includes("create-pr"), "create-pr must always install");
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
