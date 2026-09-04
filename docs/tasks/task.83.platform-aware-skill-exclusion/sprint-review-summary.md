# Sprint Review Summary: Task 83 — Platform-aware skill exclusion in setup-consumer.sh

**Task:** [`task.83.platform-aware-skill-exclusion.md`](./task.83.platform-aware-skill-exclusion.md)
**PR:** [#315](https://github.com/Gamaroff/agent-skills/pull/315) — `feature/task.83.platform-aware-skill-exclusion` → `develop`
**Status:** ✅ Accepted
**Accepted:** 2026-09-04
**Quality Gate:** PASS (95/100) after 3 QA cycles

---

## Summary

`setup-consumer.sh` now installs only the tracker skills a consumer's platform can actually fire.
Seventeen of the shipped skills are tracker-specific and mutually exclusive — eleven Jira-only, six
GitHub-only — and every consumer previously received all seventeen. A GitHub repo got
`sync-jira-story`, `jira-sprint-manager` and nine others that can never run.

**The cost worth fixing is mis-selection, not disk.** Skill auto-activation matches on the
`description` field, and the two platform siblings differ there only in the platform noun. An agent
asked to "sync this story to the tracker" can pick the one that cannot work — and the failure is not a
clean error at the top, because `resolve-platform.sh` is sourced *inside* the skill, so the run gets
some distance in before anything goes wrong. The context saving is real but secondary: ~1,505 tokens
of ~11,702 for a GitHub consumer, about 13%.

**No existing install loses a skill.** An excluded skill already on disk is *kept*, not pruned, and
reported as such. `--update` over an existing install is byte-for-byte unchanged in what it leaves
behind.

---

## Acceptance Criteria Met

All 20 of the task's §9 success criteria, across four groups:

| Group | Criteria | Result |
|---|---|---|
| Functional | 8 | ✅ all met — each backed by a named test |
| Performance | 2 | ✅ all met |
| Code Quality | 6 | ✅ all met, including `shellcheck` at 0 new warnings |
| Migration | 4 | ✅ all met |

---

## Key Features Implemented

- **A platform filter in `install_skills()`** — two classified lists (11 Jira-only, 6 GitHub-only) and
  a whole-line fixed-string predicate deciding what gets copied out of the release tarball.
- **A grandfather rule** — an excluded skill already on disk is kept, never deleted, and reported as
  `kept … (already installed; not pruned)`. The branch is evaluated before any `rm -rf`.
- **`--all-skills`** — a flag that disables the filter entirely, documented in `--help` and in the
  consumer guide.
- **An install-time tracker resolver** that mirrors `shared/resources/resolve-platform.sh` in order
  *and in value parsing*, so install time and run time cannot disagree about what a repo is.
- **A self-describing config** — the wizard now writes `tracker: github` as well as `tracker: jira`,
  so a generated config always states its own platform.

---

## Technical Details

**Files modified**

| File | Change |
|---|---|
| `scripts/setup-consumer.sh` | Constants, `_resolve_install_tracker`, `_skill_excluded_for_tracker`, the filter in the copy loop, `--all-skills`, dry-run reporting, `write_skills_config` |
| `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` | New suite — 35 tests |
| `shared/resources/tests/setup-consumer-config.test.mjs` | Extended for the new `tracker:` key |
| `docs/concepts/getting-started.md` | New "Step 8 — the platform skill filter" section |
| `CHANGELOG.md` | `[Unreleased] → Changed` |

**Unchanged by design:** `package.json` (its existing glob already picks the new suite up),
`shared/resources/resolve-platform.sh` (this task mirrors it, it does not change it), and every
`skills/*/SKILL.md`. All three confirmed at 0 changed files in the diff.

---

## Testing & QA

**Full suite:** `npm run ci:fast` → 2356 tests, 0 failures, 1 skipped, prettier clean.
**CI:** SUCCESS on head `6d2e644`.

**Three QA cycles, and what each one bought:**

| Cycle | Gate | What it found |
|---|---|---|
| 1 | FAIL (70) | The install-time resolver re-derived the config parse instead of mirroring `resolve-platform.sh`. A quoted (`tracker: "jira"`) or CRLF value resolved the wrong platform — **a Jira repo installed with none of its 11 Jira skills**. Found by *executing* both resolvers over a table of legal spellings rather than reading the code, then reproduced end-to-end against a fixture tarball |
| 2 | CONCERNS (80) | The refute pass turned on cycle 1's own fix and found the follow-on defect: the new test helper scrubbed two environment variables but not `SKILLS_CONFIG_FILE`, so an ambient value could flip the very guard protecting the HIGH fix |
| 3 | PASS (95) | No new findings. Verified both closures by re-running the checks that produced them — including re-running the suite with the polluting variables *genuinely exported*, not simulated |

**Mutation proving:** 8 QA proofs (M1–M8) on top of the developer's 7. The two properties the task
named as its highest risks — the grandfather rule and the classification drift guard — were each
reverted and confirmed to turn a test red, so neither is vacuously green.

**Bug reports:** 3 filed, 3 closed.

---

## Security & Compliance

**Security: PASS.** The install filter is an allow/deny classifier deciding what reaches a consumer's
disk, so DoD probe mode fired: **14 candidate inputs executed against the shipped code, 0 reproduced.**
Probes covered substrings, superstrings, case variants, leading and trailing whitespace, regex and
glob metacharacters, the empty name, and both tracker sides. Every expectation errs toward *keeping* a
skill, which is the safe direction — a false keep costs disk, a false exclude removes a skill a
workflow calls, days later and far from the install.

`shellcheck`: **0 new warnings** against the `origin/develop` baseline.

**Compliance: N/A.** A local install-time filter processes no personal, cardholder or health data and
renders no UI.

---

## Impact

- **GitHub consumers** install 11 fewer skills; **Jira consumers**, 6 fewer.
- Removes a live mis-selection mode where an agent could pick the wrong-platform sibling.
- ~13% of the always-in-context skill metadata budget freed for a GitHub consumer.
- Existing installs are unaffected — nothing is pruned from a working install.

---

## Known Limitations & Future Work

1. **The `.env` residual.** A repo with no `tracker:` key whose `JIRA_URL` lives in `.env` and is never
   exported resolves `jira` at install and `github` at run time. Bounded (the wizard now always writes
   a `tracker:` key), grandfathered, escapable via `--all-skills`, documented in the code and pinned by
   a test that names the follow-up. **The proper close — teaching `resolve-platform.sh` to read
   `.env` — is un-filed and is the one action outstanding after merge.**
2. **Malformed `tracker:` input.** The installer is more permissive than the runtime about input that
   is not valid config (an unrecognised scalar; a tab separator that `yaml.safe_load` itself rejects —
   the latter pre-existing). Recorded in `gate.3` under `future`.
3. **No `shellcheck` CI lane.** It had to be run by hand via a container for this task. Adding a lane
   would run against every shell script in the repo, so it is its own piece of work.
4. **This task has no tracker issue.** No `github_issue` / `jira_key` in frontmatter, so every tracker
   signal in the pipeline was skipped. Run `/sync-github-task` to link it.

---

## Demo Notes

```bash
# A GitHub consumer — the 11 Jira-only skills are skipped
printf 'tracker: github\n' > skills-config.yaml
bash scripts/setup-consumer.sh --update
# → Filtering skills for tracker: github
# → Skills vX installed into .agents/skills/ (109 new, 0 updated, 11 skipped (github))

# The escape hatch
bash scripts/setup-consumer.sh --update --all-skills
# → --all-skills: installing every skill, no platform filter

# Nothing is ever pruned from an existing install
# → kept  sync-jira-story (already installed; not pruned)
```
