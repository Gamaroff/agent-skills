# PR Review Report: PR #576 — fix(task.186): eval harness hardening and task.185 leftovers

**Reviewed:** 2026-10-06
**PR:** [#576](https://github.com/Gamaroff/agent-skills/pull/576) — `feature/task.186.eval-harness-hardening-and-leftovers` → `develop` (OPEN)
**Work item:** [`task.186.eval-harness-hardening-and-leftovers.md`](./task.186.eval-harness-hardening-and-leftovers.md) — resolved via `branch stem`
**Tracker:** [#575](https://github.com/Gamaroff/agent-skills/issues/575) — OPEN
**Verdict:** ⚠️ CONCERNS

Invoked by `/develop-task` Step 5c (`--effort medium --comment`). Scope: `origin/develop...origin/feature/task.186…`
with `*/references/*` excluded — all ten excluded paths are bundle copies of `shared/resources/`
sources that are in the diff (`npm run bundle:check` holds them byte-identical); the Files Summary
names them only generically ("via `npm run bundle`"), so the default exclusion stands.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.186.implementation.1.eval-harness-hardening-and-leftovers-initial-run.md` |
| Review report | ✅ | `task.186.review.1.eval-harness-hardening-and-leftovers.md` |
| QA reports | 3 | `task.186.qa.1…`, `qa.2…`, `qa.3…` |
| Gate | CONCERNS | `task.186.gate.3.eval-harness-hardening-and-leftovers.yml` (90) — no open entry; route 2 |
| DoD | ❌ (expected) | not yet — Step 7 writes it |
| Sprint review | ❌ (expected) | not yet — Step 7 writes it |
| Open bugs | 0 | — |
| Handover | ❌ | none (access full) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Hung setup → `repeat.mjs` exit 3 | `evals/shared/runner.mjs` `process.exitCode = 1`; `repeat.test.mjs` "never settles" | ✅ met |
| Unknown assertion fn → `repeat.mjs` exit 2 before any run; runner non-verdict before driver | `lib/assertion-dispatch.mjs` `assertionListProblems`; repeat + runner-setup tests | ✅ met |
| Opt-in codes outside 0–5, README matches | `repeat.mjs` 73/74/75; `repeat.test.mjs` A3 reads the README | ✅ met |
| `refusal` on every refusal; `gh version issue close 5` refused; `--version pr view` not a version | `lib/fake-gh.mjs`; `fake-gh.test.mjs` | ✅ met |
| `pr-inline-comment.js` never sends `-f` without `-X GET` | `shared/resources/pr-inline-comment.js:458`; test "field parameter says -X GET" | ✅ met |
| Six call sites give `.4.` after `.1.` and `.3.` (bash, zsh) | `shared/resources/tests/next-numbered.test.mjs` | ✅ met |
| `npm test`, `eval:all`, `bundle:check`, `lint:shell`; `validate` per changed skill | `npm run ci` exit 0; 6/6 validate | ✅ met |
| CHANGELOG cites task.186; README states codes and `refusal` | `CHANGELOG.md` [Unreleased] › Fixed; `evals/shared/README.md` | ✅ met |

## Conformance Findings

```
[PC-1] trail · medium · confidence: medium — task.186…md ## Deferred Work; Implementation Summary "Deferred Work: none"
  The Deferred Work section lists only C3-CR-1 and the Implementation Summary still says "Deferred Work: none", while gate 1 CR-2/CR-4/CR-5/CR-6 and gate 3 C3-CR-2/3 remain unfixed in recommendations.future.
  → List every carried-but-unfixed recommendations.future item in Deferred Work and correct the stale line before /finalise.

[PC-2] scope · low · confidence: medium — evals/shared/lib/driver-name.mjs; §7 Files Summary
  The new module driver-name.mjs (added by the C2-CR-1 fix) is not in the Files Summary, which lists the other new module.
  → Add it to the Files Summary as a new core file.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/newest-numbered.sh:34
  _numbered_series discards find's status, so "empty series" and "could not look" (no -name, a malformed predicate, an unreadable directory) both make next_numbered print 1; reproduced with `next_numbered "$d" review` and `-nme` on a directory holding .1. and .3.
  → Refuse with status 2 when no predicate is given, and treat a non-zero find exit as a refusal.

[CR-2] cleanup · low · confidence: high — evals/shared/README.md:17
  The README says the runner exits 0 only from its final line, but the skip paths still exit 0 when EVAL_SKIP_EXIT is unset.
  → Say a run that never reaches an explicit exit ends with 1, and a skip still exits 0 unless EVAL_SKIP_EXIT is set.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: medium
    ref: "task.186.eval-harness-hardening-and-leftovers.md ## Deferred Work"
    finding: "The Deferred Work section lists only C3-CR-1 and the Implementation Summary says 'Deferred Work: none', while several recommendations.future items from gates 1 and 3 remain unfixed."
    suggested_action: "List every carried-but-unfixed recommendations.future item in Deferred Work and correct the stale line before /finalise."
  - id: PC-2
    category: scope
    severity: low
    confidence: medium
    ref: "evals/shared/lib/driver-name.mjs"
    finding: "The new module driver-name.mjs is not listed in the work item's Files Summary."
    suggested_action: "Add it to the Files Summary as a new core file."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/newest-numbered.sh:34"
    finding: "_numbered_series discards find's exit status, so an empty series and a failed lookup (no -name, a malformed predicate, an unreadable directory) both make next_numbered print 1."
    suggested_action: "Refuse with status 2 when no predicate is given, and treat a non-zero find exit as a refusal."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "evals/shared/README.md:17"
    finding: "The README says the runner exits 0 only from its final line, but skip paths still exit 0 when EVAL_SKIP_EXIT is unset."
    suggested_action: "Reword to say a run that never reaches an explicit exit ends with 1, and a skip exits 0 unless EVAL_SKIP_EXIT is set."
truncated_count: 0
```

## Recommended Actions

1. PC-1, PC-2 — complete the work item's Deferred Work section and Files Summary before `/finalise` (document-only).
2. CR-1 — make `next_numbered` refuse a missing predicate and a failed `find` (follow-up; every shipped call site passes `-name` and is tested).
3. CR-2 — correct the README's runner-exit sentence (follow-up).
