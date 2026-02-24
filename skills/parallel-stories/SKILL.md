---
name: parallel-stories
description: Generate stories organized for parallel development using Git worktrees. Implements hybrid numbering (1-1, 1-2 for parallel, 2, 3 for sequential) with dependency mapping, conflict prevention, and coordination strategies.
---

# Parallel Worktree Stories

## When to Use This Skill

Use this skill when you need to:

- **Setup parallel development** for multiple teams or developers ("create parallel stories", "setup parallel development")
- **Maximize velocity** by developing independent features simultaneously
- **Organize epic work** into parallelizable and sequential streams
- **Enable true concurrent development** without merge conflicts

Natural language triggers:

- "Create parallel stories for epic 3"
- "Setup parallel development for the authentication epic"
- "Generate worktree-based stories"
- "We need to parallelize epic 2"

## Purpose

To generate stories organized for parallel development using Git worktrees, implementing a hybrid numbering scheme that supports both parallel and sequential story development within epics. This enables multiple developers or teams to work simultaneously without blocking each other or creating merge conflicts.

## Numbering Scheme

**Parallel Stories** (can be developed simultaneously):

- Story 1-1, Story 1-2, Story 1-3
- Each gets its own Git worktree
- No dependencies on each other
- Work in isolated modules/areas

**Sequential Stories** (must be done in order):

- Story 2, Story 3, Story 4
- Developed after parallel stories complete
- May depend on multiple parallel stories
- Follow standard development workflow

**Example**:

```
Epic 1: User Authentication
├─ Story 1-1: Login UI (parallel - frontend only)
├─ Story 1-2: JWT Service (parallel - backend only)
├─ Story 1-3: Auth Middleware (parallel - separate module)
├─ Story 2: Integration Testing (sequential - requires 1-1, 1-2, 1-3)
└─ Story 3: Password Reset (sequential - requires Story 2)
```

---

## Workflow

### Step 0: Load Core Configuration and PRD/Architecture

#### 0.1 Load Configuration

**Configuration File**: `skills-config.yaml` (in project root)

1. Attempt to load `skills-config.yaml` from project root
2. If file does not exist, **notify user**:

   > "`skills-config.yaml` not found. Create this file to customize story locations, or continue with default settings."

3. Extract configurations (with defaults if file missing):
   - `devStoryLocation` - Story storage mode: `nested` (default) means stories are stored within epic directories
   - `prd.*` - PRD structure and locations (default: `prdSharded: true`, `prdShardedLocation: docs/prd`)
   - `architecture.*` - Architecture document settings (default: `architectureSharded: true`, `architectureShardedLocation: docs/architecture`)

**Default Configuration Values** (used if `skills-config.yaml` not found):

```yaml
markdownExploder: true
qa:
  qaLocation: docs/qa
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: '*/epics/epic.{n}.*.md'
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
# Stories stored within epic directories: {prdShardedLocation}/{category}/{component}/epics/{epic}/stories/
devStoryLocation: nested
devDebugLog: .ai/debug-log.md
slashPrefix: BMad
```

#### 0.2 Read PRD and Architecture

1. Read `docs/prd.md` or sharded epic files
2. Read `docs/architecture.md` or sharded architecture docs
3. Understand:
   - Epic structure and requirements
   - Component/module organization
   - Dependency relationships
   - Technical constraints

---

### Step 1: Epic Analysis for Parallel Development

**Purpose**: Identify which stories can be parallelized and which must be sequential

#### 1.1 Identify Current Epic and Story Dependencies

1. **Locate Epic Files**
   - Based on `prdSharded` configuration
   - Identify the target epic for parallel story creation

2. **Analyze Epic Requirements**
   Identify:
   - Stories that can be developed independently (parallel candidates)
   - Stories with dependencies (sequential requirements)
   - Module/area conflicts that prevent parallelization

3. **Parallelization Criteria**
   Stories are parallel-safe when they:
   - Modify different modules/components
   - Don't share database schemas or API contracts
   - Have minimal inter-story dependencies
   - Can be tested independently

#### 1.2 Dependency Mapping

For each story in the current epic, determine:

**Dependencies**:

- Which stories must complete first
- Which stories can run in parallel
- Blocking relationships

**Parallel-Safe Indicator**:

- `true`: Can be developed simultaneously with other parallel stories
- `false`: Must wait for other stories to complete

**Module/Area of Codebase Affected**:

- Frontend components (e.g., `src/components/auth/`)
- Backend services (e.g., `apps/api/src/modules/auth/`)
- Shared libraries (e.g., `libs/auth-lib/`)
- Database migrations
- Configuration files

**Conflict Potential**:

- High: Same files, same modules, shared schemas
- Medium: Adjacent modules, related features
- Low: Completely isolated areas

---

### Step 2: Generate Parallel Story Set

#### 2.1 Create Parallel Stories (1-X Numbering)

For stories identified as parallel-safe:

**Story ID Format**: `{epic}.1-{n}` (e.g., `1.1-1`, `1.1-2`, `1.1-3`)

**For each parallel story**:

1. **Worktree Branch Name**: `feature/story-{epic}-1-{n}`
   - Example: `feature/story-1-1-1`, `feature/story-1-1-2`

2. **Dependencies**: List any stories that must complete first
   - Usually none for parallel stories
   - May have dependencies on previous epic

3. **Parallel-Safe Indicator**: `true`

4. **Module/Area Affected**: Specific to minimize conflicts
   - Example: "Frontend - Login component only"
   - Example: "Backend - JWT service module only"

5. **File Boundaries**: Explicit list of files/directories

   ```
   Modifies:
   - apps/goji-wallet/app/(drawer)/auth/login.tsx
   - apps/goji-wallet/components/LoginForm.tsx

   Does NOT modify:
   - Backend files
   - Shared auth-lib
   - Database schemas
   ```

#### 2.2 Create Sequential Stories (Single Number)

For stories with dependencies:

**Story ID Format**: `{epic}.{n}` (e.g., `1.2`, `1.3`, `1.4`)

**For each sequential story**:

1. **Dependencies**: Reference completed parallel stories
   - Example: "Requires Story 1-1, 1-2, 1-3 to be merged"

2. **Parallel-Safe Indicator**: `false`

3. **Reason for Sequential**: Explain why not parallel
   - "Integrates components from parallel stories"
   - "Requires combined functionality from 1-1 and 1-2"
   - "Database migrations depend on schema changes from 1-X stories"

---

### Step 3: Git Worktree Setup

**Purpose**: Create isolated development environments for parallel stories

#### 3.1 Create Worktree Branches

For each parallel story, generate Git worktree commands:

```bash
# For Story 1-1
git worktree add ../worktrees/story-1-1 -b feature/story-1-1-1

# For Story 1-2
git worktree add ../worktrees/story-1-2 -b feature/story-1-1-2

# For Story 1-3
git worktree add ../worktrees/story-1-3 -b feature/story-1-1-3
```

**Worktree Structure**:

```
goji-system/               # Main repository
├─ .git/
├─ apps/
└─ libs/

../worktrees/
├─ story-1-1/                 # Isolated worktree for story 1-1
│  ├─ apps/
│  └─ libs/
├─ story-1-2/                 # Isolated worktree for story 1-2
└─ story-1-3/                 # Isolated worktree for story 1-3
```

#### 3.2 Worktree Workflow Instructions

For each parallel story, document:

**Setup**:

```bash
# Create worktree
git worktree add ../worktrees/story-1-1 -b feature/story-1-1-1

# Navigate to worktree
cd ../worktrees/story-1-1

# Install dependencies (if needed)
npm install

# Run development servers
npx nx serve goji-wallet
```

**Development**:

```bash
# Work in isolated worktree
cd ../worktrees/story-1-1

# Make changes only to specified modules
# (see File Boundaries section)

# Commit regularly
git add .
git commit -m "Implement login UI"

# Push to remote
git push -u origin feature/story-1-1-1
```

**Completion**:

```bash
# Run tests
npx nx test goji-wallet

# Create pull request
gh pr create --title "Story 1-1: Login UI"

# After PR merged, clean up worktree
cd ../../goji-system
git worktree remove ../worktrees/story-1-1
```

---

### Step 4: Populate Story Templates

**Purpose**: Create comprehensive story files with worktree context

#### 4.1 Standard Story Template Population

For each story (parallel and sequential):

1. Create story file in epic's stories subdirectory: `{epicPath}/stories/{epicNum}.{storyId}.{descriptive-name}.md`
   - Example: `docs/prd/user-experience/notifications/epics/epic.305/stories/305.1-1.swipe-actions.md`
   - Example: `docs/prd/core-platform/auth/epics/epic.301/stories/301.2.integration-testing.md`

2. Fill basic information:
   - **Status**: `Draft`
   - **Story Statement**: As a... I want... So that...
   - **Acceptance Criteria**: From epic
   - **Tasks/Subtasks**: Implementation steps

#### 4.2 Enhanced Dev Notes for Parallel Development

**CRITICAL**: Parallel stories require additional context beyond standard stories.

Add these sections to Dev Notes:

**Worktree Information**:

````markdown
### Worktree Setup

**Branch Name**: feature/story-1-1-1
**Worktree Path**: ../worktrees/story-1-1

**Setup Command**:

```bash
git worktree add ../worktrees/story-1-1 -b feature/story-1-1-1
cd ../worktrees/story-1-1
npm install
```
````

**Cleanup Command** (after merge):

```bash
cd ../../goji-system
git worktree remove ../worktrees/story-1-1
```

````

**Dependencies**:
```markdown
### Dependencies

**Must Complete First**: None (this story is parallel-safe)

**Parallel Stories** (can be developed simultaneously):
- Story 1-2: JWT Service (backend)
- Story 1-3: Auth Middleware (middleware layer)

**Blocks**: Story 2 (Integration Testing - requires all 1-X stories merged)
````

**Parallel Development Notes**:

```markdown
### Parallel Development Guidelines

**Module Isolation**: This story modifies ONLY frontend login components

**File Boundaries** (MUST RESPECT):

- ✅ apps/goji-wallet/app/(drawer)/auth/login.tsx
- ✅ apps/goji-wallet/components/LoginForm.tsx
- ✅ apps/goji-wallet/components/auth/\*
- ❌ apps/goji-api/\*\* (modified by Story 1-2)
- ❌ libs/auth-lib/\*\* (modified by Story 1-3)

**Conflict Prevention**:

- Do NOT modify shared auth-lib - use existing interfaces
- Do NOT create database migrations
- Do NOT change API contracts
```

**Merge Coordination**:

```markdown
### Merge Strategy

**Merge Order**: Any order (stories are independent)

**Integration Notes**:

- After all 1-X stories merged, Story 2 integrates the components
- No coordination needed between 1-1, 1-2, 1-3 during development

**Testing Before Merge**:

- Unit tests must pass for modified components only
- Integration tests will be handled in Story 2
```

#### 4.3 Git Integration Instructions

For each parallel story, add to Dev Notes:

````markdown
### Git Workflow

**1. Setup Worktree**:

```bash
git worktree add ../worktrees/story-1-1 -b feature/story-1-1-1
cd ../worktrees/story-1-1
```
````

**2. Development**:

```bash
# Make changes (respect file boundaries)
# Commit regularly
git add .
git commit -m "Implement login form validation"
```

**3. Testing**:

```bash
# Run tests for affected modules only
npx nx test goji-wallet --testPathPattern=auth
```

**4. Pull Request**:

```bash
# Create PR from worktree branch
gh pr create --title "Story 1-1: Login UI" \
  --body "Implements frontend login component for authentication epic"
```

**5. Cleanup** (after PR merged):

```bash
cd ../../goji-system
git worktree remove ../worktrees/story-1-1
git branch -d feature/story-1-1-1
```

````

---

### Step 5: Story Coordination Matrix

**Purpose**: Provide overview and coordination for parallel development team

Create overview file: `{epicPath}/epic-{epicNum}-coordination.md`

#### 5.1 Matrix Structure

```markdown
# Epic {epicNum} Parallel Development Coordination

## Overview

**Epic**: {Epic Title}
**Parallel Stories**: {count}
**Sequential Stories**: {count}
**Total Stories**: {total}

## Parallel Stories (1-X)

These stories can be developed simultaneously without conflicts.

| Story ID | Title | Module/Area | Worktree Branch | Dependencies | Status |
|----------|-------|-------------|-----------------|--------------|--------|
| 1-1 | Login UI | Frontend/Auth | feature/story-1-1-1 | None | Draft |
| 1-2 | JWT Service | Backend/Auth | feature/story-1-1-2 | None | Draft |
| 1-3 | Auth Middleware | Middleware | feature/story-1-1-3 | None | Draft |

## Sequential Stories (2+)

These stories must be developed in order after parallel stories complete.

| Story ID | Title | Dependencies | Reason for Sequential | Status |
|----------|-------|--------------|----------------------|--------|
| 2 | Integration Testing | 1-1, 1-2, 1-3 | Tests combined functionality | Draft |
| 3 | Password Reset | 2 | Uses integrated auth system | Draft |

## Integration Plan

### Phase 1: Parallel Development (Stories 1-1, 1-2, 1-3)

**Timeline**: Week 1-2

**Developers**:
- Story 1-1: Developer A (Frontend specialist)
- Story 1-2: Developer B (Backend specialist)
- Story 1-3: Developer C (Middleware specialist)

**Merge Strategy**:
- Each story creates separate PR
- Can be merged in any order
- No coordination needed during development

**Communication**:
- Daily standups to share progress
- Notify team when PR is ready for review
- Flag any unexpected interface changes

### Phase 2: Sequential Development (Stories 2, 3)

**Timeline**: Week 3-4

**Dependencies**:
- Story 2 waits for ALL 1-X stories to be merged
- Story 3 waits for Story 2

## Conflict Resolution Strategy

### Preventing Conflicts

**File Boundaries** (strictly enforced):
- Story 1-1: `apps/goji-wallet/app/(drawer)/auth/**`
- Story 1-2: `apps/goji-api/src/modules/auth/**`
- Story 1-3: `libs/auth-lib/src/**`

**Interface Contracts** (agreed upfront):
- API endpoints defined in architecture docs
- Component props defined in architecture docs
- No changes to shared contracts during parallel development

### Handling Conflicts (if they occur)

1. **Minor conflicts** (imports, formatting): Developer resolves during rebase
2. **Interface conflicts**: Team meeting to resolve, may require story updates
3. **Major architectural conflicts**: Escalate to architect, may require replanning

## Success Metrics

- [ ] All worktrees created successfully
- [ ] Parallel stories have clear file boundaries
- [ ] No merge conflicts between parallel stories
- [ ] Integration story (2) successfully combines parallel work
- [ ] Total development time reduced vs sequential approach

## Resources

**Architecture**: docs/architecture/auth-architecture.md
**Epic**: docs/prd/user-experience/authentication/epic-1.md
**Worktree Guide**: [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
````

---

### Step 6: Completion and Review

**Purpose**: Validate all stories and provide summary

#### 6.1 Verification Checklist

Verify for each parallel story:

- [ ] Worktree setup instructions included
- [ ] File boundaries clearly defined
- [ ] Dependencies documented
- [ ] Merge strategy explained
- [ ] Git workflow commands provided

Verify for each sequential story:

- [ ] Dependencies on parallel stories documented
- [ ] Reason for sequential order explained
- [ ] Standard story template populated

Verify coordination matrix:

- [ ] All stories listed with status
- [ ] Integration plan defined
- [ ] Conflict resolution strategy documented
- [ ] Success metrics identified

#### 6.2 Execute Validation

For each created story:

1. Run `execute-checklist` skill with `story-draft-checklist`
2. Note any gaps or issues
3. Fix before marking stories as ready

#### 6.3 Provide Summary

Generate comprehensive summary:

````markdown
## Parallel Story Creation Complete

**Epic**: {Epic Number} - {Epic Title}

### Stories Created

**Parallel Stories** (can develop simultaneously):

- Story 1-1: {Title} - {Module}
- Story 1-2: {Title} - {Module}
- Story 1-3: {Title} - {Module}

**Sequential Stories** (develop in order):

- Story 2: {Title} (requires 1-1, 1-2, 1-3)
- Story 3: {Title} (requires Story 2)

**Total**: {count} stories

### Git Worktree Branches Established

```bash
../worktrees/story-1-1  → feature/story-1-1-1
../worktrees/story-1-2  → feature/story-1-1-2
../worktrees/story-1-3  → feature/story-1-1-3
```
````

### Coordination Matrix

**Location**: `{epicPath}/epic-{epicNum}-coordination.md` (in epic directory)

**Contents**:

- Parallel stories table with worktree info
- Sequential stories with dependencies
- Integration plan
- Conflict resolution strategy

### Next Steps for Development Team

1. **Review Coordination Matrix**: All developers read the integration plan
2. **Create Worktrees**: Each developer sets up their assigned worktree
3. **Parallel Development**: Stories 1-1, 1-2, 1-3 developed simultaneously
4. **Create PRs**: Each parallel story gets separate PR
5. **Merge**: PRs can be merged in any order (no conflicts expected)
6. **Sequential Development**: After all 1-X merged, begin Story 2

### Expected Benefits

- **Velocity**: 3 stories developed in time of 1
- **Isolation**: No blocking between parallel stories
- **Clean History**: Each story has its own branch and PR
- **Reduced Conflicts**: Clear file boundaries prevent merge conflicts

### Validation Results

{Include checklist results for all stories}

````

---

## Integration with Other Skills

**Called by**:
- `scrum-master` - When parallel development is requested

**Calls**:
- `create-story` - Reuses story population logic
- `execute-checklist` - Validates each story after creation

**Related to**:
- `develop` - Developers use these stories with worktree workflow

---

## Best Practices

### When to Use Parallel Stories

✅ **Good candidates**:
- Features that modify different modules
- Frontend + Backend split work
- Independent libraries or utilities
- Non-overlapping database schemas
- Separate API endpoints

❌ **Poor candidates**:
- Stories that modify same files
- Tightly coupled features
- Sequential business logic
- Shared database schema changes
- Features requiring constant coordination

### Optimal Team Size

- **2-3 parallel stories**: Ideal for small teams
- **4-5 parallel stories**: Possible with clear boundaries
- **6+ parallel stories**: High coordination overhead, diminishing returns

### Communication Strategy

- Daily standups: Share progress on parallel work
- Slack channel: Real-time questions about interfaces
- Weekly integration check: Verify parallel work still compatible
- PR reviews: Entire team reviews to understand changes

---

## Troubleshooting

### Conflict Despite File Boundaries

**Problem**: Merge conflict occurs between parallel stories

**Solution**:
1. Identify the conflicting file
2. Determine if file boundary was violated
3. If yes: Developer who violated boundary resolves conflict
4. If no: Team meeting to discuss shared dependency that was missed
5. Update coordination matrix with lessons learned

### Worktree Creation Fails

**Problem**: `git worktree add` command fails

**Solution**:
```bash
# Check existing worktrees
git worktree list

# Remove stale worktrees
git worktree prune

# Try creating again
git worktree add ../worktrees/story-1-1 -b feature/story-1-1-1
````

### Sequential Story Can't Start

**Problem**: Sequential story blocked by incomplete parallel story

**Solution**:

1. Identify blocking parallel story
2. Check its status and remaining work
3. Options:
   - Wait for completion (ideal)
   - Help complete the blocking story
   - If critical blocker: Reprioritize or split sequential story

---

## Success Criteria

A parallel story set is successfully created when:

✅ Epic analyzed for parallelization opportunities
✅ Parallel stories have clear, non-overlapping file boundaries
✅ Git worktree setup commands provided for each parallel story
✅ Sequential stories properly document dependencies on parallel stories
✅ Coordination matrix provides complete integration plan
✅ Conflict resolution strategy defined
✅ All stories pass story-draft-checklist validation
✅ Development team understands parallel workflow

---

## Notes

- **Git worktrees** are preferred over feature branches for true isolation
- **Parallel development** requires discipline to respect file boundaries
- **Coordination matrix** is essential for team alignment
- **Hybrid numbering** (1-1, 1-2 vs 2, 3) makes dependencies explicit
- This approach can **reduce epic completion time by 50-70%** with proper planning
- **Not all epics** are suitable for parallelization - analyze dependencies first

---

## Resources

**Git Worktree Documentation**: https://git-scm.com/docs/git-worktree
**Story Template**: `.claude/skills/create-story/resources/story-template.yaml`
**Story Draft Checklist**: `.claude/skills/execute-checklist/resources/story-draft-checklist.md`
