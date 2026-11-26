# QA Report: Task 325 - The docs-only CI rule can exclude a path (cycle 4)

**Task**: [task.325.docs-only-rule-exclusions.md](./task.325.docs-only-rule-exclusions.md)
**Gate File**: [task.325.gate.4.docs-only-rule-exclusions.yml](./task.325.gate.4.docs-only-rule-exclusions.yml)
**Previous**: [task.325.qa.3.docs-only-rule-exclusions.md](./task.325.qa.3.docs-only-rule-exclusions.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3's consolidation holds: T325-CR-301 and T325-CR-302 are closed. The reviewer compared `isDocsPath` with origin/develop on 216 path and pattern cases that hold no `!` entry, and found no difference.

One new medium, T325-CR-401, reproduced. An exclusion written in another glob dialect (braces or a character class) is accepted and excludes nothing, because the matcher treats `{` and `[` as literal characters and the docs never state its grammar.

This is the third gate in a row to name the exclusion check. The fix should state the grammar so the claim stops growing one shape at a time.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

This is a re-review: the previous gate was CONCERNS and code has moved since. The diff review was a code review with a refute pass, run by one Explore subagent that returned in about 138 s (`duration_ms` 138323). Criteria drift: `clean`.

CI on 3cffeb926391: pending (5 pass, `test` pending)

Step 4b: not applicable. The change set touches no `SKILL.md` or `shared/resources/*.md`.

---

## Issues Found

### MEDIUM Severity Issues (1)

**T325-CR-401: a dialect exclusion is accepted and excludes nothing**

| Patterns | File | `isDocsPath` |
| --- | --- | --- |
| `docs/**`, `!docs/{catalogue,index}.md` | `docs/catalogue.md` | true (fails open) |
| same | `docs/index.md` | true (fails open) |
| `docs/**`, `!docs/[ab].md` | `docs/a.md` | true (fails open) |

The grammar was checked against `glob-match.js` itself. Its header says "`**` crosses separators, `*` and `?` do not, and every other character is literal". The checks:

- `matchesAnyGlob("docs/a.md", ["docs/?.md"])` → true
- `matchesAnyGlob("docs/{a,b}.md", ["docs/{a,b}.md"])` → true
- `matchesAnyGlob("docs/[ab].md", ["docs/[ab].md"])` → true

So a brace pattern can match a file whose name holds the braces literally. It does not match the files a gitignore or minimatch user means.

### Closed

T325-CR-301 and T325-CR-302 (3cffeb926).

---

## NFR Assessment

- **Security**: PASS. Evidence: measured. Probes executed: 11, escaped: 0. The run record is `task.325.qa.4.docs-only-rule-exclusions.security.run.json`.
- **Reliability**: CONCERNS (T325-CR-401).
- **Performance**: PASS.
- **Maintainability**: PASS.

---

## Code Review

**Correctness bugs (1):**
- [medium/medium] `ci-tree-equivalence.js:810`: brace and class exclusions are accepted. QA reproduced this, and it is promoted to T325-CR-401.

**Cleanups (0)**

**Boundary**: true. `probes_executed: 11`, `escaped: 0`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Conditions**: T325-CR-401
**Next Steps**: `/qa-fix` cycle 4. This is the last fix the gate budget allows, so gate 5 must be clean.
