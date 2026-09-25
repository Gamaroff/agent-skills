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
  git,
  gitAsync,
  ghStub,
  runAsync,
  cleanup,
} from "./lib/executed-prose.mjs";

const require = createRequire(import.meta.url);
const { fencedRanges } = require("../change-log.js");

const STEP8 = "shared/resources/develop-pipeline-step-8-commit.md";
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
function setup(reportText) {
  const fx = fixtureRepo();
  write(fx.work, REPORT, reportText);
  git(fx.work, "add", "-A");
  git(fx.work, "commit", "-q", "-m", "report");
  git(fx.work, "push", "-q");
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

// ── check 3 — every template variant, finished, passes ────────────────────────

describe("executed against fixtures", { concurrency: true }, () => {
  for (const sh of SHELLS) {
    for (const variant of ["Task", "Story", "Bug"]) {
      test(`[${sh}] a finished ${variant.toLowerCase()}-variant report built from the template passes`, async () => {
        const fx = setup(finished(variant));
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
      const fx = setup(must(variantBody("Task"), "⏳ Pending", "✅ Done"));
      try {
        const r = await runChecklist(sh, fx);
        assert.equal(r.status, 1);
        assert.match(r.stdout, /Final Status not set to Completed\/Accepted/);
      } finally {
        cleanup(fx.dir);
      }
    });

    test(`[${sh}] a report still In Progress fails check 3`, async () => {
      const fx = setup(
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
      const fx = setup(
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

    // ── check 5 — dirt is judged against the work item ─────────────────────────

    test(`[${sh}] another session's dirt outside the work item passes, named as a warning`, async () => {
      const fx = setup(finished("Task"));
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
      const fx = setup(finished("Bug"));
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

    test(`[${sh}] this run's own uncommitted edit inside the work item fails check 5`, async () => {
      const fx = setup(finished("Task"));
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
