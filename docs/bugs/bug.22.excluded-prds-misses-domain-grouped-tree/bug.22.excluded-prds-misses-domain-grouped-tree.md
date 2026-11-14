---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-11-11'
related: 'none — cross-cutting (no single owner)'
github_issue: 903
description: 'qa-next excludedPrds matches only the first folder under docs/prd/, which is the domain in a domain-grouped tree, so a PRD-folder entry never excludes anything'
---

**Bug ID**: bug.22.excluded-prds-misses-domain-grouped-tree
**Related**: None — cross-cutting bug (no single owner)
**Status**: 🔍 Ready for QA
**GitHub**: [#903](https://github.com/Gamaroff/agent-skills/issues/903)
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-11-11
**Assigned To**: Unassigned
**QA Engineer**: Unassigned

---

## Bug Description

**Summary**: `scanStories` in `skills/qa-next/scripts/uat-status.mjs` decides which PRD a story belongs to with `relative(base, file).split("/")[0]`, the first folder under the stories root. In a domain-grouped tree (`docs/prd/<domain>/prd.{P}.{slug}/…`, the layout `doc-id.js` produces) that folder is the domain, not the PRD.

**Expected Behavior**: an `excludedPrds` entry naming a PRD folder (`prd.1.multi-game-web-portal`) excludes that PRD's stories, as `skills/qa-next/README.md` step 2 tells the user to do ("list superseded PRD directories under `excludedPrds`").

**Actual Behavior**: the entry never matches. The superseded PRD's stories stay in the registry scan and show as uncovered in `--coverage`. Nothing warns that an entry matched nothing.

**Impact**: silently wrong UAT coverage for any consumer with a domain-grouped PRD tree. The only workaround, naming the domain folder, also drops every other PRD later filed in that domain, with no warning.

---

## Reproduction Steps

**Environment**: any consumer with `docs/prd/<domain>/prd.{P}.{slug}/…` and a `uat-surfaces.json` carrying `excludedPrds`. Seen in tinker-city.

**Steps to Reproduce**:

1. Create `docs/prd/portal/prd.1.multi-game-web-portal/` and `docs/prd/portal/prd.2.developer-toolkit/`, each with a story.
2. Set `excludedPrds: ["prd.1.multi-game-web-portal"]` in `uat-surfaces.json`.
3. Run `node .agents/skills/qa-next/scripts/uat-status.mjs --coverage`.
4. PRD 1's story is still listed.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Observed in tinker-city**: `excludedPrds: ["prd.multi-game-web-portal", "prd.developer-toolkit"]` excluded nothing. The 7 stories of superseded PRD 1 showed in `--coverage` as uncovered. The workaround, tinker-city commit `e5f1201c`, is `excludedPrds: ["portal"]`. It works only because `portal/` holds nothing but PRDs 1 and 2.

**Affected-site grep** (run on `develop` at `8263f97c`, one hit, the defect itself):

```
grep -n 'split("/")\[0\]' skills/qa-next/scripts/*.mjs
skills/qa-next/scripts/uat-status.mjs:244:    const prd = relative(base, file).split("/")[0];
```

**Related Files**: `skills/qa-next/scripts/uat-status.mjs` (line 244), `skills/qa-next/README.md` (step 2), `skills/qa-next/SKILL.md` (line 65), `shared/resources/doc-id.js`.

---

## Scope & Impact

**Reference**: the qa-next UAT registry scan; every consumer with a domain-grouped PRD tree.

**How It Failed**: the first-segment rule assumes a flat tree (`docs/prd/<prd>/…`). It was right for that layout and was never revisited when domain grouping arrived. No single story or task owns it: it cuts across the PRD layout (`doc-id.js`) and the UAT registry tool.

**Suggested fix**: match an entry against every path segment that is a PRD folder (`prd.{P}.{slug}`, or a legacy `prd.{slug}`), recognised through `doc-id.js` (the chokepoint test forbids a hand-written id regex). Keep the first-segment match so flat trees and existing configs behave as before.

**Tests to add**: in a domain-grouped fixture, an entry naming the PRD folder excludes that PRD's stories and not a sibling PRD's in the same domain; a flat tree keeps today's behaviour; a domain-name entry still works. Mutation: revert to `split("/")[0]` and the first test must go red.

**Once fixed**: tinker-city can change its entry back to `prd.1.multi-game-web-portal` / `prd.2.developer-toolkit` after its next re-vendor.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-11-14
**Developer**: Claude (develop-bug)

**Reproduction**: a domain-grouped fixture (`docs/prd/portal/prd.1.…` and `prd.2.…`, a story each) with `excludedPrds: ["prd.1.multi-game-web-portal"]`. `scanStories` still returned PRD 1's story.

**Root Cause Analysis**: `scanStories` in `skills/qa-next/scripts/uat-status.mjs` tested `relative(base, file).split("/")[0]` against the set, and in a domain-grouped tree that first segment is the domain. `grep -n 'excludedPrds' skills/qa-next/scripts/*.mjs` shows no other matcher.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-11-14

**Root Cause**: the first-segment rule assumes a flat tree.

**Fix Description**: `isExcluded` keeps the first-segment match (a flat tree, or a domain name) and also matches any directory segment that `isPrdFolder` recognises. `isPrdFolder` reads `prd.{P}.{slug}` through `doc-id.parse` and the legacy `prd.{slug}` through `doc-id.parseLegacy`, so there is no hand-written id regex.

**Files Modified**:

- `skills/qa-next/scripts/uat-status.mjs`
- `evals/qa-next/unit/uat-status.test.mjs`

**Testing**: new test `scanStories excludes a PRD named by its own folder in a domain-grouped tree…` covers the PRD-folder entry (sibling in the same domain kept), a domain-name entry, a flat-tree entry and no entry. Mutation: with the match reverted to first-segment only, it fails on the PRD-folder assertion; with the fix restored it passes. `node --test evals/qa-next/unit/uat-status.test.mjs tests/doc-id-chokepoint.test.js`: 99 pass, 0 fail.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date       | Status | Changed By | Notes                                 |
| ---------- | ------ | ---------- | ------------------------------------- |
| 2026-11-11 | New    | Claude     | Bug created from a tinker-city handoff |
| 2026-11-14 | New | ensure-bug-github-issue | GitHub issue created (#903) |
| 2026-11-14 | In Progress | develop-bug | Reproduced with a domain-grouped fixture; investigation started |
| 2026-11-14 | Ready for QA | develop-bug | Fix and regression test implemented |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
