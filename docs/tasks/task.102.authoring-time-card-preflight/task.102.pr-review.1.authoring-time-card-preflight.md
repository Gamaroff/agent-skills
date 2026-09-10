# PR Review Report: PR #373 — feat(task.102): run the card preflight where the defect is created

**Reviewed:** 2026-09-10
**PR:** [#373](https://github.com/Gamaroff/agent-skills/pull/373) — `feature/task.102.authoring-time-card-preflight` → `develop` (OPEN)
**Work item:** [`task.102.authoring-time-card-preflight.md`](./task.102.authoring-time-card-preflight.md) — resolved via `branch stem`
**Tracker:** [#372](https://github.com/Gamaroff/agent-skills/issues/372) — OPEN
**Verdict:** ⚠️ **CONCERNS**

**Diff scope:** 16 hand-written files. **32 auto-generated `*/references/*` files excluded** — byte-derived from `shared/resources/` and headed `AUTO-GENERATED — DO NOT EDIT`; reviewing them would have been ~12,000 lines of noise crowding out real findings. A test in this very PR asserts they match their source, which is the check that makes excluding them safe.

**Methodology:** both lenses run inline rather than as parallel Explore subagents — the session carries a standing instruction not to use the Agent tool unless asked. Recorded because it changes what this review is evidence of: one reviewer covering both lenses sequentially, not two independently.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.102.implementation.1.authoring-time-card-preflight.md` |
| Review report | ✅ | `task.102.review.1.authoring-time-card-preflight.md` (8/10, 4 Important all applied) |
| QA reports | 1 | `task.102.qa.1.authoring-time-card-preflight.md` |
| Gate | **PASS** | `task.102.gate.1.authoring-time-card-preflight.yml` (100/100, after 1 fix cycle) |
| DoD | ❌ | Not yet written — Step 7 (`/finalise`) has not run. Correct for this point in the pipeline. |
| Sprint review | ❌ | Same — Step 7 artifact. |
| Open bugs | 0 | — |
| Handover | ❌ | N/A — `access.tracker` is `full`; nothing deferred. |

The trail is complete for a PR at Step 5c. The two ❌ rows are artifacts Step 7 produces and their absence here is correct, not a gap.

---

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 — three `create-*` run the preflight | `skills/create-{task,story,epic}/SKILL.md` (§4.6, §6.2a, §Card Preflight) | ✅ met |
| SC2 — advisory at authoring | `card-preflight.js:main` returns `result.ok \|\| !args.strict ? 0 : 1`; test `A: --strict is the only way to get a non-zero exit` | ✅ met |
| SC3 — `review-*` remains the gate | `review-{task,story,epic}/SKILL.md` untouched in the diff; still 1 `--check-card` each | ✅ met |
| SC4 — one definition + non-vacuity floor | `shared/resources/jira-sync.js:1455-1560`; test `B: … exactly one SOURCE file` asserts exactly 4 hits | ✅ met |
| SC5 — missing Success Criteria produces a finding | test `A: a task missing Success Criteria produces a finding`, fixture reproduces `task.99`'s literal shape | ✅ met |
| SC6 — sync suites unchanged, exports intact | 420 tests green; test `B: every sync-jira-* module still exports its own spec` | ✅ met |
| SC7 — works with no `sync-jira-*` installed | test `C: the preflight runs with no sync-jira-* skill present` (isolated temp dir) | ✅ met |
| SC8 — § 8 answered, placement follows | implementation report § "The § 8 decision" | ✅ met |
| SC9 — `npm run bundle` run, `references/` committed | 32 regenerated files in the diff; re-run produces zero further change | ✅ met |

**9/9 covered by evidence in the diff, not by assertion in prose.** Every criterion traces to a named test or a named file, and the QA report records each as verified by execution.

---

## Conformance Findings

**[PC-1] trail · medium · confidence: high — `task.102.…md` § 9 Files Summary** — **FIXED this review.**
§ 9 listed four bullets and omitted the three files the change actually adds, including
`shared/resources/card-preflight.js` — *the deliverable itself*. A reviewer or a rollback working from
§ 9 would not have known the new CLI existed. It also under-described the generated set: the last
bullet named only `jira-sync.js`, while the diff regenerates `card-preflight.js`,
`authoring-card-preflight.md`, and four first-time copies into `create-epic`.
→ Rewritten as Added / Modified / Regenerated, naming every file.

**[PC-2] consistency · medium · confidence: high — `task.102.…md` § 11** — **deferred to Step 7, by
design.** All nine Success Criteria checkboxes are still `[ ]` while the document's own QA Results
section records 9/9 verified and its gate reads PASS 100. The document currently contradicts its own
gate. `/finalise` is the step that ticks them; flagged here so Step 7 closes it rather than carrying
the inconsistency into an accepted document.

**[PC-3] trail · low · confidence: high — `task.102.…md` § 13 Rollback Plan** — **FIXED this review.**
The rollback said "remove the authoring-time call; revert the spec move independently", written before
`card-preflight.js` and its test suite existed. Following it literally would have stranded a CLI with
no caller and a suite nothing runs. Now names both files, the bundle re-run, and states the two phases
revert in either order.

**Scope check — no drift.** The diff widens beyond the task's original § 4 in exactly one way: it moves
`BUG_CARD_SECTIONS` as a fourth spec. That was a recorded Step 2 review decision with its reasoning in
the document, not silent creep — and it is what makes SC4's "exactly one place" assertable without
enumeration. Everything else maps to a named phase.

---

## Code Review Findings

**[CR-1] bug · medium · confidence: high — `shared/resources/card-preflight.js:main`** — **FIXED this
review.** The qa-fix that resolved T102-001 added `body` to `preflight()`'s return so the parity test
could compare resolved text. That field then flowed straight into the `--json` payload: **17,271 of
18,321 bytes — 94% document**, for every consumer, including anything that captures the output to a
log. A regression introduced by a fix, which is the class of defect a post-QA lens exists to catch.
→ `body` is now destructured out of the JSON emit and kept on the returned object for the test. New
test `B: --json does not emit the document body` asserts the field is absent, the payload is still a
real result, and the whole thing is under 4 KB (it is 597 bytes). Mutation-proved: restoring the leak
turns it red.

**No other correctness findings.** Specifically checked and clear:

- `lib` is required **before** the re-export const in all four `sync-jira-*` scripts — verified by
  line number, not by eye (29/39, 21/31, 21/33, 33/44).
- Nothing mutates a `*_CARD_SECTIONS` array anywhere. The four scripts now share the library's
  objects, so a `push`/`sort` in one would corrupt the others; there is none.
- `process.exitCode` is set rather than `process.exit()` called, so a piped `--json` payload cannot be
  truncated — the `bug.3` failure mode, avoided by construction with a comment saying why.
- `inferKind` returns `null` rather than guessing, and `main` then refuses rather than checking a
  document against the wrong spec.

**Cleanups:** none outstanding. The LOW from QA cycle 1 (unguarded `preflight()`) was fixed in that
cycle.

---

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.102.authoring-time-card-preflight/task.102.authoring-time-card-preflight.md"
    finding: "Files Summary omitted the three files the change adds, including card-preflight.js, the deliverable itself."
    suggested_action: "Rewrite as Added / Modified / Regenerated, naming every file. (Applied.)"
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.102.authoring-time-card-preflight/task.102.authoring-time-card-preflight.md"
    finding: "All nine Success Criteria are unticked while the document's own QA section records 9/9 verified and its gate reads PASS."
    suggested_action: "Tick them in /finalise, where success-criteria verification is recorded."
  - id: PC-3
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.102.authoring-time-card-preflight/task.102.authoring-time-card-preflight.md"
    finding: "Rollback Plan predates card-preflight.js and would strand a CLI with no caller plus a suite nothing runs."
    suggested_action: "Name both new files and the bundle re-run. (Applied.)"
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/card-preflight.js:141"
    finding: "The parity fix's `body` field flowed into the --json payload, making it 94% document (17.3 KB of 18.3 KB)."
    suggested_action: "Destructure body out of the JSON emit; keep it on the returned object for the parity test. (Applied.)"
truncated_count: 0
```

---

## Recommended Actions

1. **Step 7 (`/finalise`) must tick the nine Success Criteria** — PC-2 is the only finding left open,
   and it is open because ticking them is Step 7's job, not this review's.
2. Nothing else blocks. PC-1, PC-3 and CR-1 were applied during this review; the fast gate is green at
   3050 tests, 0 failures, and CR-1's fix is mutation-proved.

**Verdict rationale:** ⚠️ CONCERNS rather than ✅ APPROVE, per the deterministic table — three medium
findings were present at the start of this review. No finding is `severity: high`, so this does not
route back to `/qa-fix`; three of four are already closed and the fourth is Step 7's to close.
