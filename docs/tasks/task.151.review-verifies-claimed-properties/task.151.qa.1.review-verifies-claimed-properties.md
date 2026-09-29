# QA Report: Task 151 - review-task: stack-neutral pre-pass, executed invariants, released-shape diff

**Task**: [task.151.review-verifies-claimed-properties.md](./task.151.review-verifies-claimed-properties.md)
**Gate File**: [task.151.gate.1.review-verifies-claimed-properties.yml](./task.151.gate.1.review-verifies-claimed-properties.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Testing Completed**: 2026-09-28
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are delivered and every success criterion is met by execution. The diff review
found one medium, high-confidence bug in the new helper (CR-1): a concepts file with no `## `
headings is reported as `source: architecture` with empty lists, which re-creates the obs #130
failure in a new shape. Under `code_review_blocking` it enters the queue; the rest is advisory.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (20/20 plan items)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#511, OPEN)

### Review Methodology

Direct tools plus one read-only diff-review subagent (Step 3b, whole branch diff excluding
byte-identical bundle copies; 1,820 lines). First review — no prior gate. Traceability matrix from
the pipeline's mapper (15 SCs: 9 full, 2 partial, 2 integration, 2 documentary) consumed.

Step 4b: runnable prose fired (three `SKILL.md` files changed). `qa-execute-snippets.mjs`:
review-task 16 blocks (0 runnable, 1 placeholder, 15 mutating), review-story 18 (0/4/14),
create-task 3 (0/0/3) — `zero-blocks-executed` on the first two. The two new blocks (review-task
line 412, review-story Subagent 3) are refused by the allow-list as
`unrecognised-command: node (fail-closed)`; they were run by hand from the repository root under
**bash and zsh**, all four runs `reason: architecture`, 7 domains, 10 axes. The remaining refused
blocks are pre-existing and unchanged by this diff.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Stack-neutral pre-pass (obs #130) | CONCERNS | Verified | CR-1 in `deriveAxes` |
| 2: Invariant verification (obs #161) | PASS | Verified | checks 11 / 8, Detection Rules 7 / 6, create-task twin |
| 3: Released-shape diff (obs #170) | PASS | Verified | checks 12 / 9, create-task twin |
| 4: Tests, bundle, docs | PASS | Verified | bundle:check 0 problems, CHANGELOG ×3 |

**Overall Phase Completion**: 4/4 delivered; 1 with a finding.

---

## Success Criteria Verification

| SC | Target | Actual | Status |
| --- | --- | --- | --- |
| SC1 | `architecture`, own H2s, no web-stack literal | 7 domains / 10 axes, test green | PASS |
| SC2 | fallback / partial / fence | fixtures green | PASS |
| SC3 | CLI shape, exit 2 empty stdout, symlink | green; probe verdict `engages` | PASS |
| SC4 | slots + `axes_checked`, identical axis lines | green | PASS |
| SC5 | helper + `axes_checked` at both dispatch sites | green | PASS |
| SC6 | obs #161 at 5 sites | green (per-item) | PASS |
| SC7 | obs #170 at 3 sites | green (per-item) | PASS |
| SC8 | each file < 1 s | 749 ms / 130 ms | PASS |
| SC9 | `read.length ≤ 2` | asserted | PASS |
| SC10 | 5 mutation proofs | 15 recorded, all red + named | PASS |
| SC11 | test, format, bundle:check, validate | ci:fast 4359/0; bundle:check 0; validate ✓ ×3 | PASS |
| SC12 | engine conventions | pure export, `process.exitCode`, exit 2 | PASS |
| SC13 | CHANGELOG cites task 151 + 3 obs | 3 entries under `[Unreleased]` › Changed | PASS |
| SC14 | 3 hand runs recorded | in implementation report | PASS (see CR-4) |
| SC15 | bundle-generated copies | bundle:check in sync | PASS |

---

## Breaking Changes Validation

### Breaking Change: Agent B adds a required `axes_checked`
Documented: Yes · Migration Path Provided: Yes (none needed) · Migration Tested: Yes (prompt and
validator ship together; hand run 3 returned it) · Consumer Code Updated: N/A (no consumer parses
`PREPASS_B`)

### Breaking Change: review-story Agent B dispatches from the prompt file
Documented: Yes · Migration Path Provided: Yes (none) · Consumer Code Updated: Yes (bundle copies)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: CR-1 — a concepts file with no H2 headings reads as `source: architecture`**
- **Severity**: MEDIUM
- **Category**: Functional / Reliability
- **Bug Report**: [task.151.bug.1.empty-concepts-file-reads-as-architecture.md](./task.151.bug.1.empty-concepts-file-reads-as-architecture.md)
- **Observation**: reproduced on the committed tree — `readFile` returning `# Title` / `### only h3`
  gives `{source:"architecture",domains:[],axes:[]}`
- **Impact**: Agent B dispatched with blank slots under the strongest `source` label
- **Recommendation**: an empty `h2s()` half falls back like a missing file; add a fixture test
- **Priority**: P2

### LOW Severity Issues (4, advisory)

- CR-2 `take()` swallows every read error (EACCES/EISDIR read as "absent").
- CR-3 heading regex rejects `   ## x` and `##\tx`, which CommonMark and the reused fence tracker accept.
- CR-4 the implementation report's hand-run 2 line says `grep -c <field>` → 0 for `bug`; it is 10 (common word — the task itself says `bug` cannot be measured this way).
- CR-5 (cleanup) FALLBACK_AXES restates axes 3–4 inside axis 2, so the fallback wording is not literally "exactly as before".

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4

---

## NFR Assessment

### Performance — PASS
Two file reads at most; both test files under one second.

### Reliability — CONCERNS
CR-1 and CR-2 both degrade the `source` signal silently.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 5
- Boundary rule fired on the letter (SC2 "never"); the one reject decision is the helper's argv
  parser, probed with `security-probe.mjs --entry 'cli:shared/resources/prepass-axes.js'
  --argv '["--arch","docs/architecture","{input}"]'` over 7 cases (6 hostile, 1 legitimate):
  verdict `engages`, 5 executed. `argv.empty-string` and `argv.equals-form` scored `errored` in the
  harness; run directly both exit 2 with the usage line. No network, no writes.

### Maintainability — PASS
Reuses `makeFenceTracker` and one shared item reader; checks cite obs numbers, not positions.

---

## Code Review

**Correctness bugs (4):**
- [medium/high] `shared/resources/prepass-axes.js` (`deriveAxes`) — CR-1 above → promoted to gate `top_issues` (code_review_blocking)
- [low/medium] `shared/resources/prepass-axes.js` (`take`) — CR-2 → fall back only on ENOENT
- [low/medium] `shared/resources/prepass-axes.js` (`h2s` regex) — CR-3 → `/^ {0,3}##[ \t]+…/`
- [low/medium] implementation report hand-run 2 evidence — CR-4 → correct the `bug` grep claim

**Cleanups (1):**
- `shared/resources/prepass-axes.js` (`FALLBACK_AXES`) — CR-5 → trim to former axis-2 list or soften the wording

Provenance: all five are in code this branch adds (no base counterpart). Step 3c (mutation spot
check): no fix was made this cycle; the develop-time proofs (15, all `covered`) are in the
implementation report. `git status --porcelain` unchanged by this QA step apart from its own artifacts.

---

## Regression Testing

- `npm run ci:fast` — 4359 pass, 0 fail, 1 skipped (Step 3 run on this commit).
- Targeted re-run this cycle: 8 files, 69 tests green (new tests, the two siblings sharing
  `tests/lib/markdown-section.js`, executable-instructions, both fenced-bash guards, stdout-drain).
- `jira-sync.js` change is export-only; its 26 bundled copies are byte-identical (bundle:check).

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/prepass-axes.test.mjs tests/review-property-checks.test.js tests/outcome-reachability-check.test.js tests/qa-evidence-integrity.test.js tests/executable-instructions.test.js tests/fenced-bash-positional-params.test.js tests/fenced-bash-optional-file-globs.test.js shared/resources/tests/stdout-drain-on-exit.test.mjs
npm run -s validate -- skills/review-task/   # and review-story, create-task
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/<skill>/SKILL.md --json
command node shared/resources/security-probe.mjs --sink filename --entry 'cli:shared/resources/prepass-axes.js' --argv '["--arch","docs/architecture","{input}"]' --cases-file <cases.json> --name prepass-axes-argv --json
```

### Coverage Report
Not instrumented in this repository (node:test without coverage); every SC maps to a named test or a recorded command.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium, high-confidence defect in the new helper; everything else verified.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL — CR-1 fixed

---

**Next Steps**: `/qa-fix` for CR-1 (and the cheap lows CR-2, CR-3, CR-4 if in scope), then QA cycle 2.
