# Task Review Report: Task 240 - Fail-closed reader for the 5c open-coverage check

**Reviewed:** 2026-10-28
**reviewed_blob:** e488d46fa8cb764fd99d255a9106a6648690b115
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 important recommendations implemented — 2026-10-28

---

## Executive Summary

The task is well-scoped and its anchors, test counts and extractor claim all hold against the tree.
The one real gap is the plan's parser rule list: read literally, it refuses or miscounts six shapes
that `pr-review-loop-parity.test.mjs` already pins to other values, so SC-2 could not pass as written.
Each fix is fixed by an existing expectation, so no question needed a human.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous run via `/develop-next`; every finding is resolved by an expectation the parity suite already pins)
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions were asked. The run is autonomous (`/develop-task --defaults` from `/develop-next`), and
each finding below has one correct answer: the value the parity suite already pins, which SC-2 says
must not change. The task's one open decision ("a dedicated reader, not a `strict` mode in
`yaml-subset.js`", marked *author confirm*) is accepted as written: it is argued in the task, and
pre-pass B found no architecture conflict with it.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; Progress Tracking and References present.
- Frontmatter: `type: task`, `description`, `tags`, `github_issue: 771` present (OKF conformant).
- Body link `[#771](https://github.com/Gamaroff/agent-skills/issues/771)` matches `github_issue`.
- Card preflight (`sync-jira-task.js --check-card`): no problems; 3 card blocks resolve.
- Change Log present (`change-log.enforcement` default `advisory`); sign-off not configured — not checked.
- `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (no hallucinations)
**Hallucinations Detected:** 0

Verified:

- Anchors at `ded46852` and on `develop` (task.238 merged, PR #770 `MERGED`):
  `develop-pipeline-step-5-6-qa-loop.md:1529` (`REVIEW=`), `:1556` (`OPEN_COVERAGE=$(`), `:1593`
  (the `case` guard), `:1594` (`echo`). All resolve.
- `pr-review-current.js:59` holds the extractor regex, `:62` reads `reviewed_gate`; only `select`
  and `reviewedGateNumber` are exported today (pre-pass C).
- `yaml-subset.js:72` documents the `if (!m) continue` skip, `:151` is `module.exports`.
- Parity test anchors `:837`, `:839`, `:874`, `:941`, `:1109`, `:1157` resolve.
  `command node --test evals/shared/tests/pr-review-loop-parity.test.mjs` → 82 tests, 82 pass.
- **The shared extractor reads the whole corpus (check 11, run, not reasoned).** Over
  `git ls-files '*pr-review.*.md'` (187 files): 168 match the
  `/^## Machine-Readable Findings\s*\n+```yaml\n([\s\S]*?)^```/m` regex, 19 have no heading, 0 have
  a heading the regex misses. Top-level keys in the 168 blocks: `findings,truncated_count` (93) and
  `reviewed_gate,findings,truncated_count` (75) — nothing else.
- The old block over the same 187 files: `0` ×128, `1` ×35, `2` ×5, `unreadable` ×19 (all 19 are
  the no-heading reports).
- Field names (check 21): review-pr `SKILL.md:787` emits
  `category: {coverage|scope|trail|consistency …, bug|cleanup …}`; `:692` defines
  `provenance: pre-existing`. The six-token allow-list matches the producer.
- Test reach (check 18): `package.json` `test:suite` globs `shared/resources/tests/*.test.mjs`.
- Removed literal (check 15): `awk` is pinned only by the failing-awk test (`:1131`–`:1145`), which
  the plan converts. `develop-pipeline-on-stop.test.sh:353` pins the prose "§5c's OPEN_COVERAGE
  check", which this task does not change.

### Important

Check 10 (outcome reachability): the plan's parser rules, walked over the pinned `RAW_CASES`, return
a different value from the one SC-2 requires for these shapes.

- **I-1 — A capitalised category.** `RAW_CASES` "a capitalised value" (`category: Coverage`) pins
  `1`. The plan counts `category === "coverage"` and refuses a value outside the six tokens, so it
  returns `unreadable`. The old reader lower-cases the line first. **Fix:** compare category and
  provenance values case-blind.
- **I-2 — List items at column 0.** "list items at column 0" pins `1`. The plan's rule "a column-0
  line that is not a top-level key is a refusal" refuses `- id: PC-1`. **Fix:** a column-0 line is a
  top-level key, the closing fence, or a `- ` entry of a list that sits at column 0; anything else is
  a refusal.
- **I-3 — Nested values and comment lines.** "a nested list inside an entry does not split it"
  pins `1` (`evidence:` followed by deeper `- a.md` lines) and "a commented-out category is not one"
  pins `0` (an indented `# category: coverage` line). The plan accepts only scalar and block-scalar
  values and says nothing of comment lines, so both read `unreadable`. **Fix:** blank lines and
  indented full-line comments are skipped; a key with an empty value may be followed by strictly
  deeper lines, which are text — except under `category:` and `provenance:`, where any deeper line is
  a refusal (the pinned "a provenance value continued on a deeper line" and "a block-scalar
  category"). A column-0 `#` line stays a refusal, which keeps "a findings list cut short by a
  column-0 heading line" at `unreadable` now that the extractor no longer stops at `## `.
- **I-4 — An entry with no category.** "an entry with no recognised category" (`categry:`) pins
  `unreadable` (task.238 bug.8). The plan's reason list has no refusal for it, so the entry reads as
  a non-coverage finding and the case returns `1`. **Fix:** add `no-category` to the reason list.
- **I-5 — Escaped quotes.** Four tracked reports (task.115 pr-review.2, task.124 pr-review.1,
  task.130 pr-review.1, task.179 pr-review.1) hold `\"` inside a double-quoted block-style `finding:` value,
  and the old reader reads all four. "a flow entry the reader cannot tokenise" pins `unreadable` for
  the same escape inside a flow entry. The plan accepts "double-quoted" scalars without saying which.
  **Fix:** a double-quoted block-style value accepts the `\"` and `\\` escapes; inside a flow entry
  an escaped quote is a refusal (`bad-value`).

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are concrete, ordered and name their files. Two gaps in detail:

### Optional

- **O-1 — The harness's cwd.** The plan notes the gitignored `.agents/skills` symlink. State the
  mechanism: the harness substitutes `{develop-story|develop-task}` and runs the block from a temp
  cwd whose `.agents/skills/develop-task` links to the tracked `skills/develop-task`, and the check
  is run once with the local symlink moved aside.
- **O-2 — An unknown top-level key is now a refusal.** The old reader treated a later column-0 key as
  the list's terminator and ignored any key before `findings:`. No tracked report has another
  top-level key (measured above), so SC-4 is unaffected; the change is deliberate fail-closed
  behaviour and should be named as such in the plan.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I-6 — SC-5 has no planned test.** "no new process beyond one `node` call at 5c" is a bound a
  per-PR test can assert, so finalise reads it as a behaviour criterion and fails it without one.
  **Fix:** a parity test asserts the §5c block holds exactly one `command node` call and no `awk`.

### Optional

- **O-3 — "All 184 tracked reports".** The Overview states a count; `git ls-files
  '*pr-review.*.md' | wc -l` reads 187 today. SC-4 already states the definition ("every tracked
  `*.pr-review.*.md`"), so drop the number from the Overview (obs #117).

SC-2's zsh arm is CI-held: `.github/workflows/test.yml` installs zsh for exactly this harness.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The reader is a refuse-by-default guard rewritten, so its differential oracle matters (obs #269).
The plan has both halves: the refusal fixtures pin base's values on head, and SC-4 diffs head against
base over every tracked report. Rollback is a one-commit revert of the call site.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 6 issues

1. I-1 case-blind category and provenance values.
2. I-2 column-0 list entries allowed; column-0 rule restated.
3. I-3 blank and indented comment lines skipped; nested values under a non-category key accepted.
4. I-4 `no-category` refusal added to the reason list.
5. I-5 escapes accepted in block-style double-quoted values, refused in flow entries.
6. I-6 SC-5 held by a parity assertion.

### Consider (Optional) - 3 items

1. O-1 harness cwd mechanism.
2. O-2 name the unknown-top-level-key refusal as deliberate.
3. O-3 drop the "184" count from the Overview.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (six parser-rule outcomes unreachable as written)
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High (after fixes)

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues, every anchor and figure the plan rests on was measured, and
the six important findings are corrections to the parser's rule list whose right answers are already
pinned by the suite the task must keep green.

---

## Pre-pass Summaries

- **PREPASS_B (architecture):** `alignment: aligned`; axes checked: What this repo produces, File
  naming, Cross-skill resources, Validation before commit, Do not (`prepass-axes.js` source:
  `architecture`). Low-severity notes only: no new dependency; `.test.mjs` under
  `shared/resources/tests/` follows that directory's existing convention.
- **PREPASS_C (codebase):** `implementation_status: not-implemented` — no `open-coverage.js`, no unit
  test file, the awk block still at `:1556`, the extractor not yet exported.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Follow the implementation plan phase by phase, with the corrected parser rules.
2. Keep all 82 parity cases green under bash and zsh.
3. Record the corpus-diff command and distribution in the implementation report.

---

## Review Metadata

- **Reviewer:** Claude (review-task, invoked by develop-task Step 2 under develop-next)
- **Review Date:** 2026-10-28
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.240.open-coverage-fail-closed-reader/task.240.open-coverage-fail-closed-reader.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (pre-pass B)
- **Measurement scratch:** `.claude/state/t240-rv/` (old-block extraction, corpus distribution)
