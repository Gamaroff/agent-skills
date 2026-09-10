# Sprint Review Summary — Task 91

**Task:** Reconcile install-time and run-time tracker resolution
**Status:** ✅ Accepted · **PR:** [#320](https://github.com/Gamaroff/agent-skills/pull/320) · **Issue:** [#319](https://github.com/Gamaroff/agent-skills/issues/319)
**Accepted:** 2026-09-05 · **Quality score:** 95/100

---

## Summary

`setup-consumer.sh` and `resolve-platform.sh` answered *"which platform is this repo?"* with **two
different implementations**, and they disagreed on three config shapes. This deletes the second one.

The headline failure it closes: a repo with no `tracker:` key and a `JIRA_URL` in `.env` had the six
GitHub-only skills pruned at install, then resolved `github` at run time and reached for exactly those
skills — silent at install, surfacing days later inside a pipeline step as a skill that is not on disk.

## What changed

- **`resolve-platform.sh`** resolves `TRACKER` from a repo-root `.env` when the config declares nothing,
  ranked below the process environment. Parsed with `awk`, never sourced.
- **`setup-consumer.sh`** — `_resolve_install_tracker` now **delegates** to a located copy of the
  resolver in a subshell; its local `awk` parser is deleted. Parity is structural rather than
  maintained by hand.
- An unrecognised `tracker:` scalar now **halts the install**, matching what the runtime has always done
  and what `configuration.md` has always documented.
- `--dry-run` reports the tracker as unresolved rather than guessing, and names which resolver copy
  answered when it is not the release.

## Before → after

| `skills-config.yaml` | Before (install → run) | After |
| --- | --- | --- |
| `tracker: jira` / quoted / CRLF / `auto` | agreed | agreed |
| no key, `JIRA_URL` in `.env` | `jira` → `github` ❌ | **`jira` → `jira`** ✅ |
| `tracker: bitbucket` | `github` → refused ❌ | **refused → refused** ✅ |
| `tracker:<TAB>jira` | `jira` → `github` ❌ | **`github` → `github`** ✅ |

## ⚠️ Behaviour change and the opt-out

A repo with **no `tracker:` key** and a `JIRA_URL=` in `.env` now resolves **`jira`** at run time where
it resolved `github`. If that value is stale, set **`tracker: github`** — an explicit key wins above
both the environment and `.env`. Since task 83 the wizard always writes a `tracker:` key, so no
wizard-generated config can reach this rung; the exposed window is hand-authored and pre-task-83 configs.

## Testing & QA

- **`npm run ci` green — 2450 tests, 0 failures.** Tests in the parity file grew **40 → 61**, plus 8 new
  cases in the runtime resolver's own suite (14/14).
- **17 config shapes** verified to resolve identically at install and run time.
- **shellcheck** 0 new on both changed shell files, against the documented 1-warning baseline.
- **4 QA cycles**, 10 findings, all fixed and mutation-proven. Gate history FAIL 70 → FAIL 70 →
  CONCERNS 80 → **PASS 95**.
- **Step 5c `/review-pr`**: REQUEST CHANGES → 11 conformance findings remediated → APPROVE.

## What this run cost, and what it bought

Three fix cycles is more than a change this size should need. The cause is worth carrying forward: **the
first two cycles shipped fixes that no test executed.** Cycle 1's fix for the empty-`TRACKER` case was
unreachable — `printf "%s\n%s"` loses its newline to command substitution — and the suite stayed green
at 2441 tests while the installer resolved the literal string `"0"` as a tracker.

The gap was in the **fixture**, not the code: `makeFixtureTarball` shipped no resolver, so every install
test resolved through this repo's own checkout and the `release` origin — the copy a real consumer
installs with — was exercised by nothing. Closed and pinned.

Step 5c then found two more the QA loop had not: the PR did not contain the PASS evidence it was being
judged on, and `platform-detection.md` — the designated source of truth — was two commits behind the
resolver it governs, with the stale claim baked into all 38 bundled copies.

**A green suite was never evidence on this task.** Every finding came from running the code against a
hostile input.

## Known limitations / follow-ups

1. `tracker-access.test.sh` asserts `ACCESS_TRACKER` but not that `TRACKER` stays `github` for its
   fixtures.
2. `_config_skills_profile` / `_config_skills_list` are still hand-rolled awk YAML parsers — the same
   mirror-the-reader pattern this task removed for `tracker:`, and the obvious next task.
3. `SKILLS_JIRA_ONLY` / `SKILLS_GITHUB_ONLY` remain mirrored in `resolve-skill-set-cli.mjs`.
