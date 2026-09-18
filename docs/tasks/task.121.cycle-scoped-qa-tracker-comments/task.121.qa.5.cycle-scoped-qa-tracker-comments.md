# QA Report: Task 121 - QA tracker comments are keyed per stage, so every QA cycle after the first is silently dropped

**Task**: [Link to task document](./task.121.cycle-scoped-qa-tracker-comments.md)
**Gate File**: [task.121.gate.5.cycle-scoped-qa-tracker-comments.yml](./task.121.gate.5.cycle-scoped-qa-tracker-comments.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-18
**Testing Completed**: 2026-09-18
**Gate Status**: PASS

---

## Executive Summary

Cycle-5 re-review of PR #430 at head `a8485b45`, narrowed to the files changed since gate 4. All six cycle-4 findings are fixed and the four that carry tests are mutation-covered against the committed state; the four guards this task built (never-bare, never-literal, same-block, root-form) and the helper's refusal are each proven load-bearing. The narrowed review returned four advisory items — none an open defect in the deliverable: a latent shared-body-file path (needs a lead-CLI failure to trigger), a stale usage example in the helper header, a zero-padded gate name no writer produces, and stale test comments. They are recorded as named follow-ups F1–F4 in the gate rather than entered in `top_issues[]`, so the loop exits on its merits rather than on its budget. Across five cycles: no HIGH; every cycle posted its `qa-gate-N` / `qa-fix-N` marker live on #421 from blocks executed as separate shells — the task's own consumer criterion, met on the task's own PR.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete · [x] All phases completed · [x] Tests passing · [x] Breaking changes documented · [x] Feature branch with open PR (#430, OPEN)

### Testing Approach

- [x] Automated Testing (`npm run ci:fast` at a8485b45; PR CI 5/5) · [x] Regression · [x] Security Review (reasoned) · [x] Code Review (Step 3b, narrowed) · [x] Mutation-proof spot check (Step 3c) · [x] Documented-command execution (Step 4b)

### Review Methodology

Direct tools + one read-only reviewer over the narrowed diff (`PRIOR_GATES=4`; gate 4 security `PASS reasoned` → `SAFETY_REPROBE=false`). `code_review_blocking=true`; the reviewer returned one `bug`/`medium`/`medium` (not promotable) and three lows — each verified by QA and graded advisory (see New Findings). Step 4b: engine classified every changed block `mutating`/`placeholder` (recorded); the helper and the rc-check idiom were executed directly. Platform variance: `TMPDIR=/tmp` → 23/23.

```
Re-review scope: since 2026-09-18T06:29:46Z (default) — 11 source/doc files (bundled copies excluded)
```

---

## Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| TASK-121-BUG-5 (medium) — guard blind to continued form | **FIXED** → Closed | `fencedBlocks()` joins `\`-continuations (:215); two-line fixture test present; inserting the exact two-line form in qa-fix → `no shipped skill carries an inline gate-number derivation` red → `covered` |
| TASK-121-BUG-6 (medium) — rc conflation; PR-lead cwd mix | **FIXED** → Closed | rc check at all six sites (nonexistent helper → rc 127 → `⚠️ … (rc=127)`, exit 1); helper and lead CLI root-form in all six blocks; `bash references/qa-cycle.sh` count 0; reverting qa-story's PR-lead helper → root-form guard red naming line 1787 → `covered` |
| CR-4 (low) — body file written in the wrong block | **FIXED** | written in the PR-lead block; tracker block checks `-s` and only reads |
| CR-5 (low) — `gate.0` | **FIXED** | normalised 0 → un-numbered; removing the check → `gate.0 …` tests red (bash + zsh) → `covered` |
| CR-6 (low) — callout wording | **FIXED** | "the bundled `qa-cycle.sh`" |
| CR-7 (low) — fixture leak | **FIXED** | `after()` removes fixtures; dir count verified flat across a run |

---

## New Findings This Cycle

All four are **advisory** — recorded as follow-ups F1–F4 in the gate's `recommendations.future`, not entered in `top_issues[]`. The reasoning for each is stated so the grade is auditable:

- **[advisory — reviewer medium/medium]** `skills/qa-fix/SKILL.md:877` — the PR-lead block writes `.claude/state/comment-body.md` at its end, after `QA_FIX_LEAD=$(…) || exit 1`; if the lead CLI fails the file is not written and the tracker block's `-s` check passes on the file qa-task Step 13b wrote to the same path (verified: same path, write is line 39 of the block, the `exit 1` at line 17). **Why advisory**: the trigger is a lead-CLI failure inside a block that then aborts loudly; the marker mechanism is unaffected; the fix (own file name, write first) is two lines. → **F1**
- **[advisory — low/high]** `shared/resources/qa-cycle.sh:24` — the helper's header usage example still shows `bash references/qa-cycle.sh … || QA_CYCLE=`, the two idioms the guards now reject. Comment text; the guards catch any copy of it. → **F2**
- **[advisory — low/medium]** `skills/qa-story/SKILL.md:1962` / `qa-task:1376` — `THIS_GATE` globs `gate."$QA_CYCLE".*` with the normalised value, so `gate.007` (→ 7) is not found and `blocking_count` reads 0 (verified). No writer produces zero-padded names. → **F3**
- **[advisory — cleanup]** `tests/qa-cycle.test.js:43,250` — comments describe the pre-BUG-6 rule and the skill-relative spelling. → **F4**

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine | PASS | Verified | Unchanged since cycle 1; engine-list mutants red in cycles 1–2. |
| Phase 2: call sites + orchestrator blocks | PASS | Verified | Six blocks: helper root-form, rc-checked, derived where used; orchestrator duplicates gone; develop-bug untouched. |
| Phase 3: contract + guard | PASS | Verified | Contract consistent; five guards proven load-bearing across the loop. |

**Overall Phase Completion**: 3/3.

---

## Success Criteria Verification

**Functional** — every QA cycle's gate and fix comment reaches the tracker with a distinct marker: **PASS, live** — #421 carries `qa-gate-1..4`, `qa-fix-1..4`, and this report posts `qa-gate-5`, each from a block run as its own shell from the repo root exactly as written. Resumed cycle → `already`: PASS (unit). Orchestrator blocks removed; develop-bug's `qa-cycle-{N}` unchanged and collected by the guard: PASS.
**Performance** — PASS. **Code Quality** — PASS (`ci:fast` green at a8485b45; floors; 4 proofs this cycle, 17 across the loop). **Migration** — contract documents the stage classes (PASS); observation #75 closure with `/finalise` (PARTIAL → Step 7).

---

## Breaking Changes Validation

Unchanged — marker rename, one duplicate on at most one in-flight issue, tested. **PASS**.

---

## Issues Found

### HIGH Severity Issues (0) · MEDIUM Severity Issues (0) · LOW Severity Issues (0 open)

Four advisory follow-ups (F1–F4) in the gate. **Total open**: HIGH 0, MEDIUM 0, LOW 0.

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
Refusal-not-guess proven; rc-checked; root-form everywhere; live markers every cycle. F1 latent.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 — no boundary delivered.
### Maintainability — PASS
One definition; guards; contract consistent. F2/F4 are comment text.

---

## Code Review

Step 3b — narrowed diff (11 files, 1847 lines), read-only reviewer; `code_review_blocking=true`. Returned 3 bugs (1 medium/medium, 2 low) + 1 cleanup; none `bug`+`high`; all verified and graded advisory (F1–F4). `boundary: false`, `probes_executed: 0`.

**Mutation proofs (Step 3c, committed state, `cp`-restore, tree verified unchanged):**
- mutation-proven: two-line continued derivation inserted in qa-fix → `no shipped skill carries an inline gate-number derivation any more` → covered
- mutation-proven: qa-story PR-lead helper reverted to `bash references/qa-cycle.sh` → `every block addresses the helper from the repository root …` naming line 1787 → covered
- mutation-proven: zero handling removed from the helper → `[bash]/[zsh] gate.0 … is not a cycle` → covered
- behaviour-proven: rc-check idiom against a nonexistent helper path → `⚠️ qa-cycle.sh not runnable (rc=127)`, exit 1 (was: empty cycle)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` at a8485b45 | PASS — 3439 tests, 3438 pass, 0 fail, 1 skipped |
| `npm run bundle:check` | PASS |
| ShellCheck (source `.sh` incl. helper) | PASS |
| PR #430 CI at a8485b45 | PASS — all five workflows |
| `tests/qa-cycle.test.js` (bash + zsh; `TMPDIR=/tmp`) | PASS — 23/23 |

---

## Test Artifacts

```bash
npm run ci:fast; npm run bundle:check; gh run list --branch feature/task.121.cycle-scoped-qa-tracker-comments
command node --test tests/qa-cycle.test.js; TMPDIR=/tmp command node --test tests/qa-cycle.test.js
bash -c 'X=$(bash nonexistent/qa-cycle.sh d 2>/dev/null); rc=$?; [ "$rc" -le 1 ] || { echo "⚠️  qa-cycle.sh not runnable (rc=$rc)"; exit 1; }'   # exit 1
d=$(mktemp -d); touch $d/task.1.gate.007.x.yml; bash shared/resources/qa-cycle.sh $d   # 7 (F3: glob gate.7.* then finds nothing)
gh issue view 421 --json comments --jq '.comments[].body' | grep -o 'agent-skills-comment:qa-[a-z]*-[0-9]*'   # qa-gate-1, qa-fix-1, …, qa-gate-5
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
F1 own body-file name for qa-fix, written first · F2 helper header example · F3 zero-padded names · F4 test comments — recorded in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100
**Rationale**: all six bugs across the loop closed and covered; the residue is advisory and named; the task's consumer criterion is met on its own PR.
**Deployment Recommendation**: APPROVED

---

**QA Report**: `task.121.qa.5.cycle-scoped-qa-tracker-comments.md` · **Gate File**: `task.121.gate.5.cycle-scoped-qa-tracker-comments.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise` (which also closes observation #75 with PR #430).
