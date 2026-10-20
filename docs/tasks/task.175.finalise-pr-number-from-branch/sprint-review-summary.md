# Sprint Review Summary - Resolve finalise's PR number from the branch, not the task body

**Story/Task ID:** task.175
**Epic:** _(standalone task)_
**Completed Date:** 2026-10-12
**Completed By:** develop-next → develop-task pipeline (Claude Code)
**Pull Request:** [#635](https://github.com/Gamaroff/agent-skills/pull/635)

---

## Summary

`/finalise` now judges its own pull request. It used to take the first `PR #N` in the task document's body whenever frontmatter had no `pr_number:` — always, inside a pipeline — and three runs judged a PR their document merely cited (observation #184). A new resolver reads the branch and the pipeline lock first, and trusts a body citation only when that PR's head branch is the current branch.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `resolve-pr-number.sh` resolves through five rungs in order (explicit `--pr`, branch, lock, frontmatter, confirmed body), each held by an executed test
- [x] A body `PR #N` is used only when PR N's head branch is the current branch; an unconfirmed citation is refused
- [x] With no source the resolver exits 1 and prints no number
- [x] finalise Step 3a calls the resolver, Step 7.2 writes only the resolved number, and no finalise site derives the number from the body
- [x] Gates green (`ci:fast`, `bundle:check`, `validate`, `lint:shell`); 7 mutations red; CHANGELOG entry

### Key Features Implemented

1. **`shared/resources/resolve-pr-number.sh`** — the one PR resolver, with a `--json` source report and a refuse-rather-than-guess exit 1
2. **finalise wiring** — Step 3a, Step 7.2's `pr_number:` write, the bug-mode note, and both DoD agent prompts now take the number they are given
3. **`pr_read` head branch** — `pr-read.sh` also reports `PR_READ_HEAD_BRANCH`, so the body confirmation reuses the one forge helper

---

## Technical Details

### Files Modified/Created

- `shared/resources/resolve-pr-number.sh` (new), `shared/resources/tests/resolve-pr-number.test.mjs` (new)
- `shared/resources/pr-read.sh`, `shared/resources/pr-read.test.sh`
- `skills/finalise/SKILL.md`, `shared/resources/finalise-dod-ac-prompt.md`, `shared/resources/finalise-dod-fix-evidence-prompt.md`
- `CHANGELOG.md`; bundled `references/` copies regenerated

### Architecture/Design Decisions

- Rung 2 reuses `pr_read` rather than a second current-branch query (review finding I1).
- The lock answers only when its `task_or_story_directory` is the document's directory, compared canonicalised.
- Step 3a passes no `--pr`: finalise takes no PR argument, and inside a pipeline the branch rung answers.

### Dependencies

None added.

---

## Testing & Quality Assurance

### Test Coverage

- 16 executed resolver cases (one per rung with the rungs above empty, refusals, usage errors, a Bitbucket branch read) plus a presence pin over finalise and both prompts
- 3 new `pr-read.test.sh` cases for the head branch
- Mutations M1–M7 each turned the suite red, restored by `cmp`

### Code Review

- QA cycle 1: gate PASS 100/100, 0 open findings; 2 advisory code-review notes routed to future work
- Step 5c `/review-pr`: APPROVE, 0 conformance findings

---

## Security & Compliance

### Security Review

- No secrets, no new `eval`/`exec`, every printed PR number is digits only.
- The probe zero-guard was closed by a **recorded human override** in DoD run 2: no `security-probe.mjs` entry form reaches a flag-parsed, `gh`-networked shell script. The executed fixture suite and mutations M1–M3 are the evidence. task.181 (`shell-argv:`) will make it probeable.

### Compliance Review

Not applicable — internal tooling.

---

## Documentation

### Updated Documentation

- `CHANGELOG.md` `[Unreleased]` › Fixed (task 175)
- `skills/finalise/SKILL.md` Step 3a, Step 7.2, bug-mode note

### Documentation Links

- DoD: `task.175.dod.2.finalise-pr-number-from-branch.md`
- QA: `task.175.qa.1.finalise-pr-number-from-branch.md`

---

## Demo Notes

### How to Verify

```bash
bash .agents/skills/finalise/references/resolve-pr-number.sh \
  --doc docs/tasks/task.175.finalise-pr-number-from-branch/task.175.finalise-pr-number-from-branch.md --json
# on this branch: {"pr":635,"source":"branch"} — the document's first cited PR is #488, and it is not used
```

### Screenshots/Visuals

Not applicable.

---

## Impact & Value

### User Impact

A `/finalise` run checks the PR that carries the work, so its CI readings, diff and comments are about the right change.

### Technical Impact

Three hand-corrections per affected run (obs #184) are no longer needed; an unresolvable PR is reported as unresolved instead of guessed.

---

## Known Limitations & Future Work

### Current Limitations

- A standalone `/finalise` run on a long-lived branch (`develop`) would take a PR whose head is that branch (QA CR-1, advisory).
- The body rung reports "could not confirm" and "confirmed as another PR" the same way (QA CR-2).

### Suggested Follow-Up Stories

- task.181 — `shell-argv:` probe form, which closes this task's zero-guard without an override
- Observation #12 — the probe engine should decline a uniform usage error rather than score it

---

## Metrics _(if applicable)_

- QA cycles: 1 · tests added: 19 · mutations proved: 7
