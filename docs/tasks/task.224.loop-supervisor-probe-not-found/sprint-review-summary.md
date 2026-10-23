# Sprint Review Summary - loop-supervisor: say when the probe script is not found

**Story/Task ID:** task.224
**Epic:** none (standalone task; follow-up to task.214 QA CR-1 and CR-2)
**Completed Date:** 2026-10-21
**Completed By:** Lorien Gamaroff (autonomous `/develop-next` run)
**Pull Request:** [#724](https://github.com/Gamaroff/agent-skills/pull/724)

---

## Summary

The loop-supervisor probe now says when its script is missing. Before, an empty project or a mistyped `probeScript` produced the misleading error "probe produced no output". Now the error lists the paths searched, or the configured path that does not exist. The adapter table's default probe path now comes from one constant.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC1–SC3: `resolveAdapter` records the paths it searched. `probeMissing` reports `probe script not found:` with every candidate, or, for a missing override, the configured path and its config key.
- [x] SC4: a script that exists still spawns. A path counts as present exactly when `node <script>` would run it (extensionless names, directory `index.js`), and is re-checked on disk at each probe.
- [x] SC5: a spawned `dry-run --adapter develop-next` in an empty project reports "not found", not the empty-output error.
- [x] SC6: the `interpretProbe` empty-stdout message is unchanged.
- [x] SC7: resolution makes at most three exists calls, and the check adds one per probe.
- [x] SC8: both adapter-table `probeScript` defaults come from `DEFAULT_PROBE_SCRIPT`, the last search candidate.
- [x] SC9–SC12: the suite is green locally and in CI, validate passes, and the docs and CHANGELOG are updated.

### Key Features Implemented

- **Not-found diagnostic**: `probeMissing()` in `adapters.js`, checked by `runProbe` before the spawn.
- **Node-faithful existence**: `resolvesAsMain()` uses `require.resolve` and then `fs.existsSync` on the resolved path.
- **Single default path**: `DEFAULT_PROBE_SCRIPT` replaces the two copies of the literal in the adapter table.

---

## Technical Details

### Files Modified/Created

- `skills/loop-supervisor/references/adapters.js`: `probeMissing`, `resolvesAsMain`, `DEFAULT_PROBE_SCRIPT` and the `probeSearched` bookkeeping
- `skills/loop-supervisor/scripts/run-loop.mjs`: `runProbe` reports a missing script before spawning
- `evals/loop-supervisor/unit/adapters.test.mjs`: unit tests for the not-found reasons, Node-resolution agreement, a deletion between probes and call counts
- `evals/loop-supervisor/unit/run-loop.test.mjs`: spawned dry-run tests with the script absent and present
- `skills/loop-supervisor/README.md` and `docs/reference/configuration.md`: the error is documented
- `CHANGELOG.md`: an [Unreleased] entry citing task 224

### Architecture/Design Decisions

"Present" means "Node would run it", not "a file exists at this exact path". The check therefore agrees with the spawn it guards, and never refuses a script Node would run. The check reads the disk at every probe, because `require.resolve` caches a hit and the loop probes every iteration.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. Only the error text for a missing probe script changes.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 253 in the loop-supervisor suite (252 pass, 0 fail, 1 skipped). The new tests are in `adapters.test.mjs` and `run-loop.test.mjs`.
- **Integration Tests:** spawned `run-loop.mjs dry-run` tests with the probe script absent and present
- **Test Coverage:** every success criterion has a test. The QA-3 fix is mutation-proven: reverting the re-check turns both deletion tests red.

### Code Review

- **Reviewers:** none required (single-maintainer repo). The QA loop ran the adversarial code reviewer in each of 4 cycles, and Step 5c ran `/review-pr`.
- **Approval Status:** ✅ Gate 4 PASS 100. `/review-pr` CONCERNS, non-blocking.
- **Review Comments Addressed:** all. QA-1, QA-2 and QA-3 are fixed, and PC-1 and PC-2 are corrected.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No secrets, no shell or eval. The spawn is the existing `spawnSync(bin, argsArray)`, with no shell.
- [x] No dependency changes
- [x] `boundary: false`, reasoned: the check adds no refusal beyond what `node` already does

### Compliance Review

✅ **Compliance Requirements Met**

- [x] GDPR, PCI-DSS, WCAG and HIPAA are NOT_APPLICABLE (internal tooling)

---

## Documentation

### Updated Documentation

- [x] README updated (`skills/loop-supervisor/README.md`)
- [x] Configuration reference updated (`docs/reference/configuration.md`, the `loopSupervisor.adapters.<name>` row)
- [x] Inline doc comments on `probeMissing` / `resolvesAsMain`
- [x] CHANGELOG [Unreleased]

### Documentation Links

- [`task.224.dod.1.loop-supervisor-probe-not-found.md`](./task.224.dod.1.loop-supervisor-probe-not-found.md)
- [`task.224.qa.4.loop-supervisor-probe-not-found.md`](./task.224.qa.4.loop-supervisor-probe-not-found.md)

---

## Demo Notes

### How to Verify

1. In an empty directory, run `command node skills/loop-supervisor/scripts/run-loop.mjs dry-run --adapter develop-next`.
2. The probe result reads `probe script not found: …` and lists the three paths searched.
3. Set `loopSupervisor.adapters.develop-next.probeScript` to a missing path and re-run. The reason names that path and the config key.

### Screenshots/Visuals

None (CLI output).

---

## Impact & Value

### User Impact

An operator who starts the loop in the wrong directory, or mistypes the probe path, is told what is missing and where it was looked for. Before, they got an error that pointed at the probe's output.

### Technical Impact

The default probe path is defined once. The existence check matches Node's own resolution and is held by tests that compare it against `node` directly.

---

## Known Limitations & Future Work

### Current Limitations

- CR-1 (advisory, gate 4): after a stale cached hit, a replacement that appears later at a different resolution (for example `tools/select/index.js`) is still reported missing until the process restarts.

### Suggested Follow-Up Stories

- The CR-1 to CR-5 advisories in `recommendations.future` of gate 4

---

## Metrics _(if applicable)_

- **Time to Complete:** 1 day (one autonomous pipeline run)
- **Lines of Code Changed:** +1853 / -47, most of it pipeline artifacts under `docs/tasks/`

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
