# Bug Report: Task 83 - Install-time and run-time tracker resolution diverge on quoted or CRLF `tracker:` values

**Task**: [Link](./task.83.platform-aware-skill-exclusion.md)
**Bug ID**: TASK-83-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-04

## Description

`_resolve_install_tracker` (`scripts/setup-consumer.sh:808`) reads the consumer's tracker with:

```bash
_t=$(awk '/^tracker:[[:space:]]*[a-z]/ {print $2; exit}' skills-config.yaml 2>/dev/null || true)
```

`print $2` returns the raw whitespace-delimited token — it does not strip surrounding quotes, and it
does not strip a trailing carriage return. The value is then matched against `case "$_t" in
jira|github)`, so `"jira"`, `'jira'` and `jira\r` all miss and fall through to the positive probes,
landing on the `github` default.

The runtime resolver, `shared/resources/resolve-platform.sh`, parses the same file as YAML (pyyaml
tier, or the documented strict subset) and resolves all three to `jira`.

This defeats the property the change was built to provide, stated in the function's own comment
("MIRRORS shared/resources/resolve-platform.sh … so install time and run time cannot disagree about
what platform this repo is") and repeated in the CHANGELOG. Phase 1 of the task is explicit:
"mirror `shared/resources/resolve-platform.sh`, do not re-derive it". The **order** was mirrored
faithfully; the **value parsing** was re-derived.

## Steps to Reproduce

```bash
mkdir -p /tmp/repro && cd /tmp/repro
printf 'tracker: "jira"\n' > skills-config.yaml

# runtime resolver
SKILLS_CONFIG_FILE=$PWD/skills-config.yaml bash -c \
  'source /path/to/agent-skills/shared/resources/resolve-platform.sh >/dev/null 2>&1; echo "runtime=$TRACKER"'
# → runtime=jira

# installer resolver
SETUP_CONSUMER_NO_MAIN=1 bash -c \
  'source /path/to/agent-skills/scripts/setup-consumer.sh; echo "install=$(_resolve_install_tracker)"'
# → install=github
```

End-to-end, against a fixture tarball containing `sync-jira-story`, `jira-sprint-manager`,
`sync-github-story` and `create-pr`, in a repo whose `skills-config.yaml` says `tracker: "jira"`:

```
→ Filtering skills for tracker: github
✓ Skills fixture installed into .agents/skills/ (2 new, 0 updated, 2 skipped (github))
$ ls .agents/skills/
create-pr  sync-github-story
```

The two Jira skills were pruned from a repo that runs as Jira.

## Affected shapes

| `skills-config.yaml`     | runtime | installer | agree? |
| ------------------------ | ------- | --------- | ------ |
| `tracker: jira`          | jira    | jira      | yes    |
| `tracker: jira    `      | jira    | jira      | yes    |
| `tracker: jira # note`   | jira    | jira      | yes    |
| `tracker: auto`          | github  | github    | yes    |
| `tracker: "jira"`        | jira    | **github** | **no** |
| `tracker: 'jira'`        | jira    | **github** | **no** |
| `tracker: jira` (CRLF)   | jira    | **github** | **no** |

## Expected Behavior

A configuration that `resolve-platform.sh` accepts and resolves to `jira` resolves to `jira` at
install time too, so the installed skill set matches the platform the skills will actually run
against.

## Actual Behavior

Quoted and CRLF forms resolve to `github` at install time. All 11 Jira-only skills are excluded from
a Jira repo. The symmetric case — a quoted `tracker: "github"` in a repo with `JIRA_URL` set —
excludes the 6 GitHub-only skills from a GitHub repo.

## Impact

Silent, and delayed. Nothing fails at install: the wizard prints `Filtering skills for tracker:
github` and a green summary. The failure surfaces days later, inside a pipeline step, as a skill that
is not on disk — far from the install that caused it.

The grandfather rule does not mitigate it. Grandfathering only protects skills that are *already*
installed; a fresh install is exactly the case the filter applies to.

Quoting a scalar is idiomatic YAML and several formatters add quotes automatically; CRLF arrives with
any Windows or WSL checkout. Neither is exotic.

## Recommendation

Normalise the extracted token before the `case`, in `_resolve_install_tracker`:

```bash
_t=${_t%$'\r'}                      # CRLF checkouts
_t=${_t#[\"\']}; _t=${_t%[\"\']}    # a surrounding quote pair
```

Then extend the resolution-order tests in
`shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` with the three shapes above — the
suite currently tests only the unquoted form, which is why this passed. A test that asserts
installer and runtime agree across a table of shapes would close the class rather than the instance.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-04
**Developer**: qa-fix

**Root Cause**: two independent defects in the same read, either of which alone produces the wrong
answer.

1. The awk pattern was `/^tracker:[[:space:]]*[a-z]/`. A quoted value begins with `"` or `'`, which
   is not `[a-z]`, so the line **did not match at all** and `_t` was left empty — the value was never
   read, rather than read and mis-parsed.
2. `print $2` returns the raw whitespace-delimited token. On a CRLF checkout that token is `jira\r`,
   which the `case "$_t" in jira|github)` arm does not match.

Both paths land on the `github` default, which is why the symptom was identical for quoting and for
CRLF despite the causes being different.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-04

**Fix Description**:

- Widened the awk pattern to `/^tracker:[[:space:]]*[^[:space:]]/` so a quoted value matches. The map
  form (`tracker:` with a nested `workflowFile:`) still correctly does not match — there is no
  non-space character after the colon on that line.
- Replaced `print $2` with taking the rest of the line and trimming, so a missing space
  (`tracker:jira`) and a trailing `# comment` are handled in the same place rather than by accident.
- Added a normalisation step in bash mirroring what the runtime YAML reader does: strip a trailing
  carriage return, then strip a **matched** surrounding quote pair. A lone unmatched quote is left
  alone and falls through to the default — a malformed value should not be silently repaired.
- Rewrote the function's header comment to say why the value parsing has to mirror and not just the
  order, so the next person to touch it knows what the `[^[:space:]]` is load-bearing for.

**Files Modified**:

- `scripts/setup-consumer.sh` — `_resolve_install_tracker` pattern, extraction and normalisation
- `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` — new §4b parity block
- `CHANGELOG.md` — the "cannot disagree" claim now states what it actually covers

**Testing**:

- New **parity** tests (10 cases) assert the installer and `resolve-platform.sh` **agree**, by
  sourcing the real resolver rather than asserting a hardcoded expectation on each side — so the two
  cannot drift together and still pass. Each case also asserts what they agree on.
- New test: a lone unmatched quote (`tracker: "jira`) resolves `github`, not `jira`.
- Suite is 34 tests, all green (was 22).

**Mutation proofs**:

| # | Mutation                                                        | Result                                                    |
| - | --------------------------------------------------------------- | --------------------------------------------------------- |
| M4 | Restore the whole pre-fix read (`[a-z]` pattern + `print $2`)   | `double-quoted`, `single-quoted`, `CRLF line ending` red   |
| M5 | Keep the new pattern, remove **only** the bash normalisation    | `double-quoted`, `single-quoted` red; CRLF passes (awk's trailing-space trim already covers it) |

M5 is the one worth keeping: it shows the two halves of the fix cover different cases and neither is
dead code.

**Verification Steps for QA**:

1. `node --test shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` → 34/34.
2. Write `tracker: "jira"` into a temp repo's `skills-config.yaml` and confirm
   `_resolve_install_tracker` and `resolve-platform.sh` both return `jira`.
3. Re-run the end-to-end fixture install from the bug report's repro and confirm the Jira skills
   install and the GitHub-only ones are pruned.

## Status History

| Date       | Status       | Changed By | Notes                                    |
| ---------- | ------------ | ---------- | ---------------------------------------- |
| 2026-09-04 | New          | qa-task    | Found during QA cycle 1                  |
| 2026-09-04 | In Progress  | qa-fix     | Root cause identified — two defects      |
| 2026-09-04 | Ready for QA | qa-fix     | Fix implemented, mutation-proven (M4, M5) |
| 2026-09-04 | Closed       | qa-task    | Verified closed in QA cycle 2: the resolver differential and the end-to-end fixture install both re-run and both agree |
