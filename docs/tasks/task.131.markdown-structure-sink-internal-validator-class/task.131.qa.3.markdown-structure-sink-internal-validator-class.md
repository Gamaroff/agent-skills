# QA Report: Task 131 - A markdown-structure sink and an internal-artefact decision for the security probe (cycle 3)

**Task**: [Link to task document](./task.131.markdown-structure-sink-internal-validator-class.md)
**Gate File**: [task.131.gate.3.markdown-structure-sink-internal-validator-class.yml](./task.131.gate.3.markdown-structure-sink-internal-validator-class.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-131-CR-2-1 / BUG-3: internal precondition unenforced | FIXED (matching rule → QA-5) | The entry-bearing reason, the disqualified table and the Step 3c/3d override are present and mutation-proven. The comparison rule is missing (QA-5). |
| TASK-131-QA-2 / BUG-4: bug-mode template | FIXED | The template offers `internal`. The enumeration now reaches `assets/`, floor 5, exactly 5 matches. |
| TASK-131-QA-3 / BUG-5: /review-security sinks + `--args-json` | FIXED (test vacuous → CR-3-1) | The prompt is updated. The guard test is satisfied by any mention (CR-3-1). |
| TASK-131-QA-4: empty-reason split | FIXED | Step 3c and 3d state the same four conditions. |

## Review Methodology

Direct tools plus one independent reviewer. Re-review scope: since gate 2 (default). The scope covers the 18 files changed in `cbddca41..751d82ad`, diffed against `origin/develop` (1,559 lines). Step 4b over the two newly changed prose files: `no-executable-blocks` and no fenced bash, respectively. `validate` passes for finalise and review-security.

---

## New Findings This Cycle

- **[medium]** `shared/resources/tests/security-input-corpus.test.mjs:579`: the sink-enumeration test is satisfied by a backticked mention anywhere, and would have passed on `develop`'s drift. [bug 6](./task.131.bug.6.sink-enumeration-test-vacuous.md)
- **[medium]** `skills/finalise/SKILL.md:510`: no matching rule between a full `path#export` and the basename table row. [bug 7](./task.131.bug.7.disqualified-entry-matching-rule.md)
- **[low]** `shared/resources/finalise-dod-security-prompt.md:76`: the table row swallowed the next paragraph.
- **[low]** `shared/resources/finalise-dod-security-prompt.md:269`: the prompt's FAIL instruction covers only the missing reason; Step 3c expects all invalid shapes.

---

## NFR Assessment

### Security — PASS
- **Evidence**: measured
- **Probes executed**: 15
- `lintReport` engages. Record: `task.131.qa.3.security.run.json`.

### Performance / Reliability / Maintainability — PASS

---

## Code Review

boundary: true — `report-lint.js#lintReport`, probed. `probes_executed: 15`.

- [medium/high] CR-1 → **TASK-131-CR-3-1** (gate)
- [medium/medium] CR-2 → verified, raised as **TASK-131-QA-5**
- [low/high] CR-3 → **TASK-131-CR-3-3** (gate)
- [cleanup, verified] CR-4 → raised as **TASK-131-QA-6** (low). It is a contract disagreement, not style.

Trend: HIGH 0 for three gates. MEDIUM 2 → 3 → 2. Each cycle's findings are inside the previous cycle's fixes, all on the `internal` enforcement and its guards.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL (BUG-6, BUG-7)
**Next Steps**: `/qa-fix` on gate 3.
