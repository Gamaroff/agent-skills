# QA Report 2: Task 61 — Let the JavaScript gates read a config-declared access mode

**Task**: [task.61.access-mode-config-tier.md](./task.61.access-mode-config-tier.md)
**Gate File**: [task.61.gate.2.access-mode-config-tier.yml](./task.61.gate.2.access-mode-config-tier.yml)
**Supersedes**: [task.61.gate.1](./task.61.gate.1.access-mode-config-tier.yml) (FAIL, 40/100)
**Review Date**: 2026-08-19
**PR**: [#252](https://github.com/Gamaroff/agent-skills/pull/252)
**Gate Status**: **PASS** — 92/100

---

## Executive Summary

Three cycles. Cycle 1 failed the change with four high-severity escalation paths. Cycle 2 found that
one of the cycle-1 fixes had *regressed* the thing it fixed, plus six live write paths the first
sweep missed. Cycle 3 verified every fix class and found only false-restriction residuals, which are
now closed too.

**PASS.** No path remains by which a run writes at `full` over a committed restriction in any
documented invocation. Every fix is mutation-proven.

The number worth reporting is not 92/100 but this: **the corpus, which is the artifact this task
exists to build, did not catch a single one of the four cycle-1 escalations.** It was green
throughout. The reason was structural — it ran the shell reader with `{PATH, HOME}` and the JS
reader with the full `process.env`, so the two sides were never compared under the same conditions
and no environment-driven divergence could appear. Fixing that first is what turned the remaining
findings into red tests rather than review prose, and it is the finding I would carry forward from
this task.

---

## Cycle-by-cycle

### Cycle 1 — FAIL (40/100) — 4 HIGH, 5 MEDIUM, 5 LOW

| id | Finding | Closed by |
| -- | ------- | --------- |
| T61-H1 | `probeResolver` spread the live `process.env` into the child; the stage CLIs call `loadDotEnv()` **before** resolving, so a repo-local `.env` could set `BASH_ENV`, which `bash -c` sources — a forged `full` **and** arbitrary code execution | Allowlist, snapshotted at require time |
| T61-H2 | The `/access/i` fast-path was an authorisation decision and unsound — PyYAML resolves `"\x61ccess"` to `access` | `mayDeclareAccess`, fails toward spawning |
| T61-H3 | `jira-create-epic.js` consulted the config only when both env names were empty | Folded into the reduction |
| T61-H4 | The shell seam inherited the caller's cwd | Anchored to the git top level |
| T61-M5 | **The parity suite compared the two readers under different environments** | Both sides import one allowlist |

`T61-L2` is recorded as a **false positive**: the memo-key separators were already NUL, so the
reported collision was not real — the reviewer read a NUL as a space in the diff rendering. Changed
to `JSON.stringify` for legibility and labelled as such, not counted as a fix.

### Cycle 2 — a regression I caused, and a HIGH I missed

- **H4 REGRESSED.** The cycle-1 anchor computed `$resolver` from a *relative* `BASH_SOURCE` and then
  `cd`'d away from it, so `source` failed and `|| cfg_mode="manual"` fired on every call. A repo
  declaring **nothing** deferred every sprint write — a false restriction, and worse than the bug it
  replaced. The seam tests could not see it because they passed an absolute path.
- **New HIGH.** The M3 sweep fixed `jira-stage.js` and missed **six** `makeHttp` call sites across
  the three sync scripts plus `scaffold-tracker-workflow.js` — precisely the bare invocations §2
  names as the gap.
- Plus: the refusal reason was written and never printed; `mayDeclareAccess`'s comment strip made the
  JS answer `full` on a malformed config whose only mention was commented out; the allowlist was read
  after `loadDotEnv` rather than snapshotted.

### Cycle 3 — verification: all six fix classes confirmed

The independent reviewer's verdict was *merge it*, with residuals only in the **false-restriction**
direction. All folded in:

- **CDPATH** (medium) — `cd` consults CDPATH and prints the directory on a match; inside `$(...)`
  that lands in the resolver path. An operator with CDPATH exported plus a bare-relative source path
  got `manual` on every write. Now `CDPATH= cd -P --`.
- **Silent `manual`** (medium) — reachable when `mktemp` fails or the subshell dies before printing,
  so the emit added in cycle 2 did not deliver its legibility. Fallback reason added.
- `set -e` fatality on a failing substitution; empty `BASH_SOURCE` anchoring to cwd; the
  explicit-key form missing from `configMayRestrict`; the makeHttp guard's fixed window and
  hard-coded file list; a stale comment.

---

## Testing

| Check | Result |
| ----- | ------ |
| `npm test` | **1431 / 1431**, exit 0 |
| Parity corpus | 34 fixtures × 2 reader tiers, expectations derived from `read-config.sh` at run time |
| Mutation testing | **11 mutations**, each turning the suite red |
| `validate:all` | 115 skills |
| `prettier --check .` | clean repo-wide |
| CI gates simulated | bundle freshness, catalog, skill validation — all pass |
| Bundled copies | 18/18 carry the resolvers and the fixes |

**End-to-end**: with `access.tracker: manual` in config and **no** env var, a POST through the
*bundled* `sync-jira-task` copy of `makeHttp` was refused (202 deferred), the injected network
`fetchImpl` was never called, and a record was written with `access: manual`.

**Performance**: a repo with no `access` mention resolves in ~1 ms and spawns nothing; one that
mentions the word pays a single ~500 ms subprocess per process, memoised. Deliberate — under-matching
the word is an escalation, over-matching it is only slow.

---

## Success Criteria — final

| # | Criterion | Status |
| - | --------- | ------ |
| 1 | Every fixture resolves identically through both readers | PASS — 68 cells |
| 2 | A restriction gates every documented bare invocation | PASS — e2e proven, 18/18 bundled |
| 3 | No path where a gate that cannot answer proceeds as `full` | PASS — 4 such paths found and closed |
| 4 | A read-only CLI mode survives an unreadable config | PASS — never throws, mutation-proven |
| 5 | A `.env` cannot redirect the config path around the snapshot | PASS — allowlist + require-time freeze |
| 6 | A refused write produces a record and one stderr line | PASS — both paths, including the silent ones |
| 7 | `jira-sprint-lib.sh` same answer, no fourth mode table | PASS — 7 seam tests |
| 8 | The seven carried findings each closed or dismissed | PASS — all 7 |
| 9 | `npm test`, `validate:all` green; bundle committed | PASS |

---

## NFR

**Security PASS** · **Performance PASS** · **Reliability PASS** · **Maintainability CONCERNS**

The one accepted residual: the "may this file declare access" question is asked in two places, because
`configMayRestrict` runs on the degraded path where `defer-mutation.js` is unavailable *by
definition* and so cannot import from it. Both now mirror the shell's grammar including the
explicit-key form, and the divergence is commented at both sites. Unifying them is a follow-up.

---

## Final Assessment

**Gate**: **PASS** · **Quality Score**: 92/100 · **Deployment**: APPROVED

**Rationale**: the design decision — delegate to one reader rather than write a second — is right,
and it is why `C5-CR2`'s three YAML shapes dissolved rather than needing three more fixes. What
needed three cycles was the boundary around that decision, and each cycle closed a real class:
escalation (1), regression and incomplete sweep (2), false restriction (3).

**What I would carry forward**: two of my three cycle-1 fixes were incomplete in the same way — I
verified the shape I had in mind (an absolute path, one call site) rather than the shape operators
actually use. Both now have tests in the operator's shape. The same pattern appeared twice more in
my own *tests*: the CDPATH test used `../refs` when CDPATH is only consulted for bare relative names,
and the makeHttp guard's regex terminated inside `(typeof fetch ...)`. A test that cannot fail is
worth exactly nothing, and mutation testing is what surfaced all three.
