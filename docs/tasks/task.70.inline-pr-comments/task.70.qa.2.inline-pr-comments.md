# QA Report: Task 70 — cycle 2 (refute pass)

**Task**: [Link](./task.70.inline-pr-comments.md)
**Gate File**: [task.70.gate.2.inline-pr-comments.yml](./task.70.gate.2.inline-pr-comments.yml)
**Previous cycle**: [task.70.qa.1.inline-pr-comments.md](./task.70.qa.1.inline-pr-comments.md) — FAIL (50/100) → PASS after fixes
**Review Date**: 2026-09-02
**Gate Status**: PASS (92/100)

---

## Executive Summary

Cycle 2 ran as a **refute pass** over the whole branch diff, targeting cycle 1's own fixes as the least-reviewed code in the change set. It found **eight further defects**, two of which drop findings silently and neither of which existed before cycle 1 touched the file. All eight are fixed; one is deliberately deferred with a stated reason.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

**Re-review scope**: unscoped — whole `origin/develop...HEAD` diff, per the cycle-2 refute rule.

Narrowing to "files changed since the last gate" would have read only cycle 1's repairs and never re-read the original change with what cycle 1 had learned. That is the documented reason the rule exists, and it paid: **TASK70-C2-002** (pagination) and **TASK70-C2-006** (fail-open jq) were both present in the original commit and invisible to cycle 1.

**Re-Review Context** — all nine cycle-1 issues verified FIXED, each with a mutation proof (see cycle-1 report's Bug Resolution Summary). None regressed.

---

## New Findings This Cycle

Eight. Two HIGH, six MEDIUM. Full detail with failure scenarios in the gate file.

### The two that drop findings

- **TASK70-C2-001** — the call sites fed `id: .id` to the CLI as a cross-run identity, but both producers define `id` as `CR-{n}` / `PC-{n}` and comment it *"stable within this run"*. It is an ordinal. The CLI's own docstring asserted the opposite as fact, which is why cycle 1's body-hash fix never engaged for either real caller. On run 2 of a qa-fix loop, `CR-1` names a different finding: GitHub sees the marker, finds the anchor changed, and degrades the perfectly anchorable new finding — every cycle, forever — while a comment about an already-fixed bug sits on the PR. Bitbucket, before C2-003, overwrote the wrong comment and reported `updated`.

- **TASK70-C2-002** — `gh api --paginate` emits **one JSON document per page**, not a merged array. Without `--slurp`, `JSON.parse` rejects the concatenation. At the default 30 comments per page, any PR past its first page threw in the marker scan, degraded every finding to `unverifiable`, and silently reverted the module to the summary-only behaviour it exists to replace — on precisely the busiest PRs. The test stub returned a single array, so it *structurally could not* produce the failing shape.

### The one that shows a fix breaking a neighbour

- **TASK70-C2-005** — cycle 1 correctly made every `unverifiable` site also push to `degraded`. That silently made the run-level `unverifiable` branch unreachable, because it tested `!degraded.length`. The reason documented in the contract could no longer be emitted, and `--strict` could never report the one condition it exists to report. A green suite throughout: no test covered the branch.

### The rest

- **TASK70-C2-003** — the Bitbucket arm had no stale-anchor check; the contract excused this with "Bitbucket has no equivalent of `position: null`", which is true and beside the point. The comparisons that fire are path and line, and Bitbucket returns `inline.path`/`inline.to` on every inline comment. Both arms now behave identically, and the contract no longer documents a limitation that is not real.
- **TASK70-C2-004** — the batch fallback retried on *any* error, including a transport failure on a request the server accepted. That posts a duplicate per marker, and the next run then refuses to post or edit anything for that PR, permanently. A five-cycle loop converged to "never comments again".
- **TASK70-C2-006** — the jq was fail-open in the wrong direction. One `file_line` of `src/x.ts:42-58` aborted the whole program, emptied `$INLINE_FILE`, and dropped every finding in the run.
- **TASK70-C2-007** — the guard fixture added in cycle 1 invented `file_line` on conformance findings, which use `ref`. It tested a shape production never emits, and `assert.ok(out.length > 0)` was satisfied by the code_review entry alone — so it would have passed with the conformance arm entirely broken.
- **TASK70-C2-008** — the summary comment has no marker (deferred, below).

---

## Mutation Proofs — cycle 2

| Behaviour reverted | Result | mutation-proven |
|---|---|---|
| Drop `--slurp` from the marker scan | §4 multi-page test red | yes |
| Trust the caller id as identity (drop the hash) | §9 namespace test red | yes |
| Remove the jq `test()` shape guard | both skill guards red | yes |

Across both cycles: **seven proofs**, each turning exactly its own assertion red and each restored to green.

---

## Deliberately deferred

- **TASK70-C2-008 — the summary comment's marker.** Real (five cycles leave five near-identical summaries, and handover-verify's first-line heuristic goes ambiguous once two exist), but it changes the summary comment's identity semantics rather than fixing a finding-loss path. It belongs in its own change.
- **Extracting one `partitionFindings()`.** The two arms carry near-duplicate ladders, and that divergence is exactly what produced the cycle-1 Bitbucket gap — a rule added to one arm silently missing the other. This is the right structural follow-up, but it is a refactor of working, tested code and does not belong at the end of a fix cycle. Recorded as the Maintainability CONCERNS.
- **`findings[]` empty on a deferred run**, while the contract tells callers to read per-finding reasons. Cosmetic in effect; listed in the gate's `future`.

---

## Regression Testing

| Area | Result |
|---|---|
| `pr-inline-comment` unit suite | 47/47 |
| `review-code` + `review-pr` contract suites | 65/65 |
| Full `npm run ci:fast` | green |
| CI on PR #308 | all four checks pass |

---

## Final Assessment

**Gate**: PASS · **Quality Score**: 92/100 · **Deployment**: APPROVED

**Rationale**: Every path that can fail to anchor now degrades and says so, on both arms, and each is held by a test that fails when the behaviour is reverted. The score is 92 rather than higher because of the duplicated partition ladders — a real maintainability risk that has already caused one defect in this very task, and the reason the follow-up is named rather than waved at.

**What this cycle demonstrates about the pipeline itself**: cycle 1 fixed nine defects and introduced the conditions for two more. A refute pass that re-reads the *whole* diff — not just the repairs — is what caught them. A narrowed cycle 2 would have read only the fixes and passed.
