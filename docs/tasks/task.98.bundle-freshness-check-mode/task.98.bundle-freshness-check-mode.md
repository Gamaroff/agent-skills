---
id: task.98
title: "[Task 98] A per-file bundle-freshness assertion the regenerate-and-diff check cannot provide"
type: task
description: "The CI bundle-freshness check regenerates and diffs. That is adequate now that the bundler reconciles against disk, but it still cannot see a bundled copy whose source was deleted, a symlinked reference, or a copy that is not bundler output. A --check mode was built for this during task.86, ran five QA cycles, and was split out unmerged; this task carries it forward with its findings as the starting backlog."
tags: [bundler, build, tooling, ci]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: medium
created: 2026-09-08
updated: 2026-09-09
assignee:
estimated_effort_hours: 8
github_issue: 366
---

# Technical Task: A per-file bundle-freshness assertion

**Status:** Ready for Review
**GitHub Issue**: [#366](https://github.com/Gamaroff/agent-skills/issues/366)
**Review**: ✅ All review recommendations from `task.98.review.1.bundle-freshness-check-mode.md` implemented 2026-09-09

---

## 1. Overview

`.github/workflows/validate.yml` asserts bundle freshness by running the bundler and diffing the
working tree. Task 86 made that check **effective again** — the bundler now reconciles against disk, so
a copy it previously skipped is written and `git diff` sees it. Measured after task 86: changing one
shared source made the check go red on all four consumers, including the three orphans it had been
blind to.

What regenerate-and-diff still cannot see is anything the bundler does not *write*:

- a bundled copy whose `shared/resources/` source was **deleted** — it keeps a banner naming a file
  that no longer exists, and stays green forever;
- a **symlinked** reference — a consumer copying the directory verbatim gets a dangling link;
- a copy that is **not bundler output** (an authored file sharing a name with a shared resource) — the
  bundler correctly refuses to touch it, so nothing reports the collision;
- a copy whose banner **declares a different path** than its own (a moved or renamed file).

A per-file equality assertion covers all four. One was built during task 86 and is **not** in the
merged work — see §3.

---

## 2. Motivation

### Why this is separate from task 86

Task 86's deliverable — disk reconciliation — was written in its first commit and never changed in
substance. The `--check` mode built alongside it went through **five QA cycles and ~45 findings**, with
cycles 2, 4 and 5 each finding defects introduced by the previous cycle's fix. The QA loop's
convergence guard tripped (HIGH per gate: 1, 2, 1, 2, 2).

Splitting was the response: merge the part that converged, carry the part that did not into a task with
its own budget and its findings already written down. That is what this document is.

### Why it is still worth doing

The four gaps above are real. None has a live instance in the tree today, which is exactly why they are
worth catching automatically rather than by inspection — a silent gap is discovered by the person it
breaks.

---

## 3. Technical Background

The prior implementation is preserved in the task-86 branch history rather than in `develop`. It is
worth reading before starting, not copying wholesale: it is the thing that failed to converge.

- Implementation and its five gate files: `docs/tasks/task.86.bundle-transitive-refresh/`
  (`task.86.gate.1..5.*.yml`, `task.86.qa.1..3.*.md`)
- Branch: `feature/task.86.bundle-transitive-refresh`, commits `9eabfaae` (first `--check`) through
  `a5dbbab8` (last fix), then removed by the split commit.

### What the merged bundler already provides

These land with task 86 and this task builds on them rather than re-deriving them:

| Piece | What it gives you |
| --- | --- |
| `expected_bytes(src, name)` | The single definition of "in sync" — source + banner + path rewrite |
| `_looks_bundled` / `declared_source` | Structured banner match: `Source: shared/resources/<own path>` |
| `writable_copy` | The write gate, already applied at both write sites |
| `source_backed_on_disk` | Membership: on-disk copies that have a source |
| `_within` | Path-traversal refusal |

A checker built on `expected_bytes` **cannot drift from the bundler**, which is the property that
matters. Re-implementing the comparison is what produced a retracted false finding on T90.

---

## 4. Scope

### In Scope

- A read-only per-file freshness assertion, reusing `expected_bytes` rather than re-implementing it.
- Problem classes it must distinguish: `STALE`, `MISSING`, `WRONG MODE`, `ORPHANED` (source deleted),
  `SYMLINK`, `AMBIGUOUS` (not bundler output), `MISDECLARED` (banner names another path).
- A remedy line that is **correct per class**: `npm run bundle` clears STALE/MISSING/WRONG MODE and
  provably cannot clear the other four. Printing it for all of them leaves CI permanently red under an
  instruction that does nothing.
- Wiring into `validate.yml`, replacing or supplementing the regenerate-and-diff step.

### Out of Scope

- Changing the bundler's write behaviour. Task 86 settled that.
- Pass 3 (rewriting a skill's own files). See the residual below — a checker that asserts pass 3
  **compels** the rewrite, and the rewrite is a blind regex. Do not assert pass 3 without first fixing
  what it does to fenced blocks and URLs.

---

## 5. Breaking Changes

None expected. The check is additive; if it replaces the regenerate-and-diff step, that step's
behaviour is a subset of the new one.

---

## 6. Implementation Plan

**Phase 1 — Read the inherited findings, then write fresh (Low risk).**

> **Decided at review (2026-09-09), not left to the implementer.** The earlier wording offered a fork —
> recover task 86's ~200-line implementation, or write a narrower ORPHANED/SYMLINK-only check — which
> contradicts §4 In Scope and §9 Success Criteria, both of which already name all seven classes as
> required. The success criteria are the contract, so the narrow option is not actually available; and
> recovering the implementation that failed to converge across five QA cycles is what §2 warns against.
> **Write a fresh, minimal implementation covering exactly the seven classes §4 names**, with task 86's
> gate findings used as a pre-written defect list to check the new code against.

- [x] Read the five task-86 gate files as a findings backlog — not as source to port. Record which of
      the ~45 findings apply to a fresh implementation; each one is a test case, not a code change.
      Four inherited traps became tests directly (§8's table); residual 4 (a directory at a needed
      reference name, previously bucketed regenerable) is fixed rather than inherited.

**Phase 2 — Build the check (Medium risk).**

- [x] Reuse `expected_bytes`; do not re-implement the transform. `check_skill` calls it directly and
      shares `discover_needed` / `source_backed_on_disk` / `_looks_bundled` with the writer, so the
      check's population and its definition of "in sync" are the writer's.
- [x] Read-only: asserted, and mutation-proved twice — a `write_if_changed` inserted into the check
      path reds, and a `refs_dir.mkdir()` reds separately (a created directory is a mutation no
      content snapshot of an existing tree would catch).
- [x] Mode comparison in both directions, keyed on the source's mode, not on a suffix. Both
      directions are tested; narrowing the comparison to one direction reds.

**Phase 3 — Correct remedies (Low risk).**

- [x] Branch the summary on problem class. Verified by measurement in both directions: each of
      STALE / MISSING / WRONG MODE is dirtied in its own fixture and cleared by a bundle run, and each
      of ORPHANED / SYMLINK / AMBIGUOUS survives one — so the regenerate remedy is printed for exactly
      the classes it clears. The summary names only the classes it counted, which is what keeps
      "class X was not reported" assertable.

**Phase 4 — Wire into CI (Low risk).**

- [x] `validate.yml` only — added as a step *before* regenerate-and-diff (the check is read-only and
      must speak about the tree as committed; the older step has already rewritten it by the time it
      speaks). The two are complements: `--check` sees what the bundler does not write, and
      regenerate-and-diff sees pass 3, which `--check` deliberately does not assert.
      `test.yml` was not touched, so `ci-gate-parity.test.mjs` is unaffected — re-run and green.
      `npm run bundle:check` added for local use; neither `test.yml` nor the `ci` composite calls it.

---

## 7. Files Summary

### Modify

- `skills/create-skill/scripts/bundle_skill.py`
- `.github/workflows/validate.yml`

### Add

- `tests/bundle-check-mode.test.js` — cross-cutting, per `source-tree.md`. Verified at review: the
  `test` script in `package.json` already globs `'tests/*.test.js'`, so a file added here is collected
  without a `package.json` edit. (A new `skills/*/tests/` directory would **not** be — those globs are
  listed by hand.)

---

## 8. Testing Strategy

Every behaviour **mutation-proven**: revert it and confirm a test goes red. Task 86 ran 31 mutation
proofs and several initially proved nothing — one hit a duplicate code block in the wrong function, one
was masked by a second guard, and one exposed its own test as vacuous. Budget for that.

Specific traps, each of which was a real finding:

| Trap | Why it bites |
| --- | --- |
| A fixture that produces a second problem class | Keeps a bucket non-empty and makes the assertion pass for the wrong reason |
| Asserting on whole stdout | The summary block *lists* class names, so `doesNotMatch(/AMBIGUOUS/)` fails on the explainer |
| Testing the reconciliation path only | The gate has three inbound paths; one fixture seed exercises the safe one |
| Byte-bounded banner search | The banner sits after YAML frontmatter — measured at char 499 in a real file |

---

## 9. Success Criteria

- [x] A staled **orphan** (source deleted) fails the check — mutation-proved (disabling the orphan scan reds 5 tests), including the case where the banner sits after long frontmatter
- [x] A symlinked reference is reported, and reported as SYMLINK rather than MISSING — the branch order is mutation-proved
- [x] An authored file sharing a name with a shared resource is reported, never rewritten — both halves asserted in one test
- [x] The check is read-only — no mutation reachable, asserted on bytes + mode + the path set (not mtime, whose one-second granularity would make the assertion vacuous)
- [x] Every class's printed remedy actually clears that class, verified check → bundle → check — and the three that cannot be cleared are verified to survive a bundle run
- [x] `npm run bundle` remains idempotent — verified: two consecutive runs, 0 writes on each
- [x] `npm run ci` green **and** the `validate.yml` job reproduced locally — all four steps run by
      hand (`validate:all` 126/126, skill-dependencies drift clean, the new per-file check 126 skills
      / 0 problems, regenerate-and-diff clean)

---

## 10. Risk Assessment

| Risk | Level | Mitigation |
| --- | --- | --- |
| Repeats task 86's non-convergence | **High** | Start from the recorded findings; keep the class taxonomy as small as the criteria require |
| Re-implementing the transform yields false drift | Medium | Reuse `expected_bytes`; a raw checksum can never match |
| Asserting pass 3 compels a blind regex rewrite | Medium | Out of scope until pass 3 handles fences and URLs |
| A test passes for the wrong reason | Medium | Mutation-prove each behaviour; treat a mutation that reds nothing as a statement about the mutation |

---

## 11. Rollback Plan

**Trigger:** the check goes red on a state the bundler cannot clear, or CI becomes unreliable.

**Procedure:** revert the `validate.yml` step to regenerate-and-diff. That form is effective for
STALE/MISSING after task 86, so rollback loses the four extra classes and nothing else.

**Verification:** `npm run bundle` twice → clean second run; `git status` clean.

---

## QA Testing Results

**QA Status**: CONCERNS → FAIL (cycle 2) → fixed
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-09
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Cycle 1**: [task.98.qa.1.bundle-freshness-check-mode.md](./task.98.qa.1.bundle-freshness-check-mode.md) · [gate.1](./task.98.gate.1.bundle-freshness-check-mode.yml) — CONCERNS 90/100
- **Cycle 2 (refute pass)**: [task.98.qa.2.bundle-freshness-check-mode.md](./task.98.qa.2.bundle-freshness-check-mode.md) · [gate.2](./task.98.gate.2.bundle-freshness-check-mode.yml) — FAIL 80/100

### Test Coverage Summary

- **Tests Executed**: 20 new (3013 in the full suite), 11 mutation proofs
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS (measured, 3 probes), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Both findings are in how the check *reports*, not in what it detects — all 7 success criteria are met
and the check found a live stale copy in the tree on its first run.

- **T98-QA-001 (medium)** — a stale copy of a headerless suffix (`.json`) lands in AMBIGUOUS, whose
  remedy leads with "rename the authored file"; the right action for that case is delete-and-re-bundle.
  This is the exact shape of the live defect the check found.
- **T98-QA-002 (low)** — an unreadable file is reported as "carries no provenance banner and is not
  byte-identical", asserting content the check never read.
- **T98-QA-003 (high, cycle 2)** — the cycle-1 fix for T98-QA-002 was correct and **incomplete**: the
  same conflation survived in the orphan scan twenty lines away, so a copy that was both orphaned and
  unreadable reported `0 problems`. A clean result from a failed read, in the one check whose purpose
  is to make invisible staleness visible. Found by the cycle-2 refute pass, which a narrowed re-review
  would have missed — it would have read only the fixes, where the defect is absent.

---

## Change Log

| Date       | Version | Description                                                        | Author      |
| ---------- | ------- | ------------------------------------------------------------------ | ----------- |
| 2026-09-08 | 1.0     | Split out of task.86 after its QA loop's convergence guard tripped | develop-task |
| 2026-09-09 | 1.1     | Review passed (9/10) — Phase 1's resume-or-restart fork resolved in favour of a fresh minimal implementation; success criterion 6 rephrased off a point-in-time file count; test path made explicit; GitHub issue #366 created and linked | review-task |
| 2026-09-09 |         | Status → ready-for-development | review-task |
| 2026-09-09 |         | Implemented: `--check` mode (7 classes, read-only), 20 tests, wired into `validate.yml`; found and fixed a live stale bundled copy the existing check was blind to | develop |
| 2026-09-09 |         | Status → ready-for-review | develop |
| 2026-09-09 |         | QA gate CONCERNS (90/100) — 2 findings, both in the classifier's reporting; 7/7 success criteria met | qa-task |
| 2026-09-09 |         | QA cycle 2 (refute pass) FAIL (80/100) — orphan scan reported a clean result over an unreadable file; fixed | qa-task |

---

## Progress Tracking

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 — Read findings, write fresh | ✅ Complete | Fork resolved at review; task-86 gates read as a test backlog, not ported |
| Phase 2 — Build the check | ✅ Complete | `check_skill` / `check_all` in `bundle_skill.py`, built on `expected_bytes` |
| Phase 3 — Correct remedies | ✅ Complete | Remedy correctness verified by measurement in both directions |
| Phase 4 — Wire into CI | ✅ Complete | `validate.yml` step + `npm run bundle:check`; `test.yml` untouched |

---

## References

- Parent: `docs/tasks/task.86.bundle-transitive-refresh/` — the split, and five gates of findings
- `docs/tasks/task.86.bundle-transitive-refresh/task.86.gate.5.bundle-transitive-refresh.yml` — the six
  residuals this task inherits
- `skills/create-skill/scripts/bundle_skill.py` — `expected_bytes`, `_looks_bundled`, `writable_copy`
- `.github/workflows/validate.yml` — the current regenerate-and-diff step
- `evals/shared/tests/ci-gate-parity.test.mjs` — the set-equality constraint on CI wiring

---

## Notes

### Residuals inherited from task 86

Recorded rather than re-discovered. None has a live instance in the tree.

1. **Pass 3 is an ungated blind regex.** It turns a `blob/main/shared/resources/x.md` URL into a 404
   and rewrites fenced commands. A fence exemption was tried and **reverted**: 75 lines across 24
   skill docs invoke `source references/…` inside ```bash blocks and hold that form *because* pass 3
   rewrote them.
2. **Fixed-depth rewrite prefix.** `../references/X` for `.sh`/`.js`/`.mjs` and bare `references/X`
   for `.md` assume the referencing file is one level deep. Deeper files get a path that does not
   resolve.
3. **`expected_bytes` catches only `UnicodeDecodeError`** where its siblings also catch `OSError`; a
   0000-mode source raises an uncaught `PermissionError` mid-write.
4. **A directory at a needed reference name** is reported MISSING and bucketed regenerable, while the
   write gate correctly refuses it forever.
5. **Evidence 2 cannot distinguish** a pre-header bundled copy from an authored file byte-identical to
   the rewritten source. Bounded — no content is lost.
6. **A header-less file (`.json`) whose source was deleted** cannot be reported ORPHANED: no banner to
   read.
