# PR Review Report: PR #318 — feat(task.84): skill install profiles with dependency closure

**Reviewed:** 2026-09-05
**PR:** [#318](https://github.com/Gamaroff/agent-skills/pull/318) — `feature/task.84.skill-install-profiles` → `develop` (OPEN)
**Work item:** [`task.84.skill-install-profiles.md`](./task.84.skill-install-profiles.md) — resolved via `branch stem`
**Tracker:** [#317](https://github.com/Gamaroff/agent-skills/issues/317) — OPEN
**Verdict:** 🚨 **REQUEST CHANGES** (findings addressed in-cycle; see Disposition)

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.84.implementation.1.*.md` |
| Review report | ✅ | `task.84.review.1.*.md` |
| QA reports | 3 | `task.84.qa.{1,2,3}.*.md` |
| Gate | **CONCERNS ×3** | `gate.{1,2,3}` — none PASS (80/100 each) |
| DoD | ❌ | Step 7 has not run |
| Sprint review | ❌ | Step 7 has not run |
| Open bugs | 0 | — |
| Handover | ❌ | none needed (`access.tracker` is full) |

> **A deviation to record rather than bury.** The QA loop's documented precondition for reaching Step 5c is a gate reading `PASS` or `WAIVED`. No gate here does. 5c was run anyway, deliberately: an independent lens is exactly what three CONCERNS cycles said was missing, and withholding it *because* the gates were CONCERNS would be the wrong way round. It found ten things, four of them HIGH, so the deviation paid for itself.

---

## Acceptance Criteria Traceability

19 of 21 met with named evidence. The two that are not:

| Criterion | Evidence | Status |
|---|---|---|
| `shellcheck scripts/setup-consumer.sh` no new warnings | **NONE** — never run; no lane exists (task 92) | ❌ **unmet / unverified** |
| A real `--update` against a full existing install verified to remove nothing | `--update --dry-run` against 6 skills; a dry run writes nothing by construction | ⚠️ **partial** |

Both were **ticked `[x]` in the shipped document** before this review. That was a blanket checkbox pass, not an assessment, and it asserted completion that all three gates and the implementation report contradicted. Corrected.

---

## Conformance Findings

- **[PC-1] coverage · high** — `shellcheck` criterion ticked without being run. **Fixed**: unticked, marked UNVERIFIED with the task-92 dependency named.
- **[PC-2] coverage · high** — "real `--update`" criterion ticked on dry-run evidence against 6 skills. A dry run cannot exercise the destructive path. **Fixed**: downgraded to partial with the real evidence stated, and the weakness named as sitting on the only code path that deletes user files.
- **[PC-3] trail · high** — the implementation report said cycle 3 found "one finding, 11 → 5 → 1"; the artifacts record five, two HIGH. Written before the confirmation pass reported, never updated. Task doc also said "CONCERNS (2 cycles)" and omitted cycle 3 links and Change Log row. **Fixed**.
- **[PC-4] trail · high** — all 21 criteria ticked while three gates read CONCERNS, no DoD exists, and the report status is In Progress. **Fixed** with a standing note at the head of §9.
- **[PC-5] consistency · medium** — §6 Phase 1 and §10 Risk 1 still described the abandoned prose-scrape. **Partially fixed** (Phase 1 rewritten; Risk 1 outstanding).
- **[PC-6] consistency · medium** — the plan still ships the old generator with no superseded note. **Outstanding.**
- **[PC-7] consistency · medium** — §3's edge table lists prose-derived edges that do not match the shipped declarations. **Outstanding.**
- **[PC-8] scope · medium** — `invokes:` is a new authoring contract documented nowhere; a future orchestrator ships with zero edges silently. **Outstanding.**
- **[PC-9] scope · low** — `paths:` narrower than the plan; bundle-check trigger gap. **Outstanding.**
- **[PC-10] coverage · low** — the PR edits one of its own acceptance criteria. Audited: legitimate, made at Step 2 before implementation, recorded with reason, substance preserved. **No action.**
- **[PC-11] consistency · low** — stale test count; wizard step table lacks a profile row. **Outstanding.**

## Code Review Findings

- **[CR-1] bug · high** — `parseInvokes` classified the value **before** stripping the trailing comment, so `invokes:  # note` + a block list returned `[]` silently; zero-indent blocks likewise. The **fourth consecutive incomplete fix to this function**. **Fixed by restructuring** (strip, then classify) rather than adding a fourth shape, plus an exhaustive 20-shape matrix in the drift suite. Mutation-proven.
- **[CR-2] bug · medium** — the dry-run success path captured the CLI's stderr and deleted it unread, swallowing the exclude-conflict warnings the real install prints. **Fixed.**
- **[CR-3] bug · medium** — `_dry_cli` resolves from `BASH_SOURCE`, which is `/dev/fd/NN` under the advertised `bash <(curl …)`, so the preview never fires for real consumers and said "unavailable" as if transient. **Fixed** — names the structural reason.
- **[CR-4] bug · medium** — `minimal ⊄ pipeline`: `create-issue` was in the narrower tier only, while the wizard presents the three as tiers. **Fixed**, with a subset test. Mutation-proven.
- **[CR-5] bug · low** — `"(profile seed)"` merged into `requiredBy` produced "drop (profile seed), develop-story from your profile" — unactionable. **Fixed**: origin tracked separately, two distinct sentences.
- **[CR-6] bug · low** — bare `_dry_err=$(mktemp)` under errexit. **Fixed** (`|| _dry_err=""` plus guards).

**One finding I raised and then withdrew.** I flagged trailing `[[ -n "$x" ]] && cmd` as an errexit hazard, tested both forms, and neither aborts — bash exempts a failing command inside an `&&` list unless it is the final one. Recorded because asserting a bug that does not exist is its own failure mode, and I would have done it without the test.

---

## Disposition

Every HIGH and every medium code finding is fixed in-cycle, mutation-proven where mutable, with the mutation **asserted to have applied** before the result was believed. Six conformance findings remain outstanding — all documentation consistency, none affecting behaviour.

## Recommended Actions

1. **Human review before merge.** Four QA cycles, 27 defects, and every cycle found the previous cycle's fixes defective — with the same author throughout. `setup-consumer.sh` can delete a consumer's installed skills, and the criterion covering that path is the one still unverified.
2. Run `shellcheck` (task 92's lane, or `docker run koalaman/shellcheck`) — it would very likely have caught C3-001.
3. Perform a genuine non-dry `--update` against a full install and record before/after counts.
4. Clear PC-5 … PC-9, PC-11 (documentation consistency).
5. Document `invokes:` in `create-skill` — a new authoring contract with no authoring documentation.
