# PR Review Report: PR #557 — fix(task.177): /review-pr resolution edge cases (#555)

**Reviewed:** 2026-10-03
**PR:** [#557](https://github.com/Gamaroff/agent-skills/pull/557) — `feature/task.177.review-pr-resolution-edge-cases` → `develop` (OPEN)
**Work item:** [`task.177.review-pr-resolution-edge-cases.md`](./task.177.review-pr-resolution-edge-cases.md) — resolved via `branch stem`
**Tracker:** [#555](https://github.com/Gamaroff/agent-skills/issues/555) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.177.implementation.1.review-pr-resolution-edge-cases-initial-run.md (per-cycle updates deferred to Step 8) |
| Review report | ✅ | task.177.review.1.review-pr-resolution-edge-cases.md |
| QA reports | 3 | task.177.qa.1 / qa.2 / qa.3 |
| Gate | PASS | task.177.gate.3.review-pr-resolution-edge-cases.yml (100) |
| DoD | ❌ | not yet — Step 7 writes it (expected at 5c) |
| Sprint review | ❌ | not yet — Step 7 writes it (expected at 5c) |
| Open bugs | 0 | — |
| Handover | ❌ | none — no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Commented `.env` JIRA_URL on the same host: no warning (bash, zsh) | `review-pr.test.js` "an inline-commented .env JIRA_URL on the same host does not warn" | ✅ met |
| No `docs/`: Step 1a continues past rung 1; §0a still halts directly | docs guard tests; CR2-6 test | ✅ met |
| Scheme-less platform URLs parse; listed branches stay branches | PARSER_CASES (bash, zsh) | ✅ met |
| Step 2 rung 2 never returns an artifact | "rung 2 (§0a, pr_number)" fixture tests | ✅ met |
| No extra network call for a PR target | gating pin test | ✅ met |
| Tests green; mutation check reds each case | 247/247; mutation proofs in qa.1–qa.3 | ✅ met |
| shellcheck, bundle:check, full suite | QA reports; fast gate 5194 pass, 0 fail | ✅ met |

Scope excluded from the diff: none. `':(exclude)*/references/*'` removed no file, because the PR changes no generated copy.

## Conformance Findings

```
[PC-1] coverage · low · confidence: high — task.177.review-pr-resolution-edge-cases.md § 3 Target Architecture / Important Clarifications
  § 3 still promises the dotted-host-plus-marker rule and says v1.2/x/pull/3 would parse as a URL; QA cycle 2 dropped that rule, and only the Implementation Summary records it.
  → Record the narrowed scope as an accepted deviation in the DoD, or correct § 3 through review-task.

[PC-2] scope · low · confidence: high — docs/tasks/task.178.review-skills-cite-key-lookup/task.178.plan.review-skills-cite-key-lookup.md:27 (commit 57abb8c4)
  The PR fixes a dead link in task.178's plan (out of scope); the PR body and implementation report say so, the task's Implementation Summary does not.
  → Note the task.178 link fix in the task's Implementation Summary as a pre-existing fix carried for CI.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — skills/review-pr/scripts/parse-target.sh:182
  The known-host check reads the raw first segment while the URL arm strips ?, # and userinfo@ to derive HOST, so ghe.corp#.atlassian.net/o/r/pull/7 passes the *.atlassian.net check and parses as pr 7 on host ghe.corp.
  → Strip ?…, #… and …@ from _host before matching, or refuse a first segment containing ? or #; add a PARSER_CASES row.

[CR-2] cleanup · low · confidence: high — skills/review-pr/scripts/parse-target.sh:31
  The header rule "a URL never falls through to the branch arm" (also in SKILL.md Step 0b) no longer holds: a scheme-less self-hosted URL is now kind=branch.
  → Reword both comments: a URL with a scheme, or a scheme-less URL on a known platform host, never falls through.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: high
    ref: "task.177.review-pr-resolution-edge-cases.md § 3 Target Architecture / Important Clarifications"
    finding: "§ 3 still promises the dotted-host-plus-marker rule that QA cycle 2 dropped; only the Implementation Summary records the drop."
    suggested_action: "Record the narrowed scope as an accepted deviation in the DoD, or correct § 3 through review-task."
  - id: PC-2
    category: scope
    severity: low
    confidence: high
    ref: "docs/tasks/task.178.review-skills-cite-key-lookup/task.178.plan.review-skills-cite-key-lookup.md:27"
    finding: "The out-of-scope task.178 link fix is disclosed in the PR body and implementation report but not in the task's Implementation Summary."
    suggested_action: "Note the task.178 link fix in the task's Implementation Summary."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "skills/review-pr/scripts/parse-target.sh:182"
    finding: "The known-host check reads the raw first segment while the URL arm strips ?, # and userinfo@, so ghe.corp#.atlassian.net/o/r/pull/7 parses as pr 7 on host ghe.corp."
    suggested_action: "Strip ?…, #… and …@ from _host before matching, or refuse a first segment containing ? or #."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "skills/review-pr/scripts/parse-target.sh:31"
    finding: "The header rule that a URL never falls through to the branch arm no longer holds for a scheme-less self-hosted URL."
    suggested_action: "Reword the parser header and the SKILL.md Step 0b comment to the known-host rule."
truncated_count: 0
```

## Recommended Actions

1. Record the narrowed scheme-less scope (PC-1) as an accepted deviation in the DoD.
2. Follow-up: CR-1 (`?`/`#` in a scheme-less first segment) and CR-2 (comment wording), with the QA
   advisories CR3-1 to CR3-4 — one small follow-up task.
