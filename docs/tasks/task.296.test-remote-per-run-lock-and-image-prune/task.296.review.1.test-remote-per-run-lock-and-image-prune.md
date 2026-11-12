# Task Review Report: Task 296 - test:remote per-run lock and image-tag prune

**Reviewed:** 2026-11-12
**reviewed_blob:** 3a7b9b3c308091aecb52ca6e4039ab27d7d287a3
**Review Depth:** Standard (run inline by the pipeline orchestrator; the two read-only pre-pass subagents were not dispatched, so the architecture and codebase passes were done in-line and independent review did not run)
**Task Status:** Planned
**Overall Assessment:** GOOD — sound design, ten plan gaps fixed in the document by this review

---

## Executive Summary

The design (atomic `mkdir` lock on the server, container-name check kept as a second layer, explicit-tag image prune) is right and matches the existing route. The plan left ten places where a developer would have had to guess, and four where the written plan contradicts a success criterion or the code. All ten were fixed in the task document under Step 8.5.

**Critical Issues:** 0
**Important Issues:** 10 (all fixed)
**Optional Improvements:** 3

**User Clarifications:** 0 (autonomous pipeline run; every decision below is recorded as a resolution in the document)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked: the pipeline runs `--defaults`. Where a fix needed a decision, the review took the option that keeps the success criteria true and recorded it in the document.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking and References are present. Sign-off is `Not required` and `sign-off.enabled` is not set, so check 4a does not apply.
- No `risk_level:` frontmatter (reads as absent, not a finding). `estimated_effort_hours: 4` is present.
- No `github_issue:` / `jira_key:`. Tracker sync is an interactive offer and was skipped in the autonomous run; the task runs without a linked issue, as its registry row already does.
- Change Log: present, one row. This review appends its rows (Step 8.5).

#### Optional

- `format:check` is named in the Code quality criteria, but `.prettierignore` excludes `*.md`, and prettier does not read `*.sh`. It reaches only the changed test file. Read it as "on the changed JS". (Check 30.)

---

## 2. Technical Accuracy

**Status:** ACCURATE on names and anchors; one behaviour claim falsified by reading the code

Every cited path and symbol exists: `RUN_DIR` (`run.sh:135`), the container-name check (`run.sh:146`), the image line (`run.sh:192`), the reap (`run.sh:105-122`), `docker run` (`run.sh:207`), the stub `ssh` in `tests/test-remote-runner.test.js` and `spawnBudget`.

#### Important

- **I-1 Traps would clobber each other.** `run.sh` already sets `trap 'rm -f "$EXCLUDES"' EXIT` and later `trap 'kill_remote_container; rm -f "$EXCLUDES"; exit 130' INT TERM`. A bash `trap` replaces the earlier one for the same signal, so a lock-release `trap … EXIT` added beside them either drops the `$EXCLUDES` cleanup or is itself dropped. The plan says "a local `trap … EXIT`" and does not say how the three combine. Fix: one `cleanup` function that does all three jobs, installed once.
- **I-2 A refused run could release the holder's lock.** If the release trap is armed before the take, a run that is refused because the lock is held would, on its `exit 1`, release the other run's lock. Fix: arm the trap only after the take succeeded, and have the release verify the owner token it wrote.
- **I-3 The take cannot tell "held" from "ssh failed" in one round trip.** The plan reads "a non-zero status with the directory present means held", which needs a second ssh to look. Fix: the remote command returns its own verdict by exit status (0 taken, 10 held with the owner file on stdout, 11 owner write failed and the directory removed); an ssh exit of 255 or any other code is "could not take the lock", a different message. This keeps the success criterion of one extra round trip.
- **I-4 `--unlock` as planned removes a live run's lock.** The plan refuses `--unlock` only "while a container of the run's name is running". A run in its sync or build phase has no container yet, so `--unlock` would remove its lock, which contradicts "a live run's lock is not removed by it". Fix: `--unlock` removes a lock only when it is stale by the rule (no container and older than the run's limit plus the margin); on a live lock it exits non-zero and says when it becomes stale. A run never clears a stale lock by itself: it refuses and names `--unlock`, which also removes the race of two runs breaking one stale lock.
- **I-5 The staleness rule had two undefined inputs.** (a) The "run's limit" is the owner's `--timeout-min`, not the caller's, so the owner file must record it. (b) The epoch must come from one clock: the take writes `date +%s` on the **server**, and the staleness check reads the server's `date` too, so a laptop with a skewed clock cannot make a live lock look stale. An owner file that is missing or unreadable (a take interrupted between `mkdir` and the write) is "held, unknown owner", never stale.
- **I-6 The `--help` text is a hard-coded line range.** `sed -n '2,19p'` prints the header comment. Adding the two options to the header shifts the range and truncates the help silently. Fix: derive the range from the header (print until the first non-comment line), or bump it, and hold it with a test that `--help` names both new options.
- **I-7 The reap reads the same directory.** `--reap` globs `agent-skills-test-*` with `-type d` under `$HOME`; a `<RUN_DIR>.lock` directory matches. The reap would `rm -rf` a lock older than the limit (harmless, that lock is stale) but would also report it as a directory and its container check compares the name `X.lock`, which never matches a container. State the behaviour: the reap skips `*.lock`, and a stale lock is cleared only by `--unlock`. (Check 29, a new write into a directory names every reader of it.)
- **I-8 The prune could remove a tag a starting run needs.** The keep set is the current tag and the image of every running container. A run on another checkout (another Dockerfile hash) that has built its image but has not yet started its container is in neither set, so its `docker run` would fail on a missing image. Fix: the prune refuses, exit non-zero, while any `~/agent-skills-test-*.lock` exists, which is what the lock is for. It also skips the `<none>` tag, and never passes `-f` to `docker rmi`.
- **I-9 `--prune-images` and `--unlock` need values that are computed late.** `IMAGE` is computed at `run.sh:192`, after the sync, and `RUN_DIR` after the reap block. Both options run before the sync, so the plan must say where they sit: after `RUN_DIR` is computed (for `--unlock`), and the Dockerfile hash hoisted above the sync (for `--prune-images`). Both are mutually exclusive with `--run` and with each other and with `--reap`.
- **I-10 The stub `ssh` is order-sensitive.** The stub's `case` arms match text such as `*"docker ps -a"*` and `*"touch "*"docker image inspect"*`. A lock command that contains `docker ps -a` (to fold the take and the container check into one call) would be eaten by the wrong arm and the lock tests would pass or fail for the wrong reason. Fix: put the new arms first in the stub, match them on text no existing arm shares (`*".lock"*`), and have the lock tests assert the call log, not only the exit code.

#### Optional

- **O-1** "lock helpers if they belong beside `server_ready`" in `server-lib.sh` is left open. Decision: the lock take, release and the staleness read go in `server-lib.sh` as functions (they are testable apart from `run.sh`); `run.sh` calls them.
- **O-2** "Two options are added (`--unlock`, `--prune-images`)" under Breaking Changes: add that a refused run now exits 1 with a message naming the owner and age (already stated), and that a leaked lock is cleared only by `--unlock`.
- **O-3** The CHANGELOG entry belongs under `[Unreleased] / Added`, with the task-296 citation, in the style of the existing `Changed` entries.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

Phases are specific (files, one change per checkbox, dependencies). After the I-1 to I-10 fixes a developer can follow the plan without guessing. The plan file (`task.296.plan…`) states the lock take as a two-call shape; it is superseded by the single-call verdict in the task document (I-3), and the task document is the authority.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes

#### Important

- **I-11 (success criteria, check 4).** "No existing option's behaviour changes" names no test. It is held by the existing cases in `tests/test-remote-runner.test.js` (the arguments, exit-status, timeout, linked-worktree and reap cases), run unchanged. State that, so finalise has a test to cite.
- **I-12 (perf criterion).** "At most one ssh round trip" was ambiguous (take, release, or both). Fixed to: the take is folded into the existing container-check call (net zero), the release adds one, so a run adds at most one ssh call, counted from the stub's call log.
- The Testing Strategy lines, "a stale lock is refused by a run and removed by `--unlock`" and the mutation note that one test must hold the lock with no container present, agree with the fixed design.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The stale-lock risk is rated High and has a mitigation and a rollback. The prune risk gains the lock-held refusal (I-8). A guard exemption is not involved. Rollback of either phase alone is stated.

---

## Summary of Recommendations

### Must Fix (Critical): 0

### Should Fix (Important): 12 — all applied to the task document (see Change Log row)

### Consider (Optional): 3 — O-1 and O-3 applied; O-2 applied; the `format:check` reading noted above

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 9/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10 (after fixes)
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The design is right and every finding was a missing decision, not a wrong direction. Each is now written into the plan with its resolution.

---

## Review Metadata

- **Reviewer:** review-task (pipeline run)
- **Review Date:** 2026-11-12
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.test-remote-per-run-lock-and-image-prune.md`
- **Sources read:** `scripts/remote-test/run.sh`, `tests/test-remote-runner.test.js` (stub `ssh`), `docs/contributing/testing-remote.md`, `CHANGELOG.md`, `.prettierignore`
