# Sprint Review Summary - Make /finalise changelog checks opt-in

**Story/Task ID:** task.241
**Completed Date:** 2026-10-28
**Completed By:** Lorien Gamaroff (via `/develop-task`)
**Pull Request:** [#773](https://github.com/Gamaroff/agent-skills/pull/773)

---

## Summary

`/finalise` now reads `CHANGELOG.md` only when a project opts in with `changelog.enforce: true` in `skills-config.yaml`. The default is off. Consumer repositories no longer get changelog warnings or halts for a convention they never adopted. This repository opts in, so its own behaviour is unchanged.

---

## What Was Delivered

### Success Criteria Met

- [x] With `enforce` unset, the shipped 6d block prints `6d: changelog checks not enabled` and never reads `CHANGELOG.md`.
- [x] With `enforce: true`, every existing 6d case passes unchanged.
- [x] The resolver gives the same answer under both reader tiers: a YAML true spelling is on, a false spelling is off, and anything else is off with a warning.
- [x] The docs DoD agent (agent 4) gates on `<CHANGELOG_ENFORCE>`, and it is the only agent that reads the changelog.
- [x] This repository resolves to `on`.
- [x] A resolver that cannot run makes `/finalise` HALT `changelog-unknown` instead of silently turning the check off.
- [x] Configuration reference, CHANGELOG, `releases.md` and the runbook are updated. Tests, bundle, validate and shellcheck all pass.

### Key Features Implemented

- **`shared/resources/changelog-enforce.sh`**: the single resolver. It answers `on`, `off` or `unknown`.
- **Gated call sites**: `/finalise` Step 3b (the docs agent dispatch) and Step 7 action 6d both read the one answer, and both HALT on anything other than `on` or `off`.
- **Scoped config guard**: the `read-config.sh` subset-scan guard is narrowed to `changelog.enforce`, so an unrelated `enforce:` key does not make the whole config unreadable.

---

## Technical Details

### Files Modified/Created

- `shared/resources/changelog-enforce.sh`: new resolver
- `shared/resources/read-config.sh`: strict nested read plus a scope-aware guard
- `shared/resources/finalise-dod-docs-prompt.md`: Step 2 gated on `<CHANGELOG_ENFORCE>`
- `skills/finalise/SKILL.md`: Step 3b resolve and guard, 6d gate, checklist
- `skills/finalise/assets/bug-dod-template.md`: the changelog item is copied from agent 4
- `shared/resources/tests/changelog-enforce.test.mjs`: new, covering both tiers
- `evals/shared/tests/finalise-publish-boundary.test.mjs`: 6d and 3b behaviour, and the enumeration of changelog mentions
- `skills-config.yaml`, `docs/reference/configuration.md`, `docs/contributing/releases.md`, `docs/runbooks/task-development.md`, `CHANGELOG.md`
- 97 regenerated bundled copies under `skills/*/references/`

### Architecture/Design Decisions

The setting is an explicit opt-in. The alternative, guessing whether a consumer's changelog "looks like" this repository's, was rejected. One resolver feeds both checks, so the two cannot disagree again (observation #118).

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** consumer repositories that relied on the 6d block must add `changelog: enforce: true`. The migration is recorded in `CHANGELOG.md`.

---

## Testing & Quality Assurance

### Test Coverage

- **Tests:** about 6,585 in the fast gate, with 0 failures. The resolver suite runs under the awk and python tiers. The 6d block runs under bash and zsh, both locally and on CI.
- **Mutation proofs:** every gate and fix was reverted and seen to turn tests red.
- **QA:** 3 cycles. The gates went CONCERNS 70, then CONCERNS 90, then PASS 96. 4 bugs were filed and closed.

### Code Review

- **Reviewers:** Step 5c `/review-pr` (single-maintainer host, so no required approver)
- **Approval Status:** CONCERNS, with no coverage finding. The 3 doc findings are fixed.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] The config value is only matched in a `case` statement and is never evaluated.
- [x] The setting fails closed when the resolver cannot run.
- [x] Probe run: 31 candidates over the resolver and the Step 3b guard, 0 reproduced, 0 escapes.

### Compliance Review

Not applicable. This is internal developer tooling and handles no personal, payment or health data.

---

## Documentation

- [x] `docs/reference/configuration.md`: schema block and key row for `changelog.enforce`
- [x] `docs/contributing/releases.md` and `docs/runbooks/task-development.md`
- [x] `CHANGELOG.md` `[Unreleased]` entry citing (task 241)

---

## Demo Notes

### How to Verify

1. In a repository with no `changelog:` key, run the 6d block. It prints `6d: changelog checks not enabled`.
2. Add `changelog:` / `enforce: true`. `bash .agents/skills/finalise/references/changelog-enforce.sh` prints `on`, and 6d HALTs on an uncited task.
3. Remove `read-config.sh` beside the resolver. The resolver prints `unknown`, and `/finalise` HALTs `changelog-unknown`.

---

## Known Limitations / Future Work

- CR3-1: tighten one `.*?` allow-list span in the enumeration test.
- CR3-2: name `changelog-unknown` in the 6d heading, the checklist and the runbook.
- A block-scalar `enforce: |` value reads as on under PyYAML and off under awk. This is documented and pinned by tests.
