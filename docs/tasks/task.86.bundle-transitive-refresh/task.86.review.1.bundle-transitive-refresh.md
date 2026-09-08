# Task Review Report: Task 86 — `bundle_skill.py` never refreshes transitively-bundled references

**Reviewed:** 2026-09-08
**Review Depth:** Thorough
**Task Status:** Draft
**Overall Assessment:** NEEDS IMPROVEMENT — real defect, wrong diagnosis, self-contradicting scope

---

## Executive Summary

The defect task 86 reports is **real, live, and reproduced end-to-end during this review** — the bundler
prints `✅ in sync` for files it never opened, and eight bundled copies are stale on `develop` right now.
But the document's stated **root cause is factually wrong**, and two of its three scope items describe work
that already exists. Most seriously, the mechanism that actually causes the failure is the one thing the
task explicitly places **Out of Scope**.

**Critical Issues:** 4 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — `develop-next` → `develop-task` Step 2)
**Implementation Readiness:** 4/10 as written → **9/10 after the fixes applied in Step 8.5**
**Recommendation:** READY TO IMPLEMENT (post-fix)

---

## Measurements Taken During This Review

Every claim below was **executed**, not read. The tree was fully restored afterwards
(`git status` clean, 858 bundled files).

### M1 — The defect reproduces (source-change propagation test)

Appended a marker to `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, ran
`bundle_skill.py --all`, then asked which consumers picked it up:

```
picked up marker : develop-bug, develop-story, develop-task, review-pr
STALE            : qa-story   ← printed "✅ qa-story: in sync"
STALE            : qa-task    ← printed "✅ qa-task: in sync"
```

**`in sync` was printed for a file that was never opened, while it was demonstrably stale.** This is
exactly the reported symptom, and it is the single most important fact in this review.

### M2 — Orphan census (independent of any code reading)

Deleted every `skills/*/references/` directory, regenerated from scratch, and diffed against `HEAD`:

| Measurement | Result |
| --- | --- |
| Bundled files on `develop` | 858 |
| Files the bundler regenerates | 749 |
| Never regenerated (**orphans**) | **109** |
| Orphans that have a `shared/resources/` source (**the defect set**) | **26** |
| Discovered files found stale | **0** |

The last row matters as much as the others: **the bundler is correct on everything it examines.** The
entire defect surface is the 26 orphans. This was derived by a method (delete-and-regenerate) wholly
independent of the pre-pass agent's read-only simulation of pass 1, and the two produce the **same 26
files**.

### M3 — Current staleness of the 26 orphans

Recomputed the expected bytes using `bundle_skill.py`'s **own** `inject_header` and rewrite regexes
(imported, not re-implemented):

```
IN SYNC : 18
STALE   :  8
  skills/create-skill/references/skill-dependencies.json
  skills/create-story/references/set-github-project-priority.sh
  skills/create-task/references/set-github-project-priority.sh
  skills/develop-bug/references/verify-push-state.sh
  skills/develop-story/references/verify-push-state.sh
  skills/develop-task/references/verify-push-state.sh
  skills/qa-story/references/develop-pipeline-step-1-create-branch.md
  skills/qa-task/references/develop-pipeline-step-1-create-branch.md
```

### M4 — The harm is not theoretical

`skills/qa-{story,task}/references/develop-pipeline-step-1-create-branch.md` ships:

```
  "current_step": 1,      ← shipped copy
  "current_step": 2,      ← shared source
```

`1` is **the exact value the source file's ⚠️ block exists to forbid**, and that block is absent from the
shipped copy (`grep -c` → source 1, copy 0). The source records the consequence: the `Stop` hook
*"skipped a step whenever it fired mid-step. Observed four times on one story before it was found."*
Two skills are shipping a contract that contradicts an invariant the source explicitly warns about.

### M5 — Why the four files the task names show no drift today

All four exist in `qa-story` and `qa-task` and are currently byte-identical to the expected transform.
They were repaired **by hand** in `da1d9f1a` *("accept `Draft`, and sync two orphaned bundled
references")* — not structurally. All eight remain in the orphan set, so nothing prevents them
re-staling. A reproduction must therefore **not** assert present drift in those files.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

| Check | Result |
| --- | --- |
| File naming `task.86.{name}.md` | ✅ |
| OKF frontmatter (`type`, `description`, `tags`) | ✅ |
| Tracker card preflight (`--check-card`) | ✅ exit 0, no findings |
| Change Log present | ✅ v1.0 |
| Mandatory numbered sections | ❌ **5 of 11** |
| Progress Tracking | ❌ absent |
| `github_issue:` | ❌ absent |

### Critical

- **[C1] Seven of eleven mandatory sections are missing** — Technical Background, Breaking Changes,
  **Implementation Plan**, Files Summary, **Testing Strategy**, Risk Assessment, Rollback Plan. Missing
  Implementation Plan and Testing Strategy are Critical by this skill's own rubric. The five sections
  present are also mis-numbered (Scope as `3` rather than `4`; Success Criteria as `4` rather than `9`).

### Important

- **[I1] No `github_issue:`** — siblings 93, 94, 95 and 97 all carry one; the repo convention is that
  tasks are tracked.
- **[I2] Progress Tracking section absent** — the phase table `develop-task` and `finalise` both read.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND — **the central claim is wrong**

### Critical

- **[C2] The stated root cause is factually incorrect.** §1 asserts the bundler *"builds its `needed` set
  by scanning a skill's **own** files"* and that a transitively-reached file *"is never rediscovered."*
  **Discovery is already transitive.** `bundle_skill.py:157-183` is a fixed-point worklist (`seen`,
  `pending`, `pending_quiet`) that re-scans every bundled source. `git log -S` on its comment returns
  **only `b887381d`** — the commit that created the file. The loop has been there since day one; it was
  never absent and never retrofitted.

  The true cause is three **discovery-edge** failures that leave files unreachable:

  1. **`references/X` inside a shared `.md` is a dead end.** `REFS_REF_RE` is applied to skill files
     (`:154`) but **never to `text` inside the loop**. `shared/resources/develop-pipeline-step-8-commit.md`
     names `references/verify-push-state.sh` — so that file is unreachable for all three `develop-*`
     skills.
  2. **`.json` is not in `REFS_REF_RE`'s suffix alternation** (`md|sh|js|mjs|py`). `create-skill/SKILL.md`
     names `references/skill-dependencies.json`; it never matches, so `create-skill` computes
     `|needed| == 0`, takes the early return at `:185-188`, prints `✓ create-skill: no shared refs`, and
     never touches its stale `references/`.
  3. **Bare backticked filenames in shared prose** — `shared/resources/platform-detection.md` names
     `` `set-github-project-priority.sh` `` with no path prefix; neither regex matches, which is why
     `create-story` and `create-task` drift.

  Correcting this is not pedantry: an implementer who trusts §1 would rewrite a loop that already works
  and would still not fix any of the 26 orphans.

- **[C3] Scope item 2 asks for a CI check that already exists — and would not have caught this.**
  `.github/workflows/validate.yml` already has a step named **"Bundle freshness check"** (landed in
  `190ab2b9`, task.40, *before* task 86 was filed). It is `bundle_skill.py --all` followed by
  `git diff --quiet -- 'skills/*/references/*'`. That idiom is **structurally incapable** of catching this
  bug: the bundler never writes the orphans, so `git diff` is clean and the lane is green while eight
  files are stale. The task must ask for a **per-file equality assertion**, not "add a check".

### Important

- **[I3] Success criterion "Full `npm run ci` green" cannot evidence the fix.**
  `"ci": "npm run ci:fast && npm run eval:all"` runs neither `validate:all` nor the bundle-freshness step
  — those live only in `validate.yml`. A green `npm run ci` says nothing about the new assertion.
  Note also `evals/shared/tests/ci-gate-parity.test.mjs` asserts set equality between `test.yml`'s
  `npm run …` terms and the `ci` composite: adding an npm script to one without the other turns it red.
  Adding a **test file** under an existing glob is free.

---

## 3. Implementation Plan Completeness

**Status:** ABSENT — there is no Implementation Plan at all (see C1).

### Important

- **[I4] `package_skill.py` is neither in scope nor explicitly excluded**, yet §2's motivating harm is the
  zip path — *"A consumer installing a skill from its zip gets the stale contract with no signal at all."*
  `package_skill.py:84-102` is a **duplicated, single-pass, non-transitive** discovery with no worklist,
  no `.mjs`, no `references/X` seeding, and it writes shared files into the zip **verbatim — no rewrite,
  no header**. `AGENTS.md:146-151` and `coding-standards.md:37-42` both assert the two consumers *"do the
  same rewrite"*; leaving this out falsifies that documented parity. It must be brought in scope or
  excluded with a stated reason.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND — **the scope contradicts itself**

### Critical

- **[C4] Out of Scope excludes the entire defect surface.** §3 says *"Removing genuinely orphaned
  references … is a separate cleanup with its own risk."* But M2 shows the orphans **are** the defect: 26
  files, 8 of them stale. Scope item 3 ("`in sync` cannot be printed for a file that was not examined") is
  *only* about orphans. As written, the task's In Scope and Out of Scope sections describe opposite
  changes to the same set of files.

  The resolution is to separate two things the task conflates: **refreshing** an orphan that has a
  `shared/resources/` source (in scope — it is a stale copy) from **deleting** one that has no source
  (out of scope — that is the risky cleanup). The 109-vs-26 split in M2 is exactly that line, and it is
  measurable rather than a judgement call.

### Important

- **[I5] Success criterion 2 is unfalsifiable as written.** *"A deliberately-staled bundled copy fails CI"*
  passes trivially if the mutation is applied to a **discovered** file — hand-staling one produces a git
  diff, so the existing check already catches it. The criterion must require the mutation be applied to an
  **orphan**, which is the case that currently passes green.

---

## 5. Risk & Rollback Assessment

**Status:** ABSENT (see C1).

Risks the document should name, established by measurement:

- Landing a working freshness assertion **will go red immediately** on the 8 files in M3 unless they are
  re-bundled in the same change. This is expected, not a regression.
- `AGENTS.md:55-62` and the bundler docstring both make **idempotence** a load-bearing contract; the
  existing `validate.yml` step depends on it. Any fixed-point change must preserve it.
- `.githooks/pre-commit` runs `npm run bundle --silent` and auto-stages the bundled delta — a third,
  undocumented consumer of discovery semantics.
- `source-tree.md:87` sanctions a large bundled diff (*"running the bundler is the safe path"*) but it
  must be **bundler-produced, never hand-edited**.

---

## Summary of Recommendations

### Must Fix (Critical) — 4

1. **[C2]** Replace the root-cause narrative with the three measured discovery-edge failures.
2. **[C4]** Resolve the scope self-contradiction: refresh orphans **with** a source; leave source-less
   orphans alone.
3. **[C3]** Re-frame the CI item as replacing regenerate-and-diff with a per-file equality assertion.
4. **[C1]** Add the seven missing mandatory sections and fix the numbering.

### Should Fix (Important) — 5

1. **[I4]** Decide `package_skill.py` explicitly.
2. **[I5]** Require the mutation proof to target an orphan.
3. **[I3]** Replace the `npm run ci` criterion with a check that actually exercises the assertion.
4. **[I1]** Create and link a GitHub issue.
5. **[I2]** Add Progress Tracking.

### Consider (Optional) — 2

1. **[O1]** `estimated_effort_hours: 4` is light for 26 orphans, 8 stale files, two consumers and a new
   test — 6–8h is more realistic.
2. **[O2]** `.githooks/pre-commit` deserves a line in `tech-stack.md`; it is an undocumented consumer.

---

## Implementation Readiness Assessment

**Score (as filed):** 4/10 — **Score (post-fix):** 9/10

| Dimension | As filed | Post-fix |
| --- | --- | --- |
| Template Compliance | 3/10 | 10/10 |
| Technical Accuracy | 2/10 | 9/10 |
| Implementation Clarity | 2/10 | 9/10 |
| Consistency | 3/10 | 9/10 |
| Risk Management | 2/10 | 9/10 |

**Confidence for successful implementation:** High (post-fix).

**Justification:** The task identifies a genuine, reproducible and currently-harmful defect — that is the
hard part and it is correct. What was wrong was the mechanism, the already-done scope items, and a scope
that excluded its own subject matter. All are now settled by measurement rather than argument, so the
corrected document can be implemented directly.

---

## Review Metadata

- **Reviewer:** review-task (autonomous — `develop-next` → `develop-task` Step 2)
- **Review Date:** 2026-09-08
- **Review Depth:** Thorough
- **Task File:** `docs/tasks/task.86.bundle-transitive-refresh/task.86.bundle-transitive-refresh.md`
- **Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`, `AGENTS.md`
- **Experiments:** M1–M5 above; tree restored and verified clean afterwards
