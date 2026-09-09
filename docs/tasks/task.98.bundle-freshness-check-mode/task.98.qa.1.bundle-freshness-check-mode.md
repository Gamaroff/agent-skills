# QA Report: Task 98 — A per-file bundle-freshness assertion

**Task**: [task.98.bundle-freshness-check-mode.md](./task.98.bundle-freshness-check-mode.md)
**Gate File**: [task.98.gate.1.bundle-freshness-check-mode.yml](./task.98.gate.1.bundle-freshness-check-mode.yml)
**PR**: [#367](https://github.com/Gamaroff/agent-skills/pull/367) → `develop`
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: CONCERNS

---

## Executive Summary

All 7 success criteria are met, all 4 phases are complete, and the deliverable did the thing it was
built to do on its first run against the real tree: it found a stale bundled copy that had been
invisible to CI. 20 tests pass, 11 mutation proofs red the behaviours they name, and `ci:fast` is
green at 3013/0.

Two findings, both in the classifier's **reporting** rather than its detection. Neither is a missed
problem — the check finds everything the task asked it to find. Both are cases where the check says
something to the reader that is either misleading or not true of the file in front of it, which for a
diagnostic tool is the failure that matters: its whole output is a claim.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 checkboxes marked and verified against the diff)
- [x] Tests passing — `npm run ci:fast` green, 3013 pass / 0 fail
- [x] Breaking changes documented — task declares none, and the change is purely additive
- [x] Code on feature branch with open PR (#367)

### Testing Approach

- [x] Automated Testing (20 new unit/integration tests, plus the full 3013-test suite)
- [x] Mutation testing (11 proofs)
- [x] Adversarial probing (3 hostile probes against the check boundary)
- [x] Regression Testing
- [x] Security Review — measured, not reasoned
- [x] Code Review

### Review Methodology

Direct tools. **No Explore subagents were dispatched** — the session policy in force bars unrequested
subagent dispatch, so Step 3b's diff code review was performed inline rather than by an independent
read-only agent.

**This is a real weakening of the review and is recorded rather than glossed.** An inline review is
performed by the same context that wrote the code, which is precisely the situation the refute pass
exists to counteract. It is stated here so a reader can weight the "no further findings" result
accordingly, and so that a cycle-2 refute pass (if one is needed) knows it is the first genuinely
adversarial read of this diff.

To partially compensate, every finding below was established by **executing a probe**, not by reading
the source and reasoning about it — each one is reproducible from the commands recorded in Test
Artifacts.

First review — no prior gate, so no re-review scoping applies.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1 — Read inherited findings, write fresh | PASS | N/A | Fork resolved at review time, not left to the implementer. The task-86 gate findings were used as a test backlog; four of its recorded traps appear as named comments at the test sites that avoid them |
| Phase 2 — Build the check | PASS | Verified | `check_skill` / `check_all` / `banner_declaration` added. Built on `expected_bytes` and sharing `discover_needed` / `source_backed_on_disk` / `_looks_bundled` with the writer — verified by reading the call sites, so the check's population is the writer's population |
| Phase 3 — Correct remedies | CONCERNS | Verified | Remedy correctness verified by measurement in both directions and holds. **But see T98-QA-001**: the remedy *text* for AMBIGUOUS leads with the wrong action for the case the check most often reports |
| Phase 4 — Wire into CI | PASS | Verified | One `validate.yml` step before regenerate-and-diff. `test.yml` untouched; `ci-gate-parity.test.mjs` re-run and green |

**Overall Phase Completion**: 4/4 phases complete; 1 with a finding.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Orphan (source deleted) fails the check — mutation-proved | Yes | Yes — disabling the orphan scan reds 5 tests; a late-banner orphan is also covered | PASS |
| Symlinked reference is reported | Yes | Yes — and as SYMLINK, not MISSING; branch order mutation-proved | PASS |
| Authored file sharing a name is reported, never rewritten | Yes | Yes — both halves asserted in one test | PASS |
| Check is read-only — no mutation reachable, asserted | Yes | Yes — bytes + mode + path set; two independent mutation proofs | PASS |
| Every class's printed remedy clears that class (check → bundle → check) | Yes | Yes — and the three non-regenerable classes verified to survive a bundle run | PASS |
| `npm run bundle` idempotent | 0 writes | 0 writes on two consecutive runs | PASS |
| `npm run ci` green + `validate.yml` reproduced locally | Both | `ci:fast` 3013/0; all four validate.yml steps run by hand | PASS |

**7/7 success criteria met.**

---

## Code Review

Performed inline (see Review Methodology). Every finding below was reached by running a probe.

**Correctness bugs (2):**

- **[medium/high]** `skills/create-skill/scripts/bundle_skill.py` (`check_skill`, the `_looks_bundled`
  branch) — A stale copy of a **headerless** suffix is classified `AMBIGUOUS` and receives the
  AMBIGUOUS remedy, which leads with *"Rename the authored file"*. For `.json` no banner can exist, so
  evidence 1 is unavailable by construction and evidence 2 fails the moment the copy drifts — meaning
  **every** stale `.json` lands here. The classification is defensible (nothing in the file
  distinguishes stale-bundled from authored — this is residual 5's shape), but the remedy points the
  reader at the wrong action.

  Not hypothetical: this is the exact shape of the live defect this check found in the tree
  (`skills/create-skill/references/skill-dependencies.json`), whose real fix was delete-and-re-bundle
  — the remedy's *second* clause. → **Name the headerless case**, either in the remedy or in the
  per-finding detail.

  ```
  probe: bundle a fixture with shared/resources/data.json, then drift the source
  result: AMBIGUOUS references/data.json — "carries no provenance banner and is not
          byte-identical to the rewritten source"
  ```

- **[low/high]** `skills/create-skill/scripts/bundle_skill.py` (same branch) — An **unreadable** file
  (mode 000) is reported `AMBIGUOUS` with the detail *"carries no provenance banner and is not
  byte-identical to the rewritten source"*. The check read neither: `_read_text_or_none` returned
  `None` and `_looks_bundled` returned `False` from its `OSError` arm. The message asserts a fact
  about content that was never seen.

  This is the conflation this repository separates elsewhere by design — `empty` versus `scan-broken`,
  "found nothing" versus "could not look" — and it is worth fixing here for the same reason: the
  reassuring reading is the one that gets believed. A consequence is that the `except OSError` arm on
  `read_bytes` further down is dead for this input. → **Detect unreadable before `_looks_bundled`** and
  say so.

  ```
  probe: chmod 000 on a correctly-bundled references/doc.md
  result: AMBIGUOUS references/doc.md — "carries no provenance banner and is not
          byte-identical to the rewritten source"
  ```

**Cleanups (0 blocking):** none worth raising. The implementation reuses `expected_bytes`,
`discover_needed`, `source_backed_on_disk`, `_looks_bundled` and `_banner_head` rather than
re-deriving any of them, which was the task's central design constraint.

`banner_declaration` duplicates two lines of `declared_source` and this is **correct, not
duplication**: the two answer different questions (`declared_source` returns a path only when it
matches, because for the write gate a non-matching banner is not provenance; `banner_declaration`
returns it regardless, because here a non-matching banner is a distinct finding). Collapsing them
would lose MISDECLARED. The comment at the site already says so.

Neither finding is promoted to a gate-blocking `top_issues` entry by `code_review_blocking` — that
flag is not set on this task — but both are recorded as `top_issues` on their own merits under the
deterministic rules (a medium finding forces CONCERNS).

---

## Mutation-Proof Spot Check

11 mutations run against the implementation; each reverts one behaviour and the control restores
20/20.

| # | Mutation | Result |
|---|---|---|
| M1 | Symlink branch removed (a link falls through to MISSING) | 2 tests red ✅ |
| M2 | MISDECLARED branch removed | 1 red ✅ |
| M3 | Banner window byte-bounded instead of line-based | 1 red ✅ *(see below)* |
| M4 | Orphan scan disabled | 5 red ✅ |
| M5 | ORPHANED given the regenerate remedy | 1 red ✅ |
| M6 | Directory bucketed MISSING instead of AMBIGUOUS | 1 red ✅ |
| M7 | `refs_dir.mkdir()` added to the check path | 1 red ✅ |
| M8 | Mode drift compared in one direction only | 2 red ✅ |
| M9 | A write inserted into the check path | 1 red ✅ |
| M10 | STALE detection disabled | 4 red ✅ |
| M11 | AMBIGUOUS detection disabled | 2 red ✅ |

**M3 initially proved nothing, and that is the most useful result in the table.** On its first run the
byte-window mutation reded zero tests. The cause was in the tests, not the code: every orphan fixture
was short enough that any window found the banner, and the pre-existing long-frontmatter test routes
through `_looks_bundled` rather than the new `banner_declaration`. A late-banner orphan fixture was
added, after which M3 reds.

This is exactly the vacuity the task's §8 warned to budget for, it was caught by the discipline rather
than by luck, and it is recorded because a mutation that reds nothing is a statement about the tests.

---

## NFR Assessment

### Performance — PASS
126 skills in ~3.4s. One additional read pass over `references/` per skill, in a CI job that already
runs a full bundle. No regression to existing steps.

### Reliability — PASS
Read-only and mutation-proved so twice over. Degraded inputs handled without crashing: unreadable
file, directory at a reference name, symlink (including one escaping the repo), missing source,
non-UTF-8 content. The only reliability *finding* is a message accuracy issue, not a crash.

### Security — PASS
- **Evidence**: `measured`
- **Probes executed**: 3

1. **Symlink escaping the repo** — `references/doc.md` → a file in another temp tree. Reported
   `SYMLINK` with the target named; the target file was byte-intact afterwards and was never opened.
2. **Symlink pointing at its own shared source** — the case where writing through the link would
   clobber the source it mirrors. Reported; source hash unchanged.
3. **Banner declaring a traversal path** — `Source: shared/resources/../../etc/passwd`. Classified
   `MISDECLARED`; the declared path is echoed into the report but is never used to open a file, so the
   traversal is reported rather than performed.

No writes, no network, no shell interpolation of file content. The path-traversal refusal in
`discover_needed` (`_within`) is inherited unchanged.

### Maintainability — PASS
The check shares the writer's definition of "in sync" rather than re-deriving it — the property the
task named as the one that matters, and the one whose absence produced a retracted false finding on an
earlier task. Reasons are recorded at the sites where they were decided.

---

## Regression Testing

| Area | Result |
|---|---|
| Existing bundler behaviour (`tests/bundle-transitive.test.js`) | PASS — unchanged; `--check` adds a branch in `main()` and touches no write path |
| CI gate parity (`evals/shared/tests/ci-gate-parity.test.mjs`) | PASS — `test.yml` untouched, so neither set moved |
| Full suite | PASS — 3013 pass / 0 fail |
| `npm run bundle` idempotence | PASS — 0 writes on two consecutive runs |
| `validate.yml` job reproduced locally | PASS — `validate:all` 126/126, deps drift clean, new check 0 problems, regenerate-and-diff clean |
| Unknown-flag rejection (`-check`, `--al`) | PASS — pre-existing guard still rejects any leading dash before it can reach a write |

---

## Test Artifacts

### Files Reviewed

- `skills/create-skill/scripts/bundle_skill.py` — the whole diff
- `tests/bundle-check-mode.test.js` — all 20 tests
- `.github/workflows/validate.yml` — the new step and its placement
- `package.json` — the `bundle:check` script and the test glob that collects the new file
- `skills/create-skill/references/skill-dependencies.json` — the regenerated copy

### Test Commands Executed

```bash
node --test tests/bundle-check-mode.test.js          # 20 pass / 0 fail
npm run ci:fast                                      # 3013 pass / 0 fail
python3 skills/create-skill/scripts/bundle_skill.py --check   # 126 skills, 0 problems
npm run validate:all                                 # 126 passed, 0 failed
python3 .../bundle_skill.py --all && git diff --quiet -- 'skills/*/references/*'
```

### Coverage

Coverage is not instrumented in this repository. Coverage of the *deliverable* is established by
mutation proof instead: 11 of 11 mutations red at least one test, which is a stronger statement than a
line percentage.

---

## Issues Found

### HIGH Severity Issues (0)
None.

### MEDIUM Severity Issues (1)

**T98-QA-001 — a stale headerless copy gets a remedy pointing the wrong way**
See Code Review above. `skills/create-skill/scripts/bundle_skill.py`.

### LOW Severity Issues (1)

**T98-QA-002 — "could not read" reported as "read and found unconvincing"**
See Code Review above. `skills/create-skill/scripts/bundle_skill.py`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

No bug report files created — per the skill's own rule these are recorded in the gate's `top_issues`
and here; the qa-fix cycle acts on them directly.

---

## Recommendations

### Immediate Actions (Blocking this gate)

1. **T98-QA-001** — name the headerless-suffix case so the AMBIGUOUS remedy points at
   delete-and-re-bundle rather than rename.
2. **T98-QA-002** — detect an unreadable file before `_looks_bundled` and report it as unread rather
   than as unconvincing.

### Short-term (Non-Blocking)

1. `shared/resources/observation-log-contract.md` contains the literal `shared/resources/<name>` in
   prose, so discovery warns on every bundle **and** every check run. Pre-existing — a plain
   `npm run bundle` prints it too — and out of scope here. Worth its own task.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: All 7 success criteria met, 4/4 phases complete, 20 tests and 11 mutation proofs, and
the deliverable found a real defect on first contact with the tree. One medium finding in how the
check reports its most common class, and one low finding where it states something it did not
establish. For a diagnostic tool whose entire output is a claim, both are worth a fix cycle.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL — resolve T98-QA-001.

---

**Next Steps**: `/qa-fix` addresses T98-QA-001 and T98-QA-002, then re-review.
