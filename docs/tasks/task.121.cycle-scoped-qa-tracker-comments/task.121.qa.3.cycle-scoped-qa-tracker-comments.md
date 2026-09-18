# QA Report: Task 121 - QA tracker comments are keyed per stage, so every QA cycle after the first is silently dropped

**Task**: [Link to task document](./task.121.cycle-scoped-qa-tracker-comments.md)
**Gate File**: [task.121.gate.3.cycle-scoped-qa-tracker-comments.yml](./task.121.gate.3.cycle-scoped-qa-tracker-comments.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-18
**Testing Completed**: 2026-09-18
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle-3 re-review of PR #430 at head `6bbff589`, narrowed to the files changed since gate 2. All four cycle-2 findings are fixed and mutation-covered against the committed state: the `qa-cycle.sh` helper refuses rather than guesses (proven under bash and zsh), every block that passes a cycle-scoped stage calls it, no inline derivation remains, qa-story's naming section is numbered, the contract is consistent, and the live tracker comments now come from blocks executed as separate shells (`qa-fix-2` posted with the cycle re-derived in-block). The narrowed review found one MEDIUM: the three tracker blocks address the helper skill-dir-relatively beside an engine call addressed from the repo root, so from the cwd the block assumes the helper is not found and the post is skipped every cycle (BUG-4). Five lows. No HIGH; HIGH sequence 0, 0, 0.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#430, OPEN, base develop)

### Testing Approach

- [x] Automated Testing (`npm run ci:fast` at 6bbff589; PR CI 5/5 incl. Test)
- [x] Regression Testing
- [x] Security Review (reasoned — unchanged surface)
- [x] Code Review (Step 3b — narrowed diff, read-only Explore reviewer)
- [x] Mutation-proof spot check (Step 3c — cycle-2 proofs re-run against committed state)
- [x] Documented-command execution (Step 4b — engine; helper exercised directly)

### Review Methodology

Direct tools + one read-only reviewer over the narrowed diff. `PRIOR_GATES=2` → cycle 3+ scope; gate 2's security axis `PASS reasoned` → `SAFETY_REPROBE=false`. `code_review_blocking=true`; the reviewer rated CR-1 `bug`/`high`/`medium` — QA verified and recorded it at **MEDIUM** (BUG-4): the PR-lead blocks already carry the skill-dir cwd assumption via `node references/stakeholder-summary-cli.js`, so the defect is a path-form inconsistency confined to the three tracker blocks, and the fix is an alignment. Step 4b: engine again classified every changed block `mutating`/`placeholder` (recorded); the helper was executed directly on fixture directories under both shells. Platform variance: `TMPDIR=/tmp` run of the new test → 15/15.

```
Re-review scope: since 2026-09-18T04:01:52Z (default) — 13 source/doc files (bundled copies excluded)
```

---

## Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| TASK-121-BUG-2 (medium) — cycle crosses blocks; `:-1` guesses | **FIXED** → Closed (path form → BUG-4) | 2 helper calls per skill, 0 inline derivations; helper refuses on empty / un-numbered / missing dir under bash and zsh; `qa-fix-2` posted from a separate-shell block. Mutants: helper made to guess `1` → 2 red; qa-story 6b call removed → same-block guard red naming line 1921; inline `sed` reinserted in qa-fix → 2 red → all `covered` |
| TASK-121-BUG-3 (medium) — un-numbered gate convention | **FIXED** → Closed | 0 un-numbered forms left in qa-story; section + three trees numbered (layout of the example → CR-6, low) |
| CR-4 (low) — contract contradiction | **FIXED** | cell reads "required by convention"; "derived once, above both calls" replaced by the helper description |
| CR-5 (low) — bash-only test | **FIXED** | `tests/qa-cycle.test.js` runs under bash and zsh (`zshAvailable()`), 15 tests |

---

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md:1361` (also qa-story :1932, qa-fix :915) — `bash references/qa-cycle.sh` beside `node .agents/skills/<skill>/references/tracker-comment.js`: two cwd assumptions in one block; from the repo root the helper is not found (exit 127, reproduced), `|| QA_CYCLE=` empties it, and the post is skipped every cycle with a warning → address the helper as `.agents/skills/<skill>/references/qa-cycle.sh` in the tracker blocks, widen `DERIVES_CYCLE`, add a path-form guard. **→ TASK-121-BUG-4**
- **[low]** `skills/qa-story/SKILL.md:1868` — the separate-shell premise is applied only to the cycle; `$STORY_DIR`/`$TASK_DIR`/`$STORY_FILE`, `$GATE_DECISION`, `$score`, `$QA_ISSUE` still cross blocks → say which values a block inherits. **→ CR-2**
- **[low]** `shared/resources/qa-cycle.sh:48` — `[ -gt ]` overflows beyond 64-bit; a huge gate number yields a wrong lower cycle instead of a refusal (reproduced) → bound the digit count. **→ CR-3**
- **[low]** `skills/qa-story/SKILL.md:1860,1928` — comments say "Step 13b"/"Step 13" (qa-task numbering); qa-story's are 6/6b. **→ CR-4**
- **[low]** `tests/qa-cycle.test.js:128` — `INLINE_DERIVATION` matches only the retired spelling → assert no `$(…)` assignment contains `.gate.` outside a helper call. **→ CR-5**
- **[low]** `skills/qa-story/SKILL.md:2921` — the redrawn tree still places the story file directly under `[feature]/` rather than `epics/…/stories/story.x/`. **→ CR-6**

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine | PASS | Verified | Unchanged. |
| Phase 2: call sites + orchestrator blocks | CONCERNS | Verified with findings | Helper in all six blocks; BUG-4 path form in the three tracker blocks. |
| Phase 3: contract + guard | PASS | Verified | Guards covered; contract consistent; CR-5 guard breadth is a low. |

**Overall Phase Completion**: 3/3 delivered; 1 with a finding.

---

## Success Criteria Verification

**Functional** — every cycle's gate and fix comment reaches the tracker with a distinct marker: **PASS at unit level and live** (#421 carries `qa-gate-1`, `qa-fix-1`, `qa-gate-2`, `qa-fix-2`; this report posts `qa-gate-3` from a block that derives the cycle itself), **CONCERNS on the literal prose** until BUG-4 aligns the path form. Resumed cycle → `already`: PASS. Orchestrator blocks removed, develop-bug untouched: PASS.
**Performance** — PASS. **Code Quality** — PASS (ci:fast green; floors; proofs). **Migration** — PARTIAL (#75 closure with `/finalise`).

---

## Breaking Changes Validation

Unchanged from cycle 1 — **PASS**.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: Tracker blocks address the helper skill-dir-relatively beside a repo-root-relative engine call**
- **Severity**: MEDIUM
- **Category**: Functional / Reliability
- **Bug Report**: [task.121.bug.4.helper-path-form-differs-from-the-engine-call-beside-it.md](./task.121.bug.4.helper-path-form-differs-from-the-engine-call-beside-it.md)
- **Observation**: `bash references/qa-cycle.sh` from the repo root → `No such file or directory`; the block's own `node .agents/skills/qa-task/references/tracker-comment.js` presupposes that cwd.
- **Impact**: on the literal reading the tracker comment is skipped every cycle (with a ⚠️ — loud, but lost).
- **Recommendation**: `.agents/skills/<skill>/references/qa-cycle.sh` in the three tracker blocks; widen `DERIVES_CYCLE`; path-form guard.
- **Priority**: P2

### LOW Severity Issues (5)

CR-2 inherited-values sentence · CR-3 digit bound · CR-4 qa-story step numbers · CR-5 broader inline-derivation guard · CR-6 tree layout.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 5

---

## NFR Assessment

### Performance — PASS
One extra `bash` process per block.

### Reliability — CONCERNS
BUG-4: helper not found from the cwd the tracker block assumes.

### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 — unchanged surface; CR-3 is a wrong-number path on an absurd input.

### Maintainability — PASS
One definition of the cycle; guards in place; contract consistent. Residual lows are wording, an example tree and guard breadth.

---

## Code Review

Step 3b — narrowed diff (files changed since gate 2; 13 source/doc files, 1769 diff lines), read-only reviewer. `code_review_blocking=true`; CR-1 verified and entered as BUG-4 (medium, see Methodology); CR-2–CR-6 low. `boundary: false`, `probes_executed: 0`.

**Correctness bugs (3):** `qa-story:1932` path form (**BUG-4**) · `qa-story:1868` inherited values (**CR-2**) · `qa-cycle.sh:48` overflow (**CR-3**).
**Cleanups (3):** `qa-story:1860` step numbers (**CR-4**) · `tests/qa-cycle.test.js:128` guard breadth (**CR-5**) · `qa-story:2921` tree layout (**CR-6**).

**Mutation proofs (Step 3c, committed state, `cp`-restore, tree verified identical to HEAD afterwards):**
- mutation-proven: helper made to guess `1` on no numbered gate → `[bash]`/`[zsh] only un-numbered gates → refuse, never guess 1` → covered
- mutation-proven: qa-story 6b helper call removed → `every fenced block … derives the cycle in that block` naming line 1921 → covered
- mutation-proven: inline `sed` derivation reinserted in qa-fix → same-block guard + `no shipped skill carries an inline gate-number derivation` → covered

(Two mutants were mis-applied on the first attempt — an empty line lookup under zsh let `sed` rewrite whole files — and restored from their `cp` snapshots; the tree was verified identical to HEAD before the proofs were redone. Recorded because it is exactly the failure `cp`-snapshot exists for.)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` at 6bbff589 | PASS — 3431 tests, 3430 pass, 0 fail, 1 skipped |
| `npm run bundle:check` | PASS — 128 skills, 0 problems |
| ShellCheck (source `.sh` incl. `qa-cycle.sh`) | PASS |
| PR #430 CI at 6bbff589 | PASS — all five workflows |
| `tests/qa-cycle.test.js` under `TMPDIR=/tmp` | PASS — 15/15 |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast; npm run bundle:check; gh run list --branch feature/task.121.cycle-scoped-qa-tracker-comments
command node --test tests/qa-cycle.test.js; TMPDIR=/tmp command node --test tests/qa-cycle.test.js
cd "$(git rev-parse --show-toplevel)"; bash references/qa-cycle.sh docs/tasks/task.121.cycle-scoped-qa-tracker-comments   # BUG-4: No such file
d=$(mktemp -d); touch $d/task.1.gate.2.a.yml $d/task.1.gate.99999999999999999999.b.yml; bash shared/resources/qa-cycle.sh $d   # CR-3: "integer expected", prints 2
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-4 — repo-root path form for the helper in the three tracker blocks; widen `DERIVES_CYCLE`; path-form guard.
2. CR-2 — inherited-values sentence; CR-3 — digit bound; CR-4 — step numbers; CR-5 — broader guard; CR-6 — tree.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: cycle-2 fixes verified and covered; one medium path-form defect confined to the three tracker blocks; five lows. HIGH sequence 0, 0, 0 — converging.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-4 fixed with a path-form guard; lows addressed or explicitly waived.

---

**QA Report**: co-located at `task.121.qa.3.cycle-scoped-qa-tracker-comments.md`
**Gate File**: co-located at `task.121.gate.3.cycle-scoped-qa-tracker-comments.yml`
**Next Steps**: `/qa-fix` on the six open entries, then cycle-4 re-review (narrowed).
