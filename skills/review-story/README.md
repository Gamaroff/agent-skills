# Review Story Skill

**Interactive** comprehensive story document review that asks clarifying questions instead of making assumptions. Identifies inaccuracies, gaps, inconsistencies, and quality issues through collaborative user input.

It has a second mode, **Validate** (`--validate`, or "is this story ready?"): a non-interactive GO/NO-GO gate with a 1–10 readiness score. See [Validate mode](#validate-mode) below.

## Key Features

🎯 **Interactive Review** - Asks clarifying questions rather than making assumptions
🤝 **User-Aligned** - Recommendations based on your vision and decisions
🔍 **Comprehensive Analysis** - analysis Steps 2–8 plus Mermaid and wireframe checks, with anti-hallucination detection
📊 **Batched Questions** - one Unified Question Point (at most 4 questions) after the analysis, skipped in validate mode
✅ **Actionable Output** - Specific fixes aligned with user's intent

## Quick Start

```bash
# Basic usage - review a story document
/review-story story.1.310.5.socketio-real-time-delivery.md

# With specific focus areas
/review-story story.1.2.3.auto-hide.md --focus testing,api-specs

# Quick review (15-30 min)
/review-story story.1.4.1.user-auth.md --depth quick

# Thorough review (60-90+ min)
/review-story story.1.1.5.critical-feature.md --depth thorough

# Validate mode - non-interactive GO/NO-GO gate
/review-story --validate story.1.310.5
```

## Validate mode

`/review-story --validate <path | #issue | story id>` (or "is this story ready?", "score this story") runs the same analysis without asking anything and returns a **GO / NO-GO** verdict with a 1–10 readiness score.

- **Standalone validate** is read-only. It never edits the story, saves its report as `.validate.{date}.md`, and exits non-zero on NO-GO, so it works as a CI gate or a batch check across an epic.
- **Validate-and-apply** is the variant `develop-story` (and `po`) runs at Step 2. It still asks nothing, but it applies the critical and important fixes, promotes `Draft → Ready for Development` on a GO (HALT on NO-GO), and writes a normal `.review.{n}.{story-name}.md` report.

Full contract: [SKILL.md § Validate Sub-Modes](SKILL.md#validate-sub-modes).

## Interactive Review Process

Unlike traditional code review tools, `/review-story` **asks clarifying questions** instead of making assumptions:

### When Questions Are Asked

The skill asks questions when it encounters:

- **Ambiguities**: Multiple valid interpretations ("fast response" - how fast?)
- **Conflicts**: Story contradicts architecture/epic (Which is correct?)
- **Gaps**: Missing essential information (What error scenarios to handle?)
- **Hallucinations**: Technology not in docs (Use documented lib or add new?)
- **Technical Decisions**: Choice between approaches (WebSocket or Socket.IO?)

### Question Batching Strategy

The analysis steps collect every finding without stopping to ask. Then, after Step 8, **one Unified Question Point** asks at most 4 high-impact questions covering everything found. Validate mode skips it.

The pre-flight prompts still fire where they are defined: the Step 0 output-format choice, the Step 0a branch setup, and the Step 2 tracker-sync opt-in.

### Example Question

```
Q: "Story mentions 'react-native-super-cache' library not in tech stack.
    What caching solution should be used?"

Options:
  [Use documented lib] - Replace with existing solution from architecture
  [Add new library]    - Install and update tech stack docs
  [Clarify approach]   - Describe caching approach without assuming library
```

### Your Answers Drive Recommendations

All recommendations in the final report are based on **your decisions**, not AI assumptions:

- ✅ "Update AC #3 to specify <500ms response time (p95)" - _Per user decision_
- ✅ "Replace 'react-native-super-cache' with documented AsyncStorage" - _Per user decision_
- ❌ NOT: "Recommend using AsyncStorage" (without asking first)

## What It Does

The steps follow the headings in [SKILL.md](SKILL.md):

- **Step 0 — Mode and output format**: interactive or validate; full report or action plan
- **Step 0a — Branch setup**: makes sure review edits land on a feature branch
- **Step 1 — Context discovery**: loads the story, epic and architecture docs, and runs the parallel pre-pass (epic alignment, architecture alignment, codebase scan)
- **Step 2 — Template structure compliance**: required sections, metadata, tracker linkage, card preflight
- **Step 3 — Epic alignment**: the story implements what the epic asks
- **Step 4 — Technical accuracy**: detects hallucinations and verifies technical claims
- **Step 5 — Completeness and gaps**: missing information
- **Step 6 — Consistency and conflicts**: contradictions
- **Step 6.5 — Mermaid diagram validation** (via `mermaid-architect`)
- **Step 6.6 — Wireframe verification** (via `wireframe`): checks embedded wireloom blocks and suggests a wireframe for UI stories
- **Step 7 — Quality and clarity**: developer usability
- **Step 8 — Previous story context**: continuity with earlier stories
- **Unified Question Point** (interactive mode only)
- **Step 9 — Generate output**: the review report or action plan
- **Step 9.5 — Offer to implement fixes**
- **Step 9.6 — Sync body changes to the tracker** (when fixes were applied)
- **Step 10 — Update document status**
- **Step 10a — Record the reviewed revision**: stamps the report so `develop-story` Step 2 can reuse the review
- **Step 11 — Post tracker comment**

## Review Depths

### Quick (15-30 minutes)

- Critical issues only
- Template compliance
- Epic alignment
- Major hallucinations
- High-level completeness

**Use when**: Quick sanity check, time-constrained

### Standard (30-60 minutes) - DEFAULT

- Every analysis step fully executed
- Comprehensive issue detection
- Actionable recommendations
- Full report

**Use when**: Normal pre-implementation review, quality gate

### Thorough (60-90+ minutes)

- Deep analysis with cross-reference verification
- Detailed quality scoring
- Comparison with similar stories
- Comprehensive recommendations with examples

**Use when**: Critical story, high risk, quality audit

## Output

Generates a comprehensive review report:

```
[story-directory]/story.{P}.{E}.{S}.review.{n}.{story-name}.md
```

Report includes:

- **Executive Summary** - Quick overview of findings
- **Issue Categories** - Critical, Important, Optional
- **Hallucination Detection** - Invented technical details
- **Gap Analysis** - Missing information
- **Consistency Report** - Conflicts and contradictions
- **Quality Scores** - Clarity ratings (1-10)
- **Implementation Readiness** - GO/NO-GO recommendation
- **Actionable Recommendations** - Specific fixes prioritized

## Issue Severity Levels

### 🚨 Critical (Must Fix)

- Missing epic requirements
- Invented libraries/APIs not in architecture
- ACs without implementing tasks
- Direct contradictions
- Ambiguous/unmeasurable ACs

**Impact**: Blocks implementation or causes major issues

### ⚠️ Important (Should Fix)

- Missing source references
- Vague file locations
- Incomplete testing specs
- Inconsistent naming
- Poor task granularity

**Impact**: Affects quality or maintainability

### 💡 Optional (Nice to Have)

- Additional helpful context
- Minor clarity improvements
- Enhanced documentation

**Impact**: Improves clarity or completeness

## Common Use Cases

### 1. Pre-Implementation Review

"Before starting story 2.3, check it for issues"

- Ensures story is ready for development
- Catches problems before they become code issues
- Saves developer time

### 2. Quality Audit

"Review all Epic 3 stories for consistency"

- Ensures pattern consistency across stories
- Validates architecture alignment
- Maintains quality standards

### 3. Post-Mortem Analysis

"Story 4.2 went off-track. Why?"

- Analyzes story gaps that led to implementation issues
- Identifies missing or unclear requirements
- Improves future story writing

### 4. Epic Migration Review

"Epic was updated. Does story 1.5 still align?"

- Validates story against updated epic
- Identifies new or removed requirements
- Ensures synchronization

### 5. Architecture Validation

"New architecture docs published. Review story 3.2"

- Verifies technical accuracy against new standards
- Checks for deprecated patterns
- Ensures compliance

## Anti-Hallucination Detection

The review skill rigorously detects:

- **Invented Technologies** - Libraries/frameworks not in tech stack
- **Incorrect APIs** - Endpoints that don't match API specs
- **Unsourced Claims** - Technical details without references
- **Conflicting Specs** - Contradictions with architecture docs
- **Vague Sources** - Generic references without specifics

**Example Detection**:

```markdown
#### Critical (Hallucination)

- **Invented Library**: Story mentions "react-native-navigation-pro"
  - **Location:** Dev Notes > Navigation section
  - **Issue:** This library is not in architecture/tech-stack.md
  - **Recommendation:** Replace with documented alternative (Expo Router)
```

## Integration with Other Skills

### Complements

- `/create-story` - Story creation workflow
- `/edit-story` - Modify existing stories
- `/develop` - Implementation guidance

## Tips for Best Results

1. **Run Before Starting** - Catch issues early
2. **Use Standard Depth** - Best balance of speed and thoroughness
3. **Act on Critical Issues** - Don't ignore must-fix items
4. **Review the Report** - Not just the summary scores
5. **Iterate** - Fix issues and re-review if needed
6. **Learn Patterns** - Use reviews to improve story writing

## Success Metrics

A story is ready when review shows:

- ✅ No critical issues
- ✅ Minimal important issues (< 3)
- ✅ Implementation readiness score ≥ 8/10
- ✅ All technical claims have sources
- ✅ All ACs covered by tasks
- ✅ Clear, actionable guidance for developer

## Resources


- Story template: `resources/story-template.yaml`
- Configuration: Inline configuration or explicit file references

## See Also

- `/create-story` - Create new story documents
- `/edit-story` - Modify existing stories
- `/develop` - Implement stories
