/**
 * finalise bug mode — the skip list is stated once, and the prose agrees with it.
 *
 * task.125 (obs #69). `/finalise` is story/task-shaped: an AC agent, a Change
 * Log acceptance row, `status: accepted`, a sprint review, a registry tick. A bug
 * report has none of those — no ACs, a FORBIDDEN Change Log, a `closed` status
 * written by develop-bug Part B — so every real bug run took the "inline DoD
 * fallback" and hand-wrote the same file (bug.13, bug.14). Bug mode replaces the
 * judgement "does this step apply to a bug?" with a lookup: one table in
 * SKILL.md, § "What bug mode runs and skips", each row keyed, and a
 * `**Bug mode (`key`):** skip|run` marker beside the step it governs.
 *
 * This test holds the table and the markers together in BOTH directions. A row
 * with no marker is a skip the reader executing the prose never sees; a marker
 * with no row is a skip the table does not admit to. Either drifts silently and
 * in the worst direction — a bug-forbidden writer reachable in bug mode. The
 * exclusion that makes the Change Log row forbidden is READ from
 * `document-change-log.md` §Exclusions, never restated here.
 *
 * Mutation proofs (task.125 §9): remove a `skip` row from the table → the
 * bidirectional check goes red; remove the `change-log-row` marker → red; add a
 * `## Change Log` writer to the bug template → red.
 *
 * Run via: node --test evals/shared/tests/finalise-bug-mode.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SKILL = path.join(REPO_ROOT, "skills", "finalise", "SKILL.md");
const TEMPLATE = path.join(
  REPO_ROOT,
  "skills",
  "finalise",
  "assets",
  "bug-dod-template.md",
);
const PROMPT = path.join(
  REPO_ROOT,
  "shared",
  "resources",
  "finalise-dod-fix-evidence-prompt.md",
);
const CHANGE_LOG_SPEC = path.join(
  REPO_ROOT,
  "shared",
  "resources",
  "document-change-log.md",
);
const STEP7 = path.join(
  REPO_ROOT,
  "skills",
  "develop-bug",
  "references",
  "develop-bug-step-7-close-bug.md",
);

const skill = readFileSync(SKILL, "utf8");

// The table: `| \`key\` | Step | story/task | bug |`, under the section heading.
function parseSkipTable(text) {
  const start = text.indexOf("#### What bug mode runs and skips");
  assert.ok(start > -1, 'SKILL.md carries § "What bug mode runs and skips"');
  const body = text.slice(start);
  const rows = [];
  for (const line of body.split("\n")) {
    const m = line.match(
      /^\|\s*`([a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|$/,
    );
    if (!m) continue;
    const [, key, step, storyTask, bug] = m;
    rows.push({
      key,
      step,
      storyTask,
      bug,
      verb: /^\*\*skip/.test(bug) ? "skip" : "run",
    });
  }
  return rows;
}

// The markers: `**Bug mode (\`key\`):** skip …` / `run …` — the placeholder
// `key` in the explanatory sentence is excluded by the literal-key test below.
function parseMarkers(text) {
  const out = new Map();
  const re = /\*\*Bug mode \(`([a-z0-9-]+)`\):\*\*\s+(skip|run)\b/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1] === "key") continue;
    const list = out.get(m[1]) || [];
    list.push(m[2]);
    out.set(m[1], list);
  }
  return out;
}

const rows = parseSkipTable(skill);
const markers = parseMarkers(skill);

// The whole mapping, enumerated — every key the table carries and the verb each
// must read. A non-vacuity floor over an un-enumerated remainder is not a
// mapping (relationship-assertion rule D); this is the one place the expected
// shape is spelled out, and the table is held to it exactly.
const EXPECTED_VERBS = {
  "running-summary": "run",
  "read-document": "run",
  "qa-reports": "run",
  "ac-agent": "skip",
  "fix-evidence": "run",
  "frontmatter-accepted": "skip",
  "change-log-row": "skip",
  "status-history-row": "run",
  "registry-tick": "run",
  "body-dod-section": "skip",
  "sprint-review": "skip",
  "acceptance-commit": "run",
  "pushed-assertions": "run",
  "ci-reading-2": "run",
  "pr-comment": "run",
  "tracker-done": "run",
};

test("the skip table carries exactly the expected keys, each with its expected verb", () => {
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  assert.deepEqual(
    Object.keys(byKey).sort(),
    Object.keys(EXPECTED_VERBS).sort(),
    "the table's key set is the enumerated set — a row added or removed is a decision this test must see",
  );
  for (const [key, verb] of Object.entries(EXPECTED_VERBS)) {
    assert.equal(
      byKey[key].verb,
      verb,
      `\`${key}\` must read "${verb}" in the bug column`,
    );
  }
});

test("every table row has exactly one prose marker, and its verb agrees with the row", () => {
  for (const r of rows) {
    const found = markers.get(r.key);
    assert.ok(
      found,
      `row \`${r.key}\` (${r.step}) has no **Bug mode (\`${r.key}\`):** marker beside its step`,
    );
    assert.equal(
      found.length,
      1,
      `row \`${r.key}\` has ${found.length} markers; expected exactly one`,
    );
    assert.equal(
      found[0],
      r.verb,
      `row \`${r.key}\` says "${r.verb}" in the table but its marker says "${found[0]}"`,
    );
  }
});

test("every prose marker has a table row — a skip the table does not admit to is red", () => {
  const keys = new Set(rows.map((r) => r.key));
  for (const [key] of markers) {
    assert.ok(
      keys.has(key),
      `marker \`${key}\` appears in the prose but has no row in the skip table`,
    );
  }
});

test("the Change Log skip is grounded in the spec's own exclusion, not restated", () => {
  const spec = readFileSync(CHANGE_LOG_SPEC, "utf8");
  const at = spec.indexOf("Exclusions");
  assert.ok(at > -1, "document-change-log.md carries an Exclusions section");
  const exclusions = spec.slice(at);
  assert.match(exclusions, /bug report/i, "§Exclusions names bug reports");
  const row = rows.find((r) => r.key === "change-log-row");
  assert.match(
    row.bug,
    /forbidden/i,
    "the table row says the Change Log row is forbidden, not merely inapplicable",
  );
  assert.match(
    row.bug,
    /document-change-log\.md/,
    "the row cites the exclusion rather than restating it",
  );
});

test("the bug DoD template exists, carries the converged sections, and no Change Log or Status header", () => {
  assert.ok(
    existsSync(TEMPLATE),
    "skills/finalise/assets/bug-dod-template.md exists",
  );
  const t = readFileSync(TEMPLATE, "utf8");
  for (const h of [
    "## Step 1: QA Report Review",
    "## Step 2: Fix Evidence",
    "#### Regression test fails without the fix, passes with it",
    "#### Bundled copies match the source",
    "#### Suite + lint green",
    "### Documentation",
    "## Step 3: Security Review",
    "## Step 4: Compliance Review",
    "## Step 4b: Docs & Changelog",
    "## Step 5: Acceptance Decision",
    "## Verification Complete",
  ]) {
    assert.ok(t.includes(h), `template carries "${h}"`);
  }
  assert.doesNotMatch(
    t,
    /^## Change Log/m,
    "the template never writes a Change Log section",
  );
  const finalStatusLines = t
    .split("\n")
    .filter((l) => /^\*\*Final Status:\*\*/.test(l));
  assert.equal(
    finalStatusLines.length,
    1,
    "exactly one **Final Status:** line (the once-only rule)",
  );
  const header = t.slice(0, t.indexOf("\n---\n"));
  assert.doesNotMatch(
    header,
    /^\*\*Status:\*\*/m,
    "no **Status:** header line — the file's status lives once, at the end",
  );
});

test("the fix-evidence prompt is a shared resource with the AC prompt's citation contract", () => {
  assert.ok(
    existsSync(PROMPT),
    "shared/resources/finalise-dod-fix-evidence-prompt.md exists",
  );
  const p = readFileSync(PROMPT, "utf8");
  assert.match(p, /^fix_evidence:/m, "returns a `fix_evidence:` YAML block");
  assert.match(p, /test_runs_per_pr/, "carries the execution rule");
  assert.match(p, /Citation rule/, "carries the citation rule");
  assert.match(
    p,
    /count.*## Change Log/i,
    "checks that the bug carries no Change Log",
  );
  assert.match(
    skill,
    /finalise-dod-fix-evidence-prompt\.md/,
    "SKILL.md dispatches the prompt in bug mode",
  );
});

test("develop-bug Step 7 Part A invokes finalise --bug and carries no inline DoD fallback", () => {
  const s = readFileSync(STEP7, "utf8");
  assert.match(
    s,
    /Skill\(finalise, args="--bug \{bug-file-path\}"\)/,
    "Part A passes --bug",
  );
  assert.doesNotMatch(
    s,
    /fall back to the equivalent inline DoD/i,
    "the fallback paragraph is gone",
  );
  assert.doesNotMatch(
    s,
    /cannot process the bug document type/i,
    "the fallback paragraph is gone",
  );
  assert.doesNotMatch(
    s,
    /or documented inline DoD fallback/i,
    "the checklist no longer offers the fallback",
  );
});

// The kind block is bash, so it is EXECUTED — extracted from the SKILL.md,
// the one template slot substituted with argv, run under bash and (when the
// host has it) zsh. QA cycle 1 found `DOC_KIND=""` on a general bug without
// the flag by running it; a grep of the text would have passed (TASK-125-BUG-5).
function kindBlock() {
  const i = skill.indexOf('DOC_KIND=""');
  const j = skill.indexOf("```", i);
  assert.ok(
    i > -1 && j > i,
    "the Document-kind block is present as a fenced bash block",
  );
  return (
    skill
      .slice(i, j)
      .replace(
        'DOC_FILE="{the document path argument}"',
        'DOC_FILE="$1"; shift',
      ) + '\nprintf "DOC_KIND=%s\\n" "$DOC_KIND"\n'
  );
}
const SHELLS = [
  "bash",
  ...(spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0
    ? ["zsh"]
    : []),
];
const KIND_CASES = [
  { args: ["docs/bugs/bug.14.x/bug.14.name.md"], kind: "task", hint: true },
  {
    args: ["docs/bugs/bug.14.x/bug.14.name.md", "--bug"],
    kind: "bug",
    hint: false,
  },
  {
    args: ["docs/tasks/task.125.x/task.125.name.md"],
    kind: "task",
    hint: false,
  },
  {
    args: ["docs/tasks/task.67.x/task.67.bug.3.name.md"],
    kind: "task",
    hint: true,
  },
  {
    args: ["docs/tasks/task.67.x/task.67.bug.3.name.md", "--bug"],
    kind: "bug",
    hint: false,
  },
  { args: ["docs/x/story.7.4.bug.4.name.md"], kind: "story", hint: true },
  { args: ["docs/x/story.7.4.name.md"], kind: "story", hint: false },
];
for (const shell of SHELLS) {
  test(`[${shell}] the kind block, executed: every input resolves to a DEFINED kind, and only a bug path without --bug hints`, () => {
    for (const c of KIND_CASES) {
      const r = spawnSync(shell, ["-s", "--", ...c.args], {
        input: kindBlock(),
        encoding: "utf8",
      });
      assert.equal(r.status, 0, r.stderr);
      const kind = (r.stdout.match(/^DOC_KIND=(.*)$/m) || [])[1];
      assert.equal(
        kind,
        c.kind,
        `${c.args.join(" ")} → DOC_KIND=${JSON.stringify(kind)}`,
      );
      assert.equal(
        /^hint: /m.test(r.stdout),
        c.hint,
        `${c.args.join(" ")} hint`,
      );
      if (c.hint)
        assert.match(
          r.stdout,
          new RegExp(`continuing in ${c.kind} mode`),
          "the hint names the kind it continues in",
        );
    }
  });
}

// The 6b derivation is bash, so it is EXECUTED over a fixture directory that
// holds a PARENT task's DoD and gate beside a task BUG's DoD — the layout
// docs/tasks/task.67.* actually has. QA cycle 2 found the directory-wide glob
// picking the parent's files (`.b` sorts before `.d`) (TASK-125-BUG-8).
function derivationBlock() {
  const i = skill.indexOf('MARKER="<!-- finalise-canonical-summary -->"');
  const j = skill.indexOf("# The plain-language lead", i);
  assert.ok(i > -1 && j > i, "the 6b derivation lines are present");
  return (
    skill
      .slice(i, j)
      .replace(/^ {3}/gm, "")
      .replace(/\{document-directory\}/g, '"$DIR"') +
    '\nprintf "DOD_PATH=%s\\nFINAL_GATE=%s\\n" "$DOD_PATH" "$FINAL_GATE"\n'
  );
}
for (const shell of SHELLS) {
  test(`[${shell}] 6b, executed: a co-located task bug's DoD and verdict are its OWN, not its parent's`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), "finalise-6b-"));
    try {
      for (const f of ["task.67.dod.1.parent.md", "task.67.bug.3.dod.1.fix.md"])
        writeFileSync(path.join(dir, f), "");
      writeFileSync(
        path.join(dir, "task.67.gate.2.parent.yml"),
        "gate: FAIL\n",
      );
      const run = (env) =>
        spawnSync(shell, ["-s"], {
          input: derivationBlock(),
          encoding: "utf8",
          env: { PATH: process.env.PATH, DIR: dir, ...env },
        });
      // Bug mode: the bug's stem, the verify loop's verdict.
      let r = run({
        STEM: "task.67.bug.3",
        DOC_KIND: "bug",
        VERIFY_VERDICT: "PASS",
      });
      assert.equal(r.status, 0, r.stderr);
      assert.match(
        r.stdout,
        /DOD_PATH=.*\/task\.67\.bug\.3\.dod\.1\.fix\.md$/m,
        r.stdout,
      );
      assert.match(
        r.stdout,
        /^FINAL_GATE=PASS$/m,
        "the verify-loop verdict, never the parent's gate",
      );
      // Task mode in the same directory: the parent's own artefacts.
      r = run({ STEM: "task.67", DOC_KIND: "task" });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /DOD_PATH=.*\/task\.67\.dod\.1\.parent\.md$/m);
      assert.match(r.stdout, /^FINAL_GATE=FAIL$/m);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("Step 2's bug-mode marker scopes the QA globs to the bug stem (TASK-125-BUG-9)", () => {
  const m = skill.match(
    /\*\*Bug mode \(`qa-reports`\):\*\*[\s\S]*?(?=\n\n\d+\. )/,
  );
  assert.ok(m, "qa-reports marker present");
  assert.match(
    m[0],
    /\$\{STEM\}\.qa\.\*\.md/,
    "QA report glob keyed on the stem",
  );
  assert.match(
    m[0],
    /\$\{STEM\}\.gate\.\*\.yml/,
    "gate glob keyed on the stem",
  );
  assert.match(m[0], /parent/i, "names the parent-directory hazard");
});

test("SKILL.md resolves the kind once and hints on a bug path without --bug", () => {
  assert.match(skill, /DOC_KIND=bug/, "the --bug flag sets DOC_KIND");
  assert.match(
    skill,
    /bug\\\.\[0-9\]\+\\\./,
    "the path check keys on the `.bug.{N}.` segment",
  );
  assert.match(
    skill,
    /hint: .*bug report/,
    "a bug path without the flag prints a hint",
  );
});
