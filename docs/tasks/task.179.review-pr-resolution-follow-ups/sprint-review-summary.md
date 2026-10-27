# Sprint Review Summary — Task 179

**Task:** /review-pr resolution follow-ups
**PR:** [#764](https://github.com/Gamaroff/agent-skills/pull/764) → `develop`
**Accepted:** 2026-10-27 · **Gate:** PASS 100/100 · **QA cycles:** 1 · **PR review:** APPROVE

---

## Summary

This task closes the six low-severity follow-ups that task.177's QA and PR review recorded on
`/review-pr` target parsing. The one with security weight is CR-1. The scheme-less arm of
`parse-target.sh` matched a known platform host on the raw first path segment, while the URL arm read
the host through its own expression. A target like `ghe.corp#.atlassian.net/…` therefore passed the
known-host check on a host it did not have. Both arms now read the host through one helper,
`host_of`, so there is a single host reading and nothing for the two arms to disagree about.

## Success Criteria Met

9 / 9. Seven are behaviour or quality criteria, each citing a test that runs on every PR under bash
and zsh. Two are documentation criteria, checked by reading the text.

## Key Changes

- **`host_of`** (`skills/review-pr/scripts/parse-target.sh`) drops the scheme, userinfo, port, path,
  query and fragment, and folds case. Both parser arms call it. `x@github.com/o/r/pull/1` is now
  PR 1. `github.com:1@evil.com/…` stays a branch, because its real host is `evil.com`.
- **A comment-only `.env` value** (`JIRA_URL= # prod`) now reads as unset. Before, it produced a
  false "host differs" warning.
- **Prose matches the rule.** The SKILL.md target row, the Step 0b comment and the KIND table now
  state it: a GitHub, Bitbucket or `*.atlassian.net` URL may omit `https://`, and a self-hosted
  URL may not.
- **The §0a KEY_FIELD contract** names `pr_number` and all five callers. The six bundled copies were
  regenerated.
- Three stale test comments and one mis-titled docs-guard test were corrected.

## Testing & QA

- New parser cases for every CR-1 bypass shape, plus a network-free assertion that shadows
  `gh`/`curl`/`wget`/`git` with stubs and requires an empty call log. They run under bash and zsh.
- Mutation-proved: reverting `host_of` to the raw first segment turns 4 parser cases and the probe
  red.
- QA cycle 1 gave PASS 100/100. The 5c `/review-pr` (conformance lens) gave APPROVE with one low
  finding, PC-1.

## Security

Probe mode fired, because the deliverable is an input boundary. **25 candidates executed** against
`parse-target.sh#parse_target` (14 hostile, 11 legitimate): 0 reproduced, 0 escapes. Hostile cases
include command substitution, newline forging, look-alike hosts and the four CR-1 host-bypass shapes.

## DoD History

Run 1 found one gap. `CHANGELOG.md` said "two" stale test comments where the diff corrects three.
PC-1 had already flagged it, but the QA loop's carry rule fixes doc-only findings only on CONCERNS,
not on APPROVE (observation #109). The gap was fixed in `5c4cf010`. Run 2 accepted, with CI
reading 1 SUCCESS on that head.

## Known Limitations / Follow-ups

- Observation #109: when 5c returns APPROVE, its doc-only findings should be applied, or finalise
  Step 8a should be able to close them. Today the pipeline can only halt on them.
- Observation #108: plan fixture literals are not checked against the banned-name guard.
