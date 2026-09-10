# Fixtures — diminishing-returns exit

**These gates are RECONSTRUCTIONS, not copies.** The run this rule was derived from
(tinker-city `task.103.dialog-migration-followups`, PR #829, 2026-09-08) lives in a
different repository, and its gate files are not vendored here. What is reproduced is
the **documented shape** of that run — HIGH `2, 0, 0, 0` across four cycles, with every
cycle-2-onward finding sitting in the test machinery built to pin cycle 1's fixes.

A fixture that claimed to be another repository's committed artifact and was not would be
worse than an honest reconstruction: it would invite a reader to go and diff it against a
file they cannot reach, and to trust it more than the reconstruction deserves.

Note also that `task.103` in *this* repository is an unrelated task
(`task.103.pipeline-owns-the-registry-tick`). The bare id is ambiguous across repos, which
is why these files are named for what they exercise rather than for their provenance.

| Fixture | Exercises |
| :--- | :--- |
| `residue-cycle{1..4}.yml` | the reconstructed run — the exit must fire at the end of cycle 2 of the zero-HIGH stretch (loop cycle 3) |
| `flat-high-cycle3.yml` | the `7, 7, 7, 7, 4` sequence the Convergence check owns — must never fire |
| `one-high.yml` | a single HIGH remaining — must not fire |
| `production-medium.yml` | a MEDIUM on a production path — must not fire |
| `no-glob-match.yml` | anti-vacuity: every condition holds *except* the glob match |
| `missing-file.yml` | a finding carrying no `file:` at all |
| `product-defect-nfr.yml` | condition 3 — a product defect signalled through `nfr_validation` while every `file:` is machinery |
| `empty-residue.yml` | a gate with no `top_issues[]` — must not fire (absence is not evidence) |
