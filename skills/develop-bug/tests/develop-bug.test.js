"use strict";
/**
 * develop-bug contract tests.
 * The skill is prose-driven (no code lib), so these assert the structural
 * invariants of the SKILL.md + step reference docs — catching edits that
 * break the step sequence, bug-mode coverage, branch models, or the
 * Resolution-Summary ownership that is this skill's reason to exist.
 *
 * Run: node --test skills/develop-bug/tests/
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const SKILL = read("SKILL.md");
const STEP0 = read("references/develop-bug-step-0-resolve-bug.md");
const STEP2 = read("references/develop-bug-step-2-review.md");
const STEP3 = read("references/develop-bug-step-3-investigate-fix.md");
const STEP56 = read("references/develop-bug-step-5-6-verify-loop.md");
const STEP7 = read("references/develop-bug-step-7-close-bug.md");

// ---------------------------------------------------------------------------
// Frontmatter + naming
// ---------------------------------------------------------------------------
test("SKILL.md declares name: develop-bug", () => {
  assert.match(SKILL, /^---[\s\S]*?\nname:\s*develop-bug\s*\n/);
});

test("description stays within the ~150-word validator ceiling", () => {
  const m = SKILL.match(/\ndescription:\s*'([\s\S]*?)'\s*\n/);
  assert.ok(m, "description present and single-quoted");
  const words = m[1].trim().split(/\s+/).length;
  assert.ok(words <= 150, `description is ${words} words (must be <= 150)`);
});

// ---------------------------------------------------------------------------
// Bespoke step docs exist and are referenced from SKILL.md
// ---------------------------------------------------------------------------
const BESPOKE = [
  "references/develop-bug-step-0-resolve-bug.md",
  "references/develop-bug-step-2-review.md",
  "references/develop-bug-step-3-investigate-fix.md",
  "references/develop-bug-step-5-6-verify-loop.md",
  "references/develop-bug-step-7-close-bug.md",
];
for (const rel of BESPOKE) {
  test(`bespoke step doc exists and is linked: ${rel}`, () => {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} exists`);
    assert.ok(SKILL.includes(rel), `SKILL.md links ${rel}`);
  });
}

// ---------------------------------------------------------------------------
// 8-step pipeline sequence
// ---------------------------------------------------------------------------
test("SKILL.md names all 8 steps in order", () => {
  const steps = [
    "Create Branch",
    "Review Bug",
    "Investigate & Fix",
    "Create PR",
    "Verify & Fix Loop",
    "Finalise & Close Bug",
    "Commit Changes",
  ];
  let cursor = 0;
  for (const s of steps) {
    const idx = SKILL.indexOf(s, cursor);
    assert.ok(idx !== -1, `step "${s}" present and after the previous step`);
    cursor = idx;
  }
});

test("banners use the DEVELOP-BUG prefix, not STORY/TASK", () => {
  assert.match(SKILL, /DEVELOP-BUG PIPELINE: STEP/);
  assert.doesNotMatch(SKILL, /DEVELOP-(STORY|TASK) PIPELINE: STEP/);
});

// ---------------------------------------------------------------------------
// All three bug modes covered
// ---------------------------------------------------------------------------
test("Step 0 resolves all three bug modes with their filename patterns", () => {
  assert.match(STEP0, /story\.\{P\}\.\{E\}\.\{S\}\.bug\.\{n\}/);
  assert.match(STEP0, /task\.\{id\}\.bug\.\{n\}/);
  assert.match(STEP0, /bug\.\{N\}\.\{name\}/);
});

test("Step 7 updates parent linkage per mode (story / task / general registry)", () => {
  assert.match(STEP7, /Story bug/i);
  assert.match(STEP7, /Task bug/i);
  assert.match(STEP7, /bug-registry\.md/);
});

// The registry row is a second copy of a general bug's status, and consumers
// guard the two for equality on every push. Step 7 alone writing the row left
// the guard red from the first code push to the close commit (three
// occurrences). Pin that EVERY status transition names the registry, not just
// the close: Step 3's in-progress + ready-for-qa, Step 5-6's reopened.
// task 219: the row has ONE writer, `registry-tick.js --bug-status`. Each site
// must carry the transition AND that call in the same paragraph/bullet; a hand
// edit of the Status cell is what drifted.
const MIRROR_CALL =
  /registry-tick\.js --bug-status --file "\{bug-file\}" --json/;
const MIRROR_NAMED = /registry-tick\.js --bug-status/;

test("Step 3 mirrors both of its status transitions through registry-tick.js --bug-status", () => {
  assert.match(
    STEP3,
    /status: in-progress[^\n]*registry-tick\.js --bug-status/,
  );
  assert.match(
    STEP3,
    /status: ready-for-qa[^\n]*registry-tick\.js --bug-status/,
  );
  assert.match(
    STEP3,
    /every write of the bug file's `status:`[\s\S]{0,200}paired with the registry row/,
  );
  // The call and its reason table live once, in the callout.
  assert.match(STEP3, MIRROR_CALL);
  assert.match(STEP3, /\| `not-a-lifecycle-status` \|/);
});

test("Step 5-6 mirrors the reopen through registry-tick.js --bug-status", () => {
  assert.match(STEP56, /status: reopened[^\n]*registry-tick\.js --bug-status/);
});

test("Step 7 closes the row through registry-tick.js --bug-status, the last mirrored write", () => {
  assert.match(STEP7, /bug-registry\.md/);
  assert.match(STEP7, MIRROR_CALL);
  assert.match(STEP7, /last\*\* of the row's mirrored writes/);
});

test("no develop-bug step edits the registry row's Status cell by hand", () => {
  // The hand-edit phrasings the call replaced (task 219 §2). A fallback after a
  // failed call is allowed — it names the `reason` table, not a transition.
  for (const [name, text] of [
    ["SKILL.md", SKILL],
    ["step-3", STEP3],
    ["step-5-6", STEP56],
    ["step-7", STEP7],
  ]) {
    assert.doesNotMatch(text, /Status cell → `/, name);
    assert.doesNotMatch(text, /set the `Status` column to `closed`/, name);
    assert.doesNotMatch(text, /row's Status cell \(`/, name);
  }
});

test("SKILL.md Step 3 and Step 7 summaries name the registry-tick.js call", () => {
  assert.match(
    SKILL,
    /mirrored into the `docs\/bugs\/bug-registry\.md` row's Status cell by `node \.agents\/skills\/develop-bug\/references\/registry-tick\.js --bug-status/,
  );
  assert.match(
    SKILL,
    /`closed` with the same `registry-tick\.js --bug-status` call/,
  );
});

test("qa-fix mirrors both of its bug status writes through registry-tick.js --bug-status", () => {
  const QAFIX = fs.readFileSync(
    path.join(ROOT, "..", "qa-fix", "SKILL.md"),
    "utf8",
  );
  assert.match(
    QAFIX,
    /node \.agents\/skills\/qa-fix\/references\/registry-tick\.js --bug-status --file "\{bug-file\}" --json/,
  );
  // Both transitions write the frontmatter (the CLI reads it) and point at the mirror.
  for (const [token, heading] of [
    ["in-progress", "Starting Investigation (New/Reopened → In Progress)"],
    ["ready-for-qa", "Implementing Fix (In Progress → Ready for QA)"],
  ]) {
    const at = QAFIX.indexOf(`#### ${heading}`);
    assert.ok(at > 0, `qa-fix has the ${heading} section`);
    const section = QAFIX.slice(at, at + 400);
    assert.match(section, new RegExp(`frontmatter \`status: ${token}\``));
    assert.match(
      section,
      /Mirroring a General Bug's Status into the Bug Registry/,
    );
  }
  assert.match(QAFIX, MIRROR_NAMED);
});

// ---------------------------------------------------------------------------
// Both branch models
// ---------------------------------------------------------------------------
test("Phase 0d offers both bugfix and hotfix branch models", () => {
  assert.match(STEP0, /bugfix/i);
  assert.match(STEP0, /hotfix/i);
  assert.match(STEP0, /develop/);
  assert.match(STEP0, /main/);
});

// ---------------------------------------------------------------------------
// Bug lifecycle status transitions
// ---------------------------------------------------------------------------
test("Step 2 is the review-bug gate that HALTs on DUPLICATE / STALE / NEEDS DETAIL", () => {
  assert.match(STEP2, /review-bug/);
  assert.match(STEP2, /READY TO FIX/);
  assert.match(STEP2, /DUPLICATE/);
  assert.match(STEP2, /STALE/);
  assert.match(STEP2, /NEEDS DETAIL/);
});

test("Step 3 now owns reproduce + the new->in-progress transition + non-repro HALT", () => {
  assert.match(STEP3, /in-progress/);
  assert.match(STEP3, /[Rr]eproduce/);
  assert.match(STEP3, /not reproducible/i);
});

test("Step 3 sets ready-for-qa and requires a failing-without/passing-with regression test", () => {
  assert.match(STEP3, /ready-for-qa/);
  assert.match(
    STEP3,
    /fails? (on the )?(current|pre-fix)|fails on the current code/i,
  );
});

test("Step 5-6 verify loop is bounded at 5 cycles and reopens on FAIL", () => {
  assert.match(STEP56, /MAX_ITER=5|5 cycles/);
  assert.match(STEP56, /reopened/);
  assert.match(STEP56, /qa-fix/);
});

// ---------------------------------------------------------------------------
// The reason this skill exists: it writes Resolution Summary and closes.
// ---------------------------------------------------------------------------
test("Step 7 owns the Resolution Summary and closes the bug", () => {
  assert.match(STEP7, /## Resolution Summary/);
  assert.match(STEP7, /status:\s*closed/);
});

test("Step 3 must NOT close the bug (only Step 7 closes)", () => {
  assert.doesNotMatch(STEP3, /status:\s*closed/);
});

// ---------------------------------------------------------------------------
// task.200 — tracker side effects wait for review-bug's READY TO FIX (obs #220)
// ---------------------------------------------------------------------------
const { execFileSync } = require("child_process");
const os = require("os");

// The text of one `### ` section of SKILL.md, up to the next `### ` heading.
function section(heading) {
  const at = SKILL.indexOf(`\n### ${heading}`);
  assert.ok(at !== -1, `SKILL.md has a "### ${heading}" section`);
  const end = SKILL.indexOf("\n### ", at + 5);
  return SKILL.slice(at, end === -1 ? undefined : end);
}
const ENSURE_CALL = /invoke `ensure-bug-(?:jira|github)-issue`/g;

test("Step 1 opens no tracker issue, signals nothing and pushes nothing", () => {
  const step1 = section("Step 1: Create Branch");
  assert.equal(
    (step1.match(ENSURE_CALL) || []).length,
    0,
    "no ensure-bug-* invocation in Step 1",
  );
  assert.doesNotMatch(step1, /\*\*Signal Work Started\*\*/);
  assert.doesNotMatch(step1, /git push/);
  assert.match(
    step1,
    /\*\*No push\.\*\* Decline `\/create-branch`'s optional push/,
  );
  assert.match(step1, /"tracker_issue": ""`, with \*\*no\*\* `tracker_step`/);
});

test("Step 2b, after READY TO FIX and before Step 3, is the only ensure-bug-* invocation", () => {
  const all = SKILL.match(ENSURE_CALL) || [];
  const step2b = section("Step 2b: Open the Tracker Issue");
  const inside = step2b.match(ENSURE_CALL) || [];
  assert.equal(inside.length, 2, "Step 2b invokes both tracker sub-routines");
  assert.equal(
    all.length,
    inside.length,
    "no ensure-bug-* invocation outside Step 2b",
  );
  const pos = (h) => SKILL.indexOf(`\n### ${h}`);
  assert.ok(pos("Step 2: Review Bug") < pos("Step 2b: Open the Tracker Issue"));
  assert.ok(
    pos("Step 2b: Open the Tracker Issue") <
      pos("Step 3: Investigate & Fix (reproduce + fix)"),
  );
  assert.match(step2b, /after Step 2 returns \*\*READY TO FIX\*\*/);
  // the push comes before the comment that names the branch
  assert.ok(
    step2b.indexOf("git push -u origin HEAD") <
      step2b.indexOf("Signal Work Started"),
  );
  assert.match(STEP2, /✅ \*\*READY TO FIX\*\* \| [^\n]*Run Step 2b/);
});

test("the NEEDS DETAIL, DUPLICATE and STALE halts name the local branch and report, and delete nothing", () => {
  for (const v of ["NEEDS DETAIL", "DUPLICATE", "STALE (already fixed)"]) {
    const row = SKILL.split("\n").find((l) =>
      l.startsWith(`| review-bug returns **${v}**`),
    );
    assert.ok(row, `defaults row for ${v}`);
    assert.match(
      row,
      /Name the local bug branch and the review report; nothing was pushed or posted/,
    );
  }
  assert.match(
    STEP2,
    /Local branch:  \{bug-branch\} \(not pushed\)\nReview report: \{review-report-path\}/,
  );
  assert.match(STEP2, /\*\*The halt deletes nothing\.\*\*/);
  for (const text of [SKILL, STEP2]) {
    assert.doesNotMatch(
      text,
      /git branch -[dD]\b|push origin --delete|push --delete/,
    );
  }
});

// The Step 2b lock write and the resume contract's probe, run, not grepped.
const CONTRACT = fs.readFileSync(
  path.join(
    ROOT,
    "..",
    "..",
    "shared",
    "resources",
    "develop-pipeline-resume-contract.md",
  ),
  "utf8",
);

function bashBlockAfter(text, marker) {
  const at = text.indexOf(marker);
  assert.ok(at !== -1, `marker present: ${marker}`);
  const open = text.indexOf("```bash\n", at);
  const close = text.indexOf("```", open + 8);
  return text.slice(open + 8, close);
}

function withLock(lock, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dbug-2b-"));
  try {
    fs.mkdirSync(path.join(dir, ".claude", "state"), { recursive: true });
    const p = path.join(dir, ".claude", "state", "develop-pipeline.lock");
    fs.writeFileSync(p, JSON.stringify(lock));
    return fn(dir, p);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("Step 2b records tracker_issue and tracker_step in one write, keeping every other field", () => {
  const block = bashBlockAfter(
    section("Step 2b: Open the Tracker Issue"),
    "Record it on the lock",
  );
  for (const [issue, want] of [
    ["616", "616"],
    ["", ""],
  ]) {
    withLock(
      { skill: "develop-bug", current_step: 3, tracker_issue: "" },
      (dir, p) => {
        execFileSync(
          "bash",
          ["-c", block.split("{TRACKER_ISSUE}").join(issue)],
          { cwd: dir },
        );
        const lock = JSON.parse(fs.readFileSync(p, "utf8"));
        assert.equal(lock.tracker_issue, want);
        assert.equal(
          lock.tracker_step,
          "opened",
          "written even when the create returned nothing",
        );
        assert.equal(lock.current_step, 3);
        assert.equal(lock.skill, "develop-bug");
        assert.deepEqual(
          fs.readdirSync(path.dirname(p)),
          ["develop-pipeline.lock"],
          "no temp file left",
        );
      },
    );
  }
});

test("the resume contract's Step 2b probe answers all six states", () => {
  assert.match(CONTRACT, /### develop-bug Step 2b re-entry/);
  const probe = bashBlockAfter(CONTRACT, "### develop-bug Step 2b re-entry");
  const states = [
    [
      "1 before the verdict",
      { current_step: 2, tracker_issue: "" },
      "not-opened",
    ],
    [
      "2 READY TO FIX, 2b not run",
      { current_step: 3, tracker_issue: "" },
      "not-opened",
    ],
    [
      "3 issue created, lock write lost",
      { current_step: 3, tracker_issue: "" },
      "not-opened",
    ],
    [
      "4 2b ran, no issue returned",
      { current_step: 3, tracker_issue: "", tracker_step: "opened" },
      "opened",
    ],
    [
      "5 pre-task.200 lock",
      { current_step: 4, tracker_issue: "522" },
      "opened",
    ],
    [
      "6 paused between 2 and 2b",
      { current_step: 3, tracker_issue: "" },
      "not-opened",
    ],
  ];
  for (const [name, fields, want] of states) {
    withLock({ skill: "develop-bug", ...fields }, (dir) => {
      const got = execFileSync("bash", ["-c", probe], {
        cwd: dir,
        encoding: "utf8",
      }).trim();
      assert.equal(got, want, `state ${name}`);
    });
  }
  for (let n = 1; n <= 6; n++) {
    assert.match(
      CONTRACT,
      new RegExp(`\\n\\| ${n} \\| [^\\n]+\\|`),
      `contract table row ${n}`,
    );
  }
});
