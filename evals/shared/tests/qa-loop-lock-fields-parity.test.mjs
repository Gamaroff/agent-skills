// ---------------------------------------------------------------------------
// qa-loop-lock-fields-parity.test.mjs — one name per lock field, in every file
// that reads or writes it (task.123).
// ---------------------------------------------------------------------------
// Two fields joined the pipeline lock with task.123:
//
//   qa_phase              5a|5b|5c — the QA loop's sub-position while
//                         current_step stays 5. WRITTEN by the step-5-6 doc
//                         (set_qa_phase), READ by the Stop hook.
//   extra_cycles_granted  integer — cycles granted at a re-entry after a
//                         loop-limit halt. WRITTEN by both develop-* SKILL.md
//                         (Phase 0b), READ by the step-5-6 doc (QA_MAX_CYCLES),
//                         the resume contract and the detector prompt.
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
  lockHelper: "shared/resources/advance-pipeline-lock.sh",
  detectorPrompt: "shared/resources/pipeline-resume-detector-prompt.md",
  hooksDoc: "shared/resources/develop-pipeline-hooks.md",
};
const text = Object.fromEntries(
  Object.entries(FILES).map(([k, p]) => [k, read(p)]),
);

// The near-miss spellings a drifted file would most plausibly carry. Each is
// forbidden everywhere; a file that uses one has stopped talking to the others.
const MISSPELLINGS = [
  /\bqaPhase\b/,
  /\bqa-phase\b(?!\.XXXXXX)/, // the mktemp template `.qa-phase.XXXXXX` is a filename, not a field
  /\bqa_sub_step\b/,
  /\bextraCyclesGranted\b/,
  /\bextra-cycles-granted\b/,
  /\bcycles_granted\b(?<!extra_cycles_granted)/,
  /\bextra_cycles\b(?!_granted)/,
  /\bcycles_outside_loop:/, // a snapshot FIELD — the value is derived, never stored
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
    "taskSkill",
    "storySkill",
    "hooksDoc",
    "resumeContract",
    "detectorPrompt",
  ]) {
    assert.match(text[name], /\bqa_phase\b/, `${name} must name qa_phase`);
  }
  // extra_cycles_granted: the two writers + the three readers.
  for (const name of [
    "taskSkill",
    "storySkill",
    "loopDoc",
    "resumeContract",
    "detectorPrompt",
    "hooksDoc",
  ]) {
    assert.match(
      text[name],
      /\bextra_cycles_granted\b/,
      `${name} must name extra_cycles_granted`,
    );
  }
});

test("qa_phase has exactly the three values, and the writer and the reader agree on them", () => {
  // The doc's writer validates the value set; the hook's case arms consume it.
  assert.match(
    text.loopDoc,
    /case "\$1" in 5a\|5b\|5c\)/,
    "set_qa_phase must validate against 5a|5b|5c",
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
  assert.match(
    text.loopDoc,
    /jq --arg p "\$1" '\.qa_phase = \$p'/,
    "set_qa_phase must write qa_phase through jq",
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

test("QA_MAX_CYCLES is 5 + extra_cycles_granted in every file that states the budget", () => {
  for (const name of ["loopDoc", "resumeContract", "taskSkill", "storySkill"]) {
    assert.match(
      text[name],
      /QA_MAX_CYCLES\*{0,2} = 5 \+ extra_cycles_granted|5 \+ extra_cycles_granted/,
      `${name} must state the budget as 5 + extra_cycles_granted`,
    );
  }
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
    /Do not reuse `MAX_ITER`/,
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
