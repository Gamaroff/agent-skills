# QA Report: Task 87 — Shell commands in table cells escape the snippet-execution gate (Cycle 2)

**Task**: [task.87.execute-table-cell-snippets.md](./task.87.execute-table-cell-snippets.md)
**Gate File**: [task.87.gate.2.execute-table-cell-snippets.yml](./task.87.gate.2.execute-table-cell-snippets.yml)
**Previous Cycle**: [task.87.qa.1.execute-table-cell-snippets.md](./task.87.qa.1.execute-table-cell-snippets.md) — CONCERNS (90/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: PASS

---

## Executive Summary

Cycle 1's finding is fixed and verified. The refute pass then did the job it exists for: it found
**TASK87-002, a regression introduced by cycle 1's own fix**, and it caught a **vacuous test** of mine
that had passed under the exact mutation it claimed to guard. Both are closed. Seven mutations are now
red, 127/127 tests pass, and the corpus surface is unchanged.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

**Cycle 2 is the refute pass** — `PRIOR_GATES=1`, so the scope is the **whole branch diff**, reviewed
to refute rather than to confirm. `SAFETY_REPROBE` evaluated to **false**: gate 1's security axis read
`OK measured`, which is a clean reading, so the surface was not re-enumerated from scratch.

**Re-review scope: unscoped (cycle 2 refute pass — whole `origin/develop...HEAD` diff, 17 files).**

Two deliberate deviations, both recorded:

- Step 3b's Explore subagent is prohibited in this session, so the refute pass was conducted inline by
  **executing seven probes** against the module. This is what found TASK87-002; reading the diff would
  not have, because the defect lives in the interaction between two escape mechanisms.
- The traceability mapper remains skipped by its own `HAS_SUCCESS_CRITERIA_TABLE=false` condition.

The refute directive's four transition classes were translated to a pure text extractor rather than
skipped as inapplicable:

| Directive's class | Translation | Result |
| ----------------- | ----------- | ------ |
| Bulk teardown | End of input — a span still open at end of line | Fallback fires; mutation-proven (E) |
| In-flight | `spanLen` carried across characters; does it leak between rows? | Fresh per row; two calls byte-identical (probe R7) |
| Error path | Six pathological inputs — does it throw or hang? | None threw; slowest 4ms |
| Reconnect | Re-entrancy on the shared module regex and the splitter | Stable across repeated calls |

---

## Re-Review Context — status of every cycle-1 finding

| Cycle 1 finding | Status | Verification |
| --------------- | ------ | ------------ |
| **TASK87-001** (MEDIUM) — command dropped when a sibling cell has an unescaped pipe | **FIXED** | `splitTableRow("\| \`a\|b\` \| \`echo shifted\` \|")` → `["\`a\|b\`", "\`echo shifted\`"]`; the command extracts. Mutation D (code-span awareness off) → 5 fail |
| LOW — unequal backtick run truncates the span | **DOCUMENTED** (accepted) | Stated in rule doc §1a; no corpus instance |
| LOW — blockquoted table not recognised | **DOCUMENTED** (accepted) | Stated in rule doc §1a; no corpus instance |
| Cleanup — `column` set and never read | **FIXED** | Carried into `results[]`; report prints `line 79 (table cell: Verification command)` — verified against the real target file |
| Cleanup — stdout finding silent about a simultaneous status divergence | **FIXED** | Detail now appends `; exit status also differs (bash 2, zsh 0)` |

---

## New Findings This Cycle

Two, and both are the refute pass earning its cost.

- **[medium/high]** `shared/resources/qa-execute-snippets.mjs` — **TASK87-002, a regression introduced
  by cycle 1's fix.** An *escaped* backtick was read as a code-span delimiter. Two of them in one row
  (`| a \` b | c \` d |`) therefore opened and closed a span, the real delimiter between them became
  content, and the whole row collapsed to a **single cell** — `["a \` b | c \` d"]`. A command column
  in such a row does not exist, so its command was dropped in silence: the same class of defect as
  TASK87-001, reintroduced by the fix for TASK87-001.
  → **FIXED**: the escape branch now consumes `\`` as literal content when no span is open. The guard
  is `spanLen === 0` rather than unconditional because markdown's rule is asymmetric — inside a code
  span a backslash is literal, so a backtick there still counts toward the closing run.
  **Reachability, stated honestly**: no in-scope corpus file (`SKILL.md` / `shared/resources/*.md`)
  currently writes an escaped backtick in a table row, but **5 markdown files in the repo already do**,
  and the engine accepts any `--file` path. Not hypothetical, not currently firing.

- **[low/high]** `shared/resources/tests/qa-execute-snippets.test.mjs` — **a vacuous test**, mine, from
  cycle 1's fix. `splitTableRow("| x | \`a \` | y |")` was asserted as proof of the `spanLen === 0`
  guard, and **it passed with the guard removed**: dropping the guard leaves the span open to end of
  line, the unclosed-span fallback fires, and the fallback's naive split happens to give the same
  cells. The test reported coverage that was not there — the precise failure mode Step 3c exists to
  catch, in the suite I had just written.
  → **FIXED**: replaced with `splitTableRow("| x | \`a|b\` | y |")`, where the guarded reading *closes*
  the span (needing no fallback) and the unguarded one does not, so the two answers differ. Found by
  **brute-forcing short strings over `{| \` \\ a space}`** for a difference rather than by reasoning
  about which input ought to differ — the reasoning had already failed once.

---

## Mutation-Proof Spot Check (Step 3c) — the full matrix

Every behaviour this task added, reverted one at a time. Baseline **127 pass / 0 fail**.

| # | Reverted behaviour | Result |
| - | ------------------ | ------ |
| A | `executeFile` back to `extractBlocks` alone | **4 fail** |
| B | `unescapeCell` returns its input | **4 fail** |
| C | the `status` disagreement channel disabled | **2 fail** |
| D | code-span-aware splitting off | **5 fail** |
| E | the unclosed-span fallback removed | **1 fail** |
| F | the escaped-backtick branch removed | **2 fail** |
| G | the `spanLen === 0` guard dropped | **1 fail** |
| — | restored | **127 pass / 0 fail** |

`mutation-proven: yes` for all seven. Two notes on honesty:

- **G was `mutation-proven: no` on first attempt** and is the vacuous test above. It is reported as a
  finding rather than quietly fixed, because a cycle that silently repairs its own instrument reports
  a cleaner history than it earned.
- One batch attempt at B produced `pass 0 / fail 1` — a module-load failure from a malformed edit, not
  a clean mutation. It was re-run properly (4 fail). A broken mutation is not evidence, and recording
  it as one would have inflated the matrix.

---

## Success Criteria Verification

All 9 criteria met (8 from cycle 1, plus the criterion added when TASK87-001 was fixed).

| Criterion | Status |
| --------- | ------ |
| Table-cell command extracted, classified, executed under both shells | PASS |
| Task-77 predicate is a shell-disagreement finding (mutation proof) | PASS — mutation C |
| No change for fenced blocks on a document with no command column | PASS — asserted, and 98 pre-existing tests pass unmodified |
| `\|` unescaped before execution; one span = one unit | PASS — mutation B |
| `origin` on every result and visible in the report | PASS |
| `zero-blocks-executed` still fires when nothing runs | PASS — both directions pinned |
| Corpus surface measured and recorded | PASS — re-measured this cycle, unchanged |
| A pipe inside a code span is content, not a delimiter (TASK87-001) | PASS — mutations D, E |
| Full `npm run ci` green | PASS — `CI_EXIT=0`, 2983/0 with `eval:all` |

---

## Corpus Re-measurement

Re-run after both fixes. **Unchanged: 4 files, 42 blocks, 0 findings.**

| File | blocks | findings |
| ---- | ------ | -------- |
| `shared/resources/develop-pipeline-resume-contract.md` | 26 | 0 |
| `skills/observe-work/SKILL.md` | 15 | 0 |
| `skills/use-railway/SKILL.md` | 11 | 0 |
| `shared/resources/observation-log-contract.md` | 5 | 0 |

Neither fix widened the surface: no corpus document has an unescaped pipe or an escaped backtick in a
command-column row. Both are protective going forward. **A fix that widens the surface and one that
does not are different risks, and saying which is which is the point of re-measuring rather than
assuming the first measurement still holds.**

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| 98 pre-existing engine tests | PASS, unmodified |
| Repo-wide fast gate | PASS — see gate 2 |
| Five other skills' bundled engine copies | PASS — each loads and reports identically |
| Bundled-copy fidelity | All 6 differ from source only by the AUTO-GENERATED banner |
| Scale | 5000-row document → 5000 blocks in 22ms |
| Pathological input | 6 inputs, none threw, slowest 4ms |

---

## NFR Assessment

### Security — PASS (`evidence: measured`, 14 probes)

Seven cycle-1 probes plus seven refute-pass probes, all executed. The safety boundary is still
untouched by this diff. The new code executes strictly more shell than before, which is why the
boundary was probed rather than asserted in both cycles.

### Performance — PASS

One integer of extra state; each character consumed once. 5000 rows in 22ms.

### Reliability — PASS

Two independent fallbacks (unclosed-span detection, then the naive split), both mutation-proven. Six
pathological inputs neither threw nor hung.

### Maintainability — PASS

Both gate-1 cleanups done rather than deferred. Every GFM divergence carries the incident that
produced it. The rule doc documents the code-span rule, the escaped-backtick guard, the fallback and
the two accepted limitations.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: `top_issues[]` is empty. Both new findings were fixed inside this cycle and each is
mutation-proven. All four NFR axes PASS, all 9 success criteria met, corpus surface unchanged.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c `/review-pr` — the loop's exit gate.
