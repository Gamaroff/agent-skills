# How to test task.58 (restricted-access documentation)

## What it does

Adds the narrative layer for restricted tracker access: a concept page, a three-question decision guide, a runbook against this repo's GitHub board (`Todo` / `In Progress` / `Done`), registrations, wizard copy, and a drift guard. It does **not** implement `/tracker-reconcile` (task.57, still planned) and it does not restate the 51-57 reference pages.

## How to test

1. Read [docs/concepts/restricted-access.md](../../../docs/concepts/restricted-access.md). You should know in one page whether restricted access applies to you, and see the limits (partial enforcement, `approve` does not ask yet, VCS still `full`, two-run create, reconcile not shipped) at the same prominence as the capabilities.

2. Walk [docs/concepts/which-access.md](../../../docs/concepts/which-access.md). The three questions must separate all five modes (`full`, `read-only`, `approve`, `command`, `manual`).

3. Follow [docs/runbooks/restricted-access.md](../../../docs/runbooks/restricted-access.md):
   ```bash
   node shared/resources/gh-stage.js --stage work-started --print-plan
   node shared/resources/gh-stage.js --stage done --print-plan
   ```
   Targets must be `In Progress` and `Done` (this board's columns, from `tracker-workflow.yaml`).

4. Confirm `/tracker-reconcile` is listed in `docs/reference/commands.md` and `docs/reference/activation-phrases.md` as **not shipped**.

5. Confirm the wizard distinguishes Skip from restrict:
   ```bash
   grep -n "Skip" scripts/setup-consumer.sh
   ```

6. Drift guard (must be green):
   ```bash
   node --test tests/restricted-access-docs.test.js
   ```

7. Mutation (must go red, then revert): add `"sixth"` to `ACCESS_MODES` in `shared/resources/defer-mutation.js` and re-run step 6. The concept-doc assertion fails. Revert before committing.

8. Broader:
   ```bash
   npm test
   npm run validate:all
   npm run generate-catalog
   ```
