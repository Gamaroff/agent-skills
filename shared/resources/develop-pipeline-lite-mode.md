---
name: develop-pipeline-lite-mode
description: Lite-mode contract for the develop-story and develop-task pipeline orchestrators. Covers trigger conditions, PIPELINE_MODE=lite behavior, and the directive format passed to qa-story/qa-task. QA-side effect details (Adaptive Review Strategy override) stay in each qa skill's own section.
---

# Develop Pipeline — Lite Mode

## Trigger Conditions

`PIPELINE_MODE=lite` is activated by the orchestrator (`develop-story` or `develop-task`) when **all three** conditions are met after reading the document:

- `risk_level: low` or absent, **AND**
- Fewer than 3 Tasks defined in the story / fewer than 3 implementation phases in the task, **AND**
- Story or task touches a single module (single app or lib)

If **any** condition is not met, `PIPELINE_MODE=standard` (default — no change to behaviour).

## Pipeline Behaviour in Lite Mode

- Step 5 (qa-story / qa-task) uses **Direct Tools only** — skips parallel agents regardless of the Adaptive Review Strategy decision
- Step 5b (qa-fix) still runs if issues are found
- All other steps run unchanged

Log in the implementation report Pipeline Configuration table:

| Pipeline mode | lite |

## Directive Passed to the QA Skill

When invoking `/qa-story` or `/qa-task` in lite mode, the orchestrator **prefixes** the invocation with:

> "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This story/task is running in lite mode."

The QA skill recognises this directive and skips the parallel-agents branch of its Adaptive Review Strategy. QA-side effect details are documented in each skill's own **Lite Mode** section.

## Decisions Log Entry

When `PIPELINE_MODE=lite` is set, log it in the Decisions Log:

```
- Pipeline mode: lite — risk_level low/absent + <3 Tasks/phases + single module
```
