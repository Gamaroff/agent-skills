---
type: dod-verification
status: complete
bug: 'bug.12.review-syncs-relink-without-no-transition'
verified: '2026-09-06'
description: 'Definition of Done verification for bug.12 — bug-shaped DoD run inline, every criterion evidenced by a reproducible command.'
---

# Definition of Done Verification — bug.12

**Bug:** bug.12.review-syncs-relink-without-no-transition
**Verified:** 2026-09-06
**Status:** COMPLETED — SATISFIED
**PR:** [#330](https://github.com/Gamaroff/agent-skills/pull/330)

## Method note (read this first)

`/finalise` was invoked and its **inline fallback** was taken deliberately, as the skill sanctions
for a document type it cannot process. Its four parallel DoD agents are built around story/task
documents: the AC-traceability agent needs acceptance criteria and the compliance agent needs a
parent story, and a **general** bug has neither. Running them would have produced four
`NOT_APPLICABLE` sections and no evidence.

So this is a bug-shaped DoD — fix present, regression test fails-without/passes-with, suite + lint
green, no new security surface — run inline and recorded here, which is the condition the fallback
carries. Same approach as `bug.11.dod.1`.

Every criterion below cites a command that reproduces its evidence.

---

## 1. The fix is present at every site the bug names ✅

```bash
grep -n -- '--no-transition' skills/review-story/SKILL.md skills/review-task/SKILL.md skills/review-epic/SKILL.md
```

All three body/link-only syncs carry the flag: `review-story` Step 9.6, `review-task` Step 8.6,
`review-epic` Step 11.5.

**And the site that must NOT have it does not** — `review-story` Step 10, the one deliberate status
push among these skills, is unflagged and carries a note saying why:

```bash
sed -n '2140,2150p' skills/review-story/SKILL.md   # command has no --no-transition; note explains
```

## 2. A regression test fails without the fix and passes with it ✅

```bash
node --test shared/resources/tests/jira-sync-no-transition.test.mjs   # 23 pass, 0 fail
```

Tests **G** (population invariant), **G2** (no stale allowlist entries), **G3** (the three bug.12
sites pinned by name) and **G4** (heading attribution survives nested fences).

**Mutation-proved — the fails-without property was established by execution, not assertion:**

| Mutation | Result |
|---|---|
| Remove the flag at `review-story` 9.6 | G + G3 red |
| Remove the flag at `review-task` 8.6 | G + G3 red |
| Remove the flag at `review-epic` 11.5 | G + G3 red |
| Add a **new** un-flagged body-only invocation under a fresh heading | G red |
| Rename an allowlisted heading (allowlist rot) | G + G2 red |
| Make any same-char fence close (drop CommonMark length/info discrimination) | G4 red |

The fourth row is the one that matters most: it is the *next* silent addition, which is the failure
mode that produced this bug.

**Two mutation attempts were rejected as invalid before a valid one was found**, and are recorded
rather than quietly replaced: the first broke the test file's syntax (0 tests ran — proves nothing);
the second used an even-count fence block that the naive toggle recovers from, so old and new logic
agreed. A mutation that does not reproduce the defect is worse than none, because it gets logged as
proof.

## 3. Suite + lint green ✅

```bash
npm run ci:fast   # → 2505 pass, 0 fail; "All matched files use Prettier code style!"
```

Log: `.claude/state/bug12-fixgate-1.log`. Prettier failed on the first run of the new test file and
was fixed — recorded because that is precisely the miss that made `npm run ci` the merge gate.

## 4. CI green on the final commit, not an ancestor ✅

```bash
gh pr view 330 --json headRefOid   # 00030655…
git rev-parse HEAD                 # 00030655… — identical
```

All five checks SUCCESS on `00030655`: `test`, `validate`, `link-check`, `shellcheck`, branch-policy.
CI was **waited for**, not assumed — the rollup was polled to completion rather than sampled once.

## 5. No new security surface ✅

The change adds a CLI flag to three documented command lines and adds a test. It removes an
outbound write (a status transition) and adds none. No new input parsing, no new credential handling,
no new network call. `syncDocumentStatus`'s gate returns **before** any HTTP is issued.

## 6. Repo conventions hold ✅

```bash
npm run bundle            # exit 0, no drift
npm run generate-catalog  # exit 0, no drift
```

Two convention traps were hit and fixed during the run, both recorded in the implementation report:
naming a `shared/resources/…` path in shipped prose makes the bundler try to copy that file into the
skill (it crashed on the nested `tests/` dir), and the bundler then **rewrote the path inside my own
explanatory sentence**, leaving it circular. Both fixed; `npm run bundle` is now stable across runs.

## 7. The trail is honest about what did not happen ⚠️ recorded

The full-PR adversarial code review **did not complete** — the subagent ran ~17 minutes without
returning and was stopped. Its one substantive lead (the fence desync) was reproduced independently,
and the four other risks it had been asked about were verified in-line by the orchestrator. A second,
scoped review of the cycle-1 diff completed clean.

This is a thinner independent-review trail than a clean full-PR pass. It is recorded as a gap rather
than smoothed over, because a missing review that reads like a passing one is the failure this note
exists to prevent. It is **not** treated as DoD-blocking: the invariant under review is asserted by
six executed mutations, which is stronger evidence than a review opinion.

---

## Verdict

**✅ DoD SATISFIED** — 6 criteria met, 1 gap recorded and judged non-blocking with reasons.

The bug is fixed at all three sites, the fix is held by four tests each proved to fail without it,
the full local gate and all five CI checks are green on the exact commit, and the deliberate
status-push site is verified as still deliberate.
