# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.3.session-handoff-skill.yml](./task.110.gate.3.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15 (cycle 3)
**Testing Completed**: 2026-09-15
**Gate Status**: CONCERNS

---

## Executive Summary

The mechanism replacement holds. Against a third, independently written enumeration (flag *values*, positional verbs, tokenizer edges, the async runner's failure modes) and all 73 corpus cases, the allow-list accepted nothing that mutates or executes from outside the repo — except one: joined `name=value` flag values are not path-checked, so `npx prettier --config=../evil.js` (a JS config executes) reaches outside the cwd while `-c ../evil.js` is refused. That is a gap in a stated invariant, not a new class; MEDIUM. No HIGH for the first time; the third-strike rule does not fire. Bugs 4 and 5 verified closed.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (PRB-6)

---

## Re-Review Context

**Re-review scope: unscoped (prior gate failed on security)** — full `origin/develop...HEAD` diff (5,060 lines). Reviewer subagent dispatched with the SAFETY RE-PROBE directive; **killed at 12 minutes (budget 10)** — the pass was performed inline; independence lost on this cycle and recorded in the gate.

| Cycle-2 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 `ls-remote --upload-pack` | FIXED | not in the ls-remote spec → refused (test) |
| CR-2 `remote -v add` | FIXED | remote rule reads the whole argv (test) |
| CR-3 `npm run <any> --check` | FIXED | `bundle -- --check` exact argv only (test) |
| CR-4 `branch -v newname` | FIXED | `requirePositionalWhen` — mutation-proved by QA (`covered`) |
| CR-5 option prefixes | FIXED | unknown ⇒ refused; property test |
| PRB-2 `gh api --hostname` | FIXED | not in `GH_API_FLAGS` — gh api gate mutation-proved by QA (`covered`) |
| PRB-3 `--write=.` | FIXED | npx specs have no write flags; joined name refused |
| CR-6 npx writers | FIXED | per-tool specs; `tsc` requires `--noEmit` |
| CR-7 interrupt orphan | FIXED | SIGINT test; mutation-proved in cycle 2 |
| CR-8 `lint:fix` | FIXED | exact script names |
| CR-9 `date <positional>` | FIXED | `+format` only |
| CR-10..14 | FIXED | tests / spec scoping |
| bug.4 / bug.5 | CLOSED | above |

---

## New Findings This Cycle

Searched unscoped (prior gate: security FAIL): re-enumerated the boundary's inputs a third time — values of allow-listed flags (`--config=`, `--rawfile`, `-f`, `--reporters=`, `--format=`), positionals that are verbs for their binary (`git remote get-url origin extra`, `gh api …/dispatches`, `test`, `find`), tokenizer edges (quoted/unbalanced/empty tokens, `--`), `npm test` passthrough, `npx --no-install` stacking, the async runner (ENOENT, `activeChild`, output growth, signal + pending JSON) — 170 spellings + 73 corpus cases; 0 corpus hostile accepted.

- **[medium]** `handoff-verify.mjs` `checkArgs` — `name=value` values unchecked: `npx prettier --config=../evil.js`, `--config=/abs/x`, `--ignore-path=../x` pass; `-c ../evil.js` is refused → PRB-6
- **[low]** async runner accumulates output without bound → PRB-7
- **[low]** `git ls-remote <any-url>` is a network read to an arbitrary host; `npm run eval:` (empty suffix) admitted by prefix → PRB-8
- Confirmed **not** defects (in-repo-trusted or GET-only): `node x.js --require ./y` (script args), `npm test -- -r ./x` (relative, in-repo), `--reporters=evil` (node_modules), `gh api repos/x/y/dispatches` (GET → 404), `git lo"g"` (quote removal is correct shell semantics)
- Runner: missing binary resolves to `could not run: spawn … ENOENT`; `activeChild` is null between figures; a signal mid-run has no pending JSON to strand

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: contract → SKILL.md | PASS | Verified | allow-list model documented; validator ✓ |
| Phase 2: read mode | CONCERNS | Verified | PRB-6 |
| Phase 3: write mode + wiring | PASS | Verified | live handoff 17 confirmed · 0 stale · 2 timeouts (the third `unverifiable` was a test-literal bundle miss, fixed in cycle 2) |

## Success Criteria Verification

All six criteria PASS; Code Quality → whitelist read-only (§10): **CONCERNS** (PRB-6).

## Breaking Changes Validation

None. PASS.

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2. No bug report files (MEDIUM is a one-line invariant fix; documented here and in the gate).

## NFR Assessment

- **Performance — PASS**
- **Reliability — PASS** — ENOENT, activeChild, SIGINT/timeout group kill all verified
- **Security — CONCERNS** · Evidence: measured · Probes executed: 243 (QA) — reviewer subagent killed at 12 minutes, no reviewer probes this cycle
- **Maintainability — PASS**

## Code Review

Reviewer subagent: **killed at 12 minutes (budget 10) — pass performed inline; independence lost.** Inline findings: PRB-6/7/8 above. Mutation proofs (QA, from a `cp` snapshot): `requirePositionalWhen` removed → `mutating shapes` red → **covered**; `gh api` flag gate removed → `mutating shapes` + property test red → **covered**. Cycle 2's three dev-time proofs — **dev-only** as far as this report re-ran them.

Boundary probe: `boundary: true`, `probes_executed: 243`. Platform variance: `TMPDIR=/tmp` → 27/27. Step 4b: unchanged (`no-executable-blocks`, obs #90).

## Regression Testing

Skill suite 27/27; fast gate on `f87ef207` 3297/3298; bundle check 128/0.

## Recommendations

**Immediate (blocking for PASS)**: PRB-6 — validate `name=value` values as positionals; add joined forms to the refused list.
**Short-term**: PRB-7, PRB-8.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 (100 − 10 × 1 MEDIUM − 10 × security CONCERNS)
**Deployment Recommendation**: CONDITIONAL — PRB-6 closed.

**Next Steps**: `/qa-fix` on gate 3 (one open MEDIUM), then cycle 4 re-review (narrowed).
