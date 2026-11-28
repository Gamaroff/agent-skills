---
id: task.334
title: "Probe fenced blocks that take several inputs"
type: task
description: "The security probe's fence: form substitutes one placeholder, so a fenced bash block with several substituted inputs HALTs on its own placeholder guard in every case; a repeatable --bind fixes the others to stated values and the probe refuses a placeholder left unbound."
tags: [security-probe, finalise, probe, follow-up]
category: testing
status: planned
priority: Medium
risk_level: low
created: 2026-11-28
updated: 2026-11-28
assignee:
estimated_effort_hours: 4
---

# Probe fenced blocks that take several inputs

**Status:** Planned

---

## 1. Overview

The security probe's `fence:` entry form runs a fenced bash block once per case, with the case's
input substituted for one placeholder (`--slot`). Many blocks in this repository now take **several**
substituted inputs, each guarded by `case "$A$B" in *'{'*) echo "HALT: …"; exit 1 ;; esac`. Probed
today, the placeholders the slot does not fill stay verbatim, the block's own guard HALTs, and every
case reads as a refusal: a probe that cannot fail.

**Scope:** a repeatable `--bind '<token>=<value>'` on the `fence:` form that fixes every other
placeholder to a stated value; a new refusal for a block that still holds a `{…}` placeholder after
substitution; the result records the binds; the probe-boundary rule and the security prompts name the
flag.

**Key deliverables:**

- `--bind` on `security-probe.mjs`, `fence:` only, recorded as `binds` in the result.
- A distinct decline, `unbound-placeholder`, when a placeholder survives the slot and the binds.
- A test that probes a real two-placeholder block (review-story's Step 10 pin block) and scores both
  an accepted and a refused case.

**Expected outcome:** a `fence:` probe of a multi-input block reaches the guard it exists to test, and
a probe that would only ever hit the placeholder HALT is refused before any case runs.

## 2. Motivation

### Current problems

- **A multi-input block cannot be probed.** `security-probe.mjs:4467`
  (`const script = block.replaceAll(slot, () => c.input);`) replaces one token. review-story's two pin
  blocks (`STORY_FILE_PATH`, `PIN_BRANCH`) and finalise's Step 3c inputs each hold two or more.
- **The failure is silent and reads as a pass.** The surviving placeholder trips the block's own
  `*'{'*` HALT, which prints a non-empty refusal. `scoreFenceRun` counts that as the guard refusing,
  so hostile cases score as rejected and benign cases as wrongly rejected, with no hint why.
- **The only check is that the slot appears** (`security-probe.mjs:2315`, `bad-slot`: "a slot that
  substitutes nothing tests nothing"). Nothing checks that the slot is the **only** thing left to
  substitute.

### Benefits

- Every multi-input guard the pipelines ship as Markdown becomes probeable, the class task 333 added
  two more of.
- A probe that can only hit the placeholder HALT is declined up front, with its reason, instead of
  producing a misleading verdict.
- The binds are recorded, so a reader of the result sees what the other inputs were held at.

## 3. Technical Background

### Current architecture

- `--slot` is parsed at `security-probe.mjs:5162` (`"--slot": "slot"`), validated at
  `security-probe.mjs:1983-1995` (`bad-slot` when missing with `fence:` or given with another form),
  and checked against the block at `security-probe.mjs:2315`.
- The block is extracted by `extractFencedBlock` (`security-probe.mjs`, § "The fence entry form",
  line 4040) and substituted per case at `security-probe.mjs:4467`.
- The result carries `slot` (`security-probe.mjs:1969`, `base.slot = slot`).
- `security-probe-plan.mjs` passes a plan entry's `argv` through to the engine and refuses only flags
  the runner owns (`planArgvAllowed`, `security-probe-plan.mjs:136`); it has no `slot` handling
  (`grep -n slot shared/resources/security-probe-plan.mjs` returns nothing), so `--bind` needs no
  change there unless it is added to the owned set (it is not).
- Docs naming the form: `shared/resources/probe-boundary-rule.md` (§5 and the decline table, `bad-slot`
  row at line 181), `shared/resources/security-review-prompt.md` (lines 124, 183, 278),
  `shared/resources/finalise-dod-security-prompt.md`.

### Target architecture

- `--bind '<token>=<value>'`, repeatable. Split on the **first** `=`; the token is non-empty and is
  neither the slot nor a duplicate of another bind. `fence:` only, else `bad-bind` (exit 2), like
  `--slot`. Each token must appear in the block, else `bad-bind` ("a bind that substitutes nothing").
- Per case: apply every bind (`replaceAll`, function replacer, as the slot is), then the slot. Binds
  first, so a case input that happens to contain a bind token is not rewritten.
- After the binds, before any case runs: if the block (with the slot token removed) still holds a
  line of the form `NAME="{…}"`, decline `unbound-placeholder`, naming each token and its line. Keyed
  on the repository's substituted-input spelling, not on any brace: a `${X}` or a `{a,b}` brace list
  must stay legal (calibration cases in the tests). The match is greedy within the line, because
  placeholders nest braces: finalise's Step 0 `STEM="{story.{P}.{E}.{S} | task.{id} | …}"`
  (`skills/finalise/SKILL.md`, the `next_numbered` block) would slip past a `[^}]*` pattern.
- Result: `binds` as `[{token, value}]` beside `slot`.

No existing mechanism does this job: the `fixture: {env, files}` of a case supplies the environment
and files a block reads, not text substituted into its source.

## 4. Scope

**In scope**

- ✅ `--bind` parsing, validation and substitution in `shared/resources/security-probe.mjs`.
- ✅ The `unbound-placeholder` decline and the `bad-bind` usage refusal.
- ✅ `binds` in the result record.
- ✅ The probe-boundary rule's decline table and §5, and the two security prompts.
- ✅ Tests in `shared/resources/tests/security-probe.test.mjs`.
- ✅ `npm run bundle` for every skill that bundles the changed shared files.

**Out of scope**

- ❌ Varying more than one input per case (a case still carries one `input`). Two varied inputs are
  two probes.
- ❌ The `cli:` and `shell-argv:` forms, which already take a full argv template.
- ❌ Changing any shipped block's guard.

## 5. Breaking Changes

None. `--bind` is new and optional. The `unbound-placeholder` decline only fires on a probe that
today produces a meaningless verdict; any recorded result that would now decline was already wrong.

## 6. Implementation Plan

> Detailed implementation guide: [task.334.plan.probe-fence-blocks-with-several-inputs.md](task.334.plan.probe-fence-blocks-with-several-inputs.md)

### Phase 1: `--bind` and the decline (Risk: Medium)

Files: `shared/resources/security-probe.mjs`

- [ ] Parse `--bind` as a repeatable flag; validate it beside `slot` (fence: only, `=` present,
      non-empty token, not the slot, no duplicate).
- [ ] Check each bind token appears in the extracted block (`bad-bind` otherwise).
- [ ] Apply binds before the slot at the per-case substitution.
- [ ] Decline `unbound-placeholder` when a `NAME="{…}"` placeholder survives, before any case runs.
- [ ] Record `binds` in the result.
- [ ] Update the header usage block.

Dependencies: none.

### Phase 2: Tests (Risk: Low)

Files: `shared/resources/tests/security-probe.test.mjs`

- [ ] Probe review-story's Step 10 pin block with `--slot` on `PIN_BRANCH`'s placeholder and
      `--bind` on `STORY_FILE_PATH`'s: a benign branch is accepted, a hostile one is scored.
- [ ] The same probe with no `--bind` declines `unbound-placeholder`, naming the token.
- [ ] `bad-bind` for each refusal (no `=`, empty token, the slot's token, a duplicate, absent from the
      block, given with a non-fence form).
- [ ] Calibration: a block holding `${X}` and `{a,b}` but no `NAME="{…}"` is not declined; a block
      holding an unbound nested-brace placeholder (`STEM="{story.{P}.{E}.{S}}"`) is.
- [ ] A case input containing a bind token is not rewritten.

Dependencies: Phase 1.

### Phase 3: Docs and bundle (Risk: Low)

Files: `shared/resources/probe-boundary-rule.md`, `shared/resources/security-review-prompt.md`,
`shared/resources/finalise-dod-security-prompt.md`, bundled copies.

- [ ] Add `bad-bind` and `unbound-placeholder` rows to the decline table; describe `--bind` in §5.
- [ ] Name `--bind` wherever the prompts give the `fence:` invocation.
- [ ] `npm run bundle`; `npm run bundle:check` clean.

Dependencies: Phase 1.

## 7. Files Summary

**Core implementation**

1. ✅ `shared/resources/security-probe.mjs` — flag, validation, substitution, decline, record.

**Tests**

2. ✅ `shared/resources/tests/security-probe.test.mjs` — the cases in Phase 2.

**Documentation**

3. ✅ `shared/resources/probe-boundary-rule.md` — decline table and §5.
4. ✅ `shared/resources/security-review-prompt.md` — the `fence:` invocation.
5. ✅ `shared/resources/finalise-dod-security-prompt.md` — the `fence:` invocation.
6. ✅ `skills/*/references/` copies of 1, 3, 4 and 5 — regenerated by `npm run bundle`.

## 8. Testing Strategy

**Unit tests:** `command node --test shared/resources/tests/security-probe.test.mjs`, under bash and,
where installed, zsh (the `fence:` form already runs both).

**Integration:** the review-story Step 10 block is the real two-placeholder target. It is read from
`skills/review-story/SKILL.md` on every run, so a later edit to that block is exercised too.

**Mutation proof:**

- Drop the binds from the per-case substitution: the review-story probe's benign case turns red.
- Remove the `unbound-placeholder` check: the no-bind case turns red (it would run and score).
- Apply the slot before the binds: the "input contains a bind token" case turns red.
- Widen the placeholder pattern to any `{…}`: the calibration case turns red.

**Regression:** the full suite through `npm run test:remote`.

## 9. Success Criteria

### Functional

- [ ] A `fence:` probe of review-story's Step 10 pin block with one `--bind` scores its cases by the
      guard's own behaviour, not by the placeholder HALT (Phase 2 test).
- [ ] The same probe without `--bind` exits with the `unbound-placeholder` decline naming
      `STORY_FILE_PATH`'s placeholder, and runs no case.
- [ ] Each `bad-bind` refusal in Phase 2 exits 2 with its reason.
- [ ] Every existing `security-probe.test.mjs` case still passes.

### Performance

- [ ] No measurable change: the binds are a few string replacements per case. No timing criterion.

### Code quality

- [ ] `npm run lint` and `npm run format:check` pass.
- [ ] `npm run bundle:check` reports no drift and no `UNREACHED` copy.
- [ ] Each mutation in § 8 turns its named test red, recorded in the QA report with the test name.

### Migration

- [ ] `probe-boundary-rule.md`'s decline table lists `bad-bind` and `unbound-placeholder`.
- [ ] Both security prompts show `--bind` in the `fence:` invocation.

## 10. Risk Assessment

**High:** none.

**Medium — the placeholder pattern misfires.** A pattern wider than `NAME="{…}"` would decline blocks
that are probeable today. Probability: medium. Impact: a working probe stops running. Mitigation: key
on the assignment spelling the repository uses, and pin legal shapes in the calibration test.
Rollback: revert Phase 1.

**Low — a bind token inside a case input.** Mitigation: binds are applied first, and a test holds it.

## 11. Rollback Plan

**Immediate (< 1 hour):** revert the task's commits; `npm run bundle`. Trigger: an existing probe
declines `unbound-placeholder` wrongly, or a `security-probe.test.mjs` case regresses.

**Partial:** keep `--bind`, revert the decline, if only the pattern misfires.

**Forward fix:** a calibration miss in the pattern is fixed forward with a new pinned case.

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-28 | 1.0     | Initial draft | create-task |

## Progress Tracking

- [ ] Phase 1: `--bind` and the decline
- [ ] Phase 2: Tests
- [ ] Phase 3: Docs and bundle

QA artifacts will land in this directory: `task.334.qa.{N}.probe-fence-blocks-with-several-inputs.md`,
`task.334.gate.{N}.probe-fence-blocks-with-several-inputs.yml`, and any `task.334.bug.{N}.*.md`.

## References

- Task 333 (PR #966): added the review-story pin-block inputs this task probes.
- `shared/resources/probe-boundary-rule.md` § the `fence:` form.

## Notes

Found while closing task 333's follow-ups: the `fence:` form could not probe the two pin blocks that
fix bound.
