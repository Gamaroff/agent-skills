/**
 * Guard — a restatement of the code-review gating rule carries the reproduced-bug exception
 * (task 288, following task 273).
 *
 * The rule: a `category: bug` finding gates the QA build when blocking resolves to true
 * (run-level `code_review_blocking=true` argument, or the document's frontmatter flag) AND the
 * reviewer said `confidence: high`. The exception, step 5d: a bug QA reproduces by execution
 * gates at ANY reviewer confidence — a reproduction is a measurement, not a claim. It lives once
 * in `shared/resources/code-review-prompt.md` ("Opt-in to blocking", and item 4 under "QA use"),
 * and many files restate the rule in prose. Task 273 needed five QA cycles to find the
 * restatements that dropped the exception, one per cycle: a phrase-based probe finds the wordings
 * its author thought of. This test reads the sources instead, so a restatement that omits the
 * exception turns it red rather than costing a QA cycle.
 *
 * Population (derived, never listed): `git ls-files` of `skills/<name>/SKILL.md` and
 * `shared/resources/<file>.md`, minus anything under a `tests/` directory (the report-lint
 * fixtures are test data, not canonical sources). Generated copies under `skills/*\/references/`
 * are not in the population: `npm run bundle` makes them from these sources and
 * `tests/bundled-copies*` hold them equal.
 *
 * Unit: a sentence. Prose AND the bodies of template fences (info string `markdown`, `md`, `text`
 * or none — prompt and report templates, where CR-5 and CR-6 themselves live) are read; fences
 * tagged with a code language (bash, yaml, js, json ...) and table rows are not. An earlier
 * draft skipped every fence and so could not see the very lines it was written to hold: the
 * report-template lines and the reviewer prompt's discipline bullet are all inside fences.
 *
 * A sentence is KEYED when it
 *   (A) names the flag (`code_review_blocking`, `CODE_REVIEW_BLOCKING_ARG`, `CR_BLOCKING`) together
 *       with a gating word (gate, gates, gated, gating, advisory), or
 *   (B) names `high-confidence` / `confidence: high` together with a gating word, or
 *   (C) says `will not gate`, or
 *   (D) says `advisory unless` (the report-template lines name no flag, so A-C missed them).
 * A keyed sentence must CARRY the exception, or point at the section that states it: `5d`,
 * `reproduc…`, `item 4`, `Opt-in to blocking`, `resolution matrix`, or `claim alone` (the
 * qualified "will not gate on the reviewer claim alone": it names the gate as being about the
 * claim, which is the half the exception leaves out). The sentence straight AFTER a keyed one may
 * carry it instead ("Cleanups ... are always advisory. One exception covers this whole note: ...");
 * two sentences away does not count, because a long paragraph that holds the marker once would
 * otherwise mask a restatement elsewhere in it.
 *
 * Second assertion, T273-CR-6's shape: a sentence that says "advisory unless" and names the flag
 * must also name how blocking is resolved (`run-level`, `CODE_REVIEW_BLOCKING_ARG`,
 * `blocking resolves`). "Advisory unless the doc opted in" read as if the document's flag were the
 * only input, which ignores the run-level argument the develop pipelines always pass.
 *
 * KNOWN LIMIT, stated rather than hidden: a restatement that avoids all four keys (for example
 * "bugs above 80% confidence block the merge") is invisible to this test. It holds the wordings
 * the population already uses and the one a copy-edit would most plausibly reuse; it does not
 * claim to find a restatement phrased from scratch. The non-vacuity floor below turns a key that
 * stops matching anything into a failure rather than a pass over nothing.
 *
 * Mutation proof (obs on every fix): run with GATING_RULE_ROOT pointing at a scratch worktree and
 * (a) restore "(it will not gate)" unqualified in code-review-prompt.md, (b) drop "run-level arg"
 * from one report-template line, (c) delete the exception from review-code/SKILL.md; each must
 * turn this red. See the task's QA report for the recorded runs.
 *
 * Run via: node --test evals/shared/tests/gating-rule-restatements.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT =
  process.env.GATING_RULE_ROOT || path.resolve(__dirname, "..", "..", "..");

const GATING_WORD = /\b(gate|gates|gated|gating|advisory)\b/i;
const FLAG = /code_review_blocking|CODE_REVIEW_BLOCKING|CR_BLOCKING/i;
const KEYS = [
  ["A", (s) => FLAG.test(s) && GATING_WORD.test(s)],
  [
    "B",
    (s) => /high-confidence|confidence:\s*high/i.test(s) && GATING_WORD.test(s),
  ],
  ["C", (s) => /will not gate/i.test(s)],
  // D: the report-template lines say "advisory unless <how blocking resolves>" and name no flag, so
  // keys A-C never saw them: dropping their 5d clause left the guard green (T288-CR-1, QA cycle 1).
  ["D", (s) => /advisory unless/i.test(s)],
];
const CARRIES =
  /\b5d\b|reproduc|item 4|Opt-in to blocking|resolution matrix|claim alone/i;
const HOW_RESOLVED = /run-level|CODE_REVIEW_BLOCKING_ARG|blocking resolves/i;

/** Fence info strings whose body is prose or a template, not code. */
const PROSE_FENCES = new Set(["", "markdown", "md", "text", "txt"]);

/**
 * Sentences of one Markdown source: prose plus template fences, no code fences, no table rows.
 * Lines are grouped into blocks (a blank line, a table row, a code fence or a new list item ends
 * one), then each block is split at sentence ends.
 */
export function sentences(text) {
  const out = [];
  let block = [];
  const flush = () => {
    if (!block.length) return;
    const joined = block.join(" ").replace(/\s+/g, " ").trim();
    block = [];
    for (const s of joined.split(/(?<=[.!?])\s+(?=[A-Z{\[`(*"'<])/)) {
      if (s.trim()) out.push(s.trim());
    }
  };
  let fence = null; // { mark, skip }
  for (const raw of text.split("\n")) {
    const m = /^[ \t]*(`{3,}|~{3,})(.*)$/.exec(raw);
    if (fence) {
      if (
        m &&
        m[1][0] === fence.mark[0] &&
        m[1].length >= fence.mark.length &&
        !m[2].trim()
      ) {
        flush();
        fence = null;
        continue;
      }
      if (fence.skip) continue;
    } else if (m) {
      flush();
      fence = {
        mark: m[1],
        skip: !PROSE_FENCES.has(m[2].trim().split(/\s+/)[0].toLowerCase()),
      };
      continue;
    }
    if (/^\s*\|/.test(raw)) {
      flush();
      continue;
    } // table row
    if (!raw.trim()) {
      flush();
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s/.test(raw)) flush(); // a new list item is a new block
    block.push(raw.replace(/^\s*>\s?/, "").replace(/^\s*([-*+]|\d+\.)\s+/, ""));
  }
  flush();
  return out;
}

export function population(root = ROOT) {
  const listed = execFileSync(
    "git",
    ["ls-files", "skills/*/SKILL.md", "shared/resources/*.md"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean)
    .filter((f) =>
      /^(skills\/[^/]+\/SKILL\.md|shared\/resources\/[^/]+\.md)$/.test(f),
    );
  return listed.sort();
}

export function keyedSentences(root = ROOT) {
  const keyed = [];
  for (const file of population(root)) {
    const all = sentences(readFileSync(path.join(root, file), "utf8"));
    all.forEach((s, i) => {
      const keys = KEYS.filter(([, test]) => test(s)).map(([k]) => k);
      if (keys.length)
        keyed.push({ file, sentence: s, next: all[i + 1] || "", keys });
    });
  }
  return keyed;
}

/**
 * Sentences that are keyed and say nothing about the exception, each with the reason it is allowed.
 * `startsWith` is matched against the normalised sentence. Add an entry only for a sentence that is
 * genuinely not a restatement of the rule; a restatement gets the exception instead.
 */
export const EXEMPT = [
  {
    file: "shared/resources/code-review-prompt.md",
    startsWith:
      "Whether high-confidence correctness bugs gate the build is resolved from",
    reason:
      "opens the 'Opt-in to blocking' section itself: the section is the canonical statement, and item 4 under 'QA use' in this file holds the exception",
  },
  {
    file: "shared/resources/code-review-prompt.md",
    startsWith: "`CR_BLOCKING=true` → append every",
    reason:
      "a bullet of the canonical resolution inside the 'Opt-in to blocking' section; it names the opt-in branch, and the exception is item 4 under 'QA use' in the same file",
  },
  {
    file: "skills/qa-story/SKILL.md",
    startsWith:
      "When `CR_BLOCKING=true`, append each `category: bug` + `confidence: high`",
    reason:
      "step 6 (Gate mapping): this sentence is the opt-in branch; the step's closing sentence ('Otherwise ... except for a bug QA reproduces by execution (5d ...)') states the exception in the same paragraph",
  },
  {
    file: "skills/qa-task/SKILL.md",
    startsWith:
      "When `CR_BLOCKING=true`, append each finding that is `category: bug`",
    reason:
      "step 6 (Gate mapping): this sentence is the opt-in branch; the step's closing sentence ('Otherwise ... except for a bug QA reproduces by execution (5d ...)') states the exception in the same paragraph",
  },
  {
    file: "skills/qa-story/SKILL.md",
    startsWith: "**Code Review** (Phase 1.6): [B] bug(s)",
    reason:
      "a report-summary template line that carries counts only; it states no rule",
  },
  {
    file: "skills/qa-task/SKILL.md",
    startsWith: "**Code Review** (Step 3b): {B} bug(s)",
    reason:
      "a report-summary template line that carries counts only; it states no rule",
  },
];

/**
 * Keyed sentences measured at implementation time: 29 (2026-11-23, `keyedSentences().length`).
 * The floor sits a few below it, so ordinary edits do not trip it but a key that stops matching does.
 */
export const FLOOR = 24;

const keyed = keyedSentences();

test("the population is non-vacuous", () => {
  assert.ok(
    keyed.length >= FLOOR,
    `expected at least ${FLOOR} keyed sentences, found ${keyed.length} — a key that matches nothing passes over everything`,
  );
  assert.ok(
    population().length >= 20,
    "the population came back near-empty — is this a git checkout of the repository?",
  );
});

test("every exemption carries a reason and names exactly one keyed sentence", () => {
  for (const e of EXEMPT) {
    assert.ok(
      e.reason && e.reason.trim(),
      `exemption for ${e.file} needs a reason`,
    );
    const hits = keyed.filter(
      (k) => k.file === e.file && k.sentence.startsWith(e.startsWith),
    );
    assert.equal(
      hits.length,
      1,
      `exemption {${e.file}, "${e.startsWith}"} matches ${hits.length} keyed sentences, not 1 — remove or fix it`,
    );
  }
});

/** The sentence itself, or the one straight after it ("One exception covers this whole note: ..."). */
const carries = (k) => CARRIES.test(k.sentence) || CARRIES.test(k.next);

const isExempt = (k) =>
  EXEMPT.some((e) => e.file === k.file && k.sentence.startsWith(e.startsWith));

test("every restatement of the gating rule carries the reproduced-bug exception or points at it", () => {
  const bad = keyed.filter((k) => !carries(k) && !isExempt(k));
  assert.deepEqual(
    bad.map(
      (k) => `${k.file} [${k.keys.join("")}]: ${k.sentence.slice(0, 160)}`,
    ),
    [],
    "restates the gating rule without the reproduced-bug exception (step 5d) or a pointer to " +
      "'Opt-in to blocking' in code-review-prompt.md. Add the exception, or exempt the sentence in EXEMPT with a reason.",
  );
});

test("the four report-template 'advisory unless' lines are in the keyed population (T288-CR-1)", () => {
  const lines = keyed.filter(
    (k) =>
      /advisory unless/i.test(k.sentence) &&
      /^skills\/qa-(task|story)\/SKILL\.md$/.test(k.file),
  );
  assert.ok(
    lines.length >= 4,
    `expected the four qa-task/qa-story report-template lines keyed by 'advisory unless', found ${lines.length}`,
  );
});

test("'advisory unless' names how blocking is resolved, not only the document's flag (T273-CR-6)", () => {
  // Every 'advisory unless' sentence is checked, whether or not it names the flag: the report-template
  // lines name none, and a flag filter here made the assertion run over an empty set (T288-C2-2).
  // The one sentence that is about the standalone case ("Absent for standalone runs → ...") is
  // skipped: it describes a run with no run-level argument, so "unless the doc opts in" is complete.
  const checked = keyed.filter(
    (k) =>
      /advisory unless/i.test(k.sentence) &&
      !/^Absent for standalone runs/.test(k.sentence) &&
      !isExempt(k),
  );
  assert.ok(
    checked.length >= 4,
    `expected at least four 'advisory unless' sentences to be checked, found ${checked.length}`,
  );
  const bad = checked.filter((k) => !HOW_RESOLVED.test(k.sentence));
  assert.deepEqual(
    bad.map((k) => `${k.file}: ${k.sentence.slice(0, 160)}`),
    [],
    "says 'advisory unless <the doc opted in>' and ignores the run-level code_review_blocking=true argument the develop pipelines pass",
  );
});

test("sentences(): skips code fences and tables, reads template fences and prose", () => {
  const md = [
    "Prose sentence one. Prose sentence two.",
    "",
    "```bash",
    "echo code_review_blocking gate",
    "```",
    "| a | code_review_blocking gate |",
    "",
    "```markdown",
    "{template — advisory unless the doc opted in via code_review_blocking.}",
    "```",
    "",
    "- item one gates",
    "- item two",
  ].join("\n");
  const got = sentences(md);
  assert.ok(got.includes("Prose sentence two."));
  assert.ok(!got.some((s) => /echo/.test(s)), "a code fence must be skipped");
  assert.ok(!got.some((s) => /\| a \|/.test(s)), "a table row must be skipped");
  assert.ok(
    got.some((s) => /template — advisory unless/.test(s)),
    "a template fence must be read",
  );
  assert.ok(
    got.includes("item one gates") && got.includes("item two"),
    "list items are separate blocks",
  );
});

test("the keys: a restatement with the exception passes, one without it fails, and a keyless one is invisible (stated limit)", () => {
  const withExc =
    "Blocking is advisory unless code_review_blocking resolves true, or QA reproduced the finding (5d).";
  const without = "High-confidence bugs gate the build.";
  const keyless = "Bugs above 80% confidence block the merge.";
  const keyedOf = (s) => KEYS.some(([, t]) => t(s));
  assert.ok(keyedOf(withExc) && CARRIES.test(withExc));
  assert.ok(keyedOf(without) && !CARRIES.test(without));
  assert.ok(
    !keyedOf(keyless),
    "the stated limit: a restatement avoiding every key is not seen",
  );
});
