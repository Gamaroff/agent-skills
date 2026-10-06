# Task Review Report: Task 185 - review-pr eval suite

**Reviewed:** 2026-10-05
**Review Depth:** Standard
**Task Status:** Planned (→ Ready for Development after fixes)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-10-05

---

## Executive Summary

A well-anchored task: every `file:line` citation resolves to the code it names, the card preflight and
link check are clean, and the pre-pass finds nothing already implemented. Three Important findings
concern the eval's own guarantees — fake-`gh` isolation, a replay-mode assertion that cannot pass as
written, and a performance bound with no command — and all three had a single defensible fix.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — invoked by `/develop-task` (autonomous); every finding had one defensible fix
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No clarifying questions were asked. The review ran inside the `/develop-task` pipeline (output format,
Step 8.5 and Step 9 auto-answered per `develop-pipeline-autonomous-defaults.md`), and no finding had
more than one reasonable resolution.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking, References and Notes present. No placeholders.
- OKF: `type: task`, `description`, `tags` present.
- Sign-off: not enabled in `skills-config.yaml` — not checked.
- Change Log: present and current (1.0 row; review rows added by this review).
- Tracker: `github_issue: 573` exists (OPEN); body link `[#573](…/issues/573)` matches.
- Card preflight (`sync-jira-task.js --check-card`): exit 0 — Summary (+4 more), Success Criteria (+8 more), Breaking Changes (+3 more).

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (no hallucinations)
**Hallucinations Detected:** 0

Verified: every anchor in §2–§3 — `SKILL.md:52/390/486/515/531/622/633/635/724/768/773`,
`review-pr.test.js:29-33/538`, `runner.mjs:235/240/305`, `claude-cli.mjs:48/74/85`, `replay.mjs:44`,
`git-sandbox.mjs:30`, `package.json:48`, `test.yml:3-6/56`, `.gitignore:62-64` — reads the thing it
names. `doc-links.js`: 1 relative link resolves. `npm test` already globs `skills/review-pr/tests/*.test.js`
and `evals/shared/tests/*.test.mjs`. `lint:shell` takes tracked `*.sh` (`git ls-files`), so the new script
is linted once tracked; `shellcheck` is installed locally. `test.yml` has no `paths:` filter (check 8).
Pre-pass B (`prepass-axes.js` source: `architecture`): `drift`, three low findings — two folded in below,
the third (validation via the `lint:shell` wrapper rather than bare `shellcheck`) is the repo's own wrapper
and not a finding.

### Important

- **Fake-`gh` isolation claim does not hold (Risk 2).** "No `GH_TOKEN` is set in the sandbox env" — but
  the claude-cli driver spreads `process.env` into the child (`claude-cli.mjs:76-81`), and a real `gh`
  also authenticates from its config dir and keyring, so a blank token does not make the real binary
  unauthenticated. **Fix applied:** the setup hook also returns `GH_CONFIG_DIR` pointing at an empty
  `.eval/gh-config` (task Risk 2, Phase 3; plan step 7).
- **Outcome reachability (check 10): "no refused call in `gh-calls.jsonl`" cannot pass in replay.**
  `fileDoesNotMatch` returns `missing file` on an absent file (`assertions.mjs:48`), and in replay no
  agent runs to create the log. **Fix applied:** installing the fake `gh` creates an empty
  `.eval/gh-calls.jsonl` (Target Architecture, Phase 2, plan step 7).

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases with risk, files, dependencies and checkboxes; a 219-line plan file. Same-class inventory
(check 6) is stated: no existing next-artifact-number helper. Effort 16 h is consistent with 4 phases and
~12 criteria.

### Optional

- **Setup duplicated the driver's skill install.** The claude-cli driver already stages
  `.claude/skills/<skill>` when `scenario.skill` is set (`claude-cli.mjs:48`); setup copying it too is a
  second writer for one path. **Fix applied:** setup installs `.agents/skills/review-pr` only; scenarios
  set `scenario.skill: "review-pr"`. (Pre-pass B also read the `.claude/skills` copy as against the
  agent-agnostic path rule — it is a sandbox-only discovery copy, but removing the duplicate settles it.)

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **Performance criterion with a bound and no command (check 4, obs #206).** "`eval:all` wall time grows
  by under 10 s … (measured before and after)" — a wall-clock bound no per-PR test can assert, so it is
  held only by a measured bound with its command. **Fix applied:** `time npm run eval:all` on `develop`
  and on the branch, both recorded in the implementation report.

### Optional

- **Doc sweep missed `tech-stack.md`** (pre-pass B). Its "Test and eval harness" section maps the eval
  layers and is an always-load file. **Fix applied:** added to Phase 4 and Files Summary.

Other criteria classify cleanly: the script criterion and `eval:review-pr` are behaviour criteria held
by named tests/runs; the N=5 pass rates and the live timeout are measured criteria with commands; no
criterion depends on merge.

Mermaid (Step 6.5): one `flowchart LR` in §3 Target Architecture, checked inline — valid syntax, matches
the prose, does not restate the plan. `mermaid-architect` not invoked (independence loss recorded).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks are specific and mitigated; rollback names triggers, steps and validation, with a partial rollback
(drop the `eval:all` entry, keep the harness). The isolation mitigation was corrected above.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues

1. `GH_CONFIG_DIR` → empty dir in the setup hook's env — applied.
2. Fake `gh` install creates an empty `.eval/gh-calls.jsonl` — applied.
3. Name `time npm run eval:all` for the wall-time criterion — applied.

### Consider (Optional) - 2 items

1. Setup installs only `.agents/skills/review-pr`; the driver owns `.claude/skills` — applied.
2. Add `tech-stack.md` to the Phase 4 doc sweep — applied.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the three Important findings were corrected in the document. The
residual risk is the noise of live verdict scenarios, which the task already handles with pass rates.

---

## Next Steps

1. Follow the implementation plan phase by phase (Phase 1 and 2 are independent).
2. Verify `--allowedTools` spelling against `claude --help` before tuning any live assertion.
3. Move the gitignored `.agents/skills` symlink aside before trusting a local green.

---

## Review Metadata

- **Reviewer:** review-task (via /develop-task)
- **Review Date:** 2026-10-05
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.185.review-pr-eval-suite/task.185.review-pr-eval-suite.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md
- **Pre-pass:** B `drift` (3 low; axes from `architecture`), C `not-implemented`
