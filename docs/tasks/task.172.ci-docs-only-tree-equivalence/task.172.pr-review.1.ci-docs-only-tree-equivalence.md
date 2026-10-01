# PR Review Report: PR #543 — feat(task.172): one docs-only CI rule at every pipeline CI wait

**Reviewed:** 2026-10-01
**PR:** [#543](https://github.com/Gamaroff/agent-skills/pull/543) — `feature/task.172.ci-docs-only-tree-equivalence` → `develop` (OPEN)
**Work item:** [`task.172.ci-docs-only-tree-equivalence.md`](./task.172.ci-docs-only-tree-equivalence.md) — resolved via `branch-stem`
**Tracker:** [#539](https://github.com/Gamaroff/agent-skills/issues/539) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: the whole PR against `develop` (about 8,700 lines) with the generated `skills/*/references/*` copies excluded (byte copies of `shared/resources/` sources plus one `AUTO-GENERATED` header line; none is named as a deliberate change in the work item, the PR body or a commit subject). Run at `--effort medium` after QA cycle 7 (gate 7 PASS 95, reached through the Cosmetic-residue exit). The code lens was pointed at the parts of the PR the seven QA cycles reviewed least (the 6c poll, the Bitbucket path, `checkCommand`, the glob matcher, the moved `bb-auth.js`, the two evals tests); it did not read the bulk of the engine's test file or the QA documents. Both lenses ran as dispatched read-only subagents (conformance about 70 s, code about 4.5 minutes).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.172.implementation.1.ci-docs-only-tree-equivalence-initial-run.md` |
| Review report | ✅ | `task.172.review.1.ci-docs-only-tree-equivalence.md` |
| QA reports | 7 | `task.172.qa.1` to `task.172.qa.7` |
| Gate | PASS | `task.172.gate.7.ci-docs-only-tree-equivalence.yml` (95) |
| DoD | ❌ | not expected yet: the work item is `ready-for-review`, `/finalise` has not run |
| Sprint review | ❌ | not expected yet |
| Open bugs | 25 | `task.172.bug.1` to `task.172.bug.25`, each `Ready for QA`; gate 7 verified the last two |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

The conformance lens returned no coverage finding. Gate 7 records phases 4/4 verified, 93 engine tests passing under both temp values, and every new test mutation-proved red on revert (QA reports 6 and 7). This report does not restate a per-criterion table: the lens was not asked for one and the Success Criteria checkboxes in the work item are all still unticked, which `/finalise` is the step that reconciles.

| Criterion group | Evidence | Status |
|---|---|---|
| Functional (4 sites, FAILURE never equivalent, code-changed, Bitbucket 403, opt-out) | gate 7 phases 1 to 4; engine tests | ✅ met per gate 7; not re-derived here |
| Performance (no pre-engine sleep, bounded ancestor reads) | gate 7 performance PASS | ✅ met per gate 7 |
| Code quality (mutation proofs, `npm run ci`, validate, bundle) | QA 6 and 7; cycle 6 fast gate 4,906 of 4,909 (two load-sensitive file-time budgets) | ⚠️ partial: `npm run ci` is read once, at `/finalise` |
| Migration (CHANGELOG, `configuration.md`) | both edited in the PR | ✅ present |

## Conformance Findings

[PC-1] trail · low · confidence: medium — bug reports 24 and 25, line 7 `**Status**: ✅ Ready for QA`
  Bugs 24 and 25 still read "Ready for QA" although gate 7 and QA report 7 mark CR6-1 and CR6-2 as fixed and mutation-proven; bugs 1 to 23 carry the same status, whereas earlier tasks' bugs read "Closed".
  → Close the 25 bug reports (or have `/finalise` close them) now that gate 7 has verified the fixes, so no bug is left open beside a PASS gate.

[PC-2] consistency · low · confidence: medium — `task.172.ci-docs-only-tree-equivalence.md` Change Log rows
  The Change Log has no "QA findings fixed" row for cycle 5 (fix commit `e5547550`), although cycles 1 to 4 and 6 each have one.
  → Add the missing qa-fix row for the cycle 5 fixes (CR5-1 to CR5-3) so the Change Log matches the six fix commits.

[PC-3] scope · low · confidence: medium — work item §4 In Scope and §7 Files Summary
  The diff adds `bb-auth.js`, edits `pr-inline-comment.js`, adds the `_dedent.mjs` test helper and edits three existing test files, none of which the Files Summary lists; it also documents two config keys (`settleSeconds`, `checkTimeoutSeconds`) beyond the three the work item promises, while Phase 4 and the Success Criteria still say "three keys".
  → Record the `bb-auth.js` extraction and the two extra config keys as in-scope amendments in the work item (Files Summary, Phase 4, Success Criteria); the plan and implementation report already justify them, so no code change is needed.

## Code Review Findings

[CR-1] bug · medium · confidence: high — `shared/resources/ci-tree-equivalence.js:890`
  The `checkCommand` timeout kills only the `sh -c` process with SIGKILL, so a check such as `npm run ci:fast && npm run eval:all` leaves its child processes running after the engine reports check-failed (measured: `sleep 37` survived with ppid 1), and those orphans keep running against the working tree while the poll or caller moves on.
  → Spawn the check in its own process group (detached) and kill the whole group on timeout, or wrap it with a timeout utility that signals descendants.

[CR-2] bug · medium · confidence: medium — `skills/finalise/SKILL.md:797`
  `CI_CHECKS_1` is counted from the rollup read before the docs-only arm runs, so when reading 1 is satisfied by tree-equivalence it holds the check count of the unfinished head (possibly 0 or a few fast lanes), and that count is passed to the 6c poll as the `EXPECTED_CHECKS` floor, which weakens the partial-rollup guard for reading 2.
  → When `CI_TREE_EQ` is set, record the green ancestor's check count (or leave the floor at a count taken from a settled rollup) instead of the pending head's count, and say so beside the `CI_CHECKS_1` read.

[CR-4] bug · medium · confidence: low — `shared/resources/ci-tree-equivalence.js:886`
  The engine pins the commit to HEAD but never checks that the working tree is clean, so `checkCommand` runs against uncommitted or untracked state (Step 6 normally runs with the DoD summary uncommitted, and the 6c poll keeps running while later turns edit files), and a green check can describe a tree other than the commit it is recorded against.
  → Refuse to run the check (reason `unverifiable`) when `git status --porcelain` is non-empty, or run it in a clean checkout of the head.

[CR-3] bug · low · confidence: low — `skills/finalise/SKILL.md:2645`
  The Step 8a retake of CI reading 1 re-runs the Step 6 rollup through the background poll, which can now conclude `SUCCESS ... TREE_EQ=<sha>`, but its record template `CI reading 1 (fix head): {CI_ROLLUP} @ {CI_HEAD_1}` and the 8a checklist have no tree-equivalent clause, so this site can write plain SUCCESS for a docs-only reading, which is the record the change forbids elsewhere.
  → Add the `(tree-equivalent to {sha})` form to the 8a retake record and checklist line, or state that the retake poll runs without the engine.

[CR-5] bug · low · confidence: medium — `skills/finalise/SKILL.md:1498`
  The poll's engine call discards stderr (`2>/dev/null`) and latches only on a JSON reason, so a usage error (exit 2: malformed `ci.docsOnly` config, or `--head` not the checked-out HEAD) is invisible in `finalise-ci-poll.log` and is silently re-run every 30 s for the whole wait.
  → Append the engine's stderr to the poll log, and latch (or at least log once) when the exit code is 2.

[CR-6] cleanup · low · confidence: medium — `tests/unbound-default-reads.test.js:52`
  The scan is file-wide (`isBound`) and its read regex requires a colon, so all six new INPUTS entries are dead (each is bound by another fence in the same file, so the test would pass without them), the per-block hazard they claim to guard is not checked, and the colon-less `${CI_TREE_EQ?…}` guards in finalise Step 7 are never scanned.
  → Drop the redundant INPUTS entries (or add a per-block binding check), and widen the regex to cover the `${NAME?word}` form.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "task.172.bug.24 and task.172.bug.25, line 7 Status: Ready for QA"
    finding: "Bugs 24 and 25 still read Ready for QA although gate 7 and qa.7 mark CR6-1 and CR6-2 as fixed and mutation-proven; bugs 1 to 23 carry the same stale status."
    suggested_action: "Close the 25 bug reports, or have /finalise close them, now that gate 7 has verified the fixes."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "task.172.ci-docs-only-tree-equivalence.md Change Log rows"
    finding: "The Change Log has no QA findings fixed row for cycle 5 (fix commit e5547550), although cycles 1 to 4 and 6 each have one."
    suggested_action: "Add the missing qa-fix row for the cycle 5 fixes so the Change Log matches the fix commits."
  - id: PC-3
    category: scope
    severity: low
    confidence: medium
    ref: "task.172.ci-docs-only-tree-equivalence.md section 4 In Scope and section 7 Files Summary"
    finding: "The diff adds bb-auth.js, edits pr-inline-comment.js, adds the _dedent.mjs helper, edits three existing tests and documents two config keys beyond the three promised; none is in the Files Summary."
    suggested_action: "Record these as in-scope amendments in the work item; no code change is needed."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/ci-tree-equivalence.js:890"
    finding: "The checkCommand timeout kills only the sh -c process, so child processes of the check survive after check-failed and keep running against the working tree."
    suggested_action: "Spawn the check in its own process group and kill the whole group on timeout."
  - id: CR-2
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/finalise/SKILL.md:797"
    finding: "CI_CHECKS_1 is counted before the docs-only arm runs, so a tree-equivalent reading 1 passes the unfinished head's check count to the 6c poll as its EXPECTED_CHECKS floor."
    suggested_action: "When CI_TREE_EQ is set, record the green ancestor's check count or leave the floor at a settled count."
  - id: CR-4
    category: bug
    severity: medium
    confidence: low
    ref: "shared/resources/ci-tree-equivalence.js:886"
    finding: "The engine pins the commit to HEAD but never checks the working tree is clean, so checkCommand can run against uncommitted state and a green check can describe a different tree."
    suggested_action: "Refuse to run the check when the working tree is dirty, or run it in a clean checkout of the head."
  - id: CR-3
    category: bug
    severity: low
    confidence: low
    ref: "skills/finalise/SKILL.md:2645"
    finding: "The Step 8a retake record template and checklist have no tree-equivalent clause, so that site can write plain SUCCESS for a docs-only reading."
    suggested_action: "Add the tree-equivalent form to the 8a retake record, or state the retake poll runs without the engine."
  - id: CR-5
    category: bug
    severity: low
    confidence: medium
    ref: "skills/finalise/SKILL.md:1498"
    finding: "The poll discards the engine's stderr and does not latch exit 2, so a usage error is invisible in the poll log and re-run every 30 s."
    suggested_action: "Append the engine's stderr to the poll log and log or latch an exit 2."
  - id: CR-6
    category: cleanup
    severity: low
    confidence: medium
    ref: "tests/unbound-default-reads.test.js:52"
    finding: "The six new INPUTS entries are dead because the scan is file-wide and requires a colon, and the colon-less guards in finalise Step 7 are never scanned."
    suggested_action: "Drop the redundant entries or add a per-block binding check, and widen the read regex."
truncated_count: 0
```

## Recommended Actions

1. Decide CR-1 and CR-4 before relying on `checkCommand` to be a bounded, clean-tree check: both concern what `ci.docsOnly.checkCommand` (this repository sets `npm run ci:fast && npm run eval:all`) does when it runs inside `/finalise`. They can be fixed in a follow-up task if `/finalise` is allowed to proceed.
2. Check CR-2 against `/finalise` Step 6a before accepting a tree-equivalent reading 1: if the floor is the unfinished head's count, reading 2's partial-rollup guard is weaker than the prose says.
3. Close the bug reports and add the missing cycle 5 Change Log row (PC-1, PC-2); record the scope amendments in the work item (PC-3).
4. CR-3, CR-5, CR-6 are advisory.
