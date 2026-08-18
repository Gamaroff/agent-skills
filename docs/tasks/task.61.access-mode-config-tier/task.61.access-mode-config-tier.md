---
id: task.61
title: '[Task 61] Let the JavaScript gates read a config-declared access mode, with read-config.sh parity'
type: task
description: 'The access gates in JavaScript — jira-sync.js, the two stage CLIs, jira-epic-creator.js — resolve `access.tracker` from environment variables only. A restriction an operator commits to skills-config.yaml is therefore invisible to every bare `node …` invocation the sync and sprint skills document, and resolves to `full`. Task 53 attempted this inline and produced a high-severity divergence from read-config.sh in every review round it survived: fail-open on an unparseable file, then a throw that took down the read-only CLI modes, then three YAML shapes the subset parser silently drops. The lesson is that this is a parity problem, not a feature: the config tier must answer exactly what read-config.sh answers, for every input, or it must not exist. That parity is this task''s subject.'
tags: [restricted-access, config, parser, fail-closed, security, parity]
category: infrastructure
status: planned
priority: High
risk_level: high
created: 2026-08-19
updated: 2026-08-19
estimated_effort_hours: 12
---

# [Task 61] Let the JavaScript gates read a config-declared access mode, with read-config.sh parity

**Task File**: [task.61.access-mode-config-tier.md](./task.61.access-mode-config-tier.md)

---

## 1. Overview

Split out of [task.53](../task.53.jira-rest-interception/task.53.jira-rest-interception.md) at its
QA loop limit, by explicit decision. Task 53 delivers the Jira REST interception; this task delivers
the one thing that turned out to be a separate problem underneath it — teaching the **JavaScript**
gates to read an access mode declared in `skills-config.yaml`, and proving that what they read
agrees with `read-config.sh` on every input.

Depends on [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md)
(the resolver and the five modes), [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md)
(the record), [task.53](../task.53.jira-rest-interception/task.53.jira-rest-interception.md) (the
gates that would consume it), and [task.60](../task.60.config-reader-strict-subset/task.60.config-reader-strict-subset.md)
(which gave tier 2 a documented strict subset — the specification this task must match).

---

## 2. Motivation

`resolve-platform.sh` resolves `ACCESS_TRACKER` from three tiers: the `access.tracker` key in
`skills-config.yaml`, the `AGENT_SKILLS_ACCESS_TRACKER` environment variable, and — where a caller
sets it — `ACCESS_TRACKER` itself, most-restrictive-wins. Every **shell** entry point sources it and
gets all three.

The **JavaScript** gates do not. `dm.resolveAccessTracker` reads the two environment names, and
nothing reads the config key. So an operator who does the documented thing —

```yaml
# skills-config.yaml
access:
  tracker: manual
```

— and then runs one of the documented bare invocations —

```bash
node .agents/skills/sync-jira-story/scripts/sync-jira-story.js docs/stories/.../story.md
bash .agents/skills/jira-sprint-manager/scripts/manage-sprint-state.sh 42 closed
node .agents/skills/jira-epic-creator/scripts/jira-create-epic.js --file epic.md
```

— gets a real Jira write, with the gate resolving to `full`. The restriction is committed, visible in
the repo, and inert.

**This gap pre-dates task 53.** Task 52 shipped `resolveAccessTracker` reading `ACCESS_TRACKER`
alone, and `jira-stage.js` captured only that name. Task 53 widened the environment half and stopped
there deliberately, after four QA cycles established that the config half is a different problem.

### Why it earns its own task

Task 53 built the config tier inline across QA cycles 2–5. Every round found a high-severity
divergence from `read-config.sh`, and each fix was correct and revealed the next one:

| Round | What the inline attempt got wrong |
| ----- | --------------------------------- |
| Cycle 3 | Swallowed every read failure as "absent", which resolves to `full`. `access: {tracker: manual}` — a flow mapping — parsed to a *string*, so `.tracker` was undefined and a declared restriction granted everything it withheld |
| Cycle 4 | Fixed that by **throwing**, which took down the deliberately read-only CLI modes (`--check`, `--print-plan`, `--probe-board`) and destroyed the deferral record along with the write |
| Cycle 5 | Fixed *that*, and three shapes `parseYamlSubset` silently drops still resolved to `full`: a duplicate `access:` block, an `access:` after a top-level block scalar, and a merge key under `access:` |

Three rounds, three correct fixes, three new divergences. That is the signature of a **duplicated
contract**, not of a bug — and it is why the requirement is stated here as parity rather than as a
feature.

---

## 3. Technical Background

### The two readers today

- **`shared/resources/read-config.sh`** — two tiers. Tier 1 is `python3` + `pyyaml`, a real parser.
  Tier 2 is an `awk` scanner over a **documented strict subset** (task.60), which **refuses**
  anything outside it rather than reading it as absent. Tier 2 is the default tier on a stock macOS
  host, where `/usr/bin/python3` ships without `pyyaml`.
- **`shared/resources/yaml-subset.js`** — a 151-line pure parser used by `gh-stage.js` and
  `scaffold-tracker-workflow.js` for the tracker-workflow file. It is **not** a `read-config.sh`
  equivalent: it silently drops what it cannot parse, which is the correct behaviour for its own
  callers and the wrong behaviour for an access control.

The gap between "silently drops" and "refuses" is the whole task.

### What `resolve-platform.sh` already decides, and must keep deciding

- `SKILLS_CONFIG_FILE` may redirect the config path, but a redirect that lands on nothing, or on a
  non-regular file such as `/dev/null`, is **refused** — changing *which* file is read must never be
  a way to widen access (`resolve-platform.sh:186`).
- A value equal to the literal default basename is classified `origin=default` and is not a redirect.
- A mapping-valued `access.tracker` (`access: → tracker: → mode: manual`, an ordinary nesting typo)
  is refused on both tiers.
- An unrecognised mode is refused, never defaulted.
- Most-restrictive-wins across config and env, ordering `manual < command < approve < read-only < full`.

### Where the answer has to arrive

`dm.resolveAccessTracker` in `shared/resources/defer-mutation.js` is the single JS resolver as of
task 53. Its consumers: `makeHttp`'s lazy `accessFor` in `jira-sync.js`, `jira-stage.js:432`,
`gh-stage.js:844`, and `accessTracker()` in `jira-create-epic.js`. `jira-sprint-lib.sh` resolves in
bash and would need a seam.

---

## 4. Scope

**In scope**

- A config tier for `dm.resolveAccessTracker` that agrees with `read-config.sh` on every input in a
  shared fixture corpus, including the refusal cases.
- Path resolution matching `read-config.sh` exactly: `SKILLS_CONFIG_FILE` honoured with its
  regular-file and default-basename rules; the repo/worktree root anchored the way the callers
  already compute it, not `process.cwd()` by accident.
- Threading the resolved answer through **every** JS gate, including both stage CLIs' pre-`loadDotEnv`
  snapshots (a `.env` must not be able to redirect the config path around the snapshot).
- A seam for `jira-sprint-lib.sh` so the shell gate gets the same answer without a fourth copy of the
  mode table.
- A **shared fixture corpus** exercised by both readers, so parity is asserted rather than asserted-in-prose.

**Out of scope**

- The interception itself (task 53, delivered).
- `access.vcs` — still `full`-only by `resolve-platform.sh`'s own rejection.
- Changing `read-config.sh`'s subset. This task matches it; task.60 defines it.

---

## 5. Breaking Changes

None for a repo that declares no `access:` key — the overwhelmingly common case, and the one the
whole existing suite exercises.

**Breaking, deliberately, for a repo that declares one:** invocations that today perform a Jira write
will begin refusing and recording it. That is the point of the feature, and it is the reason this
task is `risk_level: high` despite its size.

---

## 6. Implementation Plan

1. **Build the parity corpus first.** One directory of `skills-config.yaml` fixtures — block form,
   flow form, duplicate `access:` blocks, merge key, anchor, quoted key, space-before-colon, mapping
   valued mode, unrecognised mode, absent key, absent file, BOM, tabs, a block scalar preceding
   `access:` — each with the answer `read-config.sh` gives. Drive `read-config.sh` over it and record
   the answers as the expected values, so the corpus is derived rather than hand-asserted.
2. **Decide the shape for "present but unreadable" once**, and apply it to the value as well as the
   shape. Task 53's cycles showed both alternatives failing: silent-absent is fail-open, and throwing
   breaks read-only callers. The likely answer is *resolve to the most restrictive mode and emit one
   stderr line naming the file and the reason* — but decide it against the corpus, not in the
   abstract.
3. **Implement the tier** against the corpus until parity holds for every fixture.
4. **Thread it** through `makeHttp`, both stage CLIs (snapshot the config path alongside the mode) and
   `jira-create-epic.js`.
5. **Give `jira-sprint-lib.sh` a seam** — most likely a small resolver CLI it calls once per run,
   resolved into caller scope rather than inside `$(...)`.
6. Docs: `configuration.md`, `platform-detection.md`, `troubleshooting.md`.

---

## 7. Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/defer-mutation.js` | the config tier and its path resolution |
| `shared/resources/jira-sync.js` | thread the resolved mode and the captured config path |
| `shared/resources/jira-stage.js`, `gh-stage.js` | snapshot the config path alongside the mode |
| `skills/jira-epic-creator/scripts/jira-create-epic.js` | consume the tier |
| `shared/resources/jira-sprint-lib.sh` | the shell seam |
| `shared/resources/tests/access-config-parity.test.mjs` | **new** — the corpus, driven through both readers |
| `docs/reference/configuration.md`, `troubleshooting.md` | what a config-declared restriction does |

---

## 8. Testing Strategy

The corpus **is** the test: every fixture is resolved by `read-config.sh` and by the JS tier, and the
two answers must be equal. A fixture whose answers differ is a failure regardless of which one looks
more sensible — that is what parity means, and it is exactly the assertion task 53's inline attempt
never had.

Beyond parity: no gate that cannot answer may proceed as `full`; a read-only CLI mode must survive an
unreadable config; a `.env` must not be able to redirect the config path; and the deferral record must
still be written when a write is refused for a config-declared reason.

**Mutation-prove**: drop the refusal for each refusal-class fixture in turn → parity red · redirect
the path from a `.env` → the snapshot test red · make an unreadable config throw → the read-only CLI
test red.

---

## 9. Success Criteria

- [ ] Every fixture in the corpus resolves identically through `read-config.sh` and the JS tier
- [ ] A config-declared restriction gates every documented bare invocation of the sync, sprint and
      epic-creator scripts
- [ ] No path where a gate that cannot answer proceeds as `full`
- [ ] A read-only CLI mode (`--check`, `--print-plan`, `--probe-board`, `--probe-workflow`) survives an
      unreadable config
- [ ] A `.env` cannot redirect the config path around the pre-`loadDotEnv` snapshot
- [ ] A refused write still produces a record, and one stderr line names the file and the reason
- [ ] `jira-sprint-lib.sh` gets the same answer without a fourth copy of the mode table
- [ ] The seven findings carried over from task 53 (below) are each closed or explicitly dismissed
- [ ] `npm test`, `validate:all` green; `npm run bundle` committed

### Findings carried over from task 53's gate 2

Recorded in `docs/tasks/task.53.jira-rest-interception/task.53.gate.2.jira-rest-interception.yml`.
They are the known divergences, and they double as a starting checklist:

| id | Summary |
| -- | ------- |
| C5-CR1 | The stage CLIs were never threaded with the captured config path |
| C5-CR2 | Three YAML shapes `parseYamlSubset` drops still resolve to `full` |
| C5-CR3 | The most-restrictive answer is emitted silently — no line names the file |
| C5-CR4 | The degraded no-writer tiers answer `full` on an unusable redirect |
| C5-CR5 | A typo in the config tier throws where the env tier's refusal is wanted |
| C5-CR6 | The tier is anchored to `process.cwd()`, not the root the callers compute |
| C5-CR7 | `jsm_defer`'s last-resort access value should not be `full` |

---

## 10. Risk Assessment

**High** — this decides whether a declared restriction is honoured, on the path four QA cycles
already found five ways to get wrong.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **Another silent divergence** | The failure mode of the last four cycles, every time | The corpus makes divergence a red test rather than a review finding. Build it before the implementation |
| **Breaking a read-only path** | Cycle 4's mistake: a fail-closed answer in the wrong shape took down `--check` and friends | A named success criterion, and a test per read-only mode |
| **A false restriction** | Resolving `manual` for an ordinary config would defer every write and look like a broken tool | Only shapes that genuinely name `access` may restrict; a config with no `access:` key must resolve `full`, asserted per fixture |
| **Drift after landing** | Two readers, one contract, forever | The corpus is derived from `read-config.sh` at run time, so its answers move when that file moves |

---

## 11. Rollback Plan

`git revert <sha>` then `npm run bundle`. The tier is additive: with it removed the gates resolve from
the environment exactly as they do today, which is the state task 53 landed in. No consumer that
declares no `access:` key is affected either way.

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-08-19 | 1.0 | Split out of task.53 at its QA loop limit, by explicit decision. Carries the seven open findings from that task's gate 2 | develop-task |
