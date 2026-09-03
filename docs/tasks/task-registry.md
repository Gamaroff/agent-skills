# Task Registry

**Purpose:** Central tracking for all task numbers in this repo.
**Last Updated:** 2026-09-03
**Next Available Task Number:** **89**

## How to use

### Creating a new task
1. Read **Next Available Task Number** above — that's your `task.[N]`.
2. Run `/create-task` (or follow `skills/create-task/SKILL.md`). It will create:
   - `docs/tasks/task.[N].[name]/task.[N].[name].md`
   - `docs/tasks/task.[N].[name]/task.[N].plan.[name].md`
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
grep "Next Available Task Number" docs/tasks/task-registry.md

# List all task directories
ls docs/tasks/ | grep '^task\.'

# Find a task by keyword
grep -i "<keyword>" docs/tasks/task-registry.md
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
| 32 | [Reorganize evals/ from full-flow/ into per-skill structure](task.32.evals-reorganize-per-skill/task.32.evals-reorganize-per-skill.md) | accepted | refactoring | Medium | 2026-05-11 | [#67](https://github.com/Gamaroff/agent-skills/issues/67) | — |
| 33 | [Build evals for develop-task pipeline (protocol + step-isolation + smoke)](task.33.develop-task-evals/task.33.develop-task-evals.md) | accepted | testing | Medium | 2026-05-11 | [#68](https://github.com/Gamaroff/agent-skills/issues/68) | task.32 |
| 34 | [Build evals for develop-story pipeline (mirrors develop-task + epic-branch + resume coverage)](task.34.develop-story-evals/task.34.develop-story-evals.md) | accepted | testing | Medium | 2026-05-11 | [#69](https://github.com/Gamaroff/agent-skills/issues/69) | task.33 |
| 35 | [Conform document skills, templates, and standards to the Open Knowledge Format (OKF) v0.1](task.35.okf-conformance-document-skills/task.35.okf-conformance-document-skills.md) | accepted | documentation | Medium | 2026-06-28 | [#162](https://github.com/Gamaroff/agent-skills/issues/162) | — |
| 36 | [Stop setup-consumer.sh generating a jira.statusMap that disables status syncing](task.36.setup-consumer-statusmap-fix/task.36.setup-consumer-statusmap-fix.md) | accepted | refactoring | High | 2026-08-03 | [#184](https://github.com/Gamaroff/agent-skills/issues/184) | — |
| 37 | [tracker-workflow.yaml — a consumer-owned status ladder the pipelines read](task.37.tracker-workflow-config-engine/task.37.tracker-workflow-config-engine.md) | accepted | infrastructure | High | 2026-08-03 | [#185](https://github.com/Gamaroff/agent-skills/issues/185) | — |
| 38 | [Jira: walk the status ladder, and stop the terminal fallback firing on a retargeted done](task.38.jira-ladder-walking/task.38.jira-ladder-walking.md) | accepted | refactoring | High | 2026-08-03 | [#186](https://github.com/Gamaroff/agent-skills/issues/186) | task.37 |
| 39 | [gh-stage.js — a GitHub Projects board engine driven by the workflow ladder](task.39.github-board-stage-engine/task.39.github-board-stage-engine.md) | accepted | infrastructure | High | 2026-08-03 | [#187](https://github.com/Gamaroff/agent-skills/issues/187) | task.37 |
| 40 | [Replace the five inline GitHub GraphQL board blocks with gh-stage.js calls](task.40.github-pipeline-step-wiring/task.40.github-pipeline-step-wiring.md) | accepted | refactoring | High | 2026-08-03 | [#188](https://github.com/Gamaroff/agent-skills/issues/188) | task.39 |
| 41 | [Two new pipeline moments, workflow-file scaffolding, and the develop-bug gap](task.41.pipeline-moments-and-scaffolding/task.41.pipeline-moments-and-scaffolding.md) | accepted | infrastructure | Medium | 2026-08-03 | [#189](https://github.com/Gamaroff/agent-skills/issues/189) | task.38, task.40 |
| 42 | [Canonical Change Log spec and shared engine](task.42.change-log-spec-and-engine/task.42.change-log-spec-and-engine.md) | accepted | infrastructure | High | 2026-08-12 | [#201](https://github.com/Gamaroff/agent-skills/issues/201) | — |
| 43 | [Templates and creation skills emit the canonical Change Log](task.43.change-log-templates-and-creation/task.43.change-log-templates-and-creation.md) | accepted | documentation | High | 2026-08-12 | [#202](https://github.com/Gamaroff/agent-skills/issues/202) | task.42 |
| 44 | [Review and edit skills log their document mutations](task.44.change-log-review-and-edit/task.44.change-log-review-and-edit.md) | accepted | refactoring | High | 2026-08-12 | [#203](https://github.com/Gamaroff/agent-skills/issues/203) | task.42, task.43 |
| 45 | [Pipeline, QA, finalise, and tracker sync write the Change Log](task.45.change-log-pipeline-and-sync/task.45.change-log-pipeline-and-sync.md) | accepted | refactoring | High | 2026-08-12 | [#204](https://github.com/Gamaroff/agent-skills/issues/204) | task.42, task.43, task.44 |
| 46 | [Write relative document links, and stop a fenced `# ` truncating a Jira description](task.46.relative-doc-links-and-fence-aware-sections/task.46.relative-doc-links-and-fence-aware-sections.md) | accepted | refactoring | High | 2026-08-13 | [#216](https://github.com/Gamaroff/agent-skills/issues/216) | none |
| 47 | [The `--json` samples under-document the payload, and nothing checked](task.47.json-output-sample-fidelity/task.47.json-output-sample-fidelity.md) | accepted | documentation | Medium | 2026-08-14 | — | task.46 |
| 48 | [Credentials may live at `.secrets/tooling.env`, and a missing one no longer fails silently](task.48.credential-file-discovery/task.48.credential-file-discovery.md) | accepted | infrastructure | High | 2026-08-14 | — | none |
| 49 | [`setup-consumer.sh` still seeds credentials into `.env`, teaching new consumers the old location](task.49.setup-consumer-secrets-path/task.49.setup-consumer-secrets-path.md) | accepted | infrastructure | Medium | 2026-08-14 | — | task.48 |
| 50 | [Bitbucket REST auth supports Bearer as well as Basic, chosen by variable name](task.50.bitbucket-bearer-auth/task.50.bitbucket-bearer-auth.md) | accepted | infrastructure | High | 2026-08-16 | — | none |
| 51 | [Declare tracker access level in config, and reject an unrecognised one loudly](task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md) | accepted | infrastructure | High | 2026-08-17 | [#225](https://github.com/Gamaroff/agent-skills/issues/225) | none |
| 52 | [One deferred-mutation record, four renderings of it](task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md) | accepted | infrastructure | High | 2026-08-17 | [#230](https://github.com/Gamaroff/agent-skills/issues/230) | task.51 |
| 53 | [Intercept Jira REST mutations in two layers — a fail-closed net and a legible one](task.53.jira-rest-interception/task.53.jira-rest-interception.md) | accepted | refactoring | High | 2026-08-17 | [#231](https://github.com/Gamaroff/agent-skills/issues/231) | task.52 |
| 54 | [Intercept GitHub board mutations, and give `gh-stage.js` a credential-free plan](task.54.github-board-interception/task.54.github-board-interception.md) | accepted | refactoring | High | 2026-08-17 | [#232](https://github.com/Gamaroff/agent-skills/issues/232) | task.52 |
| 55 | [Build the Jira comment endpoint that does not exist, and stop routing ~20 comments through prose](task.55.tracker-comment-cli/task.55.tracker-comment-cli.md) | accepted | refactoring | High | 2026-08-17 | [#233](https://github.com/Gamaroff/agent-skills/issues/233) | task.53 |
| 56 | [One CLI for the GitHub issue lifecycle, and honest handling of value-returning mutations](task.56.tracker-issue-cli/task.56.tracker-issue-cli.md) | accepted | refactoring | Medium | 2026-08-17 | [#234](https://github.com/Gamaroff/agent-skills/issues/234) | task.54, task.55 |
| 57 | [Read-only verification, and `/tracker-reconcile` so the checklist is a ledger](task.57.readonly-verification-and-reconcile/task.57.readonly-verification-and-reconcile.md) | accepted | infrastructure | Medium | 2026-08-17 | [#235](https://github.com/Gamaroff/agent-skills/issues/235) | task.52 |
| 58 | [Document restricted tracker access for someone who has never heard of it](task.58.restricted-access-documentation/task.58.restricted-access-documentation.md) | accepted | documentation | High | 2026-08-17 | [#236](https://github.com/Gamaroff/agent-skills/issues/236) | task.51-57 |
| 59 | [Finish the Prettier adoption — sweep the 50 stragglers, then guard the boundary](task.59.prettier-sweep-and-format-guard/task.59.prettier-sweep-and-format-guard.md) | accepted | infrastructure | Medium | 2026-08-17 | [#237](https://github.com/Gamaroff/agent-skills/issues/237) | none |
| 60 | [Give the config reader's awk tier a grammar, or make it refuse](task.60.config-reader-strict-subset/task.60.config-reader-strict-subset.md) | accepted | infrastructure | High | 2026-08-18 | [#247](https://github.com/Gamaroff/agent-skills/issues/247) | task.51 |
| 61 | [Let the JavaScript gates read a config-declared access mode, with read-config.sh parity](task.61.access-mode-config-tier/task.61.access-mode-config-tier.md) | accepted | infrastructure | High | 2026-08-19 | [#251](https://github.com/Gamaroff/agent-skills/issues/251) | task.51, task.52, task.53, task.60 |
| 62 | [Run each loop iteration in a fresh Claude process, and classify the outcome from the filesystem](task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md) | accepted | infrastructure | High | 2026-08-28 | — | — |
| 63 | [Make an unattended run watchable from a second terminal, and audible when it stops](task.63.loop-supervisor-status-views/task.63.loop-supervisor-status-views.md) | accepted | infrastructure | Medium | 2026-08-28 | — | task.62 |
| 64 | [Publish the supervisor run over HTTP, and write the operator documentation that makes an overnight run repeatable](task.64.loop-supervisor-dashboard-and-docs/task.64.loop-supervisor-dashboard-and-docs.md) | accepted | documentation | Medium | 2026-08-28 | — | task.62 |
| 65 | [Derive the selection frontier from the registries, so an outstanding bug or task cannot be invisible to /develop-next](task.65.registry-aware-selection/task.65.registry-aware-selection.md) | accepted | infrastructure | High | 2026-08-29 | [#280](https://github.com/Gamaroff/agent-skills/issues/280) | — |
| 66 | [Review a pull request against the paper trail that is supposed to justify it](task.66.review-pr/task.66.review-pr.md) | accepted | infrastructure | High | 2026-08-31 | [#282](https://github.com/Gamaroff/agent-skills/issues/282) | — |
| 67 | [Make QA execute a prose skill, not only read it](task.67.execute-the-skill-qa-gate/task.67.execute-the-skill-qa-gate.md) | ready-for-development | infrastructure | High | 2026-08-31 | — | task.66 |
| 68 | [/review-code branches on TRACKER where it should branch on VCS](task.68.review-code-vcs-branch/task.68.review-code-vcs-branch.md) | ready-for-development | infrastructure | Medium | 2026-08-31 | — | — |
| 69 | [Give /qa-story and /qa-task a Bitbucket PR-comment path](task.69.qa-bitbucket-pr-comment/task.69.qa-bitbucket-pr-comment.md) | ready-for-development | infrastructure | Medium | 2026-08-31 | — | — |
| 70 | [Build the inline PR comment primitive, on GitHub and Bitbucket](task.70.inline-pr-comments/task.70.inline-pr-comments.md) | ready-for-development | infrastructure | Low | 2026-08-31 | — | — |
| 71 | [Make the selection floor equal what the dispatching pipeline accepts](task.71.selection-floor-matches-dispatcher/task.71.selection-floor-matches-dispatcher.md) | accepted | infrastructure | High | 2026-08-31 | [#285](https://github.com/Gamaroff/agent-skills/issues/285) | task.66 |
| 72 | [Pin the bug-axis divergence exactly instead of asserting it loosely](task.72.pin-bug-axis-divergence/task.72.pin-bug-axis-divergence.md) | planned | infrastructure | Medium | 2026-08-31 | [#287](https://github.com/Gamaroff/agent-skills/issues/287) | task.71 |
| 73 | [Make the DoD security check execute candidate inputs, not grep for them](task.73.dod-security-probe-not-grep/task.73.dod-security-probe-not-grep.md) | ready-for-development | infrastructure | High | 2026-09-01 | — | task.67 |
| 74 | [A security re-review must re-probe, not re-read](task.74.security-re-review-reprobes/task.74.security-re-review-reprobes.md) | ready-for-development | infrastructure | High | 2026-09-01 | — | task.67 |
| 75 | [Make the pipeline quality gate run what CI runs](task.75.quality-gate-matches-ci/task.75.quality-gate-matches-ci.md) | ready-for-development | infrastructure | High | 2026-09-01 | — | task.67 |
| 76 | [State what a mutation proof does not tell you](task.76.mutation-proof-limits/task.76.mutation-proof-limits.md) | ready-for-development | infrastructure | Medium | 2026-09-01 | — | task.67 |
| 77 | [Run the PR conformance review before a work item is finalised](task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md) | ready-for-development | infrastructure | High | 2026-09-01 | — | task.66 |
| 78 | [Give develop-bug's fix cycle the same fast gate as the other pipelines](task.78.develop-bug-fast-gate/task.78.develop-bug-fast-gate.md) | ready-for-development | infrastructure | Medium | 2026-09-01 | — | task.75 |
| 79 | [Write down the inputs that defeat each sink, once](task.79.security-input-corpus/task.79.security-input-corpus.md) | ready-for-development | infrastructure | High | 2026-09-02 | — | — |
| 80 | [Make a security probe runnable without widening the snippet allow-list](task.80.security-probe-engine/task.80.security-probe-engine.md) | ready-for-development | infrastructure | High | 2026-09-02 | — | task.79 |
| 81 | [Ship /review-security: prove a control engages, not that it is present](task.81.review-security-skill/task.81.review-security-skill.md) | ready-for-development | infrastructure | High | 2026-09-02 | — | task.79, task.80 |
| 82 | [Feed the measured security verdict into the QA gate](task.82.security-gate-evidence-field/task.82.security-gate-evidence-field.md) | ready-for-development | infrastructure | Medium | 2026-09-02 | — | task.81 |
| 83 | [Platform-aware skill exclusion in setup-consumer.sh](task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md) | planned | infrastructure | Medium | 2026-09-02 | — | — |
| 84 | [Skill install profiles with dependency closure](task.84.skill-install-profiles/task.84.skill-install-profiles.md) | planned | infrastructure | Medium | 2026-09-02 | — | task.83 |
| 85 | [Give /review-pr a machine-readable findings block](task.85.review-pr-machine-readable-findings/task.85.review-pr-machine-readable-findings.md) | draft | infrastructure | Medium | 2026-09-03 | — | task.77 |
| 86 | [bundle_skill.py never refreshes transitively-bundled references](task.86.bundle-transitive-refresh/task.86.bundle-transitive-refresh.md) | draft | infrastructure | High | 2026-09-03 | — | — |
| 87 | [Shell commands in table cells escape the snippet-execution gate](task.87.execute-table-cell-snippets/task.87.execute-table-cell-snippets.md) | draft | infrastructure | Medium | 2026-09-03 | — | task.67 |
| 88 | [The resume sub-state guard is pinned by mutations that do not discriminate it](task.88.resume-guard-strength/task.88.resume-guard-strength.md) | draft | infrastructure | Medium | 2026-09-03 | — | task.77 |

- **Tasks 67-70 were filed from task 66's dogfood run** — running `/review-pr` against its own PR ([#283](https://github.com/Gamaroff/agent-skills/pull/283)) returned REQUEST CHANGES and surfaced them. **67 is the one that matters**: it closes the structural hole the run exposed — QA reads a prose skill's text and never executes it, so task 66 shipped `accepted` with a glob that collected 0 files on the default macOS shell. 68 and 69 are the two halves of one dead cross-reference (`/review-code` telling implementers to mirror a `/qa-story` step that is itself GitHub-only). 70 builds the inline-comment primitive `/review-code` has documented but never had. None has a tracker issue yet.

---

## Notes

- Task 6 has no tracker issue — pre-dates the tracker-on-creation requirement; backfill via `/sync-jira-task` or `gh issue create` if needed.
- **Task 47 was accepted retroactively on 2026-08-17 and has no DoD file.** Its work shipped in v0.39.1 but the card was never closed. No Definition of Done was generated now: the task was hand-driven rather than run through `/develop-task` (it has no implementation report either, the same shape as tasks 48 and 50), so a DoD written today would attest to a review that never happened. An honest gap beats a manufactured artifact. Its guard test, `tests/json-output-fidelity.test.js`, is the durable evidence the work is sound.
- **Statuses were audited against document frontmatter on 2026-08-17.** Fifteen rows were stale: 32-35 read `draft` and 39-45 read `planned` while every one of those documents said `accepted` and carried a DoD; 47 read `in-progress` in both places. Tasks 7, 8 and 10 carried `Accepted` / `✅ Accepted` in frontmatter, which must be lowercase-kebab-case — the Title Case form belongs in the body's `**Status:**` line only.
- Tasks 51-58 are the **restricted tracker access** sequence — one shippable unit each, in dependency order. Design: `.agents/plans/restricted-tracker-access.md`. Ship 51 → 52 first; 53 and 54 are independent of each other. Task 58 is the narrative documentation layer and runs last — the per-unit reference docs stay with their own unit.
- **Task 59 shipped 2026-08-17** ([#240](https://github.com/Gamaroff/agent-skills/pull/240)). Its merge-ordering constraint applied to **JavaScript only**, and the pre-flight check found nothing at risk. Kept here because the constraint recurs for any future repo-wide reformat: Its Prettier sweep rewrites ~103 `.js` files, so a branch touching any of them conflicts on every line. Markdown, YAML and JSON are `.prettierignore`d, so **doc-only branches are unaffected** — which covers most of the 51-58 sequence. Land or rebase in-flight *code* work before merging 59. (Checked 2026-08-17: nothing was at risk. Task 49 had already merged as [#223](https://github.com/Gamaroff/agent-skills/pull/223) and task 51's branch was markdown-only, merged as [#238](https://github.com/Gamaroff/agent-skills/pull/238).)
- Task 48's document was written **after** its implementation, to give the branch that already carried the number a registry entry. Task 49 is the half that task 48 deliberately deferred. Neither has a tracker issue yet.
- Tasks 32-34 are the **Evals Infrastructure** milestone ([#1](https://github.com/Gamaroff/agent-skills/milestone/1)).
- Tasks 62-64 are the **`loop-supervisor`** sequence — one shippable unit each. Design: [`.agents/plans/loop-supervisor.md`](../../.agents/plans/loop-supervisor.md). Task 62 is the only one that has to exist; it delivers a usable runner with log files alone. 63 (terminal views, notifications) and 64 (dashboard push, runbook) both depend on 62 and are independent of each other, so they can land in either order. None has a tracker issue yet.
- **Rows 56-58 and 62-64 were stale and were corrected 2026-08-29** as part of task 65. All six documents read `accepted`; the rows read `planned` (56, 57), `ready-for-review` (58) and `draft` (62-64). Task 65's Phase 6 named only 62-64 — the other three were found by the same check and corrected in the same edit, because leaving a row known to be wrong is worse than the drift task 65 was written about. The correction is **not** what makes the registry safe to select from: the selector reads each document's own frontmatter and treats the row as a nomination only, so all six were already excluded from the frontier by the drift guard rather than by the row being right (SC5).
- Filenames follow `task.[N].[kebab-case-name].md` per [AGENTS.md](../../AGENTS.md#file-naming).
