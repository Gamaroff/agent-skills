---
id: task.53.sprint-review-summary
title: 'Sprint Review Summary: Task 53 — Jira REST interception'
type: sprint-review-summary
task-ref: task.53.jira-rest-interception.md
status: complete
created: 2026-08-19
updated: 2026-08-19
---

# Sprint Review Summary: Task 53

**Task:** [Intercept Jira REST mutations in two layers — a fail-closed net and a legible one](./task.53.jira-rest-interception.md)
**PR:** [#250](https://github.com/Gamaroff/agent-skills/pull/250) · **Issue:** [#231](https://github.com/Gamaroff/agent-skills/issues/231)
**Accepted:** 2026-08-19 · **Gate:** PASS 95/100 · **QA cycles:** 6

---

## Summary

Tasks 51 and 52 built the vocabulary for restricted tracker access — five modes, a resolver, and a
deferred-mutation record with four renderings. Neither changed what actually happens. **This is the
task where a non-`full` access mode starts refusing things.**

Two layers, inside `shared/resources/jira-sync.js`, the library behind all three `sync-jira-*` skills
and every pipeline transition:

- **Layer 1 is a net.** At the top of the `http()` factory, above the retry loop, any non-GET under a
  non-`full` mode is refused, recorded, and answered with a synthetic `202`. A mutation nobody
  thought about is loud rather than silently executed. It sits above the loop deliberately: recording
  inside it would turn one 429-retried mutation into three things a human is told to go and do.
- **Layer 2 makes the refusals legible.** The semantic mutators annotate their calls with a kind, a
  target, an intent and a desired value — which is what makes `manual` mode say *"Team = Platform"*
  instead of printing `PUT /rest/api/3/issue/PROJ-1 {…}`. An ADF description is **named**, never
  dumped: a checklist item nobody can read is as useless as none.

The one read wearing a POST — Jira's JQL search — is allowlisted **by URL**. Refusing it would make
every sync skill see "no existing issue" and create a duplicate on the next run.

## What ships

| | |
| --- | --- |
| **New roster kind** | `jira.unknown-mutation`, the 21st — what layer 1 writes when nothing annotated the call. Consequence `irreversible`, so it renders as a confirm gate: nothing knows what the call would have done |
| **Kinds covered** | 5 new (`issue.create`, `issue.update`, `backlog.add`, `sprint.move-issues`, `sprint.set-state`) joining `jira.transition` — **6 of the 9** Jira kinds. The other three have no call site to intercept |
| **Outside the library** | `jsm_curl` in `jira-sprint-lib.sh` and `jira-create-epic.js`, each with its own gate and the exception stated rather than implied |
| **Contract** | `reason: "deferred"` and the record id in `--json`. A deferred create returns the `--dry-run` null shape and **never** a placeholder key — one would break the idempotent `synced-from-*` label search and duplicate the issue next run |

## Testing

`shared/resources/tests/jira-interception.test.mjs` — 48 hermetic tests, no network, no credentials.
Every non-GET assertion runs against a stub that **throws on any write**, so "no mutation reached the
network" is proven rather than read off the code.

- Suite **1400 / 1400** (baseline 1352) · `validate:all` 115/115 · `tracker-access.test.sh` 382/382
- **26 mutation proofs** — every invariant watched failing before being kept

## What QA found, and why it took six rounds

Round one gated **FAIL**. The net held — nothing reached the network — but three high-severity paths
one layer up reported a refused mutation as a **success**, and two wrote that false success into a
document: the transition chain read the synthetic `202` as a completed transition, the write-back
guard keyed on a record id rather than the deferral, and both sprint scripts printed a success line
for a refusal. All fixed and mutation-proven.

Rounds two to five were **all in access-mode resolution**, not in the interception — work added
during QA to close a gap that pre-dated the task. It produced a high-severity finding in every round
it survived, because it re-implemented `read-config.sh`'s semantics in a second language. At the
5-cycle loop limit the pipeline escalated rather than continuing, and the scope decision was to lift
it into **[task.61](../task.61.access-mode-config-tier/task.61.access-mode-config-tier.md)** with
parity as its explicit subject.

The final round, against the narrowed change, found **no high-severity issues**.

## Impact

- **For a consumer on `full`** (the default): nothing changes. Byte-identical, pinned by test.
- **For a consumer on a restricted mode**: every Jira REST write through the shared library, the
  sprint scripts and the epic creator is now refused and recorded, with a checklist a person can act
  on. The resolver says so on every run, and names both remaining gaps honestly.

## Known limitations

- **GitHub issue and PR writes are not gated** — task.54 onwards.
- **Jira writes issued as raw `curl` from skill prose** (`create-issue`, `review-task`) and through
  the Atlassian MCP tools are not gated. Named explicitly in the resolver's notice.
- **A config-declared restriction needs a shell that sourced the resolver.** The JavaScript gates
  read `ACCESS_TRACKER` and `AGENT_SKILLS_ACCESS_TRACKER` only — task.61.

## Follow-ups

| Task | Subject |
| ---- | ------- |
| [task.61](../task.61.access-mode-config-tier/task.61.access-mode-config-tier.md) | The config tier, with `read-config.sh` parity. Carries gate 2's seven findings |
| [task.54](../task.54.github-board-interception/task.54.github-board-interception.md) | GitHub board interception — next in the 51–57 sequence |
| [task.55](../task.55.tracker-comment-cli/task.55.tracker-comment-cli.md) | `jira.comment.add`, which has no code path to intercept today |
