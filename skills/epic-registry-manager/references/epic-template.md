<!--
╔═══════════════════════════════════════════════════════════════╗
║ ⚠️  CRITICAL: Check Epic Registry BEFORE Creating This Epic  ║
║                                                                ║
║ 1. Open: /docs/development/epic-registry.md                  ║
║ 2. Use "Next Available Epic Number" for YOUR epic number     ║
║ 3. Update registry table with your epic details              ║
║ 4. Increment "Next Available Epic Number" counter            ║
║ 5. Commit registry + epic file together                      ║
║                                                                ║
║ Epic numbers are GLOBALLY UNIQUE across entire system        ║
╚═══════════════════════════════════════════════════════════════╝
-->

---
title: 'Epic [N]: [Epic Name]'
prd_source: '[source-document].md'
epic_type: 'system_implementation | feature_enhancement | infrastructure | integration'
priority: 'critical | high | medium | low'
estimated_sprints: N
dependencies: ['epic-X', 'epic-Y']
status: 'NOT_STARTED | IN_PROGRESS | PARTIALLY_COMPLETE | COMPLETE'
completion_percentage: 0-100
blocked_by: ['epic-X'] # Optional, only if blocked
team: ['developer-1', 'developer-2', 'designer', 'qa']
start_date: 'YYYY-MM-DD' # Optional
target_date: 'YYYY-MM-DD' # Optional
---

# Epic [N]: [Epic Name]

**Status**: [Emoji] [Detailed Status Description]
**Last Updated**: YYYY-MM-DD
**Sprint**: [Current Sprint Number/Name]

## Epic Goal

[Single, clear, concise statement (1-2 sentences) of what this epic achieves. Should be measurable and outcome-focused.]

**Example**: "Integrate all customization components with the main Settings screen and implement AsyncStorage persistence, enabling users to save and access their action bar preferences."

---

## Background & Context

### Source PRD Section

**Document**: [Product Requirements](../product-requirements.md#section-name)
**Related Specs**: [[Specification Name]](../[spec-name].md)

### System Integration

This epic integrates with:

- [System/Component 1] - [How it integrates]
- [System/Component 2] - [How it integrates]
- [System/Component 3] - [How it integrates]

### Prerequisites

Before starting this epic, the following must exist:

- [x] [Prerequisite 1] - ✅ Complete (Epic [N])
- [x] [Prerequisite 2] - ✅ Complete (Epic [N])
- [ ] [Prerequisite 3] - ❌ Blocking (needs Epic [N])

**Current State**:

- [What's already built]
- [What's missing]
- [Why this epic is needed now]

---

## Epic Description

### What We're Building

**Primary Deliverables**:

1. [Deliverable 1] - [Detailed description]
2. [Deliverable 2] - [Detailed description]
3. [Deliverable 3] - [Detailed description]

**Secondary Deliverables**:

1. [Deliverable 4] - [Detailed description]
2. [Deliverable 5] - [Detailed description]

**Out of Scope** (for this epic):

- [Explicitly excluded item 1]
- [Explicitly excluded item 2]

### Why It Matters

**Business Value**:

- [Business benefit 1]
- [Business benefit 2]
- [Business benefit 3]

**Technical Value**:

- [Technical benefit 1]
- [Technical benefit 2]
- [Technical benefit 3]

**User Value**:

- [User benefit 1]
- [User benefit 2]
- [User benefit 3]

### Success Criteria

- [ ] **Criterion 1**: [Specific, measurable success metric]
- [ ] **Criterion 2**: [Specific, measurable success metric]
- [ ] **Criterion 3**: [Specific, measurable success metric]
- [ ] **Criterion 4**: [Specific, measurable success metric]
- [ ] **Criterion 5**: [Specific, measurable success metric]

---

## Stories Breakdown

### Story [Epic]-1: [Story Name]

**Status**: ❌ Not Started | 🔄 In Progress | ✅ Complete | ⚠️ Blocked
**Priority**: Critical | High | Medium | Low
**Estimated Effort**: [Story Points or Hours]
**Assigned To**: [Developer/Team]

**As a** [user type]
**I want** [capability]
**So that** [benefit]

**Acceptance Criteria**:

- [ ] **AC1**: [Specific, testable criterion]
- [ ] **AC2**: [Specific, testable criterion]
- [ ] **AC3**: [Specific, testable criterion]

**Technical Requirements**:

- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

**Implementation Notes**:

- [Key implementation detail 1]
- [Key implementation detail 2]
- [Dependency on other stories]

**Files to Modify/Create**:

```
path/to/file1.tsx - [Purpose]
path/to/file2.ts - [Purpose]
path/to/file3.spec.ts - [Purpose]
```

---

### Story [Epic]-2: [Story Name]

**Status**: ❌ Not Started | 🔄 In Progress | ✅ Complete | ⚠️ Blocked
**Priority**: Critical | High | Medium | Low
**Estimated Effort**: [Story Points or Hours]
**Assigned To**: [Developer/Team]

**As a** [user type]
**I want** [capability]
**So that** [benefit]

**Acceptance Criteria**:

- [ ] **AC1**: [Specific, testable criterion]
- [ ] **AC2**: [Specific, testable criterion]
- [ ] **AC3**: [Specific, testable criterion]

**Technical Requirements**:

- [Requirement 1]
- [Requirement 2]

**Implementation Notes**:

- [Key implementation detail]
- [Integration point]

**Files to Modify/Create**:

```
path/to/file1.ts - [Purpose]
path/to/file2.ts - [Purpose]
```

---

### Story [Epic]-3: [Story Name]

**Status**: ❌ Not Started | 🔄 In Progress | ✅ Complete | ⚠️ Blocked
**Priority**: Critical | High | Medium | Low
**Estimated Effort**: [Story Points or Hours]
**Assigned To**: [Developer/Team]

**As a** [user type]
**I want** [capability]
**So that** [benefit]

**Acceptance Criteria**:

- [ ] **AC1**: [Specific, testable criterion]
- [ ] **AC2**: [Specific, testable criterion]

**Technical Requirements**:

- [Requirement 1]
- [Requirement 2]

**Implementation Notes**:

- [Key implementation detail]

---

### Story [Epic]-[N]: [Additional Stories...]

[Continue pattern for all stories in epic]

---

## Technical Architecture

### Components Involved

**New Components** (to be created):

```
app/(drawer)/[feature]/
├── index.tsx                      # Main screen
├── [subscreen1].tsx               # Sub-screen 1
├── [subscreen2].tsx               # Sub-screen 2
└── components/
    ├── [component1].tsx           # Component 1
    └── [component2].tsx           # Component 2
```

**Existing Components** (to be modified):

```
app/(drawer)/[feature]/
├── [existing-file1].tsx           # Modify for [purpose]
└── [existing-file2].tsx           # Modify for [purpose]
```

**Shared Services** (to be created/modified):

```
libs/@goji-system/[library]/src/
├── [service1].ts                  # New service
├── [service2].ts                  # Modify existing
└── [types].ts                     # Add new types
```

### Database Changes

**Schema Modifications**:

- [Table/Collection 1]: [Changes needed]
- [Table/Collection 2]: [Changes needed]

**Migrations Required**:

```sql
-- Migration: [migration-name]
-- Description: [What this migration does]
[SQL or migration code]
```

### API Changes

**New Endpoints**:

- `GET /api/[resource]` - [Description]
- `POST /api/[resource]` - [Description]
- `PUT /api/[resource]/:id` - [Description]
- `DELETE /api/[resource]/:id` - [Description]

**Modified Endpoints**:

- `GET /api/[existing-resource]` - [What's changing]

**Request/Response Schemas**:

```typescript
interface [Resource]Request {
  // Request schema
}

interface [Resource]Response {
  // Response schema
}
```

### State Management

**State Schema**:

```typescript
interface [Epic]State {
  // Core state
  [property1]: [Type];
  [property2]: [Type];

  // UI state
  loading: boolean;
  error: string | null;

  // Derived state
  [computed1]: [Type];
}
```

**State Flow**:

```
User Action
    ↓
Component Event Handler
    ↓
State Update (useState/Context)
    ↓
Service Layer (validation/logic)
    ↓
API/Storage Layer
    ↓
State Update
    ↓
Re-render
```

### Integration Points

**Integrations Required**:

- **[System 1]**: [How this epic integrates]

  - Integration type: [API, Event, Direct call]
  - Data flow: [Direction and format]
  - Error handling: [Strategy]

- **[System 2]**: [How this epic integrates]
  - Integration type: [Type]
  - Data flow: [Direction and format]
  - Error handling: [Strategy]

**Navigation Integration**:

```typescript
// Navigation changes
<Stack.Screen name="[ScreenName]" component={[Component]} />
```

---

## Dependencies

### Depends On (Blockers)

- [ ] **Epic [N]**: [Epic Name]

  - **Reason**: [Why this is a dependency]
  - **Status**: [Status]
  - **Impact if not complete**: [Impact description]

- [ ] **[External Dependency]**: [Description]
  - **Owner**: [Team/Person]
  - **Status**: [Status]
  - **Impact if not complete**: [Impact description]

### Blocks (What this epic enables)

- [ ] **Epic [N+1]**: [Epic Name]

  - **Reason**: [Why Epic [N+1] depends on this]
  - **Specific requirement**: [What specifically is needed]

- [ ] **Epic [N+2]**: [Epic Name]
  - **Reason**: [Why Epic [N+2] depends on this]
  - **Specific requirement**: [What specifically is needed]

### Parallel Work Opportunities

**Can be developed in parallel**:

- Story [Epic]-1 and Story [Epic]-3 (no dependencies)
- Story [Epic]-2 can start after Story [Epic]-1 completes

**Must be sequential**:

- Story [Epic]-4 requires Story [Epic]-2 completion
- Story [Epic]-5 requires all previous stories

---

## Risks & Mitigation

### High Priority Risks 🔴

**Risk 1**: [Risk Description]

- **Probability**: High | Medium | Low
- **Impact**: High | Medium | Low
- **Affected Stories**: Story [Epic]-1, Story [Epic]-2
- **Mitigation Strategy**: [Detailed strategy]
- **Contingency Plan**: [Backup plan]
- **Owner**: [Person responsible]
- **Status**: [Active monitoring, Mitigated, Realized]

**Risk 2**: [Risk Description]

- **Probability**: High | Medium | Low
- **Impact**: High | Medium | Low
- **Affected Stories**: Story [Epic]-3
- **Mitigation Strategy**: [Detailed strategy]
- **Contingency Plan**: [Backup plan]
- **Owner**: [Person responsible]
- **Status**: [Status]

### Medium Priority Risks ⚠️

**Risk 3**: [Risk Description]

- **Probability**: Medium
- **Impact**: Medium
- **Mitigation Strategy**: [Strategy]

### Low Priority Risks ℹ️

**Risk 4**: [Risk Description]

- **Probability**: Low
- **Impact**: Low
- **Mitigation Strategy**: [Strategy]

### Technical Risks

**Performance Risk**: [Description]

- **Mitigation**: [Strategy]
- **Benchmark**: [Target metric]

**Security Risk**: [Description]

- **Mitigation**: [Strategy]
- **Validation**: [How to verify]

---

## Testing Strategy

### Unit Testing

**Coverage Target**: 80%+ overall, 95%+ for critical paths

**Test Scenarios**:

- [ ] [Component 1] - [Test scenario]
- [ ] [Component 2] - [Test scenario]
- [ ] [Service 1] - [Test scenario]
- [ ] [Utility function] - [Test scenario]

**Test Files**:

```
[component].spec.tsx
[service].spec.ts
[hook].spec.ts
```

### Integration Testing

**Test Scenarios**:

- [ ] [Integration scenario 1] - [What's being tested]
- [ ] [Integration scenario 2] - [What's being tested]
- [ ] [End-to-end flow] - [Complete user journey]

**Tools**: Jest, React Native Testing Library

### Manual Testing

**Test Cases**:

- [ ] [Manual test 1] - [Steps and expected outcome]
- [ ] [Manual test 2] - [Steps and expected outcome]
- [ ] [Edge case 1] - [Specific scenario to verify]

### Performance Testing

**Benchmarks**:

- Load time: [Target, e.g., <500ms]
- Animation FPS: [Target, e.g., 60fps]
- Memory usage: [Target, e.g., <10MB]
- Bundle size impact: [Target, e.g., <50KB]

### Accessibility Testing

**Requirements**:

- [ ] Screen reader compatibility (VoiceOver/TalkBack)
- [ ] Keyboard navigation support
- [ ] Color contrast validation (WCAG 2.1 AA)
- [ ] Touch target sizes (minimum 44x44)
- [ ] Reduce motion support

---

## Definition of Done

Epic [N] is complete when all criteria below are met:

### Story Completion

- [ ] All stories completed and verified
- [ ] All acceptance criteria met for each story
- [ ] No critical or high severity bugs remaining

### Code Quality

- [ ] Code reviewed and approved by [N]+ team members
- [ ] All ESLint/TypeScript warnings resolved
- [ ] No code smells or technical debt introduced
- [ ] Follows project coding standards

### Testing

- [ ] Unit tests passing ([Target]% coverage achieved)
- [ ] Integration tests passing
- [ ] Manual testing completed and documented
- [ ] Performance benchmarks met
- [ ] Accessibility requirements verified

### Integration

- [ ] All components integrated with main application
- [ ] Navigation flows working correctly
- [ ] API integrations verified
- [ ] Database migrations applied
- [ ] No regressions in existing features

### Documentation

- [ ] Code comments added for complex logic
- [ ] README files updated
- [ ] API documentation current
- [ ] Architecture diagrams updated
- [ ] User-facing documentation created (if needed)

### Deployment

- [ ] Feature flag configured (if applicable)
- [ ] Environment variables documented
- [ ] Deployment runbook created
- [ ] Rollback plan documented

### Acceptance

- [ ] Product owner sign-off
- [ ] Stakeholder demo completed
- [ ] User acceptance criteria validated
- [ ] Ready for production release

---

## Estimated Timeline

### Planning Phase

- **Requirements gathering**: [X] days
- **Technical design**: [X] days
- **Story breakdown**: [X] days
- **Total**: [X] days

### Development Phase

- **Sprint 1**: Story [Epic]-1, Story [Epic]-2
- **Sprint 2**: Story [Epic]-3, Story [Epic]-4
- **Sprint 3**: Story [Epic]-5, testing
- **Total**: [X] sprints ([X] weeks)

### Testing & Polish Phase

- **Integration testing**: [X] days
- **Bug fixes**: [X] days
- **Final validation**: [X] days
- **Total**: [X] days

### Total Estimated Duration

**[X] weeks** from kickoff to completion

### Key Milestones

- **[Date]**: Epic kickoff
- **[Date]**: Stories [Epic]-1,2 complete
- **[Date]**: Mid-epic review
- **[Date]**: All stories complete
- **[Date]**: Testing complete
- **[Date]**: Epic complete and deployed

---

## Success Metrics

### User Experience Metrics

- [Metric 1]: [Current value] → [Target value]
- [Metric 2]: [Current value] → [Target value]
- [Metric 3]: [Current value] → [Target value]

### Technical Performance Metrics

- [Metric 1]: [Current value] → [Target value]
- [Metric 2]: [Current value] → [Target value]
- [Metric 3]: [Current value] → [Target value]

### Business Impact Metrics

- [Metric 1]: [Current value] → [Target value]
- [Metric 2]: [Current value] → [Target value]

### Measurement Plan

- **Tracking Method**: [How metrics will be tracked]
- **Review Frequency**: [How often metrics reviewed]
- **Success Threshold**: [What defines success]

---

## Resources & References

### Story Documentation

- [Story [Epic]-1: [Name]](./stories/story.[epic].1.[name].md)
- [Story [Epic]-2: [Name]](./stories/story.[epic].2.[name].md)
- [Story [Epic]-3: [Name]](./stories/story.[epic].3.[name].md)
- [Additional stories...]

### Epic Roadmap

- [Epic [N] Roadmap](./EPIC-[N]-ROADMAP.md) - Week-by-week execution plan

### Related Documentation

- [Product Requirements](../../product-requirements.md) - Source requirements
- [Technical Implementation](../../technical-implementation.md) - Architecture details
- [Developer Quick Start](../../DEVELOPER-QUICK-START.md) - Implementation guide
- [[Specification]](../../[spec-name].md) - Feature specification

### Related Epics

- [Epic [N-1]: [Name]](../epic.[n-1].[name]/epic.[n-1].[name].md) - Previous epic
- [Epic [N+1]: [Name]](../epic.[n+1].[name]/epic.[n+1].[name].md) - Next epic

### Project Resources

- [Implementation Phases](../../implementation-phases.md) - Overall roadmap
- [Implementation Status](../../IMPLEMENTATION-STATUS.md) - Current progress
- [Cross-Reference Guide](../../CROSS-REFERENCE-GUIDE.md) - Navigation help

---

## Notes & Updates

### Change Log

**[Date]**: [Change description]

- [Detail 1]
- [Detail 2]

**[Date]**: [Change description]

- [Detail 1]

### Open Questions

- [ ] [Question 1] - Owner: [Person]
- [ ] [Question 2] - Owner: [Person]

### Decisions Made

- **[Date]**: [Decision description]
  - **Context**: [Why this decision was needed]
  - **Options considered**: [Alternatives]
  - **Decision**: [What was decided]
  - **Rationale**: [Why this was chosen]

---

**Quick Links**:
[Epic Goal](#epic-goal) | [Stories](#stories-breakdown) | [Dependencies](#dependencies) | [Definition of Done](#definition-of-done)

**Status**: Last updated YYYY-MM-DD | **Owner**: [Team/Person] | **Slack**: [#channel-name]
