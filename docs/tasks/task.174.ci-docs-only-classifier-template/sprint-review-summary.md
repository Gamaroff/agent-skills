# Sprint Review Summary - Publish the docs-only CI classifier as an optional consumer template

**Story/Task ID:** task.174
**Completed Date:** 2026-11-02
**Completed By:** Lorien Gamaroff
**Pull Request:** [#808](https://github.com/Gamaroff/agent-skills/pull/808)

## Summary

Consumers can now copy an optional CI template that skips the heavy jobs when a push changes only documentation over a head that already passed. It was lifted from tinker-city task.127, which merged as tinker-city PR #984 and cut a docs-only run from 37 min 27 s to 2 min 52 s. Every uncertain path still runs the full suite.

## What Was Delivered

### Acceptance Criteria Met

All 10 success criteria are met. The one CI-state criterion (#8) was graded from CI on `1a8ac32879d9`. The per-criterion evidence is in `task.174.dod.1.ci-docs-only-classifier-template.md`.

### Key Features Implemented

- `docs/examples/ci/github-actions/classify-changes.sh` plus its spec. It reads the evidence from successful `pull_request` runs of `CI_WORKFLOW_PATH`, and every lookup failure gives `code=true`.
- `docs/examples/ci/github-actions/changes-job.yml`, a snippet with a pinned concurrency block. PR runs cancel each other only within their own workflow and PR, and push runs are never cancelled.
- `docs/examples/ci/bitbucket-pipelines/`, a Bitbucket Pipelines variant. A 403 there is treated as "no evidence", never as green.
- `docs-set-parity.test.js`: the template's default docs set agrees with task.172's on a fixed path list.
- The guide `docs/runbooks/ci-docs-only-skip.md`: contract, measured runs, wiring, trade-offs and rollback.

## Technical Details

### Files Modified/Created

See the task's § 7 Files Summary. The template suites, guide and CHANGELOG are in PR #808.

### Architecture/Design Decisions

- The template lifts what merged upstream, not what the upstream plan described.
- On the base branch, the push path still skips a docs-only diff without evidence. This is accepted as tinker-city accepts it. The guide lists the remaining cases and the adopter's remedy.

### Dependencies

None added. The scripts need `git`, `curl` and `jq`, and `jq` missing means `code=true`.

## Testing & Quality Assurance

### Test Coverage

- 71 tests across 4 specs, run by `npm test` via the `docs/examples/ci/*/*.test.js` glob.
- Mutations M1–M13 each turn a test red (QA reports 1–3).
- Three QA cycles, ending at gate 3: PASS, 100/100. Three bugs were filed and closed.

### Code Review

A code reviewer ran every QA cycle. The 5c PR conformance review reads APPROVE.

## Security & Compliance

### Security Review

PASS. The `is_docs` boundary in both variants was probed with 34 cases: 0 reproduced, 0 escaped. Tokens go to curl on stdin, and the job token is least-privilege.

### Compliance Review

Not applicable.

## Documentation

### Updated Documentation

- `docs/runbooks/ci-docs-only-skip.md` (new)
- `docs/runbooks/README.md` (index row)
- `CHANGELOG.md` `[Unreleased]`

### Documentation Links

- [Guide](../../runbooks/ci-docs-only-skip.md)

## Demo Notes

### How to Verify

Run `node --test docs/examples/ci/*/*.test.js`. To try it on a real project, wire `changes-job.yml` into a consumer workflow and push a `.md`-only commit over a green head. The heavy jobs skip.

## Impact & Value

### User Impact

Consumer repositories wait about 3 minutes, not about 37, for CI on a docs-only push.

### Technical Impact

The template is opt-in. Nothing installs it, and rolling back means removing the job.

## Known Limitations & Future Work

### Current Limitations

- The push path does not prove the base head's code under a green docs merge (see the guide).
- The default `docs/*` counts code under `docs/` as docs, so adopters with code there should narrow `DOCS_PATTERNS`.

### Suggested Follow-Up Stories

- Scope the guide's "not optional" sentence (QA cycle 3 cleanup).
- Make the Bitbucket "no lookup" test assert that curl did not run (QA cycle 2 cleanup).

**Status:** ✅ **ACCEPTED**
