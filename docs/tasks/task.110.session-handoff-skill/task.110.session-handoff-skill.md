---
id: task.110
title: "[Task 110] A session-handoff skill that writes the handoff and re-measures it on read"
type: task
description: "`.agents/handoff.md` is the 'read this first' file, and it decays within a day — the 2026-09-10 version named T107 as next and 'frontier not empty'; T107 merged the next day and the frontier is empty. Every figure in it already carries the command that produced it, so the read end can re-run them. Build the skill the 2026-09-08 observe-work review proposed: write mode with a fixed section order and a per-figure command, read mode that re-measures and reports confirmed / stale / unverifiable per line. Traps live in docs/contributing/traps.md, not in the handoff."
tags: [skill, handoff, observe-work, docs]
category: other
status: planned
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 8
---

# Technical Task: A session-handoff skill that writes the handoff and re-measures it on read

**Status:** Planned

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
- Tests under `skills/session-handoff/tests/` — **and the glob added to `package.json`** (traps:
  "npm test's suite list is hand-maintained").

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

1. **Contract.** Lift the section table and verdict table from the staged proposal into SKILL.md;
   decide the per-figure command syntax (recommend: a `Command` column in the header table and a
   trailing `<!-- cmd: … -->` on prose figures).
2. **Verifier.** `handoff-verify.mjs`: parse → run (with `command` prefix, per traps) → compare →
   report. `--json` with `reason` ∈ `ok | stale | unverifiable | usage`.
3. **Write mode.** Template + procedure; the traps section is a one-paragraph pointer to
   `docs/contributing/traps.md`.
4. **Wire.** AGENTS.md pointer; `npm run generate-catalog`; `generate-skill-deps`; test glob.
5. **Prove.** Run read mode against the 2026-09-10 handoff (from git history) and confirm it reports
   §1 stale and §3a's "touched since" stale.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `skills/session-handoff/SKILL.md`, `scripts/handoff-verify.mjs`, `assets/handoff.template.md`, `tests/*.test.mjs` | new |
| `package.json` | test glob |
| `AGENTS.md` | pointer |
| `docs/reference/skill-catalog.md`, `shared/resources/skill-dependencies.json` | regenerated |
| `.agents/handoff.md` | rewritten in the new shape by the skill's own write mode |

## 8. Testing Strategy

- **Unit**: parser on fixture handoffs (table cell, prose comment, missing command); comparator on
  equal / changed / command-failed.
- **Integration**: read mode over a fixture repo with a known-stale figure → `stale` with the new
  value; over a Jira-only check with no credentials → `unverifiable`.
- **Regression**: the historical 2026-09-10 handoff (from `git show 6ce3280e:.agents/handoff.md`)
  → at least two `stale` lines, named.
- **Mutation**: break the comparator (always `confirmed`) → the fixture test goes red.

## 9. Success Criteria

1. `/session-handoff --read` (or the documented verb) prints one verdict per figure, and the
   2026-09-10 handoff yields `stale` for the frontier line and for the `change-log.js` "touched since" claim
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

---

## Progress Tracking

### Phase 1: contract
- [ ] `SKILL.md` with write / read modes; per-figure command table; verdict vocabulary
### Phase 2: read mode is real
- [ ] `scripts/handoff-verify.mjs` re-runs every `Command` cell and emits confirmed / stale / unverifiable per line
### Phase 3: write mode + wiring
- [ ] Write mode produces `.agents/handoff.md` in the fixed section order; traps section is a pointer only
- [ ] AGENTS.md pointer, catalog, `invokes:`; tests; CHANGELOG

---

## References

- **Plan**: [`task.110.plan.session-handoff-skill.md`](task.110.plan.session-handoff-skill.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Staged proposal**: `~/.claude/projects/-Users-gamaroff-Development-Projects-agent-skills/skill-updates/PROPOSED-session-handoff/session-handoff/SKILL.md` (obs #6, 2026-09-08) — a scaffold with an explicit TODO list; use as input, not as the deliverable
- **Durable traps home**: `docs/contributing/traps.md`
- **Related Skill**: `.agents/skills/create-skill/`, `.agents/skills/observe-work/`

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.110.session-handoff-skill/task.110.session-handoff-skill.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
