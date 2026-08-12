# QA Report: Task 40 — Wire `gh-stage.js` into the pipeline step files

**Task**: [task.40.github-pipeline-step-wiring.md](./task.40.github-pipeline-step-wiring.md)
**Gate File**: [task.40.gate.1.github-pipeline-step-wiring.yml](./task.40.gate.1.github-pipeline-step-wiring.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-12
**PR**: [#207](https://github.com/Gamaroff/agent-skills/pull/207) (OPEN)
**Gate Status**: CONCERNS

---

## Executive Summary

The implementation is correct, carefully sequenced, and better-guarded than most changes of this size. All five inline board blocks are converted, the three intended behavioural changes are each correctly implemented *and* correctly documented, and every new guard was mutation-tested rather than assumed — which is exactly the discipline the task itself demanded after the v0.33 precedent.

One MEDIUM issue holds the gate at CONCERNS: the reason-to-action table added to `finalise/SKILL.md` documents 7 of the 13 reasons `gh-stage.js` can emit, and 6 of the omitted ones are reachable from the very call the table governs. The prose beneath it tells the agent to "read `reason`" — so the table's incompleteness is not cosmetic; it directs an agent to a value it then cannot interpret.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — staging APPROVED, production pending the table fix

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5)
- [x] Tests passing
- [x] Breaking changes documented (3, each with impact and migration)
- [x] Code on feature branch with open PR (#207)

### Review Methodology

**Direct tools.** The Adaptive Review Strategy nominates parallel agents for a >5-phase, multi-module task. Overridden to direct tools: this change is *documentation-and-instruction code* whose correctness lives in whether an agent following the prose does the right thing — a judgement that needs the whole instruction read in one context, not sharded across agents. Every claim below was verified against files on disk.

### Testing Approach

- [x] Automated testing (full suite)
- [x] Code review (diff, direct)
- [x] Regression testing
- [x] Live verification against the real Projects board
- [ ] Performance testing — structural only; see NFR
- [x] Security review

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Step 4 | PASS | Verified | L174-239 → `--stage in-review --json`. Hand-edit paragraph and dead `BOARD_NUM` both gone; guard asserts the selector string is absent from *all* shipped markdown. |
| Phase 2: Step 5-6 | PASS | Verified | `--allow-regress` correctly omitted. Hand-rolled `CURRENT_STATUS` short-circuit dropped — the CLI's `already` reason subsumes it. Prose states the refusal is correct behaviour. |
| Phase 3: Step 0 | PASS | Verified | Three concerns cleanly separated. See detailed review below. |
| Phase 4: Step 7 + finalise | CONCERNS | Partial | Both call the CLI; case-sensitivity fixed by construction; `not-on-board` escalation preserved. Reason table incomplete — TASK-40-QA1-01. |
| Phase 5: Guards, bundle, docs | PASS | Verified | 5 guards, all mutation-tested. CI bundle-freshness check added. CHANGELOG + both READMEs + stale `tracker-workflow.yaml` header. |

**Overall Phase Completion**: 5/5 complete, 1 with a documentation concern.

### Detailed review — Phase 3 (the riskiest)

The task flagged Step 0 as High risk because three concerns shared one GraphQL response and separating them could silently drop one. Each was checked:

- **`item-add` + propagation retry** — correctly delegated to `--add-to-board`. Verified `ensureOnBoard` at `gh-stage.js:498` ports the dance verbatim (`sleepMs(3000)` at :525, the single retry `sleepMs(5000)` at :528). Nothing lost.
- **Priority → P2 when unset** — kept inline with its own query. All five derived variables (`ITEM_ID`, `PROJECT_ID`, `PRIORITY_FIELD_ID`, `CURRENT_PRIORITY`, `P2_OPTION_ID`) resolve from the new response correctly; `startswith("P2")` is preserved; the never-overwrite guard (`-z "$CURRENT_PRIORITY"`) is intact. **Keeping this inline was the right call** — delegating to `set-github-project-priority.sh` would have swapped P2-when-unset for mirror-the-label, an undocumented fourth behavioural change on the riskiest phase.
- **Post-condition** — deleted, correctly. The CLI's re-read is the check the deleted block was trying to be.

### Detailed review — Phase 4 (the reorder)

Verified `DOC_PATH` (`finalise/SKILL.md:991`) and `DURABLE_BRANCH` (:993-996) are both set before the Jira path opens at :1002, and the re-link block now at :1060-1067 still reads them — the move did not take anything out of scope.

Also verified the reorder loses no resilience: previously the sync ran first and the MCP transition no-op'd if it succeeded; now the transition runs first and the sync no-ops. **Both still run in both orders**, so a failure in either is still covered by the other. The stated benefit — the ladder becomes the single resolver — is real, since the sync's `loadStatusMap` no longer gets first say.

---

## Success Criteria Verification

Full mapping: `.summaries/qa-traceability-matrix.md` (working artifact — `.summaries/` is gitignored, so it is not committed; the findings it surfaced are reproduced below and in Issues Found)

| Bucket | Total | Satisfied | Notes |
|---|---|---|---|
| Functional | 5 | 4 + 1 partial | F5 (backward move refused) is guarded by test but not live-proven — board topology, not implementation |
| Performance | 2 | 2 | Both structural, both verified by inspection |
| Code Quality | 3 | 3 | |
| Migration | 3 | 3 | |

**F3 — the headline criterion — is demonstrated live.** `--probe-board --issue 188` against board #1 returned exactly this repo's authored ladder:

```
Status options, in board order: Todo → In Progress → Done
  work-started       → "In Progress"
  in-review          disabled
  done               → "Done"
```

That is a consumer's `tracker-workflow.yaml` deciding where cards land, on a real board, with no step-file literal involved.

---

## Breaking Changes Validation

### Behavioural change 1: backward moves refused
Documented: Yes · Migration path: Yes (`--allow-regress`) · Consumer impact stated: Yes
**Assessment: PASS.** The CHANGELOG additionally states the guard is *inert without a declared ladder*, which is the non-obvious caveat a consumer most needs. Verified no pipeline step passes the flag (guarded, mutation-tested).

### Behavioural change 2: Done match becomes case-insensitive
Documented: Yes · Migration path: N/A (strictly widening) · **Assessment: PASS.** Verified `name == "Done"` no longer appears in `finalise/SKILL.md`, and no shipped markdown carries an inline board Status mutation.

### Behavioural change 3: post-condition no longer false-passes
Documented: Yes · Migration path: N/A · **Assessment: PASS.** The honest note that "some runs that looked clean will now correctly warn" is present in both the task and the CHANGELOG.

**Overall: PASS.**

---

## Issues Found

### HIGH Severity (0)

None.

### MEDIUM Severity (1)

**TASK-40-QA1-01 — `finalise` reason table omits 6 reachable reasons**

- **Severity**: MEDIUM · **Category**: Quality (executable-instruction completeness)
- **Location**: `skills/finalise/SKILL.md:1135-1143`
- **Observation**: The table documents `transitioned`, `already`, `stage-disabled`, `would-regress`, `no-option`, `not-on-board`, `mutation-failed`. `gh-stage.js` can also emit `ambiguous-board`, `board-unreadable`, `no-credentials`, `no-options`, `no-repo-context` and `no-status-field` from a plain `--stage done` call — all confirmed present in the CLI source, none documented.
- **Impact**: The prose directly beneath the table instructs the agent to "read `reason`" and never treat exit 0 as proof the card moved. An agent that reads `ambiguous-board` therefore has an explicit instruction to interpret a value with no defined interpretation. `ambiguous-board` is the sharpest case: it fires when an issue sits on two boards with no `--board` configured, which is an ordinary multi-board setup rather than an error.
- **Recommendation**: Add the 6 rows, or a catch-all row. Reasons reachable only via `--probe-board` / `--write-ladder` / `--dry-run` / `--add-to-board` (`probe`, `write-failed`, `exists`, `dry-run`) are correctly out of scope here.
- **Priority**: P2

### LOW Severity (3)

1. **Guard 1 is file-scoped, not block-scoped.** "No shipped markdown carries an inline board Status mutation" tests `updateProjectV2ItemFieldValue` and `"Status"` co-occurring *anywhere in the same file*. Step-0 legitimately retains the mutation for Priority and currently has zero bare `"Status"` literals, so it passes — but prose added later would false-positive. This is the same fragility already hit and fixed in the `--allow-regress` guard, which was rescoped to fenced code blocks. Worth the same treatment.

2. **The Priority query lost its retry-on-empty.** The original shared a response with the status read, which carried `item-add` + `sleep 3` + a re-query after 5s. The standalone query has none, relying on `ensureOnBoard` having already settled propagation before it runs. True in practice (the CLI sleeps ≥3s and must itself have read the item to set status), and Priority is explicitly graceful, so impact is cosmetic — but the explicit guarantee is gone.

3. **The `not-on-board` escalation has no executable assertion.** It is a documented branch with no test. Consistent with how `finalise`'s other escalations are handled, so not a regression — recorded for completeness.

**Total**: HIGH 0 · MEDIUM 1 · LOW 3

No bug report files created — the single MEDIUM is a documentation-completeness defect addressable in the qa-fix cycle, not a defect needing independent tracking.

---

## NFR Assessment

### Performance — PASS
Net `gh` invocation reduction confirmed structurally: each site went from a read query plus a mutation — plus, at step 0, a second read query and a separate post-condition `gh project item-list` — to a single CLI call performing read, mutate and verify. `--add-to-board` appears at exactly one site.

### Reliability — CONCERNS
Genuine improvements: board mutations gain retries for the first time, and the false-pass post-condition is gone. Held at CONCERNS solely by TASK-40-QA1-01 — the escalation path is under-specified for six reachable failure states, which is precisely when an operator depends on it. Rollback remains credible; each site is a self-contained block.

### Security — PASS
No credential handling changed. Removing hand-editable inline GraphQL slightly *reduces* the surface for a query edited into leaking a token. No secrets in the diff; the `console.log` hits are the bundled CLI's own logger.

### Maintainability — PASS
~240 lines of duplicated prose removed; three matching disciplines collapse to one. Five guards added where there were none. CI now catches bundle drift, which previously surfaced only at release time.

---

## Code Review

Reviewed the branch diff against `develop` directly (documentation-and-instruction code; the reviewable surface is prose an agent executes).

**Correctness bugs (1):**
- [medium/high] `skills/finalise/SKILL.md:1135-1143` — reason-to-action table omits 6 reasons reachable from the call it governs, while the adjacent prose instructs the agent to read `reason` → extend the table or add a catch-all row. **Promoted to gate `top_issues` as TASK-40-QA1-01** (`code_review_blocking=true`).

**Cleanups (2):**
- `evals/shared/tests/transition-protocol-parity.test.mjs` — scope the inline-Status-mutation guard to the code block rather than the file, matching the `--allow-regress` guard's fix.
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — consider an explicit retry-on-empty on the standalone Priority query.

**Positive notes** (not findings, but worth recording): the `--allow-regress` guard's first draft failed at baseline by matching the prose *explaining* the flag's absence — the v0.33 failure mode inverted — and was caught and rescoped before review rather than shipped. The bundler limitation (`bundle_skill.py:178` follows only `shared/resources/X` paths) was discovered, fixed, *and* guarded, turning a near-miss into permanent coverage.

---

## Regression Testing

| Area | Result |
|---|---|
| Full test suite | PASS — 1070/1070 (baseline 1065; +5 new guards) |
| Bundle idempotency | PASS — re-running `--all` yields a byte-identical diff |
| Skill frontmatter validation | PASS — all 6 touched skills validate |
| Skill catalog freshness | PASS — in sync |
| Jira path unchanged | PASS — no `jira-stage.js` invocation or flag altered; parity tests green |
| Live CLI against board #1 | PASS — 3 `--dry-run` moments exit 0 with correct reasons; `--probe-board` matches the ladder |

No regressions detected.

---

## Test Artifacts

### Test Commands Executed
```bash
npm test                                    # 1070 passing, 0 failing
npm run bundle                              # idempotent; all skills in sync
node --test evals/shared/tests/transition-protocol-parity.test.mjs   # 17/17
node .agents/skills/develop-task/references/gh-stage.js --issue 188 --stage {work-started,in-review,done} --json --dry-run
node .agents/skills/develop-task/references/gh-stage.js --probe-board --issue 188
python3 skills/create-skill/scripts/quick_validate.py skills/{develop-task,develop-story,develop-bug,finalise,qa-task,qa-story}
```

### Guard Verification (mutation testing)

Every new guard was verified to fail on the violation it targets — the check the task explicitly demanded:

| Injected violation | Suite result |
|---|---|
| Inline board Status mutation added to step-0 | 1 fail ✅ |
| `--stage in-review` removed from step-4 | 1 fail ✅ |
| Hand-edit selector re-added | 1 fail ✅ |
| Bundled `gh-stage.js` deleted from finalise | 1 fail ✅ |
| `--allow-regress` injected into the step 5-6 invocation | 1 fail ✅ |
| Baseline restored | 0 fail ✅ |

Non-vacuity confirmed independently: the scanners see 438 markdown files, 6 containing `updateProjectV2ItemFieldValue` and 20 containing `gh-stage.js` inside a fenced block — so none of the guards is passing over an empty set.

---

## Recommendations

### Immediate (blocking production)
1. **TASK-40-QA1-01** — extend the `finalise` reason table to cover every reason reachable from a `--stage` call, or add a catch-all row.

### Short-term (non-blocking)
1. Scope the inline-Status-mutation guard to the code block rather than the file.
2. Consider restoring an explicit retry-on-empty to the standalone Priority query.
3. Run the two deferred consumer tests once a scratch board with bespoke column names exists.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Rationale**: Zero HIGH issues, all five phases complete, three behavioural changes correctly implemented and honestly documented, and guard quality notably above the bar — each assertion mutation-tested, and a self-inflicted false positive caught before review rather than after. The single MEDIUM is a real gap in an instruction file agents execute, and it is cheap to close.

**Deployment Recommendation**: CONDITIONAL
**Conditions**: Address TASK-40-QA1-01.

**Next Steps**: `/qa-fix` against this gate, then re-review.
