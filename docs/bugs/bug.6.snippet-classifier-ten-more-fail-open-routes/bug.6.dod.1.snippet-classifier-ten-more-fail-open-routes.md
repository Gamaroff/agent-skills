---
type: dod-report
status: accepted
description: 'Definition of Done verification for bug.6 — snippet classifier fail-open routes.'
created: '2026-09-05'
updated: '2026-09-05'
verifies: 'bug.6.snippet-classifier-ten-more-fail-open-routes'
---

# Definition of Done — bug.6.snippet-classifier-ten-more-fail-open-routes

**Verdict: ✅ ACCEPTED**

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | The reported defect no longer reproduces | ✅ PASS | All 13 claimed inputs re-probed through `classifyBlock()` at HEAD: 0 of 20 misclassified (13 routes + 7 controls). Both over-refusals now `runnable`. |
| 2 | A regression test fails without the fix | ✅ PASS | `BUG6_FAIL_OPEN` (13) + `BUG6_OVER_REFUSED` (2) in the replay corpus assert **both** ends: all 13 reach `runnable` at the pre-fix commit `0c4c05f` and none does in shipped code; the over-refusals are `mutating` there and `runnable` here. The corpus cannot pass vacuously. |
| 3 | Root cause addressed, not the symptom | ✅ PASS | Four causes (A–D) rather than 13 patches. The report's own suggested fix (extend the splitter with three keyword names) was shown insufficient and replaced with segment scanning. |
| 4 | No regressions introduced | ✅ PASS | 89 unit + replay tests green. **Three self-inflicted regressions and two new fail-opens were caught and closed before merge** — see criterion 8. |
| 5 | Every fix is mutation-proven | ✅ PASS | 9 proofs: A→2 failures, B→1, C→1, D→3, unterminated-quote→1, V1→1, V3→1, V4→1, V5→1. Each asserts its own application after one proof was found reporting green on an edit that never landed. |
| 6 | Bundled copies regenerated, never hand-edited | ✅ PASS | `npm run bundle` idempotent; all five `skills/*/references/qa-execute-snippets.mjs` byte-identical to source modulo the generated header. |
| 7 | Bug record complete | ✅ PASS | Investigation, Fix Implementation ×2, QA Verification ×2, Status History (6 rows), Resolution Summary. Review report and implementation report co-located. |
| 8 | Adversarial review of the fix itself | ✅ PASS | An independent review of the diff found 5 defects in the fix, **2 of them new fail-opens** (`$()` inheriting the `-o` exemption; `gitSubcommand` reading the wrong token slice). All 5 fixed in Iteration 2 and pinned by tests. |
| 9 | Registry consistency | ✅ PASS | `docs/bugs/bug-registry.md` row 6 → `closed`, committed atomically with the bug file. |
| 10 | Full test suite | ✅ PASS | `npm test` — **2466 tests, 2465 pass, 0 fail, exit 0** (1 skipped: the replay corpus's pre-fix half, which needs full git history). Shell layers 14 + 401 + 30 + 3 + 9 + 6 + 2, all 0 failed. |

## Known gap, accepted deliberately

The new `sed w write` rule requires whitespace after `w`, so a glued GNU-sed form
(`sed 's/a/b/wpwned.txt' f`) remains `runnable`. It is outside bug.6's reported set, and every
pattern tried for it produced false positives on ordinary text (`sed 's/warning/x/' f` matches
any `/w…` shape). Recorded in the bug's Resolution Summary and left to `task.79`'s shared
adversarial corpus rather than closed with another fragile regex.

## The finding worth carrying forward

A 13-input corpus was fully green while the fix carried two brand-new fail-open routes. A corpus
answers "did the reported bug go away?"; it does not answer "what did this change make reachable?"
On a fail-open defect those are different questions, and only the second one caught V1 and V3.
