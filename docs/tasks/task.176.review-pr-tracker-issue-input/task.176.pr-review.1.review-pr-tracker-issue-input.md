# PR Review Report: PR #554 — feat(task.176): /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Reviewed:** 2026-10-02
**PR:** [#554](https://github.com/Gamaroff/agent-skills/pull/554) — `feature/task.176.review-pr-tracker-issue-input` → `develop` (OPEN)
**Work item:** [`task.176.review-pr-tracker-issue-input.md`](./task.176.review-pr-tracker-issue-input.md) — resolved via `branch stem`
**Tracker:** [#553](https://github.com/Gamaroff/agent-skills/issues/553) — OPEN
**Verdict:** ⚠️ CONCERNS

---

Scope: the full `origin/develop...origin/feature/task.176.review-pr-tracker-issue-input` diff (3,863
lines). The four bundled `references/` copies of `develop-pipeline-step-0-resolve-and-prepare.md` were
excluded. They are byte-identical generated copies of the shared source, and the shared source is in
the diff. Run as develop-task Step 5c, before `/finalise`, so an absent DoD and sprint review are the
expected state.

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.176.implementation.1.review-pr-tracker-issue-input-initial-run.md (Steps 7–8 pending) |
| Review report | ✅ | task.176.review.1.review-pr-tracker-issue-input.md |
| QA reports | 4 | task.176.qa.1 … qa.4 |
| Gate | PASS | task.176.gate.4.review-pr-tracker-issue-input.yml (100) — route 2b, one LOW carried to future |
| DoD | ❌ | not yet — `/finalise` runs at Step 7 |
| Sprint review | ❌ | not yet — `/finalise` runs at Step 7 |
| Open bugs | 0 | — |
| Handover | ❌ | none — no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| New forms parse to their documented kind (bash + zsh) and route to the card → PR rungs | `skills/review-pr/scripts/parse-target.sh`; `review-pr.test.js` PARSER_CASES; Step 0b table | ✅ met |
| Each selection outcome stated, with a prose pin | SKILL.md Step 1a Selection table; tests "each selection outcome…", "an epic key HALTs…" | ✅ met |
| PR-URL host mismatch HALTs; Jira host warns | Step 0b host check, run as one block in tests | ✅ met |
| Old forms parse as before, except `…/pull/N/files` | PARSER_CASES; "a bare number and a branch bind exactly as before" | ✅ met |
| Jira-key input retried as a branch | Step 1a rung 5; test pin | ✅ met |
| Key match never auto-resolved | Step 1a rungs 3–4; test pin | ✅ met |
| §0a lookup anchored, quote-tolerant, excludes `.request.` | §0a block; fixture tests; 174/174 real lookups resolve to one doc | ✅ met |
| No extra call for a PR target | gating pin | ✅ met |
| Suites green; mutation check | 187 tests; mutation proofs per cycle in the QA reports | ✅ met |
| `bundle:check` + full suite | `bundle:check` rc 0; `ci:fast` 5134 pass at cycle 3's fix | ✅ met |
| Migration: none | CHANGELOG states the stricter lookup | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — task doc §3 Target Architecture rung 3 vs skills/review-pr/SKILL.md:294-295
  The task document still describes rung 3 as `--limit 100` and a substring match on the branch. The
  shipped SKILL.md uses `--limit 1000` and a match anchored on the branch's last segment. The change is
  deliberate but is recorded only in the implementation report.
  → Update the task document's rung-3 bullet to the anchored filter and `--limit 1000`.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:118
  The §0a lookup now halts when docs/ is missing. /review-pr runs it at Step 1a rung 1 and Step 2
  rung 4, so in a repo with no docs/ a Jira-key review halts instead of continuing to rung 4, or to a
  code-only review as Step 2 rung 6 documents.
  → In /review-pr, check for docs/ at the repo root before the lookup and treat a missing docs/ as
    "no document". Keep the HALT for the develop pipelines.

[CR-2] bug · low · confidence: medium — skills/review-pr/scripts/parse-target.sh:221
  A URL pasted without its scheme (github.com/o/r/pull/12, acme.atlassian.net/browse/RAPP-702) is
  read as kind=branch, the fall-through the script says it removes.
  → Treat a target whose first segment is a known platform host as https://<target>, and add the
    scheme-less forms to the parser tests.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "task.176.review-pr-tracker-issue-input.md §3 Target Architecture rung 3"
    finding: "The task document describes rung 3 as --limit 100 and a substring branch match; SKILL.md ships --limit 1000 and a last-segment-anchored match."
    suggested_action: "Update the task document's rung-3 bullet to match the shipped filter."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:118"
    finding: "A missing docs/ makes the §0a lookup HALT inside /review-pr, so a docs-less repo cannot reach rung 4 or a code-only review."
    suggested_action: "In /review-pr, treat a missing docs/ at the repo root as no document before calling the lookup; keep the HALT for the develop pipelines."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "skills/review-pr/scripts/parse-target.sh:221"
    finding: "A scheme-less URL (github.com/o/r/pull/12) parses as kind=branch."
    suggested_action: "Re-parse a target whose first segment is a known platform host as https://<target>; add tests."
truncated_count: 0
```

## Recommended Actions

1. CR-1: in a docs-less repo, `/review-pr` should degrade to rung 4 or a code-only review rather than
   halt. This is a follow-up, not a merge blocker.
2. PC-1: update the task document's rung-3 description to match what shipped.
3. CR-2: accept scheme-less platform URLs.
