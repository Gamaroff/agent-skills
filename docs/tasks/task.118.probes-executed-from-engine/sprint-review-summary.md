# Sprint Review Summary - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Story/Task ID:** task.118
**Epic:** _n/a — standalone technical task_
**Completed Date:** 2026-09-17
**Completed By:** Claude (develop-task pipeline via develop-next)
**Pull Request:** [#418](https://github.com/Gamaroff/agent-skills/pull/418)

---

## Summary

`review-security`'s strongest verdict (`evidence: measured`) rested on a `probes_executed` integer the agent typed, and the contract test checked the prompt's example rather than a run. Now the probe engine writes a run record and prints the output block from it, with `evidence` computed — so `measured` cannot be typed — and a population test fails any shipped site that types the count.

---

## What Was Delivered

### Success Criteria Met

- [x] SC1 — `probes_executed` and `evidence:` in the block are copied from an engine-written record (`--record` / `--emit-block`)
- [x] SC2 — `measured` cannot appear in the emitted block without a record; `evidenceOf` computes it; the contract test runs the engine and mutates the record
- [x] SC3 — finalise's DoD security prompt runs the engine with `--record` and copies `totals.executed`
- [x] SC4 — `probes-executed-population.test.mjs`: 5 producer files, allowlist with reasons, floor, `--repo-root` guard
- [x] SC5 — observation #10 actioned, naming PR #418

### Key Features Implemented

- **Run record**: `security-probe.mjs --record <path>` writes one atomic entry file per control under `<path>.d/` (named from `{sink, entry}`) and folds the directory into a snapshot at `<path>`; `readRecord` folds the directory and never reads the snapshot; a snapshot without entries is loud
- **`--emit-block <record> [--mode]`**: prints the `security_review:` YAML with `probes_executed`, `evidence` (computed) and `controls[]`; a missing record renders the honest zero block; the reader snapshot is refreshed best-effort
- **`--repo-root`**: re-anchors the containment root so a bundled `references/` copy can probe a consumer's tree
- **Readers converted**: review-security prompt + SKILL, finalise DoD prompt, and a third site the task had not named — qa-story / qa-task Step 3b — all run the engine and paste, never type
- **Population test**: every shipped `probes_executed` / `evidence: measured` site reads the record or is allowlisted with a reason; every engine invocation carries `--repo-root`

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` — record/entry/fold/emit; `--record`, `--emit-block`, `--repo-root`, `--name`, `--call-site`, `--mode`; parse-time operand checks; YAML-safe rendering
- `shared/resources/security-review-prompt.md`, `skills/review-security/SKILL.md` — paste from the engine; `--repo-root`
- `shared/resources/finalise-dod-security-prompt.md` — probe mode runs the engine with `--record`
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — Step 3b runs the engine
- `skills/review-security/tests/review-security.test.js` — +37 tests (55 total)
- `evals/shared/tests/probes-executed-population.test.mjs` — new (6 tests)
- `skills/{finalise,qa-story,qa-task,review-security}/references/` — bundled copies
- `CHANGELOG.md` — Changed (task 118)

### Architecture/Design Decisions

- The merged record file introduced in cycle 2 needed a lock, and the lock grew a crash-recovery edge per QA cycle (stale reclaim, reclaim TOCTOU, put-back overwrite, orphan stall, pid-write leak). In cycle 6 it was replaced by per-control entry files with no shared write — the reviewer's own cycle-2 alternative. Third-strike reasoning applied although the rule never fired formally (no HIGH).
- `evidence` is computed from the entries, never read from the snapshot, so a hand-edited snapshot cannot change the block.

### Dependencies

- **New Dependencies Added:** none (`node:crypto`, `node:fs` builtins)
- **Breaking Changes:** a review or DoD step whose engine did not run now reports `probes_executed: 0` / `evidence: reasoned` where it may previously have said `measured` — the truth surfacing; CHANGELOG under Changed

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 55 in `skills/review-security/tests/review-security.test.js`, 6 in `evals/shared/tests/probes-executed-population.test.mjs`; `finalise-dod-prompt-contract` 32/32
- **Mutation proofs:** every fix in every cycle reverted and its test confirmed red (one `data-dependent`: atomicity)
- **`npm run ci:fast`:** 3401 tests, 3400 pass, 1 skipped, 0 fail

### QA

- 10 QA cycles (budget extended by the user after 5); gates 1–9 CONCERNS with every finding fixed in-cycle; gate 10 PASS 100/100; never a HIGH
- Step 5c `/review-pr`: CONCERNS (advisory) — PC-1 acted on as a documentation edit; CR-1..3 low, follow-up
- Bugs: `task.118.bug.1` (review-security command omitted `--repo-root`) and `task.118.bug.2` (last-writer-wins merge) — both closed

### Security & Compliance

- Security: PASS — no boundary in the change set; greps clean; no dependency change
- Compliance: NOT_APPLICABLE

---

## Documentation Updates

- CHANGELOG (task 118); the five prose sites above; engine header documents every flag; bundles in sync; skill catalog unaffected

---

## Demo Notes

```bash
node shared/resources/security-probe.mjs --sink url-authority \
  --entry 'skills/review-security/tests/fixtures/redis-tls/inert.mjs#buildRedisOptions' \
  --repo-root "$(git rev-parse --show-toplevel)" --record /tmp/demo/run.json --name redis-tls
node shared/resources/security-probe.mjs --emit-block /tmp/demo/run.json     # evidence: measured, probes_executed: 12
rm -r /tmp/demo/run.json.d && node shared/resources/security-probe.mjs --emit-block /tmp/demo/run.json   # → exit 2: a snapshot without entries is not a record
```

---

## Known Limitations and Future Work

- CR10-1: a JSDoc block sits above `openRecordForWrite` instead of `recordRun`
- 5c CR-1..3 (low): circular remedy text in the orphan-snapshot error; `null:export` default name when `--cases-file` is used without `--sink`; `emitBlock` on a bare object throws where `evidenceOf` tolerates it
- Atomicity of the entry write is architectural, not provokable by a test
