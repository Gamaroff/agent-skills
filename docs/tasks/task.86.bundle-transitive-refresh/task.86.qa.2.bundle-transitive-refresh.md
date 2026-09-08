# QA Report (Cycle 2 — Refute Pass): Task 86

**Task**: [task.86.bundle-transitive-refresh.md](./task.86.bundle-transitive-refresh.md)
**Gate File**: [task.86.gate.2.bundle-transitive-refresh.yml](./task.86.gate.2.bundle-transitive-refresh.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 is a refute pass: the target is cycle 1's own fixes, which are the least-reviewed code in the
change set. All five cycle-1 findings are confirmed fixed **by execution**, and nine independent
probes hold.

The pass found what it was looking for. **The cycle-1 fix for TASK86-004 has a hole of its own**:
`_looks_bundled()` treats any occurrence of the marker *phrase* in the first 40 lines as provenance,
so a hand-authored document that merely quotes the banner is classified as bundler output and
**silently overwritten** — the exact destruction that fix was written to prevent, in the single most
plausible case, since a document *about* the bundler is precisely the kind of file that quotes it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Review Methodology

Direct tools plus an independent Explore agent dispatched as a refute pass. **Re-review scope:
unscoped** — cycle 2 is always a whole-branch review by protocol, because narrowing to "files changed
since the last gate" would read only cycle 1's repairs and never re-read the original change with what
cycle 1 taught.

> **The independent refute agent returned late, after this report was first drafted, and found more
> than the in-line pass did.** An earlier draft of this section stated it had not returned. That was
> wrong and is corrected here rather than silently overwritten: the agent ran for ~9.5 minutes and
> produced the two HIGH findings below, both of which the in-line pass had missed. Its findings are
> incorporated in full.

**Step 4b: not applicable** — no `SKILL.md` and no `shared/resources/*.md` in the change set.

---

## Re-Review Context — status of every cycle-1 finding

Each was re-verified by running it, not by reading the diff.

| ID | Status | Evidence |
| --- | --- | --- |
| TASK86-001 `--check` argv parse | **FIXED** | `--all --check` and `--check --all` both check (exit 0); `--all <path>` → exit 2; `--chekc` → exit 2; `<path> --check` → checks. 0 files written across all six invocations |
| TASK86-002 `.sh` mode | **FIXED** | `chmod 644` on a bundled `.sh` → `--check` exit 1, reports `WRONG MODE (644, expected 755)` |
| TASK86-003 orphan detection | **FIXED** | Detected for both a flat and a nested (`references/nested/deep.md`) path |
| TASK86-004 ambiguous copy | **PARTIAL** | An authored file with no marker is correctly left alone and reported `AMBIGUOUS` — but one that quotes the marker is still overwritten. See TASK86-007 |
| TASK86-005 symlink | **FIXED** | Source byte-identical after bundling; the link is replaced by a real bundled copy |

---

## New Findings This Cycle

- **[medium] `skills/create-skill/scripts/bundle_skill.py` — TASK86-007.** `_looks_bundled()` accepts
  the marker *phrase* as provenance. An authored `references/guide.md` containing
  *"bundled files carry AUTO-GENERATED — DO NOT EDIT at the top"* is reconciled and **overwritten
  wholesale**. Verified: the authored content was replaced by the shared source plus a banner.
  → Match the banner's **structure** — `Source: shared/resources/<rel>` where `<rel>` is the file's
  own path relative to `references/`.

- **[low] `skills/create-skill/scripts/bundle_skill.py` — TASK86-006.** Same root cause, opposite
  direction: `check_skill`'s ORPHANED branch also keys on the phrase, so a skill-native file quoting
  it is reported `ORPHANED (banner names shared/resources/X, which no longer exists)`. The message
  asserts something it never read — the path is inferred from the file's location, not parsed from
  the banner. A mention beyond the 40-line window is correctly ignored, so the false positive is
  window-bounded.

Both are **latent**: 0 live instances. A scan of all 858 bundled files found no source-less file
quoting the marker anywhere.

### From the refute agent (returned late; findings the in-line pass missed)

- **[HIGH] TASK86-008 — the ambiguity gate guarded only the path where the danger was smallest.**
  `_looks_bundled` had exactly one call site: reconciliation. Pass 2 wrote every entry in `needed`
  with no gate at all — so whenever a skill's own files *name* the file (the ordinary case, either
  form), an authored file was overwritten and stamped AUTO-GENERATED. Reproduced:

  | SKILL.md mentions | authored file preserved |
  | --- | --- |
  | `references/x.md` | **False** |
  | `shared/resources/x.md` | **False** |
  | nothing (reconciliation) | True |

  **And the test asserting the guarantee used the third fixture** — the one seed routing to the branch
  that worked. A test built, unintentionally, to pass.

- **[HIGH] TASK86-005's test was vacuous.** Its fixture referenced nothing, so the bundler took the
  early return and wrote nothing; "the source is unchanged" was trivially true. It passed with either
  guard removed. Now split: one test forces the discovery write path, one pins the reporting. The
  write-through outcome is still only provable by removing **both** guards — recorded as such rather
  than claimed, and `write_if_changed`'s unlink is now documented as unreachable defence-in-depth.

- **[MEDIUM] TASK86-009 — `-check` (single dash) still ran the mutating bundle.** The typo guard
  matched only `--`, so `-check`, `-c`, `-all` were treated as skill paths. Reproduced against the
  real repo: `bundle_skill.py -check skills/create-skill` printed a path error **and then bundled**.

- **[MEDIUM] TASK86-013 — the printed remedy was wrong for the classes this task introduced.**
  `npm run bundle` cannot clear ORPHANED, AMBIGUOUS, MISDECLARED or SYMLINK, so CI would sit
  permanently red under an instruction that provably does nothing. Measured: check → bundle → check,
  unchanged.

- **[MEDIUM] TASK86-011 — every header-less suffix was auto-accepted**, not just `.json`.
  `.mdx`, `.ts`, `.txt` all overwrote. This tree already holds **15 skill-native `.mdx`** and one
  `.ts` under `skills/*/references/`.

- **[MEDIUM] TASK86-012 — orphan detection never fired for those same suffixes**, so an orphaned
  `.json`/`.mdx` copy stayed green forever. The same blind spot compounds: auto-overwritten when a
  source exists, silently ignored when it does not.

- **[MEDIUM] unhandled `OSError` aborted `--all` mid-run** with a traceback — a `references/` entry
  that is a *directory*, a `chmod 000` source, or a source deleted mid-run. `expected_bytes` caught
  only `UnicodeDecodeError` while its two siblings caught `OSError` too.

- **[MEDIUM] symlinked references became invisible.** Made safe by cycle 1, but neither reported nor
  repaired — a consumer copying the directory verbatim gets a dangling link.

- **[LOW] TASK86-010 — the mode rule was `.sh`-scoped, and a live mismatch was sitting in the tree.**
  `shared/resources/pr-inline-comment.js` is `0755`; its copies in `review-code` and `review-pr` were
  `0644`, and `--check` reported the tree clean. **This is the exact green-CI-but-wrong-mode split the
  cycle-1 fix claimed to close, still open on tracked files.** Now keyed on the source's executable
  bit; the bundler repaired both copies.

- **[LOW] exit codes were inconsistent** (usage errors 1 vs 2) and the module docstring never
  mentioned `--check`.

- **[LOW] fixture cleanup was registered last and opt-in**, so a throw during construction leaked the
  temp repo. Now registered immediately after `mkdtemp`, with `t` required.

The agent also confirmed, independently, several probes the in-line pass had already run — the
40-line window (deepest banner: line 5, because the deepest frontmatter in any shared `.md` is 4
lines), `--check` writing nothing, convergence without oscillation, and that ORPHANED/AMBIGUOUS are
mutually exclusive so check order is not load-bearing between them.

---

## Probes That Came Back Clean

Recorded so a later cycle does not redo them.

| Probe | Result |
| --- | --- |
| **Bulk teardown** — `--all` across 125 skills | 0 spurious writes; 3 consecutive runs = 0 operations |
| **Reconnect / convergence** — repeated runs | Stable. A pre-header copy reconciled on run 1 gains a banner and is classified by evidence 1 on run 2; no oscillation |
| **Error path** — symlink unlink-then-write | Source unchanged; link becomes a real bundled copy; nothing lost |
| 40-line banner window sufficiency | **0 of 858** files have a banner outside it |
| Structured-banner discriminator viability | **774 files** match `Source: <own path>`; **0 mismatches** |
| `--check` writes nothing | 0 dirty files across six invocation shapes |
| ORPHANED on a nested path | Correct (true positive) |
| ORPHANED on a `.json` (no banner) | Correctly not reported |
| Test fixture cleanup (`t.after`) | Temp-dir delta 0; all 16 tests thread `t` |

**One interaction found, and it is benign.** A file that is both STALE and WRONG MODE reports only
STALE — the `continue` after appending STALE skips the mode check. Recorded as a note rather than a
finding: the remedy for STALE is `npm run bundle`, which also repairs the mode, so nothing is lost.

---

## NFR Assessment

**Security — PASS.** No auth, network, secrets or user data. TASK86-007 is file integrity, not
security, and is latent.

**Performance — PASS.** 3× `--all` = 0 operations; `--check --all` over 125 skills is ~2s.

**Reliability — CONCERNS.** TASK86-007 can destroy authored content without warning. Every other
probed transition held.

**Maintainability — PASS.** One definition of "in sync"; the rejected over-vendoring approach and
both cycle-1 self-corrections are recorded in code, task doc and CHANGELOG.

---

## Test Artifacts

```bash
node --test tests/bundle-transitive.test.js tests/bundle-mjs.test.js   # 26/26
npm run ci:fast                                                        # exit 0, 2813 tests, 0 fail
python3 skills/create-skill/scripts/bundle_skill.py --check --all       # 125 verified
```

GitHub CI on PR #352 after the cycle-1 fixes: **5/5 SUCCESS** (`validate`, `test`, `shellcheck`,
`link-check`, branch policy).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Cycle 1's fixes hold under execution, but the TASK86-004 repair is incomplete in a way
that reintroduces the destruction it was written to prevent. The fix is small and its replacement is
already validated against the tree (774 matches, 0 mismatches).
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK86-007 fixed and covered by a test.

---

**Next Steps**: `/qa-fix` cycle 2 → re-review.
