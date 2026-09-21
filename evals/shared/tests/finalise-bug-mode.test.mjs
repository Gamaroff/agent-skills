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
  readdirSync,
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
  // Bounded at the next heading: an unbounded slice would read any later four-column
  // table whose first cell is a backticked token as skip-table rows (cycle-7 CR-4).
  const next = text.slice(start + 1).search(/\n#{2,4} /);
  const body =
    next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
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
      )
      // The flag is a substituted input beside the path (cycle-5 CR-3); the
      // executed cases feed it through env so argv-less runs are covered too.
      .replace(/BUG_FLAG="\{[^\n]*\}"/, 'BUG_FLAG="${BUG_FLAG_IN:-}"') +
    '\nprintf "DOC_KIND=%s\\n" "$DOC_KIND"\n'
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
// holds a PARENT task's DoD and gate beside a task BUG's DoD and implementation
// report — the layout docs/tasks/task.67.* actually has. QA cycle 2 found the
// directory-wide glob picking the parent's files (`.b` sorts before `.d`)
// (TASK-125-BUG-8); QA cycle 3 found the first version of this test INJECTING
// DOC_KIND and VERIFY_VERDICT through env, so it could not see that no command
// bound them in the block (TASK-125-BUG-12). Only STEM and DIR are inputs here;
// the kind comes from argv and the verdict from the fixture report.
function derivationBlock() {
  const i = skill.indexOf('MARKER="<!-- finalise-canonical-summary -->"');
  const j = skill.indexOf("# The plain-language lead", i);
  assert.ok(i > -1 && j > i, "the 6b derivation lines are present");
  return (
    skill
      .slice(i, j)
      .replace(/^ {3}/gm, "")
      .replace(/\{document-directory\}/g, '"$DIR"')
      // Both inputs are substituted placeholders in the block (TASK-125-BUG-15);
      // the harness feeds them through env, and a case that leaves one unset is
      // exactly the run the block must refuse.
      .replace(/STEM="\{[^\n]*\}"/, 'STEM="${STEM_IN:-}"')
      .replace(/DOC_KIND="\{[^\n]*\}"/, 'DOC_KIND="${KIND_IN:-}"') +
    '\nprintf "DOD_PATH=%s\\nFINAL_GATE=%s\\nDOC_KIND=%s\\nCLOSING=%s\\nCYCLES=%s\\n" "$DOD_PATH" "$FINAL_GATE" "$DOC_KIND" "$CLOSING_LINE" "$CYCLES"\n'
  );
}
// `shape` is the implementation report's filename: "short" is the prefix
// develop-bug specifies (`task.67.bug.3.implementation.1.*`); "full" is the bug
// file's whole stem (`task.67.bug.3.six-b.implementation.1.*`), which the three
// most recent real develop-bug runs wrote and the short-only glob could not see
// (TASK-125-BUG-13).
function sixBFixture({ verdict = "PASS", shape = "short" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "finalise-6b-"));
  for (const f of ["task.67.dod.1.parent.md", "task.67.bug.3.dod.1.fix.md"])
    writeFileSync(path.join(dir, f), "");
  writeFileSync(path.join(dir, "task.67.gate.2.parent.yml"), "gate: FAIL\n");
  writeFileSync(
    path.join(
      dir,
      shape === "full"
        ? "task.67.bug.3.six-b.implementation.1.run.md"
        : "task.67.bug.3.implementation.1.run.md",
    ),
    verdict === null
      ? "## QA Iteration History\n\n### Verify Cycle 1\n**Regression test**: pass\n"
      : `## QA Iteration History\n\n### Verify Cycle 1\n**Verdict**: FAIL\n\n### Verify Cycle 2\n**Verdict**: ${verdict}\n`,
  );
  return dir;
}
for (const shell of SHELLS) {
  // `kind` is the value the block's DOC_KIND placeholder is substituted with;
  // undefined leaves it EMPTY, as does an undefined `stem`.
  const run = (dir, stem, kind) =>
    spawnSync(shell, ["-s", "--"], {
      input: derivationBlock(),
      encoding: "utf8",
      // NOTHING but the inputs the block documents. No VERIFY_VERDICT, no argv.
      env: {
        PATH: process.env.PATH,
        DIR: dir,
        ...(stem === undefined ? {} : { STEM_IN: stem }),
        ...(kind === undefined ? {} : { KIND_IN: kind }),
      },
    });

  test(`[${shell}] 6b, executed with --bug: the bug's DoD, the verify loop's LAST verdict, the bug closing line — nothing injected`, () => {
    const dir = sixBFixture();
    try {
      const r = run(dir, "task.67.bug.3", "bug");
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.match(
        r.stdout,
        /DOD_PATH=.*\/task\.67\.bug\.3\.dod\.1\.fix\.md$/m,
        r.stdout,
      );
      assert.match(
        r.stdout,
        /^FINAL_GATE=PASS$/m,
        "the last **Verdict**: line, never the parent's gate",
      );
      assert.match(r.stdout, /^DOC_KIND=bug$/m);
      // The cycle count is derived in THIS block from the same report (TASK-125-BUG-22):
      // the fixture report carries two Verify Cycle headings.
      assert.match(
        r.stdout,
        /^CYCLES=2$/m,
        `cycle count published by 6b: ${r.stdout}`,
      );
      assert.match(
        r.stdout,
        /^CLOSING=.*Bug fix accepted/m,
        "the closing line names a bug, not status: accepted",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b, executed without the flag in the same directory: the task branch, the parent's own artefacts`, () => {
    const dir = sixBFixture();
    try {
      const r = run(dir, "task.67", "task");
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /DOD_PATH=.*\/task\.67\.dod\.1\.parent\.md$/m);
      assert.match(r.stdout, /^FINAL_GATE=FAIL$/m);
      assert.match(r.stdout, /^DOC_KIND=task$/m);
      assert.match(r.stdout, /^CLOSING=.*Story\/task accepted/m);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b in bug mode with NO **Verdict** line HALTs — never an N/A that looks like a verdict`, () => {
    const dir = sixBFixture({ verdict: null });
    try {
      const r = run(dir, "task.67.bug.3", "bug");
      assert.equal(r.status, 1, "exit 1 is the HALT");
      assert.match(
        r.stdout + r.stderr,
        /HALT: bug mode — no \*\*Verdict\*\*: PASS\|FAIL line found/,
      );
      assert.doesNotMatch(r.stdout, /^FINAL_GATE=/m, "nothing was derived");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b finds the report in the FULL-stem shape develop-bug's recent runs wrote (TASK-125-BUG-13)`, () => {
    const dir = sixBFixture({ shape: "full" });
    try {
      const r = run(dir, "task.67.bug.3", "bug");
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.match(
        r.stdout,
        /^FINAL_GATE=PASS$/m,
        `the full-stem report's verdict, not a HALT: ${r.stdout}${r.stderr}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b publishes the bare verdict token when the line is bolded — 9 of 25 real reports write **Verdict**: **PASS** (cycle-4 CR-3)`, () => {
    const dir = sixBFixture({ verdict: "**PASS** — proceeding to Step 7" });
    try {
      const r = run(dir, "task.67.bug.3", "bug");
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.match(r.stdout, /^FINAL_GATE=PASS$/m, r.stdout);
      assert.doesNotMatch(
        r.stdout,
        /FINAL_GATE=\*\*/,
        "no asterisks reach the comment",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b HALTs on a **Verdict** line that names neither PASS nor FAIL — a token that is not a verdict is not published (cycle-4 CR-3)`, () => {
    const dir = sixBFixture({ verdict: "pending" });
    try {
      const r = run(dir, "task.67.bug.3", "bug");
      assert.equal(r.status, 1, "exit 1 is the HALT");
      assert.doesNotMatch(r.stdout, /^FINAL_GATE=/m, "nothing was derived");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b with a bug STEM and DOC_KIND=task HALTs — a bug prefix with a stale kind is the block run with the wrong input, not a task (cycle-4 CR-2)`, () => {
    const dir = sixBFixture();
    try {
      const r = run(dir, "task.67.bug.3", "task");
      assert.equal(r.status, 1, "exit 1 is the HALT: " + r.stdout + r.stderr);
      assert.match(
        r.stdout + r.stderr,
        /HALT: STEM task\.67\.bug\.3 is a bug prefix but DOC_KIND is task/,
      );
      assert.doesNotMatch(
        r.stdout,
        /^CLOSING=.*Story\/task accepted/m,
        "the task branch did not publish",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b with DOC_KIND=bug and the PARENT's STEM HALTs — the cross-check is symmetric, so a bug run cannot publish the parent task's verdict (cycle-5 CR-6)`, () => {
    const dir = sixBFixture();
    try {
      writeFileSync(
        path.join(dir, "task.67.implementation.1.parent.md"),
        "**Verdict**: FAIL\n",
      );
      const r = run(dir, "task.67", "bug");
      assert.equal(r.status, 1, "exit 1 is the HALT: " + r.stdout + r.stderr);
      assert.match(
        r.stdout + r.stderr,
        /HALT: DOC_KIND is bug but STEM task\.67 is not a bug prefix/,
      );
      assert.doesNotMatch(r.stdout, /^FINAL_GATE=/m, "nothing was derived");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b with STEM unset HALTs — an empty stem is a HALT, never an empty DoD path and gate published at exit 0 (TASK-125-BUG-15)`, () => {
    const dir = sixBFixture();
    try {
      const r = run(dir, undefined, "bug");
      assert.equal(r.status, 1, "exit 1 is the HALT: " + r.stdout + r.stderr);
      assert.match(
        r.stdout + r.stderr,
        /HALT: STEM and DOC_KIND must be bound in this block/,
      );
      assert.doesNotMatch(
        r.stdout,
        /^DOD_PATH=/m,
        "nothing was derived, nothing would post",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b with both report shapes on disk picks the NEWEST by number, not the last by path (TASK-125-BUG-14)`, () => {
    // Full-stem implementation.1 says FAIL; short-prefix implementation.2 says PASS.
    // `{name}` here sorts after `i`, which is exactly when a path sort picks the old one.
    const dir = sixBFixture({ shape: "full", verdict: "FAIL" });
    try {
      writeFileSync(
        path.join(dir, "task.67.bug.3.implementation.2.run.md"),
        "## QA Iteration History\n\n### Verify Cycle 1\n**Verdict**: PASS\n",
      );
      const r = run(dir, "task.67.bug.3", "bug");
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.match(
        r.stdout,
        /^FINAL_GATE=PASS$/m,
        `implementation.2 wins: ${r.stdout}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

// 7.6a and 7.6b branch on the kind IN THE BLOCK — the artefact list, the commit
// message and the final assertion. Until TASK-125-BUG-16 the bug variants lived
// only in the marker prose beside each block, so both HALTed verbatim on every
// bug run. Each block is sliced up to its "resolved" marker and EXECUTED with the
// two inputs substituted; nothing git-related runs.
function sliceBlock(startNeedle, endNeedle, before) {
  const end = skill.indexOf(endNeedle, before);
  assert.ok(end > -1, `${endNeedle} present`);
  const start = skill.lastIndexOf(startNeedle, end);
  assert.ok(
    start > -1 && start > before,
    `${startNeedle} present before the marker`,
  );
  return skill
    .slice(start, end)
    .replace(/^ {3}/gm, "")
    .replace(/\{document-directory\}/g, '"$DIR"')
    .replace(/\{document-path\}/g, '"$DOC"')
    .replace(/STEM="\{[^\n]*\}"/, 'STEM="${STEM_IN:-}"')
    .replace(/DOC_KIND="\{[^\n]*\}"/, 'DOC_KIND="${KIND_IN:-}"');
}
const SIX_A_START = skill.indexOf("### Document kind");
function sixABlock() {
  return (
    sliceBlock('STEM="{', "# --- acceptance artefacts resolved", SIX_A_START) +
    '\nprintf "N=%s\\n" "${#ADD_PATHS[@]}"; printf "P=%s\\n" "${ADD_PATHS[@]}"; printf "MSG=%s\\n" "$COMMIT_MSG"\n'
  );
}
function sixBAssertBlock() {
  return (
    sliceBlock('STEM="{', "# --- assertions resolved", SIX_A_START) +
    '\nprintf "N=%s\\n" "${#ARTIFACTS[@]}"; printf "A=%s\\n" "${ARTIFACTS[@]}"; printf "PAT=%s\\nAT=%s\\n" "$FINAL_ASSERT_PATTERN" "$FINAL_ASSERT_PATH"\n'
  );
}
for (const shell of SHELLS) {
  const runBlock = (block, dir, stem, kind) =>
    spawnSync(shell, ["-s", "--"], {
      input: block,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        DIR: dir,
        DOC: `${dir}/${stem}.name.md`,
        STEM_IN: stem,
        KIND_IN: kind,
      },
    });

  test(`[${shell}] 7.6a in bug mode stages the bug report + DoD only and commits as "DoD verified — finalise --bug"; task mode adds the sprint review (TASK-125-BUG-16)`, () => {
    const dir = sixBFixture();
    try {
      const bug = runBlock(sixABlock(), dir, "task.67.bug.3", "bug");
      assert.equal(bug.status, 0, bug.stderr + bug.stdout);
      assert.match(bug.stdout, /^N=2$/m, bug.stdout);
      assert.doesNotMatch(bug.stdout, /sprint-review-summary/);
      assert.match(bug.stdout, /^P=.*task\.67\.bug\.3\.dod\.1\.fix\.md$/m);
      assert.match(
        bug.stdout,
        /^MSG=docs\(task\.67\.bug\.3\): DoD verified — finalise --bug$/m,
      );
      const task = runBlock(sixABlock(), dir, "task.67", "task");
      assert.equal(task.status, 0, task.stderr + task.stdout);
      assert.match(task.stdout, /^N=3$/m, task.stdout);
      assert.match(task.stdout, /^P=.*sprint-review-summary\.md$/m);
      assert.match(
        task.stdout,
        /^MSG=docs\(task\.67\): accept — DoD, sprint review$/m,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 7.6b in bug mode asserts ## Verification Complete on the DoD file, never status: accepted on the bug; task mode asserts accepted on the document (TASK-125-BUG-16)`, () => {
    const dir = sixBFixture();
    try {
      const bug = runBlock(sixBAssertBlock(), dir, "task.67.bug.3", "bug");
      assert.equal(bug.status, 0, bug.stderr + bug.stdout);
      assert.match(bug.stdout, /^N=2$/m, bug.stdout);
      assert.match(bug.stdout, /^PAT=\^## Verification Complete$/m);
      assert.match(bug.stdout, /^AT=.*task\.67\.bug\.3\.dod\.1\.fix\.md$/m);
      const task = runBlock(sixBAssertBlock(), dir, "task.67", "task");
      assert.equal(task.status, 0, task.stderr + task.stdout);
      assert.match(task.stdout, /^N=3$/m);
      assert.match(task.stdout, /^PAT=\^status: accepted\$$/m);
      assert.match(task.stdout, /^AT=.*task\.67\.name\.md$/m);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 7.6a / 7.6b with an input unbound HALT rather than run the task branch (TASK-125-BUG-15 class)`, () => {
    const dir = sixBFixture();
    try {
      for (const block of [sixABlock(), sixBAssertBlock()]) {
        const r = spawnSync(shell, ["-s", "--"], {
          input: block,
          encoding: "utf8",
          env: { PATH: process.env.PATH, DIR: dir, DOC: "x" },
        });
        assert.equal(r.status, 1, r.stdout + r.stderr);
        assert.match(
          r.stdout + r.stderr,
          /HALT: STEM and DOC_KIND must be bound in this block/,
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b / 7.6a / 7.6b with a placeholder left VERBATIM HALT — non-empty is not bound (cycle-6 CR-3)`, () => {
    const dir = sixBFixture();
    const PH = "{story.{epic}.{story} | task.{id} | bug mode: the bug prefix}";
    try {
      for (const [name, block] of [
        ["6b", derivationBlock()],
        ["7.6a", sixABlock()],
        ["7.6b", sixBAssertBlock()],
      ]) {
        const r = spawnSync(shell, ["-s", "--"], {
          input: block,
          encoding: "utf8",
          env: {
            PATH: process.env.PATH,
            DIR: dir,
            DOC: "x",
            STEM_IN: PH,
            KIND_IN: "task",
          },
        });
        assert.equal(r.status, 1, `${name}: ${r.stdout}${r.stderr}`);
        assert.match(r.stdout + r.stderr, /unsubstituted placeholder/, name);
        assert.doesNotMatch(
          r.stdout,
          /^(DOD_PATH|N)=/m,
          `${name} derived nothing`,
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b and 7.6b HALT when no DoD file is beside the document — never an empty path in the canonical comment (cycle-6 CR-3)`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), "finalise-nodod-"));
    try {
      writeFileSync(
        path.join(dir, "task.67.gate.2.parent.yml"),
        "gate: FAIL\n",
      );
      const six = spawnSync(shell, ["-s", "--"], {
        input: derivationBlock(),
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          DIR: dir,
          STEM_IN: "task.67",
          KIND_IN: "task",
        },
      });
      assert.equal(six.status, 1, six.stdout + six.stderr);
      assert.match(
        six.stdout + six.stderr,
        /HALT: no task\.67\.dod\.\*\.md beside the document/,
      );
      const asr = runBlock(sixBAssertBlock(), dir, "task.67", "task");
      assert.equal(asr.status, 1, asr.stdout + asr.stderr);
      assert.match(
        asr.stdout + asr.stderr,
        /HALT: no task\.67\.dod\.\*\.md beside the document/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b's task branch HALTs on a missing gate file instead of publishing an empty Final Gate (cycle-7 CR-3)`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), "finalise-nogate-"));
    try {
      writeFileSync(path.join(dir, "task.67.dod.1.parent.md"), "");
      const r = spawnSync(shell, ["-s", "--"], {
        input: derivationBlock(),
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          DIR: dir,
          STEM_IN: "task.67",
          KIND_IN: "task",
        },
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(
        r.stdout + r.stderr,
        /HALT: no task\.67\.gate\.\*\.yml beside the document/,
      );
      assert.doesNotMatch(r.stdout, /^FINAL_GATE=/m);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 6b picks gate.19 over gate.9 and dod.10 over dod.9 — numbered artefacts are ordered by number, not by path (TASK-125-BUG-21)`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), "finalise-order-"));
    try {
      writeFileSync(path.join(dir, "task.67.dod.9.old.md"), "");
      writeFileSync(path.join(dir, "task.67.dod.10.new.md"), "");
      writeFileSync(path.join(dir, "task.67.gate.9.old.yml"), "gate: FAIL\n");
      writeFileSync(path.join(dir, "task.67.gate.19.new.yml"), "gate: PASS\n");
      const r = spawnSync(shell, ["-s", "--"], {
        input: derivationBlock(),
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          DIR: dir,
          STEM_IN: "task.67",
          KIND_IN: "task",
        },
      });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(
        r.stdout,
        /^DOD_PATH=.*task\.67\.dod\.10\.new\.md$/m,
        r.stdout,
      );
      assert.match(
        r.stdout,
        /^FINAL_GATE=PASS$/m,
        `gate.19's verdict, not gate.9's: ${r.stdout}`,
      );
      // 7.6a and 7.6b resolve the DoD the same way.
      for (const [name, block] of [
        ["7.6a", sixABlock()],
        ["7.6b", sixBAssertBlock()],
      ]) {
        const b = runBlock(block, dir, "task.67", "task");
        assert.equal(b.status, 0, `${name}: ${b.stdout}${b.stderr}`);
        assert.match(
          b.stdout,
          /task\.67\.dod\.10\.new\.md/,
          `${name} picks dod.10: ${b.stdout}`,
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] 7.6a with no DoD beside the document HALTs with the same diagnostic in both shells — no bare glob reaches the array assignment (cycle-8 CR-5)`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), "finalise-nodod-a-"));
    try {
      const r = runBlock(sixABlock(), dir, "task.67", "task");
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(
        r.stdout + r.stderr,
        /HALT: no task\.67\.dod\.\*\.md beside the document/,
      );
      assert.doesNotMatch(
        r.stderr,
        /no matches found/,
        "zsh's own nomatch error never appears",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`[${shell}] the kind block HALTs when BUG_FLAG or DOC_FILE is left as its placeholder — a --bug run must not continue as task (TASK-125-BUG-20)`, () => {
    const i = skill.indexOf('DOC_KIND=""');
    const j = skill.indexOf("```", i);
    const raw = skill.slice(i, j) + '\nprintf "DOC_KIND=%s\\n" "$DOC_KIND"\n'; // NO substitution
    const r = spawnSync(shell, ["-s"], {
      input: raw,
      encoding: "utf8",
      env: { PATH: process.env.PATH },
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout + r.stderr,
      /HALT: BUG_FLAG or DOC_FILE is an unsubstituted placeholder/,
    );
    assert.doesNotMatch(r.stdout, /^DOC_KIND=/m, "no kind was resolved");
  });

  test(`[${shell}] the kind block resolves bug from the substituted BUG_FLAG input with NO argv flag — a block run through a tool has no positional parameters (cycle-5 CR-3)`, () => {
    const r = spawnSync(
      shell,
      ["-s", "--", "docs/bugs/bug.14.x/bug.14.name.md"],
      {
        input: kindBlock(),
        encoding: "utf8",
        env: { PATH: process.env.PATH, BUG_FLAG_IN: "--bug" },
      },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^DOC_KIND=bug$/m, r.stdout);
  });

  test(`[${shell}] 6b's cycle count LOCATES the report itself — either shape, newest by number — reads BOTH heading names, and never yields "0\\n0" (TASK-125-BUG-17, cycle-6 CR-2)`, () => {
    const block =
      sliceBlock('STEM="{', "# --- cycle count resolved", SIX_A_START) +
      '\nprintf "[%s]\\n" "$CYCLES"\n';
    const run = (dir, stem, extraEnv = {}, kind = "bug") =>
      spawnSync(shell, ["-s"], {
        input: block,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          DIR: dir,
          STEM_IN: stem,
          KIND_IN: kind,
          ...extraEnv,
        },
      });
    const dir = mkdtempSync(path.join(tmpdir(), "finalise-cycles-"));
    try {
      // 6b checks the DoD before it counts (cycle-6 CR-3); the count is now derived in 6b
      // (TASK-125-BUG-22), so the fixtures carry one DoD per stem the cases bind.
      for (const f of [
        "bug.14.dod.1.x.md",
        "bug.99.dod.1.x.md",
        "task.67.dod.1.x.md",
        "task.67.bug.3.dod.1.x.md",
      ])
        writeFileSync(path.join(dir, f), "");
      writeFileSync(
        path.join(dir, "bug.14.precompact-hook.implementation.1.run.md"),
        "### Verify Cycle 1\n### Verify Cycle 2\n### Verify Cycle 3\n",
      );
      const bug = run(dir, "bug.14");
      assert.equal(bug.status, 0, bug.stderr);
      assert.equal(
        bug.stdout.trim(),
        "[3]",
        `located without an env var: ${JSON.stringify(bug.stdout)}`,
      );
      writeFileSync(
        path.join(dir, "bug.14.implementation.2.run.md"),
        "### Verify Cycle 1\n",
      );
      assert.equal(
        run(dir, "bug.14").stdout.trim(),
        "[1]",
        "implementation.2 wins",
      );
      const qa = path.join(dir, "task.md");
      writeFileSync(qa, "### QA Cycle 1\n### QA Cycle 2\n");
      assert.equal(
        run(dir, "bug.14", { IMPLEMENTATION_REPORT: qa }).stdout.trim(),
        "[2]",
      );
      assert.equal(run(dir, "bug.99").stdout.trim(), "[0]");
      // A TASK beside its own bug: the parent's count, never the bug's higher-numbered
      // report — the full-stem shape is a bug-only shape (TASK-125-BUG-19).
      writeFileSync(
        path.join(dir, "task.67.implementation.1.run.md"),
        "### QA Cycle 1\n",
      );
      writeFileSync(
        path.join(dir, "task.67.bug.3.implementation.2.fix.md"),
        "### Verify Cycle 1\n### Verify Cycle 2\n### Verify Cycle 3\n",
      );
      const parent = run(dir, "task.67", {}, "task");
      assert.equal(parent.status, 0, parent.stderr);
      assert.equal(
        parent.stdout.trim(),
        "[1]",
        `the parent's own report: ${parent.stdout}`,
      );
      const child = run(dir, "task.67.bug.3", {}, "bug");
      assert.equal(child.stdout.trim(), "[3]", "the bug still reads its own");
      const ph = run(dir, "{story.{epic}.{story} | task.{id}}");
      assert.equal(ph.status, 1, ph.stdout + ph.stderr);
      assert.match(ph.stdout + ph.stderr, /unsubstituted placeholder/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

// The contract the cycle-4 fix stated — every reader of a bug's implementation
// report accepts BOTH filename shapes — was applied by hand at three sites and
// missed two (TASK-125-BUG-17). This enumerates the population: every non-comment
// line in the bug pipeline's sources that keys `implementation.*` on the bug prefix
// must name both shapes. A floor keeps it from passing on an empty population.
test("every stem-keyed implementation.* reader in develop-bug and finalise accepts both filename shapes (TASK-125-BUG-17)", () => {
  const files = [
    "skills/finalise/SKILL.md",
    "skills/develop-bug/SKILL.md",
    ...readdirSync(path.join(REPO_ROOT, "skills/develop-bug/references"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => `skills/develop-bug/references/${f}`),
  ];
  const sites = [];
  for (const f of files) {
    const text = readFileSync(path.join(REPO_ROOT, f), "utf8");
    text.split("\n").forEach((line, n) => {
      if (!/(implementation|review)\.\*/.test(line)) return;
      if (!/\{bug-prefix\}|\$\{STEM\}/.test(line)) return;
      if (/^\s*#/.test(line)) return; // a comment may describe one shape per line
      sites.push({ file: f, line: n + 1, text: line });
    });
  }
  assert.ok(
    sites.length >= 4,
    `non-vacuity floor: expected ≥ 4 reader sites, found ${sites.length}`,
  );
  for (const s of sites) {
    const short =
      /(\{bug-prefix\}|\$\{STEM\})\.(implementation|review)\.\*/.test(s.text);
    const full =
      /(\{bug-prefix\}|\$\{STEM\})\.(\*|\{name\})\.(implementation|review)\.\*/.test(
        s.text,
      );
    // A reader that names one shape ON PURPOSE says so on the line, with the reason:
    // story/task reports never carry the full-stem shape, and reading it there
    // matched a co-located bug's report (TASK-125-BUG-19). The annotation is the
    // recorded judgement, the same shape as `--siblings-checked none`.
    if (/# short-shape-only: .{20,}/.test(s.text) && short && !full) continue;
    assert.ok(
      short && full,
      `${s.file}:${s.line} names one shape only: ${s.text.trim().slice(0, 140)}`,
    );
  }
});

// The readers above key on `{bug-prefix}`; the DEFINITION they key on lived in one file and
// said the opposite of every consumer (TASK-125-BUG-18). One definition, and the test reads it.
test("develop-bug defines {bug-prefix} ONCE, as the short id, and {bug-file-stem} as the full stem (TASK-125-BUG-18)", () => {
  const step0 = readFileSync(
    path.join(
      REPO_ROOT,
      "skills/develop-bug/references/develop-bug-step-0-resolve-bug.md",
    ),
    "utf8",
  );
  const defs = step0
    .split("\n")
    .filter((l) => /`\{bug-prefix\}` is the \*\*short id\*\*/.test(l));
  assert.equal(
    defs.length,
    1,
    "exactly one definition line for {bug-prefix}, naming the short id",
  );
  assert.match(
    defs[0],
    /`bug\.7`/,
    "the short example is bug.7, not bug.7.stale-token",
  );
  assert.match(defs[0], /bug_id/, "the definition is bug-doc.js's bug_id");
  const stem = step0
    .split("\n")
    .filter((l) =>
      /`\{bug-file-stem\}` is the \*\*full filename stem\*\*/.test(l),
    );
  assert.equal(
    stem.length,
    1,
    "exactly one definition line for {bug-file-stem}",
  );
  assert.match(stem[0], /bug_stem/);
  const bugSources = [
    "skills/develop-bug/SKILL.md",
    ...readdirSync(path.join(REPO_ROOT, "skills/develop-bug/references"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => `skills/develop-bug/references/${f}`),
  ];
  for (const f of bugSources) {
    const t = readFileSync(path.join(REPO_ROOT, f), "utf8");
    assert.doesNotMatch(
      t,
      /`\{bug-prefix\}` \(the filename stem before `\.md`/,
      `${f} redefines {bug-prefix} as the full stem`,
    );
  }
  const step7 = readFileSync(
    path.join(
      REPO_ROOT,
      "skills/develop-bug/references/develop-bug-step-7-close-bug.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    step7,
    /\(\.\/\{bug-prefix\}\.md\)/,
    "a link to the bug file must use {bug-file-stem}",
  );
  assert.match(step7, /\(\.\/\{bug-file-stem\}\.md\)/);
});

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
