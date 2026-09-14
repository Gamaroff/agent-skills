# test-it Eval Suite

Evaluates the `test-it` skill across feature inspection, matrix/checklist execution, testing stack documentation updates, and multi-faceted infrastructure analysis.

## Scenarios

- `01-happy`: Matrix/checklist mode execution. Asserts that checklist status checkboxes are updated, testing stack documentation (`docs/testing/testing-stack.md`) is synced, and existing test conventions are preserved.
- `02-gaps-and-infrastructure`: Feature/module instruction with multi-faceted infrastructure gap analysis. Asserts that testing stack docs capture container dependencies, mock daemons, multi-service runner commands, and actionable infrastructure improvement suggestions.

## Running

```bash
node evals/shared/runner.mjs evals/test-it/scenarios/01-happy
node evals/shared/runner.mjs evals/test-it/scenarios/02-gaps-and-infrastructure
```
