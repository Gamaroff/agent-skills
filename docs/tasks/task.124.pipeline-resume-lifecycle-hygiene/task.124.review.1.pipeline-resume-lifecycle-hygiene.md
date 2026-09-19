# Task Review Report: Task 124 - Resume trusts what it finds on disk

**Reviewed:** 2026-09-19
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

---

## Executive Summary

The task is structurally complete and every one of its seven defects is real and unimplemented
(pre-pass C: `not-implemented`; none of `report-lint.js`, `waiting_on`, `--restore`, the dirty-tree
probe or the snapshot deletion exist). The gaps are in *how* four of the mechanisms are specified:
Phase 4 does not name the restore path `grant-qa-cycles.sh` already ships, Phase 2 never names the
writer of `waiting_on`, Phase 3 assumes a report template file that does not exist and a section
rule that would refuse most valid reports, and the plan file predates Phase 4 and carries two
concrete errors (an overlay discard that is whole-tree and blind to untracked files; a lock field
`work_item` that is not in the lock).

**Critical Issues:** 0 🚨
**Important Issues:** 9 ⚠️
**Optional Improvements:** 7 💡

**User Clarifications:** 6 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION

> **Implementation Status**: ✅ All 9 Important recommendations implemented in the task document and plan file — 2026-09-19. Optional items 1–7 also applied where they fell inside an edited section (fixture codes, `qa-execute-snippets.mjs` phrasing, `budget_minutes`, `package.json` listing, Step 8 glob `rm`, rollback trigger); the `develop-bug` verify-loop path note (Optional 3) is superseded — the grep showed that file has no dispatch of its own.

---

## User Decisions & Clarifications

### Question Point 2: Technical & Implementation

**Q1: Phase 4 `--restore` vs the restore already inside `grant-qa-cycles.sh` (task.123)**
- **User Decision**: One implementation — `advance-pipeline-lock.sh --restore`; `grant-qa-cycles.sh` delegates to it.
- **Impact**: Phase 4 gains a same-class inventory line and a change to `grant-qa-cycles.sh`; one consumption policy (the snapshot is consumed) applies to both callers; grant's own restore tests move to `--restore`.

**Q2: Writer of the `waiting_on` lock field**
- **User Decision**: A sibling script `set-waiting-on.sh`, mirroring `set-qa-phase.sh` (one field, one writer, never touches `current_step`).
- **Impact**: Phase 2 names the writer and its two forms (`<label>` / `--clear`); `waiting_on` is added to `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` instead of a new contract test.

**Q3: Where `report-lint.js` gets its expected sections**
- **User Decision**: Extract a standalone `shared/resources/implementation-report-template.md` (story + task variants, optional-section marker); the step-0 doc references it; the linter reads it.
- **Impact**: Phase 3 gains a file and a step-0 edit; `## Tracker Actions Required` is marked optional so its documented omission is not a lint failure.

**Q4: Lint boundary**
- **User Decision**: After every report Edit (Step Transition action 2) and at every commit site (HALT commit, PreCompact append, Step 8).
- **Impact**: Phase 3's call-site list is rewritten to the actual boundaries; the transition-time check HALTs with nothing committed.

### Question Point 3: Completeness & Safety

**Q5: Overlay discard scope and untracked files**
- **User Decision**: Path-scoped discard (`git checkout -- <paths>`, `git clean -f -- <untracked paths>`), with an explicit `??` check (`git cat-file -e $BASE_REF:$p` then a content compare); anything unclassified → (c) HALT.
- **Impact**: The plan's Phase 1 snippet is replaced; the task's Medium Risk 1 mitigation gains the mechanism that makes it true.

**Q6: Which `advance-pipeline-lock.sh` forms error without a lock**
- **User Decision**: `<n>` only. `--skill` and `--complete` keep exit 0.
- **Impact**: Breaking Changes and Phase 4 state all three forms; the 9 standalone `--skill` call sites are unaffected.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections present in template order; Change Log present with two rows and current
for `status: planned`; no placeholders; OKF frontmatter complete (`type: task`, `description`,
`tags` list). Stakeholder Sign-off not configured (`sign-off` absent from `skills-config.yaml`) —
not checked. Tracker linkage: `github_issue: 424` exists (OPEN, `task` + `priority:high`, milestone
"Technical Tasks (standalone)"), body link matches, board Priority self-healed to P1.

**Card preflight**: `ok` — 3 blocks resolve. Board readers will not see: Summary +1 sentence,
Success Criteria +6 items, Breaking Changes +1 sentence.

### Issues

None.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 2 (both in the plan file)

### Issues

#### Important

- **`work_item` is not a lock field** — plan, Phase 1 "Snapshot cleanup": `jq -r .work_item …last-halt.json`.
  - **Evidence:** the lock, the PreCompact snapshot and `grant-qa-cycles.sh` all use `task_or_story_directory` (4 occurrences each; `work_item` 0). `grant-qa-cycles.sh:161` is the existing document-match comparison to reuse.
  - **Recommendation:** compare `task_or_story_directory` (canonicalised, as grant does).
- **Report template file does not exist** — task Phase 3 / Medium Risk 2 "derive the expected order from the report template file"; plan "read from the implementation-report template file the pipelines already use".
  - **Evidence:** `grep -rl "Implementation Report" shared/resources/*.md` finds only inline fenced templates in `develop-pipeline-step-0-resolve-and-prepare.md:643-746` (story at 652, task at 746). And that template says of `## Tracker Actions Required`: "Omit this section entirely when the journal is empty" — so "each template `##` once" refuses most valid reports.
  - **Recommendation:** _Per Q3_ — extract `shared/resources/implementation-report-template.md` with an optional-section marker; step-0 references it; the linter reads it.
- **HALT one-argv `rm` is not in "the step docs"** — task Scope / Phase 2 "HALT snippets in step docs".
  - **Evidence:** exactly three occurrences, all in orchestrator SKILL.md files: `skills/develop-task/SKILL.md:279`, `skills/develop-bug/SKILL.md:288`, `skills/develop-story/SKILL.md:292`. None in `shared/resources/*.md`.
  - **Recommendation:** name the three files; the grep (`test-output-\*`) stays as the completeness check.
- **Same-class mechanism not inventoried (obs #103)** — Phase 4 adds a lock-restore-from-snapshot; `shared/resources/grant-qa-cycles.sh:142-175` already does this (refuses another document's snapshot, strips `halted_at/halt_reason/halt_step/paused_at/pause_reason`, does **not** consume the snapshot, logs `lock restored from <snapshot>`).
  - **Recommendation:** _Per Q1_ — `--restore` is the one implementation; `grant-qa-cycles.sh` delegates; consumption policy stated once.
- **Same-class writer pattern not followed** — Phase 2 "dispatch sites set it, result reads clear it" names no writer. `set-qa-phase.sh` is "the ONLY writer of `qa_phase`" (task.123) and is the pattern for a non-step lock field.
  - **Recommendation:** _Per Q2_ — `set-waiting-on.sh <label>` / `--clear`; add the field to `qa-loop-lock-fields-parity.test.mjs`.

#### Optional

- **`lint:shell` lints `.sh` sources only** (`scripts/lint-shell.sh:31` "SOURCES ONLY"), not fenced markdown snippets. The HALT check is a `shared/resources/qa-execute-snippets.mjs`-based test run in bash and zsh — the Integration Tests bullet already says this; Phase 2's "`lint:shell` / shellcheck over the fenced snippets" should match it.
- **`develop-bug-step-5-6-verify-loop.md` is skill-owned**, at `skills/develop-bug/references/`, not under `shared/resources/`. Files Summary item 6 should carry the path.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Important

- **Plan file predates Phase 4** — `task.124.plan…md` Overview: "Six small mechanisms, three phases"; no Phase 4 section; no `--restore`.
  - **Recommendation:** add Phase 4 (restore semantics, the `<n>` exit change, the grant delegation) and correct the overview count.
- **Dispatch-site list is hand-enumerated and incomplete** — Phase 2 Files: "every step doc that dispatches (5, 5c, 7)". Step 3 dispatches Explore three times (`develop-pipeline-step-3-develop-loop.md:20,113,228` — codebase map, loop audit, triage) and Phase 0a dispatches the resume detector; the plan names "step-3 triage" and the task does not.
  - **Recommendation:** enumerate by `grep -n 'subagent_type=' shared/resources/develop-pipeline-step-*.md skills/develop-*/SKILL.md` and list the result; state that the detector dispatch (Phase 0a) is exempt (no lock exists yet) or included.
- **Lint call sites name a boundary that does not commit** — Phase 3: "called from the Step Transition Protocol… before every commit of the report". The protocol (`skills/develop-task/SKILL.md:111-140`) edits the report at action 2 and commits nothing; commits happen at the HALT rule ("Commit the report before any halt"), in `develop-pipeline-on-precompact.sh:189-192` (append then `git add`), during QA-loop pushes and at Step 8.
  - **Recommendation:** _Per Q4_ — lint after action 2 (HALT, nothing committed) and at each commit site; the PreCompact call goes between the append and the `git add`.
- **`<n>` no-lock exit change does not say what happens to `--skill`** — Breaking Changes and Phase 4 mention `<n>` and `--complete` only. `--skill` is issued by 9 sub-skill sites that legitimately run outside any pipeline (this review is one); the header's "No lock file → exit 0, silent noop (no active pipeline)" is that case.
  - **Recommendation:** _Per Q6_ — state that `--skill` and `--complete` keep exit 0; rewrite the header's Behaviour block (pre-pass B).

#### Optional

- **Effort**: rubric computes 16h (11 success criteria, 15 plan checkboxes, medium risk, >5 files, "integration" present) against `estimated_effort_hours: 9` — within the 0.5 divergence threshold, not flagged; noted because Phase 4 and the Q1/Q3 additions widen the work.
- **New bash tests must be listed by hand** — `package.json` `test` names each `shared/resources/*.test.sh` individually (no glob). `set-waiting-on.test.sh` and any new restore test file run nowhere until added (see `project_npm_test_glob_orphans_suites`).

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important

- **Overlay discard is whole-tree and blind to untracked files** — plan Phase 1: `git checkout -- . && git clean -fd -- skills scripts`, after a per-path test `git diff --quiet "$BASE_REF" -- "$p"`. `git diff <commit> -- <path>` never reports an untracked path, so every `??` entry passes as "identical to base" — contradicting the plan's own next sentence and the task's Critical rollback trigger "a resume that discards non-overlay work". Pre-pass B rated this medium (security).
  - **Recommendation:** _Per Q5_ — path-scoped `checkout`/`clean` over the classified paths only; `??` entries are identical-to-base only when `git cat-file -e "$BASE_REF:$p"` succeeds and the content matches; otherwise → (c) HALT.

#### Optional

- **Fixture claim "three problems named" is not tied to codes** — `329b4a65` (verified: 366 lines, `+245/-3`) has **one** H1; the duplicate copy starts at the `**Task**:` header block (line 218) with no `# Implementation Report`, then repeats seven `##` sections (226–358). `multiple-h1` will not fire on it. Name the codes the test asserts (`section-duplicated` ×7, `section-out-of-order`, and a `header-block-duplicated` if the spliced header block is to be caught) and assert `section-missing` does **not** fire for `Tracker Actions Required`.
- **`waiting_on` staleness needs the wall-clock budget inside the hook** — `develop-pipeline-on-stop.sh` does not source `read-config.sh` today (the PreCompact hook does). Storing `budget_minutes` in the field at dispatch — the step already reads `subagents.wallClockMinutes` — keeps the hook config-free.
- **Step 8 `rm -f .claude/state/test-output-*.log`** (`develop-pipeline-step-8-commit.md:77`) is a glob-only `rm`; under zsh nomatch it aborts harmlessly but noisily, and line 95's `ls … 2>/dev/null` cannot suppress the shell's own nomatch message. Same two-command form fixes it while Phase 2 is in the file.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks match the mechanisms; rollback is per-phase and the phases are independent. Medium Risk 1's
mitigation ("record every discarded path") is necessary but not sufficient without the Q5 scoping —
the report would faithfully list the work it destroyed. Medium Risk 2's mitigation ("five real
accepted reports as green fixtures") would have caught the `Tracker Actions Required` false
positive; with Q3 the template carries the optional marker and the fixtures become a regression
guard rather than the discovery mechanism.

### Issues

#### Optional

- Add to Rollback Triggers (Critical): "`grant-qa-cycles.sh` refuses a grant it accepted before" — the Q1 delegation puts the QA re-entry path (task.123) behind `--restore`, so a `--restore` regression now also breaks re-entry after a spent budget.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 9 issues

1. Phase 4: name `grant-qa-cycles.sh:142-175` as the existing restore; `--restore` replaces it and grant delegates; one consumption policy — _Q1_.
2. Phase 2: writer is `set-waiting-on.sh` (`<label>` / `--clear`), sibling of `set-qa-phase.sh`; add `waiting_on` to `qa-loop-lock-fields-parity.test.mjs` — _Q2_.
3. Phase 2: dispatch sites enumerated by grep — Step 3 (×3) and Phase 0a added or explicitly exempted.
4. Phase 3: extract `shared/resources/implementation-report-template.md` (story + task, optional marker on `Tracker Actions Required`); step-0 references it; linter reads it — _Q3_.
5. Phase 3: call sites are Step Transition action 2 (post-Edit, HALT), the HALT commit, PreCompact between append and `git add`, Step 8 — _Q4_.
6. Phase 4 / Breaking Changes: `<n>` exits 1 without a lock; `--skill` and `--complete` keep exit 0; header Behaviour block rewritten — _Q6_.
7. Plan: overlay discard path-scoped with an explicit `??` check — _Q5_.
8. Plan: `work_item` → `task_or_story_directory`; add Phase 4; fix "three phases / six mechanisms".
9. Scope / Phase 2 / Files Summary: HALT one-argv `rm` lives in the three orchestrator SKILL.md files, not the step docs.

### Consider (Optional) - 7 items

1. Fixture test asserts named codes; `section-missing` must not fire for `Tracker Actions Required`; `multiple-h1` will not fire on `329b4a65`.
2. Phase 2 phrasing: the fenced-snippet check is `qa-execute-snippets.mjs` in bash and zsh, not `lint:shell`.
3. Files Summary 6: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`.
4. `waiting_on.budget_minutes` written at dispatch so the Stop hook needs no config read.
5. Add new `*.test.sh` files to `package.json` `test` by hand.
6. Step 8's glob-only `rm` (`step-8-commit.md:77,95`) takes the same two-command form.
7. Rollback trigger for the grant path once it delegates to `--restore`.

---

## Implementation Readiness Assessment

**Score:** 7/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 6/10
- Implementation Clarity: 6/10
- Consistency: 7/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium → High once the nine Important items land (all are document edits with decisions already taken).

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** Every mechanism is well-motivated and unimplemented, but three of the four phases
under-specify the one thing a developer would otherwise guess — the writer, the template source, the
existing sibling — and the plan file carries a discard snippet that fails the task's own safety rule.
The six user decisions resolve all of them; none requires rework.

---

## Next Steps

Address before implementation (all decided above):

1. Phase 4 inventory + `grant-qa-cycles.sh` delegation; `--skill`/`--complete` exemption stated.
2. Phase 2 writer (`set-waiting-on.sh`) and grep-derived dispatch list.
3. Phase 3 template extraction and corrected call sites.
4. Plan file: Phase 4, `task_or_story_directory`, path-scoped overlay discard.
5. HALT `rm` locations corrected to the three SKILL.md files.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-09-19
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.pipeline-resume-lifecycle-hygiene.md`
- **Plan File:** `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.plan.pipeline-resume-lifecycle-hygiene.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `tech-stack.md` (via pre-pass B)
- **Pre-pass:** B `alignment: drift` (1 medium — overlay scope; 4 low); C `implementation_status: not-implemented` (10 findings, all confirmed in-line)
- **Sources verified in-line:** `advance-pipeline-lock.sh:1-63`, `grant-qa-cycles.sh:17-175`, `set-qa-phase.sh:1-12`, `pipeline-resume-detector-prompt.md:126-136`, `develop-pipeline-step-8-commit.md:70-95`, `develop-pipeline-step-0-resolve-and-prepare.md:643-746`, `develop-pipeline-on-precompact.sh:148-192`, `skills/develop-task/SKILL.md:111-140,270-279`, `scripts/lint-shell.sh`, `git show 329b4a65`
