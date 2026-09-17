# QA Report: Task 119 - Four authoring rules the corpus already obeys by accident

**Task**: [task.119.create-skill-authoring-guards.md](./task.119.create-skill-authoring-guards.md)
**Gate File**: [task.119.gate.1.create-skill-authoring-guards.yml](./task.119.gate.1.create-skill-authoring-guards.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Reviewed PR #420 (41 source files, +1208/−79 excluding regenerated bundle copies) against the task's four phases and five success criteria. Everything the task promised is present and both guards were independently mutation-proven, but the adversarial diff review found that the positional-token guard's fence parser loses state on a nested fence inside a ```markdown template block, so ~8 real bash blocks across four skills are never scanned — a coverage hole the guard's own header claims does not exist. One medium, high-confidence bug; promoted to the gate under `code_review_blocking`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-1

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (9/9 boxes, close-out included)
- [x] Tests passing (`npm run ci:fast`: 3409 pass / 0 fail / 1 skipped)
- [x] Breaking changes documented — none
- [x] Code on feature branch with open PR (#420, OPEN)

### Testing Approach

- [x] Automated Testing (full hermetic suite)
- [x] Regression Testing (whole suite; bundle `--check`; `check:generated`)
- [x] Security Review (boundary decision recorded)
- [x] Code Review (Step 3b — dispatched Explore subagent, returned)
- [x] Mutation-proof spot check (Step 3c — both guards)
- [x] Documented-command execution (Step 4b)

### Review Methodology

Direct tools plus one dispatched read-only diff reviewer (standard mode; 4 phases, multi-module, `risk_level: low`). First review — no prior gate. Traceability mapper skipped by the orchestrator (Success Criteria is a numbered list, not a table). Step 3b: `dispatched 17:56 → returned 18:00` (budget 10 min); findings block received before the gate was written.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: verify the harness premises | PASS | Verified | Three probe skills; results in the guard header and `create-skill/references/runnable-prose.md`; probes removed; scope and regex derived from evidence |
| Phase 1: the guard | CONCERNS | Partial | `tests/fenced-bash-positional-params.test.js` present, floor 50, empty reason-checked allowlist, 22 hits rewritten and mutation-proven — but the fence parser under-scans 4 files (CR-1) |
| Phase 2: rules in create-skill | PASS | Verified | § *Three Rules the Corpus Learned by Failing*, token-free; `references/runnable-prose.md`; qa-task 4b limit; coding-standards rule; CHANGELOG |
| Phase 3: create-task | PASS | Verified | §1.2 *One Task or Several?* between §1 and §1.5 with the three-way test, three seams, registry-note obligation, by-file anti-pattern |
| Close-out | PASS | Verified | Observations #23/#24/#36/#39 `actioned`, resolution names PR #420 |

**Overall Phase Completion**: 4/5 clean; Phase 1 CONCERNS.

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Guard runs under `npm test`/CI, has a floor, every allowlist entry carries a reason | yes | yes — `tests/*.test.js` glob; floor 50; allowlist empty with reason check §3 | CONCERNS | runs and gates, but scans 477 of ~485 blocks (CR-1) |
| 2 | create-skill states the three rules with failure modes; qa-task 4b states its from-disk limit | yes | yes | PASS | rule 1 deliberately token-free in the rendered file |
| 3 | `bundle_skill.py` warns on comment-only origin; `tests/bundle-comment-origin.test.js` asserts live tree has none | yes | yes — fixture §1a/§1b/§1c + live §2 | PASS | `bundle-dependency:` declaration form; self-references excluded |
| 4 | create-task "One task or several?" with three seams and dependency-note obligation | yes | yes | PASS | |
| 5 | Observations #23, #24, #36, #39 close naming this PR | yes | yes — `actioned`, resolution names PR #420 | PASS | |

---

## Breaking Changes Validation

None declared; none found. Consumers of `bundle_skill.py` see one additional warning line per comment-only origin — nothing is refused. **Overall: PASS**.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: Fence parser loses state on a nested fence (CR-1)**
- **Severity**: MEDIUM
- **Category**: Quality (guard coverage)
- **Bug Report**: recorded in the gate `top_issues[]` (CR-1) — consumed by `/qa-fix`; no separate bug file
- **Observation**: `runnableLines()` treats any bare closing fence as closing the current block. A ```markdown template that embeds a ```mermaid or ```bash block therefore inverts fence state for the remainder of the file. QA reproduced it independently: naive opener count vs scanned — `mermaid-architect` 1 → 0, `create-epics-from-shards` 2 → 0, `create-parallel-stories` 13 → 9, `qa-story` 16 → 15.
- **Impact**: ~8 real bash blocks are never scanned; a token added after a nested template in any of those four files ships unreported, while the guard's header states all runnable blocks are covered.
- **Recommendation**: track nesting (a non-empty-info fence inside an open block opens a nested fence its own bare closer pops); add a §4 fixture case; confirm the live count rises to the naive opener count for all four files.
- **Priority**: P2

### LOW Severity Issues (2)

- **CR-2** `tests/bundle-comment-origin.test.js` — `liveSources()` docstring claims exact parity with the bundler's discovery scope, but the scan is a superset (all of `shared/resources/**`, not only transitively reached files) and skips `references/` only at a skill's top level while `discover_needed` excludes it at any depth. Reword as a deliberate superset; skip `references/` at any depth.
- **CR-3** `skills/create-skill/scripts/bundle_skill.py` — `warn_comment_only_refs()` runs once per (skill, shared file) visit, so under `--all` a single comment-only origin in a 21-skill file prints 21 identical warnings. Dedupe per (file, line, target).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
Both guards complete in <100 ms in-process over ~100 files; the bundler warning is one regex pass per line of sources it already reads. `ci:fast` wall time unchanged.

### Reliability — PASS
Every rewritten shell/awk form was executed against the original under bash and zsh with identical output (QA re-ran the awk case independently). `npm run bundle -- --check`: 128 skills, 0 problems; `npm run check:generated` clean; no `references/` files added or removed by the comment rewrites. Rollback is `git revert`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- **boundary: false** — the deliverable is a Markdown lint guard, a bundler warning and prose. No function that accepts or rejects input on a security sink (`url-authority`, `sql-orm`, `shell-exec`, `path`, `template-render`) was added or modified; the guards' `ALLOWLIST` arrays are test configuration, not input filters. `bundle_skill.py`'s existing `_within()` containment check is untouched. No network, no credentials, no new dependencies. Legitimate skip, recorded explicitly.

### Maintainability — PASS
Both guards carry their failure history, a non-vacuity floor and a reason-checked allowlist. The rule prose is token-free where it is rendered and literal where it is Read-loaded. Two comment-declared runtime dependencies became explicit `bundle-dependency:` lines. CR-2/CR-3 are cosmetic.

---

## Code Review

Dispatched read-only reviewer (Step 3b), `code_review_blocking=true` from the pipeline; task frontmatter carries no `code_review_blocking:` key → `CR_BLOCKING=true`.

**Correctness bugs (1):**
- [medium/high] `tests/fenced-bash-positional-params.test.js` (`runnableLines()`) — bare closing fence closes the current block even inside a nested fence, inverting state for the rest of the file → track nesting explicitly and add a nested-fence fixture. **Promoted to gate `top_issues[]` as CR-1.**

**Cleanups (2):**
- `tests/bundle-comment-origin.test.js` (`liveSources()`) — docstring overclaims scope parity; `references/` skipped only at top level → reword as superset; skip at any depth (CR-2).
- `skills/create-skill/scripts/bundle_skill.py` (`warn_comment_only_refs()`) — identical warning per bundling skill under `--all` → dedupe per origin (CR-3).

**Mutation proofs (Step 3c):**
- mutation-proven: `${1}` → `$1` at `skills/finalise/SKILL.md:1140` → `fenced-bash-positional-params §2` went red naming the line → `covered`
- mutation-proven: `bundle-dependency:` line → `see shared/resources/…` in `shared/resources/defer-mutation.js` → `bundle-comment-origin §2` went red naming the line → `covered`
- mutation-proven (develop, re-verified by QA): `$(2)` → `$2` at `skills/qa-task/SKILL.md:161` → §2 red → `covered`
- mutation-proven (develop, re-verified by QA): bare filename → `shared/resources/resolve-paths.sh` at `generate-prd-epic-index.mjs:76` → §2 red → `covered`

**Platform variance**: no environment-derived value reaches a validating consumer in this diff; `bundle-comment-origin.test.js` fixtures use `os.tmpdir()` but only as a scratch root, never validated. Not run under `TMPDIR=/tmp` — not applicable.

---

## Step 4b: Documented Commands

Fired — the diff modifies 15 `SKILL.md` files containing fenced bash. Engine: `references/qa-execute-snippets.mjs`; shells: bash, zsh (zsh available).

| File | Blocks | Runnable / Placeholder / Mutating | Result |
| --- | --- | --- | --- |
| create-skill, create-task, ensure-{bug,epic,story,task}-github-issue, loop-supervisor, review-code | 3–8 each | 0 / 0 / all | `no-executable-blocks` (note) — every block refused as mutating by design (`gh`, write redirections, `scripts/*.py`) |
| docker | 36 | 1 / 0 / 35 | runnable block passed under both shells |
| finalise (29), qa-story (15), qa-task (17), review-story (16), review-task (14) | | 0 / 1–5 / rest | `zero-blocks-executed` (medium) — placeholder blocks need `--bind` (`DOC_FILE`, `PR_JSON`, `TASK_FILE`, `INPUT`, …) |
| qa-task re-run with `--bind TASK_FILE=… --bind TASK_DIR=… --copy <task dir>` | 17 | 2 / 2 / 13 | both runnable blocks exit 0 under bash and zsh; no disagreement |

**Every block this change edited is classified `mutating — unrecognised-command: awk (fail-closed)`** (finalise L349/L353/L1272, qa-story L238, qa-task L159/L173, review-story L2303/L2304, review-task L1716/L1717, the ensure-* OWNER/PROJECT_NUM lines, docker L591) or lives in a here-doc/comment (finalise L1140, loop-supervisor L45, review-code L98), so the executor cannot exercise them; the equivalence evidence is the direct bash+zsh execution recorded under Reliability. The five `zero-blocks-executed` findings concern pre-existing placeholder blocks this diff did not touch; they are `confidence: medium` and stay advisory. `zsh-unavailable`: no.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm test` via `ci:fast`) | PASS — 3409/0/1 skipped |
| Prettier (`format:check`) | PASS |
| Bundle freshness (`npm run bundle -- --check`) | PASS — 128 skills, 0 problems |
| Generated files (`check:generated`) | PASS |
| Skill validation (`quick_validate.py` create-skill, create-task, qa-task) | PASS |
| Bundled `references/` copies of `defer-mutation.js` / `generate-prd-epic-index.mjs` (29 skills) | PASS — regenerated, content-identical to source apart from the banner |

---

## Test Artifacts

### Files Reviewed
`tests/fenced-bash-positional-params.test.js`, `tests/bundle-comment-origin.test.js`, `skills/create-skill/scripts/bundle_skill.py`, `skills/create-skill/SKILL.md`, `skills/create-skill/references/runnable-prose.md`, `skills/create-task/SKILL.md`, `skills/qa-task/SKILL.md`, `shared/resources/defer-mutation.js`, the 12 rewritten `SKILL.md` files, the 9 comment-rewrite sites, `docs/architecture/concepts/coding-standards.md`, `CHANGELOG.md`, the task document and implementation report.

### Test Commands Executed
```bash
npm run ci:fast
npm run bundle -- --check
npm run check:generated
node --test tests/fenced-bash-positional-params.test.js   # + two mutations
node --test tests/bundle-comment-origin.test.js           # + one mutation
node references/qa-execute-snippets.mjs --file skills/<x>/SKILL.md --json   # ×15, qa-task also with --bind/--copy
```

### Coverage Report
Not instrumented in this repository (node --test without coverage); 3410 tests, 1 skipped.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — fix fence-nesting state loss in `runnableLines()`; add the nested-fence fixture; confirm all four affected files scan every real bash block.

### Short-term Actions (Non-Blocking)
1. CR-2 — `liveSources()` docstring and `references/` depth.
2. CR-3 — dedupe the bundler warning per origin.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium, high-confidence correctness bug in a guard's parser (CR-1) promoted under `code_review_blocking`; all NFRs PASS; every phase and success criterion otherwise met and mutation-proven.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed.

---

**QA Report**: co-located at `task.119.qa.1.create-skill-authoring-guards.md`
**Gate File**: co-located at `task.119.gate.1.create-skill-authoring-guards.yml`
**Next Steps**: `/qa-fix` on CR-1 (and optionally CR-2/CR-3), then re-review.
