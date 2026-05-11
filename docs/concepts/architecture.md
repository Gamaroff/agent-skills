# Architecture

> **Audience:** anyone wanting to understand how the library fits together.

A library-level view: how skills are loaded, packaged, invoked, and how they interact with each other and the consuming project.

## System overview

```mermaid
flowchart TB
    subgraph CP[Consuming project]
        SC[skills-config.yaml]
        AS[.agents/skills/<br/>installed zips]
        PJD[docs/prd/<br/>docs/development/]
        ER[epic-registry.md]
        TR[task-registry.md]
    end

    subgraph AGENT[Agent runtime]
        AGN[Claude Code /<br/>Agent SDK /<br/>Copilot]
        MD[Skill metadata<br/>always in context]
        SK[SKILL.md body<br/>loaded on trigger]
        RS[Bundled resources<br/>loaded on demand]
    end

    subgraph LIB[This repo]
        SRC[skills/*/]
        SHR[shared/resources/]
        PKG[package_skill.py]
        CAT[generate_catalog.py]
    end

    SRC --> PKG
    SHR --> PKG
    PKG --> AS

    AS --> MD
    MD --> SK
    SK --> RS

    AGN --> MD
    AGN -.invokes.-> SK
    SK -.reads/writes.-> PJD
    SK -.reads.-> SC
    SK -.reads/writes.-> ER
    SK -.reads/writes.-> TR
```

**Three boundaries:**

- **This repo (`agent-skills`)** authors and packages skills. It is *not* installed into target projects.
- **Consuming project** has a `skills-config.yaml`, an `.agents/skills/` directory of installed zips, and project docs the skills read/write.
- **Agent runtime** loads the skills' progressive-disclosure tiers as needed.

## Progressive disclosure

```mermaid
flowchart LR
    A[Conversation starts] -->|Always loaded ~100 words| B[Metadata:<br/>name + description]
    B -->|Skill name matches<br/>or invoked| C[SKILL.md body]
    C -->|Body references<br/>a resource| D[Bundled resource:<br/>references/, assets/]
```

Three tiers, loaded as relevance grows:

1. **Metadata** — `name` + `description` from every skill's frontmatter, always in context. ~100 words total. Powers auto-activation.
2. **SKILL.md body** — loaded when the skill triggers. The full instructions for that one skill.
3. **Bundled resources** — `references/` and `assets/` inside the zip. Loaded only when the body references them.

The cost ladder is steep: skipping tiers 2–3 for skills you don't need keeps the context window usable.

## Orchestrator → leaf skill dependency map

```mermaid
flowchart TD
    DS[develop-story] --> CB[create-branch]
    DS --> RS[review-story]
    DS --> DEV[develop]
    DS --> CPR[create-pr]
    DS --> QS[qa-story]
    DS --> QF[qa-fix]
    DS --> FN[finalise]
    DS --> CC[commit-changes]

    DT[develop-task] --> CB
    DT --> RT[review-task]
    DT --> DEV
    DT --> CPR
    DT --> QT[qa-task]
    DT --> QF
    DT --> FN
    DT --> CC

    FN --> EGH[ensure-epic-github-issue]
    FN --> EGJ[ensure-epic-jira-issue]

    CS[create-story] --> DSV[documentation-<br/>standards-validator]
    CS --> MA[mermaid-architect]

    CE[create-epic] --> ERM[epic-registry-manager]
    CE --> DSV
    CE --> MA

    CPRD[create-prd] --> CD[create-doc]
    CPRD --> PMC[pm-checklist]
    CPRD --> BPT[brownfield-prd-template]
```

`finalise` picks one of `ensure-epic-{github,jira}-issue` via the [platform resolver](../../shared/resources/platform-detection.md).

## Pipeline phases (story)

```mermaid
sequenceDiagram
    participant U as User
    participant DS as develop-story
    participant CB as create-branch
    participant RS as review-story
    participant DEV as develop
    participant CPR as create-pr
    participant QS as qa-story
    participant QF as qa-fix
    participant FN as finalise
    participant CC as commit-changes

    U->>DS: /develop-story <path>
    DS->>DS: Phase 0 — resolve & prepare
    DS->>CB: Step 1 — create branches
    CB-->>DS: epic + story branches ready
    DS->>RS: Step 2 — review story
    DS->>DEV: Step 3 — develop loop (MAX_ITER=5)
    DEV-->>DS: status: ready-for-review
    DS->>CPR: Step 4 — create PR (--base epic branch)
    DS->>QS: Step 5 — QA review → gate file
    alt gate CONCERNS / FAIL
        DS->>QF: Step 6 — qa-fix (up to 5 cycles)
        QF-->>QS: re-run QA
    end
    DS->>FN: Step 7 — finalise (DoD, PR, tracker)
    DS->>CC: Step 8 — commit final artifacts
    DS-->>U: status: accepted
```

Reference: [`skills/develop-story/README.md`](../../skills/develop-story/README.md).

## Packaging flow

```mermaid
flowchart LR
    A[Author edits<br/>skills/foo/SKILL.md] --> B[python package_skill.py]
    B --> C[Detect shared/resources/<br/>refs in SKILL.md]
    C --> D[Bundle references<br/>into zip's references/]
    D --> E[Rewrite paths in zip]
    E --> F[Produce skills/foo/foo.zip]
    F -.gitignored.-> G[Distributable]
```

Self-contained zips mean consuming projects don't need to install `shared/resources/` separately. The packager guarantees every reference resolves inside the zip.

## Platform resolver

```mermaid
flowchart TD
    A[Skill needs tracker/VCS] --> B{skills-config.yaml<br/>tracker / vcs set?}
    B -- yes --> Z[Use that]
    B -- no --> C{JIRA_URL env set?}
    C -- yes --> J[tracker = Jira]
    C -- no --> D{git remote contains<br/>bitbucket.org?}
    D -- yes --> BB[vcs = Bitbucket]
    D -- no --> GH[Default: GitHub]
```

Canonical: [`shared/resources/platform-detection.md`](../../shared/resources/platform-detection.md).

## Design principles

The architecture above reflects a small set of design choices:

- **Bounded loops** — never let an LLM loop indefinitely. MAX_ITER=5 on develop and qa-fix.
- **Gate ownership** — QA outputs (`*.gate.*.yml`) are owned by QA skills. Dev skills never write them.
- **Idempotent resume** — re-invoking an orchestrator picks up at the first incomplete step. No "should I redo this?" prompts.
- **Self-contained packaging** — installed skills carry their shared resources. No runtime dependency on this repo's layout.
- **Atomic registry updates** — new epics/tasks and their registry rows commit together.
- **Co-location** — plans, artifacts, and review reports live next to the work, not in scratch dirs.

See also [FAQ](../reference/faq.md) for the rationale behind each.

## See also

- [Overview](./overview.md) — what skills are
- [Getting started](./getting-started.md) — install and first command
- [FAQ](../reference/faq.md) — why the design works this way
- [Anti-patterns](../reference/anti-patterns.md) — what to never do
- [`develop-story` README](../../skills/develop-story/README.md)
- [`develop-task` README](../../skills/develop-task/README.md)
