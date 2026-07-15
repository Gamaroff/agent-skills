---
name: project-completion-roadmap
type: guide
status: active
---

# Widgetworks — Project Completion Roadmap

**Purpose**: living backlog. Completed items are archived out to `roadmap-history.md`,
so a dep that names no current row means "already shipped".

## How to use this document
1. Work top-to-bottom within a phase. Phases are hard boundaries.

### Legend
- `[ ]` outstanding · `[x]` accepted · **deps:** prerequisites · **gate:** ship gate · **flag:** soft dep.

## Status snapshot

| Area | State |
|------|-------|
| Epic 7 | ✅ Complete |

---

# PHASE 1 — Finish the MVP

**⏭️ Skipped / deferred (non-blocking):** production work is removed from Phase-1 scope; the loop steps past it.

- [ ] **5.1a** Replicate the stack into `production` — [task](../tasks/task.5.production/task.5.production.md) · deps: staging *(shipped)* · ⏭️ SKIP — deferred until operator approval (non-blocking) · `/develop-task`
  Provision prod infra; finalise deployment.md.
- [ ] **5.7** Production launch — deps: **5.1a** · manual · ⏭️ SKIP — deferred (non-blocking)
  - [ ] **Privacy-policy / consent step** — add the registration privacy-policy acceptance before launch.
  - [ ] **Terms of Service** — publish a ToS before public launch.

---

# PHASE 2 — Planning gap

- [x] **6.2** Integrity stories — ✅ **COMPLETE** — both halves accepted.
  - [x] **7.5** Server-Side Plausibility Checks — [story](../s/story.7.5.md) · deps: 7.4/8.1 *(shipped)* · ✅ accepted
  - [x] **11.5** Scoped Replay Verification — [story](../s/story.11.5.md) · deps: 11.1, 11.3 context · ✅ accepted
- [x] ~~**6.3** Story-out the Phase 2 epics~~ ✅ Done — every epic is storied-out.

---

# PHASE 2 — Execution (Epics 15 → 17 → 12 → 13 → 25)

## 7.1 · Epic 15 — Service Gateway — [epic.15](../e/epic.15.md) · P2
**Flow: strictly sequential `15.1 → 15.2 → 15.3`.** Upstream: Epic 8/9 *(shipped)*.

- [x] **15.1** Governed Gateway — [story](../s/story.15.1.md) · deps: 8.3 *(shipped)* · ✅ accepted
- [x] **15.2** Cost Governance — [story](../s/story.15.2.md) · deps: 15.1 · ✅ accepted
- [x] **15.3** Observability Dashboards — [story](../s/story.15.3.md) · deps: 15.1, 15.2 · ✅ accepted

## 7.2 · Epic 17 — Access Control — [epic.17](../e/epic.17.md) · P2 — ✅ **COMPLETE**
**Flow: `17.1 → 17.2`.** Upstream: Epics 7–9 *(shipped)*.

- [x] **17.1** Policy Hardening — [story](../s/story.17.1.md) · deps: 8.3/8.5 *(shipped)* · ✅ accepted
- [x] **17.2** Reporting & Takedown — [story](../s/story.17.2.md) · deps: 17.1, 7.2 *(shipped)* · ✅ accepted

## 7.3 · Epic 12 — Rewards — [epic.12](../e/epic.12.md) · P2
**Flow: strict chain `12.1 → 12.2 → 12.3 → 12.4`.** Upstream: Epics 7–9 *(shipped)*.

- [ ] **12.1** Events & Recording — [story](../prd/epics/epic.12.rewards/stories/story.12.1.events-and-recording/story.12.1.events-and-recording.md) · deps: 8.1, 8.2, 7.3 *(shipped)* · `/develop-story`
- [ ] **12.2** Cosmetic Unlocks — [story](../s/story.12.2.md) · deps: 12.1, 7.4 *(shipped)* · `/develop-story`
- [ ] **12.3** Inventory — [story](../s/story.12.3.md) · deps: 12.2, 9.2 *(shipped)* · `/develop-story`
- [ ] **12.4** Avatar Injection — [story](../s/story.12.4.md) · deps: 12.3, 8.1/8.2 *(shipped)* · `/develop-story`

## 7.4 · Epic 13 — Discovery — [epic.13](../e/epic.13.md) · P2
**Flow: `13.1-1 → (13.4 → 13.5)`.** Upstream: Epic 7/8/9 *(shipped)*.

- [ ] **13.1-1** Embeddings & Discovery API — [story](../s/story.13.1-1.md) · deps: 7.2/8.3/8.4 *(shipped)* + pgvector · `/develop-story`
- [ ] **13.2** ‖ Curation Lists — [story](../s/story.13.2.md) · deps: Epic 9 *(shipped)* · **gate: Epic 17** (moderation) · flag: curator surface · `/develop-story`
- [ ] **13.4** Personalized Recommendations — [story](../s/story.13.4.md) · deps: **13.1-1** *(hard — no bespoke `ORDER BY`)*, 7.2/7.4 *(shipped)* · **⛔ BLOCKED until 13.1-1 accepted** · `/develop-story`

## 7.5 · Phase 2 review checkpoint
- [ ] **7.11** Check success metrics against reality; run `/review-prd` before Phase 3.
- [ ] **7.11-NFR2** Measure frame rate against **NFR2 (≥ 55 fps)** — capture a frame trace.

---

# PHASE 3 — Monetization

## 8.1 · Epic 25 — Partner Program — [epic.25](../e/epic.25.md) · P3
- [x] **D4 ruling** — ✅ **pursue**; Epic 25 activated.
- [ ] **25.1** [Partner-Agreement Foundation](../s/story.25.1.md) — foundation for 25.2–25.6 · 🚧 gated on 14.7
- [ ] **Unblock sequence:** when Story 14.7 clears → `/review-story` each of 25.1–25.6, then develop.

## Deferred / human-gated operations

- [ ] Register the self-hosted CI runner · manual
- [ ] **9.9** Rotate signing keys · manual

## Change Log

| Version | Change | Author |
|---|---|---|
| 2.0 | Epic 17 complete | Claude |
