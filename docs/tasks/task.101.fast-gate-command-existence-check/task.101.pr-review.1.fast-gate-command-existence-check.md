# PR Review Report: PR #371 — feat(develop-loop): fail fast when fastGateCommand names a missing script

**Reviewed:** 2026-09-10
**PR:** [#371](https://github.com/Gamaroff/agent-skills/pull/371) — `feature/task.101.fast-gate-command-existence-check` → `develop` (OPEN)
**Work item:** [`task.101.fast-gate-command-existence-check.md`](./task.101.fast-gate-command-existence-check.md) — resolved via `branch stem`
**Tracker:** [#370](https://github.com/Gamaroff/agent-skills/issues/370) — OPEN
**Verdict:** ⚠️ **CONCERNS**

---

## Scope of this review

23 changed files, +2123 / −72. Six auto-generated `skills/*/references/` copies were **excluded**
from the diff sent to both lenses, leaving 17 files reviewed.

> **One of the six is not auto-generated, and that matters.**
> `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` is **skill-native** — it has no
> `shared/resources/` counterpart and is hand-authored — but it lives under `*/references/*` and so
> was caught by the exclusion pattern. It was reviewed **separately and by hand** rather than being
> silently dropped. The `ci-gate-parity` test's own comment names this asymmetry as the reason task 75
> missed that file for a full release; the exclusion glob reproduces the same blind spot.

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.101.implementation.1.fast-gate-command-existence-check-initial-run.md` |
| Review report | ✅ | `task.101.review.1.fast-gate-command-existence-check.md` (READY TO IMPLEMENT, 8/10) |
| QA reports | 3 | `task.101.qa.{1,2,3}.fast-gate-command-existence-check.md` |
| Gate | **PASS** | `task.101.gate.3.fast-gate-command-existence-check.yml` (100/100) |
| DoD | ❌ | Not yet written — Step 7 has not run. Expected at this point in the pipeline. |
| Sprint review | ❌ | Same — produced by `/finalise`. |
| Open bugs | 0 | — |
| Handover | ✅ n/a | No deferred tracker actions; `access.tracker` is `full`. |

The trail is complete for a PR at Step 5c. The two ❌ rows are artifacts Step 7 produces and their
absence here is correct, not a gap.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1 — HALTs **before** the first iteration on a missing script | `evals/shared/tests/fast-gate-precondition.test.mjs` "a missing script HALTs and names the key" (both shells); placement asserted by "the loop's entry point points at the precondition" | ✅ met |
| 2 — message names `develop.fastGateCommand` and `skills-config.yaml` | same test, two `assert.match` on captured output | ✅ met |
| 3 — compound / non-npm left alone, not guessed at | "a shape the extraction cannot read is skipped, not failed" (5 shapes) + "a compound beginning 'npm run' checks its FIRST script" | ✅ met |
| 4 — the document no longer implies `npm run ci:fast` exists everywhere | `develop-pipeline-step-3-develop-loop.md`, `develop-pipeline-step-5-6-qa-loop.md`, `develop-bug-step-5-6-verify-loop.md`, `skills/develop/SKILL.md`, `skills/develop-next/SKILL.md`, `docs/reference/configuration.md` | ✅ met |
| 5 — both shells agree | every behavioural case is parameterised over `["bash", "zsh"]` | ✅ met |

Criterion 1 is met **as evidenced**: the extracted block HALTs, and the loop's entry now points at it.
Whether a pipeline agent then executes that block is a property of the runnable-prose design as a
whole, not of this change — noted for honesty, not raised as a finding.

## Conformance Findings

```
[PC-1] trail · low · confidence: high — docs/tasks/task.101.fast-gate-command-existence-check/task.101.fast-gate-command-existence-check.md
  CHANGELOG.md is modified by this PR but is not listed in §7 Files Summary. Every other
  changed file is listed; this is the single omission, verified mechanically against
  `git diff --name-only`.
  → Add CHANGELOG.md to the §7 "Modified" list.
```

Scope: no drift. Every changed file traces to a stated purpose — the precondition, the six-site
presentation sweep, the test, the guard the new content tripped, or the task's own artifacts. The
`tests/executable-instructions.test.js` change is the furthest from the task's original file list and
is justified in the task, the commit and the PR body as a guard the change provoked rather than
unrelated work.

Consistency: the document reads `status: ready-for-review` / `**Status:** Ready for Review`, gate 3
reads `PASS`, and the tracker issue is OPEN — all mutually consistent for a PR that has not yet been
finalised.

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — evals/shared/tests/fast-gate-precondition.test.mjs:87
  runCheck() takes `timeoutMs` from spawnBudget but ignores the budget's other half. On a
  timeout or a fork-pressure failure spawnSync returns `status: null`, which the assertions
  compare against 0 and report as a behavioural failure ("a project defining ci:fast must
  not be halted") — a child that never ran reported as an answer. The module ships
  `neverRan(result)` for exactly this, and its own comment says "A CHILD THAT NEVER RAN IS
  NOT AN ANSWER. Treating it as one is how a loaded box turns into a reported behavioural
  divergence that never happened." This suite spawns 26 children, each running `npm run` —
  the heaviest spawn profile among the repo's tests — and bug.2 documents ~6x latency
  inflation under load, with two merges already made over a red local suite because of it.
  → Import `neverRan` alongside `spawnBudget`; retry up to `budget.retries` while
    `neverRan(r)` holds, and fail with an explicit "never produced an answer" message rather
    than letting null reach an equality assertion.

[CR-2] cleanup · low · confidence: high — evals/shared/tests/fast-gate-precondition.test.mjs:84
  `snippet.replaceAll(PLACEHOLDER, gateCommand)` passes gateCommand as a REPLACEMENT string,
  where `$&`, `$'` and `$\`` carry special meaning. No current case contains one, so this is
  latent rather than live — but a future gate command such as `npm run build -- --define $1`
  would be silently mangled into something other than what the test claims to run.
  → Use a replacer function: `.replaceAll(PLACEHOLDER, () => gateCommand)`.
```

Everything else in the diff was examined and cleared. The two candidates probed in QA remain clear:
`isFdRedirect` still lets `npm run build 2>/dev/null` through as a real invocation, and the
`${GATE_SCRIPT}` interpolation cannot receive a regex metacharacter because the extracting character
class excludes `.` and `/`.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.101.fast-gate-command-existence-check/task.101.fast-gate-command-existence-check.md"
    finding: "CHANGELOG.md is modified by this PR but absent from the task's §7 Files Summary."
    suggested_action: "Add CHANGELOG.md to the §7 Modified list."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "evals/shared/tests/fast-gate-precondition.test.mjs:87"
    finding: "runCheck ignores spawnBudget's retry half, so a spawnSync status of null (timeout or fork pressure) is asserted against 0 and reported as a behavioural failure."
    suggested_action: "Import neverRan, retry while it holds up to budget.retries, and fail explicitly rather than letting null reach an equality assertion."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "evals/shared/tests/fast-gate-precondition.test.mjs:84"
    finding: "replaceAll passes the gate command as a replacement string, where $& and friends are special; latent mangling for a future case containing one."
    suggested_action: "Use a replacer function so the value is inserted literally."
truncated_count: 0
```

## Recommended Actions

1. **CR-1** — wire the retry half of the spawn budget into `runCheck`. The suite is the heaviest
   spawn profile in the repo and the helper already ships in the module it imports.
2. **PC-1** — add `CHANGELOG.md` to §7.
3. **CR-2** — optional; a two-character change that removes a latent trap.

**Verdict rationale:** no `high` finding at any confidence, so not REQUEST CHANGES. One `medium`
finding (CR-1) puts this at **CONCERNS** per the deterministic table. Under the pipeline's Step 5c
routing, CONCERNS records findings without blocking and exits to Step 7 — it does not consume a QA
cycle.

---

## Disposition (recorded by the orchestrator, not by this review)

`/review-pr` is advisory and edits no code. The verdict above is computed on the findings **as
found**. The orchestrator then chose to act on all three before Step 7 rather than carry a known
flake-inducer in brand-new test code into `develop`:

| Finding | Action | Evidence |
|---|---|---|
| **CR-1** | Applied — `neverRan` imported alongside `spawnBudget`; `runCheck` retries while the child never ran, up to `budget.retries`, then fails with an explicit message naming the env knob | **Mutation-proved**: pointing `spawnSync` at a nonexistent shell turns 9 of 11 tests red, each carrying *"child never produced an answer"* rather than a false behavioural claim. The 2 that stay green are the non-spawning structural tests. |
| **CR-2** | Applied — `replaceAll(PLACEHOLDER, () => gateCommand)` | A replacer function inserts the value literally; `$&` and friends can no longer be interpreted. |
| **PC-1** | Applied — `CHANGELOG.md` added to §7 Files Summary | `git diff --name-only` now fully accounted for. |

> **A first mutation attempt on CR-1 was discarded as a false GREEN, and that is worth recording.**
> Replacing `if (!neverRan(r)) break;` with `if (false) break;` left the suite green — but it only
> removed the early exit, so the final attempt still returned a real result and the guard correctly
> did not fire. The mutant survived because it never changed the value under test, which is the
> *"wrong thing mutated"* row of `mutation-proving.md`, not evidence of a vacuous assertion. The
> second mutation targeted the actual property and killed it.
