# QA Report: Task 85 — Give `/review-pr` a machine-readable findings block

**Task**: [task.85.review-pr-machine-readable-findings.md](./task.85.review-pr-machine-readable-findings.md)
**Gate File**: [task.85.gate.1.review-pr-machine-readable-findings.yml](./task.85.gate.1.review-pr-machine-readable-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: FAIL

---

## Executive Summary

The emitter half of this task is in good shape: the block is specified precisely, the fence-nesting
hazard it introduced was caught and fixed, and every new assertion was mutation-proven. The **consumer**
half is not. The ingester's block-to-output mapping — the exact contract this task exists to make
deterministic — contains a sentence that contradicts itself and omits a destination for three of the
seven block fields. Shipping it would replace "an LLM matching a described text format" with "an LLM
resolving a contradictory field mapping", which is the same class of defect one layer along.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (rewritten to the 11-section template at Step 2)
- [x] All implementation phases completed and ticked
- [x] Tests passing — `npm run ci:fast`, 2965 tests, 0 failures
- [x] Breaking changes documented (§5: none — the change is additive)
- [x] Code on feature branch with open PR — #363, OPEN

### Testing Approach

- [x] Automated Testing (contract tests)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (Step 3b)
- [x] Documented-command execution (Step 4b)

### Review Methodology

Direct tools. The Adaptive Review Strategy's "small task" row applies — 3 phases, Low risk — and
this repository's standing instruction bars dispatching the Agent tool unless the user asks, so the
Step 3b diff review was performed **inline over the patch** rather than by an Explore subagent. That
substitution is recorded rather than left implied: a single reviewer read the whole
`origin/develop...HEAD` diff adversarially. First review — no prior gate, so no re-review scope
decision and no refute pass.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 — Emit the block from `/review-pr` | PASS | Verified | Section, yaml fence, schema, normalisation rule and empty-emit rule all present. The nested-fence defect (the inner ```` ```yaml ```` closed the outer ```` ```markdown ```` early, pushing `## Recommended Actions` out of the template) was found and fixed during implementation — see TASK85-002 for what it left behind |
| Phase 2 — Teach the ingester to prefer the block | **CONCERNS** | Partial | Preference, fallback and re-scoped `severity:` warning are all correct. The **mapping** is not — TASK85-001 |
| Phase 3 — Re-pin the contract | PASS | Verified | 3 new tests, 25/25 green; the old assertion that would have stayed green on a false sentence is replaced and its inverse forbidden |

**Overall Phase Completion**: 2/3 phases clean; Phase 2 has one HIGH finding.

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status |
| --- | --- | --- | --- | --- |
| 1 | Report carries rendered findings **and** a `yaml` block | both | both | PASS |
| 2 | Section emitted even when empty (`findings: []`) | stated + pinned | stated + pinned (M7) | PASS |
| 3 | Block carries `ref` for both lenses, `CR-*` from `file_line` | stated + pinned | stated + pinned (M5, M6) | PASS |
| 4 | Ingester prefers the block, states precedence, parses legacy | all three | all three | PASS |
| 5 | `severity:` warning scoped to the rendered shape and true of a block-carrying report | scoped | scoped (M10) | PASS |
| 6 | `task.66.pr-review.1` still parses via the fallback, asserted | asserted | asserted (M12) | PASS |
| 7 | Each new assertion mutation-proven | all | 13/13 | PASS |
| 8 | `npm run bundle` run, regenerated copies committed | yes | yes — 1 consumer | PASS |
| 9 | `/review-pr` advisory contract unchanged | unchanged | unchanged — no gate, no `gh pr review`, no code edits | PASS |
| 10 | Full `npm run ci` green | green | **`ci:fast` green; `eval:all` not yet run** (merge-gate tier, by design) | PARTIAL |

Criterion 4 is marked PASS on its literal wording — the ingester *does* prefer the block and *does*
retain the fallback. TASK85-001 is a defect in **how** it maps what it reads, which criterion 4 does
not cover. That gap is itself worth noting: the success criteria never required the mapping to be
unambiguous, which is how a contradictory mapping could satisfy every box.

---

## Breaking Changes Validation

### Breaking Change: none declared

Documented: Yes (§5 states none, with the reasoning)
Migration Path Provided: N/A
Migration Tested: N/A
Consumer Code Updated: N/A

**Verified independently rather than accepted:** the rendered sections are byte-identical in the diff,
the verdict table and 5c routing are untouched, and the one real legacy report on disk is asserted to
still match the fallback shape. The claim holds.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: The ingester's block-to-output mapping is self-contradictory and incomplete**

- **Severity**: HIGH
- **Category**: Quality / Functional
- **Location**: `shared/resources/qa-findings-ingester-prompt.md:58-60`
- **Observation**: One sentence reads: *"`severity` and `suggested_action` carry across by name;
  `finding` becomes `description`; `suggested_action` becomes `suggested_fix_path`; `source` is
  `pr-review`."* `suggested_action` is claimed both to carry across **by name** and to **become**
  `suggested_fix_path`. Only one can be true, and the output schema (same file, `## Output Schema`)
  defines no `suggested_action` key at all — so the "by name" half names a field that does not exist.
  Separately, three of the block's seven fields — `id`, `category`, `confidence` — are given no
  destination, and the output schema's `id` is `F{n}` while the block's are `PC-*` / `CR-*`, so even
  `id` is not the straight copy "map each entry straight onto" implies.
- **Impact**: This is the consumer half of the contract the task exists to make deterministic. A
  reader resolving the contradiction by judgement is exactly the failure mode §2 of the task
  describes; the block would carry typed fields to an ingester that then guesses where to put them.
- **Recommendation**: Replace the prose with an explicit per-field mapping table covering all seven
  block fields, naming a destination or an explicit drop for each.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: The template's yaml block uses literal example values under "use this exact template structure"**

- **Severity**: MEDIUM
- **Category**: Quality
- **Location**: `skills/review-pr/SKILL.md:364-380`
- **Observation**: Every other section of the Step 7 template uses brace placeholders —
  `{rendered PC-* findings, or "None."}`, `{AC-1 text}`, `{highest-priority action}`. The new yaml
  block instead uses concrete literals (`id: PC-1`, `category: coverage`, `ref: "AC-3"`,
  `severity: high`) mixed with angle-bracket placeholders. The template is introduced with **"ALWAYS
  use this exact template structure"**.
- **Impact**: An agent following that instruction literally could emit `ref: "AC-3"` into a report
  whose findings have nothing to do with AC-3 — and because the block is the machine-readable path,
  a wrong `ref` there is consumed rather than merely read.
- **Recommendation**: Use the template's own brace convention, or label the block as illustrative.
- **Priority**: P2

### LOW Severity Issues (1)

**`truncated_count` semantics.** "Add the block's `truncated_count` to your own" conflicts with the
output schema's own comment for that field (*"set >0 if raw findings exceeded 20"*), which describes
the ingester's own cap. Summing them silently redefines the field. Documented here only; no bug file.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS

No runtime code. Three assertions added to an existing test file; `npm run ci:fast` completed in its
usual envelope (prettier + 2965 tests).

### Reliability — PASS

Additive change; the legacy fallback is preserved **and** pinned against a real pre-block report
rather than a synthetic fixture, so the recovery path has an actual file exercising it. Rollback is a
single revert plus `npm run bundle`, with no migration and no state to unwind.

### Security — PASS

- **Status**: PASS
- **Evidence**: `reasoned`
- **Probes executed**: 0
- Documentation and contract-test change only: no executable code, no new inputs, no auth, network or
  data surface. The single shell block executed in Step 4b is a read-only `find` over a local
  directory. The verdict was reached by reading rather than by executing hostile candidates, so
  `reasoned` is the accurate value — recording `measured` here with zero probes would be a schema
  error, and recording it falsely is the failure this field exists to prevent.

### Maintainability — CONCERNS

The emitter half is unusually well documented — each of the four block rules states the way it goes
wrong, and the fence hazard is recorded where the next editor will hit it. The ingester half is the
opposite: TASK85-001 leaves a mapping a careful reader cannot follow, in the file whose readability
*is* the deliverable.

---

## Code Review

Step 3b, performed inline over `origin/develop...HEAD` (see Review Methodology). Blocking resolved
`CR_BLOCKING=true` — run-level override `code_review_blocking=true` from the pipeline, no
`code_review_blocking: false` in the task frontmatter.

**Correctness bugs (2):**

- [high/high] `shared/resources/qa-findings-ingester-prompt.md:58` — the block-to-output mapping
  contradicts itself (`suggested_action` both carries by name and becomes `suggested_fix_path`; the
  output schema has no `suggested_action`) and omits destinations for `id`, `category`, `confidence`
  → replace with an explicit per-field mapping table.
  **Promoted to gate `top_issues[]` as TASK85-001.**
- [medium/high] `skills/review-pr/SKILL.md:364` — literal example values inside a template introduced
  as "ALWAYS use this exact template structure", against the brace convention every sibling section
  uses → adopt the brace convention or mark the block illustrative.
  **Promoted to gate `top_issues[]` as TASK85-002.**

**Cleanups (1):**

- `shared/resources/qa-findings-ingester-prompt.md:63` — `truncated_count` summing conflicts with the
  field's own schema comment → state the intended meaning at the field.

**One candidate was dropped after checking its premise.** A draft finding claimed the assertion
`assert.match(reviewPr, /findings: \[\]/)` was weaker than its message because the string might also
occur inside the template's yaml block. `grep -n 'findings: \[\]' skills/review-pr/SKILL.md` returns
exactly one line — 400, the always-emit bullet — so the assertion is in fact scoped to the rule it
names. Recorded because a finding that survives only until someone checks it is noise, and the check
is cheap.

### Mutation-proof spot check (Step 3c)

13 mutations run by the developer during Phase 3 and re-read here against the test file. All 13 go
red when the behaviour is reverted; the table is in the implementation report. `mutation-proven: yes`
for every assertion added this cycle.

One entry is worth carrying into this report because it changes how the table should be read: **M5
first reported STILL GREEN and that reading was wrong** — the mutation had not applied, because the
sentence occurs twice and wraps at a different word each time. It went red once the mutation actually
landed. Every row is reported with a before/after occurrence count for that reason.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `evals/shared/tests/pr-review-loop-parity.test.mjs` (25 tests) | PASS — the 22 pre-existing assertions still hold alongside the 3 new ones |
| `skills/review-pr/tests/review-pr.test.js` (52 tests) | PASS |
| Full `npm test` (2965 tests) | PASS — 0 failures, 1 pre-existing skip |
| `prettier --check .` | PASS |
| Bundled consumers of the ingester prompt | 1 (`skills/qa-fix/references/`), regenerated and in sync |
| `/review-pr` advisory contract | Unchanged — no gate write, no `gh pr review --approve`, no code edits |

---

## Test Artifacts

### Files Reviewed

- `skills/review-pr/SKILL.md` (Steps 6, 7)
- `shared/resources/qa-findings-ingester-prompt.md` + its bundled copy
- `evals/shared/tests/pr-review-loop-parity.test.mjs`
- `skills/review-pr/tests/review-pr.test.js`
- `shared/resources/code-review-prompt.md`, `shared/resources/pr-conformance-prompt.md` (the two
  subagent schemas — read to verify the `ref` / `file_line` claim independently)
- `docs/tasks/task.66.review-pr/task.66.pr-review.1.review-pr.md` (legacy fixture)

### Test Commands Executed

```bash
npm run ci:fast
node --test evals/shared/tests/pr-review-loop-parity.test.mjs
node --test skills/review-pr/tests/review-pr.test.js
node skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-pr/SKILL.md --json
```

### Step 4b — Documented-command execution

13 fenced `bash` blocks found in the changed `skills/review-pr/SKILL.md`. Shells: bash **and** zsh
(zsh available).

| Classification | Count | Detail |
| --- | --- | --- |
| runnable | 1 | line 164 — the paper-trail `find` loop |
| placeholder | 0 | after binding |
| mutating (refused by design) | 12 | write-redirection ×5, deny-list ×4, unrecognised-command ×3 (`gh`, `curl`, `python3`, `git branch`) |

The one runnable block executes **clean in both shells** — exit 0, byte-identical stdout, correctly
listing the implementation and review reports while excluding `.pr-review.`.

> **The first probe reported an `execution-failure` (high) in both shells, and it was wrong.** The
> engine was correct to report exit 1; the cause was the probe's own configuration — `DOC_FILE` was
> bound to a repo-relative path while `--copy` places the directory's *contents* at the temp root, so
> `dirname` yielded a directory that does not exist there and `find` exited 1 with stderr suppressed.
> Re-bound relative to the copied root, the block passes. Recorded rather than quietly corrected,
> because an execution failure reported in both shells identically is exactly the shape of a genuine
> finding, and the only thing separating it from one was checking the instrument before believing it.

No Step 4b findings. The 12 refusals are the expected `no-executable-blocks` shape for this file —
it documents `gh`, `curl` and write-redirections because that is what the skill does, and no
configuration will make them runnable.

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK85-001 (P1)** — replace the block-to-output mapping prose with an explicit per-field table.
2. **TASK85-002 (P2)** — align the template yaml block with the template's placeholder convention.

### Short-term Actions (Non-Blocking)

1. **TASK85-003** — state `truncated_count`'s intended meaning at the field.
2. Consider adding a success criterion requiring the mapping to be unambiguous — the current set can
   be fully satisfied by a contradictory mapping, which is how TASK85-001 reached QA.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH-severity finding in the consumer half of the contract. Deterministic rule 1
applies: any `top_issues.severity == high` → FAIL. The emitter, the tests and the mutation proof are
all sound; the mapping is not, and the mapping is the half that decides whether a finding reaches
`/qa-fix` intact.
**Quality Score**: 70/100 — 100 − 20 (1 HIGH) − 10 (1 MEDIUM); the LOW is not deducted. Stated
explicitly because the schema's NFR-based formula would return 100 here, which would contradict the
gate.

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK85-001 resolved.

---

**Next Steps**: `/qa-fix` addresses TASK85-001 and TASK85-002 (and TASK85-003 opportunistically),
then re-review.
