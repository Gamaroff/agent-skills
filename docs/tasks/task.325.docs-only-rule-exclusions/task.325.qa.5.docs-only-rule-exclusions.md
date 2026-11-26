# QA Report: Task 325 - The docs-only CI rule can exclude a path (cycle 5)

**Task**: [task.325.docs-only-rule-exclusions.md](./task.325.docs-only-rule-exclusions.md)
**Gate File**: [task.325.gate.5.docs-only-rule-exclusions.yml](./task.325.gate.5.docs-only-rule-exclusions.yml)
**Previous**: [task.325.qa.4.docs-only-rule-exclusions.md](./task.325.qa.4.docs-only-rule-exclusions.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Gate Status**: PASS

---

## Executive Summary

Cycle 4's fix holds, and T325-CR-401 is closed. The reference now states the glob grammar, the dialect syntax people type is refused, and no exclusion fails open. Every reader of `ci.docsOnly.patterns` goes through `isDocsPath`. Two LOW entries remain open (T325-CR-501, T325-CR-502). Both fail closed or concern wording, so neither is worth a fix cycle.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Review Methodology

Re-review. Diff review was a code review with a refute pass, run by one Explore subagent that returned in about 185 s (`duration_ms` 185192). Criteria drift: `clean`. CHANGELOG: `cites (task 325)`.

CI on 3a2d45cd9b51: pending (6 pass, `test` pending)

Step 4b: not applicable; no `SKILL.md` or `shared/resources/*.md` is changed in this cycle.

---

## Issues Found

### HIGH (0) · MEDIUM (0)

### LOW Severity Issues (2)

**T325-CR-501**: `!docs/blog/[slug].md` is refused, and the message says to list each path, but that path is the one being refused. `!docs/blog/?slug?.md` does exclude the file; this was reproduced, and `isDocsPath` returns false. The failure is closed: the owner gets a usage error, never a silent skip.

**T325-CR-502**: the CHANGELOG says "extglob" are refused, but only `@(`, `!(` and `+(` are. `!docs/*(draft).md` is accepted by design, because `*` is a wildcard in the documented grammar. This was reproduced.

### Closed
T325-CR-401 (3a2d45cd9).

---

## NFR Assessment

- **Security**: PASS. Evidence is measured: 11 probes executed, 0 escaped. The run record is `task.325.qa.5.docs-only-rule-exclusions.security.run.json`.
- **Reliability**: PASS. ci:fast at 3a2d45cd9 ran 8906 tests with 0 failures.
- **Performance**: PASS.
- **Maintainability**: PASS.

---

## Code Review

**Correctness bugs (2, both low):**
- [low/medium] `ci-tree-equivalence.js:827`: a bracketed literal name is refused, and the remedy in the message cannot be followed. QA reproduced this, and it is filed as T325-CR-501.
- [low/medium] `CHANGELOG.md:20`: the "extglob" claim is broader than the code. QA reproduced this, and it is filed as T325-CR-502.

**Cleanups (0)**

**Boundary**: true. `probes_executed: 11`, `escaped: 0`.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 96/100
**Deployment Recommendation**: READY
**Next Steps**: run the loop route classifier. The expected route is the Cosmetic-residue exit to 5c, with the two LOW entries carried.
