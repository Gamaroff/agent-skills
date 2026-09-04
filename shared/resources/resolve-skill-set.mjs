// Resolve an install profile + include/exclude into the concrete set of skills
// setup-consumer.sh should copy out of the release tarball.
//
// Pure: no filesystem, no argv, no process. Every input is injected, so the
// unit tests exercise it against small fixture graphs rather than the real
// 120-skill tree — a test that moves with the tree proves nothing about the
// resolver. The IO half lives in resolve-skill-set-cli.mjs.
//
// ═══════════════════════════════════════════════════════════════════════════
// ORDER IS LOAD-BEARING. The tracker filter runs LAST, after closure.
// ═══════════════════════════════════════════════════════════════════════════
//
// `review-story` invokes `ensure-story-jira-issue`, which invokes
// `sync-jira-story`. So `sync-jira-story` is genuinely in the `pipeline`
// closure — and on a GitHub consumer it must not be installed. A closure that
// is not filtered afterwards re-installs exactly the skills task 83 removed,
// silently reverting that task for every profile user, with no error anywhere.
// Moving the filter before the closure is the default outcome of a naive
// implementation and is mutation-proven against by the tracker-interaction test.

/**
 * @param {object}   opts
 * @param {string}   opts.profile     Profile name, a key of `profiles`.
 * @param {string[]} opts.include     Extra skills on top of the profile's seeds.
 * @param {string[]} opts.exclude     Skills to leave out.
 * @param {object}   opts.profiles    Parsed skill-profiles.json.
 * @param {object}   opts.graph       Parsed skill-dependencies.json: name -> callees.
 * @param {string[]} opts.allSkills   Every skill in the tarball (for profile `*`).
 * @param {(name: string) => boolean} opts.isExcludedForTracker
 *        Mirrors setup-consumer.sh's `_skill_excluded_for_tracker`. Default
 *        excludes nothing, so a caller that forgets it gets an unfiltered set
 *        rather than a silently wrong one.
 */
export function resolveSkillSet({
  profile = "full",
  include = [],
  exclude = [],
  profiles,
  graph = {},
  allSkills = [],
  isExcludedForTracker = () => false,
}) {
  if (!profiles || typeof profiles !== "object") {
    throw new Error("resolveSkillSet: `profiles` is required");
  }
  const def = profiles[profile];
  if (!def) {
    const known = Object.keys(profiles)
      .filter((k) => !k.startsWith("$"))
      .join(", ");
    throw new Error(`Unknown profile: ${profile}. Known profiles: ${known}`);
  }

  const seeds = def.seeds === "*" ? [...allSkills] : [...(def.seeds ?? [])];
  const excludeSet = new Set(exclude);

  // 1. seeds + include, minus exclude.
  //
  // `exclude` is applied HERE as well as inside the traversal below. Applying
  // it only in the traversal would let an excluded seed into the result,
  // because a seed is never reached as somebody's callee.
  const chosen = [...new Set([...seeds, ...include])];
  const worklist = chosen.filter((s) => !excludeSet.has(s));
  const chosenSet = new Set(worklist);

  // A seed the user asked to exclude is a conflict too — they asked for it in
  // the profile and asked for it gone. Report rather than resolve.
  const conflicts = [];
  for (const s of chosen) {
    if (excludeSet.has(s))
      conflicts.push({ skill: s, requiredBy: "(profile seed)" });
  }

  // 2. Transitive closure. A visited SET with a worklist, never recursion:
  //    the graph has cycles (develop-story -> review-story -> develop-story),
  //    and naive recursion either overflows the stack or loops forever.
  const resolved = new Set();
  const addedBy = new Map(); // callee -> the first skill that pulled it in

  while (worklist.length) {
    const name = worklist.pop();
    if (resolved.has(name)) continue;
    resolved.add(name);
    for (const dep of graph[name] ?? []) {
      if (resolved.has(dep)) continue;
      if (excludeSet.has(dep)) {
        // NEVER silently re-add. The user asked for it gone; the graph says it
        // is required. Both facts are true and both are reported — the install
        // proceeds without it and names what will break, because silently
        // re-adding overrides an explicit instruction and silently omitting it
        // produces a mid-pipeline failure with no clue as to the cause.
        if (!conflicts.some((c) => c.skill === dep && c.requiredBy === name)) {
          conflicts.push({ skill: dep, requiredBy: name });
        }
        continue;
      }
      if (!addedBy.has(dep)) addedBy.set(dep, name);
      worklist.push(dep);
    }
  }

  // 3. Tracker filter LAST — see the banner above.
  const droppedForTracker = [];
  for (const name of [...resolved]) {
    if (isExcludedForTracker(name)) {
      resolved.delete(name);
      droppedForTracker.push(name);
    }
  }

  return {
    skills: [...resolved].sort(),
    // A closure ADDITION is something the user did not ask for. Two exclusions,
    // both of which produced visibly wrong reports before they were added:
    //
    //  - Anything in `chosenSet` was named by the profile or by `include`. The
    //    traversal still records an `addedBy` for it when it is reached as a
    //    callee before being popped as a seed, so without this filter `full`
    //    (where every skill is a seed) reported "15 pulled in by dependency".
    //  - Anything the tracker filter then dropped is not installed at all, and
    //    reporting it as pulled in is a claim the user cannot act on.
    closureAdditions: [...addedBy]
      .filter(([name]) => resolved.has(name) && !chosenSet.has(name))
      .map(([skill, requiredBy]) => ({ skill, requiredBy }))
      .sort((a, b) => a.skill.localeCompare(b.skill)),
    conflicts: conflicts.sort((a, b) => a.skill.localeCompare(b.skill)),
    droppedForTracker: droppedForTracker.sort(),
  };
}

export default resolveSkillSet;
