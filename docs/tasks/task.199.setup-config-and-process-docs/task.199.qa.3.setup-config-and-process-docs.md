# QA Report: Task 199 - Setup, configuration and process docs (cycle 3)

**Task**: [Link to task document](./task.199.setup-config-and-process-docs.md)
**Gate File**: [task.199.gate.3.setup-config-and-process-docs.yml](./task.199.gate.3.setup-config-and-process-docs.yml)
**Previous Report**: [task.199.qa.2.setup-config-and-process-docs.md](./task.199.qa.2.setup-config-and-process-docs.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1 bug-fix.md registry mirroring | ✅ FIXED | The paragraph names develop-bug's four writes and says qa-fix's in-cycle writes are not mirrored; the reviewer checked it against the develop-bug verify loop and qa-fix |
| CR-2 approve / tracker-reconcile wording | ✅ FIXED, residue | The wizard prompt and configuration.md comment match. The wizard's end summary still describes approve as unperformed (QA-6), and the comment leaves out the autonomous-run fallback (QA-7) |
| CR-3 `.env.example` "always" | ✅ FIXED | "Bitbucket or Jira only" at all three sites, matching `write_env_files` |
| QA-3 Agent links row | ✅ FIXED | The row sits between tracker-workflow and Hooks, as in `main()` |
| QA-4 §4 Sync develop condition | ✅ FIXED, residue | The condition is right. The recipe it points to fails mid-merge (QA-5) |

---

## Executive Summary

The cycle 2 fixes hold. This scoped re-review read the five files that fix changed and found three gaps in the new text. The medium one: a failed Sync develop is sent to a recipe that cannot finish a half-done merge. The two low ones: the wizard's closing summary still says approve writes are not performed, and the configuration comment leaves out one trigger for the `command` fallback.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools, plus one read-only diff-review subagent. Re-review scope: the files changed since gate 2's `head:` (`bbf9ac24`..`732649da`, work-item directory excluded): getting-started.md, configuration.md, bug-fix.md, release-and-install.md and setup-consumer.sh, 237 patch lines. `SAFETY_REPROBE=false`. The subagent returned in 79,097 ms (completion notice `duration_ms`). I followed the qa-task procedure inline and verified every finding against its source.

Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` is in the change set.

---

## New Findings This Cycle

- **[medium]** `docs/runbooks/release-and-install.md:62` sends a failed `--tag` Sync develop to `git pull --rebase` + `git merge main`. `release.sh` stops mid-merge on a conflict (lines 600–604, `set -euo pipefail`). There, `git pull --rebase` refuses with unmerged paths, and after a rejected push it would rebase away the merge commit. → Give the failed-sync case its own recovery.
- **[low]** `scripts/setup-consumer.sh:2231` — the closing summary prints for approve too, and says writes are "recorded, not performed". → Add an approve line.
- **[low]** `docs/reference/configuration.md:944` gives "no tty" as the only fallback trigger. The source (`develop-pipeline-step-7-finalise.md:514`) also names an autonomous pipeline run. → Name both.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0: Re-verify | PASS | |
| Phase 1: Overview | CONCERNS | Wizard summary for approve (QA-6) |
| Phase 2: Reference | CONCERNS | configuration.md fallback trigger (QA-7) |
| Phase 3: Runbooks | CONCERNS | release-and-install §4 recovery (QA-5) |
| Phase 4: Standards | PASS | |
| Phase 5: Close-out | PASS | |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1, SC-8 | PASS | Unchanged |
| SC-2 no changed doc states old behaviour | CONCERNS | The wizard summary still describes approve as unperformed (QA-6) |
| SC-3 changed commands run or cited | CONCERNS | The §4 recipe is cited for a case it does not handle (QA-5) |
| SC-4, SC-7 | PASS (N/A) | |
| SC-5 | PASS | CI `shellcheck` pass @ `732649da` |
| SC-6 | PASS | CI `link-check` pass @ `732649da` |

---

## Breaking Changes Validation

None — documentation only.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2 (see New Findings This Cycle).

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

### Maintainability — PASS
The residue is wording gaps in text the previous cycle added.

---

## Code Review

Every `anchor_check` is `ok` (`finding-anchors.js --rev HEAD`).

**Correctness bugs (3):**
- [medium/medium] `docs/runbooks/release-and-install.md:62` — the failed-sync recovery → advisory as returned (medium confidence); verified by QA against release.sh and raised as **QA-5**
- [low/medium] `scripts/setup-consumer.sh:2231` — the closing summary for approve → advisory as returned; verified and raised as **QA-6**
- [low/medium] `docs/reference/configuration.md:944` — the autonomous-run trigger → advisory as returned; verified and raised as **QA-7**

**Cleanups (0):** none.

**Provenance (5b):** all three findings are in text this task wrote or made reachable (cycle 2's CR-2 and QA-4 edits). All are in scope.

**Boundary rule:** `boundary: false`. `probes_executed: 0`.

**Mutation proof:** not run. No committed test guards this wording.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Fast gate (cycle 2, pre-commit) | PASS — 5,969 / 0 fail |
| PR #704 CI @ `732649da` | `link-check`, `shellcheck` pass; `test` pending at gate time |

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 85/100
**Deployment Recommendation**: CONDITIONAL — QA-5 fixed; QA-6 and QA-7 in the same cycle.

**Next Steps**: `/qa-fix` cycle 3, then re-review (cycle 4, scoped to files changed since `732649da`).
