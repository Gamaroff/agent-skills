---
name: roadmap-selection
description: Deterministic selection algorithm and marker vocabulary for picking the next actionable item from docs/development/project-completion-roadmap.md. Consumed by develop-next Step 1.
---

# Roadmap Selection Rules

Source document: `docs/development/project-completion-roadmap.md`. The roadmap's own "How to use this document" section is authoritative; these rules operationalize it for unattended selection. When the two disagree, the roadmap wins — HALT and report the discrepancy rather than guessing.

## Marker vocabulary

| Marker | Meaning | Selection effect |
|---|---|---|
| `[ ]` / `[x]` | outstanding / accepted | Only `[ ]` rows are candidates; `[x]` satisfies deps |
| `deps:` | blocking prerequisites | Every entry must be `accepted`, ticked `[x]`, or *(shipped)* |
| *(shipped)* | dep already delivered | Counts as satisfied |
| `gate:` | **ship/launch** gate | Does **not** block building — the gated feature may be developed and merged, it just must not be publicly exposed before the gate lands. Never blocks selection. |
| `flag:` | feature-flagged soft dep | Never blocks selection |
| `‖` | parallelizable sibling | Take siblings in listed order (v1 is sequential; worktree parallelism is out of scope) |
| `→` | sequential chain (epic header "Flow") | Later chain members are ineligible until earlier ones are accepted, even if their `deps:` line looks satisfied |
| `manual` | operator action (e.g. 5.7) | Never auto-select → STOP, notify |
| `⛔ BLOCKED …` | explicit block annotation | Skip until the named items are accepted |
| `🚧` | legal/ops-gated (e.g. Epic 25 on 14.7) | Never auto-select |
| `/develop-story` / `/develop-task` | the command to dispatch | Runnable |
| `/create-story` / `/create-epic` | planning gap | Run the authoring command, then STOP for review |

Sections that are never candidates: **Deferred / human-gated operations**, **Housekeeping**, the Change Log, and any `[x]` row.

## Algorithm

1. **Phase scope.** Find the earliest phase (`PHASE 1` → `PHASE 2 planning gap` → `PHASE 2 execution` → `PHASE 3`) containing at least one candidate `[ ]` row. Phases are hard boundaries — never select from a later phase while an earlier one has *eligible* items. If an earlier phase has outstanding items but **none are eligible** (all `manual`/blocked), that is a stop condition, not permission to skip ahead — STOP and report, the operator decides.
2. **Scan top-to-bottom** within the phase. For each `[ ]` row, check in order: not `manual`/`⛔`/`🚧` → epic-header flow position satisfied → all `deps:` satisfied. First row passing all checks wins.
3. **Epic-order preference.** Within Phase 2 execution, the section order already encodes the ratified epic sequence (15 → 17 → 10 → 11 → 12 → 13 → 21 → 18 → 19 → 20 → 22 → 23 → 24) — top-to-bottom scanning honours it automatically; do not re-derive or re-optimize the order.
4. **Record the rationale**: selected item id, its deps and their states, and every earlier `[ ]` row skipped with the one-line reason (blocked-by-X, manual, flow-chain, gated).

## Worked examples (as of roadmap v6.10)

- **5.1a** (Phase 1, production stack) — deps `staging *(shipped)*` satisfied, task row with `/develop-task`, nothing above it → **selected first**.
- **5.7** — `manual`, deps 5.1a. Once 5.1a is accepted this becomes the first outstanding Phase-1 item → STOP (human-gated), even though Phase 2 has eligible items.
- **11.5** (Phase 2 planning gap) — deps 11.1/11.3 unaccepted → skip; scan continues into Phase 2 execution only when the planning-gap section has no eligible rows *and no blocked-but-pending rows that gate execution items* (11.5 gates only 11.3's ship, so execution may proceed).
- **17.1** — first Phase-2 execution candidate: deps 8.3/8.5 *(shipped)*; Epic 15 above it is fully `[x]`.
- **17.4 ‖ 17.3-1** — after 17.2, take `17.4` before `17.3-1` (listed order among eligible rows; both have satisfied deps at that point).
- **13.4** — carries `⛔ BLOCKED until 13.1-1 accepted` → skip until 13.1-1 is `[x]`.
- **25.x** — `🚧 gated on 14.7` → never auto-selected; the epic's own "Unblock sequence" row prescribes the manual path.
