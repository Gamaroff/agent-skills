# Task Review Report: Task 73 — Make the DoD security check execute candidate inputs, not grep for them

**Reviewed:** 2026-09-02
**Review Depth:** Standard
**Task Status:** Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 Important recommendations implemented — 2026-09-02
> (1 accepted-as-flagged with a recorded assumption; see Q1.)

---

## Executive Summary

Task 73 is a well-evidenced, tightly-scoped prompt change with an unusually strong motivation section —
every claim it makes about task 67 was verified against the artifacts and commits it cites, and all of
them hold. The plan names real files, edits the correct source (not the generated copy), and lands its
new test where the `npm test` glob already picks it up. The three Important findings are a stale Change
Log, an unlinked tracker issue, and a verification step that could not be run the way the Success
Criteria implied.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 1 question resolved autonomously (pipeline run — assumption recorded)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline (autonomous). Questions that would normally be asked
interactively were resolved from the document and the codebase, with the assumption recorded.

**Q1: The task has no `github_issue:` in frontmatter. Create and link a GitHub issue now?**

- **Decision**: **Skip — leave unlinked.** Taken as the skill's explicit "Skip / no sync chosen" branch.
- **Rationale**: creating a public GitHub issue is an outward-facing side effect that no autonomous
  default in `develop-pipeline-autonomous-defaults.md` covers, and `review-task` itself states a remote
  issue must never be created unprompted. Phase 0c of the pipeline had already resolved
  `TRACKER_ISSUE=""` and recorded that all tracker operations are skipped for this run; creating one
  mid-review would contradict a decision already logged.
- **Impact**: the Important finding stays flagged rather than fixed. Run `/sync-github-task` later to
  link it. Nothing in the implementation depends on the link.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (1 Important)

All 11 mandatory numbered sections are present (Overview, Motivation, Technical Background, Scope,
Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk
Assessment, Rollback Plan), plus Change Log, Progress Tracking, References and Notes. Filename follows
`task.{n}.{descriptive-name}.md` with dots as structural separators. No placeholders (`[TBD]`,
`[TODO]`, `???`) anywhere in the document.

**OKF conformance**: `type: task` present; `description` present and substantive; `tags` a proper YAML
list; `updated` present. Conformant.

**Stakeholder Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped
entirely, as specified. Not a finding.

**Tracker card preflight**: `sync-jira-task.js --check-card` exits 0 — Summary (92 chars), Success
Criteria (332 chars) and Breaking Changes (116 chars) all resolve, each with a `+N more` link. No
findings. For information: a board reader sees 4 omitted Overview sentences, 4 omitted success criteria
and 2 omitted breaking-changes lines behind those links.

### Issues

#### Important
- **Change Log stale** — the newest row was `1.0 Initial draft` (2026-09-01) while frontmatter `status`
  had already advanced to `ready-for-development`. Enforcement is `advisory` (default), so this did not
  block development. **Fixed** — a `1.1` verdict row was appended and `updated` bumped to 2026-09-02.
- **No tracker linkage** — `github_issue:` absent from frontmatter. Flagged, deliberately not fixed;
  see Q1.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every external claim in this task was checked against the repository. All of them hold:

| Claim | Verification |
|---|---|
| `shared/resources/finalise-dod-security-prompt.md` is the source | ✅ exists |
| `skills/finalise/references/finalise-dod-security-prompt.md` is the generated copy | ✅ exists, carries the `AUTO-GENERATED` banner |
| `skills/finalise/SKILL.md` renders the Security section | ✅ exists; the render site is `SKILL.md:416–440` ("Append 2 — Security section") |
| `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` | ✅ correctly listed as *to create* — does not exist |
| Commit `a74c59a` is pre-fix | ✅ "close thirteen fail-open holes in the snippet classifier" |
| Commit `0c4c05f` is post-fix | ✅ "close fourteen more fail-open routes found at the DoD gate" |
| `task.67.bug.3` records 14 routes | ✅ title and body both say *fourteen*, found at the DoD gate |
| `task.67.gate.2` recorded `security: PASS` | ✅ exists |
| `shared/resources/mutation-proving.md` | ✅ exists |
| Sibling `task.74` | ✅ `docs/tasks/task.74.security-re-review-reprobes` exists |

The task edits the **source** and commits the regenerated bundle output — the correct handling for this
repository, and explicitly called out in the Files Summary with the reason.

### Pre-pass: architecture alignment (`drift`, 3 findings — all resolved here)

- *(low, pattern)* "New test at `evals/shared/tests/` — `source-tree.md` documents `evals/shared` as
  runner/harness only." **Not a finding.** That directory already holds 12 `*.test.mjs` files and is
  already inside the `npm test` glob (`'evals/shared/tests/*.test.mjs'`). The new test lands beside its
  siblings and will actually run — which is the failure mode that matters here.
- *(medium, security)* "Probe mode redefines the read-only agent to execute code." **Addressed by the
  task itself**, in §3 *Important clarifications* and Risk Assessment §High Risk Areas 1: read-only is
  redefined as *does not mutate*, not *does not run*; execution is confined to the classification entry
  point, a temp cwd and no credentials. Recorded as Optional below, not Important.
- *(low, api-contract)* "Optional `probes[]` key added to the DoD YAML envelope; no schema doc."
  Recorded as Optional below.

### Pre-pass: codebase scan

`implementation_status: not-implemented`, no findings — no part of this deliverable already exists, so
there is no scope to trim.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each carrying a risk level, an explicit file list, concrete checkboxed changes and a
dependency line forming a clean chain (1 → 2 → 3 → 4). Changes are specific rather than gestural —
Phase 2 enumerates the candidate axes (spelling, position, composition, unparseable, long/short flag
forms) instead of saying "generate candidates". Phase 1 states its negative case explicitly, which is
what stops the detection rule firing on every work item.

**Effort estimate**: frontmatter `estimated_effort_hours: 6`. The rubric computes 8h (ac_count 9,
task_count 15, files_touched 4, risk medium → 11h, snapped to the 8 bucket). Divergence is 25%, well
inside the 2× threshold. **No finding.**

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (1 Important)

Files Summary matches the files named in the phases. Scope §Out of Scope is unusually disciplined and is
consistent with the plan. Success Criteria map cleanly onto the phases. Rollback is proportionate to a
prompt change ("delete the section; the checklist still runs") and is genuinely achievable.

### Issues

#### Important
- **Replay Verification was not runnable as written, but two Success Criteria treated it as if it
  were.** The Testing Strategy gave the Contract Tests a `**Command**:` and gave Replay Verification
  none — correctly, because the thing under test is a *prompt* and exercising it means dispatching an
  agent, which `node --test` cannot do. But the two Regression criteria ("Replay against `a74c59a`
  reproduces the task-67 routes" / "against `0c4c05f` reports none") sat unqualified beside criteria
  that *are* automated. QA and the DoD gate would look for a green test proving them and find nothing —
  scoring a deliberately-manual step as an unmet automated one.
  **Fixed** — the section now states plainly that it is an agent-run verification rather than a
  `node --test` case, supplies the concrete `git show …` procedure for materialising both historical
  files, and both Regression criteria are annotated *(agent-run — verified by recorded outcome, not by
  the test suite)*.

> This finding matters more than its severity suggests: this task exists precisely because a check that
> only *reads* was mistaken for a check that *holds*. Leaving its own most important verification step
> ambiguous about whether anyone actually runs it would have reproduced the defect in the fix.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Both of the real risks are identified and correctly ranked. The high risk ("a probe that mutates
something") has a mitigation that addresses the mechanism rather than the symptom — probe the
*classification* entry point, never the execution one. The medium risk ("the prompt becomes a machine
that always finds something") is mitigated by the post-fix replay assertion, and the task is explicit
that this assertion is not optional. That is the correct call: without it the change ships a
false-positive generator, which would be worse than the grep it replaces.

Rollback is a single deletion with a stated verification. Realistic.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 3 issues

1. ✅ **Fixed** — Change Log stale; `1.1` verdict row appended, `updated` bumped.
2. ✅ **Fixed** — Replay Verification labelled an agent-run step with a concrete procedure; the two
   Regression criteria annotated so QA does not score them as failed automated checks.
3. ⏭ **Flagged, not fixed** — no `github_issue:` linkage. Deliberate; see Q1. Run `/sync-github-task`
   to link it when wanted.

### Consider (Optional) — 2 items

1. The redefinition of "read-only" (does not mutate ≠ does not run) is asserted only inside this task,
   yet it governs a word used across all four DoD prompts. Phase 4's contract test pins the read-only
   clauses in code, which covers most of the risk. Recording the convention in a standards doc is worth
   a follow-up — noting that the other three prompts are explicitly out of scope here.
2. The `probes[]` return shape is documented only in the prompt and `finalise/SKILL.md`. The contract
   test asserts it, so it is held; a schema note under `docs/standards/` would make it discoverable.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 8/10 — stale Change Log (fixed), no tracker link (flagged)
- Technical Accuracy: 10/10 — every cited file, commit and artifact verified; zero hallucinations
- Implementation Clarity: 10/10 — four phases, explicit files, concrete changes, clean dependency chain
- Consistency: 8/10 — replay verifiability gap (fixed)
- Risk Management: 9/10 — both real risks identified with mechanism-level mitigations

**Confidence Level for Successful Implementation:** High

**Recommendation:**

✅ **READY TO IMPLEMENT** — no critical issues, score ≥ 8, and the two Important issues that were
fixable have been fixed. The remaining Important issue (tracker linkage) is administrative and blocks
nothing.

**Justification:** The task is evidence-led rather than speculative — its motivating claims were checked
one by one and all held — and its plan edits the right files in the right order, with the source/generated
distinction handled correctly.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the plan phase by phase (1 → 2 → 3 → 4; the dependency chain is real, not decorative).
2. Edit `shared/resources/finalise-dod-security-prompt.md`, **never** the `skills/finalise/references/`
   copy; run `npm run bundle` and commit the regenerated file, or CI's Bundle freshness check fails.
3. Run the contract test: `node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs`.
4. Run the replay verification by hand per Testing Strategy §Replay Verification and **record both
   outcomes in the implementation report** — the post-fix "reports none" result is the one that keeps
   the prompt honest.
5. Mutation-prove the fix per `shared/resources/mutation-proving.md`.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, `/develop-task` Step 2/8)
- **Review Date:** 2026-09-02
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.73.dod-security-probe-not-grep/task.73.dod-security-probe-not-grep.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/source-tree.md`, `docs/architecture/concepts/tech-stack.md`
- **Pre-pass Agents:** B (architecture alignment) → `drift`, 3 findings, all resolved in §2; C (codebase scan) → `not-implemented`, 0 findings
