# Sprint Review Summary - QA read-back requires this cycle's links; one definition each for the cycle's gate file and for path containment

**Story/Task ID:** task.158
**Completed Date:** 2026-09-29
**Completed By:** Claude (develop-task pipeline, autonomous via `/develop-next`)
**Pull Request:** [#521](https://github.com/Gamaroff/agent-skills/pull/521)

---

## Summary

This task closes three residues left by task.149.

- **The QA read-back now checks the current cycle.** It verifies that the work item links the gate and QA report for the *current* QA cycle, not only that some links resolve.
- **One helper decides which gate is current.** Every lookup of the current cycle's gate now goes through `qa-cycle.sh`. That covers the QA skills, the develop-pipeline step docs and the grant writer.
- **One containment predicate per module system.** Path containment has one ESM definition and one CommonJS definition, held equal by a parity test.

---

## What Was Delivered

### Acceptance Criteria Met

- ✅ **SC1:** a cycle-2 document that still links `gate.1`/`qa.1` now halts the read-back and names both missing links. Once re-linked, it reads clean.
- ✅ **SC2 / SC3:** a zero-padded `gate.02` is found by Step 13b and by the resume reconstruction.
- ✅ **SC4:** `security-probe.mjs --entry` and `--fake-gh` accept a `..name` directory inside the repository. They still refuse the root, `../x` and outside paths.
- ✅ **SC5–SC13:** the guard and parity tests are in place, and every new assertion is mutation-proved. `npm run ci` is clean and the validators pass. The CHANGELOG entry and the `qa-cycle.sh` header claim are in place.

### Key Features Implemented

- **`qa-read-back.js`: this-cycle link membership.** `doc-links.js` `checkDocument` now returns `resolved[]`.
- **`qa-cycle.sh` is the one definition.** It is used by qa-task and qa-story (Phase 0 and Step 13b), the QA loop's latest gate, the resume contract, Step 7's completion comment, and `grant-qa-cycles.sh`.
  - A cycle that no single file carries is a stop, not "no gate".
  - On resume, gate files with no usable cycle number halt, instead of restarting QA at cycle 1.
- **`tests/qa-cycle.test.js` guards.** One guard covers gate selection in fenced blocks. Another covers gate derivation in any shipped shell helper.
- **`security-probe.mjs` and `doc-links.js`: one `isWithin` per module system**, with an explicit `=== root` refusal.

---

## Technical Details

### Files Modified/Created

- **Engines:**
  - `shared/resources/{qa-read-back.js, doc-links.js, security-probe.mjs, qa-cycle.sh, grant-qa-cycles.sh}`
- **Prose:**
  - `skills/qa-task/SKILL.md`
  - `skills/qa-story/SKILL.md`
  - `shared/resources/develop-pipeline-{step-5-6-qa-loop, resume-contract, step-7-finalise}.md`
- **Tests:**
  - `shared/resources/tests/{qa-read-back, doc-links, security-probe}.test.mjs`
  - `tests/qa-cycle.test.js`
  - `shared/resources/grant-qa-cycles.test.sh`
  - `evals/shared/tests/optional-file-lookups.test.mjs`
- **Generated:** bundled `references/` copies. `qa-cycle.sh` is now also shipped in the develop-* and review-* skills.

### Architecture/Design Decisions

- **The step docs call the helper through the `{develop-story|develop-task|develop-bug}` invocation path, not a `shared/resources/` literal.** The bundler already follows that path.
- **`grant-qa-cycles.sh` declares `qa-cycle.sh` as a `bundle-dependency`.** That puts the helper in every skill that bundles the grant script.
- **The resume contract separates two meanings of rc 1** ("no gate" vs "gates without a number") at the two sites that must tell them apart. Giving the helper a distinct exit code is recorded as future work.

### Dependencies

None added.

---

## Testing & Quality Assurance

### Test Coverage

- **About 15 new tests plus extended guards.** These include a four-state resume-block test run under bash and zsh.
- **Mutation proofs:**
  - M1–M15 in develop and the fix cycles, all red, with M7 red only after its assertion was tightened.
  - Q1–Q2 during QA.
- **`npm run ci`:** exit 0, with 4512 passing and 0 failing.
- **PR CI:** all 5 checks green on `1a9d4bb7`.

### Code Review

There were 3 QA cycles:

| Cycle | Gate | Score | Finding |
| --- | --- | --- | --- |
| 1 | CONCERNS | 90 | CR-1: the grant keeps a second cycle definition |
| 2 | CONCERNS | 90 | QA2-CR-1: unnumbered gates read as a fresh start on resume |
| 3 | PASS | 100 | — |

Step 5c `/review-pr` then returned APPROVE with 3 low findings.

---

## Security & Compliance

### Security Review

PASS, measured by executing the probe engine: 22 candidates on the `path` sink per cycle and again at DoD. Every reproduced case is attributed:

- a literal in-root name;
- the documented pre-import symlink limit;
- the lexical predicate's handling of absolute, empty and null-byte candidates under an adapter join.

### Compliance Review

Not applicable. This is internal tooling.

---

## Documentation

### Updated Documentation

- `CHANGELOG.md` [Unreleased] › Changed (task 158)
- The `qa-cycle.sh` header
- The QA skill Step 12b / item 3e clause
- The step docs

### Documentation Links

- **Task:** `docs/tasks/task.158.cycle-file-and-containment-definitions/task.158.cycle-file-and-containment-definitions.md`
- **DoD:** `task.158.dod.1.cycle-file-and-containment-definitions.md`
- **PR review:** `task.158.pr-review.1.cycle-file-and-containment-definitions.md`

---

## Demo Notes

### How to Verify

1. Run `node --test shared/resources/tests/qa-read-back.test.mjs` and check the cycle-2 cases.
2. Run `bash shared/resources/grant-qa-cycles.test.sh` and check the zero-padded and unnumbered cases.
3. Run `node --test --test-name-pattern='four answers' evals/shared/tests/optional-file-lookups.test.mjs`.

### Screenshots/Visuals

N/A (tooling).

---

## Impact & Value

### User Impact

A QA run on cycle 2 or later can no longer pass a work item whose document still points at the previous cycle's evidence. A zero-padded gate no longer reports "nothing blocking" over a HIGH finding.

### Technical Impact

Two duplicate definitions are gone: the cycle-file grammar and the containment test. Tests now fail if a new copy of either appears.

---

## Known Limitations & Future Work

### Current Limitations

- `qa-cycle.sh` rc 1 still has two meanings at the QA-skill call sites. There it maps to "first review"; the behaviour is identical on develop.

### Suggested Follow-Up Stories

- **A distinct `qa-cycle.sh` exit code for gate files with no usable number** (QA3-CR-1). Every caller should handle it.
- **Move the remaining prose-only "newest gate" readers onto `qa-cycle.sh --path gate`** (QA2-CR-2, 5c CR-1). These are develop-next's merge gate, qa-fix's discovery rules and the findings-ingester prompt.
- **Low cleanups from gate.3 `recommendations.future`** (QA3-CR-3..6).

---

**Status:** ✅ **ACCEPTED**
