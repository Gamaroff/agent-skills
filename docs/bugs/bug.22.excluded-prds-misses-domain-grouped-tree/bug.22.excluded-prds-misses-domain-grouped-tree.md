---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-11-11'
related: 'none — cross-cutting (no single owner)'
description: 'qa-next excludedPrds matches only the first folder under docs/prd/, which is the domain in a domain-grouped tree, so a PRD-folder entry never excludes anything'
---

**Bug ID**: bug.22.excluded-prds-misses-domain-grouped-tree
**Related**: None — cross-cutting bug (no single owner)
**Status**: 🆕 New
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

**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)

**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:

- [file1.ts]
- [file2.ts]

**Testing**: [How the fix was tested]

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

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
