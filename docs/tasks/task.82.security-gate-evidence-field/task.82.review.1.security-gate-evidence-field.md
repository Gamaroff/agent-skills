# Task Review Report: Task 82 - Feed the measured security verdict into the QA gate

**Reviewed:** 2026-09-09
**Review Depth:** Standard
**Task Status:** Ready for Development
**Overall Assessment:** GOOD

---

## Executive Summary

Task 82 is well-specified, correctly sequenced behind task.81, and unusually careful about its one
real hazard — the `SAFETY_REPROBE` `awk` probe that fails closed and silently. Phase 1 (prove the
addition does not disturb the trigger, before touching any schema) is the right shape, and the
harness it needs already exists in the parity suite. Three Important findings, all resolvable
without changing the task's approach; no Critical findings.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 0 questions asked — this review ran inside the `develop-task` pipeline
(non-interactive). Findings were resolved against the code rather than by asking.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No interactive question points ran. The pipeline auto-answered Step 0 (Comprehensive report),
Step 8.5 (apply all critical + important fixes) and Step 9 (fixes complete) per the develop-task
autonomous defaults. Every finding below was verified against the working tree, not inferred.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (one Important)

All 11 mandatory numbered sections are present (Overview, Motivation, Technical Background, Scope,
Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk
Assessment, Rollback Plan), plus Change Log, Progress Tracking, References and Notes. Filename
follows `task.{n}.{descriptive-name}.md`. No placeholders (`[TBD]`, `???`) found.

**OKF frontmatter:** conformant — `type: task` present and non-empty, `description` present, `tags`
is a YAML list, `updated` present.

**Sign-off (check 4a):** `sign-off.enabled` is absent from `skills-config.yaml` → check skipped
entirely, per spec. No finding.

**Tracker linkage (check 5):** no `github_issue:` / `jira_key:` in frontmatter. `JIRA_URL` is unset
→ `TRACKER=github`. Normally an Important gap; **not flagged here** because this repository's task
corpus is deliberately unlinked (no task in `docs/tasks/` carries `github_issue:`), so flagging it
would report a convention as a defect. No remote issue was created.

**Tracker card preflight (check 5a):** `sync-jira-task.js --check-card` → exit 0, `ok: true`, zero
findings. All card blocks resolve (Summary 50 chars / 5 omitted, Success Criteria 404 chars /
6 omitted, Breaking Changes 188 chars / 2 omitted). The `+N more` counts are information, not
defects.

### Issues

#### Important
- **Change Log is stale** — the newest row is `1.0 | Initial draft` (2026-09-02) but frontmatter
  `status:` is `ready-for-development`. A status that has advanced past `planned` with no row
  recording a review or a promotion is exactly the currency failure check 4b describes.
  `change-log.enforcement` is unset → `advisory`, so this does not block development.
  **Fixed in this review** — Step 8.5 and Step 9 rows appended.

---

## 2. Technical Accuracy

**Status:** ACCURATE (in substance) / ISSUES FOUND (citations)
**Hallucinations Detected:** 0

Every file the task names exists, and every mechanism it describes is real. Verified directly:

| Claim | Verdict |
|---|---|
| `nfr_validation.security` is `{status, notes}` in both QA skills | ✅ confirmed (`qa-task/SKILL.md:682-685`, `qa-story/SKILL.md:1413-1416`) |
| The security NFR comes from one line of instruction | ✅ confirmed — `qa-task/SKILL.md:580` |
| `SAFETY_REPROBE` reads the field mechanically via `awk` | ✅ confirmed — `shared/resources/qa-re-review-scope.md:54-60` |
| The probe takes the **first** `status:` after `security:` | ✅ confirmed by reading the `awk` program |
| The `\s`-vs-POSIX fail-closed precedent is recorded in that file | ✅ confirmed, with a pinned test (`the clause-1 probe uses no GNU-only regex escapes`) |
| The parity suite **executes** the probe against real gates | ✅ confirmed — `runClause1()` spawns bash with `LATEST_GATE` set; 561 lines, 14 tests |
| `task.74.gate.1` / `.gate.2` exist as replay fixtures | ✅ both present |
| `review-security` (task.81) emits `probes_executed` and `evidence` | ✅ shipped — `shared/resources/security-review-prompt.md:134-135` |
| `probes_executed` precedent in `finalise-dod-security-prompt.md` | ✅ present (at lines 155-157/198, not 139-142) |

### Issues

#### Important

- **The gate schema already has an `evidence:` key, and the task does not mention it.**
  `qa-task/SKILL.md:675` and `qa-story/SKILL.md:1406` define a **top-level** `evidence:` block
  (`tests_reviewed`, `phases_verified` / `risks_identified`, `trace`). Task §3 "Current
  architecture" shows `nfr_validation.security` as `{status, notes}` and never says the document
  already spends the name one level up.
  - **Why it matters:** the two are legal YAML side by side — `evidence:` at the root and
    `nfr_validation.security.evidence:` are different paths — but they are **not** distinguishable
    by grep, which is how the repo's own drift audits and Phase 1's fixtures find things. A test or
    a doc that greps `evidence:` in a gate now matches two unrelated concepts.
  - **Fix:** name the collision in §3 and require the schema documentation in Phase 2 to say
    explicitly which path is meant. Do **not** rename either key — the top-level block predates this
    task and renaming it is out of scope.

- **The value domain the producer ships is narrower than the one the gate specifies, and Phase 4
  claims they match.** `task.81` shipped `evidence: measured | reasoned` — **two** values
  (`security-review-prompt.md:135`, and `skills/review-security/SKILL.md:115` asserts only
  `measured ⇒ probes_executed > 0`). Task §4 specifies **three**: `measured | reasoned |
  unverified`. Phase 4's first bullet — *"The skill's machine block matches the gate's key names
  exactly, so a QA cycle can lift it verbatim"* — is true of the **key names** and false of the
  **value domain**.
  - **Why it matters:** read literally, Phase 4 authorises either adding `unverified` to the skill
    (which would be wrong — a review that ran always reaches `measured` or `reasoned`; it has no
    third answer) or dropping `unverified` from the gate (which would break Phase 3, where a
    **missing** key must read as `unverified` and fire the trigger).
  - **Resolution (recorded, not deferred):** the domains are **nested, not equal** — the skill's two
    values are a strict subset of the gate's three. `unverified` is the gate-only value meaning *no
    security review supplied a verdict*, which is exactly the pre-existing-gate case Phase 3 must
    fail **open** on. Phase 4 should state the nesting; nothing needs renaming on either side.

#### Optional
- Line-number citations have drifted since the task was filed on 2026-09-02. The **paths** are all
  correct; only the anchors moved. See §5 below for the corrected set — these were updated in the
  document by this review.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with risk level, explicit files, checkboxed changes and stated dependencies.
Ordering is load-bearing and correctly argued: Phase 1 (prove the trigger survives) runs **before**
any schema edit, which is the single most important sequencing decision in the task.

Specific strengths worth not eroding during implementation:

- Phase 1's **negative control** — `evidence:` placed between `security:` and `status:` must
  *break* the probe — pins the ordering constraint with a test rather than a comment. The harness
  for it already exists: `runClause1(yaml)` in the parity suite spawns the real extracted probe
  against a temp file, so the fixture is a string, not new machinery.
- Phase 3's **fail-open inversion** is stated explicitly and given its own fixture. This is the
  subtle half of the task: clause 1 today fails *closed* on a missing key; the evidence clause must
  fail *open* or every gate written before this task silently never triggers.
- Mutation-proving is specified per-phase with the exact mutation and the exact fixture that must
  red, per `shared/resources/mutation-proving.md`.

### Issues

#### Optional
- **§7 "Files to Create" is undecided** — *"likely a section of `security-input-corpus.md` … decide
  at implementation time"*. That is a reasonable deferral, but Phase 2 requires the three values be
  *"defined once … and referenced from both skills"*, so the decision has a hard requirement
  attached. `shared/resources/security-input-corpus.md` exists and is the nearest home; whichever
  file is chosen, both QA skills must reference it rather than restating the definitions — that
  restatement is the drift `task.74` found three copies of.
- **`estimated_effort_hours: 4` is likely low.** Four phases, 12 success criteria, medium risk, two
  skills plus a shared rule plus a 561-line test suite plus a bundle pass. The rubric puts this
  nearer 8h. Non-blocking and does not affect the gate decision.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, Scope and Implementation Plan agree on what is being added and where.
- §7 Files Summary matches the files named in the phases (plus the bundle output and CHANGELOG).
- Testing Strategy covers contract tests, replay verification and mutation proving, and names the
  exact command (`node --test evals/shared/tests/qa-re-review-scope-parity.test.mjs`).
- Success Criteria are measurable and split Functional / Regression / Safety. The Regression set
  correctly includes *"every existing parity assertion still passes"* and `npm run ci` green.
- Out-of-scope list is explicit and disciplined — notably it refuses to add `evidence:` to the other
  three NFR axes, and refuses to retrofit historical gates.

No contradictions found between phases, and no phase depends on something a later phase produces.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The High Risk entry is the correct one and is analysed properly: the probe takes the first `status:`
after `security:`, its failure mode is closed and silent, and the mitigation (Phase 1 first, plus a
negative control test) is the mitigation that actually addresses it. The Medium risks — missing the
fail-open inversion, and `reasoned` being gamed — are both real, and the second is honestly labelled
a cultural rather than technical control.

Rollback is feasible and specific: revert clause 1 to `status`-only, drop `evidence:` from both
schemas, and `review-security` simply stops being consumed. Verification steps are named.

### Corrected citations (applied to the document by this review)

| Task said | Actual (verified 2026-09-09) |
|---|---|
| `qa-task/SKILL.md:567` | `skills/qa-task/SKILL.md:580` |
| `qa-task/SKILL.md:661-664` | `skills/qa-task/SKILL.md:682-685` |
| `qa-story/SKILL.md:2112-2135` | `skills/qa-story/SKILL.md:1413-1416` (schema) and `2219-2230` (NFR output block) |
| `qa-re-review-scope.md:52-59` | `shared/resources/qa-re-review-scope.md:54-60` |
| `finalise-dod-security-prompt.md:139-142` | `shared/resources/finalise-dod-security-prompt.md:155-157`, `198` |

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 3 issues

1. **Name the `evidence:` key collision in §3** — the gate schema already uses `evidence:` at the
   top level; say so, and require Phase 2's schema documentation to disambiguate the two paths.
2. **State the nesting in Phase 4** — the skill's `measured | reasoned` is a strict subset of the
   gate's `measured | reasoned | unverified`; `unverified` is gate-only and means "no review
   supplied a verdict". Neither side renames anything.
3. **Refresh the Change Log** — record the review and the promotion.

### Consider (Optional) - 4 items

1. Corrected line-number citations (applied).
2. Decide the home for the shared `evidence` value definitions at Phase 2, and reference it from
   both skills rather than restating.
3. Revisit `estimated_effort_hours: 4` — the rubric suggests ~8.
4. Phase 1's fixtures can reuse `runClause1()` directly; no new harness is needed.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 8/10 (stale Change Log, advisory)
- Technical Accuracy: 8/10 (substance correct; citations drifted; one unmentioned key collision)
- Implementation Clarity: 9/10 (phases explicit, ordering argued, harness already exists)
- Consistency: 10/10
- Risk Management: 9/10 (the one real hazard is identified, mitigated and pinned by a test)

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the three Important findings are clarifications that were
resolved against the shipped code during this review and written back into the document, not gaps
that require new decisions. The task's own Phase 1 is the correct guard against its only serious
risk.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Run the parity suite **before** touching anything and record the result (Phase 1 requires the
   before-and-after pair).
2. Follow the phases in order — Phase 1's fixtures and negative control land before any schema edit.
3. Mutation-prove each of the three mutations named in §8 and record which fixture reds.
4. Re-run `node --test evals/shared/tests/qa-re-review-scope-parity.test.mjs`, then `npm run ci`.

---

## Review Metadata

- **Reviewer:** review-task (agent), inside `/develop-task` pipeline (dispatched by `/develop-next`)
- **Review Date:** 2026-09-09
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.82.security-gate-evidence-field/task.82.security-gate-evidence-field.md`
- **Sources Consulted:** `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`,
  `shared/resources/qa-re-review-scope.md`, `shared/resources/security-review-prompt.md`,
  `shared/resources/finalise-dod-security-prompt.md`, `skills/review-security/SKILL.md`,
  `evals/shared/tests/qa-re-review-scope-parity.test.mjs`, `skills-config.yaml`
- **Pre-pass:** run inline (architecture alignment + already-implemented scan) rather than via
  Explore subagents — this session's operating instructions bar dispatching agents unless asked.
  Already-implemented scan result: **not implemented** — no `evidence:` key exists under
  `nfr_validation.security` in either QA skill.
