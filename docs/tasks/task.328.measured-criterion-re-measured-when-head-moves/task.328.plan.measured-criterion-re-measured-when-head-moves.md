# Implementation Plan: task.328 — A measured criterion is re-measured when the head moves

**Task:** [task.328](task.328.measured-criterion-re-measured-when-head-moves.md)
**Grounded at:** `8607d9b12` (2026-11-26)

---

## Phase 1: Detect a measured criterion

**Files:** `shared/resources/finalise-record-preflight.js`,
`shared/resources/tests/finalise-record-preflight.test.mjs`.

1. **Red first.** Add these tests and run them before any change. Record the failing output in the QA
   report:
   - Task 320's criterion 10, verbatim (`task.320.task-319-leftover-findings.md`, Performance), in a
     scratch repo with a committed QA report. It is listed, and `listed[0].measured === true`. Today
     `isRecordCriterion` returns `false` for it.
   - One case per phrase, built from a list: `longer`, `shorter`, `faster`, `slower`, `larger`,
     `smaller`, `greater`, each followed by "than" and a number, with and without a leading "no".
     Each is listed.
   - The controls from the task's §8: a non-timing bound (listed, `measured: true`); a comparison
     with no number (not listed); a record criterion with no bound (`measured: false`).
2. **Widen `NUMERIC_BOUND`** at `:54`. Add the alternation
   `(?:no\s+)?(?:longer|shorter|faster|slower|larger|smaller|greater)\s+than\s+\d` beside the
   existing words. Keep the existing alternatives exactly as they are: the tests at `:127` and `:187`
   hold them.
3. **Add `measured`** in `classify` (`:114`). Set it on both entry shapes: the `implementation-report`
   and `no-location` branch (`listed.push` at `:128`), and the named-location branch (`listed.push` at `:154`). Use
   `NUMERIC_BOUND.test(text)`. Update the header comment at `:17-18` to say entries carry
   `{ criterion, location, state, artifacts, measured }`.
4. **Leave alone:** `STATES`, `REASONS`, `RECORD_WORDS`, and the human-readable `emit` output. An
   optional ` (measured)` suffix in `emit` is allowed, but no test may depend on it.
5. **Corpus count.** Run `isRecordCriterion` over every tracked task document's criteria, once at
   `develop` and once at the change. Read the criteria with `readCriteriaEntries` from
   `criteria-section.js`; take the documents from `git ls-files 'docs/tasks/*/task.*.md'`, excluding
   `.qa.`, `.dod.`, `.plan.`, `.bug.`, `.implementation.`, `.pr-review.` and `.review.` (328 files at
   `8607d9b12`). Record the delta and five newly listed examples, by path, in the QA report.
   **Non-vacuity:** the "before" count must be positive, or the reader is broken.

## Phase 2: QA grades a measured figure by finalise's rule

**Files:** `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, and a new parity test.

1. **`skills/qa-task/SKILL.md:1089`.** Extend the parenthesis. Old: "(a measured criterion cites its
   committed measurement and command, as Step 3 asks)". New: it also says the figure counts for this
   head only as `finalise-dod-ac-prompt.md` Step 3 grades a measured figure, through
   `references/finalise-delta.js docs-only`. That covers a figure carried from an earlier cycle or QA
   report as much as a new one. Any answer but `tree-equivalent` leaves it **unverified** with
   "re-measure", and a MEDIUM finding in `top_issues[]`, so it enters the fix loop. **Cite the rule.
   Do not restate the reason list** (`code-changed`, `disabled`, `unverifiable`). A second wording is
   the enumeration drift `docs/reference/anti-patterns.md` names.
2. **`skills/qa-task/SKILL.md:50`** (`record_criteria`). Add one sentence. An entry with
   `measured: true` is graded by the sentence above before its record is written or carried.
3. **`skills/qa-story/SKILL.md:1624`.** Make the same change as step 1. `qa-story` gets no
   `record_criteria` (`develop-pipeline-step-5-6-qa-loop.md:332`), so it has no step 2. That dispatch
   gap is out of scope.
4. **Bundle.** The bare mention of `references/finalise-delta.js` in each SKILL.md makes it a
   dependency. Run `npm run bundle` and read the printed `closure M (±K)` for both skills. Expect
   `finalise-delta.js` and `ci-tree-equivalence.js`, and whatever else they `require`. Commit the
   generated copies.
5. **Parity test** in `evals/shared/tests/` (the same family as `transition-protocol-parity.test.mjs`).
   For each of the two QA SKILL.md files, locate the measured-figure paragraph by its own marker
   (`finalise-delta.js docs-only` and "re-measure" in one paragraph — the citation alone also
   appears at qa-task `:1084`/`:1106` and qa-story `:1619`/`:1641`, so it cannot be the key):
   - that paragraph cites `finalise-dod-ac-prompt.md` Step 3;
   - it does not contain the literal `code-changed`, `disabled` and `unverifiable` reason list near
     that sentence;
   - a file with no such paragraph fails (never passes vacuously).

   **Calibrate it** (CLAUDE.md, "a check proves nothing until it has reproduced a known failure").
   Delete the citation from one file, and the test goes red. Paste the reason list into the other,
   and it goes red.

## Phase 3: Verify and close

1. **Replay task 320.**
   - Run `command node shared/resources/finalise-record-preflight.js check --doc docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md --json`. Expect criterion 10 in `listed` with `measured: true`. At `8607d9b12`, only 11 is listed.
   - Run `command node shared/resources/finalise-delta.js docs-only --base 7cae65a14 --head 5c9044f38 --json`. It answers `code-changed`, verified 2026-11-26. This is the answer QA cycle 7 would have had to read.
2. **Mutation table.** Revert each remedy one at a time and name the test that goes red:
   - the `NUMERIC_BOUND` widening;
   - the `measured` field;
   - the qa-task citation;
   - the qa-story citation.
3. **Full suite.** Run it with `npm run test:remote` (CI-parity, under `CI=true`). Then run `npm run -s bundle:check`.
4. **CHANGELOG** `[Unreleased]`. Add an entry that cites (task 328). It says the preflight lists more bound phrasings, and that QA grades a measured figure by finalise's tree-equivalence rule.

## Record locations (obs #105)

All in the newest committed QA report `task.328.qa.{N}.measured-criterion-re-measured-when-head-moves.md`:

- the red-first runs;
- the corpus count;
- the replay outputs;
- the mutation table.

## Traps

- Edit `shared/resources/finalise-record-preflight.js`, never a `references/` copy. `npm run bundle` reverts a copy-only fix.
- Inside a `shared/resources/` source, cite a sibling by bare filename, never by its `shared/resources/` path.
- No criterion here is wall-clock. Do not add one without five runs, the median and the load (obs #31).
