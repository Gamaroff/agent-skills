# Task Review Report: Task 143 - qa-next: `uat-status.mjs` owns the run state file

**Reviewed:** 2026-09-24
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-09-24

---

## Executive Summary

The task is well-grounded: every symbol it names (`describeRow`, `priorRuns`, `repoPathOf`, `runPathFor`, `seqKey`, `OPTIONS`, the dispatch chain) exists and does what the task says, the exit codes it claims (5, 6) are unused today (the tool uses 1–4), and the co-located plan is specific to the symbol. Three Important gaps were in the target contract itself. The field list omitted `lane`, a field Step 3a writes. `--state-init --next` had no defined behaviour when a state file already exists. And the legacy derivation covered `priorRuns` only, while the released v0.51.0 state file also lacks `targeted`, `bug` and `filedBug`. All three are fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 3 questions resolved autonomously (pipeline run — see below)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Invoked by `/develop-task` under `/develop-next` (autonomous). Each clarifying question was resolved from the code and the task.141 record rather than asked, and is recorded here as an autonomous decision.

### Question Point 1: Structure & Scope

**Q1: The Target Architecture's `STATE_FIELDS` list names 12 fields and omits `lane`, but `--state-set` lists `lane` as mutable and SKILL.md Step 3a writes it (`Store {exit, report} in the state file as lane`). Add it?**

- **Autonomous Decision**: Add `lane` to the field list (writer `--state-set`, readers Steps 4 and 6) and specify value typing for `--state-set`: `lane` takes a JSON value, `runFile`/`filedBug` a string or the literal `null`, and `phase` one of the five phases.
- **Impact**: The schema-coverage test would otherwise enumerate a `STATE_FIELDS` that disagrees with the fields SKILL.md writes. The disagreement would sit in the one export meant to end such disagreements.

### Question Point 2: Technical & Implementation

**Q2: `--state-init` "refuses with exit 5 when a state file names a different item". What does `--state-init --next` do when a state file exists? `--next` names no item.**

- **Autonomous Decision**: Follow SKILL.md Step 0 rule 1, which HALTs `run-in-progress` only "if it names a different item **and this invocation gave an id**" and otherwise resumes. So `--state-init --next` with a state file present prints the existing state unchanged (a resume, exit 0) without re-resolving the queue. Exit 5 is for `--item <id>` naming a different item. When nothing is untested (exit 3) or the id has no row (exit 4), no state file is written.
- **Impact**: Without the rule, `--next` resolves a *different* row once the in-flight run has changed its own row's state. It then either refuses a legitimate resume or overwrites the in-flight lock.

### Question Point 3: Completeness & Safety

**Q3: The legacy derivation covers a state file without `priorRuns`. What state file do in-flight consumers actually hold?**

- **Evidence**: `git show v0.51.0:skills/qa-next/SKILL.md` has the released example, which has no `targeted`, `priorRuns`, `bug` or `filedBug`. All four arrived with task.141 (commits `4d805a47`, `94c28be6`, unreleased).
- **Autonomous Decision**: Extend the derivation to all four. Every derived field is listed in `derived`:
  - `targeted` → `false`, because v0.51.0 took no id argument, so every run was untargeted.
  - `priorRuns` → the row's current `priorRuns` minus the state's `runFile`, as the task already said.
  - `bug` → the row's current bug link while `phase` is before `recorded`, because Step 4.4 has not yet rewritten the note cell. From `recorded` on it is `null`: its only reader, Step 4's reuse decision, has already run.
  - `filedBug` → `null` before `recorded`. From `recorded` on, it is the row's current bug link when the row reads `fail`, and `null` otherwise.
- **Impact**: Deriving only `priorRuns` would make Step 4 read `bug` as absent and file a duplicate bug on a repeat failure, which is the failure task.141 designed `bug` to prevent. Step 6 would also report no bug for a failed run.

---

## 1. Template Structure Compliance

**Status:** PASS

### Issues

#### Critical

- None. All 11 numbered sections are present, plus Change Log, Progress Tracking and References. Frontmatter carries `type: task`, `description` and `tags`. No placeholders. The filename follows the convention.

#### Important

- None. `github_issue: 469` resolves (OPEN) and the body link `[#469](…/issues/469)` matches. Card preflight: 3 blocks resolve (`+N more` counts of 4 / 8 / 5 are information, not defects). `doc-links`: 3 relative links resolve. The Change Log is current for `planned`. Sign-off is not configured.

#### Optional

- None.

---

## 2. Technical Accuracy

**Status:** ACCURATE (3 contract gaps, 0 hallucinations)
**Hallucinations Detected:** 0

Verified against `skills/qa-next/scripts/uat-status.mjs`:

- `describeRow`, `priorRuns(opts, id)`, `repoPathOf`, `bugLinkPaths`, `runPathFor`, `seqKey`, `OPTIONS` and the `dispatch` chain exist as described. `runPathFor` refuses only `/-\d{2}$/`, which confirms CR-1: `--env 10` builds `<date>-10.md`, which `seqKey` reads as run 10.
- The existing exit codes are 1 (`--check`), 2 (usage), 3 (`--next` empty) and 4 (unknown item). The task's 5 and 6 collide with nothing.
- The task counts 19 SKILL.md mentions of the state file. That figure is a prose count that will drift, and no success criterion depends on it; the Migration grep criterion is the check that matters.
- `docs/reference/commands.md` does not enumerate `uat-status.mjs` flags (rows 25–27 describe `/qa-next` only), so Phase 4's conditional item resolves to "no change".

#### Important

- **`lane` missing from the field list** (§3 Target Architecture). Fixed per Q1.
- **`--state-init --next` with an existing state file is unspecified** (§3). Fixed per Q2.
- **Legacy derivation covers one of four missing fields** (§3, §5, §9). Fixed per Q3.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

The phases are concrete, with named symbols and a checkbox per behaviour. The plan file supplies the `STATE_FIELDS` shape, the dispatch-order constraint and the five mutation proofs.

#### Optional

- **Dispatch order belongs in the task, not only the plan.** `--state-init --item D.2` carries `--item`, so the `--state-*` dispatch lines must come before `--item`/`--next`. Added to §3.
- **Phase 4's `commands.md` item.** Its outcome is now recorded as "no change needed", so the implementer does not have to re-derive it.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

The Files Summary matches the phases. The testing strategy covers each command, each refusal, the round trip for the BUG-22 and BUG-23 shapes, and schema coverage. The success criteria map to the deliverables. Four phases touch one skill and its eval, so the task is not oversized.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The high-risk area is executed prose that loses a reader while it is being rewritten. It is mitigated three ways: the integration walk, the Migration grep criterion, and the QA loop. Rollback is split sensibly: Phase 1 is additive and can remain while Phase 2 is reverted. The widened legacy derivation lowers the upgrade risk the Medium section names.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues

1. Add `lane` to `STATE_FIELDS` and type `--state-set` values (Q1). ✅ applied
2. Define `--state-init --next` over an existing state file as a resume, and state that exits 3 and 4 write nothing (Q2). ✅ applied
3. Extend the legacy derivation to `targeted`, `bug` and `filedBug`, and list each in `derived` (Q3). ✅ applied, including §5 Migration, §9 SC and the Phase 1 checklist.

### Consider (Optional) - 2 items

1. State the dispatch order in §3. ✅ applied
2. Record Phase 4's `commands.md` outcome as "no change". ✅ applied

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:**

- ✅ **READY TO IMPLEMENT**

**Justification:** Every claim about existing code checks out. The three gaps were in the contract being introduced, not in the understanding of the current one, and each now has a specified answer that a test can hold.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Follow the plan phase by phase: Phase 1 and Phase 3 first (tool), then Phase 2 (SKILL.md).
2. Mutation-prove every new test, including the widened legacy derivation.
3. Run the Migration grep last.

---

## Review Metadata

- **Reviewer:** review-task (Claude, autonomous pipeline)
- **Review Date:** 2026-09-24
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.143.qa-next-state-file-owned-by-the-tool/task.143.qa-next-state-file-owned-by-the-tool.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md (always-load); `skills/qa-next/scripts/uat-status.mjs`; `skills/qa-next/SKILL.md` (HEAD and `v0.51.0`)
- **Pre-pass:** Phase 1.5 Explore agents B and C were not dispatched. Both passes were performed inline: Explore subagents have hung repeatedly in this repository, and the task's scope is one script and one SKILL.md. Independence loss: the architecture-alignment and already-implemented scans were done by the same agent that reviews. Already-implemented scan: no `--state-*` code or `STATE_FIELDS` exists in the tree (`implementation_status: not-implemented`).
