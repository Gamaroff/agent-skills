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
// A fourth joined with task.170, and task.182 carried it to every reader:
//
//   qa_reentry            {from_step, reason, at, gate_head, report_entries} —
//                         why a lock sits at step 5 after a Step 7 halt.
//                         WRITTEN by reenter-qa-after-finalise.sh (the one
//                         writer, which also writes qa_max_cycles and qa_phase),
//                         READ by the resume contract and the detector prompt,
//                         DESCRIBED by the pause reference, the hooks doc and
//                         both develop-* SKILL.md.
//
// A fifth joined with task.239:
//
//   convergence_from_cycle  integer — the first cycle the Convergence check
//                         counts. WRITTEN by grant-qa-cycles.sh (the one writer,
//                         in the same write as qa_max_cycles and qa_phase), READ
//                         by the step-5-6 doc's Convergence check, DESCRIBED by
//                         the pause reference, the resume contract and both
//                         develop-* SKILL.md.
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
import fs, { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractBlocks } from "../../../shared/resources/qa-execute-snippets.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const blocksOf = (p) => extractBlocks(read(p));

// The SET form with a quoted label — a mention of the script (`--clear`, a citation) is not a mark.
const WAIT_SET = /set-waiting-on\.sh "[^"]+"/;

/**
 * Is the dispatch on line `i` (0-based) marked? Two ways, either enough (task 231, obs #62):
 *   - the SET form within 12 lines either side (the proximity window), or
 *   - the first bash block that opens within the 12 lines AFTER the dispatch carries it, however
 *     deep inside the block — a block that marks and clears its own wait (task.189's design).
 * A mark in a block that opened before the dispatch does not count beyond the window. `blocks` is
 * the repository's one fence reader's answer (qa-execute-snippets.mjs extractBlocks, 1-based
 * `line` of the opening fence), not a second fence parser.
 */
function isWaitMarked(lines, i, blocks) {
  if (WAIT_SET.test(lines.slice(Math.max(0, i - 12), i + 12).join("\n")))
    return true;
  const next = blocks.find((b) => b.line - 1 > i && b.line - 1 <= i + 12);
  return next ? WAIT_SET.test(next.code) : false;
}

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
  troubleshooting: "docs/reference/troubleshooting.md",
  setWaitingOn: "shared/resources/set-waiting-on.sh",
  pauseDoc: "shared/resources/develop-pipeline-pause.md",
  taskReadme: "skills/develop-task/README.md",
  storyReadme: "skills/develop-story/README.md",
  reenterScript: "shared/resources/reenter-qa-after-finalise.sh",
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
  /(?<!-)\bbudget-minutes\b/, // `--budget-minutes` is the writer's flag, not a field spelling
  /\bwall_clock_minutes\b/,
  // task.182: the qa_reentry field
  /\bqaReentry\b/,
  /\bqa_re_entry\b/,
  // task.239: the convergence_from_cycle field
  /\bconvergenceFromCycle\b/,
  /\bconvergence-from-cycle\b/,
  /\bconvergence_from\b(?!_cycle)/,
  /\bconvergence_start(_cycle)?\b/,
];

test("convergence_from_cycle: the writer, the reader and every describer name it (task.239)", () => {
  const participants = [
    "grantScript",
    "loopDoc",
    "pauseDoc",
    "resumeContract",
    "taskSkill",
    "storySkill",
    "hooksDoc",
    "detectorPrompt",
    "taskReadme",
    "storyReadme",
  ];
  for (const name of participants) {
    assert.ok(
      text[name] && text[name].length > 0,
      `non-vacuity: ${name} (${FILES[name]}) was not read`,
    );
    assert.match(
      text[name],
      /\bconvergence_from_cycle\b/,
      `${name} (${FILES[name]}) must name convergence_from_cycle`,
    );
  }
  // A README that lists the grant's write set lists all of it: a file-level match is satisfied by
  // one line while another still names only the old fields (QA2-CR-6).
  // Every describer that names the script beside its write set, with how many such lines it has
  // (QA4-CR-1: troubleshooting.md listed three of the four and no check read it).
  for (const [name, minLines] of [
    ["taskReadme", 2],
    ["storyReadme", 2],
    ["troubleshooting", 1],
  ]) {
    const writeSet = text[name]
      .split("\n")
      .filter(
        (l) => /grant-qa-cycles\.sh/.test(l) && /extra_cycles_granted/.test(l),
      );
    assert.ok(
      writeSet.length >= minLines,
      `non-vacuity: ${name} lists the grant write set ${writeSet.length} time(s)`,
    );
    // Every field the grant writes, not only the new one (QA3-CR-3).
    for (const line of writeSet) {
      for (const field of [
        "extra_cycles_granted",
        "qa_max_cycles",
        "convergence_from_cycle",
        "qa_phase",
      ]) {
        assert.match(
          line,
          new RegExp(`\\b${field}\\b`),
          `${name}: write-set line omits ${field}: ${line.trim()}`,
        );
      }
    }
  }
  // The writer sets it in the SAME jq write as the budget, never in a second call.
  assert.match(
    text.grantScript,
    /\.qa_max_cycles = \(\$c \+ \$k\) \| \.qa_phase = \$p\s*\|\s*\.convergence_from_cycle = \(\$c \+ 1\)/,
    "grant-qa-cycles.sh must write convergence_from_cycle in the same jq write as qa_max_cycles",
  );
  // The reader defaults an absent field to 1, so a lock from before task.239 behaves as before.
  assert.match(
    text.loopDoc,
    /convergence_from_cycle \/\/ 1/,
    "the Convergence check must read the field with an absent → 1 default",
  );
});

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

test("qa_reentry: the writer and every reader and describer name it (task.182)", () => {
  const participants = [
    "reenterScript",
    "resumeContract",
    "detectorPrompt",
    "pauseDoc",
    "hooksDoc",
    "taskSkill",
    "storySkill",
  ];
  assert.ok(
    participants.length > 0,
    "non-vacuity: the qa_reentry participant list is empty",
  );
  for (const name of participants) {
    assert.match(
      text[name],
      /\bqa_reentry\b/,
      `${name} (${FILES[name]}) must name qa_reentry`,
    );
  }
  // The writer is the one place the field's shape is set; the detector prompt reports the
  // sub-fields the resume contract's Second precedence reads, so it names each of them.
  assert.match(
    text.reenterScript,
    /\.qa_reentry = \{from_step: 7, reason: "dod-gaps-code-fix", at: \$now, gate_head: \$head, report_entries: \$entries\}/,
    "reenter-qa-after-finalise.sh must write qa_reentry with its five sub-fields",
  );
  // Read the sub-fields out of the CONCERN TEMPLATE the detector files, not the whole line: the
  // line opens with the field's type annotation, which names every sub-field, so a line-wide match
  // passed with the template stripped bare (task.182 QA cycle 1, TASK-182-002).
  const concern = text.detectorPrompt.match(/"concern": "(qa_reentry:[^"]*)"/);
  assert.ok(
    concern,
    'the detector prompt must file qa_reentry as { "concern": "qa_reentry: …" }',
  );
  for (const sub of ["from_step", "reason", "gate_head", "report_entries"]) {
    assert.match(
      concern[1],
      new RegExp(`\\b${sub}\\b`),
      `the detector prompt's qa_reentry concern must report ${sub}`,
    );
  }
  // qa_max_cycles has two writers, and the hooks doc names both — the description that said it is
  // "written together at a resume after a loop-limit halt" was true of one of them (task.182, CR-2).
  for (const writer of ["grant-qa-cycles.sh", "reenter-qa-after-finalise.sh"]) {
    assert.ok(
      text.hooksDoc.includes(writer),
      `the hooks doc must name ${writer} as a writer of qa_max_cycles`,
    );
  }
  // The qa_phase each re-entry writes is stated ONCE, in the pause reference's lock schema, and the
  // other describers cite it. Cycles 1 and 2 of task.182 each found a site the previous fix missed
  // (hooks doc, both SKILL.md, then the pause doc itself), so the rule is consolidated rather than
  // patched again, and this test holds the one-statement shape (TASK-182-001, TASK-182-003).
  assert.match(
    text.pauseDoc,
    /`grant-qa-cycles\.sh` \(task\.123\) writes `5b` when it restores the lock from a halt snapshot whose `halt_reason` is not-converging[^|]*`5a` otherwise — a loop-limit halt, or a lock that already exists[^|]*`reenter-qa-after-finalise\.sh` \(task\.170\) always writes `5a`/,
    "the pause reference's qa_phase row must state which value each re-entry writer writes",
  );
  // The writer the statement describes: 5b only on a not-converging RESTORE (halt_reason is read
  // from the snapshot it restores, never from a live lock).
  assert.match(
    text.grantScript,
    /not-converging[^\n]*\) REENTER=5b/,
    "grant-qa-cycles.sh no longer writes 5b after not-converging — re-check the pause reference's qa_phase row",
  );
  // No other describer restates the grant's value. The population is DERIVED — every shared
  // resource and SKILL.md that names the grant — not the hand-kept FILES map, which missed
  // describers; the text is whitespace-collapsed so a claim that wraps is still one claim; and the
  // match takes "the grant" as well as the script name, and needs a writes/sets verb before the value
  // so a table keyed on the value the grant PRINTED is not a claim (task.182 QA cycle 3, TASK-182-004).
  // Measured against every historic false statement on origin/develop, b7d7661e, 4eb35d36 and
  // 93539f1b (the contract's "the grant writes `5a`" among them).
  const VALUE_CLAIM =
    /(?:grant-qa-cycles\.sh`?|\bthe grant\b|re-entry (?:scripts|writers))[^|]{0,200}?(?<![-\w])(?:writes?|sets?)(?![-\w])(?: it to)?[^|]{0,60}?`(?:qa_phase: )?5[ab]`/;
  const grantDescribers = execFileSync(
    "git",
    [
      "grep",
      "-l",
      "-E",
      "grant-qa-cycles|the grant",
      "--",
      ":(glob)shared/resources/*.md",
      ":(glob)skills/*/SKILL.md",
    ],
    { cwd: ROOT, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter((p) => p && p !== FILES.pauseDoc);
  assert.ok(
    grantDescribers.length >= 5,
    `non-vacuity: only ${grantDescribers.length} describers of the grant found`,
  );
  for (const p of grantDescribers) {
    assert.doesNotMatch(
      read(p).replace(/\s+/g, " "),
      VALUE_CLAIM,
      `${p} restates which qa_phase the grant writes — cite the pause reference's lock schema instead`,
    );
  }
  assert.match(
    text.hooksDoc,
    /the value the grant writes depends on the halt and is stated once, in the `qa_phase` row of the lock schema in `develop-pipeline-pause\.md`/,
    "the hooks doc must cite the pause reference for the qa_phase values",
  );
  // The SKILL.md grant sentence names no value (a "qa_phase: 5a atomically" there carried no
  // writer name, so VALUE_CLAIM cannot see it) — it cites the lock schema.
  for (const name of ["taskSkill", "storySkill"]) {
    assert.match(
      text[name],
      /`qa_phase` \(which value: the `qa_phase` row of the lock schema in `references\/develop-pipeline-pause\.md`\) and `convergence_from_cycle` atomically/,
      `${name} must cite the lock schema for the qa_phase the grant writes`,
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
  // Every dispatch site marks the wait. The POPULATION is derived from the directories the hooks
  // doc names — never a literal file list, which is how qa-task's and qa-story's own dispatches
  // went unmarked and unseen (QA cycle 1, CR-3) — and the pattern is case-insensitive over every
  // dispatch spelling the sources use. Two exemptions, each stated in the hooks doc: Phase 0a's
  // resume detector (no lock exists while it runs) and commentary about a dispatch (a comment, a
  // quote, a "do NOT re-dispatch"). Adding a dispatch anywhere in the population without a
  // set-waiting-on call within 12 lines is red.
  // Three wordings the corpus uses that the verb form misses (task.130 Phase 2; PR #436 review
  // CR-2): develop-bug step 3's "via a read-only Explore subagent (…)", a bare "Explore subagent ("
  // and the tool-call spelling "Agent(subagent_type". Each was a real dispatch outside the count.
  const DISPATCH =
    /subagent_type=|\bdispatch(?:es|ed)?\s+(?:an?|four|both|the|two)\s+[^\n.]{0,40}?\b(?:subagents?|lenses|mapper)\b|run_in_background|gh pr checks --watch|via a read-only Explore subagent|Explore subagent \(|Agent\(subagent_type/i;
  const EXEMPT =
    /^\s*#|^\s*>|pipeline-resume-detector-prompt|not re-dispatch|Do NOT re-dispatch|observed three times|forbidden for the same reason|Follow this systematic workflow|Conditions to dispatch|This skill dispatches/i;
  const listDir = (dir, re) =>
    fs
      .readdirSync(join(ROOT, dir))
      .filter((f) => re.test(f))
      .map((f) => `${dir}/${f}`);
  const population = [
    // Step 0 docs are excluded on purpose: no lock exists during Phase 0 (it is written at the
    // end of Step 1), so a Phase 0 dispatch has nothing to mark — the same exemption the hooks
    // doc states for the resume detector.
    ...listDir("shared/resources", /^develop-pipeline-step-[1-9].*\.md$/),
    "shared/resources/develop-pipeline-resume-contract.md",
    ...fs
      .readdirSync(join(ROOT, "skills"))
      .filter(
        (d) =>
          /^develop-/.test(d) &&
          fs.existsSync(join(ROOT, "skills", d, "SKILL.md")),
      )
      .map((d) => `skills/${d}/SKILL.md`),
    ...listDir(
      "skills/develop-bug/references",
      /^develop-bug-step-[1-9].*\.md$/,
    ),
    ...["qa-task", "qa-story", "review-pr", "finalise"].map(
      (d) => `skills/${d}/SKILL.md`,
    ),
  ];
  assert.ok(
    population.length >= 14,
    `population too small: ${population.length}`,
  );
  let sites = 0;
  for (const rel of population) {
    const lines = read(rel).split(/\r?\n/);
    const blocks = blocksOf(rel);
    lines.forEach((l, i) => {
      if (!DISPATCH.test(l) || EXEMPT.test(l)) return;
      sites += 1;
      assert.ok(
        isWaitMarked(lines, i, blocks),
        `${rel}:${i + 1} dispatches without marking the wait: ${l.trim().slice(0, 80)}`,
      );
    });
  }
  // Non-vacuity for the widened pattern (task.130 Phase 2): develop-bug step 3's root-cause
  // dispatch is in the directory-derived population already — it is NOT hand-listed — but only
  // matches once the pattern reads its wording. The check is anchored to THAT line ("Localise
  // the root cause"), not to "any line of the file": the file's test-triage dispatch spells
  // `subagent_type=` and matched before this task, so a file-level count was satisfied with the
  // root-cause dispatch still outside the population. Narrowing the regex back is red here.
  {
    const rel =
      "skills/develop-bug/references/develop-bug-step-3-investigate-fix.md";
    const rootCause = read(rel)
      .split(/\r?\n/)
      .filter((l) => /Localise the root cause/.test(l));
    assert.equal(
      rootCause.length,
      1,
      `${rel}: expected one root-cause step line`,
    );
    assert.ok(
      DISPATCH.test(rootCause[0]) && !EXEMPT.test(rootCause[0]),
      `${rel}: the root-cause dispatch line does not match DISPATCH — it is outside the population again`,
    );
  }
  // Non-vacuity: the two QA skills' own dispatches are in the count (the ones the hand-list missed).
  // Floor = the measured count with the task.130 pattern (17: 12 before + develop-bug step 3's
  // two lines + the three wordings elsewhere). Raise it when a dispatch is added; never lower it.
  assert.ok(
    sites >= 17,
    `expected ≥17 dispatch sites across the population, found ${sites} — the pattern drifted`,
  );
  for (const rel of ["skills/qa-task/SKILL.md", "skills/qa-story/SKILL.md"]) {
    assert.match(
      read(rel),
      /set-waiting-on\.sh "5a qa-/,
      `${rel} must mark its own 5a dispatch`,
    );
  }
});

test("isWaitMarked: a block that marks its own wait counts; an unmarked block and an earlier block do not (task 231)", () => {
  const FENCE = "```";
  const filler = (n) => Array.from({ length: n }, (_, k) => `prose ${k}`);
  const check = (lines, i) =>
    isWaitMarked(lines, i, extractBlocks(lines.join("\n")));

  // The block opens 2 lines after the dispatch and marks its wait 20 lines in — past the window.
  const owned = [
    "Dispatch the probe plan in the background.",
    "",
    `${FENCE}bash`,
    ...filler(20),
    'bash set-waiting-on.sh "step-7 probe plan" --kind task',
    FENCE,
  ];
  assert.equal(
    check(owned, 0),
    true,
    "a block-owned mark beyond the window must count",
  );

  // The same shape with no mark in the block.
  const unmarked = owned.filter((l) => !l.includes("set-waiting-on"));
  assert.equal(
    check(unmarked, 0),
    false,
    "a following block with no mark must not count",
  );

  // The mark sits in a block that closed before the dispatch, more than 12 lines earlier.
  const earlier = [
    `${FENCE}bash`,
    'bash set-waiting-on.sh "earlier" --kind task',
    ...filler(14),
    FENCE,
    "Dispatch the probe plan in the background.",
    "",
    `${FENCE}bash`,
    "echo nothing",
    FENCE,
  ];
  assert.equal(
    check(earlier, 17),
    false,
    "a mark only in an earlier block must not count",
  );

  // The proximity window still counts on its own.
  assert.equal(
    check(['Mark it: set-waiting-on.sh "x"', "Dispatch the agent."], 1),
    true,
  );
  // A block that opens more than 12 lines after the dispatch is not this dispatch's block.
  const far = [
    "Dispatch the agent.",
    ...filler(13),
    `${FENCE}bash`,
    'set-waiting-on.sh "far"',
    FENCE,
  ];
  assert.equal(check(far, 0), false);
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
    /'\.extra_cycles_granted = \$k \| \.qa_max_cycles = \(\$c \+ \$k\) \| \.qa_phase = \$p\s*\|\s*\.convergence_from_cycle = \(\$c \+ 1\)'/,
    "grant-qa-cycles.sh must write qa_max_cycles as the reconstructed count plus the grant, and the re-entry qa_phase, in one write (C3-CR-3, obs #228)",
  );
  // task.124: the restore moved into advance-pipeline-lock.sh --restore, the ONE restore path.
  // The field stripping lives there; the grant script must call it and must not carry its own.
  assert.match(
    text.lockHelper,
    /del\(\.halted_at, \.halt_reason, \.halt_step, \.paused_at, \.pause_reason, \.waiting_on\)/,
    "advance-pipeline-lock.sh --restore must rebuild the lock from the snapshot minus the halt-only fields and any waiting_on (task.124 QA cycle 2, CR-3)",
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
  // task.239 (obs #70): the label names the action. The phase is grant-qa-cycles.sh's decision,
  // and the old phase-named label was wrong for every not-converging grant, which re-enters at 5b.
  // (Spelled `5[a]` below so the label sweep in qa-escalation-template.test.mjs never finds it here.)
  for (const name of ["taskSkill", "storySkill"]) {
    assert.match(
      text[name],
      /Resume the QA loop with \{k\} more cycles/,
      `${name} must offer the grant in Phase 0b`,
    );
    assert.doesNotMatch(
      text[name],
      /Resume at 5[a] with/,
      `${name} must not name a phase in the grant option (task.239)`,
    );
    assert.match(
      text[name],
      /reenter_at=5b` → "re-entering at 5b: fix first"/,
      `${name} must report the phase from the script's result line (task.239)`,
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
