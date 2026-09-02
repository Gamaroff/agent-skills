---
id: task.81
title: "[Task 81] Ship /review-security: prove a control engages, not that it is present"
type: task
description: "Nothing in the repo takes application code as its subject and executes adversarial input against it. Ship a review skill that does — reporting engages / present-but-inert / absent / unverifiable per control, with the verdict computed by the engine and its own PASS falsifiable in CI."
tags: [security, review, skill, probe]
category: infrastructure
status: ready-for-development
priority: High
risk_level: medium
created: 2026-09-02
updated: 2026-09-02
assignee:
estimated_effort_hours: 6
depends_on: task.79, task.80
---

# Technical Task: Ship `/review-security` — prove a control engages, not that it is present

**Status:** Ready for Development

---

## 1. Overview

`task.73` gave the DoD gate a probe mode, but gated it on the deliverable **being** an accept/reject
predicate. Two measured defects escape that gate, and they escape it for the same reason: the control was a
*configuration* and a *composition*, not a decider.

This skill takes a story or task and its co-located artifacts, identifies the security controls the work
item claims, and establishes for each whether it **engages** — by running it.

**Scope**: the skill, its prompt, its output contract, and the fixtures that make its own PASS falsifiable.

---

## 2. Motivation

### Current Problems

1. **`boundary: false` skips everything.** `finalise-dod-security-prompt.md:48-50` names the negative case
   as the common one — "a CRUD endpoint, a renderer, a report writer, a formatter, a schema migration, a
   logging change". An ioredis options object and a URL composer sit squarely in it, so probe mode never
   runs on either.
2. **The presence checklist passes the defect outright.** The infrastructure check reads: *"TLS configured:
   grep changed config files for `https`, `tls`, `ssl` settings"*. Against
   `...(isTls ? { tls: {} } : {})` that grep **hits**, a citation exists, and the check returns PASS —
   while in Sentinel mode `ioredis` upgrades the stream only when `enableTLSForSentinelMode && tls`
   (`SentinelConnector/index.js:88`, verified in `ioredis@5.11.1`) and reaches sentinels through a separate
   `sentinelTLS` (`:187`). A `rediss://` URL produced a plaintext connection that looked encrypted.
3. **A vacuous test reported the coverage.** The accompanying unit test asserted
   `expect(options.tls).toBeDefined()` — green while TLS was inert.
4. **Nothing is diff-independent.** Every existing security instrument is anchored to a work item with a
   diff and a pending gate. A control that shipped last month, with nothing touching it now, is reviewed by
   nothing.

### Benefits

1. **`present-but-inert` gets a name and a severity.** It is **high** — worse than absent, because it has
   already been reviewed and believed.
2. **A PASS names what was probed.** "No issues found" without a method is the failure this replaces.
3. **On-demand and off-diff.** `full` mode reviews the work item's security surface regardless of what
   changed.

---

## 3. Technical Background

### Current architecture

Three partial instruments, none of which catches either defect:

| Instrument | Method | Why it misses |
| --- | --- | --- |
| `finalise` DoD security agent | grep checklist + probe mode | probe gated on `boundary: true`; both defects are `boundary: false` |
| `qa-story` / `qa-task` NFR security | judgement from reading | `qa-task/SKILL.md:567` is one line: *"Review for security issues"* |
| `review-code` | correctness + cleanups | security is one bullet in `code-review-prompt.md:41`; no security lens |

### Prior art

- **`task.73`** — the method, the `security_review` YAML envelope, and the rule that zero executed
  candidates is a finding rather than a pass. This skill widens the *subject*, not the method.
- **`task.79`** — the corpus supplying candidate inputs and their correct handling.
- **`task.80`** — the engine that runs a probe and computes the verdict.
- **`review-pr`** — precedent for a review skill that runs two read-only lenses and writes a co-located
  report without owning a gate.

### Naming

`/security-review` is a **Claude Code built-in** ("Complete a security review of the pending changes on the
current branch"). The repo skill is `review-security`, joining the existing `review-*` family and inheriting
the `review-skills` tag.

The dispatch strings do not collide. The residual risk is **natural-language ambiguity**: "do a security
review" matches both, the built-in wins, and the user receives a read-only judgement believing they
received a probed one — the same silent-success shape this series keeps fixing. Mitigated by the
`description:` frontmatter leading with the discriminator and by a `## Relationship to the built-in
/security-review` section held by a contract test.

---

## 4. Scope

### In Scope

✅ **`skills/review-security/SKILL.md`** — modes `diff` (default) and `full`
✅ **`shared/resources/security-review-prompt.md`** — the reviewer prompt as single source
✅ **Four verdicts** — `engages` / `present-but-inert` / `absent` / `unverifiable`, with `present-but-inert` high
✅ **Output**: `*.security.{N}.{name}.md` co-located, plus a machine block carrying `evidence:` and `probes_executed`
✅ **Falsifiability fixtures** — both measured defects, engaged and inert variants
✅ **Registration**: `package.json` test glob, `CATEGORIES`, catalog, docs sweep

### Out of Scope

❌ **`--fix`** — the handover's own author doubts it; a fix to a security control is the change class that
   most needs a human plus a full re-probe. `qa-fix` already owns repair in the pipeline
❌ **`--comment` / PR posting** — depends on `task.70`'s inline-comment primitive, unshipped
❌ **Epic-level scope** — unbounded budget with no stopping rule; `full` already covers "unscoped", bounded
   to one work item
❌ **Owning `nfr_validation.security`** — advisory in v1; wiring is `task.82`
❌ **Non-JS entry points** — `unverifiable`, stated as a v1 limit

---

## 5. Breaking Changes

None. A new skill; no existing gate, schema or pipeline step changes. Consumers who never invoke it see no
difference.

---

## 6. Implementation Plan

### Phase 1: The prompt and the output contract

**Risk Level**: Low

**Files**: `shared/resources/security-review-prompt.md` (new), `skills/review-security/SKILL.md` (new)

**Changes**:
- [ ] Scaffold: `python3 skills/create-skill/scripts/init_skill.py review-security --path skills/`
- [ ] `description:` leads with the discriminator — establishes whether a control **engages**, by executing
      it — and says when to prefer it over the built-in
- [ ] Modes: `diff` (default, files changed since base) and `full` (the work item's security surface
      regardless of what changed)
- [ ] Method ordering referenced from `task.79`'s corpus doc, **not restated**
- [ ] Output contract: per-control verdict, `file:line`, and **the command that produced each verdict**
- [ ] **No PASS token in the schema.** Output is per-control verdicts, so a bare PASS is unrepresentable
      rather than merely discouraged
- [ ] `## Relationship to the built-in /security-review`

**Dependencies**: task.79, task.80

---

### Phase 2: Fixtures

**Risk Level**: Low

**Files**: `skills/review-security/tests/fixtures/**`

Both measured defects are **pure composers** — the flaw is in the options object and the URL string, not in
any network call — so neither fixture needs a socket or a new dependency.

**Changes**:
- [ ] `fixtures/redis-tls/engaged.mjs` — `buildRedisOptions(url, env)`; on `rediss:` sets
      `tls: { rejectUnauthorized: true, servername: host }`
- [ ] `fixtures/redis-tls/inert.mjs` — sets `tls: {}` only when `env.REDIS_TLS === 'true'`. The control is
      *present*: a grep for `tls` finds it, a reviewer reads it and believes it, and nothing sets that variable
- [ ] `fixtures/db-url/engaged.mjs` — percent-encodes **every** component; sets `sslmode` via `URLSearchParams`
- [ ] `fixtures/db-url/inert.mjs` — concatenates a caller-supplied `params` string, so
      `params='?sslmode=disable'` wins over an appended `?sslmode=require`, and a host containing `/`
      silently loses the port
- [ ] A `probe.mjs` spec per fixture, drawing hostile **and** legitimate cases from `corpusFor('url-authority')`

**Dependencies**: Phase 1

---

### Phase 3: Falsifiability — the criterion this task exists to satisfy

**Risk Level**: Medium

**Files**: `skills/review-security/tests/review-security.test.js` (new), `package.json`

A skill shipped without this proof is precisely the vacuous instrument it is meant to replace.

**Changes**:
- [ ] The test imports `security-probe.mjs` and runs both variants of both fixtures, asserting
      `engaged → engages` and `inert → present-but-inert`. **The verdict comes from the engine, so the
      assertion is deterministic red/green in CI with no agent in the loop**
- [ ] **Grep-decoy assertion**: each `inert` variant *contains* the literal tokens a grep reviewer would
      accept — `tls`, `rejectUnauthorized`, `sslmode=require`. Without it someone tidies the fixture into an
      `absent` case that any grep catches, and the suite stays green while proving nothing
- [ ] Zero-case vacuity: `cases: []` → `unverifiable`, never `engages`
- [ ] The `## Relationship to the built-in` section is present
- [ ] `package.json` — add `'skills/review-security/tests/*.test.js'` to the `test` glob. **Registered is
      not running**: confirm in the gate log that the suite executed
- [ ] **Mutation proofs**: revert the `present-but-inert` branch in `security-probe.mjs` → the inert fixture
      test reds; delete the grep-decoy tokens from a fixture → that assertion reds; restore both

**Dependencies**: Phase 2

---

### Phase 4: Registration and docs sweep

**Risk Level**: Low

**Files**: `skills/create-skill/scripts/generate_catalog.py`, `docs/reference/*`, `CHANGELOG.md`

**Changes**:
- [ ] Add `review-security` to `CATEGORIES` → Quality Assurance; run `npm run generate-catalog`
- [ ] Add it to the hand-written `**Review:**` line in `docs/reference/skill-catalog.md`
- [ ] `docs/reference/commands.md`, `docs/reference/activation-phrases.md`, and a standalone row in
      `docs/reference/pipeline-artifacts.md` — the treatment `review-pr` gets, since this is not a pipeline step
- [ ] `npm run bundle`; `python3 skills/create-skill/scripts/quick_validate.py skills/review-security`
- [ ] `CHANGELOG.md` `[Unreleased]`

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Create

1. `skills/review-security/SKILL.md`
2. `shared/resources/security-review-prompt.md`
3. `skills/review-security/tests/review-security.test.js`
4. `skills/review-security/tests/fixtures/redis-tls/{engaged,inert,probe}.mjs`
5. `skills/review-security/tests/fixtures/db-url/{engaged,inert,probe}.mjs`

### Files to Modify

6. `package.json` — test glob
7. `skills/create-skill/scripts/generate_catalog.py` — `CATEGORIES`
8. `docs/reference/{skill-catalog,commands,activation-phrases,pipeline-artifacts}.md`
9. `CHANGELOG.md`

### Files Regenerated

10. `skills/review-security/references/*` — `npm run bundle` output

---

## 8. Testing Strategy

### Contract Tests

- [ ] `engaged → engages`, `inert → present-but-inert`, both fixtures
- [ ] Grep-decoy tokens present in each inert variant
- [ ] `cases: []` → `unverifiable`
- [ ] The built-in-relationship section exists
- [ ] The prompt references `task.79`'s corpus and does not restate it

**Command**: `node --test 'skills/review-security/tests/*.test.js'`

### Mutation Proving

- [ ] Revert the `present-but-inert` branch → the inert fixtures red
- [ ] Delete the grep-decoy tokens → that assertion reds
- [ ] Make zero cases return `engages` → the vacuity test reds
- [ ] Remove the new glob from `package.json` → **the suite stops running**; confirm from the gate log, not
      by reading the glob

Procedure: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md).

---

## 9. Success Criteria

### Functional

- [ ] Given the inert Redis fixture, reports **`present-but-inert`**, citing the dependency condition that
      makes it so
- [ ] Given the inert DB-URL fixture, reports **high**, with a hostile input demonstrating the parse
- [ ] Given the engaged variants, reports no findings — **and states what it probed**
- [ ] Emits a gate-consumable block carrying `evidence:` and `probes_executed`
- [ ] `full` mode reviews the surface regardless of what changed

### Regression

- [ ] No existing gate, schema or pipeline step changes
- [ ] `npm run ci` green, with the new suite confirmed to have **run**

### Safety

- [ ] The skill cannot emit a bare PASS — no PASS token exists in the schema
- [ ] Zero executed probes renders `unverifiable`, never a pass
- [ ] A verdict resting on reading rather than execution is marked `reasoned`, never `measured`

---

## 10. Risk Assessment

### High Risk Areas

**1. The skill ships and is itself vacuous — reporting `engages` having executed nothing**

- **Risk**: this is not hypothetical. It is what the QA NFR security axis does today, and this skill would
  become a second, more confident copy of the same vacuum.
- **Probability**: Medium without structure. **Impact**: Major — a security instrument that reports success
  is worse than none.
- **Mitigation**, all structural rather than prose:
  1. **The agent cannot write the verdict.** Its deliverable is a probe *spec*; `security-probe.mjs`
     executes it and computes the outcome. An agent that ran nothing cannot manufacture cases.
  2. **`evidence: measured` requires `probes_executed > 0`**, enforced by a schema test in CI — the upgrade
     over `task.73`, moving the rule from prose a model may decline to follow into code that fails the build.
  3. **No PASS token exists**, so a bare pass is unrepresentable.
  4. **The grep-decoy fixture** is a case only a probing implementation gets right.

### Medium Risk Areas

**1. Name ambiguity routes the user to the built-in**

- **Mitigation**: discriminator-first `description:`, plus the relationship section and its contract test.

**2. The spec points at a helper that engages while the real call site does not**

- **Risk**: not fully closable in v1.
- **Mitigation**: the report cites `file:line` of the **call site**, the engine records the module path it
  actually resolved, and a citation naming no file in scope downgrades to `unverifiable`. The residual
  belongs in the skill's own "what this does not tell you" section — precedent: `task.76`.

---

## 11. Rollback Plan

### Immediate Rollback (< 30 minutes)

**Triggers**: the skill reports `engages` on a known-inert fixture, or `unverifiable` on everything real.

**Steps**: remove the glob from `package.json` and delete `skills/review-security/`. Nothing else depends on
it — v1 is advisory and wires into no gate.

**Verification**: `npm run ci` green with the skill absent.

### Forward Fix (< 4 hours)

Narrow v1 to `diff` mode over the two fixture shapes (URL/authority composition and options-object
configuration), and widen once real runs show the verdicts hold.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description                                                                    | Author      |
| ---------- | ------- | ------------------------------------------------------------------------------ | ----------- |
| 2026-09-02 | 1.0     | Initial draft — filed from the rebirth-wallet security-review handover           | create-task |

---

## Progress Tracking

### Phase 1: Prompt and contract
- [ ] Skill scaffolded; discriminator-first description
- [ ] `diff` / `full` modes
- [ ] No PASS token; per-control verdicts
- [ ] Relationship-to-built-in section

### Phase 2: Fixtures
- [ ] redis-tls engaged + inert
- [ ] db-url engaged + inert
- [ ] Probe specs drawing both directions from the corpus

### Phase 3: Falsifiability
- [ ] Engine-computed verdicts asserted
- [ ] Grep-decoy assertion
- [ ] Zero-case vacuity test
- [ ] Glob registered **and confirmed running**
- [ ] Mutation proofs

### Phase 4: Registration
- [ ] CATEGORIES + catalog
- [ ] Docs sweep
- [ ] Bundle + validate

---

## References

- **The method being widened**: `shared/resources/finalise-dod-security-prompt.md` (task.73)
- **Why `boundary: false` misses both defects**: same file, `:37-50`
- **The grep that passes Defect A**: same file, infrastructure checks — *"TLS configured: grep … for `tls`"*
- **Defect A verified**: `ioredis@5.11.1` `built/connectors/SentinelConnector/index.js:88` and `:187`
- **Corpus**: `task.79` · **Engine**: `task.80` · **Gate wiring**: `task.82`
- **Skill-that-reviews-without-owning-a-gate precedent**: `skills/review-pr/SKILL.md`

---

## Notes

### Why `present-but-inert` is high and `absent` is not

An absent control is a gap someone will notice. An inert one has already been read, reviewed, and believed
— by the author, by a code reviewer, and by a grep-based check that cited it as evidence. It carries the
credibility of a control while providing none of the protection.

### What this skill does not tell you

It establishes that a named entry point behaves correctly on the inputs the corpus supplies. It does not
establish that the entry point is the one the application actually calls, nor that the corpus is complete.
Both limits belong in the skill's own limits section — `task.76` is the precedent for shipping one beside
an instrument.
