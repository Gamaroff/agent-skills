# Sprint Review Summary - /review-pr resolution edge cases

**Story/Task ID:** task.177
**Completed Date:** 2026-10-03
**Completed By:** /develop-task pipeline (run 1)
**Pull Request:** [#557](https://github.com/Gamaroff/agent-skills/pull/557)

---

## Summary

`/review-pr` now resolves four targets it used to get wrong: a `.env` `JIRA_URL` with a trailing
comment, a repository with no `docs/`, a URL pasted without `https://`, and a PR number that only a
DoD summary carries. Each one used to halt the run, warn falsely, or anchor the review on the wrong
document.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A commented `.env` `JIRA_URL` on the same host produces no warning (bash, zsh)
- [x] A repository with no `docs/` continues past rung 1; §0a still halts when called directly
- [x] Scheme-less GitHub, Jira and Bitbucket URLs parse as their `https://` forms; real branch names stay branches
- [x] Step 2 rung 2 never returns an artifact
- [x] No extra network call for a PR target
- [x] Tests green, each fix mutation-proven; shellcheck, bundle check and full suite green
- [x] No migration beyond `setup-consumer.sh --update`

### Key Features Implemented

1. **Scheme-less platform URLs** — `github.com/o/r/pull/12` and its Jira and Bitbucket forms parse as
   URLs. Only a known platform host in the first segment counts (port stripped, case folded).
2. **`.env` inline comments** — Step 0b takes the inside of the first quote pair, or strips an
   unquoted ` #…` tail.
3. **Docs guard** — a repository with no `docs/` binds `DOC_FILE=""` and continues to rung 4 or a
   code-only review, instead of halting in §0a.
4. **Rung 2 work-item filter** — rung 2 is the §0a lookup with `KEY_FIELD=pr_number`, so a DoD
   summary carrying a `pr_number` is no longer taken for the work item.

---

## Technical Details

### Files Modified/Created

- `skills/review-pr/scripts/parse-target.sh` — scheme-less known-host re-parse
- `skills/review-pr/SKILL.md` — Step 0b `.env` parse, Step 1a docs guard, Step 2 rung 2
- `skills/review-pr/tests/review-pr.test.js` — 247 tests (was 208)
- `CHANGELOG.md` — [Unreleased] › Fixed (task 177)
- `docs/tasks/task.178.…/task.178.plan.….md` — one dead link quoted as code (pre-existing CI red)

### Architecture/Design Decisions

- **Known platform hosts only.** The task also proposed re-parsing any dotted host followed by a PR,
  issue or browse marker. QA cycles 1–2 showed every such guess reads a real branch convention as a
  host (`v2.0/browse/x`, `jane.doe/fix/issues/123`), so it was dropped. Self-hosted URLs keep their
  scheme.
- **Rung 2 cites §0a rather than restating its grep.** The work-item rule is defined once.

### Dependencies

None added.

---

## Testing & Quality Assurance

### Test Coverage

- `review-pr.test.js`: 247/247 under bash and zsh
- Fast gate (`npm run ci:fast`): 5194 pass, 0 fail
- Mutation proofs: every fix reverted turns its named tests red

### Code Review

- QA cycles: 3 — gate 1 CONCERNS (80), gate 2 CONCERNS (90), gate 3 PASS (100)
- Step 5c `/review-pr`: APPROVE (4 low findings, carried to follow-up)

---

## Security & Compliance

### Security Review

- `parse_target` is a boundary and was probed: 62 candidates executed under bash and zsh at the DoD,
  0 reproduced, 0 legitimate forms refused.

### Compliance Review

Not applicable — developer tooling.

---

## Documentation

### Updated Documentation

- `skills/review-pr/SKILL.md`
- `CHANGELOG.md`

### Documentation Links

- Task: `docs/tasks/task.177.review-pr-resolution-edge-cases/task.177.review-pr-resolution-edge-cases.md`
- DoD: `docs/tasks/task.177.review-pr-resolution-edge-cases/task.177.dod.1.review-pr-resolution-edge-cases.md`

---

## Demo Notes

### How to Verify

```bash
bash skills/review-pr/scripts/parse-target.sh github.com/o/r/pull/12   # kind=pr pr=12
bash skills/review-pr/scripts/parse-target.sh jane.doe/fix/issues/123  # kind=branch
command node --test skills/review-pr/tests/review-pr.test.js
```

---

## Impact & Value

### User Impact

Pasting a URL without its scheme, keeping a comment in `.env`, or reviewing in a repository without
`docs/` now works as people expect.

### Technical Impact

Rung 2 uses the same anchored work-item lookup as every other key lookup.

---

## Known Limitations & Future Work

### Current Limitations

- A scheme-less self-hosted URL is read as a branch name; type its `https://`.

### Suggested Follow-Up Stories

- `?`, `#` or `user@` in a scheme-less first segment (PR review CR-1); parser and SKILL.md comment
  wording, including the KIND table (CR-2); a `.env` value that is only a comment (CR3-1, pre-existing);
  stale test comments (CR3-2); §0a KEY_FIELD contract lists `pr_number` (CR3-3); docs-guard test
  title (CR3-4).
