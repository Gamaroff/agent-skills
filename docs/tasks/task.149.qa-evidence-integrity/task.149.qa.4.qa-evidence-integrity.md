# QA Report: Task 149 - QA evidence integrity (cycle 4)

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Gate File**: [task.149.gate.4.qa-evidence-integrity.yml](./task.149.gate.4.qa-evidence-integrity.yml)
**Previous**: [task.149.qa.3.qa-evidence-integrity.md](./task.149.qa.3.qa-evidence-integrity.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| TASK-149-BUG-5 (MEDIUM) — absent gate/report/row read clean | **FIXED** → Closed | 12 block-test cases; 2 mutations red |
| CR3-1 (low) — symlinked link target | **FIXED** | doc-links test; mutation red |
| CR3-4 (low) — relative TMPDIR | **FIXED** | QA-25; mutation red |
| CR3-5 (low) — SRC contains the sandbox | **PARTIAL** | QA-26 green and its mutant red — but SRC `/` slips the prefix test (CR4-4) |

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — the read-back input has no writer in the block → TASK-149-BUG-6.
- **[medium]** `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — pass 1 stages untracked targets outside the work item → TASK-149-BUG-7.
- **[low]** `shared/resources/qa-execute-snippets.mjs` — root SRC passes the containment prefix → CR4-4.

---

## Review Methodology

Cycle 4 re-review. **Re-review scope: since 2026-09-26T05:35:00Z (default).** Gate 3's security axis
was `PASS measured`, so no carve-out applied. The scope covered 18 files and a 2464-line patch, with
generated `references/` copies excluded. The reviewer was one read-only Explore subagent, dispatched
05:45 and returned 05:47. QA re-ran both probes and the `TMPDIR=/tmp` variance run.

Why CR-1/CR-2 enter now after staying low in cycle 2: the code-review standard's rule E names the
remedy (a `{placeholder}` that substitutes the read). The cycle-2 answer was to document a convention
instead, and a second independent reviewer has now rated that medium. QA agrees the block has no
writer for its only input as delivered.

---

## NFR Assessment

### Security — PASS
- **Status**: PASS · **Evidence**: measured · **Probes executed**: 37 (run record `task.149.qa.4.security.run.json` `totals.executed`)
- Containment engages 23/23; coherence engages 14/14; nothing written outside; `TMPDIR=/tmp` → 209 pass.

### Reliability — CONCERNS
BUG-6, BUG-7. · **Performance** — PASS · **Maintainability** — PASS (advisory notes in the gate)

---

## Code Review

`code_review_blocking` = true. CR-4 is bug + high confidence and enters automatically as a low. QA
verified CR-1, CR-2 and CR-3 (medium confidence) by reading the blocks. CR-5 is a cleanup, advisory.

- [medium/medium] `skills/qa-story/SKILL.md:1822`, `skills/qa-task/SKILL.md:1241` — unbound block input → **BUG-6**
- [medium/medium] `skills/qa-task/SKILL.md:1271` (+ qa-story:1852) — staging outside the work item → **BUG-7**
- [low/high] `shared/resources/qa-execute-snippets.mjs:1704` — `//` prefix for a root SRC → CR4-4
- cleanup `skills/qa-story/SKILL.md:1827` — unprefixed globs; task-shaped qa-story fixture → future

**Mutation proofs (tests guarding cycle-3 fixes)**: absolute sandbox root → QA-25 → covered; SRC
containment → QA-26 → covered; `.` message → QA-24 → covered; symlinked link target → CR3-1 test →
covered; no-report halt / `no-log` → block test → covered. `[ -n "$THIS_GATE" ]` → no-red-dead
(unreachable once `qa-cycle.sh` yields a cycle).

---

## Test Artifacts

```bash
npm run ci:fast        # at ba0c3b4d, .agents/skills moved aside: 4239 tests, 4238 pass, 0 fail, 1 skipped
TMPDIR=/tmp node --test shared/resources/tests/qa-execute-snippets.test.mjs shared/resources/tests/doc-links.test.mjs tests/qa-read-back-block.test.js   # 209 pass
node shared/resources/security-probe.mjs … --record task.149.qa.4.security.run.json   # engages 23/23, 14/14
```

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL on BUG-6, BUG-7
