# Sprint Review Summary - A refusing shell script is a boundary the probe engine can reach, and finalise has a bounded third exit

**Story/Task ID:** task.128
**Epic:** _n/a (standalone task; observation #121)_
**Completed Date:** 2026-09-20
**Completed By:** develop-task pipeline (autonomous, via /develop-next)
**Pull Request:** [#446](https://github.com/Gamaroff/agent-skills/pull/446)

---

## Summary

The security probe engine can now execute a bash script boundary (`--entry shell:<path>`, `filename` sink, bash + zsh, engine-written count), the boundary rule names a refusing script by its own header, and `/finalise` has a bounded, evaluator-gated fix-and-recheck exit for a low-severity single-commit finding instead of choosing between "accept" and "halt a hands-free run".

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `security-probe.mjs --entry shell:shared/resources/qa-cycle.sh --sink filename` executes every case under bash and zsh and reproduces the newline case on the pre-fix script
- [x] `classifyBoundaryText` classifies a refusing script as a boundary by its header; the task.121 gate-5 note is the pinned negative fixture
- [x] `/finalise` proceeds through fix-and-recheck only when all five preconditions hold (`severity-low`, `single-commit`, `inside-files-summary`, `mutation-proved`, `no-other-finding-open`) and halts otherwise, including on a finding with no severity
- [x] No change to the JS entry path; one engine, one record shape
- [x] Each mechanism mutation-proved (31 mutants killed in total)
- [x] Observation #121 set `actioned` naming PR #446

### Key Features Implemented

- **Shell entry form**: `resolveEntry` accepts `shell:<path>`; `runShellCase` materialises each corpus case as a file in a per-(case, shell) fixture directory with bracketing controls and `LC_ALL=C`, runs `bash "$1" "$2"` under bash and zsh with sandboxed HOME/TMPDIR, compares `expected {stdout, exit, stderr, absent}`, declines launch failures (bash-keyed 126/127), reports side effects in HOME, TMPDIR, the script's own directory and the fixture as escapes
- **`filename` sink**: 9 hostile + 5 legitimate cases in the shared corpus, each with an `expected`; `MATERIALISED_SINKS` with the control pair `!.gate.3.control.yml` / `~.gate.12.control.yml`
- **Boundary signal module**: `probe-boundary-signals.mjs` exports the five signals and `classifyBoundaryText`; the fifth (self-declared refusal) is what a script's own words match
- **Finalise fix-and-recheck**: `finalise-fix-and-recheck-preconditions.json` + `finalise-fix-and-recheck.mjs` (three evaluator runs; `--git-base` licences the push from what git says; mutation proof must be a recorded red run); Step 6 FIX-AND-RECHECK row and Step 8a in the finalise skill; `severity` on the security agent's probes and FAIL checks

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` — shell entry form, expected comparison, launch-failure matcher, escapes, record `shells`
- `shared/resources/security-input-corpus.{mjs,md}` — filename sink, `OPTIONAL_CASE_FIELDS`, `MATERIALISED_SINKS`
- `shared/resources/probe-boundary-signals.mjs` (new) — signals + classifier
- `shared/resources/finalise-fix-and-recheck.mjs`, `finalise-fix-and-recheck-preconditions.json` (new) — evaluator
- `shared/resources/{probe-boundary-rule,finalise-dod-security-prompt,security-review-prompt}.md`, `skills/finalise/SKILL.md`, `skills/finalise/references/definition-of-done-checklist.md`, `skills/{qa-task,qa-story,review-security}/SKILL.md`, `docs/reference/anti-patterns.md`, `CHANGELOG.md`
- Tests: `shared/resources/tests/{security-probe,security-input-corpus,probe-boundary-signals,finalise-fix-and-recheck}.test.mjs`, `skills/review-security/tests/review-security.test.js`, `evals/shared/tests/probes-executed-population.test.mjs`; fixtures under `shared/resources/tests/fixtures/security-probe/` and `tests/fixtures/qa-cycle.prefix.sh`
- Bundled `references/` copies regenerated in finalise, qa-task, qa-story, review-security

### Architecture/Design Decisions

- `shell:` is an entry **form**, not a second engine — the case loop, directions, `computeVerdict` and record writer are unchanged, so `probes_executed` stays engine-written
- Case input never reaches a shell string: names are materialised as files, the script gets `$1`/`$2` positionals
- A case whose `expected` compares nothing, or names an `absent` that the fixture itself creates, is declined rather than scored
- The fix-and-recheck path is reachable only through the evaluator, never through judgement; `unverifiable` is a reason, never a verdict (new anti-pattern)

### Dependencies

- **New Dependencies Added:** none (node built-ins)
- **Breaking Changes:** none

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 3,579 in the per-PR lane; 32 new at develop plus regression tests for 13 QA bugs
- **Mutation proofs:** 12 (develop) + 5 + 7 + 4 + 3 (QA cycles 1–4), all red on their named test
- **Security probes:** 39 engine-recorded per gate (records qa.1–5 and dod)

### QA

- Five QA cycles: FAIL 40 → FAIL 50 → CONCERNS 60 → CONCERNS 90 → CONCERNS 95 (no open entry); 13 bugs opened, 13 closed by execution; HIGH 2 → 1 → 0 → 0 → 0
- Step 5c `/review-pr`: CONCERNS — 5 conformance findings applied; CR-1 recorded as a known limit

### Code Review

- **Reviewers:** read-only Explore reviewer each QA cycle (refute pass at cycle 2), Step 5c code + conformance lenses, four DoD agents at finalise
- **Approval Status:** ✅ Accepted via DoD
- **CI:** reading 1 SUCCESS @ `01a0b475` over 5 checks

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets; no new unsafe patterns; case input never interpolated into a shell string
- [x] Boundary probed: 39 executed; only the known pre-existing `resolveEntry` symlink-escape reproduced
- [x] Fix-and-recheck evaluator refused 11/11 hostile records, accepted the legitimate one

### Compliance

⚠️ NOT_APPLICABLE — agent tooling only.

---

## Known Limitations & Future Work

- `mutation-proved` is keyed on the proof's **file**, not the test title (PR review CR-1) — first item for a follow-up task
- `severity-low` is self-reported and not cross-checked against the run record's `escaped` count (CR-2)
- `listDirStamps` stamps sibling directories (CR-3); inline non-object `expected` guard duplicates `expectedProblem` (CR-4)
- A case-variant of an engine-created fixture name slips the string collision check on case-folding filesystems (QA cycle 5 CR-1); the CR-3 test fixture should `exec` its sleep
- `resolveEntry` symlink-escape — pre-existing lexical-containment limit

## Demo Notes

`command node shared/resources/security-probe.mjs --sink filename --entry shell:shared/resources/qa-cycle.sh --repo-root "$(git rev-parse --show-toplevel)" --json` → `engages`, 28 executed, `shells: [bash, zsh]`. Against `tests/fixtures/qa-cycle.prefix.sh` (the pre-fix script) → `filename.newline-in-name` reproduced under both shells.
