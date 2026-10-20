# QA Report: Task 199 - Setup, configuration and process docs (cycle 2)

**Task**: [Link to task document](./task.199.setup-config-and-process-docs.md)
**Gate File**: [task.199.gate.2.setup-config-and-process-docs.yml](./task.199.gate.2.setup-config-and-process-docs.yml)
**Previous Report**: [task.199.qa.1.setup-config-and-process-docs.md](./task.199.qa.1.setup-config-and-process-docs.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1 configuration.md "three sync skills" | ✅ FIXED | configuration.md:710 reads "four"; tree grep finds the count only in historical CHANGELOG entries |
| QA-1 Node ≥ 20 | ✅ FIXED | `grep 'Node ≥ 20'` over docs/ (excluding records): 0 hits |
| QA-2 setup-consumer.sh header parity | ✅ FIXED, then refuted in part | Step 4 and 8a are present. The reworded step 4 keeps "`.env.example` always", which is false (CR-3 below) |

---

## Executive Summary

Cycle 2 is a refute pass over the full branch diff. Cycle 1's three fixes hold, but this pass found five more false claims. The two medium ones:

- bug-fix.md promises that a general bug's registry row mirrors every status write, which `/qa-fix` does not do after a reopen.
- The approve wording corrected in which-access.md still contradicts the wizard prompt and configuration.md.

The three low ones are an over-broad "always", a missing table row, and a release error path.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools, plus one read-only diff-review subagent run as the cycle-2 **refute pass** over the whole `origin/develop...HEAD` diff, with the work-item directory excluded (658 patch lines, 17 files). It returned in 200,572 ms (completion notice `duration_ms`). This cycle followed the qa-task procedure inline: the skill was already loaded in this session for cycle 1. I verified every finding against its source before mapping it.

Re-review scope: unscoped — cycle 2 refute pass (whole branch diff). `SAFETY_REPROBE=false` (`qa-safety-clause1.sh`: prior gate has no security FAIL).

Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` is in the change set.

---

## New Findings This Cycle

- **[medium]** `docs/runbooks/bug-fix.md:114` — "mirrors every status write" and "check the row against the bug's current status" are false after a reopen. `/qa-fix` moves the bug file Reopened → In Progress → Ready for QA (skills/qa-fix/SKILL.md, bug report workflow). The develop-bug verify loop mirrors only `reopened` (develop-bug-step-5-6-verify-loop.md step 1). → Name the four mirrored writes, say that qa-fix's in-cycle writes are not mirrored, and file the source gap.
- **[medium]** `scripts/setup-consumer.sh:360`, `docs/reference/configuration.md:943`, `scripts/setup-consumer.sh:2233` — the wizard and the config reference still describe approve as unshipped, deferring writes, with the ask prompt at task.57. The wizard also says `/tracker-reconcile` is not shipped, though `skills/tracker-reconcile/` exists. which-access.md, now corrected, contradicts all three. → Update all three, then grep the class.
- **[low]** `scripts/setup-consumer.sh:10`, plus `getting-started.md:132` and the release-and-install Credentials row — "`.env.example` always". `write_env_files` returns early when `ENV_LINES` is empty, as it is for GitHub+GitHub Issues.
- **[low]** `docs/runbooks/release-and-install.md:104` — the wizard table omits the agent-links step (`link_agents`, between `write_tracker_workflow` and `install_hooks` in `main()`).
- **[low]** `docs/runbooks/release-and-install.md:62` — "otherwise `--tag` has already merged `main` into `develop`". `release.sh` runs under `set -euo pipefail` and syncs develop after the tag push (lines 600–604), so a conflict or a rejected push leaves the release out and develop unsynced.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0: Re-verify | PASS | |
| Phase 1: Overview | CONCERNS | which-access.md vs the wizard prompt (CR-2); getting-started row 4 "always" (CR-3) |
| Phase 2: Reference | CONCERNS | configuration.md:943 approve comment (CR-2) |
| Phase 3: Runbooks | CONCERNS | bug-fix.md mirroring (CR-1); release-and-install.md table and §4 condition (QA-3, QA-4) |
| Phase 4: Standards | PASS | |
| Phase 5: Close-out | PASS | |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1 | PASS | Unchanged from cycle 1 |
| SC-2 no changed doc states old behaviour | CONCERNS | The approve claim survives in configuration.md:943 (a changed doc) and in the wizard (CR-2) |
| SC-3 | PASS | Unchanged; the cycle-1 header change is a comment |
| SC-4, SC-7 | PASS (N/A) | |
| SC-5 | PASS | Vacuous for `.md`. `shellcheck` on setup-consumer.sh is clean (CI `shellcheck` pass @ `bbf9ac24`) |
| SC-6 | PASS | CI `link-check` pass @ `bbf9ac24`. The reviewer confirmed the three new anchors resolve |
| SC-8 | PASS | Unchanged |

---

## Breaking Changes Validation

None — documentation only.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3 (see New Findings This Cycle). No bug reports are filed: the gate is the fix queue, and every fix is a sentence.

---

## NFR Assessment

### Performance — PASS
N/A.

### Reliability — PASS
No behaviour change.

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No boundary in the change set.

### Maintainability — PASS
Every finding has a cited source and a one-line fix.

---

## Code Review

Every `anchor_check` is `ok` (`finding-anchors.js --rev HEAD`).

**Correctness bugs (5):**
- [medium/high] `docs/runbooks/bug-fix.md:114` — over-broad registry-mirroring claim → **gate CR-1**
- [medium/high] `docs/concepts/which-access.md:36` — enumeration risk: the stale approve wording survives in the wizard prompt (the gate entry names setup-consumer.sh:360, where the fix goes, plus configuration.md:943 and setup-consumer.sh:2233, which QA found) → **gate CR-2**
- [low/high] `scripts/setup-consumer.sh:10` — "`.env.example` always" is false for GitHub+GitHub Issues → **gate CR-3**
- [low/medium] `docs/runbooks/release-and-install.md:62` — the develop-sync error path → advisory as returned; verified by QA against release.sh and raised as **QA-4**
- [low/medium] `docs/runbooks/release-and-install.md:104` — agent-links row missing → advisory as returned; verified by QA against `main()` and raised as **QA-3**

**Cleanups (1):**
- `scripts/setup-consumer.sh:17` — the in-file section banners (5b, 8b, 2a/2b) use older numbering than the header → advisory, routed to `recommendations.future`

**Provenance (5b):** every finding is in scope. CR-1, CR-4 and CR-5 sit in text this diff wrote. CR-2 and CR-3 are copies of claims a task finding corrected (OVERVIEW-26, OVERVIEW-11). The source gap behind CR-1 (qa-fix does not mirror) is out of scope for a docs task and goes to `recommendations.future`; the doc fix states the behaviour as it is.

**Boundary rule:** `boundary: false`. No predicate, script logic or guard was added; the setup-consumer.sh change is a comment. `probes_executed: 0`.

**Mutation proof:** not run. No committed test guards documentation wording, and cycle 1's fixes are prose and a comment, so there is no test whose failure could be proven.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Fast gate (cycle 1, pre-commit) | PASS — 5,969 / 0 fail |
| PR #704 CI @ `bbf9ac24` | PASS (`test`, `link-check`, `shellcheck`) |

---

## Test Artifacts

### Test Commands Executed
```bash
bash .agents/skills/qa-task/references/qa-safety-clause1.sh <gate.1>        # false
git diff origin/develop...HEAD -- . ':(exclude)docs/tasks' > <patch>         # 658 lines
command node .agents/skills/qa-task/references/finding-anchors.js --rev HEAD  # reason ok
grep -n 'not shipped|still deferred|task.57' scripts docs                     # CR-2 population
gh pr checks 704
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL — CR-1 and CR-2 fixed; CR-3, QA-3 and QA-4 in the same cycle.

**Next Steps**: `/qa-fix` cycle 2, then re-review (cycle 3, scoped to files changed since `bbf9ac24`).
