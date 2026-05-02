# Quality Assurance Skills

Three integrated QA skills covering planning, review, and gate decisions across the development lifecycle.

For the integrated chain see [Workflows](../workflows.md#qa-workflow-integration).

## `qa-planning`

**Purpose:** Upfront test planning and risk assessment before/during development.

**When to use:**

- **Before Development** — planning test strategy for upcoming stories
- **During Sprint Planning** — assessing risks for proposed features
- **Architecture Review** — identifying technical/security risks in designs
- **Test Design** — creating comprehensive test scenarios with appropriate levels and priorities

**Key features:**

- **Risk Profiling** — probability × impact analysis (TECH, SEC, PERF, DATA, BUS, OPS risks)
- **Test Design** — comprehensive test scenarios with level recommendations (unit/integration/e2e)
- **Priority Assignment** — P0/P1/P2/P3 classification for test scenarios
- **Risk Scoring** — 1-9 risk scores with mitigation strategies

**Outputs:**

- Risk profile report: `{qa.qaLocation}/assessments/{epic}.{story}-risk-{YYYYMMDD}.md`
- Test design document: `{qa.qaLocation}/assessments/{epic}.{story}-test-design-{YYYYMMDD}.md`
- Gate YAML blocks for `risk_summary` and `test_design`

**Related:** Use with `qa-review` (review phase) and `qa-gate` (gate decisions).

---

## `qa-review`

**Purpose:** Comprehensive quality review during/after implementation.

**When to use:**

- **Story Review** — when developer marks story as "Review" or "Ready for QA"
- **NFR Validation** — assessing security, performance, reliability, maintainability
- **Requirements Traceability** — mapping acceptance criteria to test coverage
- **Code Quality Assessment** — evaluating architecture, refactoring opportunities, technical debt

**Key features:**

- **Story Review Process** — adaptive test architecture review (depth scales with risk)
- **NFR Assessment** — core four NFRs (security, performance, reliability, maintainability)
- **Requirements Traceability** — Given-When-Then mapping of requirements to tests
- **Active Refactoring** — code improvements during review (when safe)
- **Comprehensive Analysis** — architecture, test quality, testability, technical debt

**Outputs:**

- QA report file: `story.[epic].[story].qa.[descriptive-name].md` (co-located with story)
- NFR assessment: `{qa.qaLocation}/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md`
- Traceability matrix: `{qa.qaLocation}/assessments/{epic}.{story}-trace-{YYYYMMDD}.md`
- Quality gate file: `{qa.qaLocation}/gates/[prd-path]/story.[epic].[story].gate.[descriptive-name].yml`
- Gate YAML blocks for `nfr_validation` and `trace`

**File authorization:**

- **CRITICAL** — only QA report reference links allowed in story files
- Never add QA content directly to story files
- QA reports co-located with story files
- Gate files in mirrored PRD directory structure

**Related:** Use after `qa-planning` (risk/test inputs) and before `qa-gate` (gate formalization).

---

## `qa-gate`

**Purpose:** Create or update quality gate decision files with clear PASS/CONCERNS/FAIL/WAIVED status.

**When to use:**

- **After Story Review** — when `qa-review` has completed comprehensive assessment
- **Creating Gate Files** — formalizing quality decisions in standardized YAML format
- **Updating Gates** — revising gate status after bug fixes or improvements
- **Gate Decisions** — determining status based on risk, NFR, and test findings

**Key features:**

- **Deterministic Decisions** — clear rules for PASS/CONCERNS/FAIL/WAIVED
- **Issue Classification** — fixed severity scale (low/medium/high), standard prefixes (SEC-, PERF-, etc.)
- **Quality Scoring** — 0-100 score based on FAIL (-20) and CONCERNS (-10) deductions
- **Traceability** — links to risk assessments, NFR validations, test coverage
- **Advisory Guidance** — informs teams without blocking progress

**Gate decision criteria (apply in order):**

1. Risk thresholds: Score ≥9 → FAIL, ≥6 → CONCERNS
2. Test coverage gaps: P0 missing → CONCERNS, security P0 missing → FAIL
3. Issue severity: High → FAIL, Medium → CONCERNS
4. NFR statuses: Any FAIL → FAIL, any CONCERNS → CONCERNS, else → PASS
5. Waived: only when `waiver.active: true` with reason/approver

**Outputs:**

- Gate file: `{qa.qaLocation}/gates/[prd-path]/story.[epic].[story].gate.[descriptive-name].yml`

**Gate statuses:**

- **PASS** — all criteria met, no blocking issues
- **CONCERNS** — non-blocking issues, can proceed with awareness
- **FAIL** — critical issues, recommend return to InProgress
- **WAIVED** — issues explicitly accepted with approval

**Related:** Use after `qa-review` to formalize decisions using data from `qa-planning` and `qa-review`.
