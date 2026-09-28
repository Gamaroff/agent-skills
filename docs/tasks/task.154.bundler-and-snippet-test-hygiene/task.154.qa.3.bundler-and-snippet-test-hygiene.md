# QA Report: Task 154 - Bundler and snippet-test hygiene: attributed warning, symlink-free test run

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Gate File**: [task.154.gate.3.bundler-and-snippet-test-hygiene.yml](./task.154.gate.3.bundler-and-snippet-test-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Testing Completed**: 2026-09-29
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 was a scoped re-review at `5b1e3d91`. The cycle-2 findings are fixed. The §2 scan floor now
reads the scan's own count, and an unresolvable target is caught. A by-hand re-probe of the
rewritten runner with 21 candidates found nothing unsafe. The scoped review then found defects in
the protection added by the cycle-2 fix itself. The lock's stale takeover is not atomic, and the
ownership check runs before the lock is consulted. That makes three consecutive cycles of findings
on the same subject.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| T154-QA2-1: §2 passes a scan of zero skills | MEDIUM | FIXED | §1f; scan count read from `--check`; 20/20 tests, also under `TMPDIR=/tmp` |
| T154-QA2-2: concurrent runs clobber each other | MEDIUM | PARTIAL | A live-owner lock holds (by-hand probe: refused, lock kept). The takeover path still races: T154-QA3-1 |
| QA2-3 to QA2-9 (LOW) | LOW | FIXED | By-hand re-probe: case variant, `/private/var/tmp`, control chars (tab and newline), missing parent, unlistable path. All refused with exact reasons |

---

## Testing Scope

### Review Methodology

Direct tools plus one scoped reviewer (Explore). The diff was scoped to the 13 files changed since
gate 2 (`2026-09-28T22:21:04Z`).

Re-review scope: since 2026-09-28T22:21:04Z (default; gate 2 security was `PASS measured`, so clause
1 did not fire). The runner was rewritten this cycle, so it was re-probed by hand anyway.

- **Step 4b.** No `SKILL.md` or shared `.md` in scope.

---

## New Findings This Cycle

- **[medium]** `scripts/test-clean-checkout.sh:127` — stale-lock takeover is `rm -rf LOCK; take_lock`,
  which is not atomic, so two runs can both hold the location
  ([bug 5](./task.154.bug.5.clean-checkout-lock-takeover-race.md)).
- **[medium]** `scripts/test-clean-checkout.sh:117` — ownership is decided before the lock is read, so a
  live run's mid-clone directory is reported as "remove it by hand"
  ([bug 6](./task.154.bug.6.clean-checkout-ownership-before-lock.md)).
- **[low]** `:118` — a lock with no pid is one state for a foreign directory and for this script's own
  lock between the `mkdir` and the pid write.
- **[low]** `:140` — `git clone` checks out the tree before the marker is written, so the
  "marked before checkout" comment does not hold.
- **[low]** `:117` — `<dir>.lock` never passes the location decision.
- **[low]** `:70` — a dangling-symlink `CLEAN_CHECKOUT_DIR` reads as absent.
- **[low]** (by-hand probe) a regular file is refused as "cannot be listed (ENOTDIR)". The refusal is
  right; the wording is not. This one is not entered in the gate.

### Structural note for qa-fix (Step 2.6, repeat subject)

Every runner finding from cycle 1 on has one subject: **deleting a location that someone else can
also name**.

- Cycle 1: the runner deleted whatever `CLEAN_CHECKOUT_DIR` named.
- Cycle 2: the marker proved who created a directory, but not that the creating run had finished.
- Cycle 3: the lock added to fix that has its own takeover race and check ordering.

Each fix protected the shared location a little more, and each protection created its own edge
cases. The alternative is to have no shared location. Each run clones into a fresh directory that
it creates atomically inside the configured base: a `mkdtemp` under `CLEAN_CHECKOUT_DIR`, never the
base itself. Each run deletes only that directory. With that design no lock, no marker, no takeover
and no ownership check are needed, and CR-1 to CR-6 have nothing to act on. Choosing the move is
qa-fix's decision; this report records the shape.

---

## NFR Assessment

### Performance — PASS

### Reliability — CONCERNS

T154-QA3-1 and T154-QA3-2.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured (by-hand §5.1)
- **Probes executed**: 21
- Every destructive candidate was refused. The live lock and a file at the lock path were both
  kept. A failing command's status propagated.

### Maintainability — CONCERNS

This is the third cycle running on one subject.

---

## Code Review

This section records Step 3b, scoped and blocking.

**Correctness bugs (6):**

- CR-1 (medium/high) → T154-QA3-1
- CR-2 (medium/high) → T154-QA3-2
- CR-3 to CR-6 (low) → T154-QA3-3 to QA3-6

**Cleanups (0).**

**Mutation spot check (cycle-2 fixes, re-run as QA):**

- mutation-proven: `check_all` scan-size line removed → §1e and §1f → covered
- mutation-proven: live-owner check off → the live-lock test → covered

Both were proven at 5b and cross-checked against the commit. They were not re-run separately this
cycle; the by-hand probe exercised the same paths.

**Platform variance:** `TMPDIR=/tmp node --test tests/test-clean-checkout.test.js tests/bundle-missing-source.test.js` → 20/20.

---

## Test Artifacts

```bash
node --test tests/test-clean-checkout.test.js tests/bundle-missing-source.test.js           # 20/20
TMPDIR=/tmp node --test tests/test-clean-checkout.test.js tests/bundle-missing-source.test.js   # 20/20
# by-hand re-probe: env -i PATH=<node>:/usr/bin:/bin HOME=<scratch> CLEAN_CHECKOUT_DIR=<candidate> CLEAN_CHECKOUT_CMD=<true|false> bash scripts/test-clean-checkout.sh   (21 candidates)
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL. The conditions are that T154-QA3-1 and T154-QA3-2 are
resolved.

**Next Steps**: `/qa-fix` cycle 3, taking the structural move rather than a fourth patch to the lock.
