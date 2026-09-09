# PR Review Report: PR #365 — feat(task.87): execute the shell commands written in table cells

**Reviewed:** 2026-09-09
**PR:** [#365](https://github.com/Gamaroff/agent-skills/pull/365) — `feature/task.87.execute-table-cell-snippets` → `develop` (OPEN)
**Work item:** [`task.87.execute-table-cell-snippets.md`](./task.87.execute-table-cell-snippets.md) — resolved via `branch stem`
**Tracker:** [#364](https://github.com/Gamaroff/agent-skills/issues/364) — OPEN (`task`, `priority:medium`, milestone `Technical Tasks (standalone)`)
**Verdict:** ⚠️ CONCERNS

**Diff scope:** 10 files, +2600/-30. **11 auto-generated files excluded** — the bundled
`skills/*/references/` copies, byte-identical to their `shared/resources/` sources and headed
`AUTO-GENERATED — DO NOT EDIT`. They are half the changed files and would have crowded out real
findings.

**Both lenses run inline, not via Explore subagents** — this session's operating instructions prohibit
the Agent tool. Stated because it changes what the review is: the code lens was executed as probes
against the module across three passes (7 in QA cycle 1, 7 in cycle 2's refute pass, 1 here), and the
conformance lens as direct greps of the diff and the work item. Neither was a prose reading.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.87.implementation.1.execute-table-cell-snippets.md` |
| Review report | ✅ | `task.87.review.1.execute-table-cell-snippets.md` (READY TO IMPLEMENT, 8/10) |
| QA reports | 2 | `task.87.qa.1.*.md` (CONCERNS 90), `task.87.qa.2.*.md` (PASS 100) |
| Gate | **PASS** | `task.87.gate.2.execute-table-cell-snippets.yml` (100/100, `top_issues: []`) |
| DoD | ❌ | Not yet written — **expected**; Step 7 `/finalise` produces it |
| Sprint review | ❌ | Not yet written — **expected**; Step 7 produces it |
| Open bugs | 0 | Both findings were code-review findings on this change set, carried in the gate and fixed in-loop |
| Handover | ✅ n/a | `access.tracker=full`, nothing deferred |

The trail is complete **for this point in the pipeline**. The two absences are the two artifacts
Step 7 writes, which is why 5c runs before Step 7 rather than after.

---

## Acceptance Criteria Traceability

Every criterion traced to evidence **in the diff**, by grep rather than by reading the QA report's
claim about it.

| Criterion | Evidence in diff | Status |
|---|---|---|
| Table-cell command extracted, classified, executed under both shells | `+export function extractTableCellCommands` ; `+    ...extractTableCellCommands(markdown)` merged into `executeFile` | ✅ met |
| Task-77 predicate is a shell-disagreement finding (mutation proof) | `+test("MUTATION PROOF` ; `+        channel: "status"` | ✅ met |
| No change for fenced blocks on a document with no command column | `+          origin: "fence"` ; test "a document with no tables produces the pre-change report exactly"; 98 pre-existing tests unmodified | ✅ met |
| `\|` unescaped before execution; one span = one unit | `+export function unescapeCell` ; mutation B → 4 fail | ✅ met |
| `origin` on every result and visible in the report | `+          origin: block.origin` ; `+.*table cell` in `render()` | ✅ met |
| `zero-blocks-executed` still fires when nothing runs | `+test("a runnable table cell falsifies` and its inverse | ✅ met |
| Corpus surface measured and recorded | Measurement table present in the implementation report and both QA reports | ✅ met |
| A pipe inside a code span is content (TASK87-001) | `+function splitOnDelimiters` ; `+test("TASK87-001` | ✅ met |
| An escaped backtick does not open a span (TASK87-002) | `+test("TASK87-002` | ✅ met |
| Full `npm run ci` green | `CI_EXIT=0`, 2983/0 with `eval:all`; re-verified per cycle | ✅ met |

**10/10 met.** Two of the ten were added mid-flight, when QA found defects the original filing did not
anticipate. That growth is recorded in the Change Log and is legitimate — but a reader comparing the
filed task to the shipped one should know the criteria list is not the one the task was filed with.

---

## Conformance Findings

**[PC-1] consistency · medium · confidence: high — `task.87.execute-table-cell-snippets.md`**

The shipped change adds a **new `channel` field to the `shell-disagreement` finding schema**
(`stdout` / `status`), and that addition is load-bearing: it is the mechanism that makes success
criterion 2 satisfiable at all, because the pre-existing comparison was stdout-only and the task-77
predicate's entire defect is its exit status.

It is documented in the implementation report, both QA reports, rule doc §3, and the PR body. It is
**not** in the task document's §4 Scope, §5 Breaking Changes, §7 Files Summary or §9 Success Criteria
— `grep -i channel` over the work item returns nothing. §5 states "None to the CLI contract" and names
only the higher `blocks` count as the intended behavioural change.

So the work item of record does not record a schema field the change adds. Anyone reading the task to
learn what shipped would miss it — which is the specific drift this lens exists to catch, and it is
not caught anywhere else in the pipeline: the QA gate scores the *work*, not the *document's account*
of the work.

→ Add the `channel` addition to §4 In Scope and §5 Breaking Changes, and note in §5 that a consumer
keying on `kind === "shell-disagreement"` is unaffected while a consumer reading the finding's fields
sees a new one.

**✅ FIXED after this review.** §4 now records the field and why it is in scope by consequence rather
than by original intent; §5 gains a "Two additive schema fields" subsection covering both `channel` and
`origin`/`column`, and states why neither can turn a clean file red; §7 names them. A Change Log row
records the correction. The finding is retained above rather than deleted — a review that quietly edits
away its own findings leaves no evidence the check ran.

**Scope: clean.** Every out-of-scope item in §4 verified untouched by grep on the diff —
`SAFE_COMMANDS`, `COMMAND_RUNNERS`, `DENY_PATTERNS`, `classifyBlock`'s body and the sandbox sentinel
all absent from both `+` and `-` lines. No second extraction construct was added: the only matches for
`blockquote|definition list|<table` are the out-of-scope statement itself and the two documented
limitations — prose, not code.

**Trail: honest.** Gate 2's `top_issues: []` is consistent with both findings having been fixed in the
cycle that raised them, and gate 1 is retained rather than overwritten, so the CONCERNS→PASS history
is legible. The implementation report records two things a self-flattering report would have omitted:
that a mutation attempt produced a module-load failure and was not counted as evidence, and that one
of its own tests was vacuous.

---

## Code Review Findings

The code lens has **no new findings**. It is duplication here by design — `qa-task` ran the adversarial
reviewer in both cycles with `code_review_blocking=true`, 14 probes were executed across them, and the
diff has not changed since gate 2 read PASS. Saying that plainly is more useful than manufacturing a
finding to fill the section.

One interaction is worth recording, surfaced by a probe run for this review:

**[CR-1] cleanup · low · confidence: high — `shared/resources/qa-execute-snippets.mjs`**

The whitespace bound in `looksLikeCommand` narrows the benefit of the TASK87-001 fix. Verified by
execution: `` `ls | wc` `` in a command column extracts, `` `ls|wc` `` does not — a real pipeline
written compactly stays invisible. The fix specifically enabled unescaped-pipe commands, and the
whitespace rule then rejects exactly the compact ones.

This is a documented, deliberate noise bound and it fails toward extracting less, so it is a `cleanup`
rather than a `bug`. → If it is ever revisited, the narrow widening is "contains whitespace **or** a
shell metacharacter", not removal of the bound.

**Two accepted limitations remain open by decision, not by omission**: blockquoted tables are not
recognised, and an unequal backtick run truncates the span. Both are stated in rule doc §1a, both have
no corpus instance, and both are carried in gate 2's `recommendations.future`.

---

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.87.execute-table-cell-snippets/task.87.execute-table-cell-snippets.md"
    finding: The task document does not record the new shell-disagreement `channel` field in its Scope, Breaking Changes, Files Summary or Success Criteria sections, though the field is what makes success criterion 2 satisfiable.
    suggested_action: Add the `channel` addition to section 4 In Scope and section 5 Breaking Changes, noting that a consumer keying on `kind` is unaffected.
  - id: CR-1
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/qa-execute-snippets.mjs:looksLikeCommand"
    finding: The whitespace bound narrows the TASK87-001 fix — a compact pipeline such as `ls|wc` in a command column is still not extracted, verified by execution.
    suggested_action: If revisited, widen to "contains whitespace or a shell metacharacter" rather than removing the bound.
truncated_count: 0
```

---

## Recommended Actions

1. **PC-1** — record the `channel` addition in the task document's §4 and §5. This is the one finding
   that touches the artifact of record, and it is cheap.
2. **CR-1** — no action required; recorded so the limitation is visible rather than rediscovered.
3. Proceed to Step 7 `/finalise`. CONCERNS does not block: gate 2 is PASS with an empty `top_issues[]`,
   all 10 criteria are met with diff-level evidence, and the scope is verifiably clean.
