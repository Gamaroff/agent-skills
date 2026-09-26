# QA Report: Task 149 - QA evidence integrity (cycle 2)

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Gate File**: [task.149.gate.2.qa-evidence-integrity.yml](./task.149.gate.2.qa-evidence-integrity.yml)
**Previous**: [task.149.qa.1.qa-evidence-integrity.md](./task.149.qa.1.qa-evidence-integrity.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Gate Status**: FAIL

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| TASK-149-BUG-1 (HIGH) — symlink escape on the path to DEST | **PARTIAL** — path fixed, merge not | Ancestor, final-component and dangling links now refused (QA-22/23; probe cases green); merging into an existing DEST still writes through a seeded link → **Reopened** |
| TASK-149-BUG-2 (MEDIUM) — read-back never acts on its result | **FIXED** → Closed | Block halts itself; `tests/qa-read-back-block.test.js` 20/20 under bash + zsh; follow-on gaps filed as BUG-3 |
| CR-2 (low) — ignored target reads untracked | **FIXED** | `ignored` state + test, mutation-proved |
| CR-4 (low) — unguarded inputs | **FIXED** (guard) | Unset-input test goes red without it; see CR-6 below for the binding question |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs` — merge into an existing DEST follows a seeded symlink (BUG-1 reopened).
- **[medium]** `skills/qa-task/SKILL.md` / `skills/qa-story/SKILL.md` — empty doc-links output reads clean under zsh; the `untracked` exemption excuses a residue nobody staged (TASK-149-BUG-3).
- **[medium]** `shared/resources/doc-links.js` — case-mismatched and outside-repository links read `untracked` (TASK-149-BUG-4).
- **[low]** CR-6 — the block's input has no writer in the block; **[low]** CR-7 — §5 shares the reader it checks; **[low]** QA-2-M1 — bug-report staging not held by a test.

---

## Review Methodology

Cycle 2: **full branch diff, reviewed to refute** (exactly one prior gate). The reviewer was one read-only
Explore subagent with the REFUTE directive appended, dispatched 05:01 and returned 05:06. The diff was
`origin/develop...HEAD`, 3171 lines, with the regenerated `skills/*/references/` copies excluded.
No SAFETY RE-PROBE directive: the prior gate's security axis read `FAIL measured`, so clause 1 did not
fire. The reviewer re-read the whole branch regardless. All four medium/high reviewer claims were then
**executed** before they entered the gate. CR-1 was inferred from Node's source, and it reproduced on
disk and through the probe engine.

Re-review scope: unscoped (cycle 2 refute pass)

---

## Implementation Verification

Unchanged from cycle 1 except Phase 1 (containment still permeable) and Phase 4 (read-back decision gaps).

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| `--copy-as` passes what `--copy` fails; escaping DEST exit 2, no leak | FAIL | Merge-through-link escape (BUG-1) |
| Unexported predicate decline | PASS | |
| doc-links `untracked` / `missing` (+ `ignored`) | CONCERNS | Case mismatch and outside-repo misfiled (BUG-4) |
| `--check-updated` | PASS | Probe engages 14/14 |
| Prose sites | PASS | 13/13 |

---

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 32 (run record `task.149.qa.2.security.run.json` `totals.executed`)
- `--copy-as` DEST containment: **present-but-inert, 16/18**. Every lexical case, every link on the path to DEST (ancestor, deep, `./`-prefixed, dangling, final component), and `out/../real` (legitimate) behave correctly. Two cases were reproduced: `merge-into-dot-through-seeded-link` and `merge-into-seeded-dir-through-link`, both writing outside the sandbox.
- `change-log --check-updated`: **engages, 14/14**.

### Reliability — CONCERNS
BUG-3, BUG-4.

### Performance — PASS · Maintainability — PASS

---

## Code Review

Refute pass; `code_review_blocking` = true. Findings with bug + high confidence enter the gate
automatically: CR-2, CR-3, CR-4 and CR-6. QA verified CR-1 (medium confidence) and CR-5 (medium) and
promoted them. CR-7 (low confidence) is recorded as a low entry.

**Correctness bugs (7):**
- [high/medium] `shared/resources/qa-execute-snippets.mjs:1668` — merge into an existing DEST follows seeded links → **BUG-1 reopened** (reproduced)
- [medium/high] `skills/qa-task/SKILL.md:1263` — empty output reads clean under zsh → **BUG-3**
- [medium/high] `shared/resources/doc-links.js:218` — platform-variance: case-insensitive `existsSync` → **BUG-4**
- [medium/high] `shared/resources/doc-links.js:220` — check-ignore 128 read as untracked → **BUG-4**
- [medium/medium] `skills/qa-task/SKILL.md:1270` — untracked residue exempted but never staged → **BUG-3**
- [low/high] `skills/qa-task/SKILL.md:1240` — `${TASK_DIR:?}` has no writer in the block → gate CR-6
- [low/medium] `tests/work-item-artifact-naming.test.js:275` — §5 shares the reader → gate CR-7

**Boundary rule**: `boundary: true` (unchanged: containment + coherence). `probes_executed: 32`.

**Mutation proofs (Step 3c — tests guarding cycle-1 fixes):**
- mutation-proven: `refuseSymlinkedPath` call removed → QA-22, QA-23 → covered
- mutation-proven: `ignored` branch → the CR-2 doc-links test → covered
- mutation-proven: jq precedence reintroduced → `qa-read-back-block` clean/missing/ignored → covered
- mutation-proven: missing-link halt removed → `qa-read-back-block` missing/ignored → covered
- mutation-proven: `:?` guard removed → `qa-read-back-block` unset-input → covered
- mutation-proven: bug-report staging removed → nothing red → no-red-untested (QA-2-M1)

**Platform variance**: `TMPDIR=/tmp node --test shared/resources/tests/qa-execute-snippets.test.mjs tests/qa-read-back-block.test.js shared/resources/tests/doc-links.test.mjs` → 172 pass, 0 fail. CR-3's case-sensitivity variance is real and filed (BUG-4).

---

## Test Artifacts

```bash
npm run ci:fast        # at fix commit 09ea9818, .agents/skills moved aside: 4202 tests, 4201 pass, 0 fail, 1 skipped
npm run bundle -- --check                    # 0 problems
npm run validate -- skills/qa-task/ skills/qa-story/   # ✓ (standards-named)
TMPDIR=/tmp node --test <3 suites above>     # 172 pass
node shared/resources/security-probe.mjs --entry cli:shared/resources/qa-execute-snippets.mjs … --record task.149.qa.2.security.run.json   # present-but-inert 16/18
node shared/resources/security-probe.mjs --entry cli:shared/resources/change-log.js … --record task.149.qa.2.security.run.json         # engages 14/14
```

Step 4b: unchanged from cycle 1 (pre-existing `zero-blocks-executed` on both QA skills; the read-back
blocks are `mutating` and are exercised by `tests/qa-read-back-block.test.js` instead).

---

## Final Assessment

**Gate Status**: FAIL · **Quality Score**: 60/100 · **Deployment**: BLOCKED

Two HIGH findings in two cycles on one mechanism (DEST containment in `qa-execute-snippets.mjs`). The
gate recommends **replacing** it: seed fresh paths only. A third correction to the check-then-copy
design would be the patch the third-strike rule exists to stop.
