# Task Review Report: Task 194 - Code-review findings anchor to source lines

**Reviewed:** 2026-10-07
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 7 critical + important recommendations implemented — 2026-10-07

---

## Executive Summary

The task is well grounded: every cited line anchor resolves, the dispatcher list carries its grep and
re-measures to 4, and both new test files are reached by existing `npm test` globs. One plan claim is
false when run: the anchor regex parses a compound conformance `ref` as a file path. The `--inline`
filter as planned also cannot work, because the existing jq already uses the key `anchor` for the
`path:line`.

**Critical Issues:** 1 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (develop-task pipeline, Step 2: decisions taken autonomously and recorded below)
**Implementation Readiness:** 6/10 before fixes → 9/10 after fixes
**Recommendation:** REQUIRES REWORK before fixes (one Critical, per the scoring rule) → **READY TO IMPLEMENT** after the Step 8.5 fixes

---

## User Decisions & Clarifications

Run inside `/develop-task` Step 2. No question needed the user: each finding had one clearly better
fix. These are recorded as autonomous decisions.

- **D1 — How the `--inline` filter sees the verdict.** The CLI gains `--annotate <out-file>`, which
  writes the input JSON back with each finding carrying `anchor_check: <verdict>`. The `--inline` jq
  then filters on `.anchor_check`. The verdict key is `anchor_check` everywhere, including
  `/review-pr`'s machine-readable block, so it never collides with the jq's existing `anchor`
  (path:line) key. *Impact:* Phase 2 CLI, Phase 3 review-pr / review-code wiring, Target Architecture.
- **D2 — Compound `ref`.** A path never contains whitespace: the anchor regex becomes
  `^(\S+):(-?\d+)$`, so `"AC-3 / scripts/smoke/slugify.js:8"` is `no-line`, as the plan intended.
  *Impact:* Phase 2 code, a unit test.
- **D3 — Population key.** The population is every `skills/*/SKILL.md` that mentions
  `code-review-prompt.md` (the superset), with an explicit cite-only allowlist that is empty today and
  requires a reason per entry. *Impact:* Phase 4 test.
- **D4 — Which tree each caller checks.** `/review-pr`: `--rev origin/$HEAD_BRANCH`, or the PR head SHA
  on the API-diff route. `/qa-task`, `/qa-story`: `--rev HEAD` (their diff is `$BASE...HEAD`).
  `/review-code`: no `--rev` for a working-tree target; the PR head for a PR target. *Impact:* Phase 3.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References are present. No placeholders.
- OKF frontmatter: `type: task`, `description` and `tags` present.
- Change Log present (enforcement: advisory default). Sign-off not enabled in `skills-config.yaml`.
- GitHub issue #595 exists and is OPEN; the body link matches `github_issue: 595`.
- Card preflight: `No problems found. 3 card blocks resolve` (Breaking Changes: 2 omitted → `+N more`).
- `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Line anchors checked with `sed -n`: `code-review-prompt.md:28,113,122`, `pr-conformance-prompt.md:140`,
`review-pr/SKILL.md:571,600,835`, `review-code/SKILL.md:73,115`, `qa-task/SKILL.md:559,1311`,
`qa-story/SKILL.md:1026,1593`, `pr-inline-comment.js:704`, `develop-pipeline-step-5-6-qa-loop.md:222,270`,
`pr-review-loop-parity.test.mjs:1125-1142`. All resolve to what they name.

Pre-pass B (architecture, run inline): aligned. Axes from `prepass-axes.js` (`source: architecture`):
Node built-ins only, `command node`, engines in `shared/resources/` with `--json` `reason`, bundling via
`npm run bundle`. Pre-pass C (codebase, run inline): `not-implemented`. `finding-anchors.js`, `line_text`
and `anchor_check` do not exist in `shared/` or `skills/`.

### Critical (falsified invariant — check 11)

- **The anchor regex parses a compound `ref` as a file path.** The plan says
  `"AC-3 / scripts/smoke/slugify.js:8"` "does not match the anchored regex and becomes `no-line`".
  Run:
  `command node -e 'console.log(/^(.+?):(-?\d+)$/.exec("AC-3 / scripts/smoke/slugify.js:8").slice(1))'`
  → `[ 'AC-3 / scripts/smoke/slugify.js', '8' ]`. The finding becomes `no-such-file` and the CLI exits
  1 on output the conformance lens really emitted on PR #594.
  - **Fix (D2):** `^(\S+):(-?\d+)$`, plus a unit test pinning the compound `ref` to `no-line`.

### Important

- **The planned `--inline` filter can never match (check 10).** The plan adds
  `select(.anchor == "ok" or .anchor == "unchecked-text")` to the `--inline` jq. That jq reads
  `$FINDINGS_JSON`, which holds no verdicts (they are in `$ANCHORS_JSON`). It also already sets
  `. + {anchor: .file_line}` (`review-pr/SKILL.md:835`), so `.anchor` is a `path:line`, never a
  verdict. Every finding would be dropped from inline posting.
  - **Fix (D1):** `--annotate <out-file>` and the key `anchor_check`.
- **The tree each caller checks is specified only for `/review-pr` (Risk 3).** `/qa-task` and
  `/qa-story` diff `$BASE...HEAD` (`qa-story/SKILL.md:984`). Reading the working tree would check
  uncommitted edits. `/review-code`'s targets differ by mode. Each caller also holds YAML, not the
  JSON file the CLI reads.
  - **Fix (D4):** state `--rev` per caller, and write the parsed findings to a `mktemp` JSON in the
    same fenced block as the call.
- **The population key misses a token-free restatement (check 13).** The compound regex
  `(prompt|Prompt Template\*\*) from \[?…` matches today's 4 sites. A fifth dispatcher phrased
  differently ("run the reviewer in `references/code-review-prompt.md`") passes unseen. The bare
  filename returns the same 4 files today (`git grep -ln "code-review-prompt.md" -- 'skills/*/SKILL.md'`).
  - **Fix (D3):** population = bare-filename mention; cite-only allowlist with a reason per entry.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (resolved by D1, D4)

The phases are specific: files, functions and fenced blocks are named. The gaps were the two above:
the verdict-to-jq join, and the per-caller `--rev` and findings-file binding.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **The verdict table and the risk section disagree.** The table says `ok` means `line_text`
  "matches it after trimming". Risk 2's mitigation says whitespace is collapsed and a substring is
  accepted, and the plan code does the latter. The table is normative.
  - **Fix:** state the collapse-and-substring rule in the table.
- **SC-5 and SC-6 put behaviour in prose with no executing test (obs #258).** The planned population
  test only checks that the call is mentioned. The `--inline` filter is a fenced jq block that
  `review-pr.test.js:708` and `review-code.test.js:282` already extract and run, but nothing plans to
  extend them. The `--fix` skip and the `top_issues[]` wording are prose a model follows.
  - **Fix:** SC-6 is split. The `--inline` part is held by extending both jq-run tests with an
    annotated fixture (`text-mismatch` excluded; `ok` and `unchecked-text` kept). The `--fix` and
    `top_issues[]` parts become documentation criteria, held by the population test asserting the
    stated rule. SC-5 is a documentation criterion: each dispatcher carries the call and the marker.
- **SC-7 (performance) names no test (obs #206).** The bound is a count a per-PR test can assert.
  - **Fix:** a unit test with a counting injected `readFile`: two findings on one path → 1 read.

Removed-literal sweep (check 15): `git grep -n 'from the diff' -- '*.test.*' 'evals/**' 'tests/**'`
returns nothing, so no test pins the rule line being rewritten. Test reach (check 18): `package.json`
globs `shared/resources/tests/*.test.mjs` and `evals/shared/tests/*.test.mjs`. Call-site population
(check 14): not applicable, because `finding-anchors.js` is not one of the five collector engines. The
dispatcher list carries its grep (check 20) and re-measures to 4. Mermaid: no diagram needed; the
verdict table carries the structure.

### Optional

- **A short `line_text` weakens identity.** With substring matching, `}` or `return x;` matches many
  lines. Consider treating a `line_text` under a minimum length as `unchecked-text`. Not applied:
  this is a judgement call for develop, and the false-`ok` cost is the status quo.
- **A range anchor (`src/x.ts:42-58`) becomes `no-line`.** That is consistent with the `--inline` shape
  filter. Pin it in a unit test so the choice is recorded, not accidental.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium risk is right: no guard is exempted, and the change is additive. The rollback triggers are
concrete ("any finding dropped" is Critical). D4 closes Risk 3 for the three callers it had not covered.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue

1. Anchor regex `^(\S+):(-?\d+)$`; unit test for the compound `ref` → `no-line` (D2).

### Should Fix (Important) - 6 issues

1. `--annotate` + `anchor_check`; jq filters `.anchor_check` (D1).
2. Per-caller `--rev` and a `mktemp` findings JSON in the same block (D4).
3. Population on the bare filename, with a cite-only allowlist (D3).
4. Verdict table states the collapse-and-substring rule.
5. SC-5 / SC-6 re-scoped; extend both jq-run tests with an annotated fixture.
6. SC-7 held by a counting-`readFile` unit test.

### Consider (Optional) - 2 items

1. Minimum `line_text` length for an `ok`.
2. Pin the range-anchor `no-line` in a test.

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes; 6/10 before)

- Template Compliance: 10/10
- Technical Accuracy: 7/10 → 9/10
- Implementation Clarity: 7/10 → 9/10
- Consistency: 7/10 → 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** (after the Step 8.5 fixes)

**Justification:** The Critical finding is one regex in the plan, falsified by one command. All seven
fixes are applied to the task and plan without needing user input.

---

## Next Steps

Task is ready for implementation. Follow the plan phase by phase, and run the mutation proofs (SC-11)
before QA.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2)
- **Review Date:** 2026-10-07
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.194.code-review-anchors-name-source-lines/task.194.code-review-anchors-name-source-lines.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{tech-stack,coding-standards,source-tree}.md (via prepass-axes.js)
- **Pre-pass:** both agents run inline, not as Explore subagents. Explore subagents have hung in this repository before, so the pre-pass did not have an independent reader.
