# PR Review Report: PR #406 — test(sync-jira-story): cover the skipped-but-transitioned write gate (#405)

**Reviewed:** 2026-09-14
**PR:** [#406](https://github.com/Gamaroff/agent-skills/pull/406) — `feature/task.109.sync-jira-story-transition-only-write-test` → `develop` (OPEN)
**Work item:** [`task.109.sync-jira-story-transition-only-write-test.md`](./task.109.sync-jira-story-transition-only-write-test.md) — resolved via `branch-stem`
**Tracker:** [#405](https://github.com/Gamaroff/agent-skills/issues/405) — OPEN
**Verdict:** ✅ APPROVE

Effort: `low` (lite-mode degradation, pipeline Step 5c). Diff scope: `origin/develop...origin/feature/task.109.…` excluding `*/references/*` (nothing excluded in practice — the change touches no bundled copies); 748 patch lines, 7 files. CI at review time (head `2c902e43`): validate ✅, shellcheck ✅, link-check ✅, branch-policy ✅, `test` in progress.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.109.implementation.1.sync-jira-story-transition-only-write-test-initial-run.md |
| Review report | ✅ | task.109.review.1.sync-jira-story-transition-only-write-test.md (9/10, READY TO IMPLEMENT) |
| QA reports | 1 | task.109.qa.1.sync-jira-story-transition-only-write-test.md |
| Gate | PASS | task.109.gate.1.sync-jira-story-transition-only-write-test.yml (100) — cycle 1 entry reads `Proceeding to 5c` |
| DoD | ❌ | not expected — status is `ready-for-review`; `/finalise` writes it |
| Sprint review | ❌ | not expected — same |
| Open bugs | 0 | — |
| Handover | ❌ | none — no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. Named test: run 1 `--no-transition`, run 2 plain → skip, transitioned, file changed, `Status →` row | `skills/sync-jira-story/tests/end-to-end.test.js:270` "a status-only run skips the PUT but still writes the Status row and timestamp" | ✅ met (wording: criterion says `skipped:true`; the story engine has no such field — see PC-1) |
| 2. Mutation proof fails that test by name and only that test | implementation report Step 3 + QA report Code Review (`covered`, independently re-run at QA) | ✅ met |
| 3. `command npm test` exit 0 | QA report: `ci:fast` exit 0 (3270 pass / 0 fail) | ✅ met |

## Conformance Findings

```
[PC-1] coverage · low · confidence: high — Success Criteria 1
  Criterion 1 requires the run-2 result to report `skipped:true`, but the story engine returns no `skipped` field and the new test asserts the skip path via `changeSummary === "Sync (no field changes detected)"` plus an unchanged PUT count instead — a wording mismatch the QA gate already records as a documentary LOW.
  → Reword criterion 1 in the task document to name the story engine's actual skip signal (changeSummary + zero PUTs) so the criterion matches what the test proves.

[PC-2] consistency · low · confidence: low — task.109.sync-jira-story-transition-only-write-test.md frontmatter (github_issue: 405, no pr_number)
  The task frontmatter carries no `pr_number: 406` while the implementation report Step 4 row and PR #406 exist; `/finalise` is the step that writes it, so its absence at ready-for-review is expected rather than a defect.
  → No action now; confirm /finalise adds `pr_number: 406` when the task moves to accepted.
```

## Code Review Findings

```
[CR-1] cleanup · low · confidence: medium — skills/sync-jira-story/tests/end-to-end.test.js:290
  putCount(state) is called without the issue key at :290 and :312, counting PUTs across every issue in the fake while every sibling test scopes with putCount(state, key) — correct today only because the fake holds a single issue.
  → Pass key to both putCount calls so the skip-path assertion stays scoped to the story card if the fixture ever grows a second issue.

[CR-2] cleanup · low · confidence: medium — skills/sync-jira-story/tests/end-to-end.test.js:319
  The Status → row is asserted present in `after` but never asserted absent in `before`, so the claim that run 2 wrote the row rests only indirectly on the run-1 status === 'To Do' precondition.
  → Add assert.doesNotMatch(before, rowRe) before run 2 so the proof is self-contained.

[CR-3] cleanup · low · confidence: low — skills/sync-jira-story/tests/end-to-end.test.js:331
  `landed` (statusOutcome.to) is interpolated unescaped into new RegExp(); safe for the fake's current ladder names but would silently mis-match if a ladder value ever contained regex metacharacters.
  → Escape `landed` before interpolation or assert with `after.includes(...)` instead of a RegExp.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: high
    ref: "Success Criteria 1"
    finding: "Criterion 1 requires the run-2 result to report `skipped:true`, but the story engine returns no `skipped` field and the new test asserts the skip path via changeSummary plus an unchanged PUT count instead."
    suggested_action: "Reword criterion 1 in the task document to name the story engine's actual skip signal (changeSummary + zero PUTs) so the criterion matches what the test proves."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "task.109.sync-jira-story-transition-only-write-test.md frontmatter (github_issue: 405, no pr_number)"
    finding: "The task frontmatter carries no pr_number: 406 while PR #406 exists; /finalise writes it, so its absence at ready-for-review is expected."
    suggested_action: "No action now; confirm /finalise adds pr_number: 406 when the task moves to accepted."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/sync-jira-story/tests/end-to-end.test.js:290"
    finding: "putCount(state) is called without the issue key at :290 and :312 while every sibling test scopes with putCount(state, key)."
    suggested_action: "Pass key to both putCount calls so the skip-path assertion stays scoped to the story card."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/sync-jira-story/tests/end-to-end.test.js:319"
    finding: "The Status → row is asserted present in after but never asserted absent in before, so the proof that run 2 wrote it is indirect."
    suggested_action: "Add assert.doesNotMatch(before, rowRe) before run 2 so the proof is self-contained."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: low
    ref: "skills/sync-jira-story/tests/end-to-end.test.js:331"
    finding: "landed is interpolated unescaped into new RegExp(); safe today but would silently mis-match on a ladder value containing regex metacharacters."
    suggested_action: "Escape landed before interpolation or use after.includes(...) instead of a RegExp."
truncated_count: 0
```

## Recommended Actions

1. Reword success criterion 1 (PC-1) — a one-line document edit; can ride with `/finalise`'s version bump.
2. CR-1/CR-2/CR-3 — optional tidy-ups in the new test; none affects correctness.
