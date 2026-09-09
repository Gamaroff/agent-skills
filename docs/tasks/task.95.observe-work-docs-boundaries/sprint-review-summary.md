# Sprint Review Summary — Task 95

**Task:** observe-work — config schema, skill boundaries and the meta-skill family
**Status:** ✅ Accepted · **Date:** 2026-09-09 · **PR:** [#360](https://github.com/Gamaroff/agent-skills/pull/360) · **Issue:** [#341](https://github.com/Gamaroff/agent-skills/issues/341)

## Summary

Four overlapping meta-skills — `observe-work`, `autoskill`, `remember-insight` and `double-check` — were, until now, a coin toss at invocation time. This task makes them legible as a set, and gives `observe-work`'s config key a documented schema.

## Success criteria met

9/9. The seven functional criteria are enforced by executable assertions rather than by inspection, so they stay met rather than merely being met today.

## Key deliverables

1. **`observations.workspace` documented** — Full schema block, Key reference row, and a `## Observation workspace` prose section covering the config → env → default resolver order, the ephemeral-anchor refusal, why the workspace is never derived from the cwd, and the scope rule for user-scope skills.
2. **`OBS_STALE_DAYS` documented** (default 14) as the environment variable it actually is, in a new `### observe-work` subsection.
3. **Two keys deliberately NOT documented** — `observations.enabled` and `observations.review_interval_days` have no reader anywhere in the tree. A documented key with no reader ships a knob that silently does nothing, and a test now fails if one is added.
4. **Reciprocal boundary notes** in `autoskill`, `remember-insight` and `double-check`, body-only — no `description:` moved, which the empty catalog diff proves.
5. **A seeded family registry template** — `skills/observe-work/assets/skill-families.template.md`, with `observe-work`'s Session Start protocol pointing at it, conditioned on an *empty* registry rather than a missing one.
6. **README count corrected** 115 → 126 (it had drifted by eleven before this work began) and one CHANGELOG entry covering tasks 93–95 as a single capability.

## Testing

10 tests added, **all mutation-proven** — the behaviour each names was reverted and the test confirmed red:

| Area | Count | What it holds |
|---|---|---|
| Family template | 4 | ships, is pointed at, parses into the engine's real shape, and `families --audit` returns **zero gaps** |
| Resolver contract | 4 | config beats env; env used when config absent; an ephemeral anchor returns **non-zero**; every documented key has a reader |
| `OBS_STALE_DAYS` | 2 | the applied default is 14 and not 7, asserted by driving the hook |

Repo suite: 2902 tests, 0 failures. CI green on the accepted head.

## Quality trail

Review 1 (4 Critical, 5 Important — all actioned before development) → 2 QA cycles (CONCERNS 90 → **PASS 100**) → `/review-pr` **APPROVE** → DoD verified.

## What this task should be remembered for

Three moments where a check caught something a green result was hiding:

- **A test was vacuous when first written.** `resolveIn()` collapsed "the resolver refused" and "it returned empty" into one signal, so the refusal test passed against a warn-and-continue mutant. Only the mutation pass exposed it.
- **A mutation went red for the wrong reason.** A cycle-2 mutation mangled a shell variable rather than changing its value. It was redone precisely — a red test is not self-validating.
- **CI caught what six local gates did not.** Both family tests used `os.tmpdir()`, which is `/var/folders/…` on macOS and `/tmp` on Linux — and the engine refuses an ephemeral workspace. Green locally through three runs, a QA cycle, an independent re-verification and a PR review; red in CI. The QA report that had examined that construct and blessed it was corrected in place rather than rewritten, so the record of the false pass survives.

## Known limitations

Two non-blocking items carried on gate 2, neither a DoD gap:

- The documented path formula is silent about linked git worktrees, where the resolver anchors to the **main** worktree. The rule is stated elsewhere in the same document; it matters here because `/develop-batch` runs every parallel story in a worktree.
- The precedence order is now stated in three places; only the consumer-facing copy is bound to executable assertions.

## Impact

A reader picking between four meta-skills now has one rule instead of four descriptions, and the rule is the same sentence in all four — enforced by an audit, not by discipline.
