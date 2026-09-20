# Task Review Report: Task 130 - Resume residue from task.124 — bug-variant base, dispatch population, self-reported delete, who-restores enumeration

**Reviewed:** 2026-09-20
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well-sourced — every finding it cites (PR #436 review CR-1..CR-5, gate-6 `recommendations.future`, obs #132) exists and says what the task says it says, and the pre-pass confirmed every deliverable is absent at a concrete anchor. The defects are in the **proof**, not the diagnosis: the Phase 4 single-statement test keys on a token that two other rules legitimately use (it would be red on develop the moment Phase 4 lands), Phase 1's only test is a replay recording that cannot go red on a revert, and three plan snippets carry known anti-patterns (a hand-listed population site, an unmatched-glob `ls | wc -l`, a multi-line `case` for a one-line call site). One factual claim is wrong: the `Feature branch base` row arrived with task.124, not task.115, and no existing report carries it.

**Critical Issues:** 0 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 9 💡

**User Clarifications:** 5 questions asked and answered (2 setup, 3 review)
**Implementation Readiness:** 8/10
**Recommendation:** NEEDS REVISION (all seven Important items have a decided fix — see Summary of Recommendations)

> **Implementation Status**: ✅ All 7 Important and 9 Optional recommendations implemented — 2026-09-20

---

## Decisions Log

Branch setup:
  - Started on: docs/task-130-132-from-task-124
  - Now on:     feature/task.130.resume-residue-bug-variant-base-and-who-restores
  - Base:       develop (with `c226c060` — the task.130–132 docs commit, PR #440 — cherry-picked so the document exists on this branch; merges cleanly once #440 lands)
  - Epic branch: N/A
  - Auto-skip:  false

Pre-pass:
  - Agent B (architecture): `alignment: aligned` — three low notes (`.test.mjs` naming matches `shared/resources/tests/` convention; `package.json` already globs that directory; `rm -f` must be single-path per call). Consumed below.
  - Agent C (codebase): `implementation_status: not-implemented` — eight anchors, all re-verified by hand (see § 2).

---

## User Decisions & Clarifications

### Question Point 0: Setup

**Q0a: Output format** — **Comprehensive report**.
**Q0b: Base branch for `feature/task.130.*`** — **develop** (over the recommended docs branch). Impact: the docs commit was cherry-picked onto the feature branch so the review has a document to edit.

### Question Point 2: Technical & Implementation

**Q1: Phase 4's test keys on `loop-limit|not-converging`, which contract § Re-entry step 3 and the SKILL.md Re-entry paragraphs also use (legitimately, for the grant-offer rule), while develop-bug's Step 0-lock restates who-restores *without* the token. How should the test discriminate?**
- **User Decision**: **Marker + restore-verb pattern.** An HTML comment `<!-- who-restores: statement -->` on the one section; the test asserts exactly one marker repo-wide and that no line in the five citation sites pairs a restore verb with the token or with `no re-entry grant`.
- **Impact**: Phase 4's test spec and the plan's `PHRASE`/`CITATION` sketch are rewritten; the Re-entry prose is untouched; develop-bug's token-free restatement becomes visible to the test.

**Q2: Phase 1's only proof is replay fixture 17 — a recording that cannot go red on a revert — and it is a develop-bug scenario filed under `evals/develop-task`. How should Phase 1 be proven?**
- **User Decision**: **Executable unit test + fixture 17 re-scoped as the HALT case.** New `shared/resources/tests/probe-base-binding.test.mjs` extracts the contract's base-binding block and runs it against three fixture reports (table row / `**Branch model:**` line / neither) under bash and zsh; fixture 17 becomes a develop-task resume whose report lacks the row and has no PR → HALT.
- **Impact**: Phase 1 gains a test that goes red when either sed arm or the HALT is reverted; Breaking Change 1 gets an end-to-end recording in the runner that actually exists.

### Question Point 3: Completeness & Safety

**Q3: Five phases, ~16 files, 20 checkboxes, 11 success criteria; rubric computes 14h → 16h against the frontmatter's 8h. Keep as one task?**
- **User Decision**: **Keep as one task, bump to 16h.**
- **Impact**: `estimated_effort_hours: 16`; no split; the Migration criterion (CR-1..CR-5 and gate-6 futures closed in one implementation report) stands.

---

## 1. Template Structure Compliance

**Status:** PASS (minor)

All eleven mandatory sections present and numbered; frontmatter carries `type: task`, `description`, `tags` (list), `updated`, `github_issue: 437`. No placeholders. Filename follows `task.{n}.{name}.md`. Sign-off: not enabled in `skills-config.yaml` — not checked. Change Log: present, one row, consistent with `status: planned`. Card preflight: `3 card blocks resolve` (Summary 4 omitted, Success Criteria 6 omitted, Breaking Changes 8 omitted — each announced with a `+N more` link; informational). Tracker: issue #437 OPEN, body link matches frontmatter, board Priority self-healed to P1.

### Issues

#### Optional
- **Duplicate `## Change Log` heading** — line 371 (outside the markers) and line 373 (inside). The template has one; task.124 and task.131 carry the same duplication, task.126–128 do not. Remove the outer one.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 (one factual error, two anchor drifts)

Verified by hand against the tree at `62945d68`:

| Claim | Anchor | Verdict |
|---|---|---|
| Probe binds `gh pr view` → table row → `develop` default, gh stderr discarded | `develop-pipeline-resume-contract.md:107-119` (`The base is RECORDED STATE` anchor at 108) | ✅ |
| Bug variant records `**Branch model:** … (base: X, PR target: Y)` | `implementation-report-template.md:244` | ✅ |
| develop-bug step 3 dispatch unmarked; step 51 marked | `develop-bug-step-3-investigate-fix.md:18`, `:51` | ✅ (file is **not** bundled — source is in `skills/develop-bug/references/` directly) |
| Detector instructed to `rm -f` and self-report `deleted` | `pipeline-resume-detector-prompt.md:85,211,220` | ✅ |
| `grant-qa-cycles.sh` guard reads `$SNAPSHOT` | `grant-qa-cycles.sh:145`; `--restore` at 167 | ✅ |
| `--which` / `--accept-legacy` absent | `advance-pipeline-lock.sh` | ✅ absent |
| Step 8 deletes only a non-empty matching `task_or_story_directory` | `develop-pipeline-step-8-commit.md:104-105` | ✅ |
| Who-restores stated at contract 0a + 0b, step-0 §0b, three SKILL.md | contract `:55-76`, `:195-210`; step-0 `:253`; task `:64`, story `:68`, bug `:61-69` | ✅ six sites (one statement + five restatements) |
| Gate-6 `recommendations.future` and PR-review CR-1..CR-5 | `task.124.gate.6.*.yml:59-67`; `task.124.pr-review.1.*.md:61-77` | ✅ |
| "Reports written by the pipeline since task.115 carry the row" | `git log -S'Feature branch base' -- implementation-report-template.md` → **`86ebcade` 2026-09-19 (task.124)**; **0 of 5** existing task reports carry it | ❌ |

### Issues

#### Important
- **Breaking Change 1 misdates the row.** The `Feature branch base` row was added to the template by task.124 (`86ebcade`, 2026-09-19), not task.115, and none of the five implementation reports in `docs/tasks/` carries it. The practical impact is unchanged — no lock or snapshot is on disk, so no run is in flight — but the Impact sentence and the risk table's premise must say what is true: **every** report written before PR #436 lacks the row, and a resume on one halts.
  - **Location:** § 5 Breaking Change 1 → Impact; § 10 High Risk 1.
  - **Recommendation:** replace "since task.115" with "since task.124 (`86ebcade`, 2026-09-19)"; state that no pre-task.124 run is in flight as the reason Probability is Low.

- **Phase 2 hand-lists a site the population already derives.** `qa-loop-lock-fields-parity.test.mjs:214-217` enumerates `skills/develop-bug/references/develop-bug-step-*.md` by directory, so `develop-bug-step-3-investigate-fix.md` is *already* in the population; only the `DISPATCH` regex misses its wording. "Add the develop-bug site to the expected population" would introduce exactly the hand list the plan's own Key Patterns forbid ("derive from directories, never hand lists").
  - **Location:** § 6 Phase 2 change 2; plan § Phase 2.
  - **Recommendation:** replace with a non-vacuity assertion that the widened regex matches at least one line in `develop-bug-step-3-investigate-fix.md` (so a future re-narrowing is red), and raise the floor to the measured count.

#### Optional
- **Plan anchor drift (Phase 2).** The parity test's constant is `DISPATCH` (`:190`), not `DISPATCH_PATTERN`, and its regex is `\bdispatch(?:es|ed)?\s+(?:an?|four|both|the|two)\s+…\b(?:subagents?|lenses|mapper)\b` — it does not literally list `dispatch an Explore subagent`. `EXEMPT` is at `:191`; the `sites >= 12` floor at `:242`.
- **"gate-6 CR-5" label.** The directory-less-snapshot item is **PR-review** CR-5 (cleanup / low), not a gate-6 future. Gate 6's four `future` entries are: the stderr label, the who-restores collapse, "Step 4b on step-0 reports zero-blocks-executed (pre-existing)", and the carried cycle-1 CR-5/CR-7. The zero-blocks item is not in this task and should be named as out of scope.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Important
- **Phase 4's test discriminator is shared with another rule** (Q1). `loop-limit|not-converging` appears in three contract sections (`:61` who-restores, `:203` the 0b restatement, `:350` **Offer the grant**) and in the SKILL.md Re-entry paragraphs (task `:304`, story `:317`) — the last three are the grant-offer rule, not who-restores restatements. "Exactly one section of the contract" is therefore red on develop after Phase 4 unless the Re-entry prose is also rewritten, which is not in scope. And develop-bug's Step 0-lock (`:69`, "`develop-bug` has **no re-entry grant**…") restates the rule with no token at all, so the test is blind to the one restatement that produced bug 13.
  - **Recommendation (per Q1):** mark the one statement with `<!-- who-restores: statement -->`; the test asserts (i) exactly one marker across `shared/resources/**/*.md` + `skills/develop-*/SKILL.md`, (ii) in each of the five citation sites (contract Phase 0b paragraph, step-0 §0b, three Step 0-lock paragraphs) no line pairs `restore|restores|restoring|runs the command` with `loop-limit\|not-converging` or `no re-entry grant`, and (iii) each citation site contains `Restore the lock (both resume paths)`. Mutation proofs: remove the marker → red; paste the old 0b sentence back → red; paste develop-bug's "no re-entry grant" sentence back → red.

- **Phase 1 has no test that goes red on a revert** (Q2). Replay fixtures are recordings: fixture 13 asserts strings in a recorded `task.42.implementation.1.example.md`; reverting the new sed arm changes nothing the assertion reads. The Code Quality criterion "every new branch mutation-proven" is unmet for the phase that owns the destructive outcome. Separately, fixture 17 as written is a develop-bug hotfix scenario under `evals/develop-task` (there is no `evals/develop-bug`).
  - **Recommendation (per Q2):** add `shared/resources/tests/probe-base-binding.test.mjs` — extract the `BASE_BRANCH=` block from the contract (the `qa-execute-snippets.mjs` extraction, or a fenced-block regex keyed on the `The base is RECORDED STATE` anchor), run it with `gh` stubbed to fail / to return nothing against three fixture reports (story/task table row → `develop`; bug `**Branch model:** hotfix (base: main, …)` → `main`; neither → exit 1 with the HALT text naming both shapes), under `bash` and `zsh`. Re-scope fixture 17 as a **develop-task** resume whose report lacks the row and has no PR → HALT, nothing discarded, no `git checkout HEAD` line.

- **Phase 5's legacy-snapshot snippet is glob-unsafe.** `ls .claude/state/develop-pipeline.last-halt.json .claude/state/develop-pipeline.lock.pausing.* 2>/dev/null | wc -l` puts a must-exist path and a glob in one argv: under zsh an unmatched `*.pausing.*` aborts the whole `ls` (`no matches found`), the count is 0, and the branch never fires on the default macOS shell — the exact class `docs/reference/anti-patterns.md` § "Never put a must-succeed path and a glob in one `rm` argv" describes and `halt-snippet-glob-safe.test.mjs` exists to catch.
  - **Recommendation:** count with a nullglob-guarded loop (`n=0; for f in .claude/state/develop-pipeline.last-halt.json .claude/state/develop-pipeline.lock.pausing.*; do [ -e "$f" ] && n=$((n+1)); done`) and add the snippet to the glob-safe test's population if step-8's fences are not already in it.

- **Lint call site (2) is a one-liner that warns and continues.** The HALT rule (`skills/develop-task/SKILL.md:285`, story `:298`, bug `:294`) invokes `report-lint.js … || echo "⚠️ … HALT commit skipped"` inline in a bullet — not a fenced block, and deliberately non-halting (the snapshot and lock removal must still run). The plan's multi-line `case $?` with `exit 1` arms fits sites (1) and (4) only.
  - **Recommendation:** specify the one-line form for site (2): `…--json; rc=$?; case $rc in 0) ;; 1) echo "⚠️ report failed lint — HALT commit skipped; repair by hand" ;; 2) echo "⚠️ report-lint usage error — call site wrong" ;; *) echo "⚠️ report-lint.js not runnable (rc $rc)" ;; esac` — same three messages, no `exit`. At all sites capture `rc=$?` before the `case` so the `*)` arm can print it.

- **Phase 3 restates the delete loop in three SKILL.md files.** § 6 Phase 3 and § 7 item 4 list `skills/develop-{task,story,bug}/SKILL.md` Step 0a as files that receive the `rm -f` handling. Three copies of the loop are the enumeration class this task exists to remove. The detector's output object shape is also unpinned — the plan's `jq` selects on `.concern | startswith("stale-snapshot:")` and reads `.path`, which only binds if the detector emits `{path: <snapshot path>, concern: "stale-snapshot: PR merged"}` (schema: detector prompt § `deltas_since_pause` object fields — `path`, `old_mtime`, `new_mtime`, `concern`).
  - **Recommendation:** state the loop once in the contract § Consume Output; each SKILL.md Step 0a cites it in one sentence. Pin the object shape in the detector prompt (`path` = the snapshot, `concern` = `stale-snapshot: PR merged`). Fixture 16's recorded `detector-output.json` currently asserts `PR merged; deleted` — the recording and that assertion change to the new wording, and a `pipelineStepsRan`/transcript assertion places the orchestrator's delete after the `resume-detector` event.

#### Optional
- **Phase 3 loop form.** `for p in $(printf … | jq …)` word-splits; prefer `… | while IFS= read -r p; do rm -f "$p"; [ ! -f "$p" ] || { …; exit 1; }; done` (single-path `rm` per call, which the anti-patterns rule requires, is already satisfied).
- **Files Summary item 13.** `package.json` already globs `shared/resources/tests/*.test.mjs`; the item is a no-op — say so or drop it. (The `.test.mjs` suffix matches that directory's convention even though `coding-standards.md` says `*.test.js` — not a finding.)
- **Consumer Tests.** `evals/develop-bug` does not exist; state Step 4b (`qa-execute-snippets.mjs`) over the contract, the detector prompt and develop-bug step 3 as the plan, not a fallback.
- **Effort** (Q3): rubric 2 + 4 (11 criteria) + 4 (20 checkboxes) + 1 (medium) + 1 (>5 files) + 2 ("migration") = 14 → **16h**; frontmatter says 8. Set `estimated_effort_hours: 16`.

---

## 4. Consistency & Completeness

**Status:** MINOR ISSUES

### Issues

#### Optional
- **Citation count is off by one.** Overview says "stated once, cited four times"; Phase 4 says "Reduce the four restatements". The restatement sites are five: contract Phase 0b, step-0 §0b, and the three Step 0-lock paragraphs (the title's "five sites" and gate 6's "five who-restores statements" count differently again). Say "five citations" everywhere, and let the test's site list be the count.
- Overview, Scope, Files Summary and Success Criteria otherwise agree with each other and with the plan; Success Criteria are each verifiable by a named test once the Important items above land.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

High Risk 1's premise ("no such run is in flight") was checked: `.claude/state/` holds neither `develop-pipeline.lock` nor `develop-pipeline.last-halt.json`. The row-date correction (§ 2) sharpens the risk statement without changing its probability. Rollback (revert merge commit → bundle → `ci:fast`; fixtures 13–16 green) is concrete and the fixtures exist. Medium Risk 2 (two edits to the contract) is mitigated by phase order and one PR — now three edits (Phases 1, 3, 4) but the same mitigation holds.

No additional risks identified.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 7 issues

1. **Rewrite Phase 4's test spec** to the marker + restore-verb form and add the develop-bug token-free restatement to its mutation proofs — _per Q1_.
2. **Add `probe-base-binding.test.mjs`** (executed under bash and zsh, three report fixtures) and re-scope fixture 17 as the develop-task HALT case — _per Q2_.
3. **Correct Breaking Change 1**: row added by task.124 (`86ebcade`, 2026-09-19); no existing report carries it; risk premise = no run in flight.
4. **Phase 2**: drop "add to the expected population"; add a non-vacuity assertion on the develop-bug file; raise the floor.
5. **Phase 5 step-8 snippet**: nullglob-guarded count, not `ls … *.pausing.* | wc -l`.
6. **Lint site (2)**: one-line `rc=$?; case $rc in …` form, warn-only; capture `rc` at all sites.
7. **Phase 3**: one delete loop in the contract, SKILL.md cites; pin the detector's `{path, concern}` shape; update fixture 16's recording and assertion.

### Consider (Optional) - 9 items

1. Remove the duplicate outer `## Change Log` heading.
2. Fix plan anchors: `DISPATCH` at `:190`, `EXEMPT` at `:191`, floor at `:242`.
3. Relabel "gate-6 CR-5" → PR-review CR-5; name gate 6's zero-blocks future as out of scope.
4. `while read` loop form in Phase 3.
5. Files Summary item 13 is a no-op.
6. Consumer Tests: Step 4b is the plan.
7. `estimated_effort_hours: 16` — _per Q3_.
8. "cited four times" → five.
9. Note in Phase 2 that `develop-bug-step-3-investigate-fix.md` is not bundled (source lives in `skills/develop-bug/references/`).

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10
- Technical Accuracy: 7/10
- Implementation Clarity: 7/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High (once the Important items land — each has a decided fix)

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** No hallucinations and every source checks out, but as written Phase 4's test would be red on develop and Phase 1 has no test that can fail — a developer following the plan verbatim would ship the highest-risk phase unproven. All seven Important items were resolved with the user in this review and are mechanical to apply.

---

## Next Steps

Address the following before implementation:

1. Apply the seven Important fixes to the task and plan documents (Step 8.5 of this review offers to do it).
2. Set `estimated_effort_hours: 16`.
3. Land Phase 1 before Phases 3 and 4 (all three edit the resume contract); one PR.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-09-20
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.130.resume-residue-bug-variant-base-and-who-restores/task.130.resume-residue-bug-variant-base-and-who-restores.md`
- **Plan File:** `task.130.plan.resume-residue-bug-variant-base-and-who-restores.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/source-tree.md`, `docs/reference/anti-patterns.md` (via pre-pass Agent B)
- **Sources Re-verified:** `develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `implementation-report-template.md`, `develop-pipeline-step-8-commit.md`, `grant-qa-cycles.sh`, `advance-pipeline-lock.sh`, `qa-loop-lock-fields-parity.test.mjs`, `develop-bug-step-3-investigate-fix.md`, three `develop-*/SKILL.md`, `task.124.gate.6.*.yml`, `task.124.pr-review.1.*.md`, fixtures 13 and 16, `package.json`
