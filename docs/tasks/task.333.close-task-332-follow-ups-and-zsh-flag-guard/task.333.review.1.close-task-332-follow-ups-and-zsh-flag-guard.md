# Task Review Report: Task 333 - Close task 332's follow-ups and guard the zsh flag trap

**Reviewed:** 2026-11-28
**reviewed_blob:** ad5f7907606920aabe9efde505e055844e2571e1
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 recommendations implemented — 2026-11-28

---

## Executive Summary

Every line citation in the task resolves, its measured population reproduces exactly, and each
invariant it rests on held when run. Two success criteria named no place for their evidence; both now
do. No critical issues.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 (autonomous `/develop-task` Step 2 run; no question needed an answer the
code could not give)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside `/develop-task` (invoked by `/develop-next`, item T333) with `--defaults`. Output format,
Step 8.5 and Step 9 were auto-answered per the pipeline defaults: comprehensive report; apply all
critical and important fixes; fixes complete. No clarifying question was raised: every ambiguity
found was settled by reading the code.

**Pre-pass:** Agents B and C were **not dispatched**. Both passes were done inline in this session:
the architecture-axes source is `architecture` (10 axes, `prepass-axes.js`), and the codebase check
confirmed none of the task is already implemented (no guard file, no `traps.md` entry, no
`AC_YAML_VERIFIED`, no `opts.answer`). Independence loss: the same reader did the review and both
pre-passes.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven numbered sections, Change Log, Progress Tracking and References are present. YAML
frontmatter carries `type: task`, `description`, `tags`, `github_issue: 965` (issue OPEN) and
`estimated_effort_hours: 8`. The body link `[#965](…/issues/965)` matches frontmatter. No
placeholders. Sign-off is not enabled in `skills-config.yaml`, so it is not checked.

Card preflight: exit 0 — Summary, Success Criteria and Breaking Changes all resolve (3, 6 and 1
items behind `+N more`). `doc-links.js`: 1 relative link, resolves.

Change Log (check 4b): present and current after this review's two rows.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Verified against the tree on `feature/task.333…` at `73a985278`:

| Claim | Evidence |
| --- | --- |
| Live sites `review-story/SKILL.md:2398`, `:2483` | `grep -n 'PIN_BRANCH:+'` → exactly those two lines |
| Population 233 files / 804 blocks; flag key 4 hits (2 comments, 2 live); wide key 9 hits | Re-measured with `extractBlocks` over `git ls-files 'skills/*/SKILL.md' 'shared/resources/*.md'` minus `/references/`: 233, 804, 4 (step-8 and finalise comment lines; the two review-story lines), 9 |
| Re-run-at-head files at `finalise/SKILL.md:600-605`, `:641` | `grep -n finalise-rerun-at-head-` → 600, 601, 605, 641 and nothing else |
| `readAnswer` `:729`, `parseYamlSubset` call `:732`, `sameDocument` `:767`, `merge` `:786-787`, CLI `:1265` | all confirmed |
| `finalise-dod-ac-prompt.md:153` over-claims | line 153 reads "refuses an answer that leaves it out or spells it any other way"; `sameDocument` accepts `path.resolve` equality and `realpathSync` equality |
| CI runs the zsh case | `.github/workflows/test.yml` installs zsh (obs #279 does not apply) |
| Out-of-scope `finalise-ci-poll.sh:121` | `${BB_DESTINATION:+--destination …}` at line 121, under a bash shebang |

**Invariants run (check 11):**

- `zsh -c 'X=v; set -- ${X:+--flag "$X"}; echo $#'` → `1`; the array form under bash and zsh → `2`, `2`.
- Flag key `/\$\{[A-Za-z_][A-Za-z0-9_]*:\+["']?-/`: matches `${X:+--f "$X"}` and `${X:+"-f" "$X"}`;
  does not match `"${X:+ (eq ${X})}"` or `${X:+, ${X}}` — exactly Test D's calibration.
- The plan's parse-count mechanism: a `--require` preload that wraps `yaml-subset.js`'s export reaches
  the instance `finalise-rerun-scope.js` destructures at load (`COUNT=1` on one call). The fallback in
  the plan is not needed.

**Outcome reachability (check 10):** `verified` is written by the CLI as
`opts.sha256 !== undefined` (`finalise-rerun-scope.js:1300`), so the hand-copy route (extract record
removed → `AC_SHA256` empty → no `--sha256`) records `false` and the extracted route records `true`.
Both stated outcomes are reachable.

**Check 13 (guard key):** the key is not shared with a correct site; the token-free restatement
(`${X:+$FLAG …}`) is named and bounded (§3, Out of Scope). **Check 15 (removed literals):** searched
the test tree for `hand-copied (unverified)`, `spells it any other way`, `PIN_BRANCH:+` and
`finalise-rerun-at-head-${DOD_N}` — 0 hits each; the one `leaves it out` hit is an unrelated comment.
Tests that name `finalise-dod-ac-prompt.md` were read for a pin on the `story_file` sentence — none.
**Check 18:** `shared/resources/tests/*.test.mjs` is in the test glob. **Check 28:** the plan removes
temp dirs in `finally`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with files, concrete changes and a mutation. The blocks test's `substitute()` already
fills `STEM="{…}"` lines, so the Step 3a rename is testable without helper changes, and the test runs
the re-run-at-head block in a scratch repository, so a file-existence assertion is non-vacuous.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

- **SC "`git grep … finalise-rerun-at-head-\${DOD_N}` matches nothing" is a negative-content
  criterion with no named test** (obs #7). Fixed: it now names the blocks test's run-number-keyed-path
  assertion and M5.
- **SC "`npm run test:remote` and `npm run bundle:check` pass" names no record location** (check 22).
  `test:remote` runs on the LAN server and leaves nothing a finalise agent can cite. Fixed: CI green on
  the PR head (which runs `bundle:check`), and the `test:remote` result recorded in the QA report.

#### Optional

- **M4's target** lives in the CLI, not in `merge()`. Fixed: the row names
  `finalise-rerun-scope.js:1300`.
- **Anchor drift:** `finalise/SKILL.md:1068` is the second line of the comment (`:1067-1068`); the
  array is `:1069`. The claim is true; not edited.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Low risk throughout; the one interface change (re-run-at-head file names) has a migration path and a
CHANGELOG commitment. Per-phase rollback is stated.

---

## Summary of Recommendations

### Should Fix (Important) - 2 issues — applied

1. Name the test that holds the stem-key criterion.
2. Put the `test:remote` evidence in the QA report; grade the rest on PR CI.

### Consider (Optional) - 2 items

1. Name M4's line — applied.
2. `:1068` anchor drift — left as is.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 10/10
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every claim checked against the code held; the two criterion gaps were one-clause
fixes and are applied.

---

## Review Metadata

- **Reviewer:** Claude (review-task, inside /develop-task Step 2)
- **Review Date:** 2026-11-28
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.333.close-task-332-follow-ups-and-zsh-flag-guard/task.333.close-task-332-follow-ups-and-zsh-flag-guard.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md (axes via prepass-axes.js)
