# Sprint Review Summary — Task 144

**Task:** security-probe — a `cli:` entry form, so a multi-flag Node CLI's boundary can be executed instead of declared unverifiable
**PR:** [#471](https://github.com/Gamaroff/agent-skills/pull/471) → `develop` · **Issue:** #470
**Accepted:** 2026-09-23 · **Gate:** PASS 100/100 (gate 6) · **QA cycles:** 6

---

## Summary

Before this task, the probe engine could reach three kinds of boundary: a JS export called with one
argument, a shell script with one positional, and a sourced shell function. A Node CLI whose decision
sits behind its flags matched none of these. As a result, task.141's finalise recorded
`probes_executed: 0` against `uat-status.mjs --env` and was accepted anyway. The new form is
`--entry cli:<path> --argv '<JSON array>'`. It runs such a CLI inside the engine's sandbox, passes each
case's input as exactly one argv element, and reads the exit status as the verdict. That boundary is
now executed, not declared unverifiable.

## Success Criteria Met

12 / 12. Each criterion traces to code and to a test that runs on every PR. The one exception is the
CHANGELOG criterion, which is checked by reading the file.

## Key Features

- **The argv template.** A template has exactly one `"{input}"` element and may add `"{fixture}"`
  elements. A slot must be a whole element, so `--env={input}` is refused rather than interpolated.
  Every shape error exits 2 with `bad-argv` and writes no record. `runProbeSpec` returns the same
  decline to library callers.
- **The sandbox is the shell arm's.** The fixture is the working directory, `HOME` and `TMPDIR` sit
  inside the sandbox root, stdin is empty, and the script's directory is watched. These helpers were
  factored out of `runShellCase` and are called by both arms, not copied.
- **A crash is not a refusal.** A Node fatal footer, a kill or a timeout scores `errored`, so a script
  that fails to load becomes an `entry-not-probeable` decline. It no longer scores as a control that
  rejects everything.
- **Record identity.** Record entries gain an `argv` key. A `cli:` control is identified by its
  `--name`. An unnamed control falls back to its argv skeleton: flags and bare positionals are kept,
  flag values are dropped. When an unnamed write replaces an entry whose argv differed, the engine
  prints a `warning: replaced control`. The keys for every other form are byte-identical to before.

## Testing & Quality Assurance

- There are 19 `cli entry` tests and seven fixture CLIs: refuser, inert, accept-all, crasher, echo,
  a HOME write and a hang. The first real consumer run, against `uat-status.mjs --env`, is part of
  the suite. The fast gate passed 3967 tests with 0 failures, and CI was green across 5 checks.
- **Six QA cycles.** HIGH findings stayed at 0 in every cycle. Cycles 2–5 each found one MEDIUM in the
  same place, the `cli:` record key:
  - keying on the whole template split re-runs into separate entries;
  - keying on the flag before `{input}` merged distinct controls;
  - keying on the skeleton merged `--mode strict` and `--mode lax`.

  The loop settled on a stated `--name` as the identity. Gate 6 passed at 100.
- **Step 5c `/review-pr`** returned CONCERNS. PC-1, a Files Summary gap, was applied. CR-1 is carried
  as a follow-up (see below).

## Security & Compliance

- **Security:** The deliverable's own boundary, the `--argv` validator, was probed by running the
  engine against itself through the `cli:` form. 35 cases executed and 0 reproduced; the verdict was
  `engages` (`task.144.dod.security.run.json`). The checks found no secrets, no eval or shell use, and
  no dependency changes.
- **Compliance:** Not applicable. The task touches no personal, payment or health data and no UI.

## Documentation

- `shared/resources/probe-boundary-rule.md`: §5 documents the form, its exit-status contract and its
  record identity. §5.1 no longer lists a multi-argument CLI as declined.
- `finalise-dod-security-prompt.md` and `security-review-prompt.md`: both show the invocation and the
  routing rule.
- The `qa-task` and `qa-story` Step 3b paragraphs name the new form.
- Limit 3 in `skills/review-security/SKILL.md` covers it.
- `CHANGELOG.md` has an entry that cites task 144.
- The bundled copies were regenerated.

## Demo Notes

```bash
command node shared/resources/security-probe.mjs --sink path \
  --entry cli:skills/qa-next/scripts/uat-status.mjs \
  --argv '["--root","<registry fixture>","--run-path","D.1","--env","{input}"]' \
  --cases-file <env-label cases.json> --name 'uat-status --env' \
  --record /tmp/r.json --json
# → executed > 0; a malformed --argv such as '["--env={input}"]' exits 2 with bad-argv and writes no record
```

## Known Limitations & Future Work

- **5c CR-1 (medium, reproduced).** Some `cli:` probes are declined before the engine parses their
  `--argv`, for example with `outside-repo-root`. Such a probe is recorded with `argv: null`, so
  `controlKey` ignores its `--name`. A corrected re-run therefore adds a second entry, and the stale
  `unverifiable` entry stays in the record. The error goes toward "could not look", never toward a
  false pass. Suggested fix: decide the named-key branch from the `cli:` entry prefix rather than from
  `Array.isArray(argv)`.
- Gate 6 raised three low advisories:
  - the identity population test scans `.md` files only;
  - the name is not stored in its trimmed form;
  - §5 does not say that names are trimmed.
