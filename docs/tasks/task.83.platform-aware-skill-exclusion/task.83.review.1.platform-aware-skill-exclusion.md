# Task Review Report: Task 83 — Platform-aware skill exclusion in setup-consumer.sh

**Reviewed:** 2026-09-04
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

---

## Executive Summary

Task 83 is a well-researched document: every line reference into `scripts/setup-consumer.sh` is accurate, both exclusion sets match the tree exactly, and the grandfather rule is correctly identified as the thing that makes the change safe. One Critical defect was found — **the resolver as specified can never return `github`, so the task's headline benefit does not fire on the `--update` path it was written to fix.** Four Important issues were found alongside it, three of them factual claims about this repository that no longer hold.

**Critical Issues:** 1 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked — run inside the `develop-task` pipeline (autonomous mode); all critical + important fixes applied automatically per Step 8.5 auto-answer.
**Implementation Readiness:** 9/10 (after fixes; 6/10 as authored)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No interactive questions were asked. This review ran inside the `develop-task` pipeline dispatched by
`/develop-next`, which auto-answers Step 8.5 with "apply all critical + important fixes". Each fix below
records the reasoning that would otherwise have been a question, and names the alternative a human may
prefer.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections are present (Overview, Motivation, Technical Background, Scope,
Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk
Assessment, Rollback Plan), plus Change Log, Progress Tracking, References and Notes. Filename
`task.83.platform-aware-skill-exclusion.md` follows the dotted convention. No placeholders (`TBD`,
`TODO`, `???`) anywhere in the document.

**OKF frontmatter**: `type: task` ✅ present and non-empty; `description` ✅ present; `tags` ✅ a YAML
list; `updated` ✅ present. Conformant.

**Change Log** (`change-log.enabled` defaults true): section present with the four canonical columns and
one row (`1.0 Initial draft`). Status is `planned` — it has **not** advanced past `planned`, so the
currency heuristic does not fire. Not stale.

**Stakeholder Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml`, so this check is
skipped entirely. Correctly absent from the document.

### Issues

#### Important
- **[Important] No tracker issue linked.** Frontmatter carries no `github_issue:`. 64 of this repo's 90
  task documents carry one, so this is a convention gap rather than a neutral choice. **Not auto-fixed:**
  creating a GitHub issue is an outward-facing side effect, and the review skill explicitly permits
  "Skip — leave unlinked" with the gap left standing. Run `/sync-github-task` on this file to link it.
  The pipeline handles the unlinked case correctly throughout — every tracker call is skipped when
  `TRACKER_ISSUE` is empty.

---

## 2. Technical Accuracy

**Status:** ACCURATE — every structural claim verified against the tree
**Hallucinations Detected:** 0

Verified line-by-line against `scripts/setup-consumer.sh` at `698af9d`:

| Claim in task | Verified |
|---|---|
| `install_skills()` at `:755` | ✅ exact |
| Call sites at `:1115` (`--update`) and `:1126` (wizard) | ✅ exact |
| `SETUP_CONSUMER_NO_MAIN=1` hook at `:1135` | ✅ `:1136` (guard); comment at `:1134` |
| `SKILLS_REPO` at `:729` | ✅ exact |
| Flag parser at `:41` | ✅ `--dry-run` / `--update` / `--help` at `:41-46` |
| `[[ -f "${_skill_dir}SKILL.md" ]] \|\| continue` is the only filter | ✅ exact |
| `select_platform` sets `TRACKER` at `:180-182` | ✅ exact |
| Jira-only set (11 skills) | ✅ exact — matches `ls skills/*jira*` |
| GitHub-only set (6 skills) | ✅ exact — matches `ls skills/*github*` |
| `vcs:` drives no exclusion (`create-pr` etc. branch internally) | ✅ correct |

### Issues

#### Critical

- **[Critical] `_resolve_install_tracker` can never return `github`, so the filter is inert for GitHub
  consumers on the `--update` path — the exact path §2 problem 4 exists to fix.**
  - **Location:** §3 "Target Architecture", resolution order steps 1–4; Phase 1 checkbox 2.
  - **Issue:** The order is `skills-config.yaml tracker:` → `$TRACKER` → `JIRA_URL` in `.env` → `""`.
    But `write_skills_config` (`setup-consumer.sh:470-473`) emits a `tracker:` key **only when
    `TRACKER == jira`** — GitHub is the implicit default and is written as nothing at all. So for a
    GitHub consumer: step 1 misses (no key), step 2 misses (`--update` never runs `select_platform`),
    step 3 misses (no `JIRA_URL`), and step 4 returns `""` → **excludes nothing**. The 11 Jira skills
    are never pruned. A GitHub consumer only ever gets the filter on a full wizard re-run.
  - **Evidence:** `grep -n "^tracker:" skills-config.yaml` in this repo returns nothing, and this repo is
    a GitHub consumer. `sed -n '470,473p' scripts/setup-consumer.sh` shows the `if [[ "$TRACKER" == "jira" ]]`
    guard around the whole `tracker_block`.
  - **Fix applied:** the resolution order now **mirrors `shared/resources/resolve-platform.sh`** — the
    canonical resolver every skill already uses at runtime — including its `github` default
    (`resolve-platform.sh:438`: `[ "$TRACKER" = "auto" ] && TRACKER=$([ -n "$JIRA_URL" ] && echo jira || echo github)`).
    A companion change makes `write_skills_config` write `tracker: github` explicitly, so a freshly
    generated config is self-describing rather than relying on a default.
  - **Why the default is safe, given §3 argued the opposite:** the task chose `"" → exclude nothing`
    because guessing wrong prunes needed skills. But the installer defaulting to `github` cannot
    disagree with runtime, because runtime defaults to `github` too — a repo where the installer would
    guess `github` is a repo where every Jira skill fails at runtime anyway. Divergence between install
    time and run time is the actual hazard, and mirroring one resolver removes it. Grandfathering and
    `--all-skills` remain the safety net.
  - **Alternative a human may prefer:** keep `"" → exclude nothing` and instead only fix
    `write_skills_config` to emit `tracker: github`. That is strictly safer but leaves every *existing*
    GitHub consumer unfiltered on `--update` until they regenerate their config — i.e. it does not
    actually close problem 4.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (now closed)

Four phases, each with files, checkboxes, risk level and explicit dependencies. Phase 2 correctly
carries the risk note about reaching the grandfather branch before any `rm -rf`.

### Issues

#### Important

- **[Important] Phase 3 tells the developer to make a change that must not be made: registering the new
  suite in `package.json`'s test glob.**
  - **Location:** Phase 3, final checkbox; §7 Files Summary item 3; §9 Code Quality criterion 2.
  - **Issue:** `package.json:26` already contains `'shared/resources/tests/*.test.mjs'` in the
    `node --test` glob list. A new `.test.mjs` file in that directory **is** picked up automatically. The
    hand-listed-globs hazard is real in this repo, but it applies to `skills/*/tests/`, which are
    enumerated one by one — not to `shared/resources/tests/`.
  - **Fix applied:** the checkbox now says to *verify* the existing glob picks the suite up (assert the
    reported test count rises), and `package.json` is moved out of the "Tests" files list into
    "Unchanged by design".

- **[Important] Phase 3 has no checkbox for the classification-parity test, which §10 Risk 3 calls
  mandatory.**
  - **Location:** Phase 3 checklist vs §10 MEDIUM RISK item 3.
  - **Issue:** Risk 3's mitigation is "a test asserting every `skills/*jira*` and `skills/*github*`
    directory appears in exactly one list… **This is the check that makes the list maintainable and must
    not be dropped for expedience.**" No Phase 3 checkbox implements it, so the one mitigation the
    document emphasises most is the one a developer working the checklist would skip.
  - **Fix applied:** added as an explicit Phase 3 checkbox and as a Code Quality success criterion.

- **[Important] The `--dry-run` parity requirement is not achievable as written.**
  - **Location:** Phase 2 final checkbox; §8 Integration flow 5; §9 Functional criterion 7.
  - **Issue:** "the dry-run branch must report the same counts it would write" cannot hold. The dry-run
    branch (`setup-consumer.sh:777-779`) returns after echoing and `record_step` — it never downloads or
    extracts the tarball, so it has no list of skills to count. Meeting the criterion literally would
    require dry-run to perform the download, which §9 Performance explicitly forbids ("Tarball download
    unchanged — one request, whole archive") and which would make a dry run hit the network.
  - **Fix applied:** relaxed to what is both achievable and useful — dry-run writes nothing and reports
    the **resolved tracker** and **which exclusion set would apply**, without per-skill counts.

- **[Important] Absolute skill counts are already stale and will rot again.**
  - **Location:** §1 Overview, §5 Breaking Changes table, §9 Functional criteria 1–4.
  - **Issue:** The document says 119 skills → 108 (GitHub) / 113 (Jira). The tree now holds **120**
    skills, so the correct numbers today are 109 and 114. Written as absolutes, every criterion becomes
    false the next time any skill is added — and a success criterion that fails for an unrelated reason
    is one a developer learns to ignore.
  - **Fix applied:** restated relatively — "all N installable skills minus the 11 Jira-only" — with
    today's numbers given parenthetically as illustration.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, Scope, Implementation Plan and Files Summary agree on what changes.
- Testing Strategy covers unit (both functions in isolation), integration (5 flows over a fixture
  tarball), regression (the two existing `setup-consumer-*.test.mjs` suites that source the script), and
  mutation-proving (4 named mutations, each mapped to the test it should turn red) — this satisfies the
  repo's mutation-proving standard.
- Success Criteria are measurable and map to the stated benefits.
- Scope is well bounded: 4 phases, one script, one new test file. Not oversized; no split warranted.
- The `vcs`-is-not-excluded reasoning (§3) is correct and worth keeping — it is the non-obvious part.

### Issues

#### Optional

- **[Optional] §3's Target Architecture sketch increments `_skipped` but never `_kept`,** while Phase 2
  asks for both counters. Cosmetic — the sketch is illustrative and Phase 2 is the specification. Left
  as-is; a developer reading both will not be misled.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk 1 (an `--update` prunes a needed skill) is correctly rated Critical-impact/Low-probability, with the
grandfather branch as mitigation, held by integration case 3, and mutation-proven. Risk 2 (wrong resolver
on `--update`) named the exact failure this review found — a stale `JIRA_URL` — though it missed the
inverse case (nothing resolving at all), which was the Critical above. Risk 3's staleness mitigation was
the un-implemented checkbox now added. Rollback plan is realistic: immediate revert, a genuinely
one-line partial rollback, and a forward-fix path for misclassification, with correct triggers.

No changes required beyond the Risk 2 note now recording the resolved-to-nothing case.

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. ✅ **Fixed** — resolution order rewritten to mirror `resolve-platform.sh` (config → `$TRACKER` →
   `JIRA_URL` → default `github`), plus `write_skills_config` emitting `tracker: github`.

### Should Fix (Important) — 5

1. ✅ **Fixed** — `package.json` glob claim corrected; suite registration replaced with verification.
2. ✅ **Fixed** — classification-parity test added to Phase 3 and to Success Criteria.
3. ✅ **Fixed** — `--dry-run` criterion relaxed to an achievable one.
4. ✅ **Fixed** — absolute skill counts restated relatively.
5. ⏭ **Skipped — requires your input** — no `github_issue` linkage; run `/sync-github-task` to link.

### Consider (Optional) — 1

1. §3 sketch omits `_kept`. Cosmetic; not changed.

---

## Implementation Readiness Assessment

**Score:** 9/10 (as authored: 6/10)

**Scoring Breakdown:**

- Template Compliance: 9/10 (one Important: no tracker linkage)
- Technical Accuracy: 10/10 (every line reference verified; zero hallucinations)
- Implementation Clarity: 9/10 (after the three Phase 2/3 corrections)
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — the Critical defect was in the specification, not the
approach, and is fixed. The approach itself (filter at the copy step, grandfather before any delete,
mirror the canonical resolver) is sound and testable.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the four phases in order — Phase 2 is the one that can break an install; write the grandfather
   branch before the `rm -rf`, not after.
2. Run the regression suites (`setup-consumer-config`, `setup-consumer-credentials`) after touching
   `write_skills_config` — adding `tracker: github` changes its output and those suites assert on it.
3. Mutation-prove all four named mutations plus the parity test.
4. Refer to the rollback plan if the `--update` path misbehaves.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, inside `/develop-task` pipeline dispatched by `/develop-next`)
- **Review Date:** 2026-09-04
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md`
- **Sources Consulted:** `scripts/setup-consumer.sh`, `shared/resources/resolve-platform.sh`,
  `package.json`, `skills-config.yaml`, `docs/reference/configuration.md`,
  `docs/concepts/getting-started.md`, `skills/` tree
- **Tracker comment:** skipped — no `github_issue` in frontmatter
