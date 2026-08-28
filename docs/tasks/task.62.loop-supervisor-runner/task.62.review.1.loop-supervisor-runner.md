# Task Review Report: Task 62 — Run each loop iteration in a fresh Claude process, and classify the outcome from the filesystem

**Reviewed:** 2026-08-28
**Review Depth:** Standard
**Task Status:** Draft (at review time)
**Overall Assessment:** GOOD

---

## Executive Summary

Task 62 is an unusually well-researched planning document: every file path, line-number citation and CLI fact it asserts was verified against the working tree during this review and all of them check out. The design constraint that carries the correctness of the whole feature — *classify from filesystem post-conditions, never from the assistant's prose* — is stated explicitly and given its own isolated, unit-testable module.

Two issues were found. One is a real scheduling defect: **Success Criterion 5 cannot be executed by the pipeline that implements this task**, because a nested `/develop-next` collides on the very state files that the outer run holds. The other is a convention gap: the task carries no linked tracker issue where its three most recent siblings do.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked — invoked inside the `develop-task` pipeline in autonomous mode
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran non-interactively as Step 2 of the `develop-task` pipeline (itself dispatched by `/develop-next` for roadmap item **T62**). No `AskUserQuestion` prompts were issued. The pipeline's documented autonomous answers were applied:

- **Output format** → "Comprehensive report" (this file).
- **Step 8.5 apply fixes** → "Yes, apply all critical + important fixes".
- **Step 9 status update** → "Yes, fixes complete" (outcome is READY TO IMPLEMENT).
- **Tracker sync for the unlinked issue** → *not* auto-answered. This situation appears in neither the shared nor the skill-specific autonomous-defaults table, and creating a remote issue is an outward-facing side effect. `review-task` Step 2 check 5 defines the no-answer path explicitly — flag the gap, make no remote changes, do not halt — so that path was taken. See Important issue 2.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections are present: Overview, Motivation, Technical Background, Scope, Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment, Rollback Plan — plus Progress Tracking, Change Log and References.

- **Filename**: `task.62.loop-supervisor-runner.md` — correct dot/hyphen convention. ✅
- **Placeholders**: none found (`[TBD]`, `[TODO]`, `???` all absent). ✅
- **OKF frontmatter**: `type: task` present and non-empty; `description` present; `tags` is a proper YAML list; `updated: 2026-08-28` present. ✅
- **Stakeholder Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, as specified. Not a finding.
- **Change Log**: present with the four canonical columns and one row (`1.0 Initial draft`). Currency is graded only once `status` has advanced past `planned`; status is `draft`, so the log is current. Not a finding.
- **Tracker card preflight** (`sync-jira-task.js --check-card`): exit 0, no problems. Summary 315 chars, Success Criteria 639 chars, Breaking Changes 113 chars — all three blocks resolve, each with a `+N more` link. Reported as information: a board reader sees 1 omitted summary sentence, 3 omitted success criteria and 1 omitted breaking-change line.

### Issues

#### Important
- **Missing tracker linkage** — see Important issue 2 below (counted once, in the summary).

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

This is the strongest part of the document. Every checkable claim was checked:

| Claim in task | Verification | Result |
| --- | --- | --- |
| `select-next.mjs` direct-invocation guard at `:849-860`, comment at `:843-848` | `sed -n '840,865p'` on the file (860 lines total) | ✅ `isInvokedDirectly()` is at 849–860; the comment describing the silent-exit-0 failure is at 843–848, verbatim as characterised |
| `commandArg` is repo-root-relative, no path resolution (`:250`, `:620`) | read both line ranges | ✅ `:250` assigns `commandArg` from the regex capture or `workItemPath(rest)` with no resolution; `:620` interpolates `${row.command} ${row.commandArg}` directly |
| `claude` v2.1.250 is the measured version | `claude --version` | ✅ `2.1.250 (Claude Code)` — matches exactly |
| Node ≥ 22 | `node --version` | ✅ v24.13.1 |
| `schedule.mjs` is the CLI house style | file exists at `skills/develop-batch/scripts/schedule.mjs` | ✅ |
| `claude-cli.mjs` is the headless prior art | file exists at `evals/shared/drivers/claude-cli.mjs` | ✅ |
| `develop-pipeline-on-precompact.sh` / `on-stop.sh` are the halt/lock sources | both exist under `shared/resources/` | ✅ |
| `develop-pipeline-pause.md` documents the lock | exists at `skills/develop-story/references/` | ✅ |
| `skills/loop-supervisor/` is new | `ls` → does not exist | ✅ genuinely additive |

**The `node`-not-on-PATH risk is confirmed, not hypothetical.** During this review, `node --version` in a non-interactive shell printed nvm's full help text before the version string, and `command -v node` returned the bare word `node` rather than a path — node is a shell function here, not a binary on `PATH`. The task's Phase 3 instruction to *"resolve `node` and `claude` to absolute paths"* is therefore load-bearing, not defensive boilerplate. The real interpreter is at `~/.nvm/versions/node/v24.13.1/bin/node`; `claude` is a genuine binary at `~/.local/bin/claude`.

### Issues

None.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Five phases, each with a stated purpose and concrete deliverables, ordered so the correctness-critical module (`classify.js`) is built and tested **before** anything spawns a process. Phase dependencies are implicit but unambiguous — 2 needs 1's outcome vocabulary, 3 needs 2's adapters, 4 needs 3's spawn, 5 documents 1–4.

`Files Summary` lists 7 new files and 5 modified ones, and each maps onto a phase. The two traps are named as Phase 1 *tests* rather than as afterthoughts, which is the right place for them.

`estimated_effort_hours: 16` against 8 success criteria, 8 progress-tracking items and `risk_level: medium` sits inside the rubric's expected band. No finding.

### Issues

None.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

Internal consistency is good: Overview, Scope, Files Summary, Implementation Plan and Progress Tracking all describe the same 5-phase shape with the same artefact list. Testing Strategy names five layers and each maps to a success criterion.

### Issues

#### Important

**1. Success Criterion 5 is not executable by the pipeline that implements this task.**

- **Location:** `## Success Criteria` item 5; `## Testing Strategy` → "End-to-end, real".
- **Problem:** SC5 requires *"One real `/develop-next` iteration completes with outcome `progress`, a merged PR and no leftover lock."* Task 62 is being implemented **by** a `/develop-task` pipeline that `/develop-next` itself dispatched. A nested `/develop-next` run inside it would collide three ways:
  - `.claude/state/develop-next.state.json` is **currently held** by the outer run and is that skill's own single-flight lock. Its Step 0 rule is explicit: if the file exists, *do not select a new item* — so the nested run would resume the outer run's own T62 item rather than testing anything.
  - `.claude/state/develop-pipeline.lock` is held by this `develop-task` run; the nested pipeline's Step 1 collision check HALTs on it by design.
  - Even if both locks were free, a passing SC5 would **select, develop and merge the next roadmap item** as a side effect of testing — an unrelated PR merged to `develop` in the name of a test.
- **Why this matters beyond the mechanics:** SC5 is the criterion that proves the whole feature works end to end. Leaving it worded as an in-pipeline gate means it will either be silently skipped (and the gate proves nothing) or attempted (and it corrupts the run). Both outcomes are worse than acknowledging it is an operator step.
- **Fix applied:** SC5 reworded as a post-merge operator acceptance step, explicitly excluded from the implementing pipeline's gate, with the collision reason stated so nobody re-adds it later. The Testing Strategy row was updated to match. SC4 (the cheap `generic`-adapter end-to-end) is **unaffected and stays in scope** — it spawns `claude -p` with a trivial prompt, touches none of the pipeline state files, and costs cents.

**2. No linked tracker issue.**

- **Location:** frontmatter.
- **Problem:** the document has neither `github_issue:` nor `jira_key:`. Its three most recent siblings — `task.58`, `task.60`, `task.61` — all carry `github_issue:`, so this is a departure from live repo convention rather than a repo that does not use tracker linkage. Downstream, every tracker moment in this pipeline (work-started board move, review comment, PR-opened comment, finalise close, `pr-merged`) no-ops silently for want of an issue number.
- **Fix not applied — deliberately.** Creating a GitHub issue is an outward-facing side effect, this situation is absent from both autonomous-defaults tables, and `review-task` Step 2 check 5 states the unlinked path plainly: *"make no remote changes, keep the Important gap flagged … Do NOT halt."* Recorded here for the operator to resolve with `/sync-github-task docs/tasks/task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md` when convenient. Non-blocking: the pipeline handles an empty `TRACKER_ISSUE` cleanly at every step.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Seven risks, each with likelihood, impact and a concrete mitigation. Notably, the three High-impact / High-likelihood rows all have mitigations that are *testable artefacts* rather than intentions — "empty stdout is an error by construction, with a unit test", "timestamp comparison … both directions unit-tested", "`incomplete` is a first-class outcome". That is the right shape.

The Rollback Plan is genuinely complete for an additive change: delete one directory, revert one config block, two doc rows and one test-glob entry. The claim that no state file is shared with an existing skill was verified — `.claude/state/loop-supervisor/` and `.claude/state/loop-supervisor.lock` are new names not used elsewhere.

### Issues

#### Optional

- **The `claude` CLI flag surface is a live dependency with no pinned floor.** The task correctly says "re-verify at implementation time" and `dry-run` printing argv makes drift visible. Consider additionally recording the verified `claude --version` in the README next to the flag list, so a future reader can tell at a glance whether the facts have been re-checked since 2.1.250. Not blocking.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 2 issues

1. **Reword Success Criterion 5 as a post-merge operator step** — it cannot run inside the implementing pipeline without colliding on `develop-next.state.json` and `develop-pipeline.lock`. *Applied in Step 8.5.*
2. **Link a tracker issue** — `/sync-github-task` on this file. *Not applied: outward-facing, uncovered by the autonomous-defaults tables, and explicitly non-halting per `review-task` Step 2 check 5.*

### Consider (Optional) — 1 item

1. Record the verified `claude --version` in the README beside the flag list.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10 — every section present, card preflight clean; −1 for the missing tracker linkage
- Technical Accuracy: 10/10 — every citation verified, including exact line numbers; zero hallucinations
- Implementation Clarity: 9/10 — five ordered phases, correctness-critical module first
- Consistency: 6/10 — SC5 specified a test the implementing pipeline structurally cannot run
- Risk Management: 9/10 — mitigations are testable artefacts, not intentions

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues and no hallucinations in an unusually well-sourced document; the one substantive defect (SC5's nested-pipeline collision) is a specification problem fixed by rewording, not a design problem requiring rework.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the five phases in order — `classify.js` and its full outcome-table test suite **before** anything spawns a process.
2. Re-verify the `claude` CLI flag facts against the installed version (2.1.250 at review time) as Phase 3 begins.
3. Resolve `node` and `claude` to absolute paths — confirmed necessary in this environment, where `node` is an nvm shell function that prints help text to stdout.
4. Treat SC5 as an operator acceptance step after this task's PR merges, not as an in-pipeline gate.
5. Run `/sync-github-task` on this file to close the tracker-linkage gap.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, Step 2 of `develop-task`, dispatched by `/develop-next` for roadmap item T62)
- **Review Date:** 2026-08-28
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`
- **Sources Verified:** `skills/develop-next/scripts/select-next.mjs`, `skills/develop-batch/scripts/schedule.mjs`, `evals/shared/drivers/claude-cli.mjs`, `shared/resources/develop-pipeline-on-{precompact,stop}.sh`, `package.json`, `skills-config.yaml`, `claude --version`, `node --version`
