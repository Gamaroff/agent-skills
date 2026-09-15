---
id: task.110
title: "[Task 110] A session-handoff skill that writes the handoff and re-measures it on read"
type: task
description: "`.agents/handoff.md` is the 'read this first' file, and it decays within a day — the 2026-09-10 version named T107 as next and 'frontier not empty'; T107 merged the next day and the frontier is empty. Every figure in it already carries the command that produced it, so the read end can re-run them. Build the skill the 2026-09-08 observe-work review proposed: write mode with a fixed section order and a per-figure command, read mode that re-measures and reports confirmed / stale / unverifiable per line. Traps live in docs/contributing/traps.md, not in the handoff."
tags: [skill, handoff, observe-work, docs]
category: other
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-15
assignee:
estimated_effort_hours: 8
github_issue: 407
---

# Technical Task: A session-handoff skill that writes the handoff and re-measures it on read

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.110.review.1.session-handoff-skill.md` implemented 2026-09-15
**GitHub Issue**: [#407](https://github.com/Gamaroff/agent-skills/issues/407)

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

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-15 (cycle 10 — the operator waived the loop budget for this run)
**Quality Score**: 70/100
**Gate Decision**: CONCERNS — no HIGH for the first time since gate 5; two MEDIUM residues of the cycle-9 mechanism (bug.17, bug.18) route the gate to `/qa-fix`

### QA Report
- **Full Report**: [task.110.qa.10.session-handoff-skill.md](./task.110.qa.10.session-handoff-skill.md) (earlier: [qa.1](./task.110.qa.1.session-handoff-skill.md), [qa.2](./task.110.qa.2.session-handoff-skill.md), [qa.3](./task.110.qa.3.session-handoff-skill.md), [qa.4](./task.110.qa.4.session-handoff-skill.md), [qa.5](./task.110.qa.5.session-handoff-skill.md), [qa.6](./task.110.qa.6.session-handoff-skill.md), [qa.7](./task.110.qa.7.session-handoff-skill.md), [qa.8](./task.110.qa.8.session-handoff-skill.md), [qa.9](./task.110.qa.9.session-handoff-skill.md))
- **Gate File**: [task.110.gate.10.session-handoff-skill.yml](./task.110.gate.10.session-handoff-skill.yml) (earlier: [gate.1](./task.110.gate.1.session-handoff-skill.yml), [gate.2](./task.110.gate.2.session-handoff-skill.yml), [gate.3](./task.110.gate.3.session-handoff-skill.yml), [gate.4](./task.110.gate.4.session-handoff-skill.yml), [gate.5](./task.110.gate.5.session-handoff-skill.yml), [gate.6](./task.110.gate.6.session-handoff-skill.yml), [gate.7](./task.110.gate.7.session-handoff-skill.yml), [gate.8](./task.110.gate.8.session-handoff-skill.yml), [gate.9](./task.110.gate.9.session-handoff-skill.yml))

### Test Coverage Summary
- **Tests Executed**: 31 (skill) + full hermetic suite (3301 pass / 0 fail / 1 skipped) + `TMPDIR=/tmp` 31/31; 3,676 boundary probes (3,367 regression re-run, 286 fresh, 23 executed end-to-end through the clone's own verifier at `efcd3ae3` and a consumer-shaped project under a stripped environment with a local listener, 12 mutation proofs — all `covered`)
- **Phases Verified**: 3/3 (phase 2 concerns)
- **Critical Issues**: 0 HIGH; 2 MEDIUM (the `name` kind admits reporter names that load a cwd module on mocha — executed in a consumer-shaped project — or write files on vitest/jest; `jq -n null//env` bypasses the cycle-9 `env` refusal — executed, the QA-4 fix regressed); 2 LOW; bugs 1–16 closed, bugs 17–18 open
- **NFR Status**: Security: CONCERNS (measured, 3,676 probes), Performance: PASS, Reliability: PASS, Maintainability: PASS

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
- [bug.17 reporter name kind is a shape, not a closed set](./task.110.bug.17.reporter-name-kind-is-a-shape-not-a-closed-set.md) — ✅ Ready for QA (fixed cycle 10) - Priority: P2
- [bug.18 jq alternative operator bypasses the env refusal](./task.110.bug.18.jq-alternative-operator-bypasses-the-env-refusal.md) — ✅ Ready for QA (fixed cycle 10) - Priority: P2

### Key Findings
Cycle 10 (unscoped safety re-probe, 3,676 probes, 23 executed end-to-end): the cycle-9 mechanism replacement holds — every cycle-9 and gate-6/7/8 spelling is refused through the clone's own verifier with no write and no request, all twelve mechanisms are mutation-proven, and bugs 14–16 are closed; no HIGH. Two MEDIUM residues of the new mechanism: the `name` kind is a character class and a reporter name is not one — mocha resolves a bare name against the cwd (`npx mocha -R zzrep t.js` ran a root-level module through read mode in a consumer-shaped project) and vitest `html`/`blob`, jest `jest-junit` write files (bug.17); and the jq `env` refusal's `/` exemption is jq's `//` operator, so `jq -n null//env` printed the environment (bug.18 — the QA-4 fix regressed on its own exemption). Cycle 9 (unscoped safety re-probe, 3,405 probes, 30 executed end-to-end): the cycle-8 mechanism replacement holds — the fourteen gate-6/7/8 spellings are refused through the CLI with no write and no request, all eight mechanisms are mutation-proven, and bugs 11–13 are closed. The handoff asked QA to decide whether the PRB-6 / CR-2 boundary ("in-repo modules named on `npx` loader flags are trusted") stands; on measurement it does not: prettier imports a `--config=<file>.mjs`, this repository ships `generate-prd-epic-index.mjs` with an unguarded top-level `main()` that reads prettier's argv as its own, and through read mode it rewrote a consumer-shaped PRD while the line read `confirmed` (bug.14, HIGH — the identity principle the interpreter arms adopted in cycle 8 is not yet applied to the `npx` arm). Two MEDIUMs from the same enumeration: mocha/vitest positionals are subcommands and `npx mocha init` scaffolded four files (bug.15); `tokenize()` drops an empty quoted token and confirmed `grep -c "" README.md` against `grep -c README.md` (bug.16). Fourth consecutive HIGH on `handoff-verify.mjs`; the operator waived the halt and the loop continues. Cycle 8 (unscoped safety re-probe, 136 probes, 29 executed end-to-end): every cycle-7 fix holds and all eleven mechanisms are mutation-proven; the seventeen spellings gate 7 executed are refused through the CLI with no write and no request; the npx residual is as documented. The bug.8 class is open through the one spelling bug.8 did not hold — a `--test`-mode positional is any relative file and Node runs an explicitly named file as a test regardless of its name, so `node --test scripts/generate-skill-dependencies.mjs` re-created a deleted tracked file and `node --test skills/loop-supervisor/scripts/run-loop.mjs` spawned two `claude -p` sessions from read mode (in a checkout with the skill installed, the autonomous `/develop-next` pipeline). The cycle-7 fix itself admitted `observation-log.js next-id` as a read; it archives resolved entries and writes the id floor at any absolute `--workspace`. `git remote show <url>` queries a document-chosen host (reviewer CR-1; scp form invokes ssh). Third strike on `handoff-verify.mjs`. Cycle 7 (unscoped safety re-probe, 1,377 spellings, 5 executed): the cycle-6 fixes hold and all three mechanisms are mutation-proven; the read-only invariant is open in a fourth arm — `node`/`python3` accept any relative script with any arguments, so an installed binary by path (`node node_modules/prettier/bin/prettier.cjs --write`) rewrote a fixture tree through read mode and the repo's own writers (`registry-tick.js`, `gh-stage.js --stage done`, `generate_catalog.py`) are one spelling away from the `npm run` names cycle 2 refused; `gh <verb> -R <host>/o/r` and `npm view <url-spec>` reach any host; `npx <tool>` installs a missing tool from the registry under the runner's non-TTY conditions. Cycle 6 (narrowed diff + executed boundary probes through every arm reaching the same binaries): the cycle-5 fix holds and is mutation-proven; `npm run format:check -- --write` rewrote a fixture tree and `npm test -- -r /tmp/evil.js` preloaded the file — the npm `--` passthrough forwards any dash token and absolute positional, an arm no cycle probed with an absolute value (cycle 3 tried `-r ./x` and accepted it as relative); `gh api https://…` requests any host (no token sent). Cycle 5 (narrowed): cycle-4 fixes verified; one regression in them — the pattern-flag exemption covers `--reporter`/`--format`, which load JS under npx tools. Cycle 4 (narrowed): PRB-6/7/8 closed; three small defects in those fixes — ls-remote `//host`, cap keeps the head, regex values falsely refused. Cycle 3: the allow-list holds against a third enumeration and every corpus sink; one MEDIUM — joined `name=value` flag values skip the path check (`--config=../evil.js`). Cycle 2: the cycle-1 shapes are closed, but the deny-list mechanism itself fails a fresh enumeration — git option prefixes, `-v` bypasses, `ls-remote --upload-pack`, `npm run <any> --check`, `gh api --hostname`, `--write=.`. Replace with per-binary allow-lists (bug.4). Cycle 1: the read-only whitelist — the risk §10 names — was porous: `gh api -XPOST`, `git branch -D` / `tag` / `remote add` / `--output=`, `node -e`, `npx --write --check`, `find -fprint` are accepted. Parser aborts on a malformed `expect:`; a blank line does not end the header table; a timed-out child is orphaned under bash 3.2.

---

## References

- **Plan**: [`task.110.plan.session-handoff-skill.md`](task.110.plan.session-handoff-skill.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Staged proposal**: `~/.claude/projects/-Users-gamaroff-Development-Projects-agent-skills/skill-updates/PROPOSED-session-handoff/session-handoff/SKILL.md` (obs #6, 2026-09-08) — a scaffold with an explicit TODO list; use as input, not as the deliverable
- **Durable traps home**: `docs/contributing/traps.md`
- **Related Skill**: `.agents/skills/create-skill/`, `.agents/skills/observe-work/`

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.110.session-handoff-skill/task.110.session-handoff-skill.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
