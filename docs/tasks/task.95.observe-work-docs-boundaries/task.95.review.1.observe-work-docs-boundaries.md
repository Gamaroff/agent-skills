---
id: task.95.review.1
title: "Task Review Report: Task 95 — observe-work config schema, skill boundaries and the meta-skill family"
type: review
description: "Standard-depth review of task 95. Four Critical findings: two documented config keys that nothing reads, and a family template the shipped parser cannot read."
tags: [observe-work, review, documentation, configuration]
task-ref: task.95.observe-work-docs-boundaries.md
status: accepted
created: 2026-09-09
updated: 2026-09-09
---

# Task Review Report: Task 95 — observe-work: config schema, skill boundaries and the meta-skill family

**Reviewed:** 2026-09-09
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT (pre-fix) → GOOD (post-fix)

> **Implementation Status**: ✅ All 9 recommendations (4 Critical, 5 Important) implemented — 2026-09-09

---

## Executive Summary

Task 95 is well-structured, correctly scoped and carries a genuinely good risk table. Its defect is
concentrated in one place and it is the same defect twice: **the task was written against task 93's
*plan*, not against task 93's *shipped engine*.** Two config keys it prescribes documenting are read
by nothing; the family-registry format it prescribes cannot be parsed by the parser that exists; and
the `Coherence model` field it calls "load-bearing" was dropped from the engine during task 93 and
survives only in that task's plan file.

Every finding was verified by executing against the shipped artefacts, not by reading them.

**Critical Issues:** 4 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 6/10 (pre-fix) → 9/10 (post-fix)
**Recommendation:** NEEDS REVISION → **READY TO IMPLEMENT** after the fixes recorded below

**Premises re-verified and holding.** Tasks 93 and 94 are merged and accepted (`decaf68d`,
`d8e7b616`); `docs/reference/configuration.md` contains no `observations` mention;
`skills/observe-work/assets/` does not exist; none of `autoskill`, `remember-insight`,
`double-check` mentions `observe-work`. The task is not already implemented, and its dependencies
are satisfied.

---

## User Decisions & Clarifications

### Q1 — Config keys (Critical C1)

> Phase 1 documents `observations.enabled`, `.workspace` and `.review_interval_days`. Only
> `workspace` is read by anything.

- **User Decision**: **Document only `workspace`, plus `OBS_STALE_DAYS` in the existing Environment
  variables section.**
- **Impact**: Phase 1's schema block loses two keys. The task's own contract test then passes as
  written instead of failing 2 of 3. No scope growth — this stays a documentation task.

### Q2 — Template format (Critical C2 / C3)

> The template's headings-and-bold format parses to zero families under the shipped
> `parseFamilies()`, which reads a 4-column pipe table and has no coherence field.

- **User Decision**: **Rewrite as the pipe table the engine parses; drop `Coherence model` as a
  parsed field and keep the two models as prose guidance in the template preamble.**
- **Impact**: Phase 3's template content is replaced; the test assertion on coherence-model values
  is removed; no engine change, so task 93 stays closed.

### Q3 — Seeded family (Critical C4)

> The seeded meta-skills family produces 8 spurious `rule-absent` gaps on its first audit.

- **User Decision**: **Seed `Shared` with short literal strings that actually appear in all four
  members — adding that exact sentence to each member as part of Phase 2 if needed — and add a test
  asserting zero gaps.**
- **Impact**: Phase 2 and Phase 3 become coupled: the boundary notes now carry the shared sentence
  the audit greps for. Phase 3 gains a behavioural test.

### Q4 — Session Start pointer (Important I2)

> `init` already creates `skill-families.md`, so "when the workspace has no `skill-families.md`" is
> never true after a normal session start.

- **User Decision**: **Reword to seeding an empty registry** — when the file exists but holds no
  family rows.
- **Impact**: One-line change to the Phase 3 pointer wording. No engine change.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections present, plus Change Log, Progress Tracking, References and
Notes. Filename follows `task.{n}.{descriptive-name}.md`. No placeholders (`[TBD]`, `[TODO]`, `???`)
anywhere in the document.

**OKF frontmatter**: `type: task` present and non-empty; `description` present; `tags` a valid YAML
list; `updated` present. Conformant.

**Metadata**: `status: planned`, `priority: High`, `estimated_effort_hours: 4`, `github_issue: 341`
— all present. Issue #341 verified OPEN with the matching title.

**Sign-off**: `skills-config.yaml` declares no `sign-off` block → check skipped entirely, per spec.

**Change Log**: present, four canonical columns, one row (`1.0 Initial draft`). Status has not
advanced past `planned`, so the currency heuristic does not fire. Not stale.

**Tracker card preflight** (`sync-jira-task.js --check-card`): **exit 0, `ok: true`, zero findings.**
All three card blocks resolve.

Informational — how much a board reader will not see:

| Block | Kind | Chars | `+N more` |
|---|---|---|---|
| Summary | prose | 357 | +6 |
| Success Criteria | list | 450 | +9 |
| Breaking Changes | prose | 62 | +2 |

Not a defect. The builder caps the card by design and announces every omission.

**Score: 10/10**

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations detected:** 3

### Critical

#### C1 — Two of the three documented config keys are read by nothing

- **Location:** §3 Target Architecture ("Config block to document"), Phase 1, plan Phase 1.
- **Issue:** `shared/resources/resolve-observation-workspace.sh` reads exactly one config key:

  ```
  145:  _ow_candidate=$(read_nested_config_key observations workspace)
  ```

  `grep -n "enabled" shared/resources/resolve-observation-workspace.sh` → **no match.**
  `review_interval_days` appears nowhere in the repository outside task 95's own files.

- **Evidence:** The staleness threshold that *is* implemented lives in
  `shared/resources/observe-work-session-start.sh:111`:

  ```sh
  stale_days="${OBS_STALE_DAYS:-14}"
  ```

  An **environment variable**, default **14**. Task 95 prescribes documenting a *config key* with a
  default of **7**. Both the mechanism and the number are wrong.

- **Why it matters:** `observations.enabled: false` is documented as disabling `observe-work`'s
  writes. Nothing implements that. A user who sets it gets writes anyway, and the documentation is
  the only reason they would believe otherwise. This is the failure class the task's own §10 Risk 2
  names — "a user pins a value that is silently ignored" — applied to a different key than the one
  the risk anticipated.

- **Recommendation (per Q1):** Document `observations.workspace` only in the schema block and Key
  reference. Document `OBS_STALE_DAYS` in `configuration.md`'s existing `## Environment variables`
  section, with its real default of 14.

#### C2 — The family template format cannot be parsed by the shipped parser

- **Location:** §3 Target Architecture ("Family entry to seed"), Phase 3; plan Phase 3.
- **Issue:** The task specifies a heading-plus-bold-lines format. `parseFamilies()` in
  `shared/resources/observation-log.js:907` skips every line that does not start with `|`:

  ```js
  if (!line.trim().startsWith("|")) continue;
  ...
  if (cells.length < 4) continue;
  ```

  It reads a 4-column pipe table: `Family | Members | Shared | Member-specific`. `init` seeds exactly
  that header at `observation-log.js:494-497`.

- **Evidence:** A template in the task's format yields `families: []`. The seeded family would be
  invisible to `families --audit` — the one consumer it exists for.

- **Recommendation (per Q2):** Rewrite the template as the pipe table the engine reads.

#### C3 — `Coherence model` is an invented field

- **Location:** §3 Important Clarifications ("`coherence model` is load-bearing"), Phase 3 changes,
  Phase 3 test assertions, plan Phase 3.
- **Issue:** No coherence field exists in the shipped engine. `parseFamilies()` returns
  `{ name, members, shared, memberSpecific }`.
- **Evidence:** `grep -rn "coherence"` across the repository returns exactly one relevant hit
  outside task 95's own files —
  `docs/tasks/task.93.observation-log-engine/task.93.plan.observation-log-engine.md:241`, which
  specifies `{ name, members, coherence, shared, memberSpecific }`. **It was in task 93's plan and
  dropped from task 93's implementation.** Task 95 inherited the plan's vocabulary rather than the
  shipped engine's.
- **Why it matters:** Task 95 promotes the field to load-bearing (§3: "A family without one produces
  findings with no defined remedy") and adds a test asserting `Coherence model` is one of two
  defined values. That test would assert against a field nothing reads, on a template nothing
  parses — a green test proving nothing, which is exactly the standard this repository already
  rejects in `feedback_assert_behaviour_not_source_text`.
- **Recommendation (per Q2):** Drop it as a parsed field. Keep both models as prose guidance in the
  template preamble, where they are genuinely useful to a human deciding what to write.

#### C4 — The seeded family fails its own audit, empirically

- **Location:** §3 ("Family entry to seed"), Phase 3.
- **Issue:** `families --audit` matches with a literal substring test —
  `observation-log.js:981`: `if (body.includes(rule)) continue;`. The task's seeded `Shared` values
  are prose sentences that appear verbatim in no `SKILL.md`.
- **Evidence — executed, not reasoned about.** Seeded family written to a durable probe workspace in
  the engine's own table format and audited against this repository:

  ```
  gaps: 8 × { why: "rule-absent" }
  ```

  Every member against every rule — **including `observe-work` itself.** The `Member-specific`
  column did not suppress any of them, because its values ("the trigger", "the durable artefact")
  are not substrings of the shared rules.

- **Why it matters:** §3 states the `Member-specific` column "is what stops the family audit
  generating noise instead of signal". The seeded entry generates nothing but noise, and it does so
  on the adopter's very first audit — the moment the registry is meant to be establishing its own
  credibility.

- **Recommendation (per Q3):** Choose `Shared` values that are short literal strings present in all
  four members, or add that exact sentence to each member as part of Phase 2's boundary note. Add a
  test asserting the seeded family audits to **zero gaps** against the repository.

**Score: 3/10**

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (with corrections)

The four phases are well-formed: each carries a risk level, an explicit file list, checkbox-level
changes and stated dependencies. File paths were verified to exist or to be valid new paths. Both
cross-references named in the plan's "Key Patterns" table resolve —
`skills/explain-simply/assets/storyboard-template.html` and
`skills/review-code/tests/review-code.test.js`.

The plan's claim that **no new `package.json` test glob is needed** is verified correct:
`'skills/observe-work/tests/*.test.js'` is already in the `test` script (added by task 94). This
matters — this repository has been bitten before by per-skill suites that run nowhere.

`estimated_effort_hours: 4` is consistent with the rubric for four low-risk documentation phases.
No finding.

### Important

#### I2 — Phase 3's pointer has a precondition that is never true

- **Location:** Phase 3 changes; plan Phase 3 ("Pointer").
- **Issue:** "When the workspace has no `skill-families.md`, copy the template" — but `cmdInit`
  creates that file (`observation-log.js:494`), and `init` runs in Session Start step 1, before the
  pointer would ever be consulted.
- **Recommendation (per Q4):** Reword to seeding a registry that exists but holds no family rows.

**Score: 7/10** (pre-fix — the phases are clear, but Phases 1 and 3 as written produce wrong
artefacts)

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

#### I1 — The Contract Test criterion contradicts Phase 1

§8 Contract Tests requires: *"Every key documented in `configuration.md` under `observations:` is
consulted somewhere in `resolve-observation-workspace.sh`."* Phase 1 prescribes documenting three
keys, of which the resolver consults one. **The task fails its own success criterion by
construction.** Resolved by Q1: with only `workspace` documented, the criterion passes as written
and becomes a real check rather than a contradiction.

#### I3 — The README delta is wrong by an order of magnitude

§2 premise 5 says the count "will be wrong by two after task 94". Actual state: `README.md:5` badge
and `README.md:7` prose both read **115**; `ls -d skills/*/ | wc -l` returns **126**. Off by
**eleven**, not two. A developer following the stated delta would write 117 and leave it wrong.

#### I4 — The "no registry" premise is false, and the SKILL.md claim is unsupported

§2 premise 3 asserts "With no registry and no template, every early observation falls through to the
no-registry fallback". `init` creates the registry; it is empty, not absent. Separately, the premise
states the skill "resolves the target against `skill-observations/skill-families.md`" — but
`grep -rn "skill-families" skills/observe-work/SKILL.md` returns **no match**. Only
`observation-log-contract.md` and the engine mention it. The claim is true of the *contract*, not of
the *skill file* the premise attributes it to. This is a smaller instance of the same
plan-versus-shipped-artefact gap behind C1–C3.

#### I5 — §3 forbids what Phase 3 does

§3 Important Clarifications: *"Committing a populated registry into the skill would make it a shipped
opinion rather than the adopter's own evidence trail."* Phase 3 then ships a populated registry and
instructs copying it into the adopter's workspace. Both positions are defensible; the document holds
both simultaneously and never reconciles them. Q3's answer (seed it, and prove the seed audits
clean) settles it in favour of seeding — the guard against "shipped opinion" becomes the zero-gap
test rather than an empty file.

### Testing completeness

Testing Strategy covers unit, integration, contract, performance (correctly marked N/A) and consumer
layers. One gap, now closed by Q3: **no test asserted that the seeded family audits clean.** That is
the assertion that would have caught C4, and it is behavioural rather than textual — the right shape
for this repository.

**Score: 4/10** (pre-fix)

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The risk table is better than most. Medium Risk 1 (catalog cascade) correctly identifies the one
mechanical hazard and pairs it with a one-command proof that is also a Success Criterion. Medium
Risk 2 (documented vs implemented precedence) names the right failure — "a user pins a workspace
that is silently ignored, and the symptom is an empty, clean-looking backlog" — and demands a
behavioural test.

The gap is that Risk 2 was scoped to *precedence order* only. The same reasoning applied one step
wider catches C1: a documented key that no code reads is the same silent-ignore failure, and it is
the more likely one because nothing about writing a schema block forces you to check that a reader
exists. The mitigation generalises cleanly — assert every documented key against behaviour, not just
the ordering of the one key that has a reader.

Rollback plan is complete and proportionate: immediate revert for generated-file drift, partial
revert per boundary note (correctly noting the three are independent), forward-fix for everything
else. Triggers are specific. No data to migrate, no runtime path touched.

**Score: 8/10**

---

## 6. Mermaid Diagrams

No diagrams present, and none recommended. The task introduces no data shape, no branching logic and
no current→target runtime migration — the "Target Architecture" tree in §3 is a file-layout listing,
which prose and a tree render carry better than a flowchart would.

---

## Summary of Recommendations

### Must Fix (Critical) — 4

1. **C1** — Document `observations.workspace` only; move the staleness knob to `OBS_STALE_DAYS`
   (default **14**) in the Environment variables section. *Per Q1.*
2. **C2** — Rewrite the family template as the 4-column pipe table `parseFamilies()` reads. *Per Q2.*
3. **C3** — Remove `Coherence model` as a parsed field and as a test assertion; keep both models as
   prose guidance. *Per Q2.*
4. **C4** — Seed `Shared` with literal strings present in all four members; add a zero-gap audit
   test. *Per Q3.*

### Should Fix (Important) — 5

1. **I1** — Contract test criterion now passes as written once C1 lands; restate it to name
   `workspace` explicitly.
2. **I2** — Reword the Phase 3 pointer to seeding an empty registry. *Per Q4.*
3. **I3** — Correct the README delta: 115 → 126, not "wrong by two".
4. **I4** — Correct §2 premise 3: the registry is empty, not absent, and the resolution rule lives in
   the contract, not in `SKILL.md`.
5. **I5** — Reconcile §3's "shipped opinion" clarification with Phase 3's seeding.

### Consider (Optional) — 3

1. Restate the Phase 3 parse assertion against the engine's actual return shape
   (`name`, `members`, `shared`, `memberSpecific`).
2. Note in §7 that Phase 2's boundary notes now carry the family's shared sentence, so Phase 3
   depends on Phase 2's exact wording rather than merely on its completion.
3. §12 Future Improvements already proposes a README-count test. Given I3, that is now the second
   time the count has drifted — worth promoting from "candidate" to a filed follow-up.

---

## Implementation Readiness Assessment

**Score (pre-fix): 6/10** · **Score (post-fix): 9/10**

| Dimension | Pre-fix | Post-fix |
|---|---|---|
| Template Compliance | 10/10 | 10/10 |
| Technical Accuracy | 3/10 | 9/10 |
| Implementation Clarity | 7/10 | 9/10 |
| Consistency | 4/10 | 9/10 |
| Risk Management | 8/10 | 9/10 |

**Confidence Level for Successful Implementation:** High, post-fix.

**Recommendation:** ⚠️ **NEEDS REVISION** as authored → ✅ **READY TO IMPLEMENT** with the fixes
applied.

**Justification:** The task's structure, scope, risk analysis and rollback plan are sound and needed
no rework. All four Critical findings share one root cause — authored against task 93's plan rather
than its shipped engine — and all four are corrected inside this document with no code change and no
reopening of task 93.

---

## Next Steps

1. Implement Phases 1–4 as corrected in this review.
2. Phase 2 and Phase 3 are now coupled: the boundary note wording supplies the literal string the
   family audit greps for. Write Phase 2's shared sentence first, then seed Phase 3 from it.
3. Run the corrected contract check — drive the resolver with a config file and an env var and read
   what it exports; do not grep it.
4. Run `families --audit` against the repository and require **zero** gaps.
5. `npm run generate-catalog && git diff --stat docs/reference/skill-catalog.md` — must be empty.

---

## Review Metadata

- **Reviewer:** `review-task` (Claude Opus 5)
- **Review Date:** 2026-09-09
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.95.observe-work-docs-boundaries/task.95.observe-work-docs-boundaries.md`
- **Plan File:** `docs/tasks/task.95.observe-work-docs-boundaries/task.95.plan.observe-work-docs-boundaries.md`
- **Artefacts executed against:** `shared/resources/resolve-observation-workspace.sh`,
  `shared/resources/observation-log.js`, `shared/resources/observe-work-session-start.sh`,
  `shared/resources/observation-log-contract.md`, `docs/reference/configuration.md`, `README.md`,
  `package.json`, `skills/{autoskill,remember-insight,double-check,observe-work}/SKILL.md`
- **Commands run:** `families --audit` against a durable probe workspace (8 gaps reproduced);
  `sync-jira-task.js --check-card` (exit 0); `resolve-platform.sh` (TRACKER=github);
  `gh issue view 341` (OPEN)
- **Note on independent review:** the two read-only pre-pass subagents specified by Phase 1.5 were
  not dispatched — this session's standing instruction prohibits `Agent` invocation unless the user
  requests it. Both axes (architecture alignment, already-implemented scan) were covered in-line and
  by direct execution instead. Recorded so the absence is visible rather than assumed.
