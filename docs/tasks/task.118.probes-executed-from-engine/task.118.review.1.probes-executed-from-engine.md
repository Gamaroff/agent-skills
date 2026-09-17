# Task Review Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Reviewed:** 2026-09-17
**Review Depth:** Standard
**Task Status:** Planned (on entry)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 critical + important recommendations implemented — 2026-09-17

---

## Executive Summary

The task is well-motivated and correctly scoped: the defect (an agent-typed `probes_executed` gating `evidence: measured`) is real at both sites named, and the pre-pass confirmed nothing of the deliverable exists yet. Four technical claims needed correcting before development: the engine does **not** already receive a report path, the record's key is ambiguous across controls sharing a sink, finalise's probe mode does not run the engine at all today, and the plan omits the `npm run bundle` step every shared-resource edit requires. All were applied to the document.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — routine decisions taken and recorded below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Invoked by `/develop-task` under the `/develop-next` AUTONOMOUS RUN directive. No `AskUserQuestion` calls were issued; each decision below took the option the skill or precedent marks as recommended.

### Step 0 — Output format
- **Decision**: Comprehensive report (pipeline auto-answer).

### Step 0a — Branch setup
- **Decision**: Auto-skipped — already on `feature/task.118.probes-executed-from-engine`.

### Step 2 check 5 — Tracker sync
- **Decision**: Sync to GitHub (recommended; precedent tasks 110–117). Dedup search for `[Task 118]` returned 0 matches → issue **#417** created (label `task`, `priority:medium`, milestone "Technical Tasks (standalone)"), added to the "Agent Skills" board, Priority P2. Board has no `Estimate` field — not mirrored (non-blocking). `github_issue: 417` and the body link written.

### Question Point 2 — Technical decisions (taken, not asked)
- **Q-A: How does the engine learn where to write the record?** Add a `--record <path>` flag to `security-probe.mjs` (the CLI receives no report path today). Rationale: the flag is explicit, optional, and leaves the existing `--json` contract untouched.
- **Q-B: What is the record keyed by?** `{sink, entry}` per control, in a `controls[]` array, with the engine merging (read-modify-write) into an existing record so a multi-control review accumulates one file. Rationale: two controls can share a sink; a sink-keyed record would overwrite one with the other.
- **Q-C: How does finalise read "the same record"?** Its probe-mode Step 3 runs `security-probe.mjs --record` instead of the hand-written temp script. Rationale: the engine already does exactly what the temp script does (import the entry, run the corpus cases, count), and the count can only be engine-emitted if the engine runs.

### Step 8.5 — Apply fixes
- **Decision**: Yes, apply all critical + important fixes (pipeline auto-answer).

### Step 9 — Status update
- **Decision**: Yes, fixes complete → `Planned → Ready for Development` (pipeline auto-answer).

---

## 1. Template Structure Compliance

**Status:** PASS (after fixes)

### Issues

#### Critical
- None.

#### Important
- **No tracker issue linkage** — frontmatter had no `github_issue:`. **Fixed:** issue #417 created and linked; body cross-reference added.

#### Optional
- None.

### Verification performed
- All 11 numbered sections present, plus Change Log, Progress Tracking, References.
- OKF: `type: task`, `description`, `tags` (list) present.
- Placeholder scan: none.
- Sign-off: `sign-off.enabled` absent in `skills-config.yaml` → not checked.
- Change Log: present, one row, consistent with `planned`.
- Card preflight (`sync-jira-task.js --check-card`): exit 0 — Summary 414 chars, Success Criteria 369 chars, Breaking Changes 152 chars; 3 blocks resolve.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (corrected)
**Hallucinations Detected:** 1

### Issues

#### Important
- **The plan says the record is written "next to the review report path the CLI already receives".** `security-probe.mjs` `main()` parses only `--json`, `--sink`, `--entry`, `--cases-file`, `--timeout` (lines 502–520); it receives no report path. **Fixed:** §3 and the plan now state a new `--record <path>` flag is added in Phase 1.
- **finalise's probe mode does not run the engine.** `finalise-dod-security-prompt.md` Step 3 instructs the agent to write a temporary script importing `security-input-corpus.mjs` and run the cases itself; the count is then self-reported. The task's "finalise DoD prompt reads the same record" is only achievable if that step runs `security-probe.mjs --record` instead. **Fixed:** Phase 3 of the plan now says so, and names the two `finalise-dod-prompt-contract.test.mjs` properties (execution, corpus-sourced candidates) the rewrite must keep green.

### Verified claims
- `executed` counter and `no-cases-executed → unverifiable`: `security-probe.mjs` 235–265, 340, 377, 490 — as cited.
- Return shape `{sink, entry, verdict, reason, executed, passed, reproduced, …}`: line 304 — as cited.
- Second site under `boundary: true` with FAIL guard: `finalise-dod-security-prompt.md` 155–170, 198, 213–217 — as cited.
- Gate-side schema: `qa-gate-security-evidence.md` line 20/34/40 — as cited.
- Existing contract test reads the documented example block: `skills/review-security/tests/review-security.test.js` 311–338 — as described in Motivation #1.
- Pre-pass B (architecture): `aligned`, two low notes (bundle step; test location). Pre-pass C (codebase): `not-implemented` — no record, no `--emit-block`, no population test.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (corrected)

### Issues

#### Important
- **Record key is ambiguous.** `sinks:[{sink, executed, reproduced, verdict}]` collides when two controls share a sink (both `url-authority`, say). **Fixed:** record is `controls:[{sink, entry, executed, reproduced, verdict, reason}]` plus `totals`, and the engine merges into an existing record keyed on `{sink, entry}`.
- **No `npm run bundle` step.** `security-probe.mjs`, `security-review-prompt.md` and `finalise-dod-security-prompt.md` are all bundled into skill `references/` copies; `bundle:check` and `bundled-parity.test.mjs` go red in CI without it. **Fixed:** added as plan step 6.

#### Optional
- **`--emit-block` home not named.** The plan introduces it without saying which file carries it. **Fixed:** stated as `security-probe.mjs --emit-block <record>`, printing the `security_review:` skeleton with `probes_executed`, `evidence` and `controls[]` filled from the record.

### Effort estimate
Rubric: base 2 + AC (5−3)=2 + plan items (6−4)×0.5=1 + medium risk 1 + files >5: 1 → 7h; snapped ≈ 6–8h. Frontmatter 5h — divergence 0.29 < 0.5 → no finding.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview ↔ Implementation Plan ↔ Files Summary ↔ Progress Tracking phases align (record → readers → population test).
- Testing Strategy covers each phase (engine unit test, contract test on a real record, population test with floor, mutation).
- Success criteria are measurable; SC5 ("Observation #10 closes naming this PR") is a process step rather than a code property — kept, noted as belonging to `/finalise`.
- Scope: 3 phases, ~7 files, one concern — not a split candidate.
- Mermaid: none present; no data shape or branching that a diagram would clarify beyond the record JSON already shown.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Risk correctly medium: the visible behaviour change is more `reasoned` verdicts where the engine did not run; CHANGELOG entry mandated.
- Rollback `git revert` is sufficient — the record is an unread file after revert; no schema or data migration.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 5 issues — all applied

1. State the `--record <path>` flag; drop the claim that the CLI already receives a report path.
2. Key the record by `{sink, entry}` (`controls[]`), engine merges into an existing record.
3. Rewrite finalise probe-mode Step 3 to run the engine with `--record`; keep the contract test's execution and corpus-sourced properties.
4. Add `npm run bundle` (+ `bundle:check`) to the plan.
5. Link a tracker issue — #417.

### Consider (Optional) - 2 items

1. `--emit-block` lives on `security-probe.mjs` — applied.
2. SC5 is a finalise-time process step — left as is.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 7/10 (one incorrect claim, corrected)
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The defect and both sites are verified against the code; the four corrections make the plan executable without further design decisions.

---

## Next Steps

1. Follow the implementation plan phase by phase (record → readers → population test → bundle).
2. Mutation-prove: delete the record → block reads `reasoned`; hand-type `measured` → contract test reds.
3. `npm run bundle` before commit; `npm run ci` before merge.

---

## Review Metadata

- **Reviewer:** Claude (review-task, via develop-task Step 2)
- **Review Date:** 2026-09-17
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.118.probes-executed-from-engine/task.118.probes-executed-from-engine.md
- **Architecture Docs Consulted:** docs/architecture/concepts/source-tree.md, docs/architecture/concepts/coding-standards.md (via pre-pass B)
- **Pre-pass:** Agent B `aligned` (2 low); Agent C `not-implemented` — both dispatched, both returned within budget
