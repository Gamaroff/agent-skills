// step-8-completion-checklist.test.mjs — Step 8's Completion Checklist passes on a correct run
// (task.147; obs #173, obs #142).
//
// Two defects, both of which made the BLOCKING checklist unpassable on a run that did nothing wrong:
//
//   check 3 (obs #173) grepped `**Final Status:**` — colon inside the bold — while the template's
//     story and task variants write `**Final Status**:` (colon outside). Across the corpus, 105 of
//     147 completed reports failed it. The report here is BUILT FROM THE TEMPLATE ITSELF, so a
//     template edit reaches this test rather than a hand-written fixture that agrees with the regex.
//
//   check 5 (obs #142) ran verify-push-state.sh unscoped, which fails on any dirty path. In a
//     checkout another session is editing, that session's files made the step unpassable (task.128:
//     "working tree DIRTY, 7 uncommitted paths", all seven someone else's).
//
// The block is cut from the shipped step document by its closing line, its placeholders are bound,
// and it runs in a fixture repo with a pushed branch and a `gh` stub, under bash and zsh.

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import {
  ROOT,
  SHELLS,
  readDoc,
  blockBy,
  bind,
  fixtureRepo,
  write,
  run,
  git,
  gitAsync,
  ghStub,
  runAsync,
  cleanup,
} from "./lib/executed-prose.mjs";

const require = createRequire(import.meta.url);
const { fencedRanges } = require("../change-log.js");

const STEP8 = "shared/resources/develop-pipeline-step-8-commit.md";
const STEP4 = "shared/resources/develop-pipeline-step-4-create-pr.md";
const TEMPLATE = "shared/resources/implementation-report-template.md";
const WORK_ITEM = "docs/tasks/task.9.fx";
const REPORT = `${WORK_ITEM}/task.9.implementation.1.fx.md`;
const STAMP = "2026-09-25 10:00 UTC";

// ── The report, from the template ─────────────────────────────────────────────

// The body of the one fence that follows `## <Name> variant`.
function variantBody(name) {
  const text = readDoc(TEMPLATE);
  const at = text.search(new RegExp(`^## ${name} variant\\b`, "m"));
  assert.ok(at >= 0, `template has no "## ${name} variant" heading`);
  const fence = fencedRanges(text).find(([a]) => a > at);
  assert.ok(fence, `no fenced block after "## ${name} variant"`);
  const lines = text.slice(fence[0], fence[1]).split("\n");
  // Drop the opening fence line and the closing fence line.
  const close = lines.findLastIndex((l) => /^ {0,3}`{3,}\s*$/.test(l));
  return lines.slice(1, close).join("\n") + "\n";
}

// Substitute a placeholder that MUST be present — a template that stops carrying it would
// otherwise leave the report unfinished and turn a pass case red for the wrong reason, or leave
// an "unfinished" case finished and green for the wrong reason.
function must(text, from, to) {
  assert.ok(
    text.includes(from),
    `template no longer carries ${JSON.stringify(from)}`,
  );
  return text.split(from).join(to);
}

function finished(variant) {
  let t = variantBody(variant);
  t = must(t, "⏳ Pending", "✅ Done");
  if (variant === "Bug") {
    t = must(t, "**Finished:** —", `**Finished:** ${STAMP}`);
    t = must(t, "**Final Status:** In Progress", "**Final Status:** Completed");
  } else {
    t = must(t, "**Finished**: {populated at end}", `**Finished**: ${STAMP}`);
    t = must(
      t,
      "**Final Status**: {Completed / Failed / Escalated}",
      "**Final Status**: Completed",
    );
  }
  return t;
}

// ── Check 4 fixtures — a paused-and-resumed report (task 159, obs #200) ──────

const HOOK = "shared/resources/develop-pipeline-on-precompact.sh";

// The pause section, written by EXECUTING the hook's own append block with its inputs bound — so a
// reword of the hook reaches this fixture instead of leaving a stale copy of its prose here.
function pauseSection() {
  const src = readDoc(HOOK);
  const start = src.indexOf("# Append pause entry to report");
  assert.ok(start >= 0, "hook no longer carries its pause-append block");
  const from = src.indexOf("{", start);
  const to = src.indexOf('>> "$REPORT"', from);
  assert.ok(from > 0 && to > from, "pause-append block shape changed");
  // The `{ … }` group only: without its `>> "$REPORT"` redirect it writes to stdout.
  const block = src.slice(from, src.lastIndexOf("}", to) + 1);
  const r = run("bash", block, {
    cwd: ROOT,
    env: {
      NOW: "2026-09-26T20:35:00Z",
      SKILL: "develop-task",
      BRANCH: "feature/task.9.fx",
      CURRENT_STEP: "7",
      PR_URL: "https://example.invalid/pr/1",
      LOCK_TRACKER: "github",
      TRACKER_ISSUE: "1",
    },
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

// Every table row `✅ Done`; the unfinished-state tokens appear only in prose — a Decisions Log line
// and the hook's pause section. This is the report task.152 carried into Step 8.
function pausedAndResumed() {
  const base = must(
    finished("Task"),
    "## Decisions Log\n",
    "## Decisions Log\n\n- Resumed: Step 7 was `⏳ Pending` at the pause and re-ran from the start.\n",
  );
  return base + pauseSection();
}

// The `|` rows under `## Pipeline Progress`, up to the next `## ` heading.
function progressRows(text) {
  const at = text.search(/^## Pipeline Progress\s*$/m);
  assert.ok(at >= 0, "report has no ## Pipeline Progress heading");
  const rest = text.slice(at).split("\n").slice(1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  return rest
    .slice(0, end < 0 ? undefined : end)
    .filter((l) => l.startsWith("|"));
}

// Set ONE table row's status. `finished()` made every row `✅ Done`, so a global replace would touch
// all of them: split on the row's own label, and assert both counts.
function setRow(text, label, state) {
  const lines = text.split("\n");
  const hits = lines.flatMap((l, i) => (l.startsWith(`| ${label}`) ? [i] : []));
  assert.equal(
    hits.length,
    1,
    `expected one "${label}" row, found ${hits.length}`,
  );
  const parts = lines[hits[0]].split("✅ Done");
  assert.equal(
    parts.length,
    2,
    `the "${label}" row does not read ✅ Done once`,
  );
  lines[hits[0]] = parts.join(state);
  return lines.join("\n");
}

// Write ONE row's Notes cell (the Task variant's fourth column). The cell must be empty first, so a
// template that moves or fills the column turns the case red instead of silently testing another cell.
function setNotes(text, label, notes) {
  const lines = text.split("\n");
  const hits = lines.flatMap((l, i) => (l.startsWith(`| ${label}`) ? [i] : []));
  assert.equal(
    hits.length,
    1,
    `expected one "${label}" row, found ${hits.length}`,
  );
  const cells = lines[hits[0]].split("|");
  assert.equal(
    cells[4].trim(),
    "",
    `the "${label}" row's Notes cell is not empty`,
  );
  cells[4] = ` ${notes} `;
  lines[hits[0]] = cells.join("|");
  return lines.join("\n");
}

// Remove `## Pipeline Progress` through the line before the next `## ` heading.
function withoutProgressTable(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^## Pipeline Progress\s*$/.test(l));
  assert.ok(at >= 0, "report has no ## Pipeline Progress heading to remove");
  const next = lines.findIndex((l, i) => i > at && l.startsWith("## "));
  assert.ok(next > at, "no heading follows ## Pipeline Progress");
  return [...lines.slice(0, at), ...lines.slice(next)].join("\n");
}

// Keep the header and separator rows under `## Pipeline Progress`; drop every step row.
function headerOnly(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^## Pipeline Progress\s*$/.test(l));
  const next = lines.findIndex((l, i) => i > at && l.startsWith("## "));
  const pipes = lines.slice(at + 1, next).filter((l) => l.startsWith("|"));
  assert.ok(pipes.length >= 3, "fixture: expected header + separator + rows");
  const keep = new Set(pipes.slice(0, 2));
  return lines
    .filter(
      (l, i) => !(i > at && i < next && l.startsWith("|") && !keep.has(l)),
    )
    .join("\n");
}

// Rename the table's `Status` header cell, so no column is named Status. Only the header row is
// touched, and it must carry the cell exactly once.
function withoutStatusColumn(text) {
  const header = progressRows(text)[0];
  const parts = header.split(" Status ");
  assert.equal(parts.length, 2, "the header row does not name Status once");
  return text.split(header).join(parts.join(" State  "));
}

// The one table row whose label is `label` — what check 4 prints when it refuses that row.
function rowOf(text, label) {
  const hits = progressRows(text).filter((l) => l.startsWith(`| ${label}`));
  assert.equal(
    hits.length,
    1,
    `expected one "${label}" row, found ${hits.length}`,
  );
  return hits[0];
}

const CHECK4_UNFINISHED =
  /❌ Step 8 incomplete: Pipeline Progress has a row that is not finished \(✅ or ⏭️ Skipped\)/;
const CHECK4_NO_TABLE =
  /❌ Step 8 incomplete: no Pipeline Progress table found/;

// ── The block, from the step document ─────────────────────────────────────────

const VERIFY = path.join(ROOT, "shared", "resources", "verify-push-state.sh");
const LOCK_HELPER = path.join(
  ROOT,
  "shared",
  "resources",
  "advance-pipeline-lock.sh",
);

// {extra-scope-paths} is the caller's documented list of writes outside its work item (the table in
// the step document): empty for develop-story and develop-task, and the bug registry for a
// develop-bug general bug (task.147 QA-1, CR-2).
const GENERAL_BUG_EXTRA = "docs/bugs/bug-registry.md";

function checklist(extra = "") {
  const code = blockBy(readDoc(STEP8), "✅ Step 8 post-conditions verified");
  return bind(code, {
    ".agents/skills/{develop-story|develop-task|develop-bug}/references/verify-push-state.sh":
      VERIFY,
    ".agents/skills/{develop-story|develop-task|develop-bug}/references/advance-pipeline-lock.sh":
      LOCK_HELPER,
    "{work-item-dir}": WORK_ITEM,
    "{extra-scope-paths}": extra,
  });
}

// A fixture repo whose feature branch carries the report, committed and pushed, with a `gh` that
// answers the PR's base. No lock, no test logs, no halt snapshot — checks 1, 2 and 2b pass.
// Async, so the concurrent cases below overlap instead of queueing behind sync git spawns.
async function setup(reportText) {
  const fx = fixtureRepo();
  write(fx.work, REPORT, reportText);
  await gitAsync(fx.work, "add", "-A");
  await gitAsync(fx.work, "commit", "-q", "-m", "report");
  await gitAsync(fx.work, "push", "-q");
  const gh = ghStub(fx.dir, 'case "$*" in *baseRefName*) echo develop ;; esac');
  return { ...fx, ...gh };
}

function runChecklist(shell, fx, extra = "") {
  return runAsync(shell, checklist(extra), {
    cwd: fx.work,
    bin: fx.bin,
    env: { IMPLEMENTATION_REPORT: REPORT },
  });
}

// ── Non-vacuity ───────────────────────────────────────────────────────────────

test("the extracted checklist carries check 3 and a scoped check 5", () => {
  const code = checklist();
  assert.match(code, /Final Status/);
  assert.match(code, /Finished/);
  assert.match(code, /EXTRA_SCOPES=\(\)/);
  assert.match(code, new RegExp(`SCOPE_ARGS=\\(--scope "${WORK_ITEM}"\\)`));
  assert.match(
    code,
    /verify-push-state\.sh --base "\$BASE_BRANCH" "\$\{SCOPE_ARGS\[@\]\}"/,
  );
});

test("the step document names the general-bug registry as develop-bug's extra scope", () => {
  const doc = readDoc(STEP8);
  assert.ok(
    doc.includes(
      `| \`develop-bug\`, **general** bug | \`${GENERAL_BUG_EXTRA}\` |`,
    ),
    "the {extra-scope-paths} table no longer names the general-bug registry",
  );
  assert.ok(
    readDoc("skills/develop-bug/SKILL.md").includes(
      `\`{extra-scope-paths}\` = \`${GENERAL_BUG_EXTRA}\` for a general bug`,
    ),
    "develop-bug Step 8 no longer passes the registry as an extra scope",
  );
});

// Step 8 must not tell the orchestrator to edit the report after its own commit: check 5 needs a
// clean tree, so any such edit either fails the step or is left out of the commit (task 160). 15 of
// 123 committed completed reports carried a `⏳ Pending` row that way, 14 of them Step 8's own.
test("Step 8 edits the report before /commit-changes and never after it", () => {
  const doc = readDoc(STEP8);
  const before = doc.slice(
    doc.indexOf("## Final Implementation Report Update"),
    doc.indexOf("## Lint the report before the terminal commit"),
  );
  assert.match(before, /including Step 8's own row/);
  const after = doc.slice(
    doc.indexOf("## Invoke /commit-changes"),
    doc.indexOf("## Step 8 Completion Checklist"),
  );
  assert.ok(after.length > 0, "section anchors moved");
  assert.doesNotMatch(after, /Update Pipeline Progress/);
  assert.doesNotMatch(after, /Update the Pipeline Progress Notes/);
  assert.doesNotMatch(after, /Pipeline Progress ✅/);
  assert.doesNotMatch(after, /Committed in `/);
});

// Every restatement of Step 8 names the order the step document now states: the Pipeline Progress
// rows are set BEFORE /commit-changes, never after the push. Four summaries restated the old order
// after the step body changed (task.160 QA cycle 1, CR-1), and an orchestrator reads the summary.
const STEP8_RESTATEMENTS = [
  ["the step document's description", STEP8, /^description:.*$/m],
  ...["develop-task", "develop-story", "develop-bug"].map((s) => [
    `${s} SKILL.md's Step 8 summary`,
    `skills/${s}/SKILL.md`,
    /^.*develop-pipeline-step-8-commit\.md.*final push.*$/m,
  ]),
];
for (const [name, file, pattern] of STEP8_RESTATEMENTS) {
  test(`${name} sets Pipeline Progress before the commit, not after the push`, () => {
    const line = readDoc(file).match(pattern)?.[0];
    assert.ok(line, `${file}: no Step 8 summary line found`);
    const progress = line.indexOf("Pipeline Progress");
    const commit = line.indexOf("/commit-changes");
    const push = line.indexOf("final push");
    assert.ok(
      progress >= 0 && commit >= 0 && push >= 0,
      `${file}: summary shape changed: ${line}`,
    );
    assert.ok(
      progress < commit,
      `${file}: Pipeline Progress is named after /commit-changes: ${line}`,
    );
    assert.ok(
      !line.slice(push).includes("Pipeline Progress"),
      `${file}: Pipeline Progress follows the push: ${line}`,
    );
  });
}

// The Step Transition Protocol's action 2 runs after EVERY step, Step 8 included — after check 5 has
// required a clean tree. Each orchestrator must say that after Step 8 it changes nothing.
for (const s of ["develop-task", "develop-story", "develop-bug"]) {
  test(`${s}'s Step Transition Protocol makes action 2 a no-op after Step 8`, () => {
    const action2 = readDoc(`skills/${s}/SKILL.md`).match(
      /^2\. \*\*Edit the implementation report\*\*.*$/m,
    )?.[0];
    assert.ok(action2, `skills/${s}/SKILL.md: action 2 not found`);
    assert.match(action2, /After Step 8 this edit is a no-op/);
    // The same predicate check 4 uses, and a mismatch is a HALT (task.160 QA cycle 2, CR2-2).
    assert.match(action2, /check 4's own test/);
    assert.match(action2, /HALT, not an edit/);
    assert.doesNotMatch(action2, /reads `✅ Done` and change nothing/);
  });
}

// Step 8's completion is decided by the resume record, never by its row or by git (task.160 QA
// cycles 2–3, CR2-1 / CR3-1). The step document states the rule once; the resume contract cites it.
const RESUME = "shared/resources/develop-pipeline-resume-contract.md";
const HOOK_PATH = path.join(
  ROOT,
  "shared",
  "resources",
  "develop-pipeline-on-precompact.sh",
);
const RESTORE = path.join(
  ROOT,
  "shared",
  "resources",
  "advance-pipeline-lock.sh",
);
const LOCK = ".claude/state/develop-pipeline.lock";
const SNAPSHOT = ".claude/state/develop-pipeline.last-halt.json";
test("the step document names the resume record, not the row or git, as Step 8's evidence", () => {
  const doc = readDoc(STEP8);
  const update = doc.slice(
    doc.indexOf("## Final Implementation Report Update"),
    doc.indexOf("## Lint the report before the terminal commit"),
  );
  assert.match(
    update,
    /not the evidence that Step 8 finished — and neither is the git state/,
  );
  assert.match(update, /The evidence is the \*\*resume record\*\*/);
  assert.doesNotMatch(update, /set the Step 8 row to `❌ Failed`/);
  const resume = readDoc(RESUME);
  assert.match(
    resume,
    /Step 8 is decided by the resume record, never by its row or by git/,
  );
  assert.match(
    resume,
    /When the resume record is at step 8, the Step 8 row is not evidence/,
  );
  assert.doesNotMatch(resume, /Steps 2 and 8 do not require/);
  assert.doesNotMatch(resume, /verify-push-state/);
  // What the record covers (task 161, superseding task.160 QA cycle 4, CR4-1): /commit-changes'
  // lock cooperation removes nothing, so the record spans all of Step 8 and no gap is left to name.
  assert.match(update, /`\/commit-changes`' lock cooperation/);
  assert.match(update, /What the record covers: all of Step 8/);
  assert.match(update, /Every Step 8 HALT is resumable/);
  assert.doesNotMatch(update, /What it does not cover/);
  assert.doesNotMatch(
    update,
    /removes this run's halt snapshot and then, last, the lock/,
  );
  assert.doesNotMatch(
    resume,
    /A finished Step 8 leaves no record, so it can never be offered/,
  );
  // Scoped to the Step 8 row: an unfinished Step 7 still wins, and a surviving lock counts
  // (task.160 QA cycle 5, CR5-1 / CR5-2). A lint-failed HALT keeps its record (CR5-3).
  assert.match(resume, /resume from the first row that is not finished/);
  assert.match(resume, /an unfinished Step 7 row still wins/);
  assert.match(resume, /whether it survived or was restored/);
  assert.doesNotMatch(resume, /whatever the row reads and whatever/);
  // Every Step 8 HALT now keeps its record, so the lint-failed HALT is no longer the exception (task 161).
  assert.doesNotMatch(
    update,
    /A HALT whose report fails lint skips that commit/,
  );
  assert.doesNotMatch(resume, /would name a step 9/);
  assert.doesNotMatch(resume, /`\/commit-changes` removes the lock at step 8/);
  const step0 = readDoc(
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
  );
  assert.match(
    step0,
    /\*\*Except the Step 8 row:\*\*[^\n]*develop-pipeline-resume-contract\.md/,
  );
});

// The premise CR5-1 rests on, executed: /finalise's lock cooperation moves the lock from 7 to 8 as
// its last action — before the orchestrator runs Step 7's tail — so a record at step 8 can mean an
// unfinished Step 7.
test("finalise's lock cooperation moves the record to step 8 before Step 7's tail runs", () => {
  const dir = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), "t160-finalise-"),
  );
  try {
    fs.mkdirSync(path.join(dir, ".claude/state"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, LOCK),
      JSON.stringify({ skill: "develop-task", current_step: 7 }) + "\n",
    );
    const r = run("bash", `bash "${RESTORE}" --skill finalise`, { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(
      String(
        JSON.parse(fs.readFileSync(path.join(dir, LOCK), "utf8")).current_step,
      ),
      "8",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Context Compression Recovery re-runs Step 8 for a record at step 8. Each orchestrator carries the
// step-8 exception and cites the resume contract (CR4-2), and states it BEFORE the items it overrides
// (task.160 pr-review.1 CR-2, task 161): after items 2–3 it came too late, once recovery had already
// verified Step 8 and printed "Resuming from recommended step 9".
for (const s of ["develop-task", "develop-story", "develop-bug"]) {
  test(`${s}'s Context Compression Recovery re-runs Step 8 for a record at step 8`, () => {
    const doc = readDoc(`skills/${s}/SKILL.md`);
    const one = doc.indexOf(
      "1. Read the implementation report. Find the last ✅ step",
    );
    const two = doc.indexOf("2. **Verify each ✅ step's artifact exists", one);
    assert.ok(one >= 0 && two > one, "recovery items 1 and 2 not found");
    const item = doc.slice(one, two);
    assert.match(item, /Exception — a record at step 8/);
    assert.doesNotMatch(
      doc.slice(two, doc.indexOf("\n\n", two)),
      /Exception — a record at step 8/,
      "the exception is restated after the items it overrides",
    );
    assert.doesNotMatch(item, /step 9/);
    assert.match(item, /re-run Step 8 from the start/);
    assert.match(item, /first unfinished row at or below Step 7/);
    assert.match(item, /surviving or restored/);
    assert.match(item, /develop-pipeline-resume-contract\.md/);
  });
}

// The detector never recommends a step 9 (task 161). Its schema says 1–8; a record at step 8 means
// Step 8 has not passed its checklist, so it recommends 8. Every rule that adds 1 to LOCK_STEP must
// carry the clamp, in the Step 3 rules and in the decision table alike.
test("the resume detector recommends 8, never 9, for a record at step 8", () => {
  const doc = readDoc("shared/resources/pipeline-resume-detector-prompt.md");
  assert.match(doc, /`recommended_step` \| integer \| yes \|[^\n]*\(1–8\)/);
  assert.match(doc, /`recommended_step = min\(LOCK_STEP \+ 1, 8\)`/);
  const adders = doc
    .split("\n")
    .filter(
      (l) => /LOCK_STEP \+ 1/.test(l) && !/min\(LOCK_STEP \+ 1, 8\)/.test(l),
    );
  // Non-vacuity: the decision table has two rows that add 1.
  assert.ok(
    adders.length >= 2,
    `expected the table's +1 rows, found ${adders.length}`,
  );
  for (const l of adders) {
    assert.match(l, /or 8 when LOCK_STEP is 8/, `unclamped: ${l}`);
  }
});

// The population, not named lines (task.160 pr-review.1 CR-1; task 161). Every instruction that
// updates the Pipeline Progress table after a step, anywhere the develop pipelines are specified,
// either belongs to one numbered step, or says it is a no-op after Step 8 — whose own row was set
// before its commit, when check 5's clean tree forbids any later edit.
//   files:  skills/develop-*/SKILL.md and the develop-pipeline-*.md docs beside this test's parent
//   hits:   PIPELINE_PROGRESS_EDIT below
//   exempt: develop-pipeline-step-{1..7}-*.md — each instruction there updates its own step's row,
//           and runs before Step 8; develop-pipeline-step-8-commit.md — Step 8's own edits, whose
//           before-the-commit order the task.160 ordering tests execute; a line that says "before
//           the commit" — an orchestrator's summary of that same Step 8 edit.
const PIPELINE_PROGRESS_EDIT =
  /update (the )?Pipeline Progress|Pipeline Progress (table|row)[^.]*(✅|update)/i;
function developPipelineDocs() {
  const skills = fs
    .readdirSync(path.join(ROOT, "skills"))
    .filter((d) => d.startsWith("develop-"))
    .map((d) => `skills/${d}/SKILL.md`)
    .filter((f) => fs.existsSync(path.join(ROOT, f)));
  const shared = fs
    .readdirSync(path.join(ROOT, "shared", "resources"))
    .filter((f) => /^develop-pipeline-.*\.md$/.test(f))
    .map((f) => `shared/resources/${f}`);
  return [...skills, ...shared];
}
test("every generic Pipeline Progress update says it is a no-op after Step 8", () => {
  const perSkill = {};
  let required = 0;
  for (const file of developPipelineDocs()) {
    if (/develop-pipeline-step-[1-8]-/.test(file)) continue;
    for (const line of readDoc(file).split("\n")) {
      if (!PIPELINE_PROGRESS_EDIT.test(line)) continue;
      if (/before the commit/.test(line)) continue;
      required++;
      perSkill[file] = (perSkill[file] || 0) + 1;
      assert.match(
        line,
        /After Step 8 this (edit )?is a no-op/,
        `${file}: a Pipeline Progress update with no Step 8 exception: ${line.slice(0, 160)}`,
      );
    }
  }
  // Floor: action 2 and the "After each step" line in each of the three orchestrators.
  for (const s of ["develop-task", "develop-story", "develop-bug"]) {
    assert.ok(
      (perSkill[`skills/${s}/SKILL.md`] || 0) >= 2,
      `${s}: expected action 2 and the "After each step" line, found ${perSkill[`skills/${s}/SKILL.md`] || 0}`,
    );
  }
  assert.ok(
    required >= 6,
    `expected at least 6 generic updates, found ${required}`,
  );
});

// Same population class for the lock's terminal remover (review I-5): every mention of `--complete`
// outside the step-8 document — which defines where it runs, and whose order the executed checklist
// tests hold — must say that Step 8's Completion Checklist runs it. An orchestrator told to
// `--complete` once /commit-changes returns would skip checks 2–5.
//   files:  developPipelineDocs() (the Markdown above) plus the Stop hook script, whose reason is
//           the other text an orchestrator is told to act on (task 162). The hook's `.md` siblings
//           could not see its generic "(or `--complete` if that was Step 8)" clause.
//   exempt: none in the hook — every line counts, `#` comments included. Its comments were
//           reworded to name the Completion Checklist rather than skipped, so the rule holds for
//           the whole file and a comment cannot carry the old instruction back in.
const STOP_HOOK = "shared/resources/develop-pipeline-on-stop.sh";
test("every orchestrator mention of --complete names the Step 8 Completion Checklist", () => {
  const perSkill = {};
  let seen = 0;
  for (const file of [...developPipelineDocs(), STOP_HOOK]) {
    if (file.endsWith("develop-pipeline-step-8-commit.md")) continue;
    for (const line of readDoc(file).split("\n")) {
      if (!line.includes("--complete")) continue;
      seen++;
      perSkill[file] = (perSkill[file] || 0) + 1;
      assert.match(
        line,
        /Completion Checklist/,
        `${file}: --complete without the checklist that runs it: ${line.slice(0, 160)}`,
      );
    }
  }
  for (const s of ["develop-task", "develop-story", "develop-bug"]) {
    assert.ok(
      (perSkill[`skills/${s}/SKILL.md`] || 0) >= 2,
      `${s}: expected action 1 and the lock-update line, found ${perSkill[`skills/${s}/SKILL.md`] || 0}`,
    );
  }
  // The hook needs its own floor: the Markdown alone meets `seen >= 6`, so a hook that stopped
  // mentioning --complete would pass its half of this check on nothing (task 163; task.162
  // pr-review.1 CR-3). It counts code lines only: three of the hook's --complete lines are `#`
  // comments, so a floor over every line stayed green with neither instruction left in it (task 164;
  // task.163 pr-review.1 CR-1). The two it measures are COMPLETION_LINE and ALREADY_DONE.
  const hookCode = readDoc(STOP_HOOK)
    .split("\n")
    .filter((l) => l.includes("--complete") && !/^\s*#/.test(l)).length;
  assert.ok(
    hookCode >= 2,
    `${STOP_HOOK}: expected --complete in COMPLETION_LINE and ALREADY_DONE (2 non-comment lines), found ${hookCode}`,
  );
  assert.ok(seen >= 6, `expected at least 6 mentions, found ${seen}`);
});

// The Stop hook's step-8 line and the resume contract's Phase 0b sentence each describe Step 7's
// tail per orchestrator. Two copies of one description drift silently, so this renders the hook's
// reason at lock 8 and requires each tail to read the same in both (task 163; task.162 gate.1
// QA-L1: the contract's wording was unpinned). The named phrases are floors: an extraction that
// found the wrong span, or none, fails here rather than comparing two empty strings.
const STOP_HOOK_PATH = path.join(ROOT, STOP_HOOK);
function stopHookReasonAt8(skill) {
  const dir = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), "t163-stop-"),
  );
  try {
    fs.mkdirSync(path.join(dir, ".claude/state"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, LOCK),
      JSON.stringify({ skill, current_step: 8, report_path: "r.md" }) + "\n",
    );
    const r = run("bash", `printf '{}' | bash "${STOP_HOOK_PATH}"`, {
      cwd: dir,
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    return JSON.parse(r.stdout).reason;
  } finally {
    cleanup(dir);
  }
}
test("the Stop hook and the resume contract describe Step 7's tail in the same words", () => {
  const para = readDoc(RESUME)
    .split("\n")
    .find((l) => l.includes("Step 8 is decided by the resume record"));
  assert.ok(
    para,
    `${RESUME}: no Phase 0b paragraph anchored at "Step 8 is decided by the resume record"`,
  );

  const bugReason = stopHookReasonAt8("develop-bug");
  const taskReason = stopHookReasonAt8("develop-task");
  assert.ok(
    bugReason && taskReason,
    "the hook rendered an empty reason at lock 8",
  );

  // develop-bug: Part B's list, between the dashes, and then the checklist — which is a section of
  // its own beside Parts A and B, so it must sit outside Part B's list (QA cycle 2, CR-2).
  const bugHook = bugReason.match(
    /Part B's bug-close routine — (.+?) — then the Step 7 Completion Checklist \(develop-bug-step-7-close-bug\.md\)/,
  );
  const bugContract = para.match(
    /for develop-bug: Part B's bug-close routine in `develop-bug-step-7-close-bug\.md` — (.+?) — then the Step 7 Completion Checklist\)\./,
  );
  assert.ok(
    bugHook,
    `hook reason at lock 8 (develop-bug) has no bug-close list: ${bugReason.slice(0, 200)}`,
  );
  assert.ok(
    bugContract,
    `${RESUME}: Phase 0b paragraph has no develop-bug bug-close list`,
  );
  for (const phrase of [
    "the Resolution Summary",
    "status `closed`",
    "the tracker-close check",
  ]) {
    assert.ok(
      bugHook[1].includes(phrase),
      `hook's develop-bug tail lacks "${phrase}": ${bugHook[1]}`,
    );
    assert.ok(
      bugContract[1].includes(phrase),
      `contract's develop-bug tail lacks "${phrase}": ${bugContract[1]}`,
    );
  }
  for (const [where, list] of [
    ["hook", bugHook[1]],
    ["contract", bugContract[1]],
  ]) {
    assert.doesNotMatch(
      list,
      /Checklist/,
      `the ${where} lists the Step 7 Completion Checklist inside Part B's routine: ${list}`,
    );
  }
  assert.equal(
    bugHook[1],
    bugContract[1],
    "the hook and the contract describe develop-bug's Step 7 tail differently",
  );

  // develop-story / develop-task: one shared tail.
  const taskHook = taskReason.match(
    /finish that step first \(for Step 7: ([^)]+)\)/,
  );
  const taskContract = para.match(
    /for develop-story and develop-task: ([^;]+);/,
  );
  assert.ok(
    taskHook,
    `hook reason at lock 8 (develop-task) has no Step 7 tail: ${taskReason.slice(0, 200)}`,
  );
  assert.ok(
    taskContract,
    `${RESUME}: Phase 0b paragraph has no develop-story/develop-task tail`,
  );
  assert.ok(
    taskHook[1].includes("the DoD body to the PR"),
    `hook's task tail: ${taskHook[1]}`,
  );
  assert.equal(
    taskHook[1],
    taskContract[1],
    "the hook and the contract describe the story/task Step 7 tail differently",
  );
});

// The Remaining Work Status block's position and steps-ahead list come from current_step at every
// firing point but one: when the Stop hook re-prompts, its reason names both, and at lock 8 they
// differ from the derivation (/finalise moves the lock there before Step 7's tail runs). The banner
// doc defers to the reason there and nowhere else — scoping the exception by the lock's value made it
// fire on the ordinary Step 7 → 8 transition too, which advances the lock before printing the block
// (task 163, QA cycle 2 CR-1, CR-4). The doc defers without restating: its restatement had already
// drifted from the hook (task.163 gate.3 CR-2), and literals typed into this test could not see that
// (CR-3). So the forbidden fragments are cut from the rendered reason, not typed here — and they are
// fragments, not whole strings, because a restatement paraphrases rather than copies (task 164).
const BANNER = "shared/resources/develop-pipeline-remaining-work-banner.md";
test("the banner doc defers to the Stop hook at a re-prompt without restating it", () => {
  const reason = stopHookReasonAt8("develop-task");
  const position = reason.match(/position `([^`]+)`/);
  const ahead = reason.match(/then the steps still ahead: ([^)]+)\)/);
  assert.ok(
    position && ahead,
    `hook reason at lock 8 lacks a position or list: ${reason.slice(0, 200)}`,
  );
  assert.match(
    position[1],
    /Step 7 unverified/,
    `lock-8 position: ${position[1]}`,
  );
  assert.match(
    ahead[1],
    /first unfinished row at or below Step 7/,
    `lock-8 list: ${ahead[1]}`,
  );

  // The banner doc wraps its lines; read it with whitespace collapsed.
  const banner = readDoc(BANNER).replace(/\s+/g, " ");
  // The rule names how many exceptions it has, and the carve-out sits before them, so no exception
  // can be introduced as "the one" while another follows it. That is the contradiction task.164 QA
  // cycle 1 found (QA-164-1): "One exception" and "every other firing point follows this rule",
  // then a HALT rule overriding it.
  const intro = banner.match(
    /Never re-read files solely to render the block\. (.+?)\*\*Exception 1:/,
  );
  assert.ok(intro, `${BANNER}: no carve-out sentence before the exceptions`);
  assert.ok(
    intro[1].includes("Two firing points are exceptions") &&
      intro[1].includes(
        "the ordinary Step 7 → 8 transition, follows this rule",
      ),
    `${BANNER}: the carve-out does not name both exceptions and the Step 7 → 8 transition: ${intro[1]}`,
  );
  const markers = banner.match(/\*\*Exception \d+:/g) || [];
  assert.equal(
    markers.length,
    2,
    `${BANNER}: the carve-out says two exceptions, the doc marks ${markers.length}`,
  );
  assert.ok(
    !/\bOne exception\b/.test(banner),
    `${BANNER}: an exception is still introduced as the only one`,
  );
  const exception = banner.match(
    /\*\*Exception 1: ([^*]+)\*\*(.+?)\*\*Exception 2:/,
  );
  assert.ok(
    exception,
    `${BANNER}: no "Exception 1" clause in the derivation rule`,
  );
  assert.equal(
    exception[1],
    "a Stop-hook re-prompt.",
    `the exception is scoped to "${exception[1]}", not a Stop-hook re-prompt`,
  );
  // The hook's distinctive fragments: the position's parenthetical before its colon, and the list's
  // first five words. Each is floored, so an extraction that found nothing cannot pass the "does not
  // carry" check vacuously. They are checked against the WHOLE doc, not only the exception: a
  // restatement placed in the HALT rule or anywhere else is the same second copy (QA-164-3).
  const fragments = [
    (position[1].match(/\(([^:]+):/) || [])[1] || "",
    ahead[1].split(" ").slice(0, 5).join(" "),
  ];
  for (const fragment of fragments) {
    assert.ok(
      fragment.split(" ").length >= 3,
      `hook fragment too short to be distinctive: "${fragment}"`,
    );
    assert.ok(
      !banner.includes(fragment),
      `${BANNER}: the doc restates the hook ("${fragment}")`,
    );
  }
  for (const phrase of [
    "`POSITION`",
    "`STEPS_AHEAD`",
    "Emit the position as the reason gives it",
    "one `- Step N:` line per remaining step",
  ]) {
    assert.ok(
      exception[2].includes(phrase),
      `${BANNER}: the exception lacks "${phrase}": ${exception[2]}`,
    );
  }
});

// A HALT block's position is the step that halted, not current_step. They differ at lock 8, where
// /finalise has moved the lock before Step 7's tail runs, so a Step 7-tail HALT rendered by the
// current_step rule named Step 8 — the step that had not run (task 164; task.163 gate.3
// recommendations.future). The rule is scoped to the printed block; halt_step is not its subject.
// The Step 7 names are read off the hook, which is their one statement, so the example cannot name
// one pipeline's step for all three (QA-164-2: develop-bug's Step 7 is "FINALISE & CLOSE"). Which
// sub-skills advance the lock before their step's tail is advance-pipeline-lock.sh's --skill mapping:
// the rule cites it and names only /finalise, as the example. Explaining the difference at lock 8
// alone left develop (→ 4) and create-pr (→ 5) out (QA-164-5), so the rule may not list the mapping
// either — every skill in it but the example is read off the script and refused here.
test("a HALT status block names the step that halted, not current_step", () => {
  const banner = readDoc(BANNER).replace(/\s+/g, " ");
  const rule = banner.match(
    /\*\*Exception 2: a HALT names the step that halted\.\*\*(.+?)\(task 164\)\./,
  );
  assert.ok(
    rule,
    `${BANNER}: no "Exception 2: a HALT names the step that halted" rule`,
  );
  for (const phrase of [
    "not at `current_step`",
    "the first line of the steps-ahead list",
    "a HALT in Step N lists `- Step N:` first",
    "`--skill` mapping of `advance-pipeline-lock.sh`",
    "Step 7/8 — {STEP-NAME} ❌ halted",
    "`halt_step`",
  ]) {
    assert.ok(
      rule[1].includes(phrase),
      `${BANNER}: the HALT rule lacks "${phrase}": ${rule[1]}`,
    );
  }
  const step7Names = [
    ...new Set(
      [...readDoc(STOP_HOOK).matchAll(/^\s*7\) NEXT_NAME="([^"]+)"/gm)].map(
        (m) => m[1],
      ),
    ),
  ];
  assert.ok(
    step7Names.length >= 2,
    `${STOP_HOOK}: expected a Step 7 name for develop-bug and one for develop-story/task, found ${JSON.stringify(step7Names)}`,
  );
  for (const name of step7Names) {
    assert.ok(
      rule[1].includes(`\`${name}\``),
      `${BANNER}: the HALT rule does not name the hook's Step 7 name "${name}": ${rule[1]}`,
    );
  }
  const mapping = readDoc("shared/resources/advance-pipeline-lock.sh").match(
    /\n {2}--skill\)\n([\s\S]*?)\n {4}esac/,
  );
  assert.ok(mapping, "advance-pipeline-lock.sh: no --skill case");
  const advancing = [
    ...mapping[1].matchAll(/^\s*([a-z|-]+)\)\s+NEXT=(\d+)/gm),
  ].flatMap((m) =>
    m[1].split("|").map((name) => ({ name, next: Number(m[2]) })),
  );
  assert.ok(
    advancing.length >= 5 &&
      advancing.some((a) => a.name === "finalise" && a.next === 8),
    `advance-pipeline-lock.sh: expected the --skill mapping to include finalise → 8, found ${JSON.stringify(advancing)}`,
  );
  for (const { name } of advancing) {
    if (name === "finalise") continue;
    assert.ok(
      !rule[1].includes(`\`${name}\``) && !rule[1].includes(`\`/${name}\``),
      `${BANNER}: the HALT rule lists "${name}" from the --skill mapping; cite the mapping instead`,
    );
  }
  const row = readDoc(BANNER)
    .split("\n")
    .find((l) => l.startsWith("| Every HALT"));
  assert.ok(
    row && row.includes("not `current_step`"),
    `${BANNER}: the HALT row of the position table does not name the halting step: ${row}`,
  );
});

// A lock at step 8 for this work item, as the orchestrator holds it while Step 8 runs.
function writeStep8Lock(fx) {
  write(
    fx.work,
    LOCK,
    JSON.stringify({
      skill: "develop-task",
      report_path: REPORT,
      task_or_story_id: "9",
      task_or_story_directory: WORK_ITEM,
      branch: "feature/task.9.fx",
      pr_url: "",
      tracker: "github",
      tracker_issue: "",
      current_step: 8,
    }) + "\n",
  );
}

// The real PreCompact hook, fired while Step 8 runs after its row went ✅. It commits and pushes the
// report — so the branch looks exactly like a finished run — and what distinguishes the two is the
// record it leaves: a snapshot at step 8, which --restore turns back into a lock at step 8.
test("a PreCompact pause inside Step 8 looks finished to git but leaves a record at step 8", async () => {
  const fx = await setup(finished("Task"));
  try {
    writeStep8Lock(fx);
    const r = run("bash", `bash "${HOOK_PATH}"`, {
      cwd: fx.work,
      bin: fx.bin,
      env: { PIPELINE_LOCK: LOCK },
    });
    assert.equal(r.status, 0, `hook: ${r.stdout}\n${r.stderr}`);
    // Git cannot tell this from a finished Step 8: the report is committed and pushed.
    assert.equal(
      git(fx.work, "status", "--porcelain", "--", WORK_ITEM).trim(),
      "",
      "report left dirty",
    );
    assert.equal(
      git(fx.work, "rev-parse", "HEAD").trim(),
      git(fx.work, "rev-parse", "@{u}").trim(),
      "hook did not push — the fixture no longer models the case",
    );
    assert.match(
      fs.readFileSync(path.join(fx.work, REPORT), "utf8"),
      /^## Pipeline Paused — /m,
    );
    // The record can: the lock is gone and a snapshot names step 8 for this work item.
    assert.equal(
      fs.existsSync(path.join(fx.work, LOCK)),
      false,
      "hook left the lock",
    );
    const snap = JSON.parse(
      fs.readFileSync(path.join(fx.work, SNAPSHOT), "utf8"),
    );
    assert.equal(String(snap.halt_step), "8");
    assert.equal(snap.task_or_story_directory, WORK_ITEM);
    // And a resume restores it to a lock at step 8 — the value the resume contract reads.
    const rr = run("bash", `bash "${RESTORE}" --restore "${WORK_ITEM}"`, {
      cwd: fx.work,
    });
    assert.equal(rr.status, 0, `restore: ${rr.stdout}\n${rr.stderr}`);
    const lock = JSON.parse(fs.readFileSync(path.join(fx.work, LOCK), "utf8"));
    assert.equal(String(lock.current_step), "8");
  } finally {
    cleanup(fx.dir);
  }
});

// The paused-and-resumed case can only pass for the right reason if the fixture carries the trap:
// both unfinished-state tokens outside the table, neither inside it.
test("the paused-and-resumed fixture carries both unfinished tokens outside the table only", () => {
  const t = pausedAndResumed();
  const rows = progressRows(t).join("\n");
  assert.ok(rows.length > 0, "fixture has no Pipeline Progress rows");
  assert.doesNotMatch(rows, /⏳ Pending|⏸️ Paused/, "the table must be clean");
  const outside = t.split(rows).join("");
  assert.ok(
    outside.includes("⏳ Pending"),
    "⏳ Pending must appear outside the table",
  );
  assert.ok(
    outside.includes("⏸️ Paused"),
    "⏸️ Paused must appear outside the table",
  );
  assert.match(
    t,
    /^## Pipeline Paused — /m,
    "the hook's pause section is missing",
  );
});

// ── check 3 — every template variant, finished, passes ────────────────────────

describe("executed against fixtures", { concurrency: true }, () => {
  for (const sh of SHELLS) {
    for (const variant of ["Task", "Story", "Bug"]) {
      test(`[${sh}] a finished ${variant.toLowerCase()}-variant report built from the template passes`, async () => {
        const fx = await setup(finished(variant));
        try {
          const r = await runChecklist(sh, fx);
          assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
          assert.match(r.stdout, /✅ Step 8 post-conditions verified/);
        } finally {
          cleanup(fx.dir);
        }
      });
    }

    test(`[${sh}] the unfilled task template fails check 3 on Final Status`, async () => {
      const fx = await setup(
        must(variantBody("Task"), "⏳ Pending", "✅ Done"),
      );
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1);
        assert.match(r.stdout, /Final Status not set to Completed\/Accepted/);
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] a report still In Progress fails check 3`, async () => {
      const fx = await setup(
        finished("Task").replace(
          "**Final Status**: Completed",
          "**Final Status**: In Progress",
        ),
      );
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1);
        assert.match(r.stdout, /Final Status not set/);
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] a finished report with no Finished timestamp fails check 3`, async () => {
      const fx = await setup(
        finished("Story").replace(
          `**Finished**: ${STAMP}`,
          "**Finished**: {populated at end}",
        ),
      );
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1);
        assert.match(r.stdout, /Finished timestamp missing/);
      } finally {
        cleanup(fx.dir);
      }
    });

    // ── check 4 — the Pipeline Progress table, not the whole report ────────────

    test(`[${sh}] a paused-and-resumed report whose table is all ✅ Done passes`, async () => {
      const fx = await setup(pausedAndResumed());
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
        assert.match(r.stdout, /✅ Step 8 post-conditions verified/);
      } finally {
        cleanup(fx.dir);
      }
    });

    // "⏸ Paused" is the paused state WITHOUT its U+FE0F variation selector — emoji output often
    // drops it, and a literal `⏸️ Paused` pattern never matched it (finalise DoD probe, task.159).
    for (const state of ["⏳ Pending", "⏸️ Paused", "⏸ Paused"]) {
      test(`[${sh}] a table row left at ${state} fails check 4`, async () => {
        const fx = await setup(
          setRow(finished("Task"), "8. commit-changes", state),
        );
        try {
          const r = await runChecklist(sh, fx);
          assert.equal(r.status, 1, `stdout: ${r.stdout}`);
          assert.match(r.stdout, CHECK4_UNFINISHED);
        } finally {
          cleanup(fx.dir);
        }
      });
    }

    // A Notes cell is prose inside the table: naming a state there is the obs #200 trap moved one
    // level in, and must not fail a finished row. Check 4 matches the Status CELL, not the token.
    for (const notes of [
      "resumed after ⏸️ Paused at compaction",
      "was ⏳ Pending before the resume",
    ]) {
      test(`[${sh}] a ✅ Done row whose Notes read "${notes}" passes check 4`, async () => {
        const fx = await setup(
          setNotes(finished("Task"), "7. finalise", notes),
        );
        try {
          const r = await runChecklist(sh, fx);
          assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
          assert.match(r.stdout, /✅ Step 8 post-conditions verified/);
        } finally {
          cleanup(fx.dir);
        }
      });
    }

    // Check 3 still passes on this report (Final Status and Finished are set), so the run reaches
    // check 4 — and the message, not the exit status alone, is what proves it stopped there.
    test(`[${sh}] a report with no Pipeline Progress table fails check 4`, async () => {
      const fx = await setup(withoutProgressTable(finished("Task")));
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1, `stdout: ${r.stdout}`);
        assert.match(r.stdout, CHECK4_NO_TABLE);
      } finally {
        cleanup(fx.dir);
      }
    });

    // ── check 4 is an allowlist (task 160) ────────────────────────────────────
    // Finished = a Status cell that starts with ✅ (any detail after it), or reads ⏭️ Skipped. The
    // shapes below are all in the committed corpus of finished reports; an exact `✅ Done` match
    // would have refused most of them.
    test(`[${sh}] a report whose Status cells use every finished shape passes check 4`, async () => {
      let t = finished("Task");
      for (const [label, shape] of [
        ["1. create-branch", "✅"],
        ["2. review-task", "✅ Complete"],
        ["3. develop", "✅ Done (PASS 100/100)"],
        ["4. create-pr", "✅ Skipped (gate PASS)"],
        ["5–6. qa-task / qa-fix loop", "⏭️ Skipped"],
      ]) {
        t = setRow(t, label, shape);
      }
      const fx = await setup(t);
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
        assert.match(r.stdout, /✅ Step 8 post-conditions verified/);
      } finally {
        cleanup(fx.dir);
      }
    });

    // Every Status the deny-list did not name passed it. Each one here fails, and the message prints
    // the refused row — and only that row, so a check that refused every row would also go red.
    for (const state of [
      "❌ Failed",
      "⚠️ Needs Attention",
      "🔄 Cycle 3",
      "⏸️ Skipped",
      "",
    ]) {
      test(`[${sh}] a table row at "${state}" fails check 4, naming that row`, async () => {
        const t = setRow(finished("Task"), "8. commit-changes", state);
        const fx = await setup(t);
        try {
          const r = await runChecklist(sh, fx);
          assert.equal(r.status, 1, `stdout: ${r.stdout}`);
          assert.match(r.stdout, CHECK4_UNFINISHED);
          assert.ok(
            r.stdout.includes(rowOf(t, "8. commit-changes")),
            `the refused row is not printed: ${r.stdout}`,
          );
          assert.ok(
            !r.stdout.includes(rowOf(t, "7. finalise")),
            `a finished row was printed as unfinished: ${r.stdout}`,
          );
        } finally {
          cleanup(fx.dir);
        }
      });
    }

    // The Bug variant carries Status in the THIRD cell. Only a header lookup reads it there; a fixed
    // column index would read the Skill cell and refuse every row.
    test(`[${sh}] a bug-variant report with one unfinished row fails on that row only`, async () => {
      const t = setRow(finished("Bug"), "8 | commit-changes", "❌ Failed");
      const fx = await setup(t);
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1, `stdout: ${r.stdout}`);
        assert.match(r.stdout, CHECK4_UNFINISHED);
        assert.ok(r.stdout.includes(rowOf(t, "8 | commit-changes")), r.stdout);
        assert.ok(!r.stdout.includes(rowOf(t, "7 | finalise-close")), r.stdout);
      } finally {
        cleanup(fx.dir);
      }
    });

    // "Found nothing" and "had nothing to look at" must not produce the same pass.
    test(`[${sh}] a table with a header and no step rows fails check 4`, async () => {
      const fx = await setup(headerOnly(finished("Task")));
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1, `stdout: ${r.stdout}`);
        assert.match(r.stdout, CHECK4_UNFINISHED);
        assert.match(r.stdout, /no step rows under the header/);
      } finally {
        cleanup(fx.dir);
      }
    });

    // Without a Status column there is no cell to read. Under BSD awk an unguarded `$col` is a fatal
    // error, which an unchecked command substitution turns into a pass (task.160 review.1).
    test(`[${sh}] a table with no Status column fails check 4`, async () => {
      const fx = await setup(withoutStatusColumn(finished("Task")));
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1, `stdout: ${r.stdout}`);
        assert.match(r.stdout, CHECK4_UNFINISHED);
        assert.match(r.stdout, /no Status column in the header row/);
      } finally {
        cleanup(fx.dir);
      }
    });

    // ── Step 8 ordering (task 160, Phase 3) ────────────────────────────────────
    // The order the step document states: Step 8's own row is set ✅ Done, THEN the commit and push
    // run, and nothing edits the report afterwards. Checks 4 and 5 then hold together.
    test(`[${sh}] Step 8's row set ✅ before its own commit passes checks 4 and 5`, async () => {
      const pending = setRow(
        finished("Task"),
        "8. commit-changes",
        "⏳ Pending",
      );
      const fx = await setup(pending);
      try {
        write(fx.work, REPORT, finished("Task"));
        await gitAsync(fx.work, "add", "-A");
        await gitAsync(fx.work, "commit", "-q", "-m", "step 8");
        await gitAsync(fx.work, "push", "-q");
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
        assert.match(r.stdout, /✅ Step 8 post-conditions verified/);
      } finally {
        cleanup(fx.dir);
      }
    });

    // ── The record's real lifecycle (task.160 QA cycle 4, CR4-3; inverted by task 161) ──
    // /commit-changes' lock cooperation removes nothing, nested at step 5 or at the Step 8 commit.
    // Cleanup, cut from the step document and run under each shell, removes this run's halt
    // snapshot and leaves the lock: only the Completion Checklist's `--complete` ends the record.
    test(`[${sh}] the Step 8 commit and Cleanup leave the record; Cleanup removes this run's snapshot`, async () => {
      const fx = await setup(finished("Task"));
      try {
        writeStep8Lock(fx);
        const nested = JSON.parse(
          fs.readFileSync(path.join(fx.work, LOCK), "utf8"),
        );
        nested.current_step = 5;
        write(fx.work, LOCK, JSON.stringify(nested) + "\n");
        let r = run("bash", `bash "${LOCK_HELPER}" --skill commit-changes`, {
          cwd: fx.work,
        });
        assert.equal(
          fs.existsSync(path.join(fx.work, LOCK)),
          true,
          `nested commit removed the lock: ${r.stdout}${r.stderr}`,
        );
        writeStep8Lock(fx);
        r = run("bash", `bash "${LOCK_HELPER}" --skill commit-changes`, {
          cwd: fx.work,
        });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(
          String(
            JSON.parse(fs.readFileSync(path.join(fx.work, LOCK), "utf8"))
              .current_step,
          ),
          "8",
          `the Step 8 commit did not leave the lock at 8: ${r.stdout}${r.stderr}`,
        );
        write(
          fx.work,
          SNAPSHOT,
          JSON.stringify({
            task_or_story_directory: WORK_ITEM,
            halt_step: "5",
          }) + "\n",
        );
        const code = bind(
          blockBy(readDoc(STEP8), "halt snapshot for this run removed"),
          {
            "{work-item-dir}": WORK_ITEM,
          },
        );
        assert.doesNotMatch(
          code,
          /rm -f \.claude\/state\/develop-pipeline\.lock/,
        );
        const c = await runAsync(sh, code, { cwd: fx.work });
        assert.equal(c.status, 0, `cleanup: ${c.stdout}\n${c.stderr}`);
        assert.equal(
          fs.existsSync(path.join(fx.work, SNAPSHOT)),
          false,
          "this run's snapshot survived Cleanup",
        );
        assert.equal(
          fs.existsSync(path.join(fx.work, LOCK)),
          true,
          "Cleanup removed the lock — the record must outlive it",
        );
      } finally {
        cleanup(fx.dir);
      }
    });

    // ── Step 8 keeps its resume record until the checklist passes (task 161) ──
    // The checklist runs checks 2–5, then `--complete`, then check 1. A passing run ends the record
    // through `--complete`; a failing one exits first and the lock stays at 8.
    test(`[${sh}] a passing checklist removes the lock at step 8 through --complete`, async () => {
      const fx = await setup(finished("Task"));
      try {
        writeStep8Lock(fx);
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
        assert.match(r.stdout, /pipeline complete, lock removed/);
        assert.match(r.stdout, /✅ Step 8 post-conditions verified/);
        assert.equal(fs.existsSync(path.join(fx.work, LOCK)), false);
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] a failing checklist exits before --complete and the lock stays at 8`, async () => {
      const fx = await setup(
        setRow(finished("Task"), "8. commit-changes", "⏳ Pending"),
      );
      try {
        writeStep8Lock(fx);
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1, `stdout: ${r.stdout}`);
        assert.match(r.stdout, CHECK4_UNFINISHED);
        assert.doesNotMatch(r.stdout, /lock removed/);
        assert.equal(
          String(
            JSON.parse(fs.readFileSync(path.join(fx.work, LOCK), "utf8"))
              .current_step,
          ),
          "8",
          "a failed check removed the lock",
        );
      } finally {
        cleanup(fx.dir);
      }
    });

    // A HALT inside Step 8 commits the report through /commit-changes and then runs the HALT
    // rule's snapshot block, cut verbatim from develop-task. The lock is still there at 8, so the
    // snapshot records halt_step 8 — and --restore rebuilds a lock at 8 from it.
    test(`[${sh}] a Step 8 HALT after /commit-changes snapshots halt_step 8, and --restore reads 8`, async () => {
      const fx = await setup(finished("Task"));
      try {
        writeStep8Lock(fx);
        let r = run("bash", `bash "${LOCK_HELPER}" --skill commit-changes`, {
          cwd: fx.work,
        });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        const halt = bind(
          blockBy(
            readDoc("skills/develop-task/SKILL.md"),
            'jq --arg reason "{halt_reason}"',
          ),
          { "{halt_reason}": "checklist refused", "{halt_step}": "8" },
        );
        const h = await runAsync(sh, halt, { cwd: fx.work });
        assert.equal(h.status, 0, `halt: ${h.stdout}\n${h.stderr}`);
        assert.equal(fs.existsSync(path.join(fx.work, LOCK)), false);
        const snap = JSON.parse(
          fs.readFileSync(path.join(fx.work, SNAPSHOT), "utf8"),
        );
        assert.equal(String(snap.halt_step), "8");
        assert.equal(String(snap.current_step), "8");
        r = run("bash", `bash "${LOCK_HELPER}" --restore "${WORK_ITEM}"`, {
          cwd: fx.work,
        });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(
          String(
            JSON.parse(fs.readFileSync(path.join(fx.work, LOCK), "utf8"))
              .current_step,
          ),
          "8",
        );
      } finally {
        cleanup(fx.dir);
      }
    });

    // ── check 5 — dirt is judged against the work item ─────────────────────────

    test(`[${sh}] another session's dirt outside the work item passes, named as a warning`, async () => {
      const fx = await setup(finished("Task"));
      try {
        fs.writeFileSync(
          path.join(fx.work, "package.json"),
          '{"edited":true}\n',
        );
        write(fx.work, "other/new.txt", "someone else\n");
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 0, `stdout: ${r.stdout}`);
        assert.match(r.stdout, /! outside scope \(warning\): package\.json/);
        assert.match(r.stdout, /! outside scope \(warning\): other\/new\.txt/);
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] a general bug's uncommitted registry close fails check 5 once named as an extra scope`, async () => {
      const fx = await setup(finished("Bug"));
      try {
        write(fx.work, GENERAL_BUG_EXTRA, "| 1 | a bug | closed |\n");
        await gitAsync(fx.work, "add", "-A");
        await gitAsync(fx.work, "commit", "-q", "-m", "registry row");
        await gitAsync(fx.work, "push", "-q");
        // Step 7 B3 edits the row; nothing has committed it yet.
        write(fx.work, GENERAL_BUG_EXTRA, "| 1 | a bug | ✅ Closed |\n");
        const named = await runChecklist(sh, fx, `"${GENERAL_BUG_EXTRA}"`);
        assert.equal(named.status, 1, `stdout: ${named.stdout}`);
        assert.match(named.stdout, /DIRTY within scope/);
        // Without the extra scope the same edit reads as another session's dirt, and the step
        // passes. That is the regression the extra scope closes.
        const unnamed = await runChecklist(sh, fx);
        assert.equal(unnamed.status, 0);
        assert.match(
          unnamed.stdout,
          /! outside scope \(warning\): docs\/bugs\/bug-registry\.md/,
        );
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] a new file Step 4 held and restored, still uncommitted, fails check 5 by name`, async () => {
      const fx = await setup(finished("Task"));
      try {
        // Step 4 as an agent runs it: derivation, guard, restore — three blocks, three shells.
        const s4 = readDoc(STEP4);
        const p4 = { "{work-item-dir}": WORK_ITEM, "{Q2_answer}": "develop" };
        write(fx.work, "newdir/own.test.mjs", "the run's own new test\n");
        for (const anchor of [
          "Scope-derivation",
          "Every path this guard holds is recorded",
          'cp -r "$HOLD_DIR"/. .',
        ]) {
          const r = await runAsync(sh, bind(blockBy(s4, anchor), p4), {
            cwd: fx.work,
          });
          assert.equal(
            r.status,
            0,
            `Step 4 block (${anchor}) failed: ${r.stdout}${r.stderr}`,
          );
        }
        assert.ok(
          fs.existsSync(path.join(fx.work, "newdir/own.test.mjs")),
          "fixture: the file was not restored",
        );
        const r = await runChecklist(sh, fx);
        assert.equal(
          r.status,
          1,
          `a held own file that is not on the remote passed check 5: ${r.stdout}`,
        );
        assert.match(r.stdout, /newdir\/own\.test\.mjs/);
        assert.doesNotMatch(r.stdout, /! outside scope \(warning\): newdir/);
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] held files that were never restored fail Step 8, and their pointer survives`, async () => {
      const fx = await setup(finished("Task"));
      try {
        const s4 = readDoc(STEP4);
        const p4 = { "{work-item-dir}": WORK_ITEM, "{Q2_answer}": "develop" };
        write(fx.work, "stray/notes.txt", "held and forgotten\n");
        for (const anchor of [
          "Scope-derivation",
          "Every path this guard holds is recorded",
        ]) {
          const r = await runAsync(sh, bind(blockBy(s4, anchor), p4), {
            cwd: fx.work,
          });
          assert.equal(r.status, 0, r.stdout + r.stderr);
        }
        // Restore is skipped.
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1, r.stdout);
        assert.match(r.stdout, /never restored/);
        assert.ok(
          fs.existsSync(path.join(fx.work, ".claude/state/step4-hold-dir.txt")),
          "the pointer to the held files was deleted",
        );
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] a held record for another work item is named, not applied silently`, async () => {
      const fx = await setup(finished("Task"));
      try {
        write(
          fx.work,
          ".claude/state/step4-held-paths.txt",
          "docs/tasks/task.1.other\nstray/\n",
        );
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 0, r.stdout);
        assert.match(
          r.stdout,
          /names docs\/tasks\/task\.1\.other, not docs\/tasks\/task\.9\.fx — its held paths are not checked/,
        );
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] a passing checklist removes Step 4's records`, async () => {
      const fx = await setup(finished("Task"));
      try {
        write(fx.work, ".claude/state/step4-scope-paths.txt", `${WORK_ITEM}\n`);
        write(fx.work, ".claude/state/step4-held-paths.txt", `${WORK_ITEM}\n`);
        // An empty hold dir: Restore ran; the record must still be removed.
        fs.mkdirSync(path.join(fx.dir, "hold-empty"));
        write(
          fx.work,
          ".claude/state/step4-hold-dir.txt",
          `${path.join(fx.dir, "hold-empty")}\n`,
        );
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 0, r.stdout);
        for (const rec of [
          "step4-scope-paths.txt",
          "step4-held-paths.txt",
          "step4-hold-dir.txt",
        ]) {
          assert.equal(
            fs.existsSync(path.join(fx.work, ".claude/state", rec)),
            false,
            `${rec} survived a passing Step 8`,
          );
        }
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] this run's own uncommitted edit inside the work item fails check 5`, async () => {
      const fx = await setup(finished("Task"));
      try {
        fs.appendFileSync(path.join(fx.work, REPORT), "late edit\n");
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1);
        assert.match(r.stdout, /verify-push-state failed/);
      } finally {
        cleanup(fx.dir);
      }
    });
  }
});
