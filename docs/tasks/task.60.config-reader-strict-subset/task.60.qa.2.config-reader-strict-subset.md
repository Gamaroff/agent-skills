---
id: task.60.qa.2
title: 'QA Report 2: Task 60 — re-review after qa-fix cycle 1'
type: qa-report
task-ref: task.60.config-reader-strict-subset.md
status: complete
created: 2026-08-18
updated: 2026-08-18
---

# QA Report 2: Task 60 — re-review after qa-fix cycle 1

**Task**: [task.60.config-reader-strict-subset.md](./task.60.config-reader-strict-subset.md)
**Gate File**: [task.60.gate.2.config-reader-strict-subset.yml](./task.60.gate.2.config-reader-strict-subset.yml)
**Previous**: [gate 1 — CONCERNS 80/100](./task.60.gate.1.config-reader-strict-subset.yml) · [QA report 1](./task.60.qa.1.config-reader-strict-subset.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-18
**PR**: [#248](https://github.com/Gamaroff/agent-skills/pull/248) (OPEN)
**Gate Status**: PASS

---

## Re-Review Context

Scoped to files changed since gate 1 (`c0f1710..HEAD`): the two shared resolvers, the test suite,
the workflow, the subset spec, the CHANGELOG and the task document.

| Gate 1 finding | Status | Verification |
| --- | --- | --- |
| **TASK-60-QA1-1** (medium) — duplicated `access:` key resolves permissively on tier 2 | **FIXED** | Original shape re-run against the fixed branch: `rc=1` on awk (was `rc=0` / `full`), matching tier 1's halt. Duplicated child likewise. |
| **TASK-60-QA1-2** (medium) — CI awk-variant install can red the whole job | **FIXED** | `sudo apt-get update` precedes the install, with its reason stated in the step. |
| **LOW-1** — else-branch indentation in the hoisted refusal | **FIXED** | Re-indented; branch structure now reads as written. |
| **LOW-2** — undocumented narrowness in the alias rule | **FIXED** | Comment added, and it explains the *structural* reason the narrowness is safe rather than merely asserting it. |

---

## Executive Summary

The fix closes the last route by which tier 2 could resolve more permissively than tier 1, and it
closes it the right way — **scoped to the consumed keys**. That scoping is not a detail: refusing
every duplicated key would have halted consumers over a repeated `jira:` this reader never looks at,
which is the over-refusal failure mode the subset was shaped around and which §38 explicitly
depends on. Both directions are now asserted.

The fix was also checked as *new code* rather than treated as a closed finding. The duplicate rule
introduces scanner state (`seen_top`, `seen_child`, `cur_parent`, `child_indent`), and state in a
line scanner is where transition bugs live. Nine probes covering block-scalar bodies, comments,
blank lines mid-block, sequence items, parent reset, the flow form, a childless parent, deeper
nesting and anchor-before-duplicate all behave correctly.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED
**Quality Score**: 95/100

---

## Verification

### The finding that mattered

```
access:
  tracker: full
access:
  tracker: manual
```

| Tier | Before | After |
| --- | --- | --- |
| python | `rc=1` (strict loader rejects the duplicate) | `rc=1` — unchanged |
| awk | `rc=0`, `ACCESS_TRACKER=full` | **`rc=1`** |

Scanner verdict: `2:a duplicate \`access:\` key`. Same for the duplicated child.

### Anti-over-refusal — the half that is easy to get wrong

| Shape | Verdict | Why it must stay clean |
| --- | --- | --- |
| `x: 1` / `x: 2` beside a readable `access:` block | clean | §38's degrade path; a repeated key we never read cannot mislead |
| this repo's own `skills-config.yaml` | clean, resolves identically on both tiers | the corpus that proves the subset is not too narrow |
| two *different* children under one parent | clean | `tracker:` + `vcs:` is the canonical shape |
| same child name under *different* parents | clean | `seen_child` is correctly scoped per parent |

### Transition probes against the new scanner state

| Probe | Verdict | Correct because |
| --- | --- | --- |
| block-scalar body repeating a guarded key | clean | body lines are `next`ed before the duplicate block |
| comment repeating a guarded key | clean | comment lines `next` before it |
| blank line inside the access block | clean | blanks `next`, so `child_indent` survives |
| sequence items under a consumed parent | clean | `- a` is not a key |
| non-consumed key after a consumed one | clean | `cur_parent` resets at indent 0 |
| flow form written twice | refused | the flow form is still a top-level `access:` |
| second `access:` with no children | refused | duplicate detected before any child is seen |
| deeper repeat under a consumed parent | clean | only the first child level is tracked — the only level the readers read |
| anchor *and* duplicate in one file | anchor, line 1 | the scan reports the first construct it meets |

### Regression

| Check | Result |
| --- | --- |
| `tracker-access.test.sh` | **378 passed, 0 failed** (371 at gate 1) |
| `npm test` | **1287/1287** |
| `npm run validate:all` | **115/115** |
| `npm run format:check` | clean |
| `npm run bundle` | idempotent |
| Measured spawn counts | unchanged — awk tier 9, python tier 13 |

### Mutation audit

Three mutations added for the new rule, all red:

| Mutation | Failing |
| --- | --- |
| delete the top-level duplicate refusal | 2 |
| delete the child-level duplicate refusal | 2 |
| **widen the rule to every key rather than the consumed ones** | 1 |

The third is the one worth having. It witnesses the *over-refusal* direction — the failure mode that
does not look like a bug in a green suite, because the code is stricter rather than looser.

**Total: 24 mutations, 0 survivors.**

---

## Code Review

One item found while reviewing the fix, and **fixed within the same cycle** rather than deferred:

- `shared/resources/tracker-access.test.sh` — `OUT_OF_SUBSET` is a **double-quoted** shell string,
  so a backtick in a construct label is command substitution. The first version of the new matrix
  rows executed the label and substituted its empty output, silently weakening the stderr assertion
  to a shorter needle: a test that passes while asserting less than it claims. Backticks escaped and
  the hazard noted in the file so the next person adding a row does not repeat it.

No further correctness bugs. No new cleanups.

---

## NFR Assessment

| NFR | Gate 1 | Gate 2 | Rationale |
| --- | --- | --- | --- |
| Security | CONCERNS | **PASS** | Every identified escalation route is closed on both tiers — the aliasing family, the mapping-valued child, and now the duplicate key. The refusal remains unforgeable. |
| Performance | PASS | PASS | The rule lives inside the existing single awk pass; no added spawn. |
| Reliability | PASS | PASS | Unchanged; the awk-died fallback still refuses rather than reading clean. |
| Maintainability | CONCERNS | **PASS** | Both deductions closed; the alias-rule comment explains the *structural* reason its narrowness is safe. |

---

## Remaining notes (non-blocking)

1. **Deeper duplicates are not refused.** The rule tracks only the first child level under a
   consumed parent, which is the only level the nested readers read. `prd:` → `a:` → `k:` twice is
   clean on tier 2 while tier 1 halts. Not an escalation — tier 2 resolves the correct value and
   tier 1 refuses the file — but worth a line in the spec if the key surface ever grows deeper.
2. **`gawk`/`mawk` still unobserved locally.** The CI step is now reliable, but the assertion has
   not yet been *seen* green. Confirm on the first CI run of this branch rather than assuming it.
   This is carried forward deliberately rather than waved through.

---

## Final Assessment

**Gate**: PASS · **Quality Score**: 95/100 · **Deployment**: APPROVED

Both blocking conditions from gate 1 are discharged. The work does what it set out to do: tier 2 has
a grammar, and where it has none it refuses — including, now, for the most ordinary editing accident
there is.
