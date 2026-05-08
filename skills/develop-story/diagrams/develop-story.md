# `develop-story` — Harness & Sub-Skill Interaction

Deep-dive review of `skills/develop-story/SKILL.md` plus the eight `develop-pipeline-step-*.md` protocol files in `shared/resources/` that define its 8-step pipeline.

---

## Technical Summary

`develop-story` is a thin **orchestrator** (~240 lines of SKILL.md). Almost all real logic lives in `develop-pipeline-*.md` files under `shared/resources/`, loaded on-demand per step (progressive disclosure). It coordinates 8 sub-skills sequentially and maintains a co-located **implementation report** as the single source of truth for state and audit trail.

### External touchpoints

| Surface | Operations |
|---|---|
| **Filesystem** | story file (read/append `[x]`), implementation report (`story.{e}.{s}.implementation.{N}.*.md`), review report, plan file, gate file (`.yml`), QA report, DoD summary, lock file `.claude/state/develop-pipeline.lock` |
| **Git** | branch create, stash/pop, commits via `/commit-changes` only, `git push origin HEAD` after every QA cycle + final |
| **GitHub** | `gh issue comment/close/view`, GraphQL project-board mutation (Todo→In Progress→Done), PR creation via `/create-pr` |
| **Jira** (Atlassian MCP) | `getJiraIssue`, `addCommentToJiraIssue`, `getTransitionsForJiraIssue`, `transitionJiraIssue` (In Progress → In Review → Done) |
| **Subagents** | `Explore` for file resolution (Phase 0a) and pre-develop codebase surface map (Phase 3) |

### State changes

- **Files created**: feature branch, implementation report, lock file, review report, gate `.yml`, QA report, DoD summary file, PR
- **Files mutated**: story file (status frontmatter, `[x]` task ticks), implementation report (Pipeline Progress table, Decisions Log, Issues Log, QA Iteration History), lock file (`current_step`, `pr_url`)
- **Tracker fields**: GitHub issue state (open→closed) + project board status; Jira `status` transitions + comments
- **Git refs**: feature branch HEAD, remote branch (push after every QA cycle), PR HEAD

### Efficiency / bottlenecks

1. **QA loop dominates wall-clock.** Up to 5 cycles of `/qa-story` + `/qa-fix` + commit + push. Each `/qa-story` may itself spawn parallel agents (suppressed in `lite` mode).
2. **Iterative develop loop** (`MAX_ITER=5` with stall detection). Cheap when the loop short-circuits on `Ready for Review`; pathological when status oscillates.
3. **Context bloat risk** — mitigated by mandatory "Context Management Rule" (drop intermediate file contents between steps) and the Explore subagent that returns ≤20-file summaries instead of full reads.
4. **Tracker calls are best-effort, non-blocking** — failures log a warning and continue, so a flaky Jira/GitHub never wedges the pipeline. Tradeoff: silent drift between local state and tracker possible.
5. **Single-path lock** (`.claude/state/develop-pipeline.lock`) prevents concurrent pipelines per repo; collision check is the very first action of Step 1.
6. **PreCompact hook** (optional) gives graceful pause before context compaction by writing report entry, committing, pushing, and posting a PR comment — all best-effort. Without it, post-compaction recovery still works via the implementation report's Pipeline Progress table + per-step artifact verification.
7. **Implementation report exclusion** (`--exclude` pathspec to `/create-pr`) is deterministic — no race with auto-staging.
8. **Push-per-cycle** keeps PR current but is wasteful on slow remotes; no batching toggle exists.

### Notable design choices

- All commits go through `/commit-changes` (never raw `git commit`) → consistent Conventional Commits.
- Gate files are read-only to dev skills; only QA skills mutate them.
- Step banners + lock `current_step` updates create checkpoints that survive context compression.
- Resume verifies each ✅ step's *artifact* on disk — does not trust the report alone.

---

## Sequence Diagram

> **Note**: Mermaid treats `;` as a statement separator inside messages — do not use semicolons in arrow labels or notes.

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#1f2937",
    "primaryTextColor": "#f3f4f6",
    "primaryBorderColor": "#9ca3af",
    "lineColor": "#9ca3af",
    "actorBkg": "#1f2937",
    "actorBorder": "#9ca3af",
    "actorTextColor": "#f9fafb",
    "actorLineColor": "#9ca3af",
    "signalColor": "#e5e7eb",
    "signalTextColor": "#e5e7eb",
    "labelBoxBkgColor": "#374151",
    "labelBoxBorderColor": "#9ca3af",
    "labelTextColor": "#f9fafb",
    "loopTextColor": "#f9fafb",
    "noteBkgColor": "#fde68a",
    "noteTextColor": "#1f2937",
    "noteBorderColor": "#b45309",
    "altBackground": "#374151",
    "sequenceNumberColor": "#1f2937"
  }
}}%%
sequenceDiagram
    autonumber
    actor User
    participant H as Harness<br/>(develop-story)
    participant FS as Filesystem<br/>(report + lock)
    participant EX as Explore<br/>subagent
    participant CB as /create-branch
    participant RV as /review-story
    participant DV as /develop
    participant CP as /create-pr
    participant QS as /qa-story
    participant QF as /qa-fix
    participant FN as /finalise
    participant CC as /commit-changes
    participant Git as Git / Remote
    participant GH as GitHub API<br/>(gh + GraphQL)
    participant JR as Jira MCP

    User->>H: /develop-story path

    rect rgba(99,102,241,0.18)
    note over H: Phase 0 — Resolve & Prepare
    H->>EX: resolve story file/dir
    EX-->>H: absolute path, epic, story
    H->>FS: read story (status, tasks, risk)
    H->>GH: detect tracker / verify board
    H->>FS: create implementation report
    H->>User: Q1 base branch, Q2 PR base, Q3 risk gate
    end

    rect rgba(34,197,94,0.18)
    note over H: Step 1 — create-branch
    H->>FS: check pipeline lock
    H->>Git: stash report
    H->>CB: branch from Q1
    CB->>Git: create feature branch
    CB-->>H: branch name
    H->>Git: stash pop
    H->>FS: write lock current_step=1
    H->>FS: report Step 1 done
    end

    rect rgba(234,179,8,0.18)
    note over H: Step 2 — review-story
    H->>FS: lock.current_step=2
    H->>RV: review story
    RV->>FS: write review report and mutate story status
    RV-->>H: outcome
    H->>FS: report Step 2 done
    end

    rect rgba(239,68,68,0.18)
    note over H: Step 3 — develop loop (MAX_ITER=5)
    H->>EX: pre-develop surface map (max 20 files)
    EX-->>H: file to description summary
    H->>FS: discover plan file (optional)
    loop until status Ready for Review or MAX_ITER
        H->>DV: develop with surface map and plan
        DV->>FS: edit code, tick tasks, set status
        DV->>Git: commits via commit-changes
        DV-->>H: returns
        H->>FS: re-read status and tasks
        H->>H: stall check
    end
    H->>FS: report Step 3 done
    end

    rect rgba(59,130,246,0.18)
    note over H: Step 4 — create-pr
    H->>FS: lock.current_step=4
    H->>CP: --base Q2 --exclude report --issue N
    CP->>Git: commit code excluding report
    CP->>Git: push branch
    CP->>GH: open PR with Closes N
    CP-->>H: PR URL
    H->>FS: lock.pr_url=PR URL
    alt tracker is Jira
        H->>JR: addCommentToJiraIssue PR opened
        H->>JR: transitionJiraIssue to In Review
    else tracker is GitHub
        note over CP,GH: create-pr already commented via Closes N
    end
    H->>FS: report Step 4 done
    end

    rect rgba(217,70,239,0.18)
    note over H: Steps 5–6 — QA loop (max 5 cycles)
    loop until PASS or 5 cycles
        H->>QS: qa-story with lite mode flag if set
        QS->>FS: write gate yml and qa report
        QS-->>H: gate result
        alt PASS and no top_issues
            note over H: exit loop
        else CONCERNS or FAIL
            H->>QF: qa-fix with gate yml
            QF->>FS: code edits
            H->>Git: git diff --stat (no change halts)
            H->>CC: commit fix qa-fix cycle N
            CC->>Git: push origin HEAD
            H->>FS: report QA Cycle N entry
        end
    end
    H->>FS: report Steps 5–6 done
    end

    rect rgba(132,204,22,0.18)
    note over H: Step 7 — finalise and tracker close
    H->>FN: finalise story
    FN->>FS: validate DoD, set status accepted, write dod.md
    FN-->>H: ok or gaps
    alt DoD gaps
        H->>CC: commit report (gaps)
        H->>Git: push
        H-->>User: HALT (DoD gaps)
    else accepted
        alt tracker is GitHub
            H->>GH: gh issue comment, close, verify
            H->>GH: GraphQL board to Done
        else tracker is Jira
            H->>JR: addCommentToJiraIssue complete
            H->>JR: transitionJiraIssue to Done
        end
    end
    H->>FS: report Step 7 done
    end

    rect rgba(20,184,166,0.18)
    note over H: Step 8 — final commit
    H->>FS: report Finished, Final Status Completed
    H->>CC: commit (includes report and dod summary)
    CC->>Git: push origin HEAD
    H->>FS: rm pipeline lock
    H->>FS: report Step 8 done
    end

    H-->>User: Story Development Complete (branch, PR, QA cycles, report)
```

---

## Data Objects Passed

| From → To | Object |
|---|---|
| User → Harness | story path / `#N` / Jira key |
| Harness → Explore | resolution query / surface-map query |
| Explore → Harness | absolute path; file→1-line summary list |
| Harness → `/create-branch` | story path, base branch (Q1) |
| Harness → `/review-story` | story path |
| Harness → `/develop` | story path, surface map, plan file, iteration hint |
| `/develop` → Harness | (returns; harness re-reads story for status/[x]) |
| Harness → `/create-pr` | `--base`, `--exclude {report}`, `--issue N` (GitHub only) |
| `/create-pr` → Harness | PR URL |
| Harness → `/qa-story` | story path, lite-mode flag |
| `/qa-story` → Harness | gate file path, gate result |
| Harness → `/qa-fix` | gate file path |
| Harness → `/finalise` | story path |
| `/finalise` → Harness | accepted | DoD gaps |
| Harness → `/commit-changes` | suggested message, optional `--exclude` |
| Harness ↔ Lock file | `{skill, report_path, branch, pr_url, tracker, tracker_issue, current_step, started_at}` |
| Harness → Tracker | issue state + comments + transitions |

## Final Success State

- `status: accepted` in story frontmatter
- All 8 rows in implementation-report Pipeline Progress = ✅
- PR open with all code + report + DoD summary committed and pushed
- Tracker issue closed/Done with completion comment + board moved
- Lock file removed → repo free for next pipeline run
