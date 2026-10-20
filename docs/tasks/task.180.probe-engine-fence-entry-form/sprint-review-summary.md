# Sprint Review Summary - security-probe: a `fence:` entry form for a fenced bash block in a step doc

**Task:** [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Status:** Accepted (2026-10-12)
**Pull Request:** [#637](https://github.com/Gamaroff/agent-skills/pull/637)
**Tracker:** [#560](https://github.com/Gamaroff/agent-skills/issues/560)

---

## Summary

`security-probe.mjs` gains a fifth entry form, `fence:<doc.md>#<heading>`, that probes a guard shipped as a fenced bash block in a step doc. The engine reads the doc on every run, takes the first bash block under the heading, substitutes each case's input for a `--slot` placeholder, and runs it under bash and zsh in a sandbox. Task.167's fast-gate precondition, previously probed through a hand-written wrapper, is now probed by the engine.

## What Was Delivered

### Acceptance Criteria Met

- ✅ `fence:` with `--slot` probes a block, scored by the order `scoreFenceRun` states
- ✅ A missing heading or bash block is a named `entry-not-probeable` decline
- ✅ The optional `fixture` field delivers `env` and `files`; an escaping path is declined
- ✅ Task.167's 13 cases engage with 0 reproduced; the flagless copy over-blocks the 4 silent-environment cases
- ✅ The four existing entry forms' tests pass unchanged

### Key Features Implemented

- The `fence:` entry form, `--slot`, and the per-case `fixture: {env, files}` field
- One ordered scorer (`scoreFenceRun`): a stated side effect first, then never-ran, then a `<shell> -n` parse check, then the hostile case's stated refusal
- A hostile case must state its refusal as non-empty stdout or stderr, or it is declined
- A structural `gh` guard (`ghFreePath`) plus a fast-path text check over the block, inputs and fixtures
- A work-dir watch that sees writes, deletions and new directories

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` and its tests; `shared/resources/tests/fixtures/fence-probe/t167-cases.json`
- Routing docs: `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, qa-task / qa-story / review-security `SKILL.md`, `probe-boundary-signals.mjs`; bundled copies regenerated
- `CHANGELOG.md`

### Architecture/Design Decisions

- The slot is source substitution, not data — the probe models the block as its reader runs it
- A refusal is stated by the case author (`expected`), never inferred from exit status or stderr (three QA cycles showed inference cannot tell a refusal from a shell that stopped)

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

- 34 `fence entry` / `ghFreePath` / `emit-block` tests; `ci:fast` 5411 tests, 0 fail
- Every fix across 8 QA cycles mutation-proven

### Code Review

- 8 QA cycles with the code reviewer each cycle; gate 8 CONCERNS (90), HIGH 0, Security PASS — accepted by the user at the loop limit
- Step 5c PR review: CONCERNS (conformance, 0 high)

## Security & Compliance

### Security Review

PASS — 26 probe candidates executed against the shipped precondition and `resolveEntry`'s `fence:` branch, 0 reproduced.

### Compliance Review

Not applicable — internal developer tooling.

## Documentation

### Updated Documentation

- `probe-boundary-rule.md` §5 (five entry forms, stated limits), the security prompts and the QA skills' routing sentences

## Demo Notes

### How to Verify

```bash
node shared/resources/security-probe.mjs --sink filename \
  --entry 'fence:shared/resources/develop-pipeline-step-3-develop-loop.md#Precondition — the gate must resolve before the first iteration' \
  --slot '<fastGateCommand>' --cases-file shared/resources/tests/fixtures/fence-probe/t167-cases.json --json
```

Expect `verdict: engages`, 13 executed, 0 reproduced.

## Impact & Value

### Technical Impact

A guard shipped as Markdown is probed by the engine with a record that resolves in every checkout, instead of through a wrapper under `.claude/state/`.

## Known Limitations & Future Work

### Current Limitations

- Stated limits: an absolute path to `gh`, a `PATH` the block prepends itself, a default-path lookup not written out in any checked text, and a write to an absolute path outside the sandbox
- Gate 8's TASK-180-020/-021 are fixed in `30769d36` but were not read by a QA gate (accepted by the user)

### Suggested Follow-Up Stories

- The shell entry forms share the `PATH`-lookup gap that `ghFreePath` closes for `fence:`
- `GIT_CEILING_DIRECTORIES` in `caseEnv`
- Gate-8 LOW cleanups: import `extractBlocks`' fence regex; `lstat` the `ghFreePath` farm
