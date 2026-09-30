# Sprint Review Summary - Harden the shell-fn: sentinels and the fake-gh coverage

**Story/Task ID:** task.140
**Completed Date:** 2026-09-30
**Completed By:** Claude (develop-task pipeline, via develop-next)
**Pull Request:** [#527](https://github.com/Gamaroff/agent-skills/pull/527)

---

## Summary

The security probe's `shell-fn:` and `shell:` forms now reach every library shape task.136 left open. A library cannot fool the probe into scoring a run that never sourced it: a library that installs its own EXIT trap, or dies under `set -e`, is declined by name. A run that reaches `gh` without a fixture is declined instead of being answered by the host binary. A symlink inside the repository can no longer carry an entry outside it. What the run-time `gh` trip-wire still cannot see is written down as a stated limit, not left implied.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A library with its own EXIT trap, and a `set -e` library whose top-level command fails, both decline `entry-not-probeable` with executed 0 under bash and zsh
- [x] A `shell:` script naming `gh` without `--fake-gh` declines `needs-fake-gh`; the wider `gh` spellings and a one-level `source` are detected
- [x] The symlink case is refused `outside-repo-root` (both paths are realpath'd before containment)
- [x] The task.136 green path still engages 20/20, and every pre-existing row is green
- [x] Wall-clock: the engine is within noise on the pre-existing 100 rows (59/62 s against 65/61 s)
- [x] Mutation proofs recorded; ci:fast, bundle:check and Prettier are green; the fixture is counted by lint:shell
- [x] Both lint lanes changed in one commit, byte-equivalent; rule §5 and the CHANGELOG updated

### Key Features Implemented

- **Source-completed marker.** Each spawn writes a positive marker once the `source` returns 0, and a missing marker is a named decline. This replaced the cycle-1 trap shadow, which a library could bypass.
- **Run-time trip-wire `gh`.** It sits first on `PATH` when no `--fake-gh` is given, carries its marker path in its own text so `env -i` is still recorded, and declines `needs-fake-gh` while keeping the escapes, cases and shells it observed.
- **Real-path containment** for `resolveEntry` and `--fake-gh`, including the deepest existing ancestor of a missing path.
- **Extensionless fixtures in both ShellCheck lanes**, with a parity test that the two blocks are byte-identical.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` (+ 4 bundled copies)
- `shared/resources/tests/security-probe.test.mjs` (+15 rows)
- `scripts/lint-shell.sh`, `.github/workflows/shellcheck.yml`, `evals/shared/tests/lint-lane-fixture-parity.test.mjs`
- `shared/resources/probe-boundary-rule.md` §5 (+ 2 bundled copies), `CHANGELOG.md`

### Architecture/Design Decisions

- Symlink limit: **option A** (realpath before containment), not a stated limit.
- QA cycles 1–3 replaced two mechanisms rather than patching them a third time: the trap shadow became the positive marker, and the static detector became the fast path in front of the run-time trip-wire.

### Dependencies

None added.

---

## Testing & Quality Assurance

### Test Coverage

- `security-probe.test.mjs` 115/115, and 56/56 on the shell rows under `TMPDIR=/tmp`
- `npm run ci:fast`: 4610 pass, 0 fail

### Code Review

- 5 QA cycles: gates CONCERNS 80 → CONCERNS 70 → FAIL 60 → CONCERNS 80 → PASS 100. The loop escalated at cycle 3 and the operator granted 2 more cycles.
- 5c `/review-pr`: CONCERNS, with its document-consistency findings addressed before finalise

---

## Security & Compliance

### Security Review

PASS with 69 probes executed. The one reproduced case, encoded-traversal, is pre-existing: it is a literal in-root filename, because the engine never decodes. The `gh` containment bypasses (a library `PATH` prepend, a `--fake-gh` bypass, a backgrounded call) behave identically at `origin/develop` and are stated in rule §5.

### Compliance Review

Not applicable (internal tooling).

---

## Documentation

### Updated Documentation

- `probe-boundary-rule.md` §5: real-path containment, the sentinel and marker, `needs-fake-gh` on both shell forms, and the trip-wire with its limits
- `CHANGELOG.md` [Unreleased] › Fixed (task 140)

---

## Demo Notes

### How to Verify

```bash
command node --test shared/resources/tests/security-probe.test.mjs
command node shared/resources/security-probe.mjs --sink filename --entry 'shell-fn:shared/resources/gh-labels.sh#gh_labels_filter' --cases-file tests/fixtures/shell-fn/gh-labels.cases.json --json   # needs-fake-gh
```

---

## Impact & Value

### Technical Impact

A probe verdict on a shell library now means what it says: `engages` / `absent` only when the library was actually sourced and every `gh` call was answered by the fixture.

---

## Known Limitations & Future Work

### Current Limitations

- `gh` reached by an absolute path, a library `PATH` prepend, or a call backgrounded past the spawn (rule §5)

### Suggested Follow-Up Stories

- Close the `gh` containment bypasses: a post-source `gh` function shadow, a fixture-answered marker for `--fake-gh`, a process-group kill before teardown, and a stub self-test for noexec `TMPDIR`
- Two LOW wording points in rule §5, and a tighter PATH-prepend pin row (gate 5 `future`)
- The `exit` shadow is inherited by subshells during the `source` (PR review CR-1)
