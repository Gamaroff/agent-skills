// ---------------------------------------------------------------------------
// qa-loop-lock-fields-parity.test.mjs — one name per lock field, in every file
// that reads or writes it (task.123).
// ---------------------------------------------------------------------------
// Two fields joined the pipeline lock with task.123:
//
//   qa_phase              5a|5b|5c — the QA loop's sub-position while
//                         current_step stays 5. WRITTEN by the step-5-6 doc
//                         (set-qa-phase.sh), READ by the Stop hook.
//   extra_cycles_granted  integer — cycles granted at a re-entry after a
//                         loop-limit halt. WRITTEN by both develop-* SKILL.md
//                         (Phase 0b), READ by the step-5-6 doc (QA_MAX_CYCLES),
//                         the resume contract and the detector prompt.
//
// A third joined with task.124:
//
//   waiting_on            {kind, label, since, budget_minutes} — the step is
//                         waiting on a background agent or task it dispatched.
//                         WRITTEN by set-waiting-on.sh (the one writer), READ by
//                         the Stop hook, DESCRIBED by the hooks doc and the pause
//                         reference's lock schema.
//
// A field with two spellings is a field with no reader: the writer writes
// `qa_phase`, the hook reads `qaPhase`, and the default arm fires on every
// stop — silently, because an absent field IS a legal state. This test pins
// the spelling in every file that participates, and pins the two facts the
// spelling exists to serve: the helper stays monotonic (a backward move would
// make qa_phase unnecessary and the lock ambiguous), and the step-5-6 doc
// never advances the lock to 6 or hand-edits current_step.
//
// It reads prose. That is the point: the contract lives in prose, and the
// behavioural pins for each half live in the shell suites
// (develop-pipeline-on-stop.test.sh, advance-pipeline-lock.test.sh) and the
// engine's fixture table (qa-loop-route.test.mjs). This file only checks that
// the halves agree on the words.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const FILES = {
  loopDoc: "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
  resumeContract: "shared/resources/develop-pipeline-resume-contract.md",
  taskSkill: "skills/develop-task/SKILL.md",
  storySkill: "skills/develop-story/SKILL.md",
  stopHook: "shared/resources/develop-pipeline-on-stop.sh",
  setQaPhase: "shared/resources/set-qa-phase.sh",
  lockHelper: "shared/resources/advance-pipeline-lock.sh",
  detectorPrompt: "shared/resources/pipeline-resume-detector-prompt.md",
  hooksDoc: "shared/resources/develop-pipeline-hooks.md",
  grantScript: "shared/resources/grant-qa-cycles.sh",
  changelog: "CHANGELOG.md",
  setWaitingOn: "shared/resources/set-waiting-on.sh",
  pauseDoc: "shared/resources/develop-pipeline-pause.md",
};
const text = Object.fromEntries(
  Object.entries(FILES).map(([k, p]) => [k, read(p)]),
);

// The near-miss spellings a drifted file would most plausibly carry. Each is
// forbidden everywhere; a file that uses one has stopped talking to the others.
const MISSPELLINGS = [
  /\bqaPhase\b/,
  /(?<!set-)\bqa-phase\b(?!\.XXXXXX)/, // `set-qa-phase.sh` is the writer's filename, not a field
  /\bqa_sub_step\b/,
  /\bextraCyclesGranted\b/,
  /\bextra-cycles-granted\b/,
  /\bcycles_granted\b(?<!extra_cycles_granted)/,
  /\bextra_cycles\b(?!_granted)/,
  /\bcycles_outside_loop:/, // a snapshot FIELD — the value is derived, never stored
  /\bqaMaxCycles\b/,
  /\bqa-max-cycles\b/,
  /\bmax_qa_cycles\b/,
  // CR-1 (QA cycle 1): the budget was "5 + extra_cycles_granted", which counts every gate written
  // since the original budget against the grant. It is an absolute qa_max_cycles now.
  /5 \+ extra_cycles_granted/,
  /QA_MAX_CYCLES = 5 \+ k\b/, // C2-CR-5: the CHANGELOG spelling of the same rule
  // task.124: the waiting_on field and its four sub-fields
  /\bwaitingOn\b/,
  /(?<!set-)\bwaiting-on\b(?!\.XXXXXX|\.test\.sh|\.sh)/, // `set-waiting-on.sh` is the writer's filename
  /\bwaiting_for\b/,
  /\bbudgetMinutes\b/,
  /\bbudget-minutes\b/,
  /\bwall_clock_minutes\b/,
];

test("every participant spells `qa_phase` and `extra_cycles_granted` the same way", () => {
  for (const [name, body] of Object.entries(text)) {
    for (const re of MISSPELLINGS) {
      assert.doesNotMatch(body, re, `${name} (${FILES[name]}) carries ${re}`);
    }
  }
  // qa_phase: writer + reader + the two documents that describe it.
  for (const name of [
    "loopDoc",
    "stopHook",
    "setQaPhase",
    "taskSkill",
    "storySkill",
    "hooksDoc",
    "resumeContract",
    "detectorPrompt",
  ]) {
    assert.match(text[name], /\bqa_phase\b/, `${name} must name qa_phase`);
  }
  // extra_cycles_granted: the writer script, its two call sites, the readers, and the CHANGELOG.
  for (const name of [
    "grantScript",
    "taskSkill",
    "storySkill",
    "loopDoc",
    "resumeContract",
    "detectorPrompt",
    "hooksDoc",
    "changelog",
  ]) {
    assert.match(
      text[name],
      /\bextra_cycles_granted\b/,
      `${name} must name extra_cycles_granted`,
    );
  }
});

test("waiting_on: one writer, one reader, and every describer spells the field and its sub-fields the same way", () => {
  for (const name of ["setWaitingOn", "stopHook", "hooksDoc", "pauseDoc"]) {
    assert.match(text[name], /\bwaiting_on\b/, `${name} must name waiting_on`);
  }
  // The writer writes exactly the four sub-fields, through jq, and never touches
  // current_step or qa_phase (code lines only — the header says it does not).
  assert.match(
    text.setWaitingOn,
    /'\.waiting_on = \{kind: \$kind, label: \$label, since: \$since, budget_minutes: \$budget\}'/,
    "set-waiting-on.sh must write {kind, label, since, budget_minutes} through jq",
  );
  assert.match(
    text.setWaitingOn,
    /jq 'del\(\.waiting_on\)'/,
    "set-waiting-on.sh --clear must delete the field through jq",
  );
  const code = text.setWaitingOn
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  assert.doesNotMatch(
    code,
    /current_step|qa_phase/,
    "set-waiting-on.sh writes one field and never touches current_step or qa_phase",
  );
  // The reader reads the same four names and compares since + budget_minutes against now.
  assert.match(
    text.stopHook,
    /\$w\.since \| fromdateiso8601\) \+ \(\$w\.budget_minutes \* 60\)\) > now/,
    "the Stop hook must compare since + budget_minutes*60 against now",
  );
  assert.doesNotMatch(
    text.stopHook,
    /read_nested_config_key|wallClockMinutes/,
    "the Stop hook never reads the config — the writer stored the budget",
  );
  // The describers agree on the shape.
  assert.match(
    text.pauseDoc,
    /"waiting_on": \{ "kind": "agent", "label": "[^"]+", "since": "[^"]+", "budget_minutes": \d+ \}/,
    "the pause reference's lock schema must show the four sub-fields",
  );
  assert.match(
    text.hooksDoc,
    /set-waiting-on\.sh "<label>" \[--kind agent\|task\]/,
    "the hooks doc must show the writer's set form",
  );
  assert.match(
    text.hooksDoc,
    /set-waiting-on\.sh --clear/,
    "the hooks doc must show the writer's --clear form",
  );
  // Every dispatch site marks the wait — enumerated by the same grep the task names, over the
  // canonical sources, and each match must have a set-waiting-on call within its section.
  const DISPATCH =
    /subagent_type=|dispatch an Explore subagent|run_in_background|gh pr checks --watch/;
  const sources = {
    step3: read("shared/resources/develop-pipeline-step-3-develop-loop.md"),
    loopDoc: text.loopDoc,
    resumeContract: text.resumeContract,
    reviewPr: read("skills/review-pr/SKILL.md"),
    finalise: read("skills/finalise/SKILL.md"),
  };
  let sites = 0;
  for (const [name, body] of Object.entries(sources)) {
    const lines = body.split(/\r?\n/);
    lines.forEach((l, i) => {
      if (!DISPATCH.test(l)) return;
      if (
        /^\s*#|^\s*>|failure, observed three times|forbidden for the same reason/.test(
          l,
        )
      )
        return; // commentary about a dispatch, not one
      sites += 1;
      const window = lines.slice(Math.max(0, i - 12), i + 12).join("\n");
      assert.match(
        window,
        /set-waiting-on\.sh/,
        `${name}:${i + 1} dispatches without marking the wait: ${l.trim().slice(0, 80)}`,
      );
    });
  }
  assert.ok(
    sites >= 8,
    `expected ≥8 dispatch sites across the sources, found ${sites} — the grep drifted`,
  );
});

test("qa_phase has exactly the three values, and the writer and the reader agree on them", () => {
  // The script writer validates the value set; the hook's case arms consume it.
  assert.match(
    text.setQaPhase,
    /^\s+5a\|5b\|5c\) ;;/m,
    "set-qa-phase.sh must validate against 5a|5b|5c",
  );
  assert.match(
    text.setQaPhase,
    /jq --arg p "\$PHASE" '\.qa_phase = \$p'/,
    "set-qa-phase.sh must write qa_phase through jq",
  );
  // Code lines only — the header comment SAYS it never touches current_step.
  const setQaPhaseCode = text.setQaPhase
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  assert.doesNotMatch(
    setQaPhaseCode,
    /current_step/,
    "set-qa-phase.sh writes one field and never touches current_step",
  );
  // CR-2 (QA cycle 1): the writer must be a SCRIPT every call site reaches from the repository
  // root — a function defined in one fenced block does not exist in the block that calls it.
  assert.doesNotMatch(
    text.loopDoc,
    /\bset_qa_phase\b/,
    "the step doc must not define or call a set_qa_phase shell function",
  );
  assert.doesNotMatch(
    text.resumeContract,
    /\bset_qa_phase\b/,
    "the resume contract must call the script, not a bare function",
  );
  const CALL =
    /bash \.agents\/skills\/\{develop-story\|develop-task\}\/references\/set-qa-phase\.sh 5[abc]/g;
  // Four call sites, each located by the section it belongs to — not a bare count, which
  // could be satisfied by four calls in one section.
  const section = (from, to) => {
    const i = text.loopDoc.indexOf(from);
    const j = text.loopDoc.indexOf(to, i + 1);
    assert.ok(i > -1 && j > i, `sections ${from} … ${to} must exist in order`);
    return text.loopDoc.slice(i, j);
  };
  const SITES = [
    ["### 5a. Run QA Review", "### Change Log (shared", "5a"],
    [
      "### 5b. Run QA Fix (shared)",
      "#### Signal the `changes-requested` stage",
      "5b",
    ],
    [
      "### 5c. PR Conformance Review (shared)",
      "#### Assert the trail is on the branch",
      "5c",
    ],
    ["### Gate-the-last-fix half-cycle (shared)", "**On `continue`:**", "5a"],
  ];
  for (const [from, to, ph] of SITES) {
    const calls = section(from, to).match(CALL) || [];
    assert.ok(
      calls.some((c) => c.endsWith(ph)),
      `the section starting ${from} must invoke set-qa-phase.sh ${ph} (found: ${calls.join(", ") || "none"})`,
    );
  }
  assert.match(
    text.resumeContract,
    /set-qa-phase\.sh 5a/,
    "the re-entry step must write 5a through the script",
  );
  assert.match(
    text.stopHook,
    /QA_PHASE=\$\(jq -r '\.qa_phase \/\/ ""' "\$LOCK"/,
    "the Stop hook must read .qa_phase from the lock",
  );
  assert.match(text.stopHook, /^\s+5b\)/m, "the Stop hook must have a 5b arm");
  assert.match(text.stopHook, /^\s+5c\)/m, "the Stop hook must have a 5c arm");
  assert.match(
    text.stopHook,
    /^\s+\*\)\s+NEXT_NAME="QA REVIEW \(qa_phase 5a\)"/m,
    "an absent or unknown qa_phase must fall to the 5a arm — the loud, re-entrant default",
  );
});

test("the helper stays monotonic and the loop never advances the lock to 6", () => {
  // The monotonic guard is the reason qa_phase exists; if it goes, the field is
  // decoration and the lock has two meanings.
  assert.match(
    text.lockHelper,
    /if \[ "\$NEXT" -le "\$CURRENT" \] 2>\/dev\/null; then\n\s+exit 0/,
    "advance-pipeline-lock.sh must refuse a backward or equal move",
  );
  assert.doesNotMatch(
    text.lockHelper,
    /qa_phase/,
    "the helper gains nothing for qa_phase — it must not read or write it",
  );
  // The step doc writes qa_phase and never touches current_step.
  // An INVOCATION (`bash …/advance-pipeline-lock.sh 6`), not the sentence that forbids one.
  assert.doesNotMatch(
    text.loopDoc,
    /bash [^\n]*advance-pipeline-lock\.sh 6\b/,
    "the step-5-6 doc must never advance the lock to 6",
  );
  assert.doesNotMatch(
    text.loopDoc,
    /jq[^\n]*\.current_step\s*=/,
    "the step-5-6 doc must never hand-edit current_step",
  );
  for (const name of ["taskSkill", "storySkill"]) {
    assert.match(
      text[name],
      /`advance-pipeline-lock\.sh 6` is \*\*never\*\* issued/,
      `${name} must state that the lock is never advanced to 6`,
    );
    assert.match(
      text[name],
      /`5 → 7`/,
      `${name} must state the 5 → 7 exit advance`,
    );
  }
});

test("QA_MAX_CYCLES is the lock's qa_max_cycles — reconstructed count plus the grant — in every file that states the budget", () => {
  for (const name of ["loopDoc", "resumeContract", "taskSkill", "storySkill"]) {
    assert.match(
      text[name],
      /\bqa_max_cycles\b/,
      `${name} must name qa_max_cycles`,
    );
  }
  // ONE writer — the script — writes both fields in one jq, from the count it reconstructs
  // itself (C2-CR-2: a `$QA_CYCLE` bound in another fenced block is empty in this one), after
  // restoring the lock from the halt snapshot when the HALT removed it (C2-CR-1).
  assert.match(
    text.grantScript,
    /'\.extra_cycles_granted = \$k \| \.qa_max_cycles = \(\$c \+ \$k\) \| \.qa_phase = "5a"'/,
    "grant-qa-cycles.sh must write qa_max_cycles as the reconstructed count plus the grant, and qa_phase 5a, in one write (C3-CR-3)",
  );
  // task.124: the restore moved into advance-pipeline-lock.sh --restore, the ONE restore path.
  // The field stripping lives there; the grant script must call it and must not carry its own.
  assert.match(
    text.lockHelper,
    /del\(\.halted_at, \.halt_reason, \.halt_step, \.paused_at, \.pause_reason\)/,
    "advance-pipeline-lock.sh --restore must rebuild the lock from the snapshot minus the halt-only fields",
  );
  assert.match(
    text.grantScript,
    /"\$ADVANCE" --restore "\$DOC_DIR"/,
    "grant-qa-cycles.sh must restore through advance-pipeline-lock.sh --restore",
  );
  assert.doesNotMatch(
    text.grantScript
      .split(/\r?\n/)
      .filter((l) => !/^\s*#/.test(l))
      .join("\n"),
    /del\(\.halted_at/,
    "grant-qa-cycles.sh must not carry a second restore (one restore path, task.124)",
  );
  // Every call site is the script, and none inlines the jq or reads $QA_CYCLE across fences.
  for (const name of ["resumeContract", "taskSkill", "storySkill"]) {
    assert.match(
      text[name],
      /references\/grant-qa-cycles\.sh \{[a-z-]+\} \{k\} \{implementation-report-path\}/,
      `${name} must record the grant through grant-qa-cycles.sh`,
    );
    assert.doesNotMatch(
      text[name],
      /\.qa_max_cycles = \(/,
      `${name} must not inline the grant's jq — the script is the one writer`,
    );
    assert.doesNotMatch(
      text[name],
      /--argjson c "\$QA_CYCLE"/,
      `${name} must not read \$QA_CYCLE across fenced blocks`,
    );
  }
  // The reader reads the lock, defaulting to 5.
  assert.match(
    text.loopDoc,
    /jq -r '\.qa_max_cycles \/\/ 5'/,
    "Loop Setup must read qa_max_cycles from the lock with a default of 5",
  );
  // And nobody reuses the Step 3 bound for it.
  for (const name of ["loopDoc", "taskSkill", "storySkill"]) {
    assert.doesNotMatch(
      text[name],
      /MAX_ITER\s*=\s*5\s*\+/,
      `${name} must not extend MAX_ITER — that is the Step 3 develop-loop bound`,
    );
  }
  assert.match(
    text.resumeContract,
    /Do not\s+reuse `MAX_ITER`/,
    "the resume contract must say MAX_ITER is not the QA budget",
  );
});

test("the re-entry rule derives cycles-outside-the-loop from disk and never stores it", () => {
  assert.match(
    text.resumeContract,
    /### Re-entry after a QA loop escalation/,
    "the resume contract must carry the re-entry subsection",
  );
  assert.match(
    text.resumeContract,
    /gate\.\*\.yml/,
    "the reconstruction must read gates on disk",
  );
  assert.match(
    text.resumeContract,
    /CYCLES_OUTSIDE_LOOP=\$\(\(QA_CYCLE - COMPLETED\)\)/,
    "cycles outside the loop must be derived as highest gate minus report entries",
  );
  assert.match(
    text.resumeContract,
    /derived here and never stored/,
    "the contract must say the derived count is never a snapshot field",
  );
  assert.match(
    text.resumeContract,
    /Origin\*\*: run outside the\s+loop \(operator\)/,
    "a back-filled entry must be marked as run outside the loop",
  );
  // The Phase 0b prompt lives in the SKILL.md files, not the step doc.
  for (const name of ["taskSkill", "storySkill"]) {
    assert.match(
      text[name],
      /Resume at 5a with \{k\} more cycles/,
      `${name} must offer the grant in Phase 0b`,
    );
  }
  assert.doesNotMatch(
    text.loopDoc,
    /AskUserQuestion/,
    "the step-5-6 doc must not carry the Phase 0b prompt — that is the orchestrator's",
  );
  // The HALT messages name the fourth option.
  assert.match(
    text.loopDoc,
    /4\. Re-run \/develop-story to resume with more cycles/,
  );
  assert.match(
    text.loopDoc,
    /4\. Re-run \/develop-task to resume with more cycles/,
  );
});
