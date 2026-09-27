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

// {extra-scope-paths} is the caller's documented list of writes outside its work item (the table in
// the step document): empty for develop-story and develop-task, and the bug registry for a
// develop-bug general bug (task.147 QA-1, CR-2).
const GENERAL_BUG_EXTRA = "docs/bugs/bug-registry.md";

function checklist(extra = "") {
  const code = blockBy(readDoc(STEP8), "✅ Step 8 post-conditions verified");
  return bind(code, {
    ".agents/skills/{develop-story|develop-task|develop-bug}/references/verify-push-state.sh":
      VERIFY,
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
