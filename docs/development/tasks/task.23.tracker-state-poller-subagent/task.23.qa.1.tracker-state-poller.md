# QA Report: Task 23 — Add shared tracker state poller Explore subagent

**Task**: [task.23.tracker-state-poller-subagent.md](./task.23.tracker-state-poller-subagent.md)
**Gate File**: [task.23.gate.1.tracker-state-poller.yml](./task.23.gate.1.tracker-state-poller.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-05-08
**Testing Completed**: 2026-05-08
**Gate Status**: CONCERNS

---

## Executive Summary

Task 23 adds a shared read-only Explore subagent for tracker state polling, encapsulating `gh pr view`, `gh issue view`, Jira MCP, and Bitbucket REST calls behind a compact-JSON interface. All four implementation phases are complete and the core design is sound. One medium-severity issue was found (Bitbucket credential naming inconsistency) and two low-severity issues (uninitialised bash array, incorrect Jira labels field path) that should be corrected before merge.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Documentation-only task — no compiled test suite
- [x] Breaking changes: none (additive)
- [x] Code on feature branch `feature/task.23.tracker-state-poller-subagent` with open PR #51

### Review Methodology

Direct tools — documentation-only task (single module, <3 file changes per phase, no test suite). Adaptive strategy: direct tools only.

---

## Implementation Verification

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Define output schema | PASS | Schema in `tracker-state-poller-subagent.md` matches plan spec exactly |
| Phase 2: Author Explore prompt | CONCERNS | Core platform branching correct; minor bash example bugs (see Issues) |
| Phase 3: Migrate callers | PASS | step-4 (additive), step-5-6 (additive, numbering correct), step-7 (replacement + Jira extension) all correct |
| Phase 4: Validation | PASS | All 4 platform combos documented in poller Execution Protocol |

**Overall Phase Completion**: 4/4 phases present; 3/4 PASS, 1/4 CONCERNS

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| All read-only tracker polls through shared subagent | Yes | step-7 `gh issue view` replaced; step-4/5-6 poller added | PASS |
| Mutations remain inline | Yes | `gh issue close`, `addCommentToJiraIssue`, `transitionJiraIssue` all still inline | PASS |
| Output schema stable across platforms | Yes | Single schema; null-fill for missing inputs | PASS |

### Performance

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| Tracker-poll main tokens reduced ≥50% per step | ≥50% | Raw CLI/MCP output moves to Explore subagent context entirely | PASS |
| No additional platform-specific code in step files | Yes | All platform branching in `tracker-state-poller-subagent.md` only | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| All platform combos covered | Yes | GitHub/GitHub, GitHub/Bitbucket, Jira/GitHub, Jira/Bitbucket all in Execution Protocol | PASS |
| Error handling contract defined | Yes | `errors[]` never-throw contract explicit | PASS |
| Validation snippet provided | Yes | `jq -e` validation in file | PASS |

---

## Issues Found

### MEDIUM Severity (1)

**Issue: Bitbucket credential env var names inconsistent with project convention**
- **Severity**: MEDIUM
- **Category**: Quality / Usability
- **Location**: `shared/resources/tracker-state-poller-subagent.md` — Step 2, VCS=bitbucket section
- **Observation**: Poller uses `${BITBUCKET_USER}` and `${BITBUCKET_TOKEN}` but the project convention (established in `create-pr` SKILL.md) is `BITBUCKET_USERNAME` and `BITBUCKET_APP_PASSWORD`.
- **Impact**: Any operator following the poller instructions literally for a Bitbucket setup will get authentication failures, requiring debugging to discover the variable name mismatch.
- **Recommendation**: Change `${BITBUCKET_USER}` → `${BITBUCKET_USERNAME}` and `${BITBUCKET_TOKEN}` → `${BITBUCKET_APP_PASSWORD}` in the Bitbucket VCS curl command.

### LOW Severity (2)

**Issue 1: ERRORS bash array not initialized**
- **Severity**: LOW
- **Location**: `tracker-state-poller-subagent.md` — Steps 2 and 3, error-append lines
- **Observation**: `ERRORS+=("...")` is used without a preceding `ERRORS=()` declaration. In bash, appending to an uninitialised array works in practice but is non-portable and will confuse readers.
- **Recommendation**: Add `ERRORS=()` initialization at the start of the Execution Protocol (before Step 1).

**Issue 2: Jira labels field path incorrect**
- **Severity**: LOW
- **Location**: `tracker-state-poller-subagent.md` — Step 3, TRACKER=jira section
- **Observation**: Extraction note says `ISSUE_LABELS` = `[fields.labels[*].value]` but Jira REST API returns labels as an array of plain strings (e.g., `["bug", "critical"]`), not objects with a `.value` property.
- **Recommendation**: Change extraction note to `fields.labels` (the array itself) rather than `fields.labels[*].value`.

---

## NFR Assessment

### Performance — PASS
Explore subagent isolates all raw CLI/MCP output. Main pipeline context receives only the compact JSON result. Token reduction per step is structural and guaranteed by the subagent boundary.

### Reliability — PASS
`errors[]` contract is explicit and consistent across all platform branches. "Never throw" rule prevents subagent crash from halting the pipeline. Main context checks `errors | length` before trusting state fields.

### Security — PASS
Read-only polling only. No secrets in output schema. Credentials accessed via env vars (not hardcoded). The MEDIUM issue above is a usability problem, not a security exposure.

### Maintainability — PASS
Single shared resource is the sole maintenance point. Clear separation: poller owns reads, step files own mutations. Schema versioning implicit (document-level, not semver — acceptable for internal shared resource). Usage Patterns section makes caller integration straightforward.

---

## Regression Testing

| Area | Status | Notes |
|------|--------|-------|
| step-4 existing content | PASS | Post-PR steps, Jira transition logic untouched; new section is additive only |
| step-5-6 existing content | PASS | New step 5 inserted between old steps 4 and 5 (now 6); numbering renumbered correctly |
| step-7 existing content | PASS | Close commands and Jira transition mutations unchanged; only verification section replaced |
| resolve-platform.sh contract | PASS | Poller replicates resolver logic inline; no dependency on file being present at runtime |

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium-severity issue (Bitbucket credential naming) would cause auth failures for Bitbucket users following the documentation. Two low-severity issues are cosmetic but should be fixed for documentation quality. Core design is correct and complete.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**:
1. Fix `BITBUCKET_USER`/`BITBUCKET_TOKEN` → `BITBUCKET_USERNAME`/`BITBUCKET_APP_PASSWORD`
2. Add `ERRORS=()` initialization
3. Fix Jira labels extraction path
