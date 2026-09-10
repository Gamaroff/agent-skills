# Bug Report: Task 83 - The installer probes `.env` for `JIRA_URL`; the runtime resolver does not

**Task**: [Link](./task.83.platform-aware-skill-exclusion.md)
**Bug ID**: TASK-83-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-04

## Description

`_resolve_install_tracker` (`scripts/setup-consumer.sh:819-820`) treats a `JIRA_URL` found in a
`.env` file as equivalent to one found in the environment:

```bash
if [[ -n "${JIRA_URL:-}" ]] \
  || { [[ -f .env ]] && grep -qE '^JIRA_URL=.+' .env 2>/dev/null; }; then
  _t="jira"
```

`shared/resources/resolve-platform.sh` reads only the environment. Its identity fallback is a single
line (`resolve-platform.sh:437`):

```bash
[ "$TRACKER" = "auto" ] && TRACKER=$([ -n "${JIRA_URL:-}" ] && echo jira || echo github)
```

It never opens `.env`. So the installer is strictly more generous than the resolver it claims to
mirror, and the two disagree whenever `JIRA_URL` is present in `.env` but not exported into the
shell.

This is the mirror-image of TASK-83-BUG-1 and shares its root cause: the resolver was re-derived
rather than mirrored, so the two implementations read different sources.

## Steps to Reproduce

```bash
mkdir -p /tmp/repro2 && cd /tmp/repro2
printf 'JIRA_URL=https://x.atlassian.net\n' > .env
# no skills-config.yaml, and JIRA_URL is NOT exported

bash -c 'source /path/to/agent-skills/shared/resources/resolve-platform.sh >/dev/null 2>&1; echo "runtime=$TRACKER"'
# → runtime=github

SETUP_CONSUMER_NO_MAIN=1 bash -c \
  'source /path/to/agent-skills/scripts/setup-consumer.sh; echo "install=$(_resolve_install_tracker)"'
# → install=jira
```

## Expected Behavior

Install time and run time resolve the same tracker from the same repository state.

## Actual Behavior

`runtime=github`, `install=jira`. The installer prunes the 6 GitHub-only skills
(`sync-github-*`, `ensure-*-github-issue`) from a repository whose skills will resolve `github` at
runtime and reach for exactly those skills.

## Impact

Narrower than BUG-1 — it needs a repo with no `tracker:` key at all, which a wizard-generated config
no longer produces (this task made `write_skills_config` always write the key). It bites hand-authored
configs and repos set up before that change, and the symptom is the same shape: a skill that is
simply not on disk, discovered later and far from the cause.

Note that the *correct* direction here is genuinely arguable — a repo with `JIRA_URL` in `.env`
plausibly is a Jira shop, and one could equally call the runtime resolver's blindness to `.env` the
defect. What is not arguable is that the two currently disagree while the code comment and the
CHANGELOG both assert they cannot.

## Recommendation

Pick a direction and pin it with a test:

- **Drop the `.env` probe** from `_resolve_install_tracker`, making it a true mirror. Simplest, and
  consistent with the "do not re-derive it" instruction in Phase 1.
- **Or keep it**, and replace the "MIRRORS … cannot disagree" comment with an explicit statement that
  the installer additionally reads `.env`, and why that is deliberate — plus the same probe added to
  `resolve-platform.sh` if the intent is for both to see it.

Either way, add a resolver-differential test asserting the two agree for the `.env`-only case.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-04
**Developer**: qa-fix

The gate offered two resolutions — drop the `.env` probe, or keep it and document the asymmetry.
The QA report listed dropping it first as "simplest". **Dropping it is the wrong call**, and working
through the consequence is what changed the answer:

- The installer runs **once**, frequently in a plain shell where `JIRA_URL` has not been exported.
- The skills run **later**, in a shell that has `JIRA_URL` — they need it to reach Jira at all.

So deleting the probe would make the installer resolve `github` for a Jira consumer whose `JIRA_URL`
lives in `.env`, and prune all eleven Jira skills. That trades a rare disagreement (config-less repo,
`JIRA_URL` in `.env` but never exported) for a common one (`JIRA_URL` in `.env`, exported at run time
by the developer's own shell). The probe is the more conservative behaviour, not the sloppier one.

Closing the gap properly means teaching `resolve-platform.sh` to read `.env`. That changes tracker
resolution for **every** skill in the repo and is not a task-83 change.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-04

**Fix Description** — option 2 from the gate's `suggested_action`, chosen deliberately:

- Kept the `.env` probe.
- Replaced the function's over-claiming comment. It said the resolver mirrors `resolve-platform.sh`
  so the two "cannot disagree"; it now states the one place they do, why that direction was chosen,
  and that closing it belongs in its own task. The comment explicitly tells a future reader **not**
  to "correct" this by deleting the probe.
- Corrected the same over-claim in the `CHANGELOG.md` entry.
- Added a test that pins the asymmetry from both sides and whose failure message names the follow-up.

**Files Modified**:

- `scripts/setup-consumer.sh` — header comment on `_resolve_install_tracker`
- `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` — the deliberate-asymmetry test
- `CHANGELOG.md`

**Testing**: `the .env probe is a DELIBERATE asymmetry, not an oversight` asserts the installer
resolves `jira` and `resolve-platform.sh` resolves `github` for the same repo, with a failure message
telling whoever changes one to change both.

**Mutation proof**:

| # | Mutation                                          | Result                                                      |
| - | ------------------------------------------------- | ----------------------------------------------------------- |
| M6 | Remove the `.env` probe from the resolver         | the asymmetry test **and** `a JIRA_URL in .env resolves jira` red |

**Residual, stated plainly**: the two resolvers still disagree for a repo with no `tracker:` key
whose `JIRA_URL` is in `.env` and never exported. It is now documented, tested and attributed rather
than accidental, and the wizard has written a `tracker:` key on both platforms since this task, so a
wizard-generated config cannot reach the case at all. QA should decide whether that residual is
acceptable or whether the `resolve-platform.sh` follow-up should be filed now.

## Status History

| Date       | Status       | Changed By | Notes                                               |
| ---------- | ------------ | ---------- | --------------------------------------------------- |
| 2026-09-04 | New          | qa-task    | Found during QA cycle 1                             |
| 2026-09-04 | In Progress  | qa-fix     | Weighed both gate options; chose keep + document    |
| 2026-09-04 | Ready for QA | qa-fix     | Comment + CHANGELOG corrected, asymmetry pinned (M6) |
| 2026-09-04 | Closed       | qa-task    | Verified closed in QA cycle 2: asymmetry documented and pinned by test; residual recorded in gate.3 recommendations.future |
