# QA Report: Task 120 - The pause hook, the hook installer and the README badge each rely on a human remembering

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Gate File**: [task.120.gate.1.hook-idempotence-and-badge-drift.yml](./task.120.gate.1.hook-idempotence-and-badge-drift.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

All three mechanisms are present and behave as the task specifies: the PreCompact hook claims the lock atomically (a forced two-run overlap produces one of everything), the installer converges three spellings per event onto the canonical one (and reproduces the hand fix on the real pre-fix settings file byte-for-byte), and the catalog generator writes the README badge that `validate.yml` now diffs and triggers on. Every mechanism was mutation-proven again under QA and the full fast gate is green (3308/3309, one pre-existing skip). Two findings are open: the installer's `--dry-run` output contradicts itself (low), and `README.md:7` still carries a second hand-typed skill count the generator does not own (medium) — the same defect class the task closes, in the same file.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3, every checkbox ticked)
- [x] Tests passing (`npm run ci:fast` exit 0)
- [x] Breaking changes documented (none — API stable, `--no-readme` additive)
- [x] Code on feature branch with open PR (#410 → develop, OPEN)

### Testing Approach

- [x] Manual Testing (hostile-input probes on `hook_identity`; dry-run reproduction; real pre-fix settings file)
- [x] Automated Testing (unit — `npm run ci:fast`: 3 shell suites touched + 1 new node suite)
- [x] Performance Testing (wall-clock of hook and generator, 3 runs each)
- [x] Regression Testing (full hermetic suite; `install-hooks-behavior.test.mjs`; bundle freshness; catalog no-diff)
- [x] Security Review (boundary rule fired on `hook_identity`; 12 probes executed)
- [x] Code Review (Step 3b — read-only Explore reviewer over the 15-file diff, bundled copies excluded)

### Review Methodology

Direct tools first (standard mode, 3 phases, low risk, three modules) with one read-only Explore subagent for the Step 3b diff review. First review — no prior gate, no re-review scope. Task list registration: `TaskCreate` is not available in this session; the checklist was tracked inline and every item below was executed.

Step 4b: **fired** — the diff modifies `shared/resources/develop-pipeline-hooks.md`, which carries 2 fenced bash blocks. `qa-execute-snippets.mjs --file shared/resources/develop-pipeline-hooks.md`: 2 blocks, 0 runnable, 0 placeholder, 2 mutating (line 16 `bash …` unrecognised-command fail-closed; line 200 deny-list `rm -rf`), shells bash+zsh available. Outcome `no-executable-blocks` (information, exit 0): this file documents side-effecting commands by design; nothing to act on. `develop-pipeline-pause.md` is also changed but carries no bash fence.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Atomic pause claim and a marked PR comment | PASS | Verified | `mv` claim at `on-precompact.sh:99`; sweep after the claim; `LOCK` reassigned; marker first in the PR body; find-by-marker → PATCH → else create, both arms through `tracker_write`; pause.md paragraph + diagram + re-pause note. 14/14 hook scenarios; 3 mutations reddened. Advisory CR-3 on the mv→snapshot kill window. |
| Phase 2: Installer dedupes by identity and heals | CONCERNS | Verified | `hook_identity`, identity compare in `patch_hook`, `heal_hook`, loop retired; wizard mirrored. Real pre-fix file healed to the hand fix (jq -S identical). 6/6 new scenarios; 3 mutations reddened. **CR-1**: `--dry-run` prints "removing X" then "already registered (X)". Advisory CR-2 on cross-skill identity. |
| Phase 3: The badge is generated | CONCERNS | Verified | argparse, `update_readme_badge`, anchored regex, warning path; `validate.yml` diff + both trigger lists; badge 128. 5/5 tests; 2 mutations reddened. **QA-1**: README:7 prose still says "126 skills covering". |

**Overall Phase Completion**: 3/3 phases implemented; 2 with open findings

Diff reviewed against the plan: `git diff origin/develop...HEAD` — 27 files (15 sources + 12 bundled copies/docs), 4 phase-scoped commits `f118d2a1`, `00e6ff51`, `b98170a7`, `43a61ac2`. No file outside the task's Files Summary except `scripts/setup-consumer.sh` and `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs`, both recorded in the Files Summary (8a, 7a) with the reason.

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Two concurrent invocations → one of everything; loser exits 0 empty | 1/1/1/1, rc 0 | Scenario 12: 1 snapshot, 1 block, 1 PR call, 1 issue call; both rc 0; 1 signal + 1 empty | PASS | Overlap forced by a 1 s sleep in the git shim |
| Installer on both spellings → one entry per event; no-op on second run | 1 per event; no diff | Scenario 1/3 and the real `.bak-2026-09-16` file: 3→1 per event; second run byte-identical | PASS | |
| Generator rewrites badge; validate.yml fails on stale badge and runs on README-only PR | yes | `update_readme_badge` + `git diff --quiet … README.md` + README in both `paths` lists | PASS | prose count not owned — QA-1 |
| README badge reads 128 | 128 | `skills-128-brightgreen` | PASS | |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Hook wall-clock unchanged within noise | ≈ before | 0.13 / 0.12 / 0.12 s (no PR/issue path) | PASS | one `mv` replaces one `test -f` |
| Generator same time class | ≈ before | 0.16 s with and without `--readme` | PASS | |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Every mechanism has a test that goes red on revert | covered ×3 | covered ×3 under QA re-execution (see Code Review) | PASS | |
| shellcheck / bundle --check / prettier clean | clean | clean (58 source .sh incl. new suite; 0 bundle problems; `format:check` green) | PASS | |
| New suites listed in `package.json scripts.test` | yes | `develop-pipeline-install-hooks.test.sh` in the bash chain; `tests/*.test.js` glob covers the generator test | PASS | |

**Migration Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| CHANGELOG `[Unreleased]` cites `(task 120)` | yes | `### Changed` entry present | PASS | |
| pause.md describes the claim; resume contract unchanged | yes | side-effect 0 rewritten; resume section untouched | PASS | |
| Healer reproduces the 2026-09-16 hand fix on the pre-fix backup | identical | `jq -S` identical to live `.claude/settings.json` | PASS | |

---

## Breaking Changes Validation

None declared, none found. Hook inputs/outputs unchanged in shape (one extra outcome string `updated in place`); installer CLI unchanged; generator positional usage unchanged, `--readme` / `--no-readme` additive. `npm run generate-catalog` and the CI step invoke it with no args as before.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: README prose skill count is a second hand-typed number the generator does not own**
- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.120.bug.1.readme-prose-skill-count-drifts.md](./task.120.bug.1.readme-prose-skill-count-drifts.md)
- **Observation**: `README.md:7` reads "126 skills covering …" two lines below the generated `skills-128` badge; `generate_catalog.py && git diff --quiet README.md` passes.
- **Impact**: Front-page contradiction; the drift mechanism the task removes survives in the adjacent sentence.
- **Recommendation**: Rewrite the prose count from the same `total` (anchored on `\d+ skills covering`) or drop the number; add a test; regenerate and commit.
- **Priority**: P2

### LOW Severity Issues (1)

**CR-1 — `--dry-run` output contradicts itself** (`shared/resources/develop-pipeline-install-hooks.sh:151`, mirrored in `scripts/setup-consumer.sh`): with only a non-canonical spelling present, dry-run prints `removing duplicate spelling (X)` and then `already registered (X)` for the same entry, because `patch_hook` checks identities against the unhealed file. A real run prints `removing … (X)` then `adding (canonical)`. The run-block comment ("the subsequent add is shown against the unhealed file") describes what does not happen. Reproduced with a one-entry `.claude/skills/…` fixture. Promoted to `top_issues[]` (bug, high confidence, `code_review_blocking=true`).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Hook 0.12–0.13 s (3 runs), generator 0.16 s either way. No new work on the hot path; the claim is one syscall.

### Reliability — PASS
Forced-overlap concurrency test holds; stale-claim sweep holds; every exit path still removes the (claimed) lock; the loser's path is the pre-existing noop. Advisory CR-3: a kill inside the mv→snapshot window leaves state only in `.pausing.<pid>`, which nothing reads and the next winner sweeps — narrower than the pre-change window (a kill after `[ -f ]` left the lock intact) but real; medium confidence, `recommendations.future`.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12
- Boundary: `hook_identity()` — an equality on its output decides whether an existing settings entry is deleted, so a collapse is a deletion of a consumer's hook. Executed 12 hostile candidates (empty; bare `bash`; double space; unquoted `${CLAUDE_PROJECT_DIR}`; `sh` instead of `bash`; `../` traversal; trailing flag; trailing `&& rm -rf /`; `./`-prefixed root; unicode skill name; `node` script; no interpreter). No candidate collapses onto a clean `<skill>/scripts/<hook>.sh` identity — extra tokens and path segments are retained, so a traversal or injected spelling can never equal the canonical identity and be removed as a duplicate. `heal_hook` only ever calls `unpatch_hook_exact` with a command string it read from the file itself (`==` in jq, no regex), so no injection surface is introduced. The hook's `gh api -X PATCH` passes the body by `-F body=@file`, never inline.

### Maintainability — PASS
One identity rule where there were two string healers; the wizard's copy is labelled a mirror of the canonical function; docs swept (pause, hooks reference, configuration, CHANGELOG); static assertions now pin the mechanism rather than the retired loop's text. CR-1 is a maintainability nick in the dry-run UX, not in the mechanism.

---

## Code Review

Step 3b — read-only Explore reviewer over `origin/develop...HEAD` (bundled `references/` copies and task docs excluded; 15 files, 853+/100−). `code_review_blocking=true` (pipeline override; no per-doc flag). Boundary rule: **fired** on `hook_identity` — `probes_executed: 12`, 0 defects.

**Correctness bugs (3):**
- [low/high] `shared/resources/develop-pipeline-install-hooks.sh:151` — dry-run reports the non-canonical entry heal_hook "would remove" as "already registered", never showing the canonical add; mirrored in `scripts/setup-consumer.sh:240` → skip identity-equal/non-exact entries in `patch_hook` when `DRY_RUN`, fix the comment, assert "adding" in the dry-run scenario. **Promoted to gate: CR-1.**
- [low/medium] `shared/resources/develop-pipeline-install-hooks.sh:139` — identity keeps `<skill>/`, so a BASE that moves between `develop-task` and `develop-story` across installer runs leaves two live entries per event → consider normalising the three hook-bearing skill names to one identity. **Advisory** (medium confidence; widens the strip list the task capped — `recommendations.future`).
- [low/medium] `shared/resources/develop-pipeline-on-precompact.sh:99` — a kill between the claiming `mv` and `write_pause_snapshot` leaves state only in `.pausing.<pid>`, unread by any resume path and swept by the next winner → promote a stale claim to the snapshot instead of deleting, or teach the resume detector to read `.pausing.*`. **Advisory** (`recommendations.future`).

**Cleanups (1):**
- `README.md:7` — prose still hand-states "126 skills covering …" beside the generated badge → generate it from the same total or drop the number. **Promoted by QA to a MEDIUM finding (QA-1, bug.1)** — same defect class as the task, same file.

**Mutation proofs (QA re-execution, committed tests, `cp` snapshot + restore, baseline green between):**
- mutation-proven: claim `mv` → `[ -f ]` + `cp` → `concurrent: exactly one report block appended` (+5 lock-removal assertions) → **covered**
- mutation-proven: `hook_identity` stops stripping `bash ` → `heal: one entry per event`, `dry-run: prune is shown` → **covered**
- mutation-proven: `readme.write_text(new)` removed → `a stale badge is rewritten to the catalog count` → **covered**

**Platform variance**: no environment-derived value (`os.tmpdir()`, `$TMPDIR`, `$HOME`) reaches a validating consumer in this diff — the tests use `mktemp -d` / `mkdtempSync` as scratch only; none of the code under test validates the path. Not applicable.

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Hook suite (pre-existing 11 scenarios) | `develop-pipeline-on-precompact.test.sh` | PASS 14/14 (Scenario 1 needed `mv` in its restricted PATH; Scenario 5's assertion tightened to marker-then-lead) |
| Installer behavioural protocol test | `evals/develop-story/protocol/install-hooks-behavior.test.mjs` | PASS 3/3 (legacy replacement, fresh install idempotence, cwd-independence) |
| Static hook/installer assertions | `stall-and-cleanup-protocol.test.mjs` | PASS 27/27 after re-pointing #2e at the identity mechanism |
| Bundle freshness | `bundle_skill.py --check` and `tests/bundle-check-mode.test.js` | PASS (0 problems; first run caught a stale hooks.md copy, re-bundled) |
| Catalog / README no-diff (CI step) | `generate_catalog.py && git diff --quiet docs/reference/skill-catalog.md README.md` | PASS |
| Full hermetic suite | `npm run ci:fast` | PASS — prettier clean; 3309 tests, 3308 pass, 1 skipped (pre-existing), 0 fail |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/develop-pipeline-on-precompact.sh`, `.test.sh`, `develop-pipeline-pause.md`
- `shared/resources/develop-pipeline-install-hooks.sh`, `.test.sh`, `develop-pipeline-hooks.md`, `scripts/setup-consumer.sh`
- `skills/create-skill/scripts/generate_catalog.py`, `tests/generate-catalog-badge.test.js`, `.github/workflows/validate.yml`, `README.md`
- `package.json`, `CHANGELOG.md`, `docs/reference/configuration.md`, `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs`

### Test Commands Executed
```bash
npm run ci:fast                                                    # exit 0 — .claude/state/t120-qa-testlog.txt
bash shared/resources/develop-pipeline-on-precompact.test.sh       # 14 passed
bash shared/resources/develop-pipeline-install-hooks.test.sh       # 6 passed
node --test tests/generate-catalog-badge.test.js                   # 5 passed
node --test evals/develop-story/protocol/install-hooks-behavior.test.mjs   # 3 passed
node references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-hooks.md --json   # no-executable-blocks
bash shared/resources/develop-pipeline-install-hooks.sh --settings <copy of .claude/settings.json.bak-2026-09-16>   # 2→1 per event
bash shared/resources/develop-pipeline-install-hooks.sh --dry-run  # CR-1 reproduction
# 3 mutations (cp snapshot / restore) + 12 hook_identity probes — see Code Review
```

### Coverage Report
Not instrumented in this repository (shell + Python + `node --test` without a coverage runner). Behavioural coverage: every mechanism has a committed test that goes red on revert (3/3 `covered`).

---

## Recommendations

### Immediate Actions (Blocking)
1. **CR-1** — make `--dry-run` report the canonical add instead of "already registered" for a spelling it just said it would remove (installer + wizard mirror); fix the run-block comment; extend the dry-run scenario.
2. **QA-1 / bug.1** — generate the README prose count from the same total or remove it; test; regenerate; commit.

### Short-term Actions (Non-Blocking)
1. CR-2 — decide whether the three hook-bearing skill names should collapse to one identity (needs its own fixture and a deliberate widening of the strip list).
2. CR-3 — close the mv→snapshot kill window (promote a stale claim to the snapshot, or teach the resume detector to read `.pausing.*`).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Mechanisms correct and proven; one MEDIUM QA finding (a second hand-typed count in the file the task makes generated) and one LOW high-confidence code-review bug (self-contradicting dry-run output). Gate rule 2 (any medium → CONCERNS). NFRs all PASS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and QA-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.120.qa.1.hook-idempotence-and-badge-drift.md`
**Gate File**: co-located at `task.120.gate.1.hook-idempotence-and-badge-drift.yml`
**Next Steps**: `/qa-fix` on the two open `top_issues[]`, then re-review (cycle 2 — full-diff refute pass).
