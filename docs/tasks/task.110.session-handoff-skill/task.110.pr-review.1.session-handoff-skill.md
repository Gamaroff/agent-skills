# PR Review Report: PR #408 — feat(task.110): session-handoff skill — the handoff re-measures itself on read

**Reviewed:** 2026-09-15
**PR:** [#408](https://github.com/Gamaroff/agent-skills/pull/408) — `feature/task.110.session-handoff-skill` → `develop` (OPEN)
**Work item:** [`task.110.session-handoff-skill.md`](./task.110.session-handoff-skill.md) — resolved via `branch-stem`
**Tracker:** [#407](https://github.com/Gamaroff/agent-skills/issues/407) — OPEN (task, priority:medium, milestone "Technical Tasks (standalone)")
**Verdict:** 🚨 REQUEST CHANGES

Scope of the diff reviewed: `origin/develop...origin/feature/task.110.session-handoff-skill` less `*/references/*`, `docs/reference/skill-catalog.md` and `shared/resources/skill-dependencies.json` (generated). Effort: medium. Two read-only Explore lenses, dispatched in parallel: code (8m03s) and conformance (1m22s).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.110.implementation.1.session-handoff-skill-initial-run.md` (header and Completion block stale — PC-1) |
| Review report | ✅ | `task.110.review.1.session-handoff-skill.md` — READY TO IMPLEMENT 8/10 |
| QA reports | 13 | `task.110.qa.1..13.session-handoff-skill.md` |
| Gate | PASS | `task.110.gate.13.session-handoff-skill.yml` (100) — cycle-13 entry reads `Proceeding to 5c` |
| DoD | ❌ | not yet written — correct for `status: ready-for-review` |
| Sprint review | ❌ | not yet written — correct before `/finalise` |
| Open bugs | 0 | bugs 1–18 all `Closed` |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion (§9) | Evidence in diff | Status |
|---|---|---|
| 1. One verdict per figure; the annotated 2026-09-10 fixture reads `stale` on the frontier line and the change-log.js claim | `handoff-verify.mjs` `verify()`/`compareFigure()`; `tests/handoff-verify.test.js` "regression: the 2026-09-10 handoff reads stale…"; fixture `tests/fixtures/handoff-2026-09-10.txt` | ✅ met |
| 2. `--json` follows the repo's `reason` / exit-code contract | `run()`, header contract; tests "cli: --json emits one object…", "cli: missing file → reason=missing…" | ✅ met |
| 3. Write mode emits the fixed section order; traps section is a pointer | `assets/handoff.template.md`; test "template: fixed section order…" | ✅ met |
| 4. Tests run under `npm test` and in CI | `package.json` glob `'skills/session-handoff/tests/*.test.js'` | ✅ met |
| 5. `quick_validate.py` passes; catalog and deps regenerate to no diff | `generate_catalog.py` (Skill Tooling); catalog + deps regenerated | ✅ met |
| 6. AGENTS.md names the read mode | `AGENTS.md` pointer names `handoff-verify.mjs` | ✅ met |

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — task.110.implementation.1.session-handoff-skill-initial-run.md (header Status, Pipeline Progress row 5–6, Completion block)
  The implementation report contradicts itself: its `### QA Cycle 13` entry reads `Proceeding to 5c` and 13 gates exist, yet the header, the 5–6 progress row and the Completion block still describe an escalated run halted at gate 7 with 8 QA iterations, and the working-tree copy is uncommitted.
  → Update the Status line, the 5–6 row and the Completion block (Final Status, QA Iterations) to match the cycle-13 entry, and commit the report with the 5c artifact.

[PC-2] consistency · medium · confidence: high — task.110.session-handoff-skill.md frontmatter (no `pr_number:`; no reference to #408)
  The task document carries no `pr_number:` and never references PR #408, so the `pr_number` resolution lane cannot map this PR to its work item and the document's own view of the PR is absent (sibling tasks 101/103 carry the field).
  → Add `pr_number: 408` and a Pull Request line beside the GitHub Issue line, with a Change Log row and an `updated:` bump.

[PC-3] consistency · low · confidence: high — CHANGELOG.md `[Unreleased] → Added`
  The entry describes the suite at PR creation (17 tests, three mutants) while the shipped suite is 31 tests hardened over 13 QA cycles with bugs 1–18 closed.
  → Refresh the CHANGELOG figures before merge.

[PC-4] scope · low · confidence: medium — docs/reference/activation-phrases.md, docs/reference/commands.md vs §7 Files Summary
  Two reference docs gained rows that §7 Files Summary does not list (consistent with the Wire phase's intent).
  → Add them to §7.
```

## Code Review Findings

```
[CR-1] bug · high · confidence: high — skills/session-handoff/scripts/handoff-verify.mjs:1002
  `npx tsc --noEmit false [file]` passes the whitelist (`--noEmit` satisfies requireFlag; `false` is a benign positional) but TypeScript's CLI consumes a following `true`/`false` as the boolean's value, so noEmit is switched OFF and tsc emits into the tree through read mode. Executed by 5c in the consumer-shaped project with typescript installed: `npx tsc --noEmit false zz.ts` wrote `zz.js`.
  → Refuse a `true`/`false` token after `--noEmit` (a `positionalPattern` on the tsc spec, or hold every tsc positional to a `.ts`/`.tsx`/directory shape); refused-list tests for both spellings.

[CR-2] bug · medium · confidence: medium — skills/session-handoff/scripts/handoff-verify.mjs:1067
  `npx mocha <any in-repo file>` is admitted as a POS.PATHS positional and mocha loads an explicitly named file whatever its name — the bug.11 class (`node --test <file>`) one runner over; the cycle-10 fix refused mocha's subcommands but kept file positionals.
  → Admit no positional under mocha (mocha's own `spec`/.mocharc discovers), mirroring the node `--test` rule; refused-list test.

[CR-3] bug · medium · confidence: medium — skills/session-handoff/scripts/handoff-verify.mjs:754
  The jq `env` refusal (bug.18) covers only the `jq` util arm; `gh api /user --jq env`, `-q env`, `--jq=env`, `gh pr list --jq env` are admitted and gh compiles `--jq` with gojq, which has `env` — the inherited environment echoed into `measured` by the mechanism bug.18 closed. (Not executed: the stripped env has no GH_TOKEN, so gh exits 4 before evaluating the filter; the in-process decisions are confirmed.)
  → Apply the jq `env`-word refusal to gh's `--jq`/`-q`/`--jq=` values via `valuePatterns` (and to the bare `-q`/`--jq` value flag); refused-list tests for the four spellings.

[CR-4] bug · low · confidence: medium — skills/session-handoff/scripts/handoff-verify.mjs:1644
  platform-variance: `process.kill(-pid)` throws on win32 and the catch swallows it, so on Windows a timed-out child is never killed.
  → On win32 fall back to `child.kill()` (or `taskkill /T /F`), and note the residual in the platform advisories.

[CR-5] cleanup · low · confidence: medium — skills/session-handoff/scripts/handoff-verify.mjs:1316
  `EXIT_1_IS_A_RESULT` lists grep and test only; `jq -e`, `git diff --quiet`, `git ls-remote --exit-code` are admitted and exit 1 as an answer.
  → Add them, or document that such lines need an `expect: exit N` figure.

[CR-6] cleanup · low · confidence: high — skills/session-handoff/scripts/handoff-verify.mjs:1702
  After `truncated` flips at the cap the child keeps running until exit or timeout although the verdict is fixed.
  → `killGroup(child.pid)` when the cap is first hit.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.110.session-handoff-skill/task.110.implementation.1.session-handoff-skill-initial-run.md"
    finding: "The implementation report's header Status, Pipeline Progress row 5–6 and Completion block still describe an escalated run halted at gate 7 with 8 iterations while its QA Cycle 13 entry reads Proceeding to 5c."
    suggested_action: "Update the Status line, the 5–6 row and the Completion block to match cycle 13 and commit the report."
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.110.session-handoff-skill/task.110.session-handoff-skill.md"
    finding: "The task document carries no pr_number: field and never references PR #408."
    suggested_action: "Add pr_number: 408 and a Pull Request line, with a Change Log row and an updated: bump."
  - id: PC-3
    category: consistency
    severity: low
    confidence: high
    ref: "CHANGELOG.md"
    finding: "The [Unreleased] entry describes the suite at PR creation (17 tests, three mutants) rather than the shipped 31 tests hardened over 13 QA cycles."
    suggested_action: "Refresh the CHANGELOG figures before merge."
  - id: PC-4
    category: scope
    severity: low
    confidence: medium
    ref: "docs/tasks/task.110.session-handoff-skill/task.110.session-handoff-skill.md"
    finding: "docs/reference/activation-phrases.md and docs/reference/commands.md changed but are not listed in §7 Files Summary."
    suggested_action: "Add the two reference docs to §7 Files Summary."
  - id: CR-1
    category: bug
    severity: high
    confidence: high
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:1002"
    finding: "npx tsc --noEmit false [file] passes the whitelist and TypeScript consumes the false as the flag's value, so tsc emits into the tree through read mode (executed: zz.js written in a consumer-shaped project)."
    suggested_action: "Refuse a true/false token after --noEmit via a positionalPattern on the tsc spec, or hold tsc positionals to a .ts/.tsx/directory shape; refused-list tests for both spellings."
  - id: CR-2
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:1067"
    finding: "npx mocha <any in-repo file> is admitted and mocha loads an explicitly named file whatever its name — the node --test <file> class one runner over."
    suggested_action: "Admit no positional under mocha, mirroring the node --test rule; refused-list test."
  - id: CR-3
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:754"
    finding: "gh --jq/-q values are not held to the jq env-word refusal, so gh api /user --jq env echoes the inherited environment through gojq."
    suggested_action: "Apply the env-word refusal to gh's --jq/-q values via valuePatterns; refused-list tests for the four spellings."
  - id: CR-4
    category: bug
    severity: low
    confidence: medium
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:1644"
    finding: "platform-variance: process.kill(-pid) throws on win32 and is swallowed, so a timed-out child is never killed on Windows."
    suggested_action: "On win32 fall back to child.kill() or taskkill /T /F; note the residual."
  - id: CR-5
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:1316"
    finding: "EXIT_1_IS_A_RESULT omits jq -e, git diff --quiet and git ls-remote --exit-code, whose exit 1 is an answer."
    suggested_action: "Add them or document the expect: exit N requirement."
  - id: CR-6
    category: cleanup
    severity: low
    confidence: high
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:1702"
    finding: "After the output cap is hit the child keeps running until exit or timeout although the verdict is fixed."
    suggested_action: "killGroup(child.pid) when the cap is first hit."
truncated_count: 0
```

## Recommended Actions

1. CR-1 — refuse `true`/`false` after `--noEmit` (executed write); CR-2 — no file positional under mocha; CR-3 — `env`-word refusal on gh `--jq` values.
2. PC-1, PC-2 — bring the implementation report header/Completion block and the task frontmatter (`pr_number: 408`) into line with the state of the run; PC-3/PC-4 — CHANGELOG figures and §7 file inventory.
3. CR-4..6 — as time allows.
