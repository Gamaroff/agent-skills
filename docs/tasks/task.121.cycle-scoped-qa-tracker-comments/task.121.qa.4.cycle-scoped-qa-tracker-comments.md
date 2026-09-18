# QA Report: Task 121 - QA tracker comments are keyed per stage, so every QA cycle after the first is silently dropped

**Task**: [Link to task document](./task.121.cycle-scoped-qa-tracker-comments.md)
**Gate File**: [task.121.gate.4.cycle-scoped-qa-tracker-comments.yml](./task.121.gate.4.cycle-scoped-qa-tracker-comments.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-18
**Testing Completed**: 2026-09-18
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle-4 re-review of PR #430 at head `61f20fea`, narrowed to the files changed since gate 3. All six cycle-3 findings are fixed and the three that carry tests are mutation-covered against the committed state; the live tracker comments now come from a tracker block run as its own shell from the repo root. The narrowed review found two mediums with one theme — the new mechanism's own guards do not yet fail on the shapes they were written for: the inline-derivation guard is tested per line and misses the two-line continued spelling the task started from (BUG-5), and the six helper invocations swallow *not-found* as *refused* while the three PR-lead blocks still mix repo-root `.claude/state` paths with skill-relative calls (BUG-6). Four lows. No HIGH; HIGH sequence 0, 0, 0, 0.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete · [x] All phases completed · [x] Tests passing · [x] Breaking changes documented · [x] Feature branch with open PR (#430, OPEN)

### Testing Approach

- [x] Automated Testing (`npm run ci:fast` at 61f20fea; PR CI) · [x] Regression · [x] Security Review (reasoned) · [x] Code Review (Step 3b, narrowed) · [x] Mutation-proof spot check (Step 3c) · [x] Documented-command execution (Step 4b)

### Review Methodology

Direct tools + one read-only reviewer over the narrowed diff (`PRIOR_GATES=3`; gate 3 security `PASS reasoned` → `SAFETY_REPROBE=false`). `code_review_blocking=true`; three `bug`/`high`-confidence findings (CR-1, CR-2, CR-4) — CR-1 → BUG-5 (medium), CR-2 merged with CR-3 → BUG-6 (medium), CR-4 low. Step 4b: engine classified every changed block `mutating`/`placeholder` (recorded). Platform variance: `TMPDIR=/tmp` run of the test → 20/20.

```
Re-review scope: since 2026-09-18T06:12:00Z (default) — 11 source/doc files (bundled copies excluded)
```

---

## Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| TASK-121-BUG-4 (medium) — tracker blocks' helper path form | **FIXED** → Closed | all three tracker blocks use `.agents/skills/<skill>/references/qa-cycle.sh`; from the repo root the helper resolves (prints 3); reverting qa-story's to skill-relative → path-form guard red naming line 1927 → `covered`; `qa-fix-3` posted from a root-cwd shell |
| CR-2 (low) — inherited-values sentence | **FIXED** | present in all six blocks |
| CR-3 (low) — 64-bit overflow | **FIXED** | `[0-9]{1,9}` + `10#`; removing the bound → CR-3 tests red (bash) → `covered` |
| CR-4 (low) — qa-story step numbers | **FIXED** | zero "Step 13" left |
| CR-5 (low) — inline guard breadth | **FIXED** (one-line forms) → **BUG-5** (continued form) | `grep -oE '\.gate\.[0-9]+'` reinserted → guard red → `covered`; two-line form → not caught (see New Findings) |
| CR-6 (low) — tree example | **FIXED** | nested `epics/…/stories/story.1.1.story-name/` |

---

## New Findings This Cycle

- **[medium]** `tests/qa-cycle.test.js:172` — `INLINE_DERIVATION` is per-line; the original two-line `FIX_CYCLE=$(ls -t … | head -1 \` + `| sed -nE '…([0-9]+)…'` matches on neither line, only when joined (verified) → join continuations; fixture. **→ BUG-5**
- **[medium]** `skills/qa-task/SKILL.md:1361` (all six sites) — `|| QA_CYCLE=` maps rc 127/126 onto the same empty value as rc 1 (verified: nonexistent helper → `[]`), the message blames a helper that never ran; **and** `:1284` (PR-lead blocks ×3) — `.claude/state/…` is repo-root-relative while `bash references/qa-cycle.sh` / `node references/stakeholder-summary-cli.js` are skill-relative, so from the repo root the new helper call exits 127 and is swallowed → rc check; repo-root form in the PR-lead blocks; `.claude/state/` as a root-form signal in the guard. **→ BUG-6**
- **[low]** `skills/qa-fix/SKILL.md:911` — the tracker block writes `comment-body.md` from `$TRACKER_COMMENT_BODY`, computed in the PR-lead block — empty under the premise the block itself states. **→ CR-4**
- **[low]** `shared/resources/qa-cycle.sh:53` — `gate.0` → cycle `0` (verified); engine accepts `qa-gate-0`, the `cycle` slot drops it → zero is un-numbered. **→ CR-5**
- **[low]** `skills/qa-fix/SKILL.md:950` — callout still names `references/qa-cycle.sh` in the block that now uses the root form. **→ CR-6**
- **[low]** `tests/qa-cycle.test.js:54` — mkdtemp fixtures never removed. **→ CR-7**

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine | PASS | Verified | Unchanged. |
| Phase 2: call sites | CONCERNS | Verified with findings | Tracker blocks correct; PR-lead blocks and the rc handling → BUG-6; CR-4 body-file placement. |
| Phase 3: contract + guard | CONCERNS | Verified with findings | Guards covered for one-line forms; BUG-5 continued form. |

---

## Success Criteria Verification

**Functional** — live: #421 carries `qa-gate-1..3`, `qa-fix-1..3`; this report posts `qa-gate-4`. On the literal prose: tracker blocks now resolve from the repo root (PASS); PR-lead blocks do not (BUG-6, CONCERNS — the PR comment, not the tracker marker). **Performance** PASS · **Code Quality** PASS (ci:fast green; four proofs) · **Migration** PARTIAL (#75 with `/finalise`).

---

## Breaking Changes Validation

Unchanged — **PASS**.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: inline-derivation guard blind to the continued two-line form** — [task.121.bug.5.inline-derivation-guard-blind-to-continued-lines.md](./task.121.bug.5.inline-derivation-guard-blind-to-continued-lines.md) — P2.

**Issue: helper exit codes conflated; PR-lead blocks mix cwds** — [task.121.bug.6.helper-exit-codes-conflated-and-pr-lead-blocks-mix-cwds.md](./task.121.bug.6.helper-exit-codes-conflated-and-pr-lead-blocks-mix-cwds.md) — P2.

### LOW Severity Issues (4)

CR-4 body file written in the wrong block · CR-5 `gate.0` · CR-6 stale callout · CR-7 tmp leak.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 4

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
BUG-6.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 — unchanged surface.
### Maintainability — CONCERNS
BUG-5; CR-6; CR-7.

---

## Code Review

Step 3b — narrowed diff (11 files, 1815 lines), read-only reviewer; `code_review_blocking=true`. 5 bugs + 2 cleanups returned; CR-1 → BUG-5, CR-2 + CR-3 → BUG-6, CR-4/CR-5 low bugs, CR-6/CR-7 cleanups. `boundary: false`, `probes_executed: 0`.

**Mutation proofs (Step 3c, committed state, `cp`-restore, tree verified unchanged):**
- mutation-proven: qa-story tracker helper reverted to skill-relative → `within one block, the helper is addressed the way the block's engine call is` naming line 1927 → covered
- mutation-proven: `[0-9]{1,9}` bound removed → `[bash] a run of more than 9 digits …` → covered
- mutation-proven: `grep -oE '\.gate\.[0-9]+'` one-line derivation inserted in qa-fix → `no shipped skill carries an inline gate-number derivation` → covered
- **not covered**: the two-line continued form (BUG-5) — inserted the original spelling: no red.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` at 61f20fea | PASS — 3436 tests, 3435 pass, 0 fail, 1 skipped |
| `npm run bundle:check` | PASS |
| ShellCheck | PASS |
| PR #430 CI at 61f20fea | Branch Policy, ShellCheck, Validate Skills pass; Test / link check in progress at review time |
| `tests/qa-cycle.test.js` (bash + zsh; `TMPDIR=/tmp`) | PASS — 20/20 |

---

## Test Artifacts

```bash
npm run ci:fast; npm run bundle:check; command node --test tests/qa-cycle.test.js
bash .agents/skills/qa-task/references/qa-cycle.sh docs/tasks/task.121.cycle-scoped-qa-tracker-comments   # 3 (from repo root)
QA_CYCLE=$(bash nonexistent/qa-cycle.sh x 2>/dev/null) || echo "rc=$? → [$QA_CYCLE]"   # BUG-6: rc=127 → []
d=$(mktemp -d); touch $d/task.1.gate.0.x.yml; bash shared/resources/qa-cycle.sh $d   # CR-5: 0
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-5 — join continuations in the guard; two-line fixture.
2. BUG-6 — rc check at six sites; repo-root form for helper + lead CLI in the PR-lead blocks; `.claude/state/` as a root signal in the guard.
3. CR-4, CR-5, CR-6, CR-7.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100
**Rationale**: cycle-3 fixes verified and covered; the residue is the mechanism's own guards not yet failing on the shapes they exist for, plus the PR-lead blocks' cwd mix. No HIGH across four cycles; converging.
**Deployment Recommendation**: CONDITIONAL — BUG-5 and BUG-6 fixed with guards; lows addressed or waived.

---

**QA Report**: `task.121.qa.4.cycle-scoped-qa-tracker-comments.md` · **Gate File**: `task.121.gate.4.cycle-scoped-qa-tracker-comments.yml`
**Next Steps**: `/qa-fix` on the six open entries, then cycle-5 re-review (final cycle of the budget).
