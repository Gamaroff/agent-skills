# Fixtures — narrowing-residue signal (task.148)

Two kinds of file live here, and the difference matters.

**Copies, byte for byte.** `task143-gate-{1..7}.yml` and `task117-gate-{1..3}.yml` are the committed
gates of two runs in **this** repository, copied unchanged:

| Fixture | Source |
| :--- | :--- |
| `task143-gate-{n}.yml` | `docs/tasks/task.143.qa-next-state-file-owned-by-the-tool/task.143.gate.{n}.*.yml` |
| `task117-gate-{n}.yml` | `docs/tasks/task.117.card-preflight-heading-only/task.117.gate.{n}.*.yml` |

task.143 is the run the signal was derived from (obs #172): HIGH 0 on all seven gates, MEDIUM
`2, 1, 2, 0, 1, 1, 0`, and every MEDIUM from cycle 2 in one best-effort derivation. The signal must
fire at cycles 2, 3 and 6 and nowhere else. task.117 is the documented false positive: gates 1→2
fire, and the right move there is **patch**, because those MEDIUMs were distinct defects in the
deliverable itself. Copied rather than reconstructed so the expected results can be re-derived from
the originals at any time.

**Synthetic.** Each isolates one condition:

| Fixture | Exercises |
| :--- | :--- |
| `medium-no-file.yml` | a MEDIUM with no `file:` — must not fire (`medium-file-missing`) |
| `medium-closed.yml` | two MEDIUMs on one file, both `status: closed` — must fire: raised, not open, is what counts |
| `medium-two-files.yml` | two MEDIUMs on two files — must not fire (`medium-files-differ`) |
