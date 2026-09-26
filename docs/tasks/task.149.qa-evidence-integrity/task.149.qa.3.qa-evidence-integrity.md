# QA Report: Task 149 - QA evidence integrity (cycle 3)

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Gate File**: [task.149.gate.3.qa-evidence-integrity.yml](./task.149.gate.3.qa-evidence-integrity.yml)
**Previous**: [task.149.qa.2.qa-evidence-integrity.md](./task.149.qa.2.qa-evidence-integrity.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| TASK-149-BUG-1 (HIGH, reopened) — merge through a seeded link | **FIXED** → Closed | Mechanism replaced (fresh-path seeding); probe engages 23/23 incl. both merge cases and three SRC-side cases; QA-24 |
| TASK-149-BUG-3 (MEDIUM) — read-back decision gaps | **FIXED** → Closed | Two-pass block; 40 block-test cases (bash + zsh); 3 mutations red |
| TASK-149-BUG-4 (MEDIUM) — linkState misfiling | **FIXED** → Closed | Exact-name + outside-repo + unverifiable; test + 2 mutations |
| CR-6 (low) — block input binding | **FIXED** (documented) | Guard + contract sentence beside it |
| CR-7 (low) — §5 shares its reader | **FIXED** | Independent witness; mutation of the shared reader turns it red |
| QA-2-M1 (low) — staging untested | **MOOT** | Explicit bug staging removed; pass-1 staging held by "linked file nobody staged" |

## New Findings This Cycle

- **[medium]** `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — read-back passes on an absent gate / report / Change Log row → TASK-149-BUG-5.
- **[low]** `shared/resources/doc-links.js` — dangling or outside-pointing final-component symlink reads `untracked` → CR3-1.
- **[low]** `shared/resources/qa-execute-snippets.mjs` — relative `TMPDIR` refuses every `--copy-as` (platform variance) → CR3-4.
- **[low]** `shared/resources/qa-execute-snippets.mjs` — SRC containing the temp root under another spelling (unreproduced) → CR3-5.

Searched **unscoped** (prior gate: security FAIL): the full `origin/develop...HEAD` diff, 40 files and
4047 lines. The reviewer and QA both re-enumerated the DEST and SRC inputs of `--copy-as` from scratch.
For DEST: lexical, path link, final-component link, dangling link, existing directory, `.`/`./`, and a
second pair into one DEST. For SRC: containing the temp root, missing, itself a symlink. The
`linkState` inputs were covered too: case, `../`, gitignored, symlinked.

---

## Review Methodology

Cycle 3, re-review. **Re-review scope: unscoped (prior gate failed on security)** — the safety carve-out
fired, so the reviewer read the whole branch with the SAFETY RE-PROBE directive (dispatched 05:25 →
returned 05:30). QA ran its own SRC-side enumeration through the probe engine in parallel.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| `--copy-as` passes what `--copy` fails; escaping DEST exit 2, no leak | PASS | Probe 23/23; relative TMPDIR edge (CR3-4) low |
| Unexported predicate decline | PASS | |
| doc-links link state | PASS (low CR3-1) | |
| `--check-updated` | PASS | 14/14 |
| Prose sites | PASS | 13/13 |
| Code quality (ci:fast, bundle --check, validate) | PASS | 4223/4224 pass (1 skipped) at `2dfb54ea` |

---

## NFR Assessment

### Security — PASS
- **Status**: PASS · **Evidence**: measured · **Probes executed**: 37 (run record `task.149.qa.3.security.run.json` `totals.executed`)
- `--copy-as` DEST containment: **engages, 23/23**. `change-log --check-updated`: **engages, 14/14**. Nothing is written outside the sandbox.
- CR3-5 is not reproduced, and a reproduction would copy all of `$TMPDIR`. It is recorded low; the guard costs one `realpath`.

### Reliability — CONCERNS
TASK-149-BUG-5.

### Performance — PASS · Maintainability — PASS

---

## Code Review

`code_review_blocking` = true. No reviewer finding was bug + high confidence except CR-4 (low), which
enters the gate automatically. QA verified CR-2 and CR-3 (medium) by reading both blocks, and they enter
as TASK-149-BUG-5. CR-1 (reasoned: `readdirSync` lists a dangling link) and CR-5 (unreproduced) enter as
lows. CR-6 is a cleanup, and advisory.

**Correctness bugs (5):**
- [medium/medium] `shared/resources/doc-links.js:231` — symlink at the final component reads untracked → CR3-1 (low: needs a symlinked, untracked link target)
- [medium/medium] `skills/qa-task/SKILL.md:1245` — absent gate / report accepted → **BUG-5**
- [medium/medium] `skills/qa-task/SKILL.md:1284` — `no-log` passes → **BUG-5**
- [low/high] `shared/resources/qa-execute-snippets.mjs:1660` — platform-variance: relative TMPDIR → CR3-4
- [low/low] `shared/resources/qa-execute-snippets.mjs:1688` — SRC spelling recursion → CR3-5

**Cleanups (1):** `shared/resources/qa-execute-snippets.mjs:1677` — duplicate lstat; `.` refused with the "escapes" message while the contract says "already exists" → future.

**Boundary rule**: `boundary: true`, `probes_executed: 37`.

**Mutation proofs (tests guarding cycle-2 fixes)**: merge allowed → QA-24 → covered; `existsSync` for
the exact check → BUG-4 test → covered (on a case-insensitive host); `outside-repo` branch removed →
covered; tolerated stage failure / tolerated empty output / no pass-1 staging → block test → covered;
shared reader narrowed → §5 witness → covered.

---

## Test Artifacts

```bash
npm run ci:fast   # at 2dfb54ea, .agents/skills moved aside: 4224 tests, 4223 pass, 0 fail, 1 skipped
node shared/resources/security-probe.mjs --entry cli:shared/resources/qa-execute-snippets.mjs … --record task.149.qa.3.security.run.json   # engages 23/23
node shared/resources/security-probe.mjs --entry cli:shared/resources/change-log.js … --record task.149.qa.3.security.run.json         # engages 14/14
npm run validate -- skills/qa-task/ skills/qa-story/   # ✓
```

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL on TASK-149-BUG-5
