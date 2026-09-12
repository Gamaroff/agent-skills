# PR Review Report: PR #396 — feat(task.108): bundler re-relativises links in bundled copies + link guard

**Reviewed:** 2026-09-12
**PR:** [#396](https://github.com/Gamaroff/agent-skills/pull/396) — `feature/task.108.bundler-rewrites-relative-links` → `develop` (OPEN)
**Work item:** [`task.108.bundler-rewrites-relative-links.md`](./task.108.bundler-rewrites-relative-links.md) — resolved via `branch-stem`
**Tracker:** [#395](https://github.com/Gamaroff/agent-skills/issues/395) — OPEN
**Verdict:** ✅ APPROVE

Scope: `origin/develop...HEAD` with `*/references/*` excluded (205 generated bundle copies, byte-identical to the bundler's output — verified by `bundle --check --all`); 28 files, +2,497/−122 reviewed. Effort: medium.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.108.implementation.1.bundler-rewrites-relative-links-initial-run.md` |
| Review report | ✅ | `task.108.review.1.bundler-rewrites-relative-links.md` (READY TO IMPLEMENT 9/10) |
| QA reports | 4 | `qa.1` … `qa.4` |
| Gate | PASS | `task.108.gate.4.bundler-rewrites-relative-links.yml` (100) — `top_issues: []`; gates 1–3 closed in place |
| DoD | ❌ (expected) | not yet — Step 7 `/finalise` writes it |
| Sprint review | ❌ (expected) | written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ (none) | no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. Checker 0 broken over `skills/**/*.md` + `shared/resources/**/*.md`, ≥ 200 files / ≥ 1,000 links | `tests/bundled-links.test.js` (floors 200/1,000/20-shared; 663 files, 2,098 links, 0 broken) + `tests/lib/markdown-links.js` | ✅ met |
| 2. `npm run bundle` idempotent | `bundle_skill.py` `expected_bytes` decides siblings from `needed ∪ reconcilable`; `tests/bundle-link-rewrite.test.js` "idempotent"; second run no-op in 4 QA cycles | ✅ met |
| 3. Zip contains no broken relative links | `package_skill.py` imports the pass, writes `expected_bytes`, no duplicate arcnames, outside-the-skill rule on own `.md`; "package path" test; 5 skills extracted clean by QA | ✅ met |
| 4. Checker runs under `npm test` (→ `ci`, `test.yml`) | `tests/*.test.js` glob (no `package.json` change); CI `test` job green on three heads | ✅ met |
| 5. Mutation proof recorded | implementation report Step 3 + QA cycles 1–4 (pass stubbed; floor emptied; in-skill branch; bundled set; `<>` placeholder; `ok` check; nested-source join; shared-half pathspec) | ✅ met |
| 6. Audit note points at this task | `docs/reference/develop-story-pipeline-audit.2026-08-20.md` Theme F close-out | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: low — task.108 frontmatter (no pr_number:)
  github_issue: 395 is present but pr_number: is not; by convention /finalise writes it at acceptance, so its absence at Step 5c is expected.
  → No action now; confirm /finalise writes pr_number: 396 with status: accepted.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — skills/create-skill/scripts/package_skill.py:121
  The packager's bundled_names unions every file under references/ (skill-native included), so a shared source linking a name that exists only as a skill-native reference would be relative in the zip but upstream in-tree.
  → Restrict the on-disk contribution to banner-declared (shared-backed) copies, mirroring source_backed_on_disk.

[CR-2] bug · low · confidence: medium — tests/bundled-links.test.js:63
  git ls-files without -z returns C-quoted paths for non-ASCII names under the default core.quotePath, which would make readFileSync throw for that file.
  → Use `git ls-files -z` and split on NUL (or -c core.quotePath=false).

[CR-3] cleanup · low · confidence: medium — evals/shared/lib/bundled-parity.mjs:89
  declaredSource scans the first 4,000 characters while the bundler's banner window is the first 40 lines; the two can classify a long-frontmatter copy differently.
  → Match the bundler's window (first 40 lines).
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: low
    ref: "docs/tasks/task.108.bundler-rewrites-relative-links/task.108.bundler-rewrites-relative-links.md frontmatter (no pr_number:)"
    finding: "pr_number: is absent from the task frontmatter although PR #396 exists; by convention /finalise writes it at acceptance, so it is expected to be absent at Step 5c."
    suggested_action: "No action now; confirm /finalise writes pr_number: 396 alongside status: accepted."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "skills/create-skill/scripts/package_skill.py:121"
    finding: "The packager's bundled_names includes skill-native references/ files, so a shared source's bare-sibling link to such a name is relative in the zip but an upstream URL in-tree."
    suggested_action: "Restrict the on-disk contribution to banner-declared copies, mirroring source_backed_on_disk."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "tests/bundled-links.test.js:63"
    finding: "git ls-files without -z C-quotes non-ASCII paths under the default core.quotePath, so readFileSync would throw for such a file."
    suggested_action: "Use git ls-files -z and split on NUL, or pass -c core.quotePath=false."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: "evals/shared/lib/bundled-parity.mjs:89"
    finding: "declaredSource scans 4,000 characters while the bundler's banner window is 40 lines; the two can disagree on a long-frontmatter copy."
    suggested_action: "Match the bundler's 40-line window."
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise` — the trail is complete for Step 5c (gate 4 PASS, `top_issues` empty, four QA reports for four gates, no open bugs) and every success criterion has evidence in the diff.
2. Carry CR-1..3 as follow-ups (all low; none affects the corpus today — no non-ASCII tracked path, no skill-native name colliding with a shared sibling link).
3. Confirm `/finalise` writes `pr_number: 396` (PC-1).
