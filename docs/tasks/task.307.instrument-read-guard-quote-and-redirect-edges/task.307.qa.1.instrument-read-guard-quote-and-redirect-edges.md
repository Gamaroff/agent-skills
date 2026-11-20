# QA Report: Task 307 - Instrument-read guard quote and redirect edges

**Task**: task.307.instrument-read-guard-quote-and-redirect-edges.md
**Gate File**: task.307.gate.1.instrument-read-guard-quote-and-redirect-edges.yml
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-14
**Gate Status**: PASS

---

## Executive Summary

The guard now masks a single quote glued to a word or a closing quote when a partner quote follows, and it treats `&>`, `&>>`, `1>` and `1>>` as redirects. No findings. **Overall Assessment**: PASS. **Deployment Recommendation**: APPROVED.

## Review Methodology

Direct tools, standard mode. The diff code review (Step 3b) was done inline by the orchestrating session, not by an independent subagent, so the reviewer is not independent of the author. Diff review: code review. Step 4b: not applicable, no runnable prose in the change set (one test file, one CHANGELOG, task documents). CI on 31869138391c: pending (PR #902 only just opened; the gate does not wait on CI, `/finalise` reads it on the final commit).

## Phase 1 decision (recorded as the task asks)

Option 2 (balance) chosen. A glued `'` opens a quote only when a partner `'` follows later on the line, so `foo'bar; baz' $?` and `"a"'s; b' $?` are flagged, and `Don't …`, `it's …` stay prose. Evidence: matcher probes before the change returned `false` for both QA-7 shapes; after, the fixtures flag them and the three task 299 cycle 3 controls pass. Known limit, fixtured and named in the header: two apostrophes on one line pair up (`it's cmd; echo "rc=$?"; don't` is not flagged).

## Phase 2 decision

Captured status `x=$(cmd; echo $?)`: left flagged, named in the header as a deliberate choice and held by a flagged fixture. Redirects: `&>`, `&>>`, `1>`, `1>>` pass; `2>&1` and `2> log` stay flagged; unredirected twin `cmd; echo "rc=$?"` stays flagged.

## Implementation Verification

| Phase | Status | Result | Notes |
| --- | --- | --- | --- |
| 1: Quote edge | PASS | Verified | glued rule, both QA-7 shapes flagged, controls pass |
| 2: Redirect and capture edges | PASS | Verified | REDIRECT and echo capture changed; capture decision recorded |
| 3: Prove and record | PASS | Verified | mutation proofs, clean population, header, CHANGELOG |

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Both T299-QA-7 shapes flagged | fixtures in `tests/orchestration-instrument-reads.test.js`, first flagged list | PASS |
| `&>`, `&>>`, `1>`, `1>>` redirects; twins flagged | passed list and `2>`/plain twins; mutation-proven | PASS |
| Task 299 cycle 3 apostrophe fixtures unchanged | still in both lists; test green | PASS |
| Captured-status decision recorded | this report, header, flagged fixture | PASS |
| Performance: at most 3 s added to `ci:fast` | median of five runs 1.07 s, re-measured at finalise with the load average read from `/proc/loadavg` (the source `uptime` prints) beside each: 1.15 s (load 2.42), 1.11 s (2.42), 1.04 s (2.38), 0.87 s (2.38), 1.07 s (2.38); no outlier removed. An earlier batch at load 3.6-3.7 gave a median of 0.955 s. The test took 1.15 s in a single run before the change | PASS |
| Each fix mutation-proven | see Code Review | PASS |
| Shipped population scans clean | the population test passes (5 of 5 tests); the guard reports its own count | PASS |
| `bundle:check`, `format:check`, `lint:shell`, `ci:fast` | bundle:check 129 skills 0 problems; lint:shell clean; prettier clean; remote `ci:fast` 8469 pass, 0 fail, 3 skipped | PASS |
| CHANGELOG entry citing (task 307) | `changelog-cites.sh`: `cites (task 307)` | PASS |

## Code Review

**Correctness bugs (0):** none. Probes of the new REDIRECT and echo capture: `&&` still ends a capture; `2>&1` is not a redirect; `0>` is not an output redirect; a `$'a;b'` ANSI-C quote is masked as a quote.

**Cleanups (0):** none.

Mutation proofs (each applied with the Edit tool, restored by Edit, tree checked with `git status` after):

mutation-proven: glued-quote rule set to `false` → flagged fixture `cmd; echo foo'bar; baz' $?` and the unseen-shape test (2 red) → covered
mutation-proven: REDIRECT reverted to `/(^|[^0-9&])>/` → `must pass: cmd; echo "rc=$?" &> log` → covered
mutation-proven: echo capture reverted to `([^;&|\n]*)` → `must pass: cmd; echo "rc=$?" &> log` → covered
mutation-proven: REDIRECT changed to `/(^|[^0-9])>/` (`&>` still passes, `1>` broken) → `must pass: cmd; echo "rc=$?" 1> log` → covered

`boundary: false`: `wrappedStatus` is a test-internal predicate in a test file, not shipped code; `probe-boundary-signals.mjs` on the task returned no signals. `probes_executed` does not apply.

## NFR Assessment

Performance PASS, Reliability PASS, Security PASS (evidence: reasoned), Maintainability PASS.

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0.

## Test Artifacts

```
command node --test tests/orchestration-instrument-reads.test.js    # 5 pass, 0 fail
CI=true npm run test:remote                                         # 8469 pass, 0 fail
npm run bundle:check; npm run lint:shell
```

## Final Assessment

**Gate Status**: PASS. **Quality Score**: 95/100. **Deployment Recommendation**: APPROVED.
