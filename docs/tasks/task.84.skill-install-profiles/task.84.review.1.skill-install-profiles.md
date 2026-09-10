# Task Review Report: Task 84 — Skill install profiles with dependency closure

**Reviewed:** 2026-09-04
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 important recommendations implemented — 2026-09-04

---

## Executive Summary

Task 84 is architecturally sound and unusually well specified: its two load-bearing claims — `main()`'s step order, and that the `--update` short-circuit returns before `select_platform` — are both correct against the current tree, and the dependency it builds on (task 83's `_skill_excluded_for_tracker`) is merged and live. No hallucinated libraries, frameworks, or APIs were found; every file, function and flag the task names either exists or is a coherent new addition.

The defects were of one kind: **the document described a tree that has moved.** Every `setup-consumer.sh` line citation was 4 to ~200 lines stale, the 119-skill / 46,408-byte baseline no longer matches the repo, and three specific claims about the build system were simply wrong — one of which would have made a success criterion unsatisfiable and another of which would have left the new CI drift check silently never firing.

**Critical Issues:** 0 🚨
**Important Issues:** 8 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run; every ambiguity was resolved against the codebase and is recorded as a stated finding below rather than deferred.
**Implementation Readiness:** 9/10 (7/10 before fixes)
**Recommendation:** ✅ READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran non-interactively inside the `develop-task` pipeline (invoked by `/develop-next` for roadmap item **T84**). Per the autonomous directive, questions that would normally be put to the user were answered from the codebase and are recorded here as resolved findings with their evidence, not as open questions.

Two decisions were taken on the operator's behalf and are called out explicitly because they had side effects:

| Decision | Answer taken | Rationale |
|---|---|---|
| Tracker sync — task had no `github_issue` | **Sync to GitHub** (the recommended option) | Every other task in `docs/tasks/` carries `github_issue` (task 83 → #316, task 9 → #16). Created **#317**, labels `task` + `priority:medium`, milestone `Technical Tasks (standalone)`, board Priority P2. |
| Step 8.5 — apply fixes? | **Yes, all critical + important** | Pipeline default; the task must be corrected before Step 3 runs `/develop`. |

One board field could not be set: the `Agent Skills` project has no `Estimate` number field, so `estimated_effort_hours: 8` was not mirrored. Non-blocking.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections present (`## 1. Overview` … `## 11. Rollback Plan`), plus `Change Log`, `Progress Tracking`, `References`, `Notes`. Filename follows `task.{number}.{descriptive-name}.md`. No placeholders (`[TBD]`, `[TODO]`, `???`) anywhere. OKF frontmatter conformant: `type: task` present and non-empty, `description` present, `tags` a proper YAML list.

**Tracker-card preflight** (`sync-jira-task.js --check-card`): **exit 0, zero findings.** All three card blocks resolve — Summary (prose, 238 chars, 6 sentences omitted), Success Criteria (list, 510 chars, 16 omitted), Breaking Changes (prose, 136 chars, 4 omitted). The omission counts are reported here as information: a board reader sees roughly a fifth of the success criteria, and the `+N more` link carries the rest.

**Sign-off**: `sign-off` is absent from `skills-config.yaml` → check skipped entirely, as specified. Not a finding.

**Change Log**: present, four canonical columns, one row (`1.0 Initial draft`). Status was `planned` — not advanced past it — so the currency heuristic does not fire. Not a finding.

### Issues

#### Important
- **[Fixed]** Frontmatter had no `github_issue` — the repo convention for tasks. Created and linked #317.

#### Optional
- No `risk_level:` in frontmatter. Not required, but its absence is what put this task in `standard` pipeline mode by default (the lite-mode rule treats absent as low-risk, and the other two conditions failed anyway). Harmless here.

**Score: 9/10**

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (all corrected)
**Hallucinations Detected:** 0

No invented libraries, frameworks, APIs, file paths or flags. `--all-skills` and `--dry-run` both exist as described. `_skill_excluded_for_tracker`, `_resolve_install_tracker`, `write_skills_config`, `select_platform`, `check_prereqs` and `install_skills` all exist. Node ≥ 22 is genuinely already a prerequisite. `npm run generate-catalog` exists. The prompt idiom the plan says to copy is really there.

What was wrong was the *coordinates*, and three claims about the build system.

### Issues

#### Important

1. **Every `setup-consumer.sh` line citation was stale.** Verified against `develop` at `a0ac4b8`:

   | Cited | Actual | Drift |
   |---|---|---|
   | `install_skills()` at :755 | **:908** | ~153 lines |
   | `main()` step order at :1100-1130 | **:1298-1329** | ~200 lines |
   | `select_platform()` at :169 | **:173** | 4 lines |
   | `check_prereqs()` at line 145 | **:149** | 4 lines |
   | `--update` returns at line 1115 | short-circuit at **:1312-1316** | ~200 lines |
   | sourcing hook at line 1135 | the file's final line | ~200 lines |

   Line 754 (near the cited :755) is the *start of the `SKILLS_JIRA_ONLY` list*, and lines 1100-1130 are `_unpatch_hook_exact`/`install_hooks` — a developer following either citation lands in the wrong function entirely.

   **Fix applied:** all citations corrected; the References section expanded to also name `_resolve_install_tracker` (:820), `_skill_excluded_for_tracker` (:875), the exclusion lists (:754-771), the grandfather branch (:971-993), `write_skills_config` (:435), and the tarball-vendoring precedent (:1014-1017). A standing note now says line numbers go stale and to grep the function name.

2. **The 119-skill / 46,408-byte / 11,602-token baseline no longer matches the tree.** The repo now has **120** skills with a `SKILL.md`, whose `description:` values total **41,246 bytes** (~10,300 tokens).

   This mattered more than a wrong number usually does, for two reasons. First, §9 already required that "the success criteria assert the *computed* size is reported, not a hardcoded number" — while §8 and the plan simultaneously pinned `46408 * 0.55` as a literal inside the assertion. The document contradicted itself. Second, two reasonable measurement methods disagree by ~10% (summing the `description:` value gives 41,246; counting the whole frontmatter block gives ~45k), so a bare byte figure is not even well defined without naming its method.

   **Fix applied:** baseline restated as measured, dated, and method-named. The assertion in both §8 and the plan now measures `full` and `pipeline` **in the same run** and compares them (`pipelineBytes < fullBytes * 0.55`) — no literal. Counts in the §5 breaking-changes table and the wizard copy were de-hardcoded to "all"/a resolver-supplied count for the same reason.

3. **The bundler warning is wrong for the two JSON files.** The plan warned that `npm run bundle` would silently revert a fix applied to a bundled copy of `skill-profiles.json` / `skill-dependencies.json`. But `bundle_skill.py` globs only `.md`, `.js`, `.mjs`, `.sh`, `.py` — `.json` is never bundled, so no bundled copy exists.

   The warning is real for `resolve-skill-set.mjs` and `resolve-skill-set-cli.mjs`. Leaving it stated uniformly would teach a developer to look for a bundled JSON that does not exist, and obscure the delivery path that actually matters.

   **Fix applied:** split the caveat by file type, and named the real delivery path — the installer reads `${_tmpdir}/shared/resources/…` straight out of the extracted tarball, exactly as `install_skills` already does for `generate-prd-epic-index.mjs` at `setup-consumer.sh:1014-1017`. That precedent is now cited.

**Score: 9/10** (7/10 before fixes)

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (corrected)

The plan is exceptionally concrete — real code for the generator, the resolver, the wizard prompt, the config reader and the grandfather branch, with the ordering rationale stated where it is load-bearing. Phases have explicit dependencies and risk levels. This is well above the bar.

### Issues

#### Important

4. **`resolve-skill-set-cli.mjs` was an undeclared deliverable.** The plan's bash invokes `node "${_tmpdir}/shared/resources/resolve-skill-set-cli.mjs"`, but that filename appears nowhere else: §7 Files Summary lists only `resolve-skill-set.mjs`, and the plan's Phase 2 heading names only that file. A developer working from the Files Summary would build the resolver and then discover at wiring time that the entry point does not exist — or, worse, collapse the two and lose the purity that makes the resolver unit-testable against injected fixtures.

   **Fix applied:** declared as item `4a` in §7 with its contract (parses the four flags, loads both JSON files, resolved names one-per-line on **stdout**, closure/conflict/dropped report on **stderr** so `$( )` yields only names), and Phase 2 restructured to introduce both files explicitly with the reason for the split.

5. **The `--dry-run` success criterion conflicts with an explicit design rule in `install_skills`.** §8 required `--dry-run` to "report the counts the real run would produce". But the dry-run branch (`setup-consumer.sh:930-947`) deliberately never downloads the tarball — the in-code comment states that adding a download "would put a network request in a dry run and break the 'one request, whole archive' property". So it has no tarball skill list to count.

   The criterion is satisfiable in the part that matters and unsatisfiable in the part that does not: profile, closure and tracker-filter counts are all computable offline because both JSON files are committed; "what is actually in the tarball" is not.

   **Fix applied:** criterion narrowed to the offline-computable resolved-set count, with an explicit note not to add a download to the dry-run path to satisfy it.

**Score: 9/10**

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (corrected)

### Issues

#### Important

6. **A success criterion that can never be ticked.** §9 requires "both new suites registered in `package.json` and observed to run", and Phase 5 lists "Register the suite in `package.json`" as a step. But `package.json`'s `test` script **already** globs `shared/resources/tests/*.test.mjs` — which is exactly where both new suites land, alongside task 83's `setup-consumer-skill-exclusion.test.mjs` and 25 others. There is no edit to make.

   The task's reasoning for the criterion was sound and is documented in project memory (hand-maintained globs orphaned a whole suite once). It just does not apply to this directory. Left as written, a developer either makes a pointless edit or ticks a box for work they did not do.

   **Fix applied:** criterion rewritten so the *observation* is the check — run `npm test`, watch the reported count rise — with a note that hand-registration is needed only for a new directory or a new `*.test.sh`. The general warning is preserved in the plan, scoped to where it actually bites.

7. **The CI drift check was routed to the wrong workflow.** The plan said to mirror the catalog check in `.github/workflows/release.yml`. That check exists — but `release.yml` runs at **tag time**, too late to stop a bad merge. The PR gate is `validate.yml:43-51`, and copying only `release.yml` leaves PR-level drift uncaught, which is most of the value of a drift check.

   Two further obstacles would make a naive copy into `validate.yml` a silent no-op: that job sets up **Python only** (its comment notes `generate-catalog` is pure Python — a Node generator needs `actions/setup-node` added), and its `paths:` filter lists `skills/**` and the catalog file but **not** `shared/resources/**`, so a change to the generated JSON alone would not trigger the workflow at all.

   **Fix applied:** Phase 1 now names both workflows, marks `validate.yml` as the gate that matters, and spells out both obstacles with the warning that missing either means the check never runs.

8. **`getting-started.md` "wizard step 8" is already occupied.** Task 83 wrote `#### Step 8 — the platform skill filter` at `docs/concepts/getting-started.md:135`. Documenting profiles as "step 8" would overwrite it.

   **Fix applied:** §9 migration criterion now says Step 9 (or a sibling subsection under Step 8) and warns against overwriting.

#### Optional

- **Internal consistency otherwise holds.** Overview aligns with the Implementation Plan; §7 Files Summary matches the phases (after fix 4); Testing Strategy covers every changed component; Success Criteria map to the stated benefits; the rollback plan covers all five phases with distinct immediate / partial / forward-fix tiers.
- **No Mermaid diagrams** in either document. Not a finding — the ASCII "Target Architecture" block already conveys the six-step resolution pipeline clearly, and §6.5 says not to flag absence where prose does the job.

**Score: 9/10** (7/10 before fixes)

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk identification is genuinely good, and the two HIGH risks are the right two. Risk 2 ("closure defeats task 83 and drags the wrong tracker's skills back in") correctly identifies that this is *the default outcome of a naive implementation* rather than an edge case, ties it to a named integration test, and mutation-proves it by removing the filter. Risk 1 correctly concedes that closure completeness cannot be proven and therefore requires the *failure mode* to be legible — the runtime error must name the missing skill and the `--all-skills` remedy. That flag already exists and works, so the mitigation is real rather than aspirational.

Risk 3 (profile membership going stale) cites this repo's own precedent for the failure. Risk 4 (config/disk divergence under grandfather) correctly classes the divergence as the *expected* state for existing consumers and documents it as normal rather than flagging it as an error.

Mutation-proving table covers all five load-bearing guarantees, matching the project's `mutation-proving.md` requirement.

### Issues

#### Optional

- **A Node generator in `scripts/` is a new, undocumented pattern.** `scripts/` holds exactly two files today, both shell (`release.sh`, `setup-consumer.sh`); every existing generator is Python under `skills/create-skill/scripts/`, and `tech-stack.md` says "Python for build/validate/catalog tooling". A Node generator is defensible — `shared/resources/generate-prd-epic-index.mjs` is precedent, and the generator must share the ESM resolver's module system — but `source-tree.md` does not say what belongs in `scripts/`. Worth a line in the architecture docs when this lands. Not blocking.
- **`estimated_effort_hours: 8` reads low** against 21 success criteria, 5 phases, 50 plan checkboxes and two Medium-risk phases; a rubric recompute lands nearer 14h. Just inside the 2× divergence threshold, so flagged only as an observation. Non-blocking, does not affect the gate.
- **Pre-existing doc drift, not introduced here:** `coding-standards.md` says "JavaScript: kebab-case.js for libs", which contradicts the actual `.mjs` practice in `shared/resources/`. Task 84 correctly follows the practice, not the doc. Worth a separate cleanup task.

**Score: 9/10**

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None. No blocking issues were found.

### Should Fix (Important) — 8 issues, all applied

1. ✅ Correct six stale `setup-consumer.sh` line citations; add the task-83 anchors and a staleness warning
2. ✅ Restate the skill-count / description-byte baseline as measured, dated and method-named (120 / 41,246 bytes)
3. ✅ Move the context-saving assertion off a hardcoded literal onto a both-sides-measured comparison, resolving the §8/§9 contradiction
4. ✅ Declare `resolve-skill-set-cli.mjs` as its own deliverable with its stdout/stderr contract
5. ✅ Narrow the `--dry-run` criterion to the offline-computable count; forbid adding a download to satisfy it
6. ✅ Correct the `package.json` registration criterion — the `shared/resources/tests/` glob already collects both suites
7. ✅ Route the drift check to `validate.yml` as well as `release.yml`, naming its missing `setup-node` and `paths:` filter
8. ✅ Note that `getting-started.md` Step 8 is taken; profiles are Step 9
9. ✅ Correct the bundler warning — `.json` is not bundled; name the real tarball delivery path

### Consider (Optional) — 3 items

1. Document what belongs in `scripts/` in `source-tree.md` when the Node generator lands
2. Revisit `estimated_effort_hours: 8` — the rubric suggests ~14h
3. File a separate cleanup for the `coding-standards.md` `.js`/`.mjs` contradiction

---

## Implementation Readiness Assessment

**Score:** 9/10 (7/10 before fixes)

**Scoring Breakdown:**

- Template Compliance: 9/10
- Technical Accuracy: 9/10 (7/10 before)
- Implementation Clarity: 9/10
- Consistency: 9/10 (7/10 before)
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Zero critical issues, no hallucinations, and a plan detailed enough to implement from directly. All eight important issues were corrections to a document describing a tree that had moved since it was written — every one has been applied, and the two that would have caused real downstream damage (a drift check that never fires, an assertion pinned to a stale literal) are now specified in a form that cannot go stale.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the plan phase by phase — Phase 1 (generator + JSON + CI drift check) has no dependencies and unblocks everything else
2. Treat the closure→tracker-filter **ordering** as the single thing that must not be got wrong; integration case 7 is the test that catches it
3. Re-verify the `develop-story` (8) and `review-story` (10) edge sets against the current tree before pinning them as fixtures — they were measured on v0.45.0
4. Mutation-prove each of the five guarantees per `shared/resources/mutation-proving.md`
5. Run `shellcheck scripts/setup-consumer.sh` and confirm no new warnings

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, autonomous — `develop-task` Step 2/8, dispatched by `/develop-next` for roadmap T84)
- **Review Date:** 2026-09-04
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.84.skill-install-profiles/task.84.skill-install-profiles.md`
- **Plan File:** `docs/tasks/task.84.skill-install-profiles/task.84.plan.skill-install-profiles.md`
- **Verified against:** `develop` at `a0ac4b8`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `tech-stack.md`, `source-tree.md`, `AGENTS.md`
- **Pre-pass agents:** 2 dispatched (architecture alignment → `drift`; codebase scan → `not-started`), both returned
- **Tracker:** GitHub issue #317 created and linked during this review
