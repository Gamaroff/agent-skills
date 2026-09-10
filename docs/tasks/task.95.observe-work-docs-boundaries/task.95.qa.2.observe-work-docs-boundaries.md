# QA Report: Task 95 — observe-work: config schema, skill boundaries and the meta-skill family (Cycle 2)

**Task**: [task.95.observe-work-docs-boundaries.md](./task.95.observe-work-docs-boundaries.md)
**Gate File**: [task.95.gate.2.observe-work-docs-boundaries.yml](./task.95.gate.2.observe-work-docs-boundaries.yml)
**Previous Gate**: [task.95.gate.1.observe-work-docs-boundaries.yml](./task.95.gate.1.observe-work-docs-boundaries.yml) (CONCERNS, 90/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: PASS

---

## Executive Summary

Cycle 1's single MEDIUM is fixed and verified against the resolver rather than against the diff. Both LOW advisories were taken in the same pass.

The refute pass found one new LOW: the newly-documented path formula is correct for an ordinary checkout and under-specified inside a **linked git worktree**, where the resolver deliberately anchors to the *main* worktree. The document does state that rule — 33 lines further down, in a different subsection — so a reader has it, but not beside the formula they would compute from. It does not gate.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| # | Previous finding | Severity | Status | Verification |
| --- | --- | --- | --- | --- |
| TASK-95-BUG-1 | Default observation workspace documented as a role, not a path; the only concrete path in the section (`~/.agents/skill-observations`) pointed at a different tree | MEDIUM | **FIXED** | Key reference `Default` column now carries `~/.claude/projects/<project-path with / → ->`; prose item 3 gives the same shape with a worked example; the schema block labels its value an example override. Verified by **driving the resolver's default tier** and comparing character-for-character with the documented shape — not by reading the diff |
| LOW-1 | `require()` calls inside three test bodies rather than at module scope | LOW | **FIXED** | Lifted to module scope. Checked for the obvious regression this invites — an import left behind unused: all three (`execFileSync`, `spawnSync`, `os`) have real uses. Prettier would not have caught an unused one |
| LOW-2 | `saysStale()` matched `/stale\|never run/` against the whole context string | LOW | **FIXED** | Anchored to the review-state clause the hook actually emits. Confirmed non-vacuous by mutation: the tightened regex could have matched nothing and made both staleness tests pass trivially — changing the hook's applied default 14 → 7 turns exactly one test red and nothing else |

### Review Methodology

**Re-review scope: unscoped — cycle 2 refute pass** (`PRIOR_GATES=1` → `REFUTE_PASS=true`). Whole-branch `origin/develop...HEAD` diff, re-read to *disprove*, not to confirm. `SAFETY_REPROBE=false`: gate 1's `security` status was PASS (clause 1), and clauses 2 and 3 do not hold — the finding was a documentation defect, not a safety boundary.

Direct tools; Step 3b run inline rather than via an Explore subagent, per the standing session constraint recorded in cycle 1.

The four lifecycle transitions the refute directive names — bulk teardown, in-flight, error path, reconnect — have no literal analogue in a documentation-and-tests change set. They were translated to their underlying question: *which state does this change describe correctly, and which state does it quietly get wrong?* That is what produced the finding below.

---

## New Findings This Cycle

- **[LOW]** `docs/reference/configuration.md:320` — the path formula in resolver item 3 is correct for an ordinary checkout and silent about linked git worktrees, where the resolver anchors to the **main** worktree rather than the cwd. A reader inside `/tmp/wt` computes `-tmp-wt` and finds an empty directory → state the qualifier beside the formula, or cross-reference the paragraph that carries it.

Established empirically, not by reading: a detached worktree at `/tmp/wt-refute` resolved to `/Users/…/.claude/projects/-Users-gamaroff-Development-Projects-agent-skills` — the main checkout's identity, not the worktree's.

Two things keep this LOW rather than MEDIUM. The rule **is** in the document, at line 353 in the *"An ephemeral anchor is refused"* subsection, so the information is present rather than absent — unlike cycle 1's finding. And the reader who most needs it is inside a worktree, which is a deliberate, non-default state. It matters more here than in most repositories, though, because `/develop-batch` dispatches every parallel story into a linked worktree — so this is a normal state for this project, which is why it is recorded rather than waved through.

**Nothing else.** Searched unscoped: full `origin/develop...HEAD` diff, 14 files. Specifically re-probed, and found sound:

- Every top-level import added by cycle 1 is genuinely used — the regression a "lift the requires" change most invites.
- The tightened `saysStale()` regex still matches the hook's real output; alternation binds as intended (`(last run … days\))|(never run)`).
- The angle brackets in the new path formula sit inside a code span or a fenced block in all three locations, so no markdown renderer will read `<project-path…>` as an HTML tag and swallow it. Checked because the fix introduced the first bare-looking `<…>` in the section.
- The `#observation-workspace` anchor the Key reference row links to resolves to a real heading.
- The original change still holds after the fixes: `families --audit` returns `gaps: []`, and Step 4b still reports `no-executable-blocks` with zero findings.
- No `observations.*` key name was added, so the contract test's key-set assertion is still meaningful rather than passing on an unchanged input.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Config schema | PASS | Now states the default path, its `/` → `-` encoding, and that it is `.claude/` not `.agents/` |
| Phase 2: Boundary notes | PASS | Unchanged this cycle; catalog diff still empty |
| Phase 3: Family template | PASS | Unchanged this cycle; audit still returns zero gaps |
| Phase 4: README + CHANGELOG | PASS | Unchanged this cycle |

**Overall Phase Completion**: 4/4.

---

## Success Criteria Verification

All criteria remain met. The one that moved is Functional criterion 1 — *"no key documented that nothing reads"* — which is now not merely satisfied but **enforced**: the contract test scans the schema block and the key-reference table and fails on any `observations.*` name the resolver does not consult. Cycle 1's fix added prose naming `.claude/` and `.agents/` without adding a key, and the test still passes, which is the evidence that the addition was inert with respect to the key set.

---

## Breaking Changes Validation

Unchanged from cycle 1: none declared, none introduced. This cycle touched documentation and two test files only.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None. Cycle 1's MEDIUM is closed.

### LOW Severity Issues (1)

- **The path formula is silent about linked worktrees.** See *New Findings This Cycle*. Advisory; recorded as a `future` recommendation in the gate.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
No runtime path changed this cycle either. Documentation and two test files.

### Reliability — PASS
Improved. The staleness assertion is now anchored to the clause the hook emits rather than to a loose substring, and the tightening was mutation-proven in both directions — that it still matches real output, and that it goes red when the behaviour it names is reverted.

### Security — PASS
No credential, auth, network or file-write surface touched. The `.claude/` path now named in the documentation is a directory the resolver already used; documenting it exposes nothing that was not already on disk.

### Maintainability — PASS
Improved. The consumer-facing default is now stated as a value rather than a role, and the test file's imports match its sibling's convention.

---

## Code Review

Whole-branch diff, 14 files, refute pass. **0 correctness bugs, 0 new cleanups.**

The two cycle-1 cleanups are closed. The specific regressions a refute pass expects from *these* fixes were probed and are absent: no unused import survived the require-lift, and the tightened regex is not vacuous.

`code_review_blocking` is not set and was not passed in Skill args → `CR_BLOCKING=false`. Nothing promoted to `top_issues[]`.

### Mutation-Proof Spot Check (Step 3c)

Scoped, per the rule, to tests guarding a fix made **this** cycle:

| Fix this cycle | Guarding test | Mutation applied | mutation-proven |
| --- | --- | --- | --- |
| `saysStale()` anchored to the review-state clause | `OBS_STALE_DAYS: the applied default is 14, not 7` | Hook's applied default changed 14 → 7 | **yes** — exactly one test red, `fail 1`, suite recovers on restore |
| Requires lifted to module scope | whole suite | n/a — a refactor with no new invariant; verified instead by confirming all three imports have real uses | n/a |
| Documented default path | `resolver: every documented observations.* key has a reader` | n/a this cycle — proven in cycle 1; re-confirmed green against the edited prose | carried |

Worth recording: the first attempt at this cycle's mutation mangled the shell variable rather than changing its value. The test went red — for the wrong reason. It was redone precisely. **A mutation that proves the wrong thing is not proof**, and a red test is not self-validating.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full repo suite (`npm run ci:fast`) | PASS — 2901/2902, 0 fail, 1 pre-existing skip |
| `observe-work` suite in isolation | PASS — 38/38 |
| Catalog freshness | PASS — empty diff |
| `format` | PASS |
| `families --audit` | PASS — zero gaps, re-verified post-fix |
| Step 4b runnable prose | PASS — `no-executable-blocks`, 0 findings, unchanged |

No regressions.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. State the linked-worktree qualifier beside the path formula in resolver item 3, or cross-reference the paragraph at line 353 that carries it. Relevant to this repository in particular, because `/develop-batch` runs every parallel story in a linked worktree.
2. Consider binding `observation-log-contract.md`'s precedence statement to the resolver, closing the third unbound copy (carried from cycle 1).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Cycle 1's MEDIUM is fixed and verified against the resolver, not the diff. Both LOW advisories closed. The refute pass produced one new LOW, whose substance is already stated elsewhere in the same document. No HIGH, no MEDIUM, no NFR below PASS — deterministic rule 5 yields PASS.
**Quality Score**: 100/100 — `100 − (20 × 0 FAILs) − (10 × 0 CONCERNS)`

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**QA Report**: `task.95.qa.2.observe-work-docs-boundaries.md`
**Gate File**: `task.95.gate.2.observe-work-docs-boundaries.yml`
**Next Steps**: Loop exit gate — `/review-pr` over PR #360.
