# Sprint Review Summary - A markdown-structure sink and an internal-artefact decision for the security probe

**Story/Task ID:** task.131
**Completed Date:** 2026-09-30
**Completed By:** Claude (develop-task pipeline, via develop-next)
**Pull Request:** [#526](https://github.com/Gamaroff/agent-skills/pull/526)

---

## Summary

The finalise security probe now **executes** a validator of the pipeline's own implementation report, instead of failing on the zero-guard and waiting for a human to overrule it. That override is what happened on task.124. A validator that no corpus sink fits is now a recorded `boundary: internal` decision with a reason, enforced at acceptance, not a failure to be argued with.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `corpusFor("markdown-structure")` returns both directions, and each hostile case trips the report-lint code(s) it is named for
- [x] `security-probe.mjs --sink markdown-structure --entry …report-lint.js#lintReport --args-json …` executes every case and returns `engages` (15/15). The real corrupt and green fixtures score the same way.
- [x] A `boundary: internal` renders an explicit skip with its reason. Without a valid reason it is a FAIL, and `SEC_OVERALL` is forced to FAIL.
- [x] The probe runs in under 10 s (1.6 s)
- [x] Mutation proofs for the engine path; the schema test is non-vacuous; `bundle:check` reports 0 problems
- [x] CHANGELOG entry; the `boundary` consumers are enumerated by compound keys and updated; task.124 is cited as the motivating case

### Key Features Implemented

- **`markdown-structure` sink** (`security-input-corpus.mjs`): 9 hostile implementation reports, each a valid report with one defect, plus 6 legitimate ones (fenced quotes in LF and CRLF, the story variant, the optional section, an untemplated heading).
- **`--args-json`** on `security-probe.mjs`: fixed arguments appended after each case's input, for the JS entry form only (`bad-args` otherwise), recorded as `args`.
- **Result-object rule**: the JS runner reads a returned own `ok === false` as a refusal. Without it, every report `lintReport` refused scored `accepted`.
- **`boundary: true | false | internal`**: `internal` needs an entry-bearing `internal_reason`. The prompt carries a disqualified-entries table, and finalise Step 3c forces FAIL on a missing, empty, entry-less or disqualified reason.
- **Found by the new probe, and fixed**: `change-log.js#fencedRanges` never detected a fence in a CRLF document.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-input-corpus.{mjs,md}`, `security-probe.mjs`, `change-log.js`
- `shared/resources/finalise-dod-security-prompt.md`, `probe-boundary-rule.md`, `security-review-prompt.md`
- `skills/finalise/SKILL.md`, `skills/finalise/assets/bug-dod-template.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`
- Tests: `security-probe.test.mjs`, `security-input-corpus.test.mjs`, `change-log.test.mjs`, `report-lint.test.mjs`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`; two new fixtures
- `docs/reference/anti-patterns.md`, `CHANGELOG.md`; bundled `skills/*/references/` copies regenerated

### Architecture/Design Decisions

- Corpus cases are inline strings. The corpus stays pure data and bundles cleanly, and the real report-lint fixtures are exercised by the engine test instead.
- `internal` is a decision, not a verdict. It is unavailable for any shape a sink models, and entries are matched on basename plus export.

### Dependencies

None added.

---

## Testing & Quality Assurance

### Test Coverage

- `npm run ci:fast`: 4,594 tests, 0 failures. CI SUCCESS on `8a0504150c8d`.
- Mutation-proven: the runner rule, `args` pass-through, the CRLF fix, the internal render and enforcement, the disqualified table, the enumeration tests (including the exact drift `develop` carried).

### Code Review

- 4 QA cycles (CONCERNS → CONCERNS → CONCERNS → PASS 100; the Cosmetic-residue exit at cycle 4). 7 bugs raised and closed.
- Step 5c PR review: CONCERNS. The two low conformance findings were applied, and the two medium code findings were carried to future work.

---

## Security & Compliance

### Security Review

The boundary (`report-lint.js#lintReport`) was probed by execution: 15 executed, 0 reproduced, 0 overblocked. No secrets, unsafe patterns or dependency changes.

### Compliance Review

Not applicable (internal tooling).

---

## Documentation

### Updated Documentation

CHANGELOG `[Unreleased]`; probe-boundary-rule; the finalise security prompt; finalise, qa-task and qa-story SKILL.md; the review-security prompt; anti-patterns ("never end a rule in 'a human decides' on a shape that recurs").

### Documentation Links

- DoD: `task.131.dod.1.markdown-structure-sink-internal-validator-class.md`
- QA: `task.131.qa.4.markdown-structure-sink-internal-validator-class.md`; gate `task.131.gate.4.markdown-structure-sink-internal-validator-class.yml`

---

## Demo Notes

### How to Verify

```bash
ARGS=$(node --print 'JSON.stringify([{sections: require("./shared/resources/report-lint.js").loadTemplate()}])')
node shared/resources/security-probe.mjs --sink markdown-structure \
  --entry 'shared/resources/report-lint.js#lintReport' --args-json "$ARGS"
# → engages (hostile-rejected-legitimate-accepted) — executed 15, passed 15
```

### Screenshots/Visuals

None (CLI tooling).

---

## Impact & Value

### User Impact

Finalise no longer ends a run with "a human should decide" on a Markdown validator. That shape is probed, and the rare validator with no fitting sink is a recorded, enforced decision.

### Technical Impact

Two-argument JS predicates are now probeable without a hand-written harness. A real CRLF defect in the one fence parser the repository shares is fixed.

---

## Known Limitations & Future Work

### Current Limitations

- `args` is not part of the JS control key, so two differently-configured probes of one export share a record entry.
- CRLF fence detection is still missing in `jira-sync.js`, `doc-links.js` and `jira-create-epic.js`. This is pre-existing.
- Four LOW residues from QA cycle 4: TASK-131-CR-4-1..4.

### Suggested Follow-Up Stories

- One task for the CRLF fence-matcher population, with a population test.
- One task for the JS control key (`args` or `--name`).

---

**Status:** ✅ **ACCEPTED**
