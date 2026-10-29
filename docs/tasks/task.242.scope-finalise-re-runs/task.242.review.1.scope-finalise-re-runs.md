# Task Review Report: Task 242 - Scope finalise re-runs

**Reviewed:** 2026-10-29
**reviewed_blob:** 381d05bb7dc781368b56fd696d9c8cea1235a32b
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT

---

## Executive Summary

> **Implementation Status**: ✅ All 8 Important recommendations implemented, plus O1, O3 and O4 — 2026-10-29

The structure is complete, and every line anchor resolves. The card preflight and link checks pass. The design is sound in outline. But four rules it depends on are unspecified or wrong for the documents and agent output that exist today. Criteria have no stable identity when a document carries no ids. Citations often hold no path. A reported-gap criterion's status is never recomputed after its members are restored. And the `overall` recompute ignores `docs[]`. As written, the task.239 replay would still fail at run 5.

**Critical Issues:** 0 🚨
**Important Issues:** 8 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 6/10 before fixes
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

No questions. Template, OKF frontmatter, card preflight (exit 0, 3 blocks) and links (`doc-links.js`, exit 0 on both files) are clean. GitHub issue #780 is open and linked. Sign-off is not configured. The Change Log is current for `planned`.

### Question Point 2: Technical & Implementation

**Q1: How should the engine identify a criterion when the document has no leading ids?**
- **User Decision**: The engine assigns ids. It uses the document's id when present, else `#N` by position, matched to the prior record by text hash. `<RERUN_SCOPE>` lists the ids the agent must echo, in full mode too.
- **Impact**: This adds an identity rule to Phase 1 and a "use these ids" instruction to Phase 2.

**Q2: How should a member the prior record never listed be treated in a reported-gap re-judge?**
- **User Decision**: It goes to advisories unless its evidence changed. Only the prior FAIL members and the members whose evidence path changed are judged.
- **Impact**: `merge` gets a third member rule, and the replay gains a "new finer member" case.

**Q3: What happens to a citation that resolves to no path?**
- **User Decision**: Resolve, else re-judge. A bare basename resolves through `git ls-files` when it matches exactly one file. A carried PASS with no resolvable tracked path is re-judged with reason `evidence-unresolved`.
- **Impact**: § 3's table gains a row and the scope gains a sixth per-criterion reason.

**Q4: Should task.242's own SC-11 be a closed set?**
- **User Decision**: Close the set. Name the guards in § 8 and require one mutation row per named guard.
- **Impact**: SC-11 is reworded and § 8 lists the guards.

### Question Point 3: Completeness & Safety

No questions. The remaining findings have one clear fix each.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections are present, along with Change Log, Progress Tracking, References and Notes. The frontmatter has `type`, `description` and `tags`. The card preflight reports Summary (+4), Success Criteria (+8) and Breaking Changes (+4) as `+N more` omissions. That is information, not a defect.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Every line anchor was read and resolves. That covers `SKILL.md:171`, `:283`, `:508`, `:513`, `:859` and `:1139`, `finalise-dod-ac-prompt.md:38`, and `jira-sync.js:1228` (`extractSection`, exported at `:5940`). `extractSection` stops only at the next `## `, so the H3 subsections under § 9 are included.

**Pre-pass B** (`prepass-axes.js` source `architecture`): `aligned`. Axes checked: What this repo produces, SKILL.md authoring, File naming, Cross-skill resources, Plan files, Validation before commit, Do not. It raised two low findings. The test file uses `.test.mjs`, which matches the `shared/resources/tests/*.test.mjs` glob in `package.json`. And a bundled engine cites its siblings by bare filename.
**Pre-pass C:** `not-implemented`. The engine, the record, `<RERUN_SCOPE>`, `members[]` and `advisories[]` are all absent.

### Important

- **I1. Criterion identity is undefined for most documents** (check 21). The plan keys on "the leading id (`SC-7`, `AC3`)". Of the 14 most recent task documents, 10 have no leading id. Measured with `extractSection(body, "Success Criteria")` over the checkbox lines: task.241, 237, 236, 235, 234, 233, 179, 174, 169 and 165 have none. The AC agent's schema emits `ac_id: "AC1"`, an ordinal it invents. `merge` has no join key between the agent's ids and the engine's. *Per Q1:* the engine assigns ids and the agent echoes them.
- **I2. Citations often hold no path** (check 10). The plan maps `path:line` to `path`. The real citations in task.239's DoD runs 4 and 5 are `:356-360`, a bare `qa-escalation-template.test.mjs:102`, and commit SHAs. None of them matches a `git diff --name-only` entry. So `evidence-changed` can never fire, and the PASS is carried forever, which is the opposite of the task's "every doubt fails toward a full run". *Per Q3:* resolve, else re-judge (`evidence-unresolved`).
- **I3. A reported-gap criterion's status is never recomputed** (check 10). For a `reported-gap`, `merge` restores the carried members and "keeps the agent's verdict on the rest". It never says what the criterion's own `status` becomes. In the task.239 case, the agent returns SC-11 `FAIL` because of members the prior run mapped. If the agent's status stands, SC-11 stays FAIL and the Expected Outcome is not reached. SC-3 tests only `scope`, not `merge`, so nothing catches this. Fix: recompute the criterion's status from its merged members (PASS when every member is PASS), and pin the replay through `merge`.
- **I4. Finer re-splitting survives at member level** (check 10). Members are free-text keys (`:102-106`). Run 5's three groups (`:102-106`, `:356-360`, `:410-412`) appear nowhere in run 4's lists (`:231`, `:93-96`, `:108-112`, `:113-115`, `:352-355`, `:190-205`, `:156`/`:210-216`). Under "keep the agent's verdict on the rest", new finer members still fail the criterion. *Per Q2:* a new member with unchanged evidence goes to advisories.
- **I5. `overall` recompute ignores `docs[]`** (check 10). The AC agent returns `acs[]` and `docs[]`, and `AC_OVERALL` comes from its `overall` (`SKILL.md:673`, decided on at `:857`). The plan recomputes `overall` "from the merged criteria". As worded, SC-5 would turn an agent `FAIL` caused by a failing `docs[]` item into PASS. Fix: recompute from the merged `acs[]` **and** `docs[]`.
- **I6. The list of the AC prompt's other readers is missing its tests** (check 20). § 3 names four skills. `git grep -n finalise-dod-ac-prompt` also finds three tests that read the prompt. `tests/explore-prompts-no-write.test.js:158` means Step 0 must not instruct a write. `tests/review-task-measured-criterion.test.js:119`, through `tests/lib/count-of-kinds.js`, means Step 0 must not state a count of kinds. `tests/review-plan-shape-checks.test.js:225` pins the anchor. Fix: record the grep and list all three, with the constraint each one sets.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important

- **I7. Reconstruction states are not listed** (check 19). `scope` rebuilds a run's position from disk. The plan should list the states it must hold in:
  - a record whose run crashed before Step 6 decided;
  - prior head equal to HEAD (a re-run with no commits);
  - a record that is not committed on the gaps path;
  - a record from a run whose Step 8a fix-and-recheck changed the tree after 3c;
  - two DoD runs where only the older one wrote a record.

### Optional

- **O1. The Step numbering collides.** `SKILL.md` already has Step 3a (Prepare Shared Context, `:456`), 3b, 3b.1, 3c (Aggregate, `:669`), 3d and 3e. The task's "Step 3a (new, before dispatch)" should extend the existing 3a, and the record write belongs in the existing 3c, after the parse and before 3d renders.
- **O2. Effort.** The rubric gives 13 → 16h (ac 13 → +4, plan tasks → +4, files > 5 → +1, "migration" → +2). The frontmatter says 8h. The divergence is exactly 0.5, which does not exceed the threshold, so this is not flagged.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I8. SC-11 repeats the open-ended set criterion that looped task.239.** "Each new guard is mutation-proved" lets the agent pick the members, and this task's first `/finalise` run is `full`. *Per Q4:* close the set.

### Optional

- **O3. "Runs 1–4 had read those groups and passed them" is unmeasured.** Run 4's report lists only the unmapped groups, so whether it "passed" `:102-106` is an inference. Reword it to "none of runs 1–4 named them".
- **O4. Reopened documents are never scoped.** A reopened document keeps its `PASSED ✅` heading even after it is retitled "historical", so every re-run after a reopen is `full`. State this in § 3 as intended.

The controls (obs #176) cover every dimension the rule reads.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The relaxation is a widening of what `/finalise` accepts. Its differential oracle is the control set in § 8, which names the shapes that must still be re-judged. Rollback is realistic and has triggers.

---

## Summary of Recommendations

### Should Fix (Important) - 8 issues

1. I1: the engine assigns criterion ids and the agent echoes them (Q1)
2. I2: resolve each citation to a tracked path, else re-judge as `evidence-unresolved` (Q3)
3. I3: recompute a reported-gap criterion's status from its merged members, and pin the replay through `merge`
4. I4: a new member with unchanged evidence goes to advisories (Q2)
5. I5: recompute `overall` from `acs[]` and `docs[]`, and fix SC-5
6. I6: list the three tests that read the AC prompt, with their constraints and the grep
7. I7: list the reconstruction states
8. I8: close SC-11's set (Q4)

### Consider (Optional) - 4 items

1. O1: extend the existing Steps 3a and 3c
2. O2: effort, information only
3. O3: soften the "runs 1–4 passed them" claim
4. O4: state that reopened documents are always `full`

---

## Implementation Readiness Assessment

**Score:** 6/10 before fixes, 8/10 after

- Template Compliance: 10/10
- Technical Accuracy: 6/10
- Implementation Clarity: 6/10
- Consistency: 7/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium before fixes, High after

**Recommendation:** ⚠️ NEEDS REVISION. Once the eight Important fixes are applied, it is ready.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-10-29
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.242.scope-finalise-re-runs/task.242.scope-finalise-re-runs.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (pre-pass B)
- **Evidence read:** task.239 DoD runs 1–5, commit `b324b496`, `skills/finalise/SKILL.md` Steps 2–3c, `finalise-dod-ac-prompt.md`, `yaml-subset.js`. `parseYamlSubset` parsed a nested `acs[].members[]` sample, including `advisories: []`.
