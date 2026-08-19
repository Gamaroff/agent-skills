# Sprint Review Summary — Task 61

**Task:** [Task 61] Let the JavaScript gates read a config-declared access mode, with read-config.sh parity
**PR:** [#252](https://github.com/Gamaroff/agent-skills/pull/252) · **Issue:** [#251](https://github.com/Gamaroff/agent-skills/issues/251)
**Accepted:** 2026-08-19 · **Gate:** PASS 92/100 · **QA cycles:** 3

---

## What shipped

`access.tracker` in `skills-config.yaml` was invisible to every bare `node …` invocation the sync,
sprint and epic-creator skills document. An operator who committed `access: {tracker: manual}` and
ran the documented command got a real Jira write, with the gate resolving to `full`. The restriction
was committed, visible in the repo, and inert — for exactly the person who had declared it.

It is now read by all four JavaScript gates and by `jira-sprint-lib.sh`.

## The decision worth reviewing

**There is still only one reader.** `dm.resolveAccessTracker` does not parse YAML — it sources
`resolve-platform.sh` in a subprocess and uses the answer verbatim, so agreement with
`read-config.sh` is *structural* rather than asserted.

Task 53 tried the other way, a second reader in JavaScript, and every review round it survived found
a high-severity divergence. Three correct fixes, three new divergences — the signature of a
duplicated contract. This deletes the duplicate, and three of the seven carried findings dissolved
as a consequence rather than needing individual fixes.

## Verification

- **Parity corpus**: 34 fixtures × 2 reader tiers, expectations **derived from `read-config.sh` at
  run time**, so they move when it moves. Includes `merge-key`, the one input where the two shell
  tiers disagree with each other — delegation is right on both because it asks whichever tier the
  host has.
- **Mutation testing**: 11 mutations, each turning the suite red.
- **1431 tests**, `validate:all` 115 skills, prettier clean, bundle current, CI green on the final head.

## What QA found

Three cycles, 24 findings. The ones worth naming:

1. **Arbitrary code execution + forged `full`** — `probeResolver` spread the live `process.env` into
   the child, and the stage CLIs call `loadDotEnv()` *before* resolving, so a repo-local `.env` could
   set `BASH_ENV`, which `bash -c` sources.
2. **A fix of mine that regressed** — the shell seam's repo-root anchor computed a *relative*
   resolver path and then `cd`'d away from it, so a repo declaring nothing would have deferred every
   sprint write.
3. **The corpus was green through all four cycle-1 escalations** — it ran the two readers under
   different environments, so no environment-driven divergence could appear in the one artifact built
   to see divergence.

## Impact

**Breaking only for a repo that declares `access:`** — its bare `node …` invocations begin deferring
writes instead of performing them. That is the feature. A repo that declares no restriction answers
`full` and cannot be falsely restricted.

## Follow-ups (non-blocking)

- One exported access-may-be-declared predicate; the degraded path currently needs an inlineable copy.
- Anchor the sync scripts to the repo of `--file` rather than of `process.cwd()`.
- An end-to-end committed test driving a config-declared restriction through a sync script to a record.
