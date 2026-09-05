# Task Review Report: Task 92 — Add a shellcheck CI lane for the repo's shell scripts

**Reviewed:** 2026-09-05
**Review Depth:** Standard
**Task Status:** `planned` → `ready-for-development`
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-09-05

---

## Executive Summary

Task 92 is an unusually well-prepared document: its measured baseline **reproduces exactly** on
today's tree against shellcheck 0.11.0 (247 tracked `.sh`, 56 sources, 0/26/79/81 findings, 14 files
at `warning`), and its scoping decision — lint sources, not the 191 bundled copies — is correct and
well argued. The review found no hallucinated technology, no wrong file paths, and no invented
tooling.

What it did find is that the task's **single most consequential recommendation is wrong**: the
proposed home, `.github/workflows/validate.yml`, is path-filtered in a way that excludes three of the
56 source scripts — including `scripts/setup-consumer.sh`, the exact file whose unverifiable
shellcheck criterion in task 83 caused this task to be written. A lane placed there would not have
fired for the change that motivated it, and would satisfy §9's "green on the current tree" while
being structurally unable to fail. Four smaller technical corrections follow from verifying the
triage table against the actual tool output.

**Critical Issues:** 1 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 asked — autonomous pipeline run; every question resolved from the task
document, the co-located plan, and the codebase, with assumptions stated inline below.
**Implementation Readiness:** 8/10
**Recommendation:** ✅ READY TO IMPLEMENT (after the fixes applied in this pass)

---

## User Decisions & Clarifications

This review ran inside an autonomous `/develop-task` pipeline (dispatched by `/develop-next` for
roadmap item **T92**). Per the run directive, no interactive questions were asked; each would-be
question was resolved from evidence and the assumption recorded here.

### Question Point 1: Structure & Scope

**Q1: The task has no `github_issue`. Create and link one?**

- **Resolution**: Yes — created **[#321](https://github.com/Gamaroff/agent-skills/issues/321)**,
  added to the "Agent Skills" board, priority P2, milestone "Technical Tasks (standalone)".
  Dedup search for `in:title "[Task 92]"` returned zero matches first.
- **Assumption**: matches house practice — the immediately preceding task (task.91) carried
  `github_issue: 319`, and the pipeline's Steps 2/4/5/7 all post to a tracker issue.
- **Impact**: the rest of the pipeline can comment and move the board.

### Question Point 2: Technical & Implementation

**Q2: `validate.yml` or a separate workflow?** (§6 Phase 1 leaves this open and recommends
`validate.yml`.)

- **Resolution**: **a separate one-job `shellcheck.yml`**, triggers mirroring `test.yml`.
- **Assumption/evidence**: `validate.yml`'s path filter excludes `scripts/**` and
  `.agents/scripts/**`; `test.yml` is unfiltered but is guarded by `ci-gate-parity.test.mjs`.
  See Critical #1 and Important #1.
- **Impact**: rewrote §6 Phase 1's "Where it runs" bullet; added §10 risk #2.

**Q3: For SC2034, `export` the variable or disable with a reason?** (§6 Phase 2 prefers `export`.)

- **Resolution**: **disable with a reason** for `BB_CURL_AUTH`; `export` stays available for scalars.
- **Assumption/evidence**: `BB_CURL_AUTH` is a bash **array** (`bitbucket-auth.sh:76`), and bash
  cannot export arrays — the "fix" would be a no-op. See Important #3.
- **Impact**: rewrote the §6 Phase 2 bullet.

### Question Point 3: Completeness & Safety

**Q4: Is any of this already implemented?**

- **Resolution**: **No.** `git grep -i shellcheck -- .github/` returns zero hits; no npm script, git
  hook or pre-commit hook runs any shell linter. Seven pre-existing inline `# shellcheck` directives
  exist in source scripts, none of them added by this task.
- **Impact**: no scope reduction; the task stands as written.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections present (Overview → Rollback Plan), plus Change Log, Progress
Tracking, References and Notes. Filename `task.92.shellcheck-ci-lane.md` follows the DOTS/hyphen
convention. No placeholders (`[TBD]`, `[TODO]`, `???`) anywhere in the document.

**OKF frontmatter**: `type: task` present and non-empty ✅; `description` present ✅; `tags` is a
YAML list ✅; `updated` present ✅. Conformant.

**Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, as
specified. Not a finding.

**Change Log**: present with the four canonical columns and a `1.0` row; enforcement defaults to
`advisory`. Currency satisfied — a `1.1` verdict row and a status-transition row were appended by
this review.

### Issues

#### Important

- **Tracker linkage missing** — frontmatter had no `github_issue`. **Fixed**: issue #321 created and
  linked, body cross-reference added.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

The document's central factual claims were re-verified by running the tool, not by reading about it.

| Claim (§3) | Verified 2026-09-05 | Verdict |
| --- | --- | --- |
| `git ls-files '*.sh'` = 247 | 247 | ✅ exact |
| sources after excluding `skills/*/references/` = 56 | 56 | ✅ exact |
| bundled copies = 191 | 191 | ✅ exact |
| `--severity=error` = 0 | 0 | ✅ exact |
| `--severity=warning` = 26, 14 files | 26, 14 files | ✅ exact |
| `--severity=info` = 79 | 79 | ✅ exact |
| `--severity=style` = 81, 27 files | 81, 27 files | ✅ exact |

Tool: `koalaman/shellcheck:stable`, version **0.11.0**. This is the strongest part of the document —
§11's "re-measure at implementation time" instruction was followed and the snapshot held.

### Issues

#### Important

- **SC2034 attribution is inverted for the `JSM_DEFER_*` family.** §3 said the family is
  `jira-sprint-lib.sh`'s output contract. In fact `jira-sprint-lib.sh:195-198` **reads**
  `JSM_DEFER_KIND`/`INTENT`/`TARGET`/`DESIRED`; the **writers** — and therefore the sites where
  SC2034 actually fires, 4 findings each — are
  `skills/jira-sprint-manager/scripts/manage-sprint-state.sh:45-48` and `move-sprint-issues.sh:49-52`.
  An annotation placed in the library per the plan would silence nothing and the lane would stay red.
  The genuine in-library pair is `JSM_DEFERRED`/`JSM_DEFERRED_RECORD` (`jira-sprint-lib.sh:224-225,
  239-240`).
  **Fixed**: attribution corrected in §3 with a verified note; §6 Phase 2 now says "annotate at the
  writing site".

- **`export` cannot fix `BB_CURL_AUTH`.** §6 Phase 2 preferred `export` over a disable as "a real
  answer to *is this used elsewhere?*". `BB_CURL_AUTH` is a bash **array**
  (`bitbucket-auth.sh:76` — `BB_CURL_AUTH=(--user "…")`), and bash cannot export arrays: `export
  BB_CURL_AUTH` sets an attribute no child process ever observes. It would silence the warning while
  doing nothing, which is strictly worse than a disable that says why.
  **Fixed**: §6 Phase 2 now rules `export` out for this variable and keeps it for scalars.

#### Optional

- **Triage table arithmetic.** SC2034 is **15**, not 14 (verified by
  `grep -oE 'SC[0-9]+ \(warning\)' | sort | uniq -c`), and as written the table's counts summed to 25
  against a stated total of 26. **Fixed**: count corrected and the arithmetic made explicit.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

The co-located plan (`task.92.plan.shellcheck-ci-lane.md`) is genuinely good — it names files and
line numbers, gives the exact container invocation, and treats the Phase 3 deliberate-regression
proof as the point of Phase 3 rather than a formality. Phases are ordered with explicit dependencies
and honest risk levels. The gap is confined to one bullet, but it is the load-bearing one.

### Issues

#### Critical

- **🚨 The recommended CI home cannot see three of the files it is meant to gate.**
  §6 Phase 1 recommends `.github/workflows/validate.yml`, justifying a separate workflow only "if the
  container pull materially slows that job". That framing misses the actual blocker:
  `validate.yml` is **path-filtered on both triggers** to `skills/**`, `shared/resources/**`,
  `scripts/generate-skill-dependencies.mjs`, `docs/reference/skill-catalog.md` and its own file, with
  `push` further limited to `main`/`develop`.

  Three of the 56 source scripts sit outside every one of those filters, **and all three carry a
  warning-tier finding today**:

  | File | Warnings | In any `validate.yml` path? |
  | --- | --- | --- |
  | `scripts/setup-consumer.sh` | 1 | ❌ |
  | `scripts/release.sh` | 1 | ❌ |
  | `.agents/scripts/backfill-story-issues.sh` | 1 | ❌ |

  `setup-consumer.sh` is the script whose shellcheck criterion task 83 could not evaluate — the
  reason this task exists. A lane in `validate.yml` would not have fired for the change that
  motivated it, would report green, and would be structurally incapable of failing on those files.
  That is the precise failure shape §8 and `task.90` are written against: *a gate never observed
  failing is not known to be a gate*. It also makes §9's "on every push" criterion unachievable in
  that host.

  **Fixed**: §6 Phase 1's "Where it runs" bullet rewritten with the filter analysis and a concrete
  recommendation (separate unfiltered `shellcheck.yml`); §9's criterion made precise; §10 gained
  risk #2, including the requirement that the Phase 3 regression proof use a file **outside**
  `skills/**` and `shared/resources/**` — otherwise the proof does not exercise this risk.

#### Important

- **`test.yml` is closed off by an eval the task never mentions.** `test.yml` is the obvious
  alternative (no path filter), but `evals/shared/tests/ci-gate-parity.test.mjs` asserts **set
  equality in both directions** between the npm scripts run by `test.yml`'s `test` job and the
  `npm run ci` composite. A step added there turns that eval red unless a matching script joins
  `npm run ci` — which directly contradicts §9's "no change to local gate duration". Phase 1 would
  have discovered this by walking into it.
  **Fixed**: recorded by name in §6 Phase 1.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important

- **§7 "Unchanged by design" is wrong about the bundled copies.** Excluding
  `skills/*/references/*.sh` from *linting* is correct. Describing them as *unchanged* is not: 8 of
  the 14 files needing annotation live in `shared/resources/`, and `npm run bundle` fans those edits
  out to **139 bundled copies** (`read-config.sh` → 44, `bitbucket-auth.sh` → 38,
  `resolve-platform.sh` → 38, `set-github-project-priority.sh` → 9, `set-github-project-estimate.sh`
  → 4, `jira-sprint-lib.sh` → 3, `develop-pipeline-on-precompact.sh` → 3, `tracker-access.test.sh`
  → 0). `validate.yml`'s existing **Bundle freshness check** fails the PR if they are not
  regenerated and committed, so `npm run bundle` is mandatory in Phase 2 and the PR will be ~150
  changed files for ~25 hand-written comment lines.
  **Fixed**: §7 renamed to "Not linted, but regenerated" with the fan-out table; §10 gained risk #2b
  recommending the generated copies be committed separately from the annotations.

#### Optional

- **Documentation targets were left as "or".** §4 said "`docs/contributing/` or the relevant CI
  documentation". There is no CI page under `docs/contributing/`. The list of local pre-PR gates
  lives in **two** places that must stay in sync — `CONTRIBUTING.md` § "Before you open a PR" and
  `docs/architecture/concepts/coding-standards.md` § "Validation before commit" — and
  `docs/architecture/concepts/tech-stack.md` § "Infrastructure and CI" is already stale (it describes
  a single `validate.yml` that "runs `npm test` on every push to `main`", which matches neither
  workflow that exists).
  **Fixed**: §6 Phase 4 now pins all three targets and warns that `.github/workflows/README.md` is
  stale and not authoritative.

**Testing Strategy** (§8) is adequate and correctly identifies the mutation proof for a CI lane.
**Success Criteria** (§9) are measurable — the "lints 56 files not 247" count assertion is a good,
cheap check. **Scope** is well bounded at 4 phases; no splitting warranted.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE (improved)

The pre-existing risk section is above average — it correctly identifies the unpinned-linter version
bump as the main operational risk, suppression creep as the slow-decay risk, and the T91 file overlap
as a sequencing risk (which the roadmap's `touches:` annotations already enforce).

Two risks were missing and have been added: the path-filter risk (#2, MEDIUM) and the 150-file
generated diff (#2b, LOW). The **Rollback Plan** is sound and needs no change — deleting the job is a
complete rollback, and the annotations are inert comments that document real false positives whether
or not a lane reads them.

### Optional

- **Seven pre-existing `# shellcheck` directives carry no stated reason** (`jira-sprint-lib.sh:130`
  SC2034, `:323`/`:360` SC2064, `tracker-access.test.sh:1487` SC2086, plus three `source=`
  directives). §9's "Every `# shellcheck disable` carries a stated reason. No bare suppressions."
  reads as repo-wide, so implementation should either annotate these four disables too or scope the
  criterion to newly-added ones. Left to the implementer; not blocking.
- **A `.shellcheckrc` is not risk-free.** Setting `external-sources=true` changes the behaviour of
  the two existing `# shellcheck source=read-config.sh` directives and can surface new findings.
  Decide it deliberately in Phase 1 rather than reaching for it as cleanup.

---

## Summary of Recommendations

### Must Fix (Critical) — 1 issue

1. **Do not host the lane in `validate.yml`.** Its path filter excludes `scripts/**` and
   `.agents/scripts/**`, so the lane would never fire for `setup-consumer.sh` — the file that
   motivated the task. Use a separate unfiltered workflow. ✅ *Applied to §6 Phase 1, §9, §10.*

### Should Fix (Important) — 4 issues

1. **Record the `ci-gate-parity.test.mjs` constraint** so Phase 1 does not choose `test.yml` and
   discover it as a red eval. ✅ *Applied to §6 Phase 1.*
2. **Correct the `JSM_DEFER_*` SC2034 attribution** — annotate the writers, not the reader.
   ✅ *Applied to §3, §6 Phase 2.*
3. **Drop `export` as the preferred SC2034 answer for `BB_CURL_AUTH`** — bash cannot export arrays.
   ✅ *Applied to §6 Phase 2.*
4. **Correct §7** — bundled copies are not linted but **are** regenerated (139 of them).
   ✅ *Applied to §7, §10.*

### Consider (Optional) — 3 items

1. SC2034 count corrected 14 → 15; table arithmetic made explicit. ✅ *Applied to §3.*
2. Documentation targets pinned to `CONTRIBUTING.md`, `coding-standards.md` and `tech-stack.md`.
   ✅ *Applied to §6 Phase 4.*
3. Pre-existing unreasoned directives and `.shellcheckrc` external-sources caveat — noted above,
   left to the implementer's judgement.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10 — every mandatory section, OKF-conformant, no placeholders
- Technical Accuracy: 7/10 — baseline reproduces exactly, but three verified errors in the triage
- Implementation Clarity: 8/10 — exceptional plan file; one load-bearing bullet was wrong
- Consistency: 7/10 — §9 "every push" contradicted §6's host; §7 contradicted the bundler
- Risk Management: 9/10 — strong section, two real risks missing

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issue remains open — the one Critical finding was a wrong
recommendation inside a decision the task had already scheduled for Phase 1, and it has been resolved
in the document with evidence. The measured baseline is verified rather than asserted, which is the
hardest part of this task to get right and the part most likely to have rotted.

---

## Next Steps

Task is ready for implementation. The implementer should:

1. **Phase 1** — record the gate at `--severity=warning` and the host as a new unfiltered
   `shellcheck.yml`; print the shellcheck version in the job.
2. **Phase 2** — annotate at the *writing* sites; run `npm run bundle` and commit the 139 generated
   copies as their own commit; resolve the single SC2010 at
   `shared/resources/tracker-access.test.sh:1486` (`ls | grep` → glob loop; trivial and self-contained).
3. **Phase 3** — prove the gate fires using a finding in a file **outside** `skills/**` and
   `shared/resources/**`, and record the failing run URL in the implementation report.
4. **Phase 4** — CHANGELOG `### Changed`, plus the three pinned doc targets.

---

## Review Metadata

- **Reviewer:** `/review-task` (autonomous, inside `/develop-task` Step 2/8 for roadmap item T92)
- **Review Date:** 2026-09-05
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.92.shellcheck-ci-lane/task.92.shellcheck-ci-lane.md`
- **Plan File:** `docs/tasks/task.92.plan.shellcheck-ci-lane.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`
- **Tooling Used:** `koalaman/shellcheck:stable` 0.11.0 via Docker (shellcheck is not installed on the
  dev host — the container form documented in task 83's DoD is the working reference)
- **Pre-pass Agents:** 2 (architecture alignment → `drift`; codebase scan → `not-implemented`)
