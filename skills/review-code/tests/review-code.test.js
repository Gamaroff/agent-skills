"use strict";
/**
 * review-code contract tests.
 * Prose-driven skill — assert the structural invariants of SKILL.md.
 *
 * The invariant this file exists for: **Step 4 posts PR comments, and PR
 * comments are a VCS operation.** It branched on `$TRACKER` until task 68, so
 * a repo hosting code on Bitbucket while tracking issues on GitHub took the
 * `gh` arm against a Bitbucket PR — `gh` cannot address one, the comment never
 * landed, and the run reported success. Nothing was red. These tests are the
 * only thing standing between that defect and a silent reintroduction.
 *
 * Run: node --test 'skills/review-code/tests/*.test.js'
 *      (the directory form `node --test skills/review-code/tests/` fails
 *       MODULE_NOT_FOUND here, same as review-pr)
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/**
 * Read a SIBLING skill's file — `skills/<name>/<rel>`.
 *
 * Returns null when the sibling is absent instead of throwing. `tests/` ships
 * inside the packaged skill (`package_skill.py` walks the whole skill dir and
 * excludes only __pycache__/.git/node_modules/.DS_Store), so a consumer can run
 * this suite with review-code installed and review-pr or finalise not. There the
 * cross-skill assertions have nothing to compare against and are skipped.
 *
 * In THIS repo the siblings are always present, so the guards below always run —
 * which is the point. A degradation that skipped everywhere would delete the
 * drift guard while leaving a green suite behind, so the in-repo run is asserted
 * separately rather than trusted.
 */
const readSibling = (name, rel) => {
  try {
    return fs.readFileSync(path.join(ROOT, "..", name, rel), "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
};

const SKILL = read("SKILL.md");

/**
 * Step 4's section text, sliced from its heading to the next `### Step`.
 * Scoping every branch-key assertion to this slice is deliberate: a bare
 * `assert.doesNotMatch(SKILL, /TRACKER=github/)` would forbid the token
 * everywhere in the file, including in a future *issue-shaped* branch where it
 * would be correct. The rule is not "never mention TRACKER" — it is "do not
 * branch PR-shaped work on TRACKER".
 */
const STEP_4 = (() => {
  const m = SKILL.match(/### Step 4 — `--comment`[\s\S]*?(?=\n### Step )/);
  assert.ok(
    m,
    "Step 4 section present and followed by a later ### Step heading",
  );
  return m[0];
})();

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------
test("SKILL.md declares name: review-code", () => {
  assert.match(SKILL, /^---[\s\S]*?\nname:\s*review-code\s*\n/);
});

test("frontmatter carries only the authored fields", () => {
  const fm = SKILL.match(/^---\n([\s\S]*?)\n---/)[1];
  assert.doesNotMatch(
    fm,
    /^managed-by:/m,
    "managed-by is injected at package time",
  );
  assert.doesNotMatch(fm, /^source:/m, "source is injected at package time");
});

// ---------------------------------------------------------------------------
// Step 4 — PR-shaped work branches on $VCS, never on $TRACKER
// ---------------------------------------------------------------------------
test("Step 4 branches on VCS, not TRACKER", () => {
  assert.doesNotMatch(
    STEP_4,
    /TRACKER=(github|bitbucket|jira)/,
    "Step 4 posts PR comments — a VCS operation. Branching it on TRACKER takes " +
      "the gh arm against a Bitbucket PR in a Bitbucket-VCS + GitHub-tracker repo, " +
      "and the comment silently never lands.",
  );
});

test("Step 4 declares a VCS=github arm", () => {
  assert.match(STEP_4, /\*\*GitHub\*\*\s*\(`VCS=github`\)/);
});

test("Step 4 declares a VCS=bitbucket arm", () => {
  assert.match(STEP_4, /\*\*Bitbucket\*\*\s*\(`VCS=bitbucket`\)/);
});

test("both platform arms are present — neither may be dropped", () => {
  const arms = STEP_4.match(/`VCS=(github|bitbucket)`/g) || [];
  assert.ok(arms.includes("`VCS=github`"), "GitHub arm present");
  assert.ok(arms.includes("`VCS=bitbucket`"), "Bitbucket arm present");
});

test("the Bitbucket arm is no longer conflated with a tracker", () => {
  // The pre-task-68 text read "**Bitbucket / Jira**" — grouping a VCS with a
  // tracker as though they were alternatives to each other, which is the
  // category error that produced the wrong branch key in the first place.
  assert.doesNotMatch(STEP_4, /Bitbucket\s*\/\s*Jira/);
});

// ---------------------------------------------------------------------------
// The rule is stated, not merely obeyed
// ---------------------------------------------------------------------------
test("Step 4 states the VCS-vs-TRACKER rule in review-pr's wording", () => {
  assert.match(
    STEP_4,
    /Branch on `\$VCS` for everything PR-shaped, on `\$TRACKER` for everything issue-shaped/,
    "the rule must be stated verbatim as review-pr states it, so the two sibling " +
      "skills cannot drift into disagreeing about the same decision",
  );
});

test("review-pr and review-code state the identical rule", (t) => {
  // Cross-skill consistency: if review-pr's wording is ever reworded, this
  // fails and whoever changes one is told to change the other.
  const RULE =
    "**Branch on `$VCS` for everything PR-shaped, on `$TRACKER` for everything issue-shaped.**";
  const reviewPr = readSibling("review-pr", "SKILL.md");
  if (reviewPr === null) {
    return t.skip("review-pr not installed alongside review-code");
  }
  assert.ok(reviewPr.includes(RULE), "review-pr states the rule");
  assert.ok(SKILL.includes(RULE), "review-code states the same rule");
});

// ---------------------------------------------------------------------------
// The Bitbucket arm names a recipe that actually exists
// ---------------------------------------------------------------------------
test("the Bitbucket arm names a real, resolvable recipe", () => {
  assert.match(STEP_4, /bitbucket-auth\.sh/, "names the credential resolver");
  assert.match(
    STEP_4,
    /pullrequests\/\$\{PR_ID\}\/comments/,
    "names the actual REST endpoint rather than gesturing at 'the platform's PR-comment path'",
  );
  // Task 89: `/…/s` let the two halves sit anywhere in STEP_4, so any mention of finalise plus
  // any mention of Step 7 satisfied a claim about ONE pointer. Pin the link to the section it
  // points at: the href and the step must be adjacent, which is what "points at" actually means.
  assert.match(
    STEP_4,
    /\]\(\.\.\/finalise\/SKILL\.md\)\s+\*\*Step 7\b/,
    "points at finalise Step 7, which carries both arms",
  );
});

test("the dead /qa-story step 6 pointer is gone and stays gone", () => {
  // `/qa-story` has no numbered Step 6 in its main review flow at all — its
  // workflow lives under an unnumbered `### Review Workflow`. The old pointer
  // sent an implementer to a step that does not exist.
  assert.doesNotMatch(
    STEP_4,
    /mirror\s+`?\/qa-story`?\s+step\s*6/i,
    "/qa-story has no step 6 to mirror",
  );
});

test("the finalise pointer resolves to a real file with a real Step 7", (t) => {
  // Guards the pointer against bit-rot: a cross-reference that names a section
  // is only useful while that section exists.
  const finalise = readSibling("finalise", "SKILL.md");
  if (finalise === null) {
    return t.skip("finalise not installed alongside review-code");
  }
  assert.match(
    finalise,
    /### Step 7: Mark as Accepted and Generate Artifacts/,
    "finalise Step 7 exists under the name review-code points at",
  );
  assert.match(
    finalise,
    /bitbucket-auth\.sh/,
    "finalise Step 7 has a Bitbucket arm",
  );
});

// ---------------------------------------------------------------------------
// The inline-comment jq snippet must RUN, not merely read well (task 70).
//
// Both review skills shipped a snippet that could not execute: `.code_review[]`
// iterates the wrapper object's VALUES rather than its findings, so `select`
// indexes a string and jq aborts; and `body: .summary` read a key the findings
// schema does not define, which made the CLI exit 2 and dropped every finding.
// Neither defect was visible to a reader, and qa-task's snippet executor skips
// these blocks as `mutating` (they redirect to a file). Executing the extracted
// program against a schema-shaped fixture is the only check that can see it.
// ---------------------------------------------------------------------------
const { spawnSync } = require("child_process");

const FINDINGS_FIXTURE = JSON.stringify({
  code_review: {
    reviewed: "3 files",
    findings: [
      {
        id: "CR-1",
        category: "bug",
        severity: "high",
        confidence: "high",
        file_line: "src/x.ts:42",
        anchor_check: "ok",
        finding: "null deref on `x`",
        suggested_action: "guard it",
      },
      // Shapes an LLM plausibly emits from "file_line is path:line". jq is
      // all-or-nothing inside `[ ... ]`, so before the test() guard each of these
      // aborted the WHOLE program, emptied $INLINE_FILE and dropped every
      // finding -- not degraded, dropped.
      {
        id: "CR-2",
        category: "bug",
        severity: "medium",
        confidence: "medium",
        file_line: "src/y.ts:10-24",
        anchor_check: "no-line",
        finding: "a range, not a line",
        suggested_action: "n/a",
      },
      {
        id: "CR-3",
        category: "cleanup",
        severity: "low",
        confidence: "low",
        file_line: "src/z.ts",
        anchor_check: "no-line",
        finding: "no line at all",
        suggested_action: "n/a",
      },
      // suggested_action absent -- string concatenation with null aborts too.
      {
        id: "CR-4",
        category: "cleanup",
        severity: "low",
        confidence: "low",
        file_line: "src/w.ts:3",
        anchor_check: "unchecked-text",
        finding: "no suggested action",
      },
      // task.194: a well-formed path:line the checker found wrong (a patch-file line,
      // PR #594). Its shape passes test(); only anchor_check can keep it off the line.
      {
        id: "CR-5",
        category: "bug",
        severity: "high",
        confidence: "high",
        file_line: "src/v.ts:77",
        line_text: "return x;",
        anchor_check: "text-mismatch",
        finding: "mislocated finding",
        suggested_action: "n/a",
      },
      // The checker never ran on this one: no verdict means no inline post.
      {
        id: "CR-6",
        category: "bug",
        severity: "medium",
        confidence: "high",
        file_line: "src/u.ts:5",
        finding: "unchecked by the anchor checker",
        suggested_action: "n/a",
      },
    ],
    truncated_count: 0,
  },
  // Conformance findings carry `ref`, NOT `file_line` -- see
  // references/pr-conformance-prompt.md. `ref` is a criterion id, a frontmatter
  // field, an artifact path, OR a path:line; only the last can be anchored. A
  // fixture that invents `file_line` here tests a shape production never emits.
  pr_conformance: {
    work_item: "task.70",
    findings: [
      {
        id: "PC-1",
        severity: "medium",
        ref: "AC-3",
        anchor_check: "no-line",
        finding: "criterion not evidenced",
        suggested_action: "cite it",
      },
      {
        id: "PC-2",
        severity: "low",
        ref: "docs/a.md:3",
        anchor_check: "ok",
        finding: "claim unsupported",
        suggested_action: "cite it",
      },
    ],
  },
});

/** Pull the jq program out of the SKILL.md snippet that feeds --findings-file. */
function extractJqProgram(skillText) {
  // Tolerate a shell line-continuation between the program and its input file.
  const m = skillText.match(/jq '(\[[\s\S]*?\])'[\s\\]*"\$FINDINGS_JSON"/);
  return m ? m[1] : null;
}

test("the inline-comment jq snippet executes against a schema-shaped fixture", (t) => {
  const probe = spawnSync("jq", ["--version"], { encoding: "utf8" });
  if (probe.error) return t.skip("jq not installed");

  const prog = extractJqProgram(read("SKILL.md"));
  assert.ok(prog, "could not find the jq program feeding --findings-file");

  const r = spawnSync("jq", ["-c", prog], {
    input: FINDINGS_FIXTURE,
    encoding: "utf8",
  });
  assert.equal(
    r.status,
    0,
    `the documented jq program does not run:\n${r.stderr}\nProgram:\n${prog}`,
  );

  const out = JSON.parse(r.stdout);
  assert.ok(
    out.length > 0,
    "the snippet extracted no findings from the fixture",
  );
  // The well-formed finding must SURVIVE its malformed neighbours. `length > 0`
  // alone would pass while every entry but one was silently lost — jq aborts the
  // whole array on a single bad entry, so this is the assertion that matters.
  assert.ok(
    out.some((f) => f.path === "src/x.ts" && f.line === 42),
    "a well-formed finding must survive alongside a range file_line, a bare " +
      "path, and a missing suggested_action",
  );
  assert.ok(
    !out.some((f) => String(f.path).includes("y.ts")),
    "a range file_line has no single line to anchor to — exclude it, never guess",
  );
  // task.194 SC-6a: only a verified anchor posts inline. A malformed one would land
  // on the wrong line (or none) and report `posted`; it goes to the summary instead.
  assert.ok(
    !out.some((f) => f.path === "src/v.ts"),
    "a text-mismatch anchor must not post inline — it reaches the PR via the summary",
  );
  assert.ok(
    !out.some((f) => f.path === "src/u.ts"),
    "a finding with no anchor_check was never verified — it must not post inline",
  );
  assert.ok(
    out.some((f) => f.path === "src/w.ts" && f.line === 3),
    "an unchecked-text anchor (range verified, no line_text) still posts inline",
  );
  for (const f of out) {
    assert.ok(f.path && typeof f.path === "string", "each record needs a path");
    assert.ok(Number.isInteger(f.line), "each record needs an integer line");
    assert.ok(
      f.body && typeof f.body === "string" && f.body.trim(),
      "each record needs a non-empty body — `.summary` is not a schema key, " +
        "and a null body makes pr-inline-comment.js exit 2",
    );
  }
});

// task.195 SC-5: the --inline select keeps only verified anchors, so a findings file the checker never
// annotated used to yield [] — indistinguishable from "no anchorable findings". The guard before it
// must refuse such a file, and must let a fully annotated one through (control).
// task.217: keyed on the stamp clause, which the guard keeps; the `(.anchor_check | type)` clause it
// was keyed on before was replaced by the verdict enumeration.
function extractInlineGuard(skillText) {
  const m = skillText.match(
    /^[ \t]*jq -e '[\s\S]*?\.anchor_checked\.by == "finding-anchors"[\s\S]*?exit 1; \}/m,
  );
  return m ? m[0] : null;
}

/** `doc` with the stamp `finding-anchors.js --annotate` writes, counting the code lens's findings. */
function stamped(doc) {
  const n = Array.isArray(doc.code_review?.findings)
    ? doc.code_review.findings.length
    : 0;
  return { ...doc, anchor_checked: { by: "finding-anchors", findings: n } };
}

test("--inline refuses a findings file with an un-annotated finding, and passes an annotated one", (t) => {
  const { spawnSync: run } = require("child_process");
  if (run("jq", ["--version"]).error) return t.skip("jq not installed");
  const guard = extractInlineGuard(read("SKILL.md"));
  assert.ok(
    guard,
    "could not find the --inline anchor_check guard before the jq select",
  );
  const dir = fs.mkdtempSync(
    path.join(require("os").tmpdir(), "inline-guard-"),
  );
  try {
    const file = path.join(dir, "findings.json");
    const runGuard = (doc) => {
      fs.writeFileSync(file, JSON.stringify(doc));
      return run("bash", ["-c", guard], {
        encoding: "utf8",
        env: { ...process.env, FINDINGS_JSON: file },
      });
    };
    const never = runGuard({
      code_review: { findings: [{ file_line: "src/x.ts:4", finding: "f" }] },
    });
    assert.equal(
      never.status,
      1,
      "an un-annotated finding must HALT the --inline block",
    );
    assert.match(never.stdout, /HALT: .*anchor_check.*Step 2b/);
    // A file with no findings array selects nothing; it must not pass as "all annotated"
    // (task.195 QA cycle 1, TASK-195-QA1-2). An empty array is a legitimate empty review.
    // task.195 DoD 1: a null anchor_check is not a checker verdict — the checker always writes a string.
    for (const notFindings of [
      {},
      { code_review: {} },
      [],
      {
        code_review: {
          findings: [
            { file_line: "src/x.ts:4", finding: "f", anchor_check: null },
          ],
        },
      },
    ]) {
      const r = runGuard(notFindings);
      assert.equal(r.status, 1, `${JSON.stringify(notFindings)} must HALT`);
      assert.match(r.stdout, /HALT: /);
    }
    assert.equal(
      runGuard(stamped({ code_review: { findings: [] } })).status,
      0,
    );
    const annotated = runGuard(
      stamped({
        code_review: {
          findings: [
            {
              file_line: "src/x.ts:4",
              finding: "f",
              anchor_check: "text-mismatch",
            },
          ],
        },
      }),
    );
    assert.equal(
      annotated.status,
      0,
      `an annotated file must pass:\n${annotated.stdout}${annotated.stderr}`,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// task.217 (task.195 gate 3 CR-2): the guard trusted any string. A reviewer that writes
// `anchor_check: "ok"` itself, with no checker run, must not get its findings posted inline.
test("task.217: --inline requires the checker's stamp, a matching count and a known verdict", (t) => {
  const { spawnSync: run } = require("child_process");
  if (run("jq", ["--version"]).error) return t.skip("jq not installed");
  const guard = extractInlineGuard(read("SKILL.md"));
  assert.ok(guard, "could not find the --inline anchor_check guard");
  const dir = fs.mkdtempSync(
    path.join(require("os").tmpdir(), "inline-stamp-"),
  );
  try {
    const file = path.join(dir, "findings.json");
    const runGuard = (doc) => {
      fs.writeFileSync(file, JSON.stringify(doc));
      return run("bash", ["-c", guard], {
        encoding: "utf8",
        env: { ...process.env, FINDINGS_JSON: file },
      });
    };
    const two = {
      code_review: {
        findings: [
          { file_line: "a.js:1", finding: "f", anchor_check: "ok" },
          { file_line: "b.js:2", finding: "g", anchor_check: "unchecked-text" },
        ],
      },
    };
    const refused = {
      "no stamp (reviewer-written anchor_check)": two,
      "a stamp another tool wrote": {
        ...two,
        anchor_checked: { by: "reviewer", findings: 2 },
      },
      "a stale count": {
        ...two,
        anchor_checked: { by: "finding-anchors", findings: 1 },
      },
      "an unknown verdict": stamped({
        code_review: {
          findings: [
            { file_line: "a.js:1", finding: "f", anchor_check: "verified" },
          ],
        },
      }),
    };
    for (const [label, doc] of Object.entries(refused)) {
      const r = runGuard(doc);
      assert.equal(r.status, 1, `${label} must HALT`);
      assert.match(r.stdout, /HALT: .*stamp.*Step 2b/, label);
    }
    const ok = runGuard(stamped(two));
    assert.equal(
      ok.status,
      0,
      `a stamped file passes:\n${ok.stdout}${ok.stderr}`,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// task.217 (task.195 gates 3–4): the selector split on the FIRST colon and posted the untrimmed path;
// the checker trims and takes the LAST colon. The posted anchor must be the one the checker verified.
test("task.217: the --inline selector parses anchors in the checker's grammar", (t) => {
  if (spawnSync("jq", ["--version"]).error) return t.skip("jq not installed");
  const prog = extractJqProgram(read("SKILL.md"));
  assert.ok(prog, "could not find the jq program feeding --findings-file");
  const r = spawnSync("jq", ["-c", prog], {
    input: JSON.stringify({
      code_review: {
        findings: [
          { file_line: "src/a:b.js:3", finding: "colon", anchor_check: "ok" },
          {
            file_line: "  a.js:1",
            finding: "padded",
            anchor_check: "unchecked-text",
          },
          { file_line: "a.js:1-4", finding: "range", anchor_check: "ok" },
        ],
      },
    }),
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(
    JSON.parse(r.stdout).map((f) => [f.path, f.line]),
    [
      ["src/a:b.js", 3],
      ["a.js", 1],
    ],
  );
});

// task.217 (task.195 gate 1 CR-2): the block read $PR_NUMBER, $SUMMARY_FILE and wrote $INLINE_FILE,
// and bound none of them. Run it with ONLY its documented placeholders substituted.
test("task.217: the --inline block runs with only its placeholders substituted, and leaves no scratch file", (t) => {
  if (spawnSync("jq", ["--version"]).error) return t.skip("jq not installed");
  const m = read("SKILL.md").match(
    /^([ \t]*)# Every input is bound here: a fresh shell carries nothing from another block \(task\.217\)\.\n[\s\S]*?^\1exit "\$POST_RC"$/m,
  );
  assert.ok(m, "could not find the --inline block");
  const block = m[0]
    .split("\n")
    .map((l) => (l.startsWith(m[1]) ? l.slice(m[1].length) : l))
    .join("\n");
  const os = require("os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inline-block-"));
  try {
    const tmp = path.join(dir, "tmp");
    const work = path.join(dir, "work");
    const poster = path.join(work, ".agents/skills/review-code/references");
    fs.mkdirSync(tmp);
    fs.mkdirSync(poster, { recursive: true });
    // The stub exits with $POSTER_RC, so a failed post can be told from a successful one.
    fs.writeFileSync(
      path.join(poster, "pr-inline-comment.js"),
      'process.stdout.write(JSON.stringify({ reason: "posted", argv: process.argv.slice(2) }) + "\\n");\nprocess.exitCode = Number(process.env.POSTER_RC || 0);\n',
    );
    const summary = path.join(dir, "summary.md");
    const findings = path.join(dir, "findings.json");
    const runBlock = (doc, { summaryExists = true, posterRc = 0 } = {}) => {
      fs.rmSync(summary, { force: true });
      if (summaryExists) fs.writeFileSync(summary, "summary\n");
      fs.writeFileSync(findings, JSON.stringify(doc));
      const script = block
        .replaceAll("{findings-json}", findings)
        .replaceAll("{pr-number}", "7")
        .replaceAll("{summary-file}", summary);
      // `set -u`: an input the block reads but never binds is an error, not an empty string.
      return spawnSync("bash", ["-uc", script], {
        cwd: work,
        encoding: "utf8",
        env: {
          ...process.env,
          TMPDIR: tmp,
          POSTER_RC: String(posterRc),
          PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`,
        },
      });
    };
    const doc = stamped({
      code_review: {
        findings: [{ file_line: "a.js:1", finding: "f", anchor_check: "ok" }],
      },
    });
    const posted = runBlock(doc);
    assert.equal(posted.status, 0, posted.stdout + posted.stderr);
    const out = JSON.parse(posted.stdout.trim().split("\n").pop());
    assert.equal(out.reason, "posted");
    assert.deepEqual(out.argv.slice(0, 2), ["--pr", "7"]);
    assert.ok(out.argv.includes(summary), "the summary file is passed through");
    assert.deepEqual(fs.readdirSync(tmp), [], "a post leaves no scratch file");
    const refused = runBlock({
      code_review: { findings: [{ file_line: "a.js:1", anchor_check: "ok" }] },
    });
    assert.equal(refused.status, 1);
    assert.deepEqual(
      fs.readdirSync(tmp),
      [],
      "a refusal leaves no scratch file",
    );
    const noSummary = runBlock(doc, { summaryExists: false });
    assert.equal(noSummary.status, 1);
    assert.match(noSummary.stdout, /HALT: SUMMARY_FILE/);
    // QA1-4: the poster's exit status is the block's — `rm -f` after it used to report 0.
    const failed = runBlock(doc, { posterRc: 3 });
    assert.equal(failed.status, 3, "a failed post is not reported as success");
    assert.deepEqual(
      fs.readdirSync(tmp),
      [],
      "a failed post leaves no scratch file",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// task.217 (task.195 gate 2 CR-3; QA cycle 2): Step 2b checks anchors against the tree that was
// reviewed — the index under --staged, the commit under a range or PR — but Step 5 edits the working
// tree. A finding whose file differs between the two must be skipped, not applied. QA cycle 2 found
// the shell copy of that decision failed open on an unfilled TARGET and on a cwd below the root, so
// the block now asks the checker, which reads the tree and the root from its own stamp.
test("task.217: Step 5 skips a finding whose working tree differs from the tree Step 2b checked", () => {
  const m = read("SKILL.md").match(
    /^([ \t]*)# Which findings Step 5 may edit\.[^\n]*\n[\s\S]*?(?=^\1```)/m,
  );
  assert.ok(m, "could not find the Step 5 apply-list block");
  // The shipped copy of the checker, at the path the block runs it by.
  const engine = path.join(ROOT, "references", "finding-anchors.js");
  const block = m[0]
    .split("\n")
    .map((l) => (l.startsWith(m[1]) ? l.slice(m[1].length) : l))
    .join("\n")
    .replaceAll(
      ".agents/skills/review-code/references/finding-anchors.js",
      engine,
    );
  assert.match(
    block,
    /--fix-list/,
    "Step 5 asks the checker for its apply list",
  );
  assert.doesNotMatch(block, /\{target:/, "Step 5 binds no target of its own");
  const os = require("os");
  const { execFileSync } = require("child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "staged-fix-"));
  try {
    const git = (...a) =>
      execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], {
        cwd: dir,
        stdio: "ignore",
      });
    git("init", "-q");
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "keep"), "");
    fs.writeFileSync(path.join(dir, "a.js"), "one\n");
    fs.writeFileSync(path.join(dir, "b.js"), "one\n");
    git("add", ".");
    git("commit", "-q", "-m", "c");
    // a.js: staged, then edited on top (working tree ≠ index). b.js: staged only (clean).
    fs.writeFileSync(path.join(dir, "a.js"), "staged\n");
    fs.writeFileSync(path.join(dir, "b.js"), "staged\n");
    git("add", ".");
    fs.writeFileSync(path.join(dir, "a.js"), "worktree\n");
    const findings = path.join(dir, "findings.json");
    const review = {
      code_review: {
        findings: [
          { id: "CR-1", file_line: "a.js:1" },
          { id: "CR-2", file_line: " ﻿b.js:1" },
          { id: "CR-3", file_line: "b.js:9" },
          { id: "CR-4", file_line: "b.js" },
        ],
      },
    };
    // Step 2b, for real: the checker annotates and stamps the file with the tree it read.
    const check = (...extra) => {
      fs.writeFileSync(findings, JSON.stringify(review));
      spawnSync(
        process.execPath,
        [
          engine,
          "--findings-file",
          findings,
          "--root",
          dir,
          ...extra,
          "--annotate",
          findings,
        ],
        { cwd: dir, encoding: "utf8" },
      );
    };
    const runRaw = (file = findings, cwd = dir) =>
      spawnSync("bash", ["-c", block.replaceAll("{findings-json}", file)], {
        cwd,
        encoding: "utf8",
      });
    const runFrom = (cwd) => {
      const r = runRaw(findings, cwd);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      return r.stdout.trim().split("\n");
    };
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: dir,
      encoding: "utf8",
    })
      .trim()
      .slice(0, 12);
    const unverified = [
      "skipped — unverified anchor: CR-3",
      "skipped — unverified anchor: CR-4",
    ];
    // --staged: the index was checked. From the root and from a subdirectory alike (QA2-2), and the
    // U+FEFF-led anchor names the file the checker checked (QA2-3).
    check("--index");
    for (const cwd of [dir, path.join(dir, "sub")]) {
      assert.deepEqual(runFrom(cwd), [
        "skipped — working tree differs from the staged content that was reviewed: CR-1 (a.js)",
        "apply: CR-2 (b.js)",
        ...unverified,
      ]);
    }
    // Control: a working-tree review checked the working tree, so a.js is applied.
    check();
    assert.deepEqual(runFrom(dir), [
      "apply: CR-1 (a.js)",
      "apply: CR-2 (b.js)",
      ...unverified,
    ]);
    // QA1-3: a range/PR review checked a commit; a.js and b.js both differ from it on disk.
    check("--rev", "HEAD");
    assert.deepEqual(runFrom(path.join(dir, "sub")), [
      `skipped — working tree differs from commit ${head}, the content that was reviewed: CR-1 (a.js)`,
      `skipped — working tree differs from commit ${head}, the content that was reviewed: CR-2 (b.js)`,
      ...unverified,
    ]);
    // QA1-1: input the checker never annotated applies nothing; a missing file HALTs too.
    check("--index");
    const good = JSON.parse(fs.readFileSync(findings, "utf8"));
    const { anchor_checked, ...unstamped } = good;
    const hostile = {
      "no stamp": unstamped,
      "stale count": {
        ...good,
        anchor_checked: { ...anchor_checked, findings: 3 },
      },
      "foreign stamp": {
        ...good,
        anchor_checked: { ...anchor_checked, by: "someone-else" },
      },
      "an older checker's stamp": {
        ...good,
        anchor_checked: { by: "finding-anchors", findings: 4 },
      },
      "unknown verdict": {
        ...good,
        code_review: {
          findings: good.code_review.findings.map((f) => ({
            ...f,
            anchor_check: "fine",
          })),
        },
      },
      "missing verdict": { ...review, anchor_checked },
      "no findings array": {
        code_review: {},
        anchor_checked: { ...anchor_checked, findings: 0 },
      },
      "empty object": {},
      "top-level array": [],
      "not JSON": "not json",
    };
    for (const [name, doc] of Object.entries(hostile)) {
      const f = path.join(dir, "hostile.json");
      fs.writeFileSync(f, typeof doc === "string" ? doc : JSON.stringify(doc));
      const r = runRaw(f);
      assert.equal(r.status, 1, `${name}: ${r.stdout}`);
      assert.match(r.stdout, /HALT: .*nothing applied/, name);
      assert.doesNotMatch(r.stdout, /^apply:/m, name);
    }
    const missing = runRaw(path.join(dir, "absent.json"));
    assert.equal(missing.status, 1);
    assert.match(missing.stdout, /HALT: FINDINGS_JSON .* is missing or empty/);
    // Control for the refusals: an annotated file with no findings is an empty list, not a HALT.
    review.code_review.findings = [];
    check("--index");
    const empty = runRaw();
    assert.equal(empty.status, 0, empty.stdout + empty.stderr);
    assert.equal(empty.stdout, "");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
