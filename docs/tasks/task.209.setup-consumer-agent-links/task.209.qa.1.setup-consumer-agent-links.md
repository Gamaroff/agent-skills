# QA Report: Task 209 - setup-consumer.sh links each user's agents to AGENTS.md and .agents/skills

**Task**: [Link to task document](./task.209.setup-consumer-agent-links.md)
**Gate File**: [task.209.gate.1.setup-consumer-agent-links.yml](./task.209.gate.1.setup-consumer-agent-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-14
**Testing Completed**: 2026-10-14
**Gate Status**: CONCERNS

---

## Executive Summary

Retroactive QA of PR #659, which merged before the develop pipeline ran. The checkbox list and the
links behave as the task describes, no agent id can execute anything, and the guards that protect
existing files are mutation-proved. One defect: an unknown `--link-agents` id exits 0
(TASK-209-BUG-1). The owner's real-terminal check (criterion 6) has not been done.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK-209-BUG-1; owner tries the list on Linux and macOS

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 in the plan)
- [x] Tests passing (CI `test` green on the PR head; local suite below)
- [x] Breaking changes documented (§5: none)
- [ ] Code on feature branch with open PR — PR #659 is **merged**; reviewed against its merge diff

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, pseudo-terminal, full suite)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe executed)
- [x] Code Review

### Review Methodology

Direct tools. Small task: one script, one test file, one doc section.

- **Scope:** merge commit `391c193e` against its first parent (7 files, no generated files). First
  review — no prior gate.
- **Step 3b code review** reused the `/review-pr` code lens dispatched minutes earlier on the
  identical patch with the identical shared prompt. Not dispatched a second time; recorded so the loss
  of a second independent pass is visible. Reviewer times: not measured.
- **Code review blocking:** treated as `true`, the run-level override the develop-task pipeline sets.
- **Step 4b:** not applicable — the change set adds no `SKILL.md` or `shared/resources/*.md` bash
  block (`getting-started.md` is a concepts doc).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Checkbox list | PASS | Verified | Driven through a pseudo-terminal by two committed tests |
| Phase 2: Agent table and links | CONCERNS | Verified | Unknown id exits 0 (TASK-209-BUG-1) |
| Phase 3: Wiring | PASS | Verified | `--links-only`, `--link-agents`, `--update` gating, links-only summary |
| Phase 4: Docs and tests | PASS | Verified | §1a table tied to `AGENT_TABLE` by a test |

**Overall Phase Completion**: 4/4 delivered, 1 with a finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Ticking agents makes exactly their links, gitignored | `the list: space ticks, arrows move and wrap, enter confirms`; `--link-agents claude links both paths and ignores them, anchored` | PASS |
| Nothing existing is replaced or deleted | `an existing CLAUDE.md is left byte-identical…`; `a link aimed somewhere else is left alone`; mutation-proved | PASS |
| Works without a terminal via `--link-agents`; skips cleanly without either | `with no terminal and no --link-agents, the list is skipped…`; **a bad `--link-agents` exits 0** | **CONCERNS** — TASK-209-BUG-1 |
| `--links-only` covers a new clone or worktree | `scripts/setup-consumer.sh` main: links-only branch runs `link_agents` then the summary | PASS |
| Tests pass and each guard is mutation-proved | Suite and CI green; 3 of 4 guard mutations red (the fourth absorbed, below) | PASS |
| Tried by the user in a real terminal (Linux and macOS) | No evidence — a manual check by the owner | **Unverified** |

---

## Breaking Changes Validation

None. The step writes files only for ticked agents and only appends to `.gitignore`.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: An unknown `--link-agents` id exits 0**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.209.bug.1.unknown-agent-id-exits-zero.md](./task.209.bug.1.unknown-agent-id-exits-zero.md)
- **Observation**: `--links-only --link-agents claud` prints "Setup failed" and exits 0
- **Impact**: a calling script reads a typo as success
- **Recommendation**: exit non-zero from the links-only path on a failed step; assert it in the test
- **Priority**: P2

### LOW Severity Issues (1)

- **`_status_badge` lost its comment** (PR review CR-2): the agent-links block sits between the summary
  header and the function it describes.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
One step; a few `lstat` calls per agent.

### Reliability — CONCERNS
Unknown id exits 0 (TASK-209-BUG-1). Ctrl-C restores the terminal through the `trap`. Not run on macOS
bash 3.2: the code avoids bash 4 features, but nothing has executed it there.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (`task.209.qa.1.security.run.json`, `totals.executed`; cases in
  `task.209.qa.1.security.cases.json`)
- `shell-argv` probe of `setup-consumer.sh --links-only --link-agents {input}`, verdict by exit status:
  the 3 legitimate ids accepted; the 5 hostile ids (`claud`, `claude,claud`, `$(touch pwned)`,
  `claude;touch pwned`, `../../etc`) also exit 0 — that is TASK-209-BUG-1, not an execution. Checked by
  hand in a fixture: none of the three injection-shaped ids created `pwned`, and none linked anything.

### Maintainability — PASS
One `AGENT_TABLE`, read by the tests rather than restated, and tied to the getting-started table.

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `scripts/setup-consumer.sh:2031` — unknown id exits 0 → exit non-zero, assert the code. Promoted: QA-209-1.

**Cleanups (1):**
- `scripts/setup-consumer.sh:1930` — the agent-links block separates the summary header and `_status_badge` comment from the function → move the block above the header.

**Boundary rule:** `boundary: true` — `--link-agents` refuses unknown ids. Probe executed, 8 cases.
`_make_agent_link` is a guard over the filesystem rather than over a string a sink models; its
refusals are held by the existing-file and foreign-link tests.

**Mutation proofs** (scratch worktree, tree clean after):
- mutation-proven: overwrite existing files and links (`ln -sfn`, real-file and link branches removed) → `an existing CLAUDE.md is left byte-identical…` (+3 more) → covered
- mutation-proven: unanchored ignore line → `--link-agents claude links both paths and ignores them, anchored` (+2 more) → covered
- mutation-proven: allow dangling links → `no link is made to a target that does not exist` → covered
- mutation-proven: remove `_checklist_has_tty || return 1` → no test red → absorbed. With no terminal the first `read </dev/tty` fails and returns 1, so the skip still happens; the guard is defence in depth, not the only path.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Other `setup-consumer-*` suites (credentials, config, profiles, exclusion) | PASS — all in the full suite |
| `npm test` | 5467 pass; 4 worktree-only failures (obs #39), 55/55 in the main checkout at the same code |
| Docs links | PASS — CI `link-check` on the PR |

---

## Test Artifacts

### Files Reviewed
`scripts/setup-consumer.sh`, `shared/resources/tests/setup-consumer-agent-links.test.mjs`,
`docs/concepts/getting-started.md`, the task and plan.

### Test Commands Executed
```bash
npm test                                   # 5485 tests: 5467 pass, 4 fail (obs #39, worktree-only)
node skills/qa-task/references/security-probe.mjs --sink shell-exec \
  --entry 'shell-argv:scripts/setup-consumer.sh' \
  --argv '["--links-only","--link-agents","{input}"]' \
  --cases-file docs/tasks/task.209.setup-consumer-agent-links/task.209.qa.1.security.cases.json \
  --fake-gh .claude/state/fakegh \
  --record docs/tasks/task.209.setup-consumer-agent-links/task.209.qa.1.security.run.json --json
bash scripts/setup-consumer.sh --links-only --link-agents '$(touch pwned)'   # by hand: no pwned file
```

The `--fake-gh` stub (always exits 1) lives under the gitignored `.claude/state/`; `--links-only`
never calls `gh`, but the engine requires a stub for any script that names it.

### Coverage Report
Not measured — the repository has no coverage tooling for `node --test`.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix TASK-209-BUG-1: an unknown id exits non-zero.

### Short-term Actions (Non-Blocking)
1. Move the agent-links block above the summary header (PR review CR-2).
2. The owner tries `--links-only` in a real terminal on Linux and macOS (criterion 6).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium reliability defect, reproduced; one criterion that only the owner can verify.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-209-BUG-1 fixed; real-terminal check on Linux and macOS

---

**QA Report**: co-located at `task.209.qa.1.setup-consumer-agent-links.md`
**Gate File**: co-located at `task.209.gate.1.setup-consumer-agent-links.yml`
**Next Steps**: `/qa-fix` for QA-209-1, then re-review.
