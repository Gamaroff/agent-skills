# Bug Report: Task 122 - Lexical `_within()` accepts a symlinked intermediate directory the old guard refused, and the write gate checks only the leaf

**Task**: [task.122.bundle-check-unreached-copies.md](./task.122.bundle-check-unreached-copies.md)
**Bug ID**: TASK-122-BUG-1
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-18

## Description

Task 122 changed `_within(root, candidate)` in `skills/create-skill/scripts/bundle_skill.py` from
`candidate.resolve().is_relative_to(root.resolve())` to a lexical `os.path.normpath` prefix test, so
that a **symlink at the leaf** (`references/X` → elsewhere) no longer makes discovery refuse a name the
skill cites (that copy should read `SYMLINK`, not `SYMLINK` + `UNREACHED`). The lexical test also
stops resolving a symlink at an **intermediate** component, which the old check did resolve — and
that was the containment the guard actually provided against a link under `references/`.

Hand-probed under a minimal env (`env -i`) in a scratch tree with `references/link-to-etc → <outside>`:

| shape | new `_within` | old `_within` |
| --- | --- | --- |
| `link-to-etc/passwd` (symlinked parent) | **accepted** | refused |
| `link-to-etc/../x.md` (symlinked parent + `..`) | **accepted** | refused |
| `../secrets.env`, `../../../../etc/passwd`, `/etc/passwd`, `../refs-evil/x` | refused | refused |
| `safe.txt\0.png` | accepted → `src.exists()` returns False on this Python, refused downstream | refused |

`writable_copy` / `write_if_changed` test `dst.is_symlink()` — the **leaf** only — and
`write_if_changed` does `dst.parent.mkdir(parents=True, exist_ok=True)` then writes, so a name whose
parent under `references/` is a symlink is written **through** the link to wherever it points.
The reconciliation path (`source_backed_on_disk`, which `rglob`s `references/`) had this exposure
before task 122; the discovery path did not, and this diff removes its protection.

## Steps to Reproduce

```bash
# scratch repo with a shared source in a subdirectory and a symlinked dir under references/
mkdir -p r/skills/fx/references r/shared/resources/sub /tmp/outside
echo '{"name":"x"}' > r/package.json
printf '# s\n' > r/shared/resources/sub/s.md
printf -- '---\nname: fx\ndescription: d\n---\nSee shared/resources/sub/s.md\n' > r/skills/fx/SKILL.md
ln -s /tmp/outside r/skills/fx/references/sub
python3 skills/create-skill/scripts/bundle_skill.py r/skills/fx
ls /tmp/outside        # s.md written outside the tree; on develop the name was refused
```

## Expected Behavior

A candidate whose path under `references/` passes through a symlinked directory is refused by
discovery (as on `develop`) or, at minimum, refused by the write gate. A symlink **at the leaf**
keeps the task's intended behaviour: the name stays in `needed`, the copy reports `SYMLINK`.

## Actual Behavior

Discovery accepts the name, `needed` gains it, and the bundler creates the file outside the tree.

## Impact

Bounded — it needs a symlinked directory committed or created under a skill's `references/` plus a
citation that reaches it, so it is an authoring-mistake / careless-consumer hazard rather than a
remote one — but it is a regression of a containment guard that the diff's own tests (the
`out-of-tree reference is refused` test in `tests/bundle-transitive.test.js`) were believed to
cover, and they cover only the `..` shape.

## Recommendation

Resolve the **parent**, not the leaf: `_within` returns true only when `candidate.parent.resolve()`
is inside `root.resolve()` **and** the leaf component is not `..` (keep the `ValueError`/`OSError`
→ `False` guard). That refuses a symlinked intermediate (resolve follows it out of the tree) while a
symlink at the leaf still passes containment and reports `SYMLINK`. Belt-and-braces: have
`writable_copy` refuse when any component between `refs_dir` and `dst` is a symlink. Add two
fixtures to `tests/bundle-check-mode.test.js`: symlinked intermediate dir → refused and nothing
written outside; symlink at leaf with a citation → `["SYMLINK"]` only (the task's own case, already
present). Mutation-prove both.

## Investigation

**Date**: 2026-09-18 · **Developer**: qa-fix (pipeline, cycle 1)

**Root cause**: task 122 replaced `_within`'s `candidate.resolve()` with a lexical `normpath` prefix
test so that a symlink *at the leaf* would not make discovery refuse a cited name. But `resolve()`
was doing two jobs — following the leaf (unwanted) and following any *intermediate* symlink
(wanted) — and the lexical form dropped both. `writable_copy` / `write_if_changed` only ever tested
the leaf (`dst.is_symlink()`), so nothing downstream caught a symlinked parent. Reproduced against
`develop` (refuses `sub/s.md`, writes nothing) and the branch (writes `<outside>/s.md`).

Two adjacent facts surfaced while building the fixtures: (a) `Path.rglob` stops following
symlinked directories in Python 3.13, so the reconciliation path reaches such a copy on ≤3.12 only —
the write gate must not depend on the walk; (b) the shared-ref collector strips trailing punctuation,
so `shared/resources/sub/..` at a sentence end arrives as `sub/` — a directory — which
`discover_needed` admitted on `exists()` and `expected_bytes` then crashed on (IsADirectoryError).

## Fix Implementation

**Date**: 2026-09-18

- `_within(root, candidate)` now resolves the **parent** (`cand.parent.resolve()` inside
  `root.resolve()`) so a symlinked intermediate resolves out of the tree and is refused, judges the
  **leaf** lexically so a symlink at the leaf still passes containment (reports `SYMLINK`), refuses a
  `..`/empty leaf outright, and keeps the `OSError`/`ValueError` → `False` guard.
- `writable_copy` also refuses when any directory between the references root and `dst` is a symlink
  (`_symlinked_component`), so the reconciliation path is gated too; `_skip_reason` is one definition
  of the status-line wording for both write passes ("under a symlinked directory").
- `discover_needed` admits a source on `is_file()`, not `exists()` — a directory citation is skipped
  with the existing "not found" warning instead of crashing the run.
- Advisory cleanups applied in the same pass: CR-2 (inner capture renamed `invoked`), CR-3 (iterate
  `sorted(reconcilable)`; comment states the disjointness), CR-4 (create-skill remedy sentence
  reworded without the literal pass 3 rewrites).

**Files Modified**:
- `skills/create-skill/scripts/bundle_skill.py` — `_within`, `_symlinked_component`, `_skip_reason`,
  `writable_copy`, `discover_needed` (`is_file`), CR-2/CR-3
- `tests/bundle-check-mode.test.js` — five fixtures: cited name under a symlinked intermediate
  (refused, nothing written outside); reconciled copy under one (untouched; gate probed directly,
  Python-version independent); `..` leaf via `INVOKE_REF_RE` (refused); directory citation
  (skipped, no crash); symlink at the leaf still `["SYMLINK"]`
- `skills/create-skill/SKILL.md` — CR-4

**Testing**: bundler suites 78/78; `TMPDIR=/tmp` 42/42; `npm run ci:fast` 3453/3453;
`bundle:check` 0 problems; hand probe re-run under `env -i`: both symlink shapes refused, bare `..`
and empty refused, legitimate shapes accepted. Mutation proofs (cp snapshot/restore, applied-count
asserted): M1 lexical `_within` → cited-symlinked-intermediate test red; M2 whole-candidate
`resolve()` → SYMLINK-at-leaf tests red; M3 drop `..` leaf refusal → `..` leaf test red; M4 leaf-only
write gate → reconciled-copy test red; M5 `is_file()`→`exists()` → directory-citation test red. All
`covered`.

**Verification Steps for QA**:
1. Fixture: skill citing `shared/resources/sub/s.md` with `references/sub → <outside>`; bundle;
   expect `refusing out-of-tree reference: sub/s.md` and `<outside>` empty.
2. Existing `SYMLINK: a symlinked reference is reported, not silently accepted` still `["SYMLINK"]`.
3. Re-run the 13-shape hand probe; expect only `encoded-traversal` (literal filename) and `null-byte`
   (refused downstream by `is_file()`) to remain "accepted" at `_within`.

## Status History

| Date | Status | Note |
| ---- | ------ | ---- |
| 2026-09-18 | New | Found in QA cycle 1 (hand probe of the `_within` boundary; reviewer CR-1 independently named the same mechanism) |
| 2026-09-18 | In Progress | qa-fix cycle 1 — investigation |
| 2026-09-18 | Ready for QA | qa-fix cycle 1 — parent-resolving `_within`, write-gate component check, `is_file()`; 5 fixtures, 5 mutants covered |
| 2026-09-18 | Closed | QA cycle 2 verified: repro refused on `7252be6f`, 13-shape probe clean, QA mutants red. Follow-on low finding (in-tree symlinked intermediate: check/writer divergence) filed as TASK-122-CR2-1 in gate 2 |
