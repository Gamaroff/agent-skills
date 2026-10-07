# PR Review Report: PR #596 — feat(task.194): code-review findings anchor to source lines (#595)

**Reviewed:** 2026-10-07
**PR:** [#596](https://github.com/Gamaroff/agent-skills/pull/596) — `feature/task.194.code-review-anchors-name-source-lines` → `develop` (OPEN)
**Work item:** [`task.194.code-review-anchors-name-source-lines.md`](task.194.code-review-anchors-name-source-lines.md) — resolved via `branch-stem`
**Tracker:** [#595](https://github.com/Gamaroff/agent-skills/issues/595) — OPEN
**Verdict:** ⚠️ CONCERNS

Develop-task Step 5c, effort `medium`. Diff `origin/develop...origin/feature/task.194…` at `d11bb5c8`,
3846 lines; 12 generated `skills/*/references/` copies excluded (the Files Summary names them only
as generated, never hand-edited).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.194.implementation.1.code-review-anchors-name-source-lines-initial-run.md |
| Review report | ✅ | task.194.review.1.code-review-anchors-name-source-lines.md |
| QA reports | 3 | task.194.qa.1…, qa.2…, qa.3… |
| Gate | CONCERNS | task.194.gate.3.code-review-anchors-name-source-lines.yml (90) |
| DoD | ❌ | not yet — Step 7 writes it |
| Sprint review | ❌ | not yet — Step 7 writes it |
| Open bugs | 0 | bugs 1–5 closed |
| Handover | ✅ | none needed (access full) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC-1 `file_line` is the PR-head line | `shared/resources/code-review-prompt.md` Rules | ✅ met |
| SC-2 `line_text` in schema and rules | same file | ✅ met |
| SC-3 six verdicts | `finding-anchors.test.mjs` | ✅ met |
| SC-4 CLI 0/1/2, `--rev` | `finding-anchors.test.mjs` (bad-rev, bad-root, `--rev`) | ✅ met |
| SC-5 dispatchers run the checker | `finding-anchors-callers.test.mjs` | ✅ met |
| SC-6a no malformed anchor inline | review-pr / review-code jq-run tests | ✅ met |
| SC-6b `--fix` skip, `top_issues[]` wording | `finding-anchors-callers.test.mjs` | ✅ met |
| SC-7 one read per path | counting-`readFile` test | ✅ met |
| SC-8 – SC-12 | gate 3, QA reports, CHANGELOG | ✅ met |

## Conformance Findings

None.

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — evals/shared/tests/finding-anchors-callers.test.mjs:48
  The population counts only SKILL.md files that dispatch the reviewer, so develop-bug's verify loop, which gates on and applies /review-code findings by hand, is outside it.
  → Widen the population to files that act on code_review findings and have the develop-bug verify loop honour anchor_check.

[CR-2] bug · medium · confidence: medium — shared/resources/finding-anchors.js:100
  no-line is one clean verdict for an AC-id ref (nothing to verify) and a code-lens file_line that breaks the path:line contract.
  → Give a code_review finding whose file_line does not parse its own malformed verdict.

[CR-3] bug · medium · confidence: medium — skills/review-pr/SKILL.md:592
  The API-diff head recovery is GitHub-only (pull/<n>/head); on Bitbucket a merged PR's head cannot be fetched this way, so every anchor check exits bad-rev.
  → Resolve HEAD_REV from the PR head SHA (headRefOid / source.commit.hash) and fetch it.

[CR-4] bug · low · confidence: medium — skills/review-code/SKILL.md:88
  A --staged review diffs the index but anchors are checked against the files on disk.
  → Check --staged anchors against the index, or state the limitation.
```

**Anchors:** 4 checked against `origin/feature/task.194.code-review-anchors-name-source-lines` — all verified

## Machine-Readable Findings

```yaml
findings:
  # one entry per rendered finding, conformance first then code
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "evals/shared/tests/finding-anchors-callers.test.mjs:48"
    anchor_check: ok
    finding: "The population counts only SKILL.md files that dispatch the reviewer, so develop-bug's verify loop, which gates on and applies /review-code findings by hand, is outside it."
    suggested_action: "Widen the population to files that act on code_review findings and have the develop-bug verify loop honour anchor_check."
  - id: CR-2
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/finding-anchors.js:100"
    anchor_check: ok
    finding: "no-line is one clean verdict for an AC-id ref (nothing to verify) and a code-lens file_line that breaks the path:line contract."
    suggested_action: "Give a code_review finding whose file_line does not parse its own malformed verdict."
  - id: CR-3
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/review-pr/SKILL.md:592"
    anchor_check: ok
    finding: "The API-diff head recovery is GitHub-only (pull/<n>/head); on Bitbucket a merged PR's head cannot be fetched this way, so every anchor check exits bad-rev."
    suggested_action: "Resolve HEAD_REV from the PR head SHA (headRefOid / source.commit.hash) and fetch it."
  - id: CR-4
    category: bug
    severity: low
    confidence: medium
    ref: "skills/review-code/SKILL.md:88"
    anchor_check: ok
    finding: "A --staged review diffs the index but anchors are checked against the files on disk."
    suggested_action: "Check --staged anchors against the index, or state the limitation."
truncated_count: 0
```

## Recommended Actions

1. Track CR-1 – CR-4 with the QA cycle 1 and cycle 3 advisory items as follow-up work (none is high-confidence, so none blocks this PR).
2. Widen the dispatcher population test (CR-1) first: it is the one guard whose scope decides whether a new consumer is caught.
