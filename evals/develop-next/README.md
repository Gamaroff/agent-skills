# evals/develop-next — Roadmap Orchestrator Eval Suite

Four-layer coverage for the `develop-next` skill. The heart of the suite is Layer 1: item selection is deterministic code (`skills/develop-next/scripts/select-next.mjs`), so the highest-stakes decision of an unattended loop — _which item to build next_ — is unit-tested, not model-judged.

## Layers

| Layer        | Where             | Driver             | What it pins                                                                                                                                                                                                  |
| ------------ | ----------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — unit     | `unit/`           | none (node --test) | Every selection rule in `references/roadmap-selection.md`, one fixture per rule, both sides of each boundary (blocked ↔ unblocked). Sabotage-verified.                                                        |
| 2 — fixture  | `step-isolation/` | replay (CI) / live | Dry-run read-only-ness, human-gated stop, merge→tick recovery + cleanup. Replay gates the assertion harness; a live driver makes them behavioral.                                                             |
| 3 — protocol | `protocol/`       | none (node --test) | SKILL.md structural invariants: script-driven selection, read-only dry-run, run-state crash safety, story PR merges straight to the base branch, head-SHA merge gate, config keys, no consumer-project facts. |
| 4 — smoke    | `smoke/`          | live only          | One real orchestrated run: select → dispatch (`develop-task` Skill event) → tick → state cleanup.                                                                                                             |

## Running

```bash
npm run eval:develop-next          # layers 1 + 3 + step-isolation (hermetic, CI)
npm run eval:develop-next:smoke    # layer 4 (needs ANTHROPIC_API_KEY)
```

Layers 1 and 3 also run as part of `npm test`.

## Sabotage-verify

Confirmed catches (break → red → revert → green):

- weakening the phase-boundary rule (`blocker.phase <= phase.index` → `<`) fails `05: same-phase deadlock…`
- disabling the human-gate stop fails `01: manual row at the phase frontier…`

Follow the same workflow (see `evals/shared/README.md`) when touching the selector.
