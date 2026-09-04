#!/usr/bin/env node
// Thin CLI wrapper around resolve-skill-set.mjs, for setup-consumer.sh.
//
// The split exists so the resolver stays pure and unit-testable against
// injected fixtures; this file owns everything impure — argv, the two JSON
// files, stdout and stderr.
//
// ── The stdout/stderr split is a contract, not a style choice ────────────────
//
//   stdout : resolved skill names, ONE PER LINE, nothing else
//   stderr : the human-readable closure / conflict / dropped report
//
// setup-consumer.sh captures this with `$( )` and iterates the lines. Any
// report text on stdout would be read as a skill name and silently skipped by
// the installer's `[[ -f "${_skill_dir}SKILL.md" ]]` guard — a wrong install
// with no error. Keep every `console.log` here to names only.
//
// Usage:
//   resolve-skill-set-cli.mjs --profile pipeline --tracker github
//                             [--include a,b] [--exclude c,d]
//                             [--skills-dir DIR] [--count] [--json]
import { readFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSkillSet } from "./resolve-skill-set.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

function list(value) {
  return value
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── the tracker predicate ────────────────────────────────────────────────────
// Mirrors `_skill_excluded_for_tracker` in setup-consumer.sh. The two lists are
// duplicated here rather than parsed out of the shell script: parsing the
// script would couple this CLI to that file's formatting, and a *test* asserts
// the two copies agree (setup-consumer-skill-profiles.test.mjs), which is the
// check that actually catches drift. Sourcing one from the other would make
// that test tautological.
export const SKILLS_JIRA_ONLY = [
  "ensure-epic-jira-issue",
  "ensure-story-jira-issue",
  "ensure-task-jira-issue",
  "sync-jira-epic",
  "sync-jira-story",
  "sync-jira-task",
  "jira-epic-creator",
  "jira-sprint-manager",
  "jira-sprint-retrospective",
  "jira-sprint-review-prep",
  "jira-standup-auditor",
];

export const SKILLS_GITHUB_ONLY = [
  "ensure-epic-github-issue",
  "ensure-story-github-issue",
  "ensure-task-github-issue",
  "sync-github-epic",
  "sync-github-story",
  "sync-github-task",
];

export function trackerPredicate(tracker, allSkills = false) {
  if (allSkills) return () => false;
  const jira = new Set(SKILLS_JIRA_ONLY);
  const github = new Set(SKILLS_GITHUB_ONLY);
  if (tracker === "github") return (n) => jira.has(n);
  if (tracker === "jira") return (n) => github.has(n);
  return () => false; // unknown tracker filters nothing, matching the shell `case`
}

function main() {
  const skillsDir = arg("skills-dir", join(HERE, "..", "..", "skills"));
  const profilesPath = arg("profiles", join(HERE, "skill-profiles.json"));
  const graphPath = arg("graph", join(HERE, "skill-dependencies.json"));

  let profiles, graph;
  try {
    profiles = JSON.parse(readFileSync(profilesPath, "utf8"));
    graph = JSON.parse(readFileSync(graphPath, "utf8"));
  } catch (e) {
    // Exit 2, not 1, and print NOTHING to stdout. The installer treats an
    // empty stdout as "install nothing", so a data-file problem must be
    // distinguishable from a legitimately empty set.
    //
    // `process.exitCode` + return, never `process.exit()`. This CLI's stdout is
    // consumed through a pipe by setup-consumer.sh, and `process.exit()` after a
    // write truncates it at the pipe buffer (~64KB) — the repo already has a bug
    // and a standing guard for exactly this (bug.3.stdout-truncation-on-exit).
    // 120 skill names is well under 64KB today, which is precisely why this would
    // have gone unnoticed until the library grew.
    console.error(`resolve-skill-set: cannot read data files — ${e.message}`);
    process.exitCode = 2;
    return;
  }

  // Prefer the tarball's own skill list when available: `full` must mean
  // "every skill in THIS release", not "every skill in the graph file", which
  // could be stale relative to the tarball it shipped in.
  let allSkills = Object.keys(graph);
  if (existsSync(skillsDir)) {
    const onDisk = readdirSync(skillsDir, { withFileTypes: true })
      .filter(
        (d) =>
          d.isDirectory() && existsSync(join(skillsDir, d.name, "SKILL.md")),
      )
      .map((d) => d.name);
    if (onDisk.length) allSkills = onDisk;
  }

  // Validate `include` BEFORE resolving. An unknown or mis-cased name would
  // otherwise be echoed to stdout verbatim, fail the installer's per-line name
  // shape guard, and cause it to reject the whole batch — downgrading to a full
  // unfiltered install and blaming node/PATH. A typo must name itself.
  const known = new Set(allSkills);
  const includes = list(arg("include"));
  const unknown = includes.filter((n) => !known.has(n));
  if (unknown.length) {
    console.error(
      `resolve-skill-set: unknown skill(s) in include: ${unknown.join(", ")}`,
    );
    console.error(
      "  Names are lowercase-kebab and must match a directory under skills/.",
    );
    console.error("  See docs/reference/skill-catalog.md for the full list.");
    process.exitCode = 2;
    return;
  }

  // `exclude` is WARNED about, not rejected — deliberately asymmetric with
  // `include` above. An unknown include is always a mistake: the user asked for
  // a skill that does not exist and would get a silently smaller set. An unknown
  // exclude is usually a typo (the skill they wanted gone is still installed,
  // silently) but is legitimately reachable when a config outlives a skill that
  // was renamed or removed, and failing the install for that would be worse than
  // the typo. So: name it, keep going.
  const excludes = list(arg("exclude"));
  const unknownExcludes = excludes.filter((n) => !known.has(n));
  if (unknownExcludes.length) {
    console.error(
      `resolve-skill-set: exclude names unknown skill(s), ignored: ${unknownExcludes.join(", ")}`,
    );
    console.error(
      "  If that is a typo, the skill you meant is still being installed.",
    );
  }

  let result;
  try {
    result = resolveSkillSet({
      profile: arg("profile", "full"),
      include: includes,
      exclude: excludes,
      profiles,
      graph,
      allSkills,
      isExcludedForTracker: trackerPredicate(
        arg("tracker"),
        flag("all-skills"),
      ),
    });
  } catch (e) {
    console.error(`resolve-skill-set: ${e.message}`);
    process.exitCode = 2;
    return;
  }

  if (flag("json")) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }

  if (flag("count")) {
    process.stdout.write(String(result.skills.length) + "\n");
  } else {
    for (const name of result.skills) process.stdout.write(name + "\n");
  }

  // ── report, on stderr ──────────────────────────────────────────────────────
  const seeded = result.skills.length - result.closureAdditions.length;
  console.error(
    `→ Profile: ${arg("profile", "full")} — ${result.skills.length} skills ` +
      `(${seeded} chosen, ${result.closureAdditions.length} pulled in by dependency)`,
  );
  for (const { skill, requiredBy } of result.closureAdditions) {
    console.error(`    + ${skill} (required by ${requiredBy})`);
  }
  for (const name of result.droppedForTracker) {
    console.error(
      `    − ${name} (not applicable to tracker: ${arg("tracker")})`,
    );
  }
  // A skill the user NAMED in `include` and did not get is a different event
  // from a closure by-product being filtered out, and must not scroll past in
  // the same list. They asked for it explicitly; say plainly that it is absent.
  const askedButDropped = includes.filter((n) =>
    result.droppedForTracker.includes(n),
  );
  if (askedButDropped.length) {
    console.error(
      `⚠  You asked for ${askedButDropped.join(", ")} in skills.include, but ` +
        `${askedButDropped.length === 1 ? "it does" : "they do"} not apply to ` +
        `tracker '${arg("tracker")}' and ${askedButDropped.length === 1 ? "was" : "were"} NOT installed.`,
    );
    console.error(
      "   Pass --all-skills to install regardless of tracker, or remove the entry.",
    );
  }
  // A conflict is a real problem the user must act on, so it is a warning with
  // the consequence spelled out — not a line in the additions list.
  for (const { skill, requiredBy } of result.conflicts) {
    console.error(
      `⚠  ${skill} is in skills.exclude but required by ${requiredBy} — not installed.`,
    );
    console.error(
      `   Anything invoking ${skill} will fail at that step. Remove it from ` +
        `skills.exclude, or drop ${requiredBy} from your profile.`,
    );
  }
}

// Compare REAL paths. Node resolves an ESM module's `import.meta.url` through
// symlinks, but `process.argv[1]` is whatever the caller typed. On macOS every
// `mktemp -d` path is `/var/...`, a symlink to `/private/var/...`, so a plain
// string compare fails and `main()` silently never runs — the CLI exits 0 with
// empty stdout and the installer reads that as "resolve produced nothing".
// Found by running the installer against a real temp dir.
function isMain() {
  if (!process.argv[1]) return false;
  const real = (p) => {
    try {
      return realpathSync(p);
    } catch {
      return resolve(p);
    }
  };
  return real(process.argv[1]) === real(fileURLToPath(import.meta.url));
}

if (isMain()) {
  try {
    main();
  } catch (e) {
    // Exit 2 with nothing on stdout. An escaping exception would otherwise let
    // the installer see empty output and treat it as "resolved nothing".
    console.error(`resolve-skill-set: ${e && e.message ? e.message : e}`);
    process.exitCode = 2;
  }
}
