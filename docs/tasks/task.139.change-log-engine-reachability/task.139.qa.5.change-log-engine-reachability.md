# QA Report: Task 139 - The Change Log engine is unreachable from a skill whose prose runs it

**Task**: [task.139.change-log-engine-reachability.md](./task.139.change-log-engine-reachability.md)
**Gate File**: [task.139.gate.5.change-log-engine-reachability.yml](./task.139.gate.5.change-log-engine-reachability.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-22
**Testing Completed**: 2026-09-22
**Gate Status**: CONCERNS (no open entry)

---

## Executive Summary

Cycle 5 — the last budgeted cycle — verifies every cycle-4 closure by execution (CRLF, opener retry, indented fence, ref-def prose, `documentPath: README.md` refused, `--root` error names `--root` in text and JSON) and scans the wider tree (1,738 tracked `.md`: two open fences, both pre-existing malformed artifacts that open under the old rule too). Four low findings, none meeting the promotion bar. One is a genuine design concern rather than a nit: the evaluator's `WORK_ITEM_ARTIFACT_RE` and the corpus guard's `ARTIFACT_RE` are two hand-kept deny-lists that already disagree inside this PR and both miss `validate`/`audit` artifacts — the enumeration class `docs/reference/anti-patterns.md` names. It is recorded as a Maintainability reservation with the one-predicate fix (basename stem == parent directory name) named for the follow-up. Nothing is open; the gate hands to 5c.

**Overall Assessment**: CONCERNS — reservation, not a fix list
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

Re-review scope: since 2026-09-22T07:14:52Z (gate.4; default narrowing). 8 files; 1,392-line scoped diff.

| Prior issue | Status | Verification |
| --- | --- | --- |
| C4-CR-1 CRLF | **FIXED** | `` `o [x]…\r\n\r\n… `` → x, y, z; CRLF open fence reported at line 1; mutation-proven in 5b |
| C4-CR-2 documentPath | **FIXED** | `README.md`, `docs/README.md`, `src/…`, `../…`, a QA report all refused; story and bug documents admitted; mutation-proven |
| C4-CR-3 opener lookbehind | **FIXED** | `` ``[x](a.md)` then [y](b.md) `` → a, b; mutation-proven this cycle |
| C4-CR-4 indented fence | **FIXED** | list-item fence → only `c.md` |
| C4-CR-5 ref-def / escaped | **FIXED** | `[Note]: see below` ignored; `\[not\](a.md)` ignored |
| C4-CR-6 repo once | **FIXED** | corpus guard ~0.4 s |
| C4-CR-7 header | **FIXED** | describes per-paragraph stripping and the indent trade-off |
| C4-CR-8 operand errors | **FIXED** | `--root /nope` → `--root /nope: ENOENT…` (text and `--json`) |

---

## New Findings This Cycle

- **[low/high]** `doc-links.js:67` — a bare ``` inside a 4+-space indented code block opens a fence that never closes → false open-fence red (0 instances in the tree). (C5-CR-1)
- **[low/high]** `finalise-fix-and-recheck.mjs:70` — two hand-kept artifact deny-lists (evaluator vs corpus guard) already differ and both miss `validate`/`audit`; 14 real artifacts pass `isWorkItemDocument`. **Maintainability reservation.** (C5-CR-2)
- **[cleanup]** `(?<!\\)` treats an escaped backslash as an escape → `\\[t](c.md)` never checked (safe direction). (C5-CR-3)
- **[cleanup]** corpus guard walks no bug reports while the evaluator admits them. (C5-CR-4)

None promoted (all low). Recorded in `recommendations.future`; C5-CR-2 also in `nfr_validation.maintainability`.

---

## Implementation Verification

Phases 1–4 unchanged since gate.2 (PASS). obs #154 addition: PASS with the reservation above.

## Success Criteria Verification

SC1–SC7 unchanged (all PASS).

## Breaking Changes Validation

None. PASS.

## Issues Found

HIGH: 0 · MEDIUM: 0 · LOW: 4 (advisory)

## NFR Assessment

Performance PASS · Reliability PASS · Security PASS (reasoned, boundary: false, probes 0) · Maintainability **CONCERNS** (C5-CR-2)

## Code Review

Step 3b — blocking, scoped. 2 bugs + 2 cleanups, all low; none promoted. Mutation-proven this cycle: opener lookbehind removed → C4-CR-3 test red → `covered`. Step 4b: unchanged (pre-existing placeholders only).

## Regression Testing

`npm run ci:fast` 3907/3907 · `npm run bundle:check` 0 problems · `doc-links.test.mjs` 15/15 · `finalise-fix-and-recheck.test.mjs` 23/23

## Recommendations

**Immediate**: none. **Follow-up**: C5-CR-2 (one predicate for "is a work-item document", exported and shared), C5-CR-1, C5-CR-3, C5-CR-4, plus the carried cycle-2 / 5c advisories.

## Final Assessment

**Gate Status**: CONCERNS (no open entry) · **Quality Score**: 90/100 · **Deployment**: APPROVED

**Next Steps**: 5c `/review-pr`, then `/finalise`.
