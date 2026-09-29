# Bug Report: Task 149 - qa-read-back.js chooses a dotfile as the cycle's gate, where qa-cycle.sh never counts one

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 7)
**Date Found**: 2026-09-26

## Description

`artifact()` in `shared/resources/qa-read-back.js` scans every `readdirSync` entry. The glob in
`qa-cycle.sh` (`*.gate.*.yml`) skips dotfiles. So the CR6-2 claim that the two use one grammar does
not hold for a hidden file with the same cycle number, such as a macOS AppleDouble file
`._task.9.gate.1.x.yml` written on exFAT or SMB. The script chooses that file as the gate, stages it
into the QA commit and reports it as `gate`. If the file is gitignored, the run halts permanently
with a message that wrongly blames a held `.git/index.lock` (review CR-1, cycle 7).

## Steps to Reproduce

```bash
T=$(mktemp -d) && cd "$T" && git init -q && d=docs/tasks/task.9.x && mkdir -p $d
printf -- '---\ntype: task\nupdated: 2026-09-26\n---\n# W\n\n- [r](./task.9.qa.1.x.md) [g](./task.9.gate.1.x.yml)\n\n## Change Log\n\n| Date | Version | Description | Author |\n| -- | -- | -- | -- |\n| 2026-09-26 | | x | a |\n' > $d/task.9.x.md
echo 'gate: PASS' > $d/task.9.gate.1.x.yml; printf 'x' > $d/._task.9.gate.1.x.yml; echo '# r' > $d/task.9.qa.1.x.md
node <repo>/shared/resources/qa-read-back.js --doc $d/task.9.x.md --json | jq -c '{exitCode,gate,staged}'
```

## Expected Behavior

The gate that `qa-cycle.sh` counted is the one this script reads. A dotfile is never chosen, and never staged.

## Actual Behavior

`{"exitCode":0,"gate":"docs/tasks/task.9.x/._task.9.gate.1.x.yml","staged":[…,"…/._task.9.gate.1.x.yml",…]}`

## Impact

A stray metadata file rides into the QA commit and is reported as the evidence. On a gitignored
dotfile, every run halts with the wrong remedy.

## Recommendation

Make one definition of "this cycle's gate / report file". Either skip dotfiles, as the shell glob
does, or better, let the helper that counts the cycle also name the file, so that the two cannot
drift. Test with a same-cycle dotfile next to the real gate.

## Developer Fix Cycle

### Iteration 1

**Narrowing residue:** "which file is this cycle's gate / report" in qa-read-back.js (pipeline offer).
**Move: consolidate the contract.** That rule had two definitions: the glob and sed in
`qa-cycle.sh`, and a regex in `artifact()`. The second drifted from the first three times: leading
zeros (BUG-9), the greedy segment (CR6-2), and now dotfiles. So instead of adding a fourth patch to
the copy, this fix removes it.

- `shared/resources/qa-cycle.sh`: new `--path gate|qa` mode. It prints the one regular file (not a
  directory, not a symlink) whose number is the current cycle, using the same glob and the same sed
  that counted the cycle. When no file matches, or more than one does, it refuses with exit 1 and a
  named ⚠️ line. That second refusal also closes the advisory CR-3 (an ambiguous choice made
  silently). An unknown kind is exit 2.
- `shared/resources/qa-read-back.js`: `artifact()` now calls `qa-cycle.sh --path`, and its own
  regex is deleted. The helper's refusal is reported verbatim as the HALT problem. A helper that
  cannot run is a could-not-look throw, exit 2.
- Tests: in `qa-read-back`, a same-cycle dotfile is ignored, and two regular files claiming one
  cycle halt. `qa-cycle.test.js` gains `--path` cases under bash and zsh: the grammar, the last
  segment, a dotfile, a directory, a symlink, ambiguity, and usage. Mutations M11 to M14 each turn
  their tests red. Also checked under macOS `/bin/bash` 3.2.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 7 (review CR-1, reproduced) |
| 2026-09-26 | Ready for QA | qa-fix | Fixed in qa-fix cycle 7 (consolidate: qa-cycle.sh --path) |
| 2026-09-26 | Closed | QA Engineer | Verified in QA cycle 8 — probe + tests, mutation-proved |
