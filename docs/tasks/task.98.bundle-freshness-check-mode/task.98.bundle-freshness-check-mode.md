---
id: task.98
title: "[Task 98] A per-file bundle-freshness assertion the regenerate-and-diff check cannot provide"
type: task
description: "The CI bundle-freshness check regenerates and diffs. That is adequate now that the bundler reconciles against disk, but it still cannot see a bundled copy whose source was deleted, a symlinked reference, or a copy that is not bundler output. A --check mode was built for this during task.86, ran five QA cycles, and was split out unmerged; this task carries it forward with its findings as the starting backlog."
tags: [bundler, build, tooling, ci]
category: infrastructure
status: draft
priority: Medium
risk_level: medium
created: 2026-09-08
updated: 2026-09-08
assignee:
estimated_effort_hours: 8
---

# Technical Task: A per-file bundle-freshness assertion

**Status:** Draft

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

**Phase 1 — Decide whether to resume or restart (Low risk).**

- [ ] Read the five task-86 gate files. Decide deliberately whether to recover the prior implementation
      or write a smaller one. It reached ~200 lines and seven classes; a narrower check covering
      ORPHANED and SYMLINK only may be worth more than a complete one.

**Phase 2 — Build the check (Medium risk).**

- [ ] Reuse `expected_bytes`; do not re-implement the transform.
- [ ] Read-only: assert no filesystem mutation is reachable from the check path.
- [ ] Mode comparison in both directions, keyed on the source's mode, not on a suffix.

**Phase 3 — Correct remedies (Low risk).**

- [ ] Branch the summary on problem class. Verify by measurement: check → bundle → check, and confirm
      the classes you call regenerable actually clear.

**Phase 4 — Wire into CI (Low risk).**

- [ ] `validate.yml`. Do **not** add an `npm run …` term to `test.yml` without adding it to the `ci`
      composite — `evals/shared/tests/ci-gate-parity.test.mjs` asserts set equality both ways.

---

## 7. Files Summary

### Modify

- `skills/create-skill/scripts/bundle_skill.py`
- `.github/workflows/validate.yml`

### Add

- Tests under `tests/` (cross-cutting, per `source-tree.md`)

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

- [ ] A staled **orphan** (source deleted) fails the check — mutation-proved
- [ ] A symlinked reference is reported
- [ ] An authored file sharing a name with a shared resource is reported, never rewritten
- [ ] The check is read-only — no mutation reachable, asserted
- [ ] Every class's printed remedy actually clears that class, verified check → bundle → check
- [ ] `npm run bundle` remains idempotent; 858 bundled files, 0 added, 0 removed
- [ ] `npm run ci` green **and** the `validate.yml` job reproduced locally — `ci` runs neither
      `validate:all` nor the freshness step

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

## Change Log

| Date       | Version | Description                                                        | Author      |
| ---------- | ------- | ------------------------------------------------------------------ | ----------- |
| 2026-09-08 | 1.0     | Split out of task.86 after its QA loop's convergence guard tripped | develop-task |

---

## Progress Tracking

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 — Resume or restart | ⏳ Pending | Read the five task-86 gates first |
| Phase 2 — Build the check | ⏳ Pending | |
| Phase 3 — Correct remedies | ⏳ Pending | |
| Phase 4 — Wire into CI | ⏳ Pending | |

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
