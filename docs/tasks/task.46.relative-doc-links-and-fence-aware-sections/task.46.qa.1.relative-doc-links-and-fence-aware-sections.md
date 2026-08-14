# QA Report: Task 46 - Write relative document links, and stop a fenced `# ` truncating a Jira description

**Task**: [task.46.relative-doc-links-and-fence-aware-sections.md](./task.46.relative-doc-links-and-fence-aware-sections.md)
**Gate File**: [task.46.gate.1.relative-doc-links-and-fence-aware-sections.yml](./task.46.gate.1.relative-doc-links-and-fence-aware-sections.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-14
**Testing Completed**: 2026-08-14
**Gate Status**: CONCERNS

---

## Executive Summary

Both defects are fixed, fixed correctly, and covered by tests that assert the absence of the old
behaviour rather than only the presence of the new. No correctness bug was found in the
functional change. The gate is CONCERNS on two maintainability findings: 96% of the two largest
script diffs is an undeclared Prettier reformat that buries the 62 functional lines inside it,
and an inline copy of the defective extraction regex survives unfixed in `jira-epic-creator`
under a comment instructing maintainers to keep it in step with the canonical one.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — neither finding affects runtime behaviour

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation steps completed (8/8 in Progress Tracking)
- [x] Tests passing — 1,242
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#215 → `develop`)

### Testing Approach

- [x] Automated Testing (unit + corpus integration)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review (diff, Step 3b)
- [ ] Manual Testing — no live Jira sync executed; see Limitations
- [ ] Performance Testing — not applicable, see NFR

### Review Methodology

**Direct tools, no subagents.** Permitted by the Adaptive Review Strategy ("Default: direct tools
first; spawn agents if gaps found") and required by a session-level directive against dispatching
subagents. No gaps emerged that direct tools could not close.

**Diff normalisation.** Rather than read a 4,920-line raw diff, both sides of each changed script
were normalised with `prettier@3 --parser babel` and re-diffed. This isolated the functional
change to 256 lines across four files and made a complete line-by-line review practical. The
technique is also what produced finding TASK-46-BUG-1 — the normalisation was the measurement.

### Limitations of this review — read before weighing the gate

- **This is a self-review.** The reviewer authored commits `276d276` and `5542f88` and part of
  `08c917b` in the same session. Independent review is worth more than this report is; the
  findings below were reached by adversarially re-deriving the diff from the repository rather
  than from memory, but that is mitigation, not substitution.
- **No live Jira sync was performed.** Every assertion about what Jira receives comes from
  `resolveRelativeLink` unit tests, not from a rendered card. The one thing tests cannot prove is
  that a real Jira description still shows a working document link.
- **Steps 1–4 of the pipeline did not run as pipeline steps** (see the Provenance section of the
  implementation report). In particular `review-task` never ran, so this QA pass is the first
  independent gate the task has faced.

---

## Implementation Verification

Verified against `git diff origin/develop...HEAD`, with formatting normalised out.

| Step | Status | Test Result | Notes |
| ---- | ------ | ----------- | ----- |
| 1. `toRelativeDocLink` | PASS | Verified | POSIX separators, always `./`-prefixed; 4 unit tests |
| 2. `makeFenceTracker` + `extractSection`, wired into `extractBodySections` | PASS | Verified | `extractBodySections` routes through it at `jira-sync.js:781`; 18 unit tests |
| 3. `extractStoriesTable` uses `extractSection` | PASS | Verified | `sync-jira-epic.js:119`; null-vs-empty handling preserved |
| 4. Stop writing the four `*_bitbucket_url` keys | PASS | Verified | All three scripts; remaining occurrences are `--json` output and read-side fallbacks only |
| 5. Relative body links; `epicFilePath` / `prdFilePath` hoisted | PASS | Verified | Both hoisted outside the `bbBase` guard and threaded into the write-backs |
| 6. Authored `**Parent PRD**` link preferred | PASS | Verified | `sync-jira-epic.js:493-509`; both directions tested |
| 7. Write-back functions exported | PASS | Verified | All three, each with its own suite |
| 8. Tests, `npm run bundle`, full suite | PASS | Verified | 1,242 green; bundle produced no drift |

**Overall Step Completion**: 8/8 passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| No sync script writes the four `*_bitbucket_url` keys | 0 writes | 0 — only `--json` payloads and reads remain | PASS |
| Every read of those keys still works | Unchanged | `sync-jira-epic.js:787`, `sync-jira-story.js:748` untouched | PASS |
| Document links relative, written with no Bitbucket base | Always | Verified by test in all three suites | PASS |
| A synced document contains no `bitbucket.org/…/src/…` URL | 0 | Asserted per script | PASS |
| No script *instructs* the author to hand-write one | 0 | Story reminder rewritten to point at `epic_source` | PASS |
| Jira still receives absolute URLs | Unchanged | `resolveRelativeLink` round-trip asserted in all three suites | PASS |
| A `# ` inside a fence no longer ends a section | Fixed | 3 direct tests + corpus test | PASS |
| ` ```` ` does not invert fence parity — task.42 passes preflight | Pass | Corpus test `H: every real task card passes preflight` enumerates every `docs/tasks/task.N.name/task.N.name.md`, task.42 and task.46 included | PASS |
| Write-back functions exported **and covered** — all three | 3/3 | `updateTaskFile` 5 tests, `updateStoryFile` 9, `updateEpicFile` 11 | PASS |
| `npm run bundle` run; bundled copies match | In sync | Re-ran; no drift | PASS |
| `npm test` green — 1,242 tests | 1,242 | 1,242 pass / 0 fail | PASS |

**11/11 success criteria met.**

---

## Breaking Changes Validation

### Breaking Change: the four `*_bitbucket_url` frontmatter keys are no longer written

- Documented: **Yes** — task doc, CHANGELOG, and all three `SKILL.md` files
- Migration Path Provided: **Yes** — none needed; every read is retained, so a hand-set value
  keeps resolving. Stripping existing keys is explicitly left to consumers
- Migration Tested: **Yes** — "a hand-set `*_bitbucket_url` survives the write" asserted in the
  story and epic suites
- Consumer Code Updated: **N/A** — no consumer in this repo reads them

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: Undeclared Prettier reformat hides the functional change**

- **Severity**: MEDIUM · **Category**: Quality
- **Bug Report**: [task.46.bug.1.undeclared-reformat-hides-functional-change.md](./task.46.bug.1.undeclared-reformat-hides-functional-change.md)
- **Observation**: `sync-jira-task.js` changes 647 lines of which **27** are functional;
  `sync-jira-story.js` changes 788 of which **35** are. The repo has no `.prettierrc`, no
  `format` script, and no format step in `.githooks/pre-commit`, so the formatting is not repo
  policy and will churn again.
- **Impact**: A change touching every tracked document in every consumer repo is the one that
  most deserves a line-by-line read, and this diff makes that impractical. It also contradicts
  the card's own stated reason for leaving `dropHeadingLines` alone — "so this card's diff stays
  reviewable".
- **Recommendation**: Split the reformat into its own commit ahead of the functional one, or
  adopt Prettier as repo policy and declare the reformat in Scope.
- **Priority**: P2

**Issue: The fence-truncation defect survives in `jira-epic-creator`**

- **Severity**: MEDIUM · **Category**: Functional (pre-existing, undeclared)
- **Bug Report**: [task.46.bug.2.fence-defect-survives-in-jira-epic-creator.md](./task.46.bug.2.fence-defect-survives-in-jira-epic-creator.md)
- **Observation**: `skills/jira-epic-creator/scripts/jira-create-epic.js:120-122` keeps an inline
  copy of the pattern with the identical `(?=\n## |\n# |$)` lookahead, under a comment (109–119)
  instructing maintainers that it "must stay in step with the canonical one".
- **Impact**: Narrower than the original — the script cuts at the first `### Story N.M` and keeps
  only table rows, so exposure is a fenced `#` between heading and table. The durable cost is the
  stale instruction, which now tells a maintainer to reintroduce the old behaviour deliberately.
- **Recommendation**: Port the fix inline, or de-scope explicitly **and** correct the comment.
- **Priority**: P2

### LOW Severity Issues (3)

1. **The justification for keeping `sectionRe` exported is no longer true.** The comment at
   `jira-sync.js:916` says it is kept "because callers match it directly" — no non-test caller
   does. `extractBodySections` and `extractStoriesTable` were the last two, and both now route
   through `extractSection`. It is exported for tests only.
2. **Undocumented behaviour change in `sync-jira-epic`.** When `prd_source` does not resolve but
   a cached `prd_bitbucket_url` exists, the `**Parent PRD**` body line is now **omitted**;
   previously an absolute link was written. This is correct by design — writing the cached
   absolute URL back is the defect — and the Jira card still receives the link, but it is not
   called out in the task doc or CHANGELOG.
3. **`toRelativeDocLink`'s `if (!rel)` branch is effectively unreachable.**
   `path.relative(path.dirname(f), f)` returns the basename, never `""`. Harmless; the self-link
   test passes through the `rel.startsWith(".")` branch instead.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS

`extractSection` replaces one regex match with a single line-walk per section: O(n) in body
length, run a handful of times per sync, against an operation bounded by network round-trips to
Jira. No measurable change and no hot path involved. No performance criteria were declared.

### Reliability — PASS

The rollback plan is accurate and was verified against the change: one revertible commit plus
`npm run bundle`, no state, no migration, no deployed artifact. Documents already written with
relative links survive a revert, because the old code replaces that line rather than requiring
the absolute form. Error paths are unchanged, including `updateEpicFile`'s swallow-and-warn — now
covered by a test that passes an `output.err` which throws, so a write-back that never ran can no
longer masquerade as one that wrote nothing. One strict improvement: the body link is no longer
gated on a Bitbucket URL resolving, so repos with no Bitbucket remote now get a document link.

### Security — PASS

No auth, credential, or crypto path touched; no new dependencies; every network call site
unchanged. The change removes URLs from written documents rather than adding any.

### Maintainability — CONCERNS

Both MEDIUM findings land here. Against them: write-back coverage went from **zero** to three
suites totalling 25 tests, the fence-parity trap is pinned by four unit tests plus a corpus test
over every task card, and each new function carries a comment naming the failure it prevents and
the evidence for it. The debt is in what was left around the change, not in the change.

---

## Code Review

Step 3b, `code_review_blocking=true` (pipeline override; no frontmatter opt-out present). Diff
scoped to `origin/develop...HEAD` and normalised with prettier before reading, so the review
covered the true 256-line functional delta rather than 4,920 raw lines.

**Correctness bugs (0):**

None. Specific traps checked and cleared:

- `### ` sub-headings do not terminate a section — `"### Foo".startsWith("## ")` is false because
  index 2 is `#`, not a space. Pinned by a test.
- Fence tracker follows CommonMark on all three rules: backtick info strings may not contain a
  backtick (so ` ```` ``` ```` ` is an inline span, not an opening fence), a close needs the same
  character with a run at least as long, and a close takes no info string. Tilde and backtick
  fences do not close each other. All four pinned.
- `extractBodySections` semantics are byte-equivalent across the swap: `m[1].trim()` truthiness
  became `content && content.trim()`, so empty and absent still behave as before.
- Unterminated fence runs to end-of-body rather than throwing — matches renderer behaviour, and
  is tested.
- Windows separators handled in `toRelativeDocLink`.

**Cleanups (3):** the three LOW issues above — the stale `sectionRe` justification, the
undocumented `**Parent PRD**` omission, and the unreachable `!rel` branch.

**Gate promotion:** none. `CR_BLOCKING` resolved to `true`, but no finding is
`category: bug` + `confidence: high`, so nothing was appended to `top_issues[]` from the code
review. The two `top_issues` entries are QA findings, not promotions.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Full suite (1,242 tests across 12 skills + shared + evals) | PASS — 0 failures |
| Corpus preflight over every real task/story/epic card | PASS — includes task.42 (the parity trap) and task.46 |
| Bundled `references/jira-sync.js` across 12 skills | PASS — `npm run bundle` reports every skill in sync, no drift |
| Read paths for the four frontmatter keys | PASS — both fallbacks verified present and unmodified |
| Jira ADF render path (`resolveRelativeLink`) | PASS — round-trip asserted in all three write-back suites |

No regressions detected.

---

## Test Artifacts

### Files Reviewed

- `shared/resources/jira-sync.js` — `toRelativeDocLink`, `makeFenceTracker`, `extractSection`, `extractBodySections`, exports
- `skills/sync-jira-{task,story,epic}/scripts/*.js` — write-backs, path hoists, Story reminder
- `skills/sync-jira-{task,story,epic}/tests/relative-doc-links.test.js` — 25 tests
- `shared/resources/tests/jira-sync-fenced-sections.test.mjs` — 22 tests
- `skills/jira-epic-creator/scripts/jira-create-epic.js` — finding TASK-46-BUG-2

### Test Commands Executed

```bash
npm test                                  # 1,242 pass / 0 fail
npm run bundle && git status --porcelain  # no drift
npx prettier@3 --write <base|head copies> # diff normalisation for the code review
```

### Coverage Report

No coverage instrumentation is configured in this repo (`npm test` is `node --test` over glob
lists). Coverage is therefore assessed structurally: the three write-back functions went from
**0** tests to **25**, and `extractSection` from 0 to 22.

---

## Recommendations

### Immediate Actions (Blocking)

None. Neither MEDIUM finding affects runtime behaviour.

### Short-term Actions (Non-Blocking)

1. Split or declare the Prettier reformat (TASK-46-BUG-1); add a `.prettierrc` + `format` script
   if it is to be repo policy.
2. Fix or explicitly de-scope the `jira-epic-creator` regex copy, correcting its comment either
   way (TASK-46-BUG-2).
3. Correct the `sectionRe` justification comment.
4. Record the `**Parent PRD**` omission behaviour change in the CHANGELOG.
5. Close the remaining naive `RE_FENCE` users (`dropHeadingLines` / `firstTableIn`) — already
   declared out of scope here, worth a follow-up card.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: All 11 success criteria met, 8/8 implementation steps verified, no correctness
bugs, no regressions. Gated on two MEDIUM maintainability findings — an undeclared reformat that
makes the functional change unreviewable, and a known defect left in a sibling code path under a
comment that now misleads. Maintainability CONCERNS independently sets this gate under rule 4.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: Merging as-is is defensible — neither finding changes behaviour. The conditions
are that TASK-46-BUG-2 is fixed or explicitly de-scoped before its stale comment misleads
someone, and that the reformat decision is recorded rather than left implicit.

---

**QA Report**: `task.46.qa.1.relative-doc-links-and-fence-aware-sections.md`
**Gate File**: `task.46.gate.1.relative-doc-links-and-fence-aware-sections.yml`
**Next Steps**: qa-fix cycle 1 against the gate file, then re-review.
