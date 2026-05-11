# Task Registry

**Purpose:** Central tracking for all task numbers in this repo.
**Last Updated:** 2026-05-11
**Next Available Task Number:** **35**

## How to use

### Creating a new task
1. Read **Next Available Task Number** above — that's your `task.[N]`.
2. Run `/create-task` (or follow `skills/create-task/SKILL.md`). It will create:
   - `docs/development/tasks/task.[N].[name]/task.[N].[name].md`
   - `docs/development/tasks/task.[N].[name]/task.[N].plan.[name].md`
3. Add a row to the table below for the new task.
4. Increment **Next Available Task Number**.
5. Commit the registry update **in the same commit** as the new task files (atomic).

### Rules
- Task numbers are globally unique. Never reuse a number, even for a deleted/cancelled task.
- If a merge conflict on the next-number occurs, the higher number wins; the loser bumps to the next free slot.
- Status values follow `shared/resources/document-status-lifecycle.md`: `draft → planned → ready-for-development → in-progress → ready-for-review → accepted` (or `cancelled`).
- `Issue` column links to the GitHub/Bitbucket/Jira tracker issue created at task-creation time. `—` if no tracker.

### Quick commands

```bash
# What's the next number?
grep "Next Available Task Number" docs/development/tasks/task-registry.md

# List all task directories
ls docs/development/tasks/ | grep '^task\.'

# Find a task by keyword
grep -i "<keyword>" docs/development/tasks/task-registry.md
```

---

## Registry

| #  | Title | Status | Category | Priority | Created | Issue | Depends on |
|----|-------|--------|----------|----------|---------|-------|------------|
| 1  | [Extract shared develop-pipeline body into shared/resources (Option C)](task.1.extract-shared-develop-pipeline-body/task.1.extract-shared-develop-pipeline-body.md) | accepted | refactoring | Medium | 2026-05-04 | [#1](https://github.com/Gamaroff/agent-skills/issues/1) | — |
| 2  | [Extract develop-pipeline Step 0–8 bodies into shared resources](task.2.extract-pipeline-step-bodies/task.2.extract-pipeline-step-bodies.md) | accepted | refactoring | Medium | 2026-05-04 | [#3](https://github.com/Gamaroff/agent-skills/issues/3) | task.1 |
| 3  | [qa-fix: add Bitbucket REST + Jira MCP dual-path](task.3.qa-fix-bb-jira-dual-path/task.3.qa-fix-bb-jira-dual-path.md) | accepted | refactoring | High | 2026-05-05 | [#5](https://github.com/Gamaroff/agent-skills/issues/5) | — |
| 4  | [finalise: route warning-path PR comments through PLATFORM branch](task.4.finalise-platform-route-warning-paths/task.4.finalise-platform-route-warning-paths.md) | accepted | refactoring | Medium | 2026-05-05 | [#7](https://github.com/Gamaroff/agent-skills/issues/7) | — |
| 5  | [Add ensure-epic-jira-issue skill and dual-path the call sites](task.5.ensure-epic-jira-issue-skill/task.5.ensure-epic-jira-issue-skill.md) | accepted | infrastructure | High | 2026-05-05 | [#9](https://github.com/Gamaroff/agent-skills/issues/9) | — |
| 6  | [create-epic: verify and add Jira tracker path](task.6.create-epic-jira-tracker-path/task.6.create-epic-jira-tracker-path.md) | accepted | refactoring | Medium | 2026-05-05 | — | — |
| 7  | [skills-config: document explicit tracker and vcs flags](task.7.skills-config-tracker-vcs-flags/task.7.skills-config-tracker-vcs-flags.md) | accepted | documentation | Low | 2026-05-05 | [#12](https://github.com/Gamaroff/agent-skills/issues/12) | — |
| 8  | [Audit create-bug-report and epic-registry-manager for GitHub-only assumptions](task.8.audit-bug-report-and-epic-registry-manager/task.8.audit-bug-report-and-epic-registry-manager.md) | accepted | refactoring | Medium | 2026-05-05 | [#14](https://github.com/Gamaroff/agent-skills/issues/14) | — |
| 9  | [Migrate leaf skills to skills-config.yaml platform-detection resolver](task.9.platform-detection-resolver-migration/task.9.platform-detection-resolver-migration.md) | accepted | refactoring | High | 2026-05-06 | [#16](https://github.com/Gamaroff/agent-skills/issues/16) | — |
| 10 | [Consolidate PR-comment fan-out under finalise](task.10.pr-comment-consolidation/task.10.pr-comment-consolidation.md) | accepted | refactoring | Medium | 2026-05-06 | [#17](https://github.com/Gamaroff/agent-skills/issues/17) | — |
| 11 | [Add tracker-issue dedup guard in review-task and review-story](task.11.review-task-tracker-dedup/task.11.review-task-tracker-dedup.md) | accepted | refactoring | Medium | 2026-05-06 | [#18](https://github.com/Gamaroff/agent-skills/issues/18) | — |
| 12 | [Document the canonical document-status lifecycle and frontmatter/body sync rule](task.12.document-status-lifecycle/task.12.document-status-lifecycle.md) | accepted | documentation | Medium | 2026-05-06 | [#19](https://github.com/Gamaroff/agent-skills/issues/19) | — |
| 13 | [Document caller-supplied context contract in /develop](task.13.develop-caller-context-contract/task.13.develop-caller-context-contract.md) | accepted | documentation | Low | 2026-05-06 | [#20](https://github.com/Gamaroff/agent-skills/issues/20) | — |
| 14 | [Harden implementation-report stash dance in develop pipeline](task.14.implementation-report-stash-hardening/task.14.implementation-report-stash-hardening.md) | accepted | refactoring | Low | 2026-05-06 | [#21](https://github.com/Gamaroff/agent-skills/issues/21) | — |
| 15 | [Delete develop-task shadow directory and gitignore unpacked skill artifacts](task.15.develop-task-shadow-dir-cleanup/task.15.develop-task-shadow-dir-cleanup.md) | accepted | cleanup | Low | 2026-05-06 | [#22](https://github.com/Gamaroff/agent-skills/issues/22) | — |
| 16 | [Add review-story pre-pass: 3 parallel Explore subagents (epic / architecture / codebase-implemented)](task.16.review-story-prepass-subagent/task.16.review-story-prepass-subagent.md) | accepted | refactoring | Medium | 2026-05-08 | [#34](https://github.com/Gamaroff/agent-skills/issues/34) | — |
| 17 | [Add develop-loop iteration audit Explore subagent (story status + git log delta)](task.17.develop-loop-iteration-audit-subagent/task.17.develop-loop-iteration-audit-subagent.md) | accepted | refactoring | High | 2026-05-08 | [#35](https://github.com/Gamaroff/agent-skills/issues/35) | task.26 |
| 18 | [Add develop-loop test-failure triage Explore subagent](task.18.develop-loop-test-failure-triage-subagent/task.18.develop-loop-test-failure-triage-subagent.md) | accepted | refactoring | High | 2026-05-08 | [#36](https://github.com/Gamaroff/agent-skills/issues/36) | task.17 |
| 19 | [Add create-pr diff summariser Explore subagent](task.19.create-pr-diff-summariser-subagent/task.19.create-pr-diff-summariser-subagent.md) | accepted | refactoring | Medium | 2026-05-08 | [#37](https://github.com/Gamaroff/agent-skills/issues/37) | — |
| 20 | [Add pre-qa-story traceability mapper Explore subagent](task.20.qa-story-traceability-mapper-subagent/task.20.qa-story-traceability-mapper-subagent.md) | accepted | refactoring | Medium | 2026-05-08 | [#38](https://github.com/Gamaroff/agent-skills/issues/38) | — |
| 21 | [Add pre-qa-fix QA findings ingester Explore subagent](task.21.qa-fix-findings-ingester-subagent/task.21.qa-fix-findings-ingester-subagent.md) | accepted | refactoring | High | 2026-05-08 | [#39](https://github.com/Gamaroff/agent-skills/issues/39) | — |
| 22 | [Replace finalise serial DoD checklists with 4 parallel Explore subagents](task.22.finalise-dod-parallel-checks/task.22.finalise-dod-parallel-checks.md) | accepted | refactoring | High | 2026-05-08 | [#40](https://github.com/Gamaroff/agent-skills/issues/40) | — |
| 23 | [Add shared tracker state poller Explore subagent](task.23.tracker-state-poller-subagent/task.23.tracker-state-poller-subagent.md) | accepted | infrastructure | Medium | 2026-05-08 | [#41](https://github.com/Gamaroff/agent-skills/issues/41) | task.26 |
| 24 | [Add pipeline-resume stale-context detector Explore subagent](task.24.pipeline-resume-stale-context-detector/task.24.pipeline-resume-stale-context-detector.md) | accepted | refactoring | Medium | 2026-05-08 | [#42](https://github.com/Gamaroff/agent-skills/issues/42) | task.26 |
| 25 | [Pipeline Phase 0 parallel fan-out (resolve + tracker poll + lite-mode detect)](task.25.pipeline-phase-0-parallel-fanout/task.25.pipeline-phase-0-parallel-fanout.md) | accepted | refactoring | Medium | 2026-05-08 | [#43](https://github.com/Gamaroff/agent-skills/issues/43) | task.23 |
| 26 | [Pipeline context-hygiene: persist subagent summaries as artifacts (.summaries/)](task.26.pipeline-subagent-summary-artifacts/task.26.pipeline-subagent-summary-artifacts.md) | accepted | infrastructure | High | 2026-05-08 | [#44](https://github.com/Gamaroff/agent-skills/issues/44) | — |
| 27 | [Add review-task pre-pass: 2 parallel Explore subagents (architecture / codebase-implemented)](task.27.review-task-prepass-subagent/task.27.review-task-prepass-subagent.md) | accepted | refactoring | Medium | 2026-05-08 | [#45](https://github.com/Gamaroff/agent-skills/issues/45) | task.16 |
| 28 | [Validate develop-task pipeline against task.17 iteration audit subagent](task.28.develop-task-loop-iteration-audit-subagent/task.28.develop-task-loop-iteration-audit-subagent.md) | accepted | refactoring | High | 2026-05-08 | [#46](https://github.com/Gamaroff/agent-skills/issues/46) | task.17 |
| 29 | [Wire test-failure triage Explore subagent into develop-task pipeline loop](task.29.develop-task-loop-test-failure-triage-subagent/task.29.develop-task-loop-test-failure-triage-subagent.md) | accepted | refactoring | Low | 2026-05-08 | [#47](https://github.com/Gamaroff/agent-skills/issues/47) | task.18 |
| 30 | [Wire pipeline resume stale-context detector into develop-task orchestrator](task.30.develop-task-pipeline-resume-stale-context-detector/task.30.develop-task-pipeline-resume-stale-context-detector.md) | accepted | refactoring | Medium | 2026-05-08 | [#48](https://github.com/Gamaroff/agent-skills/issues/48) | task.24, task.26 |
| 31 | [Develop-task pipeline Phase 0 parallel fan-out — verification](task.31.develop-task-pipeline-phase-0-parallel-fanout/task.31.develop-task-pipeline-phase-0-parallel-fanout.md) | accepted | refactoring | Medium | 2026-05-08 | [#49](https://github.com/Gamaroff/agent-skills/issues/49) | task.23, task.25 |
| 32 | [Reorganize evals/ from full-flow/ into per-skill structure](task.32.evals-reorganize-per-skill/task.32.evals-reorganize-per-skill.md) | draft | refactoring | Medium | 2026-05-11 | [#67](https://github.com/Gamaroff/agent-skills/issues/67) | — |
| 33 | [Build evals for develop-task pipeline (protocol + step-isolation + smoke)](task.33.develop-task-evals/task.33.develop-task-evals.md) | draft | testing | Medium | 2026-05-11 | [#68](https://github.com/Gamaroff/agent-skills/issues/68) | task.32 |
| 34 | [Build evals for develop-story pipeline (mirrors develop-task + epic-branch + resume coverage)](task.34.develop-story-evals/task.34.develop-story-evals.md) | draft | testing | Medium | 2026-05-11 | [#69](https://github.com/Gamaroff/agent-skills/issues/69) | task.33 |

---

## Notes

- Task 6 has no tracker issue — pre-dates the tracker-on-creation requirement; backfill via `/sync-jira-task` or `gh issue create` if needed.
- Tasks 32-34 are the **Evals Infrastructure** milestone ([#1](https://github.com/Gamaroff/agent-skills/milestone/1)).
- Filenames follow `task.[N].[kebab-case-name].md` per [AGENTS.md](../../../AGENTS.md#file-naming-conventions-used-in-target-projects).
