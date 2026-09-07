# Task Review Report: Task 80 — Make a security probe runnable without widening the snippet allow-list

**Reviewed:** 2026-09-07
**Review Depth:** Standard
**Task Status:** Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 actionable recommendations implemented — 2026-09-07

---

## Executive Summary

The task's premise is sound and every API it depends on was verified to exist. The defects are all
**reference drift**: `qa-execute-snippets.mjs` grew from 1032 to 1517 lines when `task.79` landed, and
five of the seven line anchors this task cites now point at unrelated code. One of those stale claims is
not merely cosmetic — Phase 1 instructs the developer to "confirm" that `snapshotTree()` is already
exported, and it is not. All were corrected in place.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (`/develop-next` → `/develop-task`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran non-interactively inside the `develop-task` pipeline under an explicit AUTONOMOUS RUN
directive. No `AskUserQuestion` prompts were issued. Pipeline defaults applied:

| Prompt | Auto-answer | Rationale |
|---|---|---|
| Step 0 — output format | Comprehensive report | Required for the pipeline audit trail |
| Step 8.5 — apply fixes | Yes, all critical + important | Pipeline needs the task corrected before Step 3 runs `/develop` |
| Step 9 — update status | N/A — already `Ready for Development` | No promotion needed |
| Step 5 — tracker sync (no `github_issue`) | **Skip — leave unlinked** | Creating a remote issue is opt-in and requires consent. No user is present to give it. |

---

## 1. Template Structure Compliance

**Status:** PASS (one Important issue)

All 11 mandatory numbered sections present, plus Change Log, Progress Tracking, References and Notes.
Filename follows `task.{n}.{descriptive-name}.md`. OKF frontmatter conformant: `type: task` present and
non-empty, `description` present, `tags` a YAML list, `updated` present.

**Tracker-card preflight** (`sync-jira-task.js --check-card`): **exit 0, no problems found.**

```
✅ Summary              145 chars, 5 omitted → "+N more" link
✅ Success Criteria     458 chars, 6 omitted → "+N more" link
✅ Breaking Changes     159 chars, 1 omitted → "+N more" link
```

Sign-off is **not checked** — `skills-config.yaml` declares no `sign-off` key, so the section is neither
expected nor graded.

### Issues

#### Important
- **[I-6] Change Log was stale.** Newest row was `1.0 Initial draft` (2026-09-02) while `status:` had
  advanced to `ready-for-development` — the check-4b currency condition exactly. **Fixed**: this review's
  verdict row was appended and `updated:` bumped in the same edit.
- **[I-5] No tracker issue linked.** Frontmatter carries neither `github_issue:` nor `jira_key:`.
  **Not fixed** — creating a remote issue is opt-in and this run has no user to consent. Consequence for
  this pipeline: every tracker comment and board move in Steps 1–7 is skipped. Run `/sync-github-task`
  afterwards to link it.

**Score: 9/10**

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (all corrected)
**Hallucinations Detected:** 0

Every API, file and mechanism this task depends on was verified to exist. Nothing was invented:

| Claim | Verified at | Verdict |
|---|---|---|
| `corpusFor(sink)` from task.79 | `shared/resources/security-input-corpus.mjs:702` | ✅ real, exported |
| `spawnBudget(prefix)` shared budget | `shared/resources/tests/spawn-budget.mjs:81` | ✅ real, exported |
| Hardcoded-timeout guard fails the build | `tests/test-harness-concurrency.test.js:403` | ✅ real |
| CR-12 minimal env exists in `runBlock` | `qa-execute-snippets.mjs:1121-1127` | ✅ real |
| `SAFE_COMMANDS` excludes interpreters | `qa-execute-snippets.mjs:117` | ✅ real, anchor still correct |
| `COMMAND_RUNNERS` | `qa-execute-snippets.mjs:165` | ✅ real, anchor still correct |
| Replay suite green-gate | `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` | ✅ exists |
| `npm run ci` = `ci:fast && eval:all` | `package.json` | ✅ real |

### Issues

#### Important (stale references — all fixed)

- **[I-1] `snapshotTree` is NOT exported, but Phase 1 says it is.** The plan read *"Export `snapshotTree()`
  unchanged — it is already exported at `:648`; confirm and pin"*. At `:1081` it is
  `function snapshotTree(dir, skipDir = null) {` — module-private. A developer following the instruction
  literally would "confirm" a false premise and skip the only change that makes the primitive reusable,
  then find `security-probe.mjs` unable to import it.
  **Fixed**: Phase 1 now reads *"**Export `snapshotTree()`** — it is defined at `:1081` as a module-private
  `function snapshotTree(`, **not** exported. Adding the `export` keyword is the change; there is nothing
  to 'confirm'. Its body stays byte-identical."* §7 Files-to-Modify updated to match.

- **[I-2] Five line anchors in §3 point at unrelated code.** The file is 1517 lines, not the 1032 stated.
  **Fixed** in §3 and in §References:

  | Cited | Actual | Symbol |
  |---|---|---|
  | 1032 lines | **1517** | file length |
  | `:259` | **`:422`** | `DENY_PATTERNS` |
  | `:561` | **`:982`** | `classifyBlock` |
  | `:648` | **`:1081`** | `snapshotTree` |
  | `:680` | **`:1113`** | `runBlock` |
  | `:688-698` | **`:1121-1127`** | minimal env |

- **[I-3] The quoted prose moved.** `finalise-dod-security-prompt.md:120-122` is now a JS code block about
  resolving the corpus module. The quoted *"**3. Execute them.**"* line is at **`:145-146`**, under
  §"Step 4: Probe mode — only when Step 1b fired" (`:99`). **Fixed** in §1 and §References.

- **[I-4] The QA case set has grown.** Cited twice as `QA-1…QA-14`; the suite now carries **QA-1…QA-17**.
  Left uncorrected, the parity test would pin 14 of 17 cases and three fail-open routes would go unpinned
  by the very test that exists to pin them. **Fixed** in Phase 1 and in §8 Testing Strategy.

> All six drifted together and from one cause: `task.79` landed in the same file between this task being
> authored (2026-09-02) and reaching the front of the queue (2026-09-07). This is the ordinary cost of a
> queued task whose dependency edits the same file — not an authoring defect.

**Score: 7/10** (before fixes) — the premise was accurate throughout; only the coordinates drifted.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with a risk level, explicit file list, checkbox-level changes, and a declared
dependency. Phase ordering is a genuine chain (1 → 2 → 3 → 4) and Phase 1 is deliberately landed alone
with parity tests before any probe code exists — the correct sequencing for a behaviour-preserving
extraction under a security boundary.

Specificity is above the bar this check tests for: changes name functions (`runProbeSpec`,
`sandboxEnv`, `snapshotTree`), file paths, and the exact shape of the return value
(`{ executed, passed, reproduced[], declined[] }`).

**Effort estimate**: `estimated_effort_hours: 6` against a rubric estimate of ~10h for 4 phases /
13 success criteria / medium risk — a 0.4 divergence, inside the 0.5 flag threshold. Not flagged, but it
is at the optimistic end given four mutation proofs are in scope.

**Score: 9/10**

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, Scope and Implementation Plan agree on what is being built and what is refused.
- §7 Files Summary matches the files named in the phases (after the [I-1] correction).
- Testing Strategy covers all four verdicts, the containment cases and four mutation proofs.
- Success Criteria are measurable and map to stated benefits.
- Out-of-Scope is unusually well drawn: it names the shortcut being refused (`node` in `SAFE_COMMANDS`)
  and the two follow-on tasks (`task.81`, `task.82`) that absorb the deferred scope.

**Scope check**: 4 phases, one module boundary — well under the >8-phase oversize signal. No split
recommended.

#### Optional
- **[O-1] The new suite will actually run.** `shared/resources/tests/*.test.mjs` is already in the
  `npm test` glob, so `security-probe.test.mjs` is picked up without a `package.json` edit. Worth stating
  explicitly in the task, because the inverse has bitten this repo before — a new `skills/*/tests/`
  directory ran nowhere until its glob was added by hand, and 232 tests were silently unrun. No change
  needed here; recorded so the developer does not assume a `package.json` edit is required.

**Score: 9/10**

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Both high-risk areas are correctly identified and the mitigations are structural rather than aspirational:
"land Phase 1 alone with parity tests and a mutation proof" is a sequencing constraint, not an intention.
The second risk — *someone adds `node` to `SAFE_COMMANDS`* — is mitigated by a written refusal **plus a
test asserting no interpreter is in the set*, which is the right pairing: prose alone does not survive a
future contributor in a hurry.

The medium risk (`unverifiable` becomes the common answer) has an honest mitigation that accepts the
finding rather than papering over it.

Rollback plan is specific, has triggers, has a time bound, and names the exact verification commands.
`task.73`'s prose probe mode is correctly identified as unaffected by a revert.

#### Optional
- **[O-2] Route counts are narrative, not exact.** "`bug.3`'s 14 replay routes" and "26 documented routes"
  are aggregates across `bug.3` + `bug.6`; the replay suite groups them into 8 `test()` blocks. No
  correction made — the numbers are used rhetorically to argue the boundary matters, and they do that
  correctly.

**Score: 9/10**

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 6 issues

1. ✅ **Fixed** — [I-1] Phase 1 rewritten: `snapshotTree` needs an `export` added, not confirmed.
2. ✅ **Fixed** — [I-2] Five stale line anchors + file length corrected in §3 and §References.
3. ✅ **Fixed** — [I-3] Prompt quote re-anchored to `:145-146`.
4. ✅ **Fixed** — [I-4] `QA-1…QA-14` → `QA-1…QA-17` at both sites.
5. ⏭ **Skipped — requires your input** — [I-5] No `github_issue`. Creating one is opt-in; no consent
   available in an autonomous run. Run `/sync-github-task` to link it.
6. ✅ **Fixed** — [I-6] Change Log row appended, `updated:` bumped.

### Consider (Optional) — 2 items

1. [O-1] Note that the new test suite is already covered by the `npm test` glob.
2. [O-2] Route counts are narrative aggregates; no change needed.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10
- Technical Accuracy: 7/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues and no hallucinations — every dependency was verified to exist and
be exported. All six Important issues were reference drift from `task.79` landing in the same file, and
five of the six were corrected in place; the sixth (tracker linkage) is a consent-gated action, not a
readiness blocker.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the implementation plan phase by phase — Phase 1 **alone** first, with its parity tests and
   mutation proof green, before writing any probe code.
2. Take the corrected line anchors from §3 as current as of 2026-09-07; re-derive them if the file moves
   again.
3. Check off Progress Tracking boxes as each phase lands.
4. Run `node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/qa-execute-snippets.test.mjs`
   after each phase, and `npm run ci` before opening the PR.
5. Refer to the Rollback Plan if the sentinel fires on legitimate probes.

---

## Review Metadata

- **Reviewer:** review-task (autonomous — `develop-task` Step 2/8)
- **Review Date:** 2026-09-07
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.80.security-probe-engine/task.80.security-probe-engine.md`
- **Sources Consulted:** `shared/resources/qa-execute-snippets.mjs`,
  `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/security-input-corpus.mjs`,
  `shared/resources/tests/spawn-budget.mjs`, `tests/test-harness-concurrency.test.js`,
  `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs`, `package.json`, `skills-config.yaml`
- **Pre-pass subagents:** not dispatched — verification performed inline per this session's standing
  directive. Both axes (architecture alignment, already-implemented scan) were covered directly:
  `security-probe.mjs` and `probe-boundary-rule.md` confirmed absent, so `implementation_status` is
  `not-started`.
