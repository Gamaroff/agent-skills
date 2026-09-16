---
id: task.110
title: "[Task 110] A session-handoff skill that writes the handoff and re-measures it on read"
type: task
description: "`.agents/handoff.md` is the 'read this first' file, and it decays within a day — the 2026-09-10 version named T107 as next and 'frontier not empty'; T107 merged the next day and the frontier is empty. Every figure in it already carries the command that produced it, so the read end can re-run them. Build the skill the 2026-09-08 observe-work review proposed: write mode with a fixed section order and a per-figure command, read mode that re-measures and reports confirmed / stale / unverifiable per line. Traps live in docs/contributing/traps.md, not in the handoff."
tags: [skill, handoff, observe-work, docs]
category: other
status: accepted
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-16
completed_date: 2026-09-16
assignee:
estimated_effort_hours: 8
github_issue: 407
pr_number: 408
---

# Technical Task: A session-handoff skill that writes the handoff and re-measures it on read

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.110.review.1.session-handoff-skill.md` implemented 2026-09-15
**GitHub Issue**: [#407](https://github.com/Gamaroff/agent-skills/issues/407)
**Pull Request**: [#408](https://github.com/Gamaroff/agent-skills/pull/408)

---

## 1. Overview

Build `skills/session-handoff/`: a skill with two modes. **Write** produces `.agents/handoff.md` in a
fixed section order where every state figure carries, inline, the command that produced it. **Read**
re-runs those commands and reports each line as `confirmed`, `stale` (with the new value) or
`unverifiable` (command failed, credential missing) — so a reader never has to trust a timestamp.

**Scope**: the skill, a small verifier script, tests, AGENTS.md wiring. The staged 2026-09-08
proposal is the starting point; it is a scaffold with a TODO list, not a deliverable.

## 2. Motivation

### Current Problems

1. **The handoff decays in a day and says so itself.** 2026-09-10: "T107 is next; the frontier is
   not empty." 2026-09-11: T107 merged (#387). 2026-09-12: `select-next` → `roadmap-complete`. The
   author had measured every figure; the failure is a snapshot with no expiry and no re-measure step.
2. **It is written by hand with no procedure**, three times now, each reconstructed from scratch.
   The AGENTS.md pointer is the only thing that makes it discoverable.
3. **The durable half was interleaved with the decaying half** — the traps (true for months) sat
   beside the state (true for hours), so the half that decayed discredited the half that did not.
   The 2026-09-12 sweep moved the traps to `docs/contributing/traps.md`; the skill must keep them
   there.
4. **Carried follow-ups get carried, not re-verified.** §3 of the 2026-09-10 handoff said "engine
   touched since" about `change-log.js`; it had not been touched since 2026-08-17. A read mode that
   re-runs `git log -1 --format=%ci -- <file>` catches that mechanically.

### Benefits

1. The read end makes the write end worth doing: a handoff whose figures are re-measured on arrival
   cannot mislead about the frontier, the tip, or the counters.
2. A fixed section order with half-life labels stops the interleaving by construction.
3. The proposal already exists (obs #6); this turns a staged scaffold into a pipeline-shaped
   deliverable with tests.

## 3. Technical Background

### Current Architecture

- `.agents/handoff.md` — hand-written; header table of `Check | Command | Result`; §1 what to pick
  up; §2 standing decisions; §3 carried follow-ups (marked "carried, not re-measured"); §4 tolerated
  drift; §5 traps (now a pointer); §6 artifact paths.
- AGENTS.md line 5 — the pointer, with the instruction "re-run those commands rather than trusting
  the date at the top" — an instruction to the reader that nothing executes.
- Staged proposal — `skill-updates/PROPOSED-session-handoff/session-handoff/SKILL.md`: the contract
  (write sections with half-lives; read verdict table) is written; scripts and tests are TODO.

### Target Architecture

- `skills/session-handoff/SKILL.md` — modes, section order, the rule *never carry a figure forward*.
- `skills/session-handoff/scripts/handoff-verify.mjs` — parses the handoff's command cells (a
  fenced or table-cell `command …` per figure), runs each with a timeout, diffs the captured value
  against the recorded one, prints a per-line verdict table and a JSON form (`--json`) with the
  standard `reason` contract. Never writes the handoff.
- `skills/session-handoff/assets/handoff.template.md` — the section skeleton with half-life labels.
- Tests under `skills/session-handoff/tests/*.test.js` — the same shape as the other 18 skill
  suites (`node --test` globs in `package.json` `test`; coding-standards names `*.test.js`) — **and
  the glob `'skills/session-handoff/tests/*.test.js'` added to `package.json`** (traps: "npm test's
  suite list is hand-maintained"). Tests load the `.mjs` verifier via `require(esm)` (Node ≥ 22.12)
  or spawn it as a CLI.

### Important Clarifications

- Read mode is the deliverable; write mode without it is what exists today.
- `unverifiable` is a verdict, not an error: a Jira-only check in a GitHub-tracked repo is
  unverifiable here and must say so rather than fail the run.

## 4. Scope

### In Scope

✅ The skill (SKILL.md, verifier script, template, tests, `invokes:` if it calls anything)
✅ AGENTS.md pointer updated to name the skill's read mode as the way to consume the handoff
✅ Catalog + skill-deps regeneration

### Out of Scope

❌ Automating the write at session end (no hook) — the write is a human-triggered act
❌ Moving the handoff out of `.agents/` — location stays

## 5. Breaking Changes

None. New skill; the handoff file format gains structure but stays Markdown a human can edit.

## 6. Implementation Plan

1. **Contract.** Lift the section table and verdict table from the staged proposal into SKILL.md.
   Per-figure command syntax (decided at review): in the header table, the **first backticked span**
   in the `Command` cell is the command — a cell with no backticked span (e.g. `inspect …`) is
   reported `unverifiable: no command`, never executed; on a prose figure, a trailing
   `<!-- cmd: … -->` comment on the same line is its command. The whitelist applies to the first
   token after an optional `command ` prefix.
2. **Verifier.** `handoff-verify.mjs`: parse → run (with `command` prefix, per traps) → compare →
   report. `--json` with `reason` ∈ `ok | stale | unverifiable | usage`. Each command runs under a
   timeout (default 60 s; `--timeout`); a command that exceeds it is `unverifiable: timeout` — the
   read is a fast preflight, so `command npm test` landing there is expected, not a defect. Strip
   Markdown emphasis (`**…**`, `` `…` ``) from the recorded `Result` cell before the substring
   comparison. The command runner is **injectable** (a function argument on the exported API) so
   tests never execute real commands.
3. **Write mode.** Template + procedure; the traps section is a one-paragraph pointer to
   `docs/contributing/traps.md`.
4. **Wire.** AGENTS.md pointer; `npm run generate-catalog`; `generate-skill-deps`; test glob.
5. **Prove.** Run read mode against the 2026-09-10 handoff (from git history) and confirm it reports
   §1 stale and §3a's "touched since" stale.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `skills/session-handoff/SKILL.md`, `scripts/handoff-verify.mjs`, `assets/handoff.template.md`, `tests/handoff-verify.test.js`, `tests/fixtures/handoff-2026-09-10.txt` | new (fixture is `.txt` because the bundler scans `tests/*.md` for `shared/resources/` mentions) |
| `package.json` | test glob `'skills/session-handoff/tests/*.test.js'` |
| `AGENTS.md` | pointer names read mode and its command |
| `docs/reference/skill-catalog.md`, `shared/resources/skill-dependencies.json`, `skills/create-skill/references/skill-dependencies.json` | regenerated (128 skills; `generate_catalog.py` gained `session-handoff` under Skill Tooling) |
| `docs/reference/commands.md`, `docs/reference/activation-phrases.md` | one row each for `/session-handoff` (write / read) |
| `.agents/handoff.md` | rewritten 2026-09-15 in the new shape by the skill's own write mode; read mode run on it before commit |
| `CHANGELOG.md` | `[Unreleased]` → Added entry |

## 8. Testing Strategy

- **Unit**: parser on fixture handoffs (table cell, prose comment, missing command); comparator on
  equal / changed / command-failed.
- **Integration**: read mode over a fixture repo with a known-stale figure → `stale` with the new
  value; over a Jira-only check with no credentials → `unverifiable`.
- **Regression**: the historical 2026-09-10 handoff (from `git show 6ce3280e:.agents/handoff.md`)
  copied to `tests/fixtures/handoff-2026-09-10.md` **with two `<!-- cmd: … -->` annotations added** —
  on the "frontier is not empty" line (`command node skills/develop-next/scripts/select-next.mjs`)
  and on §3's "touched since" claim (`git log -1 --format=%ci -- shared/resources/change-log.js`),
  since both are prose with no command cell in the original. The test runs the verifier with an
  injected runner returning present-day values → both lines report `stale`, named. Hermetic: no
  real command runs.
- **Mutation**: break the comparator (always `confirmed`) → the fixture test goes red.

## 9. Success Criteria

1. `/session-handoff --read` (or the documented verb) prints one verdict per figure, and the
   annotated 2026-09-10 fixture (§8) yields `stale` for the frontier line and for the `change-log.js`
   "touched since" claim
2. `--json` follows the repo's `reason` / exit-code contract
3. Write mode emits the fixed section order; the traps section is a pointer, never content
4. Tests run under `npm test` (glob present) and in CI
5. `quick_validate.py` passes; catalog and deps regenerate to no diff
6. AGENTS.md names the read mode

## 10. Risk Assessment

**Low–medium.** Running arbitrary commands from a Markdown file is the risk: restrict to a
whitelist of read-only prefixes (`git`, `command node …select-next`, `npm run … -- --check`, `gh … list`)
and refuse anything else as `unverifiable` with a reason. Record the whitelist in SKILL.md.

## 11. Rollback Plan

Delete the skill directory, revert the AGENTS.md line, regenerate catalog/deps. The handoff file
remains readable by hand.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 repo sweep | create-task |
| 2026-09-15 | 1.1     | Review passed (8/10) — tests → `*.test.js`, command-cell parse rule, annotated regression fixture, GitHub issue #407 linked | review-task |
| 2026-09-15 |         | Status → ready-for-development | review-task |
| 2026-09-15 |         | Implemented — 13 files, 17 tests (3 mutants killed by name) | develop |
| 2026-09-15 |         | QA gate FAIL (30/100) — 3 HIGH, 3 MEDIUM, 5 LOW; whitelist admits mutating shapes | qa-task |
| 2026-09-15 |         | QA findings fixed — whitelist per-axis, no-shell spawn + group kill, guarded expect regex; 23 tests, 1 iteration | qa-fix |
| 2026-09-15 |         | QA gate FAIL (0/100) cycle 2 — 7 HIGH: deny-list mechanism fails the refute pass; bugs 1–3 closed | qa-task |
| 2026-09-15 |         | QA findings fixed — deny-lists replaced by per-binary allow-lists; async runner with signal group kill; 27 tests, 2 iterations | qa-fix |
| 2026-09-15 |         | QA gate CONCERNS (80/100) cycle 3 — 0 HIGH, 1 MEDIUM (joined flag values unchecked); bugs 4–5 closed | qa-task |
| 2026-09-15 |         | QA findings fixed — joined flag values held to the positional rule, output cap, ls-remote/eval: tightened; 28 tests, 3 iterations | qa-fix |
| 2026-09-15 |         | QA gate CONCERNS (70/100) cycle 4 — 0 HIGH, 2 MEDIUM in the cycle-3 fixes (ls-remote leading slash; cap keeps the head), 1 LOW | qa-task |
| 2026-09-15 |         | QA findings fixed — ls-remote anchored + PATHS, truncation → unverifiable, pattern flags exempt from the slash rule, one joined-flag helper, setEncoding; 28 tests, 4 iterations | qa-fix |
| 2026-09-15 |         | QA gate CONCERNS (80/100) cycle 5 — 0 HIGH, 1 MEDIUM (regression in the cycle-4 pattern-flag exemption), 2 LOW | qa-task |
| 2026-09-15 |         | QA findings fixed — pattern-flag exemption made per-spec (module-loading flags keep the path rule); comment accuracy; 28 tests, 5 iterations | qa-fix |
| 2026-09-15 |         | QA gate FAIL (40/100) cycle 6 — 1 HIGH (npm `--` passthrough: write + outside-repo module load, executed), 1 MEDIUM (`gh api` absolute URL egress, executed), 3 LOW; bugs 6–7 filed | qa-task |
| 2026-09-15 |         | QA findings fixed — npm tail held to the node --test-mode rule (no tail on other scripts), `gh api` refuses URLs, eval:*:cli/sdk excluded, drive-letter paths absolute, per-spec patternFlags tested, `--date` one home, catch-block `truncated`; 28 tests (+31 shapes), 6 iterations | qa-fix |
| 2026-09-15 |         | QA gate FAIL (40/100) cycle 7 — 1 HIGH (node/python3 arm runs any in-repo script with any arguments: prettier `--write` via `node_modules/` path executed; repo writers reachable), 3 MEDIUM (`gh -R <host>` and `npm view <url>` egress; `npx` registry install — all executed), 2 LOW; bugs 6–7 closed, bugs 8–10 filed | qa-task |
| 2026-09-15 |         | QA findings fixed — interpreter script positional is an exact allow-list with per-entry specs (bug.8); gh value flags consume their value, `--repo`/`-R` held to `OWNER/REPO`, list/view positionals anchored, `-w` only under `run list`; npm view/ls bare package names (bug.9); `--no-install` injected into every npx argv, `--no` refused as not-an-alias (bug.10); spec's own policy after `--`; 29 tests (+70 shapes), 7 iterations | qa-fix |
| 2026-09-15 |         | QA gate FAIL (40/100) cycle 8 — 1 HIGH (`node --test <any in-repo file>` runs it bare: a tracked file re-created and two `claude -p` sessions spawned through read mode, executed), 2 MEDIUM (`observation-log.js next-id` writes; `git remote show <url>` egress incl. ssh — executed), 4 LOW; bugs 8–10 closed, bugs 11–13 filed; third strike on `handoff-verify.mjs` | qa-task |
| 2026-09-15 |         | QA findings fixed — third strike on `handoff-verify.mjs`: mechanism replaced — runnable code named by identity only, no positional in `--test` mode through either arm (bug.11); `next-id` and `remote show` removed, `get-url` name anchored (bug.12, bug.13); empty `expect:` → `no figure`, short row → `row N`; 30 tests (+31 shapes), 8 iterations | qa-fix |
| 2026-09-15 |         | QA gate FAIL (40/100) cycle 9 — 1 HIGH (npx `--config=`/formatter values load in-repo modules: a PRD rewritten through read mode, executed — the PRB-6 boundary re-decided), 2 MEDIUM (`npx mocha init` scaffolds four files, executed; `tokenize()` drops empty quoted tokens — false `confirmed`, executed), 3 LOW; bugs 11–13 closed, bugs 14–16 filed; fourth strike on `handoff-verify.mjs` (halt waived by the operator) | qa-task |
| 2026-09-15 |         | QA findings fixed — fourth strike on `handoff-verify.mjs` (halt waived by the operator): mechanism replaced — an `npx` flag value the tool loads is judged by kind (data file / bare name), never by path, and spaced `-c`/`-f`/`-R`/`-p` values are consumed by their flag (bug.14); mocha/vitest subcommand vocabulary refused as positionals, vitest requires `--run` (bug.15); empty quoted token preserved, unterminated quote refused (bug.16); `jq env` refused, unreadable path → JSON, `eval:*:cli:*` any segment, dead `find !` filter and `date -r` removed; 31 tests (+58 shapes), 9 iterations | qa-fix |
| 2026-09-15 |         | QA gate CONCERNS (70/100) cycle 10 — 0 HIGH, 2 MEDIUM (a `name`-kind reporter resolves a cwd module on mocha and writes on vitest/jest; `jq -n null//env` bypasses the `env` refusal — both executed), 2 LOW; bugs 14–16 closed, bugs 17–18 filed | qa-task |
| 2026-09-15 |         | QA findings fixed — the `name` kind deleted, reporters/formatters are per-tool closed sets of stdout-only built-ins (bug.17); jq `env` refused in every positional, `/` exemption gone (bug.18); data dotfiles are `*rc`/`*ignore` names and `..` refused anywhere (QA-3/QA-4); 31 tests (+35 shapes), 10 iterations | qa-fix |
| 2026-09-15 |         | QA gate CONCERNS (80/100) cycle 11 — 0 HIGH, 0 MEDIUM, 4 LOW (closed-set version drift, a stale comment); bugs 17–18 closed — all 18 bugs closed | qa-task |
| 2026-09-15 |         | QA findings fixed — eslint config is data by extension only, `ESLINT_FORMATS` trimmed to ESLint 9's core set, vitest `basic` dropped, stale header reworded, two dead `PATTERN_FLAGS` entries removed; 31 tests (+10 shapes), 11 iterations | qa-fix |
| 2026-09-15 |         | QA gate PASS (95/100) cycle 12 — 0 HIGH, 0 MEDIUM, 2 LOW nits (`x..json` on the eslint config pattern; a stale `.eslintrc` example); cycle-11 refinements verified | qa-task |
| 2026-09-15 |         | QA findings fixed — `ESLINT_CONFIG` refuses `..` anywhere; `.eslintrc` example replaced by `.markdownlintrc` in the comment and SKILL.md; 31 tests (+2 shapes), 12 iterations | qa-fix |
| 2026-09-15 |         | QA gate PASS (100/100) cycle 13 — no open finding; bugs 1–18 closed; hands to the PR conformance review | qa-task |
| 2026-09-15 |         | PR conformance review fixes — `npx tsc --noEmit false` refused (5c CR-1, executed write), mocha takes no positional (CR-2), gh `--jq` held to the jq `env` rule (CR-3), win32 kill fallback and kill-on-cap (CR-4/6), `exit N` figures documented (CR-5); `pr_number: 408` and the Pull Request line added (PC-2), §7 lists the two reference docs (PC-4), CHANGELOG figures refreshed (PC-3); 31 tests (+18 shapes), 13 iterations | qa-fix |
| 2026-09-15 |         | QA gate FAIL (50/100) cycle 14 — 1 HIGH (an npx positional read by the tool as a flag value or response file: `tsc --noEmit null`, `tsc @tsargs.txt`, `jest --ci false` — all wrote, executed), 1 MEDIUM (the runner lets an inherited `CI=false` through — executed), 2 LOW; bugs 19–20 filed | qa-task |
| 2026-09-15 |         | QA findings fixed — one universal npx positional rule (no `true`/`false`/`null`, no `@response`) folded from the tsc-only pattern (bug.19); `CI` forced to `1` in the child (bug.20); cap-test bound widened (QA-3); tsbuildinfo documented, dead gh flags dropped (QA-4); 32 tests (+12 shapes), 14 iterations | qa-fix |
| 2026-09-15 |         | QA gate FAIL (50/100) cycle 15 — 1 HIGH (jest `--reporters` is a greedy yargs array: a following positional is loaded as a reporter module — executed), 1 MEDIUM (plain-object spec tables: `__proto__ x` crashes the run); bugs 19–20 closed, bugs 21–22 filed | qa-task |
| 2026-09-15 |         | QA findings fixed — jest `--reporters` removed (greedy yargs array; bug.21); own-property lookups at every spec table and a verdict for a throwing rule (bug.22); 33 tests (+13 shapes), 15 iterations | qa-fix |
| 2026-09-15 |         | QA gate CONCERNS (80/100) cycle 16 — no HIGH; 1 MEDIUM (tsc `-p`/`--project` declared bare while tsc consumes the next token — `npx tsc -p --noEmit` emitted under a directory named `--noEmit`, executed), 2 LOW (prettier resolves a string-valued data file as a module specifier — executed, in-repo-config class; tsc `--pretty=` dead); bugs 21–22 closed, bug.23 filed | qa-task |
| 2026-09-15 |         | QA findings fixed — tsc `-p`/`--project` are data value flags (bug.23); `--pretty=` dropped; bare-flag audit made shellcheck `-e` a value flag held to `SC` codes; prettier string-config residual documented; 33 tests (+17 shapes), 16 iterations | qa-fix |
| 2026-09-15 |         | QA gate PASS (90/100) cycle 17 — no HIGH, no MEDIUM; bug.23 closed (bugs 1–23 all closed); 2 LOW (jest/vitest `-t` value-taking but declared bare — no bypass; `-p ./tsconfig.json` refused because `DATA_FILE` admits no leading `./`) | qa-task |
| 2026-09-15 |         | QA findings fixed — jest/vitest `-t` declared as pattern value flags (QA-1); `DATA_FILE` admits an optional leading `./` (QA-2); 33 tests (+10 shapes), 17 iterations | qa-fix |
| 2026-09-15 |         | QA gate PASS (95/100) cycle 18 — no HIGH, no MEDIUM; gate-17 refinements verified and mutation-proven; bugs 1–23 closed; 1 LOW (`ESLINT_CONFIG` lacks the `./` prefix `DATA_FILE` has) | qa-task |
| 2026-09-15 |         | QA finding fixed — `ESLINT_CONFIG` admits the same optional leading `./` as `DATA_FILE` (QA-1); 33 tests (+5 shapes), 18 iterations | qa-fix |
| 2026-09-15 |         | QA gate PASS (100/100) cycle 19 — no finding of any severity; the cycle-18 fix verified and mutation-proven; bugs 1–23 closed; queue empty → 5c | qa-task |
| 2026-09-15 |         | 5c review 2 CONCERNS (non-blocking) — implementation report, NFR line, CHANGELOG and the handoff's remote figure brought into line; four LOW code findings recorded for follow-up | review-pr |
| 2026-09-16 | 1.2     | DoD passed — accepted (PR #408) | finalise |

---

## Progress Tracking

### Phase 1: contract
- [x] `SKILL.md` with write / read modes; per-figure command table; verdict vocabulary
### Phase 2: read mode is real
- [x] `scripts/handoff-verify.mjs` re-runs every `Command` cell and emits confirmed / stale / unverifiable per line
### Phase 3: write mode + wiring
- [x] Write mode produces `.agents/handoff.md` in the fixed section order; traps section is a pointer only
- [x] AGENTS.md pointer, catalog, `invokes:` (none — the skill invokes no other skill); tests; CHANGELOG

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-15 (cycle 19)
**Quality Score**: 100/100
**Gate Decision**: PASS — no open finding; bugs 1–23 closed

### QA Report
- **Full Report**: [task.110.qa.19.session-handoff-skill.md](./task.110.qa.19.session-handoff-skill.md) (earlier: [qa.1](./task.110.qa.1.session-handoff-skill.md) … [qa.18](./task.110.qa.18.session-handoff-skill.md); PR review: [pr-review.1](./task.110.pr-review.1.session-handoff-skill.md))
- **Gate File**: [task.110.gate.19.session-handoff-skill.yml](./task.110.gate.19.session-handoff-skill.yml) (earlier: [gate.1](./task.110.gate.1.session-handoff-skill.yml) … [gate.18](./task.110.gate.18.session-handoff-skill.yml))

### Test Coverage Summary
- **Tests Executed**: 33 (skill) + full hermetic suite (green, `npm test` exit 0) + `TMPDIR=/tmp` 33/33; 3,657 boundary probes (3,653 regression re-run, 2 executed end-to-end through the clone's own verifier at `15e9cfe4` and the consumer-shaped project, 2 mutation proofs — all `covered`; the reviewer's 149,792-value differential fuzz of the two config patterns)
- **Phases Verified**: 3/3
- **Critical Issues**: none — no open finding; bugs 1–23 all closed
- **NFR Status**: Security: PASS (measured), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Bug Reports
- [bug.1 whitelist admits mutating shapes](./task.110.bug.1.whitelist-admits-mutating-shapes.md) — ✅ Closed (verified cycle 2)
- [bug.2 parser aborts / table boundary](./task.110.bug.2.parser-aborts-and-table-boundary.md) — ✅ Closed (verified cycle 2)
- [bug.3 timed-out child keeps running](./task.110.bug.3.timed-out-child-keeps-running.md) — ✅ Closed (verified cycle 2)
- [bug.4 deny-list mechanism cannot hold](./task.110.bug.4.deny-list-mechanism-cannot-hold.md) — ✅ Closed (verified cycle 3)
- [bug.5 interrupted verifier orphans child](./task.110.bug.5.interrupted-verifier-orphans-child.md) — ✅ Closed (verified cycle 3)
- [bug.6 npm passthrough admits writes and outside modules](./task.110.bug.6.npm-passthrough-admits-writes-and-outside-modules.md) — ✅ Closed (verified cycle 7)
- [bug.7 gh api accepts absolute URL](./task.110.bug.7.gh-api-accepts-absolute-url.md) — ✅ Closed (verified cycle 7)
- [bug.8 interpreter arm runs any in-repo script including writers](./task.110.bug.8.interpreter-arm-runs-any-in-repo-script-including-writers.md) — ✅ Closed (verified cycle 8)
- [bug.9 gh and npm reach any host through repo and package specs](./task.110.bug.9.gh-and-npm-reach-any-host-through-repo-and-package-specs.md) — ✅ Closed (verified cycle 8)
- [bug.10 npx installs a missing tool from the registry](./task.110.bug.10.npx-installs-a-missing-tool-from-the-registry.md) — ✅ Closed (verified cycle 8)
- [bug.11 test-mode positional runs any in-repo file](./task.110.bug.11.test-mode-positional-runs-any-in-repo-file.md) — ✅ Closed (verified cycle 9)
- [bug.12 observation-log next-id is a write](./task.110.bug.12.observation-log-next-id-is-a-write.md) — ✅ Closed (verified cycle 9)
- [bug.13 git remote show resolves a URL positional](./task.110.bug.13.git-remote-show-resolves-a-url-positional.md) — ✅ Closed (verified cycle 9)
- [bug.14 npx config and formatter values load in-repo modules](./task.110.bug.14.npx-config-and-formatter-values-load-in-repo-modules.md) — ✅ Closed (verified cycle 10) - Priority: P1
- [bug.15 npx subcommand positional selects a scaffolder](./task.110.bug.15.npx-subcommand-positional-selects-a-scaffolder.md) — ✅ Closed (verified cycle 10) - Priority: P2
- [bug.16 tokenize drops empty quoted tokens](./task.110.bug.16.tokenize-drops-empty-quoted-tokens.md) — ✅ Closed (verified cycle 10) - Priority: P2
- [bug.17 reporter name kind is a shape, not a closed set](./task.110.bug.17.reporter-name-kind-is-a-shape-not-a-closed-set.md) — ✅ Closed (verified cycle 11) - Priority: P2
- [bug.18 jq alternative operator bypasses the env refusal](./task.110.bug.18.jq-alternative-operator-bypasses-the-env-refusal.md) — ✅ Closed (verified cycle 11) - Priority: P2
- [bug.19 npx positionals read as flag values and response files](./task.110.bug.19.npx-positionals-read-as-flag-values-and-response-files.md) — ✅ Closed (verified cycle 15) - Priority: P1
- [bug.20 runner inherits CI=false](./task.110.bug.20.runner-inherits-ci-false.md) — ✅ Closed (verified cycle 15) - Priority: P2
- [bug.21 jest --reporters is a greedy array option](./task.110.bug.21.jest-reporters-is-a-greedy-array-option.md) — ✅ Closed (verified cycle 16) - Priority: P1
- [bug.22 prototype keys are whitelist rules](./task.110.bug.22.prototype-keys-are-whitelist-rules.md) — ✅ Closed (verified cycle 16) - Priority: P2
- [bug.23 tsc -p/--project declared bare consumes --noEmit](./task.110.bug.23.tsc-project-flag-declared-bare-consumes-noemit.md) — ✅ Closed (verified cycle 17) - Priority: P2

### Key Findings
Cycle 19 (default narrowed scope): the cycle-18 fix holds and is mutation-proven; no finding of any severity; bugs 1–23 closed; the queue is empty and the loop exits to 5c. Cycle 18 (default narrowed scope): the cycle-17 refinements hold and are mutation-proven (four mechanisms); bugs 1–23 closed; no HIGH, no MEDIUM; one LOW — `ESLINT_CONFIG` was not given the `./` prefix `DATA_FILE` now has, so `eslint -c ./x.json` is refused while SKILL.md promises the spelling. Cycle 17 (default narrowed scope): the cycle-16 fix holds and is mutation-proven (five mechanisms); bug.23 closed — bugs 1–23 all closed; no HIGH, no MEDIUM. Two LOW refinements: jest/vitest `-t` is a value-taking option declared bare (no bypass — jest's yargs errors on a following dash token, vitest's cac still sees `--run`) and the fix made `npx tsc --noEmit -p ./tsconfig.json` unverifiable because `DATA_FILE` admits no leading `./`. Cycle 16 (unscoped): the cycle-15 fixes hold and are mutation-proven; bugs 21–22 closed. One MEDIUM of the value-flag class: tsc's `-p`/`--project` are declared bare while tsc consumes the next token as the project path, so `npx tsc -p --noEmit` satisfies the required flag and tsc never sets it — emitted through read mode under a directory named `--noEmit` in the consumer-shaped project (bug.23; held at MEDIUM because that repository model matches no real project). Two LOW: prettier resolves a data file whose whole content is a string as a shareable-config module (executed; the in-repo-config class, to be documented) and tsc `--pretty=` is dead. Cycle 15 (unscoped): the cycle-14 universal positional rule and the forced `CI` hold and are mutation-proven; bugs 19–20 closed. Two new defects: jest's `--reporters` is a greedy yargs array, so a following positional is loaded as a reporter module (`./zzrep.js` executed through read mode — bug.21); the spec tables are plain objects, so `constructor`/`toString` resolve as rules and `__proto__ x` throws out of `verify`, crashing the run (bug.22). Cycle 14 (unscoped by QA judgement after 5c's executed HIGH): the cycle-13 fixes hold and are mutation-proven, but they closed one spelling of a class the npx specs do not model — a positional the spec reads as a file is read by the tool's parser as a flag value (`tsc --noEmit null`, `jest --ci false`) or a response file (`tsc @tsargs.txt`, every refused flag back through a repository data file); all three wrote into the tree in the consumer-shaped project (bug.19). The runner's `CI: process.env.CI ?? "1"` lets an inherited `CI=false` through, and `npx jest --silent` then wrote a snapshot with no flag at all (bug.20). Cycle 13 (default narrowed scope): the two cycle-12 nits are closed and the `..` guard mutation-proven; the reviewer returned no findings; the 3,653 prior spellings re-run with no decision change; bugs 1–18 closed — no open finding. Cycle 12 (default narrowed scope): the cycle-11 refinements hold and are mutation-proven; bugs 1–18 closed; no HIGH, no MEDIUM; two LOW nits (`ESLINT_CONFIG` admits a basename containing `..` — a file name, not a traversal; the `.eslintrc` example is stale in two places). Cycle 11 (default narrowed scope, 3,672 probes, 19 executed end-to-end): the cycle-10 closed sets hold — `npx mocha -R zzrep t.js` with a root-level module present and `jq -n null//env` under a canary secret are refused through the clone's own verifier, all nine mechanisms are mutation-proven, and bugs 17–18 are closed; bugs 1–18 are all closed, no HIGH, no MEDIUM. Four LOW refinements remain (eslint `-c` shares the dotfile alternative that ESLint 9 would import; seven legacy `ESLINT_FORMATS` names resolve package-first on ESLint 9; vitest `basic` is gone in Vitest 4; a stale header comment and two dead `PATTERN_FLAGS` entries). Cycle 10 (unscoped safety re-probe, 3,676 probes, 23 executed end-to-end): the cycle-9 mechanism replacement holds — every cycle-9 and gate-6/7/8 spelling is refused through the clone's own verifier with no write and no request, all twelve mechanisms are mutation-proven, and bugs 14–16 are closed; no HIGH. Two MEDIUM residues of the new mechanism: the `name` kind is a character class and a reporter name is not one — mocha resolves a bare name against the cwd (`npx mocha -R zzrep t.js` ran a root-level module through read mode in a consumer-shaped project) and vitest `html`/`blob`, jest `jest-junit` write files (bug.17); and the jq `env` refusal's `/` exemption is jq's `//` operator, so `jq -n null//env` printed the environment (bug.18 — the QA-4 fix regressed on its own exemption). Cycle 9 (unscoped safety re-probe, 3,405 probes, 30 executed end-to-end): the cycle-8 mechanism replacement holds — the fourteen gate-6/7/8 spellings are refused through the CLI with no write and no request, all eight mechanisms are mutation-proven, and bugs 11–13 are closed. The handoff asked QA to decide whether the PRB-6 / CR-2 boundary ("in-repo modules named on `npx` loader flags are trusted") stands; on measurement it does not: prettier imports a `--config=<file>.mjs`, this repository ships `generate-prd-epic-index.mjs` with an unguarded top-level `main()` that reads prettier's argv as its own, and through read mode it rewrote a consumer-shaped PRD while the line read `confirmed` (bug.14, HIGH — the identity principle the interpreter arms adopted in cycle 8 is not yet applied to the `npx` arm). Two MEDIUMs from the same enumeration: mocha/vitest positionals are subcommands and `npx mocha init` scaffolded four files (bug.15); `tokenize()` drops an empty quoted token and confirmed `grep -c "" README.md` against `grep -c README.md` (bug.16). Fourth consecutive HIGH on `handoff-verify.mjs`; the operator waived the halt and the loop continues. Cycle 8 (unscoped safety re-probe, 136 probes, 29 executed end-to-end): every cycle-7 fix holds and all eleven mechanisms are mutation-proven; the seventeen spellings gate 7 executed are refused through the CLI with no write and no request; the npx residual is as documented. The bug.8 class is open through the one spelling bug.8 did not hold — a `--test`-mode positional is any relative file and Node runs an explicitly named file as a test regardless of its name, so `node --test scripts/generate-skill-dependencies.mjs` re-created a deleted tracked file and `node --test skills/loop-supervisor/scripts/run-loop.mjs` spawned two `claude -p` sessions from read mode (in a checkout with the skill installed, the autonomous `/develop-next` pipeline). The cycle-7 fix itself admitted `observation-log.js next-id` as a read; it archives resolved entries and writes the id floor at any absolute `--workspace`. `git remote show <url>` queries a document-chosen host (reviewer CR-1; scp form invokes ssh). Third strike on `handoff-verify.mjs`. Cycle 7 (unscoped safety re-probe, 1,377 spellings, 5 executed): the cycle-6 fixes hold and all three mechanisms are mutation-proven; the read-only invariant is open in a fourth arm — `node`/`python3` accept any relative script with any arguments, so an installed binary by path (`node node_modules/prettier/bin/prettier.cjs --write`) rewrote a fixture tree through read mode and the repo's own writers (`registry-tick.js`, `gh-stage.js --stage done`, `generate_catalog.py`) are one spelling away from the `npm run` names cycle 2 refused; `gh <verb> -R <host>/o/r` and `npm view <url-spec>` reach any host; `npx <tool>` installs a missing tool from the registry under the runner's non-TTY conditions. Cycle 6 (narrowed diff + executed boundary probes through every arm reaching the same binaries): the cycle-5 fix holds and is mutation-proven; `npm run format:check -- --write` rewrote a fixture tree and `npm test -- -r /tmp/evil.js` preloaded the file — the npm `--` passthrough forwards any dash token and absolute positional, an arm no cycle probed with an absolute value (cycle 3 tried `-r ./x` and accepted it as relative); `gh api https://…` requests any host (no token sent). Cycle 5 (narrowed): cycle-4 fixes verified; one regression in them — the pattern-flag exemption covers `--reporter`/`--format`, which load JS under npx tools. Cycle 4 (narrowed): PRB-6/7/8 closed; three small defects in those fixes — ls-remote `//host`, cap keeps the head, regex values falsely refused. Cycle 3: the allow-list holds against a third enumeration and every corpus sink; one MEDIUM — joined `name=value` flag values skip the path check (`--config=../evil.js`). Cycle 2: the cycle-1 shapes are closed, but the deny-list mechanism itself fails a fresh enumeration — git option prefixes, `-v` bypasses, `ls-remote --upload-pack`, `npm run <any> --check`, `gh api --hostname`, `--write=.`. Replace with per-binary allow-lists (bug.4). Cycle 1: the read-only whitelist — the risk §10 names — was porous: `gh api -XPOST`, `git branch -D` / `tag` / `remote add` / `--output=`, `node -e`, `npx --write --check`, `find -fprint` are accepted. Parser aborts on a malformed `expect:`; a blank line does not end the header table; a timed-out child is orphaned under bash 3.2.

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.110.qa.19.session-handoff-skill.md` (cycles 1–19)
**Gate File**: `task.110.gate.19.session-handoff-skill.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**PR Review (5c)**: `task.110.pr-review.2.session-handoff-skill.md` — CONCERNS, non-blocking (`pr-review.1` REQUEST CHANGES, all findings fixed)

All Definition of Done criteria have been verified:

✅ **Success Criteria:** All 6 met — each traced to code in the PR and to a test or CI lane that runs per-PR (`test.yml`, `validate.yml`)
✅ **Tests:** 33 tests in `skills/session-handoff/tests/handoff-verify.test.js` under `npm test`; full hermetic suite green; every whitelist mechanism mutation-proven across 19 QA cycles
✅ **PR Review:** PR #408 (`feature/task.110.session-handoff-skill` → `develop`); no human reviewer on this repository — Step 5c `/review-pr` twice (REQUEST CHANGES → fixed → CONCERNS, non-blocking); recorded as unverified by human review
✅ **CI:** reading 1 SUCCESS @ `364a706bed5d` (branch-policy, link-check, shellcheck, test, validate); reading 2 on the acceptance head recorded on the PR canonical comment and in the implementation report
✅ **Documentation:** `SKILL.md`, `CHANGELOG.md` (task 110), skill catalog, skill dependencies, `commands.md`, `activation-phrases.md`, `AGENTS.md` pointer, `.agents/handoff.md` rewritten in the fixed section order
✅ **Security Review:** ✅ PASS — the read-only whitelist is a boundary deliverable: 85 candidates executed against `isAllowed` (corpus `shell-exec` / `path` / `url-authority` + 31 boundary-specific), every hostile, mutating, egress, shell-expansion and code-load candidate refused, every whitelisted read-only command admitted; one documented residual (absolute paths for the plain readers, `SKILL.md:119`)
✅ **Compliance Review:** ⚠️ NOT_APPLICABLE — no personal, payment, UI or health data
✅ **Performance / Reliability / Maintainability:** ✅ PASS (gate 19)

**Deployment Readiness:**

- Staging: ✅ APPROVED
- Production: ✅ APPROVED (gate 19)

**Recorded follow-ups (none blocking):** `pr-review.2` CR-1 (mid-token `~` refused), CR-3 (a table row carrying a trailing comment ends the table), CR-4/CR-5 (two cleanups); scrubbed child environment and quoted-glob tokenising (future work since gate 8); README skills badge 126 → 128 (pre-existing drift).

**Task marked as ACCEPTED on:** 2026-09-16

**Detailed Verification Log:** See `task.110.dod.1.session-handoff-skill.md` for complete verification evidence and timestamps.

## References

- **Plan**: [`task.110.plan.session-handoff-skill.md`](task.110.plan.session-handoff-skill.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Staged proposal**: `~/.claude/projects/-Users-gamaroff-Development-Projects-agent-skills/skill-updates/PROPOSED-session-handoff/session-handoff/SKILL.md` (obs #6, 2026-09-08) — a scaffold with an explicit TODO list; use as input, not as the deliverable
- **Durable traps home**: `docs/contributing/traps.md`
- **Related Skill**: `.agents/skills/create-skill/`, `.agents/skills/observe-work/`

---

**Status:** Accepted

**Next Steps**:
1. `/develop-task docs/tasks/task.110.session-handoff-skill/task.110.session-handoff-skill.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
