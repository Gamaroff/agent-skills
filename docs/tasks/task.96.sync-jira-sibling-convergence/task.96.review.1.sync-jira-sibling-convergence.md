# Task Review Report: Task 96 — sync-jira-story/task/epic never converge

**Reviewed:** 2026-09-07
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

---

## Executive Summary

Every substantive defect claim in this task was verified line-by-line against the code at HEAD, and every one holds — including the subtlest and most important: that `sync-jira-epic`'s post-transition re-read at `:990` is unreachable dead code, because the gate at `:948` depends on `changedFields.length === 0` and defect 1 guarantees `changedFields` always contains `labels`. No line numbers had drifted. This is an unusually well-evidenced task document.

What the review found were not errors of analysis but two unbudgeted gaps and four overreaches: a named deliverable with no home in the repository, a test harness that does not exist in the form the task assumes, a success criterion that is unachievable for one of the three scripts, and a "mechanical" refactor that is circular in one of them.

**Critical Issues:** 2 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

### Q1 — Family registry deliverable has no home

**Decision:** *Defer to task.93, draft entry in Notes.*

**Impact:** Removed from §4 In Scope, §7 Files Summary and §9 Success Criteria; added to §4 Out of Scope with the reasoning. The drafted `## jira-sync` entry is parked in §Notes so task.93 can lift it verbatim. This avoids committing a schema before the task that owns it has designed one.

### Q2 — The "fake Jira from PR #338" is not a reusable harness

**Decision:** *Generalise into a shared helper first.*

**Impact:** Phase 1 now opens with the generalisation as prerequisite work — lift `fakeJira()`/`hrefsIn()`/`descriptionOf()` into `tests/lib/fake-jira.js` (deliberately outside `shared/resources/` so `npm run bundle` does not fan it into 23 skills), extend it with the backlog and project endpoints, and re-point the bug suite at it with assertions unchanged. Added as a new §7 "Files to Add" entry.

*Note:* the user chose the plain generalisation option rather than the variant that also raised `estimated_effort_hours` from 8 to 16, so the estimate is unchanged. Flagged below as an accepted risk.

### Q3 — PUT-count criterion is unachievable for `sync-jira-task`

**Decision:** *Scope the criterion to story + epic.*

**Impact:** §8 Performance Tests and §9 Success Criteria now scope the 2→1 PUT-count target to `sync-jira-story` and `sync-jira-epic`, with `sync-jira-task` asserting no field changes on the second run instead. Adding a skip gate to task was explicitly ruled out and recorded in §4 Out of Scope.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven mandatory numbered sections present, plus Change Log, Progress Tracking, References and Notes. No placeholders or TBD markers. Filename follows `task.{n}.{descriptive-name}.md` with dots as structural separators.

- **OKF frontmatter**: `type: task` ✅, `description` ✅, `tags` ✅ (YAML list), `updated` ✅. Conformant.
- **Sign-off**: `sign-off.enabled` absent from `skills-config.yaml` → check skipped entirely, per spec.
- **Change Log**: present with the four canonical columns; newest row was consistent with `status: planned`, so not stale. A `1.2` row was appended recording this review.
- **Tracker card preflight**: `sync-jira-task.js --check-card` exits 0. Summary (287 chars, 5 omitted), Success Criteria (340 chars, 9 omitted) and Breaking Changes (95 chars, 2 omitted) all resolve, each with a `+N more` link. No findings.
- **Tracker linkage**: `github_issue: 343` verified OPEN; body cross-reference `[#343](…/issues/343)` matches frontmatter; board Priority already `P1 High`, left untouched.

**Score: 10/10**

---

## 2. Technical Accuracy

**Status:** ACCURATE — with two cited-location corrections
**Hallucinations Detected:** 0

Every technical claim was checked against the source at HEAD. This section is the task's strongest.

### Verified exact (no drift)

| Claim | Verdict |
|---|---|
| Defective diff at story `:898`, task `:681`, epic `:912` | ✅ exact — blocks are byte-identical apart from indentation |
| `collectIssueFields` appends `synced-from-*`, so `diffFields` can never converge | ✅ confirmed — `diffFields` sorts and joins both label sets (`jira-sync.js:2084-2086`); a missing label is a guaranteed mismatch |
| `sync-jira-bug` diffs the payload correctly at `:834` | ✅ exact, with an explanatory comment at `:809-817` naming the trap |
| Story `:1037` and task `:794` are PUT-response fallbacks, not transition re-reads | ✅ confirmed |
| Task `:925` is the create path | ✅ confirmed |
| Bug re-reads on all paths at `:915`, `:1027`, `:1102` | ✅ exact |
| **Epic's `:990` re-read is dead code** — gate at `:948` never opens | ✅ **confirmed**, nesting verified by reading `:911-1017` contiguously |

The interaction claim added in v1.1 is correct as written, including its follow-on: fixing defect 1 alone would activate `:990` while `:1428` stays stale, producing exactly the intermittent split the document predicts.

### Issues

#### Important
- **The skip-path claim overreaches.** §2.1 stated the defect "defeats the skip-when-no-diff path entirely" in all three scripts, and §8/§9 set a 2→1 PUT-count target for all three. `sync-jira-task` has **no** such gate — `changedFields.length === 0` appears nowhere in the file; it builds `fields` at `:709` and PUTs unconditionally. `sync-jira-bug`, the reference implementation, also PUTs unconditionally. For task, defect 1 corrupts only the reported change summary.
  - **Fixed**: §2.1 now states the consequence per-script; §8 and §9 scope the PUT target to story and epic.

#### Optional
- **Cited location off by one site.** §2.4 and §7 cited epic `:1460` as where the stale timestamp is persisted. `:1460` is the `--json` emit; the value written into frontmatter is `lastSyncedAt: result.updated` at `:1428`. Fixing `:1460` alone would leave the frontmatter stale.
  - **Fixed**: §2.4, §6 Phase 3, §7 and the plan file now name `:1428` and explain that `:1460` follows from it.

**Score: 8/10**

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND — now closed

### Issues

#### Critical
- **C-1 — The family registry has no home.** §4, §7 item 9, §9 Migration and Phase 4 all named a "family registry entry" as a deliverable. No family registry exists anywhere in the repository: `skill-families.md` appears only inside task.93's *planned* `observation-log/` tree, and task.93 owns both its schema and the `families [--audit]` command that reads it. Task.96 declared no dependency on task.93. The only format spec was the snippet the plan file invents. A success criterion that cannot be satisfied.
  - **Resolved per Q1**: deferred to task.93; entry parked in §Notes.

- **C-2 — The test harness Phase 1 depends on does not exist in usable form.** §8 says the tests run "against the fake Jira that found these" and Phase 1 declared **"Dependencies: none"**. In fact `fakeJira()` is a module-local, unexported function inside `skills/sync-jira-bug/tests/end-to-end.test.js:44`, hard-coupled to the bug path (`bugSync.run(...)` baked into `runSync` at `:298-301`, bug-specific issuetype and `issueLinkType` stubs, a `repoWithStoryBug()` fixture). It does not fake `/rest/agile/1.0/backlog/issue`, `/rest/api/3/project/{key}` or `/rest/api/3/project/{key}/statuses` — endpoints all three siblings call. Prerequisite work with no budget.
  - **Resolved per Q2**: Phase 1 now opens with the generalisation, and §7 gains a "Files to Add" entry.

#### Important
- **I-2 — Phase 2 is not a mechanical reorder for `sync-jira-story`.** Story computes `includeDescription` *from* the diff result (`:944-946`) and passes it *into* `collectIssueFields` (`:953`). "Build the payload, then diff against it" is therefore circular and needs a two-pass build. Both the task and the plan described the move as mechanical. Story and epic also build their payload *inside* the skip branch (story `:948` in the `else` of `:917`; epic `:1054` after the early `return` at `:1046`), so hoisting changes what runs on the skip path.
  - **Fixed**: §3, §6 Phase 2, §7 and the plan file all now carry the two-pass requirement and the skip-branch caveat.

- **I-5 — The PUT-count assertion machinery does not exist.** The fake records `state.requests` but nothing filters it by method; the existing convergence assertion (`end-to-end.test.js:369-406`) checks the change summary, issue counts and file bytes, not PUTs. New code, not a copy.
  - **Fixed**: added as an explicit Phase 1 step.

**Score: 7/10** — the plan is detailed and well-sequenced, but two of its four phases rested on things that were not there.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND — now closed

### Issues

#### Important
- **I-3 — The plan file contradicted the task document's own v1.1 correction.** `task.96.plan.*.md` Phase 1 Test B instructed: *"confirm the skip variant is already green while the update variant is red. That asymmetry is the half-fix."* The task's §3, added in v1.1, establishes the opposite — epic's skip path is unreachable while defect 1 stands, so that green is for the wrong reason and is exactly the trap §3 warns about. The plan also omitted the binding co-landing constraint (*"neither epic's label fix nor its timestamp fix may merge alone"*). The plan is the file a developer follows phase-by-phase.
  - **Fixed**: plan Phase 1 now requires asserting the skip path is *entered*, and Phase 2 opens with the co-landing constraint as a blockquote.

- **I-4 — No doc sweep in §7.** §7's Documentation section listed only `CHANGELOG.md` and the family registry. At least ten files independently restate the idempotency behaviour this task changes. Most become *true* rather than needing rewriting, but two are actively wrong afterwards: `skills/sync-jira-task/SKILL.md:418` carries a literal test count ("55 tests") that new tests falsify, and `shared/resources/jira-sync.js:4-5` still says only `sync-jira-task` uses the library when all four now do.
  - **Fixed**: §7 item 11 enumerates the sweep targets with line references; added as a Phase 4 step and a Success Criterion.

#### Optional
- **O-3 — Bundling fan-out unstated.** `jira-sync.js` has **23** bundled copies under `skills/*/references/`. A Phase 4 change to it fans out to all 23, every one of which must be committed. All four sync scripts `require("../references/jira-sync.js")` — the bundled copy, not the source — so editing `references/` directly is silently reverted by `npm run bundle`.
  - **Fixed**: noted in §7 item 4 and Phase 4.

**Score: 8/10**

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE — strong section, one risk now retired

The risk section is the best-constructed part of this document. The High-risk entry ("the fix silently disables the concurrent-edit guard") correctly identifies that every other test in the task rewards the guard staying quiet, and names the counterweight test as the mitigation. Medium risks 1, 3 and 4 are all real and well-mitigated. The rollback plan covers immediate, partial and forward paths with concrete triggers.

### Issues

#### Optional
- **O-2 — Medium Risk 2 is verified moot.** "An existing test asserts the defect" was rated Medium probability. All four `tests/` directories were searched: the only `changeSummary` assertions are `end-to-end.test.js:377` and `:560`, and both assert the *correct* behaviour. The `labels` hits elsewhere are `diffFields` unit tests with hand-built `prev`/`next` and `collectIssueFields` label-merge tests — none couples the two.
  - **Fixed**: downgraded to Low with the evidence recorded, and the corresponding Progress Tracking checkbox pre-ticked. The useful consequence is stated: Phase 1's tests must all be **newly written** — nothing existing turns red — which is a budgeting fact the task did not carry.

**Score: 9/10**

---

## Summary of Recommendations

### Must Fix (Critical) — 2, both resolved
1. Family registry deliverable had no home → deferred to task.93, entry parked in §Notes *(per Q1)*
2. Fake-Jira harness does not exist in reusable form → generalisation budgeted into Phase 1 *(per Q2)*

### Should Fix (Important) — 5, all applied
1. PUT-count criterion scoped to story + epic; task asserts change summary only *(per Q3)*
2. Phase 2 two-pass build documented for story's `includeDescription` circularity
3. Plan file reconciled with the task's v1.1 correction; co-landing constraint added
4. Doc sweep enumerated in §7 with line references
5. PUT-counting machinery added as an explicit Phase 1 step

### Consider (Optional) — 3, all applied
1. Epic stale-timestamp site corrected `:1460` → `:1428`
2. Risk 2 downgraded with verification evidence; Phase 2 checkbox pre-ticked
3. 23-copy bundling fan-out noted in §7 and Phase 4

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 7/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every defect claim was verified against HEAD with no line drift, and the hardest claim in the document — that epic's fix is unreachable dead code — holds exactly as written. The two Critical findings were gaps in *scope*, not in analysis, and both are now resolved by explicit decision rather than assumption.

---

## Accepted Risks Carried Forward

- **The effort estimate is likely low.** `estimated_effort_hours: 8` was set before the harness generalisation was known to be necessary. Recomputing the rubric from the current document (14 success criteria, 20 plan tasks, 9+ files) snaps to 16h. The user was offered the bump alongside the generalisation decision and chose the generalisation without it, so 8 stands as a deliberate choice, recorded here rather than silently changed.
- **`sync-jira-task` and `sync-jira-bug` have no skip-when-no-diff gate** while story and epic do. That asymmetry across four siblings is itself family drift, but it is a separate defect from the two in scope and needs its own evidence. Logged in §Notes → Known Issues.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Start with Phase 1's harness generalisation — it gates everything else, and the bug suite's assertions passing unchanged is the acceptance test for it
2. Confirm each new test is **red before** the fix and record that it was
3. Land epic's Phase 2 and Phase 3 fixes together — neither may merge alone
4. Mutation-prove each fix: revert, watch the named test go red, restore
5. Keep the counterweight test — a genuine remote edit must still abort — green throughout

---

## Review Metadata

- **Reviewer:** review-task (Claude), invoked by `/develop-task` pipeline Step 2
- **Review Date:** 2026-09-07
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.96.sync-jira-sibling-convergence/task.96.sync-jira-sibling-convergence.md`
- **Code verified at:** `feature/task.96.sync-jira-sibling-convergence` (base `706770f4`)
- **Sources consulted:** the four `sync-jira-*` scripts, `shared/resources/jira-sync.js`, all four `tests/` directories, `package.json`, `CHANGELOG.md`, `skills-config.yaml`, task.93/94/95 documents, `docs/runbooks/jira-publish.md`, `docs/reference/troubleshooting.md`
- **Documents modified:** task file (25 edits), plan file (9 edits)
