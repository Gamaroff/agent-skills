# Sprint Review Summary - The hotfix runbook predates /develop-bug's hotfix model and never mentions it

**Story/Task ID:** task.112
**Epic:** _(standalone task — milestone "Technical Tasks (standalone)")_
**Completed Date:** 2026-09-17
**Completed By:** Claude (develop-task pipeline, dispatched by /develop-next)
**Pull Request:** [#414](https://github.com/Gamaroff/agent-skills/pull/414)

---

## Summary

`docs/runbooks/hotfix.md` documented a seven-step manual loop and never mentioned the pipeline that actually owns production hotfixes. It is rewritten against `/develop-bug`'s hotfix branch model in the satellite shape task.107 gave `bug-fix.md`, and two doc drifts found in the same sweep are closed alongside it.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC1 — `hotfix.md` names `/develop-bug`, the Phase 0d hotfix answer, and the pipeline's actual step order for a hotfix
- [x] SC2 — the bug is filed before the branch is cut, and the page says which mode (general bug by default; story/task bug when the parent is still open)
- [x] SC3 — the back-merge to `develop` is a pipeline-recorded step (Issues Log at Step 4), not only a pitfall
- [x] SC4 — the tag step survives as an explicit human action (Phase C)
- [x] SC5 — "Force-pushing main is never authorised" survives byte-identical
- [x] SC6 — both tracker arms named; every link resolves; 141 ≤ 150 lines
- [x] SC7 — `workflows.md` describes the plain-language lead; `faq.md` "Step 5c" links to its definition

### Key Features Implemented

- **`hotfix.md` rewrite**: Before you start → When to use → Pick the bug mode → Pipeline diagram → Phase A (file the bug) → Phase B (`/develop-bug`, Q1 = production hotfix, the per-step hotfix differences, both tracker arms) → Phase C (human: merge, tag via `release.sh --patch`, merge-back) → Pitfalls → Verification → See also
- **`workflows.md` "What the pipelines post"**: the plain-language lead every tracker comment and summary-level PR comment opens with, attributed to the shared engine, scoped exactly as the spec states
- **`faq.md` Step 5c link**: the bare token now links to `qa-flow.md` Phase 3b, the heading that defines it

---

## Technical Details

### Files Modified/Created

- `docs/runbooks/hotfix.md` - rewritten (62 → 141 lines)
- `docs/operations/workflows.md` - `### What the pipelines post` under Cross-cutting references
- `docs/reference/faq.md` - "Step 5c" linked to its definition
- `docs/runbooks/README.md` - hotfix row names `/develop-bug`'s hotfix model
- `CHANGELOG.md` - `[Unreleased] → Changed` entry `(task 112)`
- `docs/tasks/task-registry.md` - task 112 row ticked `accepted` (by `/finalise`)
- Pipeline artifacts beside the task: review 1, implementation 1, QA 1–3, gates 1–3, PR review 1, DoD 1, this summary

### Architecture/Design Decisions

- Written from the skill, not the old page: every step claim cites `develop-bug/SKILL.md` (Phase 0d Q1, Step 1 `--hotfix`, Step 4 `--base main`, the merge-back note) and `develop-bug-step-0-resolve-bug.md` §0d.
- The tag stays human, per `docs/contributing/releases.md`, and the page says so in three places (line 20, Phase C heading, diagram) rather than implying the pipeline does it.
- Sources are cited by identity (skill + step), not line number, so the page does not go stale on the next edit of the skill.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None — documentation only

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** none added (documentation); `changelog-entry-drift.test.mjs` 6/6 gates the CHANGELOG citation per PR
- **Per-PR lanes:** test, shellcheck, link-check, branch policy — all SUCCESS on `8ca961c1`
- **Local gates:** `npm run ci:fast` green on every commit; `markdown-link-check` 70 links / 0 dead; anchor slugs recomputed by hand; fence parity even

### Code Review

- QA: 3 cycles — gate 1 CONCERNS 90 (4 LOW spec-accuracy sentences), gate 2 PASS 100 (1 LOW stale figure, refute pass), gate 3 PASS 100 clean
- Step 5c `/review-pr`: APPROVE — 0 conformance findings, 1 advisory low (`hotfix.md:68` phrasing vs §0d)

## Security & Compliance

### Security Review

PASS — not a boundary deliverable; no secrets, no unsafe patterns, no security TODOs; documented commands read-only or plain merge/push; force-push prohibition retained.

### Compliance Review

N/A — no personal data, payment, UI or healthcare surface.

## Documentation

### Updated Documentation

The deliverable is documentation; see Files Modified. CHANGELOG cites `(task 112)`.

### Documentation Links

- [`docs/runbooks/hotfix.md`](../../runbooks/hotfix.md) · [`docs/operations/workflows.md`](../../operations/workflows.md) · [`docs/reference/faq.md`](../../reference/faq.md)

## Demo Notes

### How to Verify

```bash
grep -c 'develop-bug\|review-bug\|tracker\|review-pr' docs/runbooks/hotfix.md   # 15 (was 0)
wc -l docs/runbooks/hotfix.md                                                  # 141
grep -Fx -- '- **Force-pushing main is never authorised by this runbook.** If you need to undo a merge, do it with a revert commit.' docs/runbooks/hotfix.md
grep -n 'What the pipelines post' docs/operations/workflows.md
sed -n 25p docs/reference/faq.md | grep -o 'qa-flow.md#[a-z0-9-]*'
```

### Screenshots/Visuals

Mermaid flowchart in `hotfix.md` §Pipeline diagram (11 nodes: file → develop-bug → hotfix branch → review-bug gate → fix → PR to main → merge → human tag → merge-back).

## Impact & Value

### User Impact

A developer reaching for the hotfix page under pressure now gets the same record, gate and tracker card as any bug, with the branch model the only difference — and the back-merge is written down by the pipeline instead of remembered.

### Technical Impact

The two bug runbooks share one shape and one vocabulary; the plain-language lead behaviour (tasks 104–106) is documented where consumers read.

## Known Limitations & Future Work

### Current Limitations

- Advisory: `hotfix.md:68` says Phase 0d "asks three branch questions"; §0d derives Q2/Q3 from Q1 in the normal case — the table beneath already says so. One-clause reword on the next touch of the page.
- The tag and the merge-back remain human actions by design; the page documents rather than automates them.
