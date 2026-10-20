# Sprint Review Summary - security-probe: a shell-argv: entry form for a shell script that takes several arguments

**Story/Task ID:** task.181
**Completed Date:** 2026-10-13
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#641](https://github.com/Gamaroff/agent-skills/pull/641)

---

## Summary

The security probe can now run a refusing shell script that takes several arguments or flags. Before, such a script was set aside as "unverified". Now each case's input reaches the script as one argument, under bash and zsh, in a scratch repository a setup script builds per case.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] AC1 — `resolveEntry('shell-argv:<path>')` resolves the new kind; a path outside the repository root is declined
- [x] AC2 — `--argv` is required for `shell-argv:` and still refused for `shell:`, `shell-fn:` and `path#export`
- [x] AC3 — `{input}` reaches the script as one argument under every shell; bash interprets
- [x] AC4 — a failing `--fixture-setup` makes that run `errored`, never a pass
- [x] AC5 — a case `fixture` is honoured exactly as `fence:` honours it, before the setup runs
- [x] AC6 — `shell-argv:` takes the shell forms' `gh` handling (needs-fake-gh, run-time trip-wire, `--fake-gh`); `--args-json` exits 2
- [x] AC7 — proof run against `reenter-qa-after-finalise.sh` executes cases, none stopping at the usage line
- [x] AC8–AC10 — no existing test changed beyond pinned-text assertions; `npm test`, ShellCheck, Prettier and `bundle:check` green
- [x] AC11 — each planned mutation turns a named test red
- [x] AC12–AC13 — every routing document and the CHANGELOG name the form

### Key Features Implemented

- **`shell-argv:` entry form**: the shell sibling of `cli:` — the script runs as `<shell> -c 'bash "$@"' <script> <argv…>`, so the input is never spliced into a shell string.
- **`--fixture-setup`**: a per-case setup script that builds the scratch repository; contained to its case directory, and a failure is `errored`, never scored.
- **Shared per-case isolation**: `fence:` and `shell-argv:` now use one set of helpers for fixture files, environment, `gh` trip-wire and work-directory escape detection.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` — the new form, `--fixture-setup`, shared isolation helpers
- `shared/resources/tests/security-probe.test.mjs` — new `shell-argv:` tests, including the three that closed the first DoD run's gaps
- `shared/resources/tests/fixtures/shell-argv/` — the committed proof setup and cases
- `shared/resources/probe-boundary-rule.md`, `security-review-prompt.md`, `finalise-dod-security-prompt.md`, `probe-boundary-signals.mjs`, `security-input-corpus.mjs` — routing now names the sixth form
- `skills/qa-task`, `skills/qa-story`, `skills/review-security` `SKILL.md` — routing; bundled `references/` copies regenerated
- `CHANGELOG.md` — `[Unreleased]` entry

### Architecture/Design Decisions

Every shell is the caller and bash the interpreter, so a bash script is never read by zsh. The per-case isolation was extracted into helpers that both `fence:` and `shell-argv:` call, after two QA cycles found a guard one form had and the other lacked.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 21 new `shell-argv:` tests plus 1 routing-population test; `ci:fast` 5423 pass, 0 fail
- **Security probe:** 19 cases executed, 0 reproduced

### Code Review

- **Reviewers:** independent code reviewer each QA cycle; Step 5c conformance review (APPROVE)
- **Approval Status:** ✅ Approved (no human reviewers required by the repository)
- **Review Comments Addressed:** 3 QA findings fixed (bug.1–3, closed); 7 LOW follow-ups recorded

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Case input crosses as one argument, never interpolated
- [x] Entry and setup paths contained to the repository / case directory
- [x] No secrets introduced
- [x] No new dependencies

### Compliance Review

✅ **Compliance Requirements Met**

- [x] Not applicable — internal developer tooling, no personal, payment, UI or health data

---

## Documentation

### Updated Documentation

- [x] `probe-boundary-rule.md` — forms list, reasons table (`bad-fixture-setup`), §5.1
- [x] Routing prompts and SKILL.md files
- [x] CHANGELOG `[Unreleased]`

---

## Demo Notes

### How to Verify

1. `command node shared/resources/security-probe.mjs --entry 'shell-argv:shared/resources/reenter-qa-after-finalise.sh' --argv '["{input}","docs/tasks/task.42.example/report.md"]' --fixture-setup shared/resources/tests/fixtures/shell-argv/reenter-qa-setup.sh --cases-file shared/resources/tests/fixtures/shell-argv/reenter-qa-cases.json --repo-root "$PWD" --record /tmp/run.json`
2. Expected: `engages (hostile-rejected-legitimate-accepted) — executed 8, passed 8, reproduced 0`

---

## Impact & Value

### User Impact

Security review in the pipeline now measures shell scripts that take several arguments instead of recording them as unverified.

### Technical Impact

One per-case isolation definition serves both shell-script forms, so a guard added to one reaches the other.

---

## Known Limitations & Future Work

### Current Limitations

- A setup's `gh` call caught at run time is attributed to the entry in the run-level decline
- A run whose setup fails on every case reads `entry-not-probeable` at the top level

### Suggested Follow-Up Stories

- The seven LOW items in `task.181.gate.4` `recommendations.future`

---

## Metrics _(if applicable)_

- **Lines of Code Changed:** +1606 / −137 (excluding bundled copies and task documents)
- **QA cycles:** 4

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
