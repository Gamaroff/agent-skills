# Bug Report: Task 283 - CHANGELOG block fails open on an unfetched base

**Task**: [Link](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Bug ID**: TASK-283-BUG-5
**Severity**: MEDIUM
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (code-review CR-3, reproduced)
**Date Found**: 2026-11-19

## Description
In the Step 3 CHANGELOG block, `! git diff --quiet "origin/{base}" -- "$CL"` treats exit 128 (unknown ref) as "changed". The awk pipeline then reads nothing and the block exits 0.

## Steps to Reproduce
Run the block in a repository whose `CHANGELOG.md` has a misplaced new entry, with `{base}` set to `nonexistent`: exit 0, no output. With `{base}` set to `develop` (control): exit 1 and the HALT line.

## Expected Behavior
An unresolvable base is a HALT: "could not look" must differ from "nothing misplaced".

## Actual Behavior
A silent pass.

## Impact
The guard is silent exactly when its base is missing.

## Developer Fix Cycle (qa-fix cycle 1)

The Step 3 block now verifies `origin/{base}^0` and HALTs when it is missing, and HALTs when `git diff` exits above 1. Two committed tests drive each guard under bash and zsh (an unfetched base; a corrupt index with the base present). Mutation proofs: removing the ref check turns the unfetched-base test red; replacing the exit-code check with `true` turns the corrupt-index test red. The probe-engine `fence:` run was not done; the committed tests are the evidence, and the DoD may need an override for `probes_executed: 0`.

## Recommendation
Verify the ref with `git rev-parse --verify --quiet` and HALT when it fails; add the case to `develop-loop-changelog-placement.test.mjs` and mutation-prove it. Run the probe engine's `fence:` form over the block, or record that the DoD needs an override.
