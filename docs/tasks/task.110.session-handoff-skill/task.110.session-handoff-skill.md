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
