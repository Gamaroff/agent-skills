# QA Report: Task 205 - PRD-scoped epic numbering (cycle 5)

**Task**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md)
**Gate File**: [task.205.gate.5.prd-scoped-epic-numbering.yml](./task.205.gate.5.prd-scoped-epic-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 5)
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4's fixes hold. Bugs 10–11 are closed, and one path root per block is now enforced by a test.
No HIGH this cycle. One MEDIUM: the shards batch check can accept an epic file the id check never
read. One LOW: that id check discards its reason. The suite is green.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (bugs 12–13)

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1, CR-2 / [BUG-10](./task.205.bug.10.blocks-mix-repo-root-and-skill-relative-paths.md) mixed path roots | ✅ FIXED | scan of every bash block in nine epic skills, floor ≥10; mutation-proven. Closed. |
| CR-5 / [BUG-11](./task.205.bug.11.shards-batch-guard-joins-its-two-inputs.md) joined guard | ✅ FIXED | partial substitutions refused (test). Closed. |
| CR-6 (cleanup) | ✅ FIXED | `frontmatterField`; commented `prd_number` case. |

---

## Review Methodology

Re-review scope: files changed since gate 4 (head 134e9630c0a1; 14 files) — default. `SAFETY_REPROBE=false`.
One Explore reviewer, 188 s (completion notice `duration_ms` 188204). Tests: head `941446e8` is the
tree the cycle-4 fast gate ran green on — 5690 tests, 5676 pass, 0 fail.

**Loop reading.** HIGH per gate: `1, 1, 0, 2, 0`; MEDIUM: `1, 4, 2, 1, 1`. This is the last budgeted
cycle. The route engine with `budgetSpent: true` declines the gate-the-last-fix half-cycle:
`medium-not-falling` (MEDIUM `2, 1, 1` over cycles 3–5). Once the cycle-5 fix lands, the run
escalates through the loop limit. No gate reads that fix.

---

## New Findings This Cycle

- **[medium]** `skills/create-epics-from-shards/SKILL.md:397` — the presence check accepts a misnamed batch epic the id check skipped ([BUG-12](./task.205.bug.12.shards-presence-check-accepts-a-misnamed-batch-epic.md)).
- **[low]** `skills/create-epics-from-shards/SKILL.md:398` — the id check's reason goes to `/dev/null` ([BUG-13](./task.205.bug.13.shards-id-check-discards-its-reason.md)).
- Advisory (medium confidence, not gated): in create-epic, the card-preflight line uses a bare `references/` helper with a repository-relative argument. That path form is pre-existing on `develop`. Later blocks of sync-github-epic and ensure-epic-github-issue still use bare `references/` paths, also pre-existing.
- Cleanup: two blocks bind `epic-meta` values they never use.

All five anchors checked: `ok`.

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 10
- Re-probed `review-epic` Input Resolution: `engages`, 10/10. Record: [task.205.qa.5.security.run.json](./task.205.qa.5.security.run.json).

### Performance — PASS
### Reliability — CONCERNS
### Maintainability — PASS

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Next Steps**: `/qa-fix` cycle 5: require one `epic.P.E.{slug}/epic.P.E.{slug}.md` per batch epic, and print the reason on failure. Then escalate through the loop limit, because the half-cycle is declined.
