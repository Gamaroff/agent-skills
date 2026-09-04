// Guards for install profiles + dependency closure (task 84).
//
// Properties, in descending order of how badly a regression would hurt:
//
// (1) ORDER. The tracker filter runs AFTER the closure. `review-story` invokes
//     `ensure-story-jira-issue`, which invokes `sync-jira-story` — so a GitHub
//     consumer's `pipeline` closure genuinely CONTAINS a Jira-only skill until
//     the filter removes it. Filtering first (the natural way to write it)
//     silently reverts task 83 for every profile user, with no error anywhere.
// (2) TERMINATION. The graph has cycles (develop-story ↔ review-story). A
//     visited set, not recursion. A regression here hangs the installer.
// (3) CONFLICTS. A skill in `exclude` that the closure requires is REPORTED,
//     never silently re-added (overriding the user) and never silently omitted
//     (a mid-pipeline failure with no clue as to the cause).
// (4) PROFILE GRANDFATHER. A skill outside the resolved set that is already on
//     disk is KEPT. Same guarantee task 83 makes for the tracker filter.
// (5) CONFIG-FIRST RESOLUTION. `--update` short-circuits before the wizard
//     runs, so the profile must come from skills-config.yaml. Reading the
//     in-process variable first makes --update silently reinstall everything.
//
// The resolver is exercised against INJECTED fixtures, not the real 120-skill
// tree: a unit test that moves with the tree proves nothing about the resolver.
// The real tree is covered by skill-dependencies-drift.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSkillSet } from "../resolve-skill-set.mjs";
import {
  trackerPredicate,
  SKILLS_JIRA_ONLY,
  SKILLS_GITHUB_ONLY,
} from "../resolve-skill-set-cli.mjs";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const WIZARD = path.join(REPO, "scripts", "setup-consumer.sh");
const CLI = path.join(REPO, "shared", "resources", "resolve-skill-set-cli.mjs");

// ── fixtures ─────────────────────────────────────────────────────────────────
// Small, hand-written, and deliberately shaped like the real problem: one
// cycle, one depth-3 chain, and one skill that names BOTH tracker siblings.
const graph = {
  "develop-story": ["create-pr", "review-story", "qa-fix"],
  "review-story": [
    "develop-story",
    "ensure-story-jira-issue",
    "ensure-story-github-issue",
  ],
  "ensure-story-jira-issue": ["sync-jira-story"],
  "ensure-story-github-issue": ["sync-github-story"],
  "create-pr": ["commit-changes"],
  "commit-changes": [],
  "qa-fix": [],
  "sync-jira-story": [],
  "sync-github-story": [],
  lonely: [],
};

const profiles = {
  test: { seeds: ["develop-story"] },
  empty: { seeds: [] },
  full: { seeds: "*" },
};

const allSkills = Object.keys(graph);
const base = { profiles, graph, allSkills };

// ═══════════════════════════════════════════════════════════════════════════
// (1) ORDERING — the tracker filter runs AFTER the closure
// ═══════════════════════════════════════════════════════════════════════════

test("tracker filter runs after closure: a Jira skill reached only via closure is dropped", () => {
  const r = resolveSkillSet({
    ...base,
    profile: "test",
    isExcludedForTracker: (n) =>
      n === "sync-jira-story" || n === "ensure-story-jira-issue",
  });

  // The chain that makes this non-trivial: the seed does not name the Jira
  // skill; it is three hops away.
  assert.ok(
    graph["develop-story"].includes("review-story") &&
      graph["review-story"].includes("ensure-story-jira-issue") &&
      graph["ensure-story-jira-issue"].includes("sync-jira-story"),
    "fixture must keep the seed → … → jira-skill chain, or this test proves nothing",
  );

  assert.ok(
    !r.skills.includes("sync-jira-story"),
    "Jira skill must not be installed",
  );
  assert.ok(!r.skills.includes("ensure-story-jira-issue"));
  assert.deepEqual(r.droppedForTracker, [
    "ensure-story-jira-issue",
    "sync-jira-story",
  ]);
  // The GitHub sibling, reached the same way, survives.
  assert.ok(r.skills.includes("sync-github-story"));
});

test("a dropped skill is not reported as a closure addition", () => {
  const r = resolveSkillSet({
    ...base,
    profile: "test",
    isExcludedForTracker: (n) => n === "sync-jira-story",
  });
  assert.ok(
    !r.closureAdditions.some((a) => a.skill === "sync-jira-story"),
    "reporting a dropped skill as 'pulled in' is a claim the user cannot act on",
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// (2) TERMINATION and completeness
// ═══════════════════════════════════════════════════════════════════════════

test("closure from a seed reaches every transitive callee", () => {
  const r = resolveSkillSet({ ...base, profile: "test" });
  for (const expected of [
    "develop-story",
    "create-pr",
    "review-story",
    "qa-fix",
    "commit-changes", // depth 2, via create-pr
    "sync-jira-story", // depth 3, via review-story → ensure-story-jira-issue
  ]) {
    assert.ok(r.skills.includes(expected), `missing ${expected}`);
  }
  assert.ok(!r.skills.includes("lonely"), "unrelated skill must not appear");
});

test("a cycle terminates and each skill appears exactly once", () => {
  const r = resolveSkillSet({ ...base, profile: "test" });
  assert.equal(
    new Set(r.skills).size,
    r.skills.length,
    "duplicates mean the visited set is not doing its job",
  );
  assert.equal(r.skills.filter((s) => s === "develop-story").length, 1);
  assert.equal(r.skills.filter((s) => s === "review-story").length, 1);
});

test("empty seeds resolve to an empty set without throwing", () => {
  const r = resolveSkillSet({ ...base, profile: "empty" });
  assert.deepEqual(r.skills, []);
  assert.deepEqual(r.conflicts, []);
});

test("results are sorted, so a diff of two runs is stable", () => {
  const r = resolveSkillSet({ ...base, profile: "test" });
  assert.deepEqual(r.skills, [...r.skills].sort());
});

// ═══════════════════════════════════════════════════════════════════════════
// (3) CONFLICTS and include/exclude
// ═══════════════════════════════════════════════════════════════════════════

test("excluding a closure-required skill reports a conflict and does not install it", () => {
  const r = resolveSkillSet({
    ...base,
    profile: "test",
    exclude: ["create-pr"],
  });
  assert.ok(!r.skills.includes("create-pr"), "must not silently re-add");
  const c = r.conflicts.find((x) => x.skill === "create-pr");
  assert.ok(c, "must report the conflict rather than omitting it silently");
  assert.equal(c.requiredBy, "develop-story");
});

test("excluding a profile SEED is also a conflict", () => {
  // A seed is never reached as somebody's callee, so a traversal-only exclude
  // check would let it through into the result.
  const r = resolveSkillSet({
    ...base,
    profile: "test",
    exclude: ["develop-story"],
  });
  assert.ok(!r.skills.includes("develop-story"));
  assert.ok(r.conflicts.some((c) => c.skill === "develop-story"));
});

test("an excluded skill blocks its own subtree rather than being routed around", () => {
  const r = resolveSkillSet({
    ...base,
    profile: "test",
    exclude: ["create-pr"],
  });
  assert.ok(
    !r.skills.includes("commit-changes"),
    "commit-changes is reachable ONLY through create-pr; excluding the parent must not still pull the child in",
  );
});

test("include pulls in a skill outside every profile, with its own closure", () => {
  const r = resolveSkillSet({
    ...base,
    profile: "empty",
    include: ["create-pr"],
  });
  assert.deepEqual(r.skills, ["commit-changes", "create-pr"]);
  assert.deepEqual(r.closureAdditions, [
    { skill: "commit-changes", requiredBy: "create-pr" },
  ]);
});

test("closureAdditions names only skills the user did not ask for", () => {
  // Everything is a seed under `full`, so nothing was "pulled in".
  const r = resolveSkillSet({ ...base, profile: "full" });
  assert.deepEqual(r.skills, [...allSkills].sort());
  assert.deepEqual(
    r.closureAdditions,
    [],
    "under `full` every skill is chosen; reporting any as dependency-pulled is false",
  );
});

test("an unknown profile throws and names the known ones", () => {
  assert.throws(
    () => resolveSkillSet({ ...base, profile: "nope" }),
    /Unknown profile: nope.*test.*empty.*full/s,
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// tracker predicate parity with the shell
// ═══════════════════════════════════════════════════════════════════════════

test("the CLI's tracker lists match setup-consumer.sh's", () => {
  // Drift guard. The lists are duplicated in JS deliberately (parsing the shell
  // script would couple the CLI to its formatting); this is the check that
  // makes the duplication safe.
  const shell = execFileSync("bash", [
    "-c",
    `set -euo pipefail
     export SETUP_CONSUMER_NO_MAIN=1
     source ${JSON.stringify(WIZARD)}
     echo "--JIRA--"; echo "$SKILLS_JIRA_ONLY"
     echo "--GITHUB--"; echo "$SKILLS_GITHUB_ONLY"`,
  ]).toString();

  const section = (name) =>
    shell
      .split(`--${name}--`)[1]
      .split("--")[0]
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  assert.deepEqual([...SKILLS_JIRA_ONLY].sort(), section("JIRA").sort());
  assert.deepEqual([...SKILLS_GITHUB_ONLY].sort(), section("GITHUB").sort());
});

test("trackerPredicate excludes the other tracker's skills, and --all-skills disables it", () => {
  const gh = trackerPredicate("github");
  assert.equal(gh("sync-jira-story"), true);
  assert.equal(gh("sync-github-story"), false);

  const jira = trackerPredicate("jira");
  assert.equal(jira("sync-github-story"), true);
  assert.equal(jira("sync-jira-story"), false);

  assert.equal(trackerPredicate("github", true)("sync-jira-story"), false);
  // An unrecognised tracker filters nothing, matching the shell `case`'s
  // fall-through — it must not filter EVERYTHING.
  assert.equal(trackerPredicate("")("sync-jira-story"), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// CLI contract
// ═══════════════════════════════════════════════════════════════════════════

function runCli(args) {
  return execFileSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("CLI stdout carries skill names only — the report goes to stderr", () => {
  const out = runCli(["--profile", "pipeline", "--tracker", "github"]);
  const lines = out.split("\n").filter(Boolean);
  assert.ok(lines.length > 5);
  for (const line of lines) {
    assert.match(
      line,
      /^[a-z0-9][a-z0-9-]*$/,
      `stdout must be names only; the installer reads every line as a skill. Got: ${line}`,
    );
  }
});

test("CLI --count agrees with the number of names printed", () => {
  const names = runCli(["--profile", "pipeline", "--tracker", "github"])
    .split("\n")
    .filter(Boolean);
  const count = runCli([
    "--profile",
    "pipeline",
    "--tracker",
    "github",
    "--count",
  ]).trim();
  assert.equal(String(names.length), count);
});

test("CLI drops the Jira sync skills under tracker=github and keeps them under jira", () => {
  const gh = runCli(["--profile", "pipeline", "--tracker", "github"]).split(
    "\n",
  );
  const jira = runCli(["--profile", "pipeline", "--tracker", "jira"]).split(
    "\n",
  );
  assert.ok(
    !gh.includes("sync-jira-story"),
    "task 83 must not be undone by closure",
  );
  assert.ok(jira.includes("sync-jira-story"));
  assert.ok(!jira.includes("sync-github-story"));
});

test("CLI exits 2 with empty stdout when a data file is unreadable", () => {
  // Exit 2, not 1, and NOTHING on stdout: the installer treats empty stdout as
  // "install nothing", so a data problem must be distinguishable.
  const r = execFileSync(
    "bash",
    [
      "-c",
      `${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} --graph /nonexistent.json >/tmp/dn-out.$$ 2>/dev/null; echo "rc=$?"; wc -c </tmp/dn-out.$$; rm -f /tmp/dn-out.$$`,
    ],
    { encoding: "utf8" },
  );
  assert.match(r, /rc=2/);
  assert.match(r, /\b0\b/, "stdout must be empty on a data-file failure");
});

test("profiles are meaningfully different sizes — the whole point of the feature", () => {
  const n = (p) =>
    Number(runCli(["--profile", p, "--tracker", "github", "--count"]).trim());
  const [minimal, pipeline, full] = [n("minimal"), n("pipeline"), n("full")];
  assert.ok(
    minimal < pipeline,
    `minimal (${minimal}) must be smaller than pipeline (${pipeline})`,
  );
  assert.ok(
    pipeline < full,
    `pipeline (${pipeline}) must be smaller than full (${full})`,
  );
  // A guard against the failure that nearly shipped: with a prose-scraped graph
  // minimal resolved to 33 and pipeline to 35 — technically ordered, uselessly
  // close. Require real separation, not just inequality.
  assert.ok(
    pipeline < full * 0.75,
    `pipeline (${pipeline}) must be materially below full (${full}), not incidentally below it`,
  );
  assert.ok(
    minimal < pipeline * 0.5,
    `minimal (${minimal}) must be materially below pipeline (${pipeline})`,
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// (5) CONFIG-FIRST RESOLUTION — the --update path
// ═══════════════════════════════════════════════════════════════════════════

/** Source the wizard in `dir` and evaluate `snippet` against its functions. */
function inWizard(dir, snippet, env = {}) {
  return execFileSync(
    "bash",
    [
      "-c",
      `set -uo pipefail
       export SETUP_CONSUMER_NO_MAIN=1
       cd ${JSON.stringify(dir)}
       source ${JSON.stringify(WIZARD)}
       ${snippet}`,
    ],
    {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        ...env,
        SETUP_CONSUMER_NO_MAIN: "1",
      },
    },
  ).trim();
}

function scratch(configBody) {
  const dir = mkdtempSync(path.join(tmpdir(), "skill-profiles-"));
  if (configBody !== null)
    writeFileSync(path.join(dir, "skills-config.yaml"), configBody);
  return dir;
}

test("profile is read from skills-config.yaml, which is what makes --update reproducible", () => {
  const dir = scratch(
    "tracker: github\n\nskills:\n  profile: pipeline\n  include: []\n  exclude: []\n",
  );
  try {
    assert.equal(inWizard(dir, "_config_skills_profile"), "pipeline");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("config beats the in-process wizard variable", () => {
  // --update never runs the wizard, so config must win. If SKILLS_PROFILE were
  // read first, an --update in a shell that happened to export it would install
  // the wrong set.
  const dir = scratch("skills:\n  profile: minimal\n");
  try {
    assert.equal(
      inWizard(dir, "_config_skills_profile", { SKILLS_PROFILE: "full" }),
      "minimal",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an absent skills: block resolves to full — today's behaviour, unchanged", () => {
  const dir = scratch(
    "tracker: github\nprd:\n  prdShardedLocation: docs/prd\n",
  );
  try {
    assert.equal(inWizard(dir, "_config_skills_profile"), "full");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an absent config file resolves to full", () => {
  const dir = scratch(null);
  try {
    assert.equal(inWizard(dir, "_config_skills_profile"), "full");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a `profile:` key outside the skills: block is not picked up", () => {
  // The awk block-scoping is load-bearing: another top-level block with a
  // nested `profile:` must not be read as the skill profile.
  const dir = scratch("other:\n  profile: minimal\n\ntracker: github\n");
  try {
    assert.equal(inWizard(dir, "_config_skills_profile"), "full");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("include/exclude lists are read as comma-separated names", () => {
  const dir = scratch(
    "skills:\n  profile: minimal\n  include: [jira-sprint-manager, review-pr]\n  exclude: [qa-gate]\n",
  );
  try {
    assert.equal(
      inWizard(dir, "_config_skills_list include"),
      "jira-sprint-manager,review-pr",
    );
    assert.equal(inWizard(dir, "_config_skills_list exclude"), "qa-gate");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("_resolve_skill_set rejects non-name output rather than trusting a zero exit", () => {
  // `node` can be shadowed by a shell function (nvm defines one) that prints
  // help text and exits 0. That actually happened while building this feature:
  // ~100 lines of prose were captured as "skill names", every real skill then
  // looked outside the profile, and the install was near-empty and reported as
  // success. A zero exit is not enough; the shape must be checked.
  const dir = scratch("skills:\n  profile: pipeline\n");
  const fakeTarball = mkdtempSync(path.join(tmpdir(), "fake-tarball-"));
  try {
    mkdirSync(path.join(fakeTarball, "shared", "resources"), {
      recursive: true,
    });
    writeFileSync(
      path.join(
        fakeTarball,
        "shared",
        "resources",
        "resolve-skill-set-cli.mjs",
      ),
      "console.log('Usage: nvm --help');\nconsole.log('  nvm install <version>');\n",
    );
    const out = execFileSync(
      "bash",
      [
        "-c",
        `set -uo pipefail
         export SETUP_CONSUMER_NO_MAIN=1
         cd ${JSON.stringify(dir)}
         source ${JSON.stringify(WIZARD)}
         if _resolve_skill_set github ${JSON.stringify(fakeTarball)} >/dev/null 2>&1; then
           echo ACCEPTED
         else
           echo REJECTED
         fi`,
      ],
      {
        encoding: "utf8",
        env: { PATH: process.env.PATH, HOME: process.env.HOME },
      },
    ).trim();
    assert.equal(
      out,
      "REJECTED",
      "garbage on stdout must not be accepted as a skill list",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(fakeTarball, { recursive: true, force: true });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// (4) PROFILE GRANDFATHER — asserted against the script text
// ═══════════════════════════════════════════════════════════════════════════

test("the profile grandfather branch keeps an already-installed skill and continues", () => {
  // Asserted structurally, like task 83's grandfather guard: the `continue` is
  // what protects the kept skill, and dropping it falls through to the rm -rf.
  const src = execFileSync("cat", [WIZARD], { encoding: "utf8" });
  const branch = src.match(/outside profile[\s\S]{0,400}?continue/);
  assert.ok(branch, "the outside-profile grandfather branch must exist");
  assert.match(
    branch[0],
    /_outside\+\+/,
    "kept-but-outside-profile skills must be counted so print_summary can report the divergence",
  );

  // And it must be evaluated BEFORE the destructive copy.
  const keepIdx = src.indexOf("outside profile '${_profile}'");
  const rmIdx = src.indexOf('rm -rf ".agents/skills/${_name}"');
  assert.ok(keepIdx !== -1 && rmIdx !== -1);
  assert.ok(
    keepIdx < rmIdx,
    "the grandfather branch must precede the rm -rf, or a kept skill is deleted first",
  );
});

test("a resolver failure falls back to the unfiltered install, never to an empty one", () => {
  const src = execFileSync("cat", [WIZARD], { encoding: "utf8" });
  assert.match(
    src,
    /Could not resolve skill profile[\s\S]{0,200}installing the unfiltered set/,
    "resolver failure must install everything applicable, not nothing",
  );
  assert.match(
    src,
    /_have_set=false|_have_set" == true/,
    "the membership test must be gated on having actually resolved a set",
  );
});

test("the data files the installer reads out of the tarball exist in the repo", () => {
  for (const f of [
    "shared/resources/skill-profiles.json",
    "shared/resources/skill-dependencies.json",
    "shared/resources/resolve-skill-set.mjs",
    "shared/resources/resolve-skill-set-cli.mjs",
  ]) {
    assert.ok(existsSync(path.join(REPO, f)), `${f} must ship in the tarball`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// The context-budget claim, measured rather than asserted
// ═══════════════════════════════════════════════════════════════════════════

test("pipeline's description budget is materially below full's — both measured in this run", () => {
  // NO BASELINE LITERAL. Both operands are computed from the same tree in the
  // same run, so this asserts a property of the resolver rather than a fact
  // about a past release. An earlier draft pinned `46408 * 0.55`; that number
  // was already wrong when it was written (the tree had moved from 119 skills
  // to 120, and from 46,408 description bytes to ~41,000), and a test pinned to
  // it would go red on an unrelated skill being added.
  const descriptionBytes = (names) => {
    let total = 0;
    for (const name of names) {
      const f = path.join(REPO, "skills", name, "SKILL.md");
      if (!existsSync(f)) continue;
      const fm = readFileSync(f, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fm) continue;
      const d = fm[1].match(/^description:\s*([\s\S]*?)(?=\n[a-zA-Z_-]+:|$)/m);
      if (d) total += Buffer.byteLength(d[1].trim(), "utf8");
    }
    return total;
  };
  const setFor = (p) =>
    runCli(["--profile", p, "--tracker", "github"]).split("\n").filter(Boolean);

  const fullBytes = descriptionBytes(setFor("full"));
  const pipelineBytes = descriptionBytes(setFor("pipeline"));
  const minimalBytes = descriptionBytes(setFor("minimal"));

  assert.ok(
    fullBytes > 0,
    "sanity: full must have a measurable description budget",
  );
  assert.ok(
    pipelineBytes < fullBytes * 0.55,
    `pipeline should cut the description budget well below half: ${pipelineBytes} vs full ${fullBytes}`,
  );
  assert.ok(
    minimalBytes < pipelineBytes,
    `minimal (${minimalBytes}) must be below pipeline (${pipelineBytes})`,
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// QA cycle 1 regressions (TASK-84-001 … 010)
//
// Every one of these is a path that SILENTLY INSTALLED EVERY SKILL, broke CI on
// legal input, or misreported what it did. They share a shape: the mechanism was
// right and the input handling around it was not, so the happy-path tests above
// all passed while these cases were broken.
// ═══════════════════════════════════════════════════════════════════════════

test("001: an unknown or mis-cased include is rejected loudly, not echoed to stdout", () => {
  // Echoing it made the installer's per-line shape guard reject the WHOLE batch,
  // downgrading a typo into a full unfiltered install blamed on node/PATH.
  const r = execFileSync(
    "bash",
    [
      "-c",
      `${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} --profile minimal --tracker github --include Create-PR,NotARealSkill >/tmp/dn-inc.$$ 2>/tmp/dn-incerr.$$; echo "rc=$?"; echo "OUT:$(wc -c </tmp/dn-inc.$$)"; cat /tmp/dn-incerr.$$; rm -f /tmp/dn-inc.$$ /tmp/dn-incerr.$$`,
    ],
    { encoding: "utf8" },
  );
  assert.match(
    r,
    /rc=2/,
    "an unknown include must be an error, not a silent pass",
  );
  assert.match(
    r,
    /OUT:\s*0/,
    "nothing may reach stdout — the installer reads every line as a skill",
  );
  assert.match(r, /unknown skill\(s\) in include: Create-PR, NotARealSkill/);
});

test("002: an empty resolved set exits 0 and is honoured, not read as failure", () => {
  // Excluding every seed of `minimal` legitimately resolves to nothing. Treating
  // empty stdout as failure made the installer install EVERYTHING — the user
  // asked for almost nothing and got the maximum.
  const r = execFileSync(
    "bash",
    [
      "-c",
      `${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} --profile minimal --tracker github --exclude commit-changes,create-branch,create-issue,create-pr,review-code >/tmp/dn-e.$$ 2>/dev/null; echo "rc=$?"; echo "lines=$(grep -c . /tmp/dn-e.$$ || true)"; rm -f /tmp/dn-e.$$`,
    ],
    { encoding: "utf8" },
  );
  assert.match(r, /rc=0/, "an empty set is a legitimate answer, not an error");
  assert.match(r, /lines=0/);
});

test("002b: _resolve_skill_set discriminates on exit code, not on emptiness", () => {
  const src = readFileSync(WIZARD, "utf8");
  assert.match(
    src,
    /_out=\$\(node "\$_cli" "\$\{_args\[@\]\}"\); _rc=\$\?/,
    "the exit code must be captured — emptiness is not a failure signal",
  );
  assert.doesNotMatch(
    src,
    /\[\[ -n "\$_out" \]\] \|\| return 1/,
    "treating empty output as failure inverts the user's intent",
  );
});

test("003: `skills:` with a trailing comment still opens the block", () => {
  // The open rule required nothing after `skills:`, and the close rule then
  // matched that same line — so any trailing content made the whole block
  // invisible and fell back to `full` with NO warning at all.
  for (const header of ["skills:", "skills:   ", "skills:  # which skills"]) {
    const dir = scratch(`${header}\n  profile: minimal\n`);
    try {
      assert.equal(
        inWizard(dir, "_config_skills_profile"),
        "minimal",
        `header ${JSON.stringify(header)} must open the block`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("003b: a `profile:` outside the block is still not picked up", () => {
  // The fix must not widen the block. This is the property the close rule exists
  // for, re-asserted alongside the loosened open rule.
  const dir = scratch(
    "other:  # not skills\n  profile: minimal\ntracker: github\n",
  );
  try {
    assert.equal(inWizard(dir, "_config_skills_profile"), "full");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an explicit empty include list beats a stale environment variable", () => {
  // `include: []` and an absent key are different instructions. Conflating them
  // let a leftover $SKILLS_INCLUDE override what the config explicitly said.
  const withKey = scratch("skills:\n  profile: minimal\n  include: []\n");
  const withoutKey = scratch("skills:\n  profile: minimal\n");
  try {
    assert.equal(
      inWizard(withKey, "_config_skills_list include", {
        SKILLS_INCLUDE: "stale",
      }),
      "",
      "an explicit empty list must win",
    );
    assert.equal(
      inWizard(withoutKey, "_config_skills_list include", {
        SKILLS_INCLUDE: "stale",
      }),
      "stale",
      "an absent key may still fall back to the env var",
    );
  } finally {
    rmSync(withKey, { recursive: true, force: true });
    rmSync(withoutKey, { recursive: true, force: true });
  }
});

test("quoted and unquoted include lists parse identically", () => {
  const q = scratch(
    'skills:\n  profile: minimal\n  include: ["create-pr", "review-pr"]\n',
  );
  const u = scratch(
    "skills:\n  profile: minimal\n  include: [create-pr, review-pr]\n",
  );
  try {
    assert.equal(
      inWizard(q, "_config_skills_list include"),
      inWizard(u, "_config_skills_list include"),
    );
    assert.equal(
      inWizard(u, "_config_skills_list include"),
      "create-pr,review-pr",
    );
  } finally {
    rmSync(q, { recursive: true, force: true });
    rmSync(u, { recursive: true, force: true });
  }
});

test("005: the tracker test precedes the profile test in the install loop", () => {
  // The resolver already removes tracker-excluded skills from the resolved set,
  // so a profile-first check consumed every one of them: `_kept` was always 0,
  // Jira-only skills were reported as "outside profile", and the tracker
  // grandfather warning — which carries the --all-skills and prune advice — was
  // unreachable whenever a profile was active.
  const src = readFileSync(WIZARD, "utf8");
  assert.match(
    src,
    /if ! _skill_excluded_for_tracker "\$_name" "\$_tracker"[\s\S]{0,120}_have_set/,
    "the profile branch must exclude tracker-filtered skills so they reach the tracker branch",
  );
});

test("006: profile skips are counted separately from tracker skips", () => {
  // `_skipped` is rendered as `skipped (${_tracker})`. Folding profile skips into
  // it reported ~85 skills as "not applicable to github" when ~11 were.
  const src = readFileSync(WIZARD, "utf8");
  assert.match(
    src,
    /_not_in_profile\+\+/,
    "profile skips need their own counter",
  );
  assert.match(
    src,
    /\$\{_not_in_profile\} not in profile/,
    "and their own summary phrasing, not the tracker's",
  );
});

test("008: a graph lookup cannot reach Object.prototype or iterate a string", () => {
  // `graph[name] ?? []` walked the prototype chain: a skill named `toString`
  // yielded a function and threw "not iterable", which escaped and left the
  // installer with an empty result it read as failure.
  const r = resolveSkillSet({
    profiles: { t: { seeds: ["toString"] } },
    graph: { toString: "not-an-array", other: ["x"] },
    allSkills: ["toString", "other", "x"],
    profile: "t",
  });
  assert.deepEqual(
    r.skills,
    ["toString"],
    "a non-array value contributes no edges",
  );
});

test("009: a `$`-prefixed profile name is rejected, not silently empty", () => {
  // skill-profiles.json carries a `$comment` documentation key. Accepting it as a
  // profile returned an empty set and exit 0, which the installer then read as a
  // resolver failure — producing a FULL install for a typo'd profile name.
  assert.throws(
    () =>
      resolveSkillSet({
        ...base,
        profile: "$comment",
        profiles: { ...profiles, $comment: { seeds: [] } },
      }),
    /Unknown profile: \$comment/,
  );
});

test("conflicts are reported once per skill, naming every requirer", () => {
  // Previously one excluded skill required by four things printed the same
  // four-line warning four times, while the `.some()` dedupe it had was dead code.
  const r = resolveSkillSet({
    ...base,
    profile: "test",
    exclude: ["create-pr"],
  });
  const entries = r.conflicts.filter((c) => c.skill === "create-pr");
  assert.equal(entries.length, 1, "one entry per skill");
  assert.match(entries[0].requiredBy, /develop-story/);
});

test("010: the dry-run count applies the config's include and exclude", () => {
  // A preview that resolves a different set than the real run would install
  // defeats the purpose of previewing.
  const src = readFileSync(WIZARD, "utf8");
  assert.match(src, /_dry_args\+=\(--include/, "dry-run must pass include");
  assert.match(src, /_dry_args\+=\(--exclude/, "dry-run must pass exclude");
  assert.match(
    src,
    /local _dry_profile _dry_n/,
    "_dry_n must not leak to global scope",
  );
});

test("011: the CLI never calls process.exit() — its stdout is piped", () => {
  // Caught by the repo-wide stdout-drain guard, not by this suite, and it was a
  // real defect: setup-consumer.sh consumes this CLI's stdout through a pipe, and
  // `process.exit()` after a write truncates at the pipe buffer (~64KB). 120 skill
  // names sit well under that today — which is exactly why it would have gone
  // unnoticed until the library grew past it.
  const src = readFileSync(CLI, "utf8");
  const code = src
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  assert.doesNotMatch(
    code,
    /process\.exit\(/,
    "use `process.exitCode = N` and return; see bug.3.stdout-truncation-on-exit",
  );
  assert.match(code, /process\.exitCode = 2/);
});

test("012: an unknown exclude warns and is ignored, rather than failing the install", () => {
  // Asymmetric with `include` on purpose. An unknown include is always a mistake.
  // An unknown exclude is usually a typo — the skill the user wanted gone is
  // still installed, silently — but is legitimately reachable when a committed
  // config outlives a renamed or removed skill, and failing every install for
  // that would be worse than the typo. So it names the entry and proceeds.
  const r = execFileSync(
    "bash",
    [
      "-c",
      `${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} --profile minimal --tracker github --exclude NotARealSkill --count >/tmp/dn-x.$$ 2>/tmp/dn-xe.$$; echo "rc=$?"; echo "count=$(cat /tmp/dn-x.$$)"; cat /tmp/dn-xe.$$; rm -f /tmp/dn-x.$$ /tmp/dn-xe.$$`,
    ],
    { encoding: "utf8" },
  );
  assert.match(r, /rc=0/, "a stale config must not fail the install");
  assert.match(r, /count=5/, "an unknown exclude removes nothing");
  assert.match(r, /exclude names unknown skill\(s\), ignored: NotARealSkill/);
  assert.match(
    r,
    /still being installed/,
    "the consequence must be stated, not just the name",
  );
});

test("012b: a VALID exclude still removes the skill", () => {
  // Guards against the warning path swallowing real excludes.
  const n = Number(
    runCli([
      "--profile",
      "minimal",
      "--tracker",
      "github",
      "--exclude",
      "review-code",
      "--count",
    ]).trim(),
  );
  const base = Number(
    runCli(["--profile", "minimal", "--tracker", "github", "--count"]).trim(),
  );
  assert.equal(n, base - 1, "a known exclude must still take effect");
});

test("the resolved set never contains a tracker-excluded skill — the precondition the install loop's ordering relies on", () => {
  // Fix 005 reordered the install loop so the tracker test runs first. That
  // reorder is only correct BECAUSE the resolver has already stripped
  // tracker-excluded skills from the set the loop greps. Asserted here
  // behaviourally, so the ordering guard is not resting solely on a source-text
  // check of the loop itself.
  for (const [tracker, forbidden] of [
    ["github", SKILLS_JIRA_ONLY],
    ["jira", SKILLS_GITHUB_ONLY],
  ]) {
    for (const profile of ["minimal", "pipeline", "full"]) {
      const set = new Set(
        runCli(["--profile", profile, "--tracker", tracker])
          .split("\n")
          .filter(Boolean),
      );
      for (const skill of forbidden) {
        assert.ok(
          !set.has(skill),
          `${profile}/${tracker} must not resolve ${skill} — the install loop assumes it cannot`,
        );
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// QA cycle 2 — REFUTE PASS regressions.
//
// Two of these were introduced BY cycle 1's fixes. That is the case for running
// cycle 2 as a refute pass over the whole diff rather than a narrowed re-read of
// the repairs: a fix is new code, and it is the least-reviewed code in the set.
// ═══════════════════════════════════════════════════════════════════════════

test("C2-H2: the CLI's exit code is PROPAGATED, so a config typo is not blamed on node", () => {
  // Cycle 1 added `include` validation whose stated purpose was to stop a typo
  // "downgrading to a full unfiltered install and blaming node/PATH". It still
  // did both: _resolve_skill_set collapsed every non-zero rc to 1, so exit 2
  // (config error, already named on stderr) and 127 (node missing) took the same
  // branch and produced the same "check that node is on PATH" advice.
  const src = readFileSync(WIZARD, "utf8");
  assert.match(src, /return \$_rc/, "the CLI's code must reach the caller");
  assert.match(
    src,
    /_resolve_rc -eq 2/,
    "install_skills must branch on 2 and say the config is wrong, not that node is missing",
  );

  const dir = scratch(
    "skills:\n  profile: minimal\n  include: [NotARealSkill]\n",
  );
  const fake = mkdtempSync(path.join(tmpdir(), "rc-tarball-"));
  try {
    mkdirSync(path.join(fake, "shared", "resources"), { recursive: true });
    for (const f of [
      "resolve-skill-set.mjs",
      "resolve-skill-set-cli.mjs",
      "skill-profiles.json",
      "skill-dependencies.json",
    ]) {
      writeFileSync(
        path.join(fake, "shared", "resources", f),
        readFileSync(path.join(REPO, "shared", "resources", f)),
      );
    }
    const rc = execFileSync(
      "bash",
      [
        "-c",
        `export SETUP_CONSUMER_NO_MAIN=1
         cd ${JSON.stringify(dir)}
         source ${JSON.stringify(WIZARD)} >/dev/null 2>&1
         set +e
         _resolve_skill_set github ${JSON.stringify(fake)} >/dev/null 2>&1
         echo $?`,
      ],
      {
        encoding: "utf8",
        env: { PATH: process.env.PATH, HOME: process.env.HOME },
      },
    ).trim();
    assert.equal(rc, "2", "a config error must surface as 2, not 1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(fake, { recursive: true, force: true });
  }
});

test("C2-M1: a zero-skill resolution is honoured but warned about, never silent", () => {
  // Cycle 1's fix #2 made rc-0-with-empty-output authoritative, which is right —
  // but it also made an empty install reachable, and the surrounding comments
  // still claimed that could not happen. "You excluded everything" and
  // "something broke" produce the same `0 new, 0 updated` summary otherwise.
  const src = readFileSync(WIZARD, "utf8");
  assert.match(
    src,
    /resolved to ZERO skills/,
    "the empty case must warn before installing",
  );
  assert.match(
    src,
    /EVEN IF EMPTY/,
    "and the function's documented contract must match what it now does",
  );
});

test("C2-M2: the dry-run preview forwards --all-skills", () => {
  // Without it the preview applies a tracker filter the real run does not:
  // 35 previewed against 41 installed. Cycle 1's test for this greps the very
  // lines the bug was on and could not see it — hence the behavioural check too.
  const src = readFileSync(WIZARD, "utf8");
  assert.match(src, /ALL_SKILLS" == true \]\] && _dry_args\+=\(--all-skills\)/);

  const withFilter = Number(
    runCli(["--profile", "pipeline", "--tracker", "github", "--count"]).trim(),
  );
  const without = Number(
    runCli([
      "--profile",
      "pipeline",
      "--tracker",
      "github",
      "--all-skills",
      "--count",
    ]).trim(),
  );
  assert.ok(
    without > withFilter,
    `--all-skills must widen the set (${withFilter} -> ${without}); if these are equal the flag is inert and this test proves nothing`,
  );
});

test("C2-L1: an explicitly included skill dropped by the tracker filter is announced", () => {
  // An explicit request and a closure by-product are different events. Listing
  // both as `− name (not applicable)` let a user believe they had installed
  // something they had not.
  const err = execFileSync(
    "bash",
    [
      "-c",
      `${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} --profile minimal --tracker github --include sync-jira-story --count 2>&1 >/dev/null`,
    ],
    { encoding: "utf8" },
  );
  assert.match(err, /You asked for sync-jira-story in skills\.include/);
  assert.match(err, /NOT installed/);
  assert.match(err, /--all-skills/, "the escape hatch must be named");
});
