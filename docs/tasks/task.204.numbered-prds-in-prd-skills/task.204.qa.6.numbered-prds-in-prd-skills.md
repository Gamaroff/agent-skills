# QA Report: Task 204 - Numbered PRDs in the PRD skills (cycle 6)

**Task**: [task.204.numbered-prds-in-prd-skills.md](./task.204.numbered-prds-in-prd-skills.md)
**Gate File**: [task.204.gate.6.numbered-prds-in-prd-skills.yml](./task.204.gate.6.numbered-prds-in-prd-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 6 at `18ff932d` (fix commit `88f8ba81`), the first of two cycles granted on re-entry after the
loop limit. Gate 5's three findings are fixed and verified. The safety re-probe found one reproduced
medium: review-prd reports a PRD that resolves outside the root but does not stop, so its report
would be written through the link. One low advisory.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate-5 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 registry write follows a symlink | ✅ FIXED | row "gate-5: every block that reads or writes a PRD path refuses a symlink out of the root" |
| CR-2 review-prd compares paths as text | ✅ FIXED (detects) — see new CR-1: detected, but the review does not stop | same row; mutation spot check below |
| CR-3 keep outside-root message | ✅ FIXED | keep block's own outside-root arm; same row |

## New Findings This Cycle

- **[medium]** `skills/review-prd/SKILL.md:379` — a resolves-outside finding prints as Critical and the block exits 0; the next-report-number block has no containment and prints `REPORT` under the symlinked directory → halt on that finding, and check containment in the report-number block (**CR-1**, promoted).
- **[low]** `skills/shard-prd/SKILL.md:124` — one refusal for outside-root and off-layout; a symlinked PRD is pointed at a migration that cannot fix it → its own message (CR-2, advisory).

Searched unscoped (safety re-probe): full `origin/develop...HEAD` diff, vendored copies excluded,
53 files. The reviewer extracted all ten task.204 blocks and ran each against a fixture repo over
DOMAIN, FEATURE, FOUND_PRD, PRD_FILE, TITLE, PRD_INPUT, MIG_NAME and PRD_ROOT, with registry, domain
and PRD directory each missing, real, a live symlink and a dangling symlink; plus node argv injection
after `-e`, a `--name` value starting with `--`, and cell injection into the registry row.

---

## Review Methodology

Re-review scope: unscoped (prior gate: security CONCERNS on containment — clause 1 `false`,
`SAFETY_REPROBE=true` by judgement, as in cycles 3 and 5). One Explore reviewer with the SAFETY
RE-PROBE directive; 265 s (completion notice `duration_ms` 265274). Direct tools otherwise.

Step 4b: `create-prd/SKILL.md` 4 blocks refused (`mutating`), `review-prd/SKILL.md` 1 runnable + 5
refused, `shard-prd/SKILL.md` 3 refused. The one execution failure is the pre-existing Step 8
`git log --since` placeholder block (line 704; line 492 on develop), outside this diff.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0–2 | PASS | unchanged |
| Phase 1 (create-prd) | PASS | gate-5 CR-1, CR-3 fixed |
| Phase 3 (review-prd) | CONCERNS | CR-1 |
| Phase 4 (tests) | PASS | 36 rows |

---

## NFR Assessment

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 24
- Controls `create-prd-allocate-slug` (11) and `create-prd-allocate-domain` (13), both `engages`
  (`task.204.qa.6.security.run.json`). CR-1 is reachable only through a symlink under `docs/prd`,
  which the repository does not contain and no writer creates.

### Reliability — PASS · Performance — PASS · Maintainability — PASS

---

## Code Review

Anchors: all `ok`. Provenance: both findings are in blocks this diff adds; containment is in scope.

**Correctness bugs (2):**
- [medium/high] `skills/review-prd/SKILL.md:379` — resolves-outside finding does not stop the review; report-number block uncontained. **Promoted: CR-1.**
- [low/high] `skills/shard-prd/SKILL.md:124` — shared refusal message for outside-root and off-layout.

**Cleanups (0).** **Boundary**: `boundary: true`, `probes_executed: 24`.

mutation-proven: review-prd realpath containment disabled (`fs.existsSync(abs) &&` → `false &&`, 1 → 0 occurrences) → gate-5 symlink row red (35 pass / 1 fail) → covered

---

## Regression Testing

`npm run ci:fast` with `.agents/skills` parked aside: rc 0, 5712 pass / 0 fail. `validate` on
create-prd, review-prd, shard-prd: rc 0. `prd-skill-numbering.test.mjs`: 36/36.

### Test Commands Executed
```bash
npm run ci:fast
npm run validate -- skills/{create-prd,review-prd,shard-prd}/
command node --test evals/shared/tests/prd-skill-numbering.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --repo-root "$PWD" --entry 'fence:skills/create-prd/SKILL.md#Allocate a new PRD number' --slot '"$FEATURE"' --name create-prd-allocate-slug --cases-file .claude/state/t204-alloc-cases.json --record docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.qa.6.security.run.json --json
command node .agents/skills/qa-task/references/security-probe.mjs --repo-root "$PWD" --entry 'fence:skills/create-prd/SKILL.md#Allocate a new PRD number' --slot '"$DOMAIN"' --name create-prd-allocate-domain --cases-file .claude/state/t204-domain-cases.json --record docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.qa.6.security.run.json --json
```

---

## Final Assessment

**Gate Status**: CONCERNS — one medium. **Quality Score**: 90/100.
**Deployment Recommendation**: CONDITIONAL — CR-1 closed.
**Next Steps**: `/qa-fix` cycle 6.
