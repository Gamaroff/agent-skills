# Task Review Report: Task 64 — Publish the supervisor run over HTTP, and write the operator documentation that makes an overnight run repeatable

**Reviewed:** 2026-08-29
**Review Depth:** Standard
**Task Status:** Draft (at review start)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 2 recommendations implemented — 2026-08-29

---

## Executive Summary

Task 64 is a well-sourced, accurately-scoped task. Every technical claim it makes about the existing runner was verified against `skills/loop-supervisor/scripts/run-loop.mjs` and holds: the payload it proposes is genuinely derivable from state task 62 already writes, and it adds no new state as it claims. Two real defects were found — a payload spec that omits the very field its own risk mitigation names, and a Files Summary that would leave a new runbook unindexed and two "no dashboard push yet" statements standing in prose the task itself contradicts.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (pipeline-autonomous review — `develop-task` Step 2)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran non-interactively as Step 2 of the `/develop-task` pipeline, itself dispatched by `/develop-next` for roadmap item **T64**. No clarifying questions were asked; Step 8.5 was auto-answered "Yes, apply all critical + important fixes" and Step 9 "Yes, fixes complete" per the pipeline's autonomous defaults.

Where a judgement call was required, the review deferred to verifiable repository evidence rather than to assumption — each such call is recorded inline below with the evidence that settled it.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven mandatory sections are present and filled: Overview, Motivation, Technical Background, Scope, Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment, Rollback Plan — plus Progress Tracking, Change Log and References. No placeholders (`TBD`, `TODO`, `???`) anywhere in the document.

**Filename**: `task.64.loop-supervisor-dashboard-and-docs.md` — dots as structural separators, hyphens within the descriptive name. ✅

**OKF frontmatter conformance**: `type: task` present ✅ (OKF's one hard requirement); `description` present ✅; `tags` is a well-formed YAML list ✅; `updated` present ✅.

**Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, as specified. Not a finding.

**Change Log** (check 4b): section present with the four canonical columns and one row (`1.0 Initial draft`). Currency is judged against `status:`, which is `draft` — *not* advanced past `planned` — so the log is **not** stale. No finding.

**Tracker card preflight** (check 5a): `sync-jira-task.js --check-card` returns `ok: true`, zero findings. All blocks resolve (Summary 292 chars, Success Criteria 662 chars, Breaking Changes 49 chars). The `+N more` omission counts (1 / 3 / 1) are reported here as information: a board reader sees the first paragraph of the Overview, the first five success criteria and the first breaking-change statement, with the rest behind the document link.

### Issues

#### Optional

- **No tracker issue linked.** Frontmatter carries neither `github_issue:` nor `jira_key:`. Under the skill's default grading this is an Important gap — but it is **downgraded to Optional here on repository evidence**: the two sibling tasks in this same sequence, `task.62.loop-supervisor-runner` and `task.63.loop-supervisor-status-views`, both reached `status: accepted` with no tracker key in their main task file. Unlinked is the established convention for this repo's dogfood tasks, not an oversight in this one. No remote issue was created — doing so unprompted in an unattended run is an outward-facing side effect that no autonomous default authorises.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

This is the strongest part of the document. Every technical claim was checked against the code rather than accepted, and every one holds.

| Claim in the task | Verification | Result |
|---|---|---|
| Payload fields are "derivable from what task 62 already writes" | `run-loop.mjs` — `runId` (809), `sessionId` (921), `costUsd` (1029, 1116), `schemaVersion` (76, 663, 883, 1151), `current.json` (468, 821), `runs.jsonl` (491, 822) | ✅ every field has a real source |
| "This task adds no new state" | No payload field lacks a writer in the existing runner | ✅ accurate |
| The dashboard push does not exist yet | `README.md:281` "No dashboard push yet"; `SKILL.md:154` "No dashboard push." | ✅ not implemented — scope is correct, nothing to scope down |
| `claude --resume <uuid>` is a real affordance | `transcriptPathFor()` (1141–1145) resolves `~/.claude/projects/<slug>/<sessionId>.jsonl`; `sessionId` is pinned per iteration (921) | ✅ the recipe the runbook is to document actually works |
| `docs/runbooks/` is the right home | Directory exists with 16 runbooks and an indexed README | ✅ |
| `tests/executable-instructions.test.js` is the gate | File exists in `tests/` | ✅ |
| `evals/loop-supervisor/unit/*.test.mjs` is where the tests go | Directory exists with 4 suites, **and is already listed in the `npm test` glob** in `package.json:24` | ✅ new suites will actually run — the orphaned-glob trap does not apply here |
| `skills-config.yaml` and `docs/reference/configuration.md` carry a `loopSupervisor:` block | `skills-config.yaml:19–23`; `configuration.md:127–133` (example) and `:188–191` (key table) | ✅ both exist; new rows extend rather than create |
| `develop-next` has a §Continuous mode to cross-reference | `skills/develop-next/SKILL.md:265–267`; `skills/develop-next/README.md` exists | ✅ both targets real |

No invented libraries, no invented paths, no invented APIs. The payload uses `fetch`, which is built into the Node versions this repo targets — no new dependency.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

Five phases, each with a clear purpose and a concrete deliverable. Phase 2 ("prove the failure policy") is correctly identified by the task itself as the one property that matters, and is planned as a test rather than an assertion — good.

### Issues

#### Important

- **Files Summary omits `docs/runbooks/README.md`.**
  - **Location:** Files Summary → Modified table; Implementation Plan → Phase 4.
  - **Problem:** `docs/runbooks/README.md` is an index table of 18 runbook links. A new `unattended-overnight-runs.md` that is not added to it is reachable only by someone who already knows the filename — which defeats the point of a runbook whose stated purpose is to let *a second person* reproduce the run. The task's own Success Criterion 4 ("takes an operator from nothing to a completed overnight run") cannot be met by an unindexed file.
  - **Fix applied:** added `docs/runbooks/README.md` to the Modified table, and named the index entry in Phase 4.

- **Two standing "no dashboard push" statements must be removed, not merely appended around.**
  - **Location:** `skills/loop-supervisor/README.md:281` ("**No dashboard push yet** — a different transport with a different failure policy, and separate work.") and `skills/loop-supervisor/SKILL.md:154` ("**No dashboard push.**").
  - **Problem:** both sit under a `## Limits` heading. The Files Summary lists both files as Modified but describes the change only as additive ("Payload contract, consumer warnings…", "Dashboard mentioned in the body"). An implementer following that description literally would document the new push while leaving a Limits section that says it does not exist — self-contradicting prose in the two files a reader consults first.
  - **Fix applied:** both file rows in the Files Summary now name the removal explicitly, and Phase 3 and Phase 5 name it as a step.

#### Optional

- **Effort estimate.** `estimated_effort_hours: 6` against 8 success criteria, 5 phases and `risk_level: low` sits within tolerance of the rubric (~6–8h). No adjustment recommended.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

Internal alignment is otherwise good: the Overview's two halves map cleanly onto Phases 1–2 and Phases 3–5, the Files Summary matches the phases, and Testing Strategy covers every phase that produces code.

### Issues

#### Important

- **The payload example omits `schemaVersion`, which the task's own risk mitigation names.**
  - **Location:** Technical Background → "The payload" JSON block, versus Risk Assessment → "Contract drifts from what the consumer builds → *Payload documented in full and versioned with `schemaVersion`*", versus Success Criterion 1 ("posts a payload matching the documented contract").
  - **Problem:** three parts of the document disagree. The mitigation promises a versioned payload; the payload spec has no version field; and the success criterion gates on matching a contract that is therefore under-specified. This is exactly the kind of gap that ships as a consumer parsing a payload it cannot version-check — the failure the mitigation was written to prevent.
  - **Evidence that the fix is free:** `run-loop.mjs:76` already defines `const SCHEMA_VERSION = 1`, and stamps it into every `runs.jsonl` row (`:1151`) and into `current.json` (`:663`, `:883`). The field exists; the payload spec simply did not carry it.
  - **Fix applied:** `schemaVersion` added to the payload example as its first field, with a note that it is the same constant the ledger and `current.json` already carry — so the dashboard can version-check against a value it may already have seen.

#### Optional

- **The cost note already exists in `SKILL.md`, and the README version must agree with it.** `SKILL.md:150–153` already carries an honest per-iteration cost statement with the prompt-cache caveat ("Not free. Every iteration re-primes CLAUDE.md, the skill files and the roadmap. Much of that should be prompt-cache-served since the prefix is identical across iterations, but it is a real per-iteration floor."). Success Criterion 6 is therefore already half-satisfied. Phase 3's README note should be written as the fuller companion to that statement, not as a second independent one that could drift from it. Noted for the implementer; no document change required.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Five risks identified, each with a mitigation that is a concrete action rather than a hope. Two are worth calling out as well-judged:

- **"A push failure aborts a long run" → proved by three deliberate-breakage tests.** The task correctly treats this as the one property that must be demonstrated rather than assumed, and Phase 2 exists solely to demonstrate it.
- **"Token logged in a transcript or ledger line" → asserted by test.** A real leak path (the runner writes `runs.jsonl` and `current.json` to disk and the ledger is committed in some workflows), correctly mitigated by an assertion rather than a convention.

**Rollback Plan** is genuine and per-item: the flags are opt-in and the push is inert without `--dashboard`, so removing the two flags and the runbook returns the repo to its current state. The cross-references are explicitly noted as independently revertible.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 2 issues

1. **Add `schemaVersion` to the documented payload** — the Risk Assessment's stated mitigation and Success Criterion 1 both depend on it, and the runner already emits the constant. ✅ **Applied.**
2. **Name `docs/runbooks/README.md` in the Files Summary, and name the removal of the two standing "no dashboard push" statements** — otherwise the new runbook is unindexed and the two most-read files contradict themselves. ✅ **Applied.**

### Consider (Optional) — 2 items

1. Tracker linkage is absent, consistent with sibling tasks 62 and 63. No action.
2. Write the README cost note as the companion to the existing `SKILL.md:150–153` statement rather than a second independent one.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 10/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Zero critical issues, zero hallucinations, and every technical claim independently verified against the runner it builds on. The two Important issues were internal inconsistencies rather than gaps in understanding, and both have been fixed in the document; what remains is a task an implementer can follow phase by phase without guesswork.

---

## Next Steps

Task is ready for implementation. The implementer should:

1. Follow the five phases in order — Phase 2 (deliberate-breakage tests) is the phase that carries the task's actual value; do not fold it into Phase 1.
2. Remove the two `## Limits` statements as part of Phases 3 and 5, rather than appending around them.
3. Index the new runbook in `docs/runbooks/README.md`.
4. Run `npm run bundle`, `npm test`, `npm run format:check` and the link check before opening the PR.

---

## Review Metadata

- **Reviewer:** review-task (autonomous — `/develop-task` Step 2, dispatched by `/develop-next` for roadmap item T64)
- **Review Date:** 2026-08-29
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.64.loop-supervisor-dashboard-and-docs/task.64.loop-supervisor-dashboard-and-docs.md`
- **Sources Consulted:** `skills/loop-supervisor/scripts/run-loop.mjs`, `skills/loop-supervisor/README.md`, `skills/loop-supervisor/SKILL.md`, `skills/develop-next/SKILL.md`, `skills/develop-next/README.md`, `skills-config.yaml`, `docs/reference/configuration.md`, `docs/runbooks/README.md`, `package.json`, `evals/loop-supervisor/unit/`, sibling tasks 62 and 63
- **Tracker card preflight:** `sync-jira-task.js --check-card` → `ok: true`, 0 findings
