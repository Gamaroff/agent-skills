# QA Report: Task 87 — Shell commands in table cells escape the snippet-execution gate

**Task**: [task.87.execute-table-cell-snippets.md](./task.87.execute-table-cell-snippets.md)
**Gate File**: [task.87.gate.1.execute-table-cell-snippets.yml](./task.87.gate.1.execute-table-cell-snippets.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are complete and the work is substantially correct: 117/117 tests green, the mutation
proof performed three separate ways, the full `npm run ci` tier passing including `eval:all`, and a
corpus measurement showing the change adds 42 blocks across 4 files and **zero** new findings. Seven
adversarial probes were executed against the new extractor rather than reasoned about, and one of them
found a real defect.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK87-001 first

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (11 mandatory sections present after the Step 2 review)
- [x] All 4 implementation phases marked complete
- [x] Tests passing — 117/117 focused, 2983/0 repo-wide
- [x] Breaking changes documented (§5 — none to the CLI, one intended behavioural change)
- [x] Code on feature branch with open PR #365

### Testing Approach

- [x] Automated Testing (unit + integration through `executeFile`)
- [x] Regression Testing (the 98 pre-existing tests, plus all five other bundled engine copies)
- [x] Security Review (7 executed probes — see NFR)
- [x] Code Review (Step 3b)
- [x] Runnable-prose execution (Step 4b)

### Review Methodology

**Direct tools.** 4 phases, one module, `risk_level: low` — the Adaptive Review Strategy's default
("direct tools first; spawn agents if gaps found") applies, and no gap emerged that agents would have
closed.

Two deliberate deviations from the written protocol, both recorded rather than silently taken:

- **Step 3b's Explore subagent was replaced by an inline adversarial pass.** This session's operating
  instructions prohibit calling the Agent tool unless the user requests it. The substitution is
  stronger than a prose review, not weaker: the pass was conducted by **executing** seven probes
  against the module and reading the results, rather than by reading the diff. TASK87-001 was found
  that way and would not have been found by reading.
- **The traceability mapper pre-step was skipped** by its own condition —
  `HAS_SUCCESS_CRITERIA_TABLE=false`. §9 is a checkbox list, not a table.

`code_review_blocking=true` received from the pipeline; the task carries no `code_review_blocking`
frontmatter key, so `CR_BLOCKING=true` resolves and `category: bug` + `confidence: high` findings
enter the gate.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1. Table-cell extraction | CONCERNS | Verified | `extractTableCellCommands`, `splitTableRow`, `unescapeCell` present and exported; table/fence/command-column recognition all behave as specified. **TASK87-001 lands here.** |
| 2. Wire into `executeFile` | PASS | Verified | Both streams merged and line-sorted; `origin` on every block, every `results[]` entry and every finding; `render()` annotates `line N (table cell)` and reports the cell count |
| 3. Tests and mutation proof | PASS | Verified | 19 tests added (98 → 117). Mutation proof independently re-confirmed below |
| 4. Rule doc, bundle, corpus | PASS | Verified | §1a and §3 written; all 6 bundled copies differ from source **only** by the AUTO-GENERATED banner (checked with `diff` per copy); corpus measured and recorded |

**Overall Phase Completion**: 3/4 PASS, 1 CONCERNS

---

## Code Review

Seven probes executed against `shared/resources/qa-execute-snippets.mjs`. Findings below; the probe
that produced each is named, because a finding whose provenance is "I read it" and one whose
provenance is "I ran it" are not the same claim.

**Correctness bugs (3):**

- **[medium/high]** `shared/resources/qa-execute-snippets.mjs` — a runnable command in a well-formed
  command-column cell is **silently dropped** when another cell in the same row carries an unescaped
  pipe inside a code span. Probe: `| \`a|b\` | \`echo shifted\` |` → `splitTableRow` returns
  `["\`a", "b\`", "\`echo shifted\`"]`, the command column index 1 reads `b\``, and `echo shifted`
  never reaches the classifier. The file then reports zero blocks, zero findings and no note —
  byte-identical to a document containing no commands. GFM does split an unescaped pipe this way, so
  the behaviour is spec-conformant for *rendering*; it is wrong for an engine whose entire purpose is
  to stop a command escaping unseen. → Track backtick state in `splitTableRow`. Promoted to gate
  `top_issues[]` as **TASK87-001**.
- **[low/high]** An unequal backtick run truncates the span. Probe: `` `echo a``b` `` extracts
  `echo a` and drops the rest. GFM's own code-span rules are ambiguous here and no corpus instance
  exists. → Advisory; note the limitation in §1a if not fixed.
- **[low/high]** A blockquoted table (`> | … | Verification command |`) is not recognised —
  `isTableRow` requires the trimmed line to start with `|`. Probe returns 0 extractions. The repo
  uses blockquotes heavily, though the corpus scan found no blockquoted command column. → Advisory.

**Cleanups (2):**

- `shared/resources/qa-execute-snippets.mjs` — the `column` field is set on every table-cell block and
  then never read: it is not carried into `results[]`, the rendered report, or any finding. Surface it
  or drop it.
- `shared/resources/qa-execute-snippets.mjs` — the disagreement check is `if (stdout) … else if
  (status)`, so a block that diverges on **both** reports only the stdout channel and its detail line
  ("printed 3 line(s), printed 0 line(s)") never mentions that the exit statuses also differ. The
  single-fire rule is deliberate and documented; naming both channels in the detail is free.

**Probes that found nothing, stated so the silence is auditable:**

| Probe | Result |
| ----- | ------ |
| `matchAll` `lastIndex` leaking across two calls on the shared module regex | Stable — identical output both calls |
| Two command columns in one table | Both read, each block carrying its own `column` |
| Body row with fewer cells than the header | No crash, no throw, no phantom block |
| Header-word boundary | `Command`, `Commands`, `Verification command` match; `Commanding officer` and `Recommended` correctly rejected |

### Mutation-proof spot check (Step 3c)

Independently re-run this cycle rather than taken from the implementation report. Baseline 117/0.

| Mutation | Reverted behaviour | Result | `mutation-proven` |
| -------- | ------------------ | ------ | ----------------- |
| A | `executeFile` back to `extractBlocks` alone | 2 fail | yes |
| B | `unescapeCell` returns its input | 3 fail | yes |
| C | the `status` disagreement channel disabled | 2 fail | yes |
| — | restored | 117 pass / 0 fail | — |

Three of three fixed behaviours are mutation-proven. The engine-independent premise also holds: in an
empty directory the task-77 predicate exits **2** under bash and **0** under zsh.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| A table-cell command is extracted, classified and executed under both shells | yes | yes — 22 extracted from the real target file; 1 runnable in the fixture executed under bash+zsh | PASS |
| The task-77 predicate, restored verbatim, is a shell-disagreement finding (mutation proof) | yes | yes — `channel: status`, `origin: table-cell`; mutation C proves the check fires | PASS |
| No change in behaviour for fenced blocks (document with no command column) | identical | identical — asserted by test, and all 98 pre-existing tests pass unmodified | PASS |
| `\|` unescaped before execution; one span = one unit | yes | yes — both tested, using the real cell text from the resume contract | PASS |
| `origin` on every `results[]` entry and visible in the report | yes | yes — tested; `render()` prints `line N (table cell)` | PASS |
| `zero-blocks-executed` still fires when nothing runs | yes | yes — and the inverse is pinned too (falls silent once a cell runs) | PASS |
| Corpus-wide finding surface measured and recorded | yes | yes — 182 files, 4 affected, 42 blocks, 0 new findings, before/after table in the report | PASS |
| Full `npm run ci` green | yes | `CI_EXIT=0`, 2983 pass / 0 fail, `eval:all` and `format:check` both ran | PASS |

**8/8 success criteria met.** TASK87-001 is not a criterion failure — it is a defect in a code path no
criterion names, found because the probes went past the criteria.

---

## Breaking Changes Validation

### Breaking Change: none to the CLI contract

Documented: Yes (§5) · Migration Path: N/A · Consumer Code Updated: N/A

`--file`, `--bind`, `--copy`, `--timeout`, `--no-zsh`, `--json` and the three exit codes are unchanged.
Verified by execution: all five other bundled engine copies still run and report identically
(`blocks=2 findings=0` on the rule doc, each).

### Intended behavioural change

A document with a command-column table now reports a higher `blocks` count. §5 states this and the
corpus measurement bounds it. One file's exit code moved **1 → 0** (`develop-pipeline-resume-contract.md`)
because two now-runnable cells falsify `zero-blocks-executed`'s premise; that guard is a coverage
statement, not a defect, and both halves of the resulting behaviour are pinned by tests. Verified
against a pre-change copy of the engine rather than inferred.

**Overall Breaking Changes Assessment**: PASS

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 7

The safety boundary is untouched by this diff — `SAFE_COMMANDS`, `COMMAND_RUNNERS`, the deny-list, the
sandbox sentinel and the temp working copy are unchanged, and the pre-existing tests that pin them all
pass. That mattered enough to probe rather than assert, because the change makes the engine execute
strictly *more* shell than before. Seven probes were executed (listed under Code Review). Every
extracted span still passes through `classifyBlock`, and the whitespace bound fails toward running
less, never toward running something unsafe.

### Performance — PASS

Extraction is one O(lines) pass plus a fence mask; 182 corpus files scanned in well under a second in
a single process. The change adds 2 runnable blocks across the entire tree, so execution cost is
effectively unchanged.

### Reliability — PASS

Rollback plan present and exercised in substance: reverting the extractor merge was performed three
times during the mutation proof, each time restoring fenced-only behaviour exactly. Malformed input
degrades rather than throws — probed with a short body row, a header with no delimiter row, and an
unterminated fence.

### Maintainability — PASS

Every non-obvious rule carries its reason tied to the incident that produced it. Rule doc §1a and §3
updated in the same change. Two cleanups noted, neither structural.

---

## Runnable-prose Execution (Step 4b)

The rule **fires**: the change set modifies `shared/resources/qa-runnable-prose-detection.md`, which
contains fenced bash blocks. Run through the *bundled* copy, so the shipped artifact is what was
exercised:

```
node .agents/skills/qa-task/references/qa-execute-snippets.mjs \
  --file shared/resources/qa-runnable-prose-detection.md --json
```

- Blocks found: **2** — 1 runnable, 0 placeholder, 1 mutating
- Shells: **bash + zsh** (`zshAvailable: true`)
- Skipped blocks, in full: `line 312 — mutating (write-redirection)`. Correct: the block writes a file
- Findings: **0**. Notes: **0**
- The engine ran against its own rule document and found no disagreement

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| 98 pre-existing engine tests | PASS, unmodified |
| Repo-wide suite | 2983 pass / 0 fail |
| `eval:all` + `format:check` | PASS (`CI_EXIT=0`) |
| Five other skills' bundled engine copies | PASS — each loads and reports identically |
| Bundled-copy fidelity | All 6 differ from source only by the AUTO-GENERATED banner |
| Corpus (182 files) | 4 affected, 0 new findings |

---

## Test Artifacts

### Files Reviewed

`shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`,
`shared/resources/qa-runnable-prose-detection.md`, the 6 bundled copies,
`shared/resources/develop-pipeline-resume-contract.md` (the real target).

### Test Commands Executed

```bash
node --test shared/resources/tests/qa-execute-snippets.test.mjs
npm run ci                       # CI_EXIT=0 — 2983 pass / 0 fail, eval:all included
node --test tests/test-harness-concurrency.test.js
```

### Coverage

No coverage instrumentation in this repo's Node test setup. Coverage is argued structurally instead:
19 tests cover extraction, wiring, both disagreement channels, the `zero-blocks-executed` interaction
in both directions, and the mutation proof — and three reverts confirm the tests can fail.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: a command is dropped when a sibling cell has an unescaped pipe**

- **Severity**: MEDIUM · **Category**: Functional · **Priority**: P2
- **Gate ref**: TASK87-001
- **Observation**: Reproduced by execution — see Code Review above
- **Impact**: A runnable command escapes the gate unseen, and the report is indistinguishable from a
  document with no commands. This is the silent-skip shape the whole engine exists to eliminate,
  reached through a different door
- **Recommendation**: Track backtick state in `splitTableRow`

No separate bug-report file: the finding is a code-review finding on the task's own change set,
carried in the gate's `top_issues[]` and fixed inside this pipeline's own qa-fix cycle. A `task.87.bug.N`
file would duplicate the gate entry and outlive it.

### LOW Severity Issues (2)

Unequal-backtick truncation; blockquoted tables unrecognised. Both documented above, neither with a
corpus instance.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## Recommendations

### Immediate (Blocking)

1. Fix TASK87-001 and add a test using the reproduced row.

### Short-term (Non-blocking)

1. Surface or drop the unused `column` field.
2. Name both channels in the detail when stdout and exit status both diverge.
3. Decide on blockquoted tables and on unequal-backtick spans — fix, or state as limitations in §1a.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One demonstrated MEDIUM defect with `confidence: high` enters `top_issues[]` under
`code_review_blocking`, so deterministic rule 2 applies. Everything else passes, including all four
NFR axes and all 8 success criteria.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL — TASK87-001 fixed and covered by a test.

---

**Next Steps**: `/qa-fix` on TASK87-001, then re-review.
