#!/usr/bin/env node
// Generates shared/resources/skill-dependencies.json — the skill call graph
// consumed by resolve-skill-set.mjs to expand an install profile to its
// transitive closure.
//
// Regenerate with `npm run generate-skill-deps`. CI fails on drift —
// validate.yml is the PR gate, release.yml re-checks at tag time.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY THE EDGES ARE DECLARED, NOT SCRAPED FROM PROSE
// ═══════════════════════════════════════════════════════════════════════════
//
// Task 84 originally specified extracting `/slash-command` tokens from each
// SKILL.md (and its references/). That was implemented first and MEASURED, and
// it does not work. Every variant fails in one of two directions:
//
//   scrape SKILL.md + references/   → develop-story: 22 edges (real: 9)
//   scrape SKILL.md only            → develop-story:  9, review-story: 10 ✓
//   ... minus "## Related Skills"   → develop-story:  8, review-story: 10 ✓
//   ... minus called-by phrasing    → develop-story:  8, review-story: 10 ✓
//   ... invocation verbs only       → develop-story:  3 edges (loses 6 steps)
//
// The two middle variants reproduce the known-good fixtures exactly, yet STILL
// produced closures of 33 for `minimal` (5 seeds) and 35 for `pipeline`
// (26 seeds) out of 120 skills. The profiles were indistinguishable — the
// feature would have shipped worthless while reporting success.
//
// The cause is direction. A `/slash-command` token carries no direction, and
// ordinary prose is full of REVERSE references: a leaf skill naming its
// callers ("invoked by /develop-story"), cross-references ("sibling of
// /qa-story"), and — decisively — negations. `skills/review-code/SKILL.md:180`
// reads "`/develop-story` and `/develop-task` do **not** call `/review-code`",
// and the scrape turns that sentence into two edges. From any leaf you then
// reach the orchestrators, and from an orchestrator you reach everything.
//
// Tightening the pattern trades one failure for the other: the invocation-verb
// variant drops develop-story from 8 real steps to 3, and a missing step is a
// mid-pipeline failure in a consumer's repo, hours from the install.
//
// So the graph is DECLARED in each SKILL.md's frontmatter:
//
//     invokes: [create-branch, review-task, develop, ...]
//
// Absent key ⇒ no outgoing edges, which is the safe default: a profile then
// resolves to exactly its declared seeds. The property task 84 wanted from a
// generated manifest — diffable in review, regenerable, CI-checked for drift —
// is preserved, and strengthened: the declaration lives beside the skill whose
// behaviour it describes, so it is visible to anyone editing that skill.
//
// The prose scrape is KEPT, as a report. `--report-candidates` lists tokens a
// SKILL.md mentions that are not in its `invokes:`. That is task 84's Risk-1
// mitigation (catch an edge someone forgot) without letting the noise into the
// graph. It is deliberately advisory: most candidates are legitimate prose, so
// failing on them would train everyone to ignore the check.
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  realpathSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(REPO, "skills");
const OUT = join(REPO, "shared", "resources", "skill-dependencies.json");

/** Every directory under skills/ that holds a SKILL.md. */
export function skillNames(skillsDir = SKILLS_DIR) {
  return new Set(
    readdirSync(skillsDir, { withFileTypes: true })
      .filter(
        (d) =>
          d.isDirectory() && existsSync(join(skillsDir, d.name, "SKILL.md")),
      )
      .map((d) => d.name),
  );
}

/**
 * Read `invokes:` from a SKILL.md frontmatter block.
 *
 * Parsed with a narrow regex rather than a YAML library on purpose: this runs
 * in the release path and in the installer's orbit, and adding a dependency
 * for one flow-sequence line is not worth it. Only the inline form
 * `invokes: [a, b, c]` is supported. The block form IS rejected loudly (see the
 * check below) — a silently-empty edge list is exactly the under-collection
 * failure this file exists to avoid, and it went undetected for one cycle
 * because the guard asserted only that parsing did not throw.
 */
export function parseInvokes(text, skill = "<unknown>") {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return [];
  const line = fm[1].match(/^invokes:[ \t]*(.*)$/m);
  if (!line) return [];

  // BLOCK FORM. `invokes:` followed by `  - name` lines captures the empty
  // string above, so without this the `!raw` early-return below swallowed it and
  // returned no edges — silently, which is the exact under-collection failure
  // this file exists to prevent. The header comment claimed the block form was
  // "rejected loudly"; it was not, and the drift guard asserting `doesNotThrow`
  // passed for precisely the input it was written to catch.
  const afterKey = fm[1].slice(line.index + line[0].length);
  // Skip blank and comment lines between the key and the first item. YAML
  // permits `invokes:` / blank / `  - name`, and requiring the item on the very
  // next line let exactly that shape slip through as a silent empty list again —
  // the same defect this check was added for, one newline away.
  if (
    !line[1].trim() &&
    /^\r?\n(?:[ \t]*(?:#[^\n]*)?\r?\n)*[ \t]+-[ \t]/.test(afterKey)
  ) {
    throw new Error(
      `${skill}: 'invokes:' must use the inline form 'invokes: [a, b]'. ` +
        `Found a YAML block list, which this parser does not read.`,
    );
  }
  // Strip a trailing YAML comment BEFORE the bracket checks. Without this,
  // `invokes: [a, b]  # steps 1-2` — legal YAML — fails `endsWith("]")` and
  // throws "unterminated list, missing ]" about a line whose bracket is plainly
  // there. Both CI drift checks then fail with a message that sends the reader
  // to the wrong place. The awk parsers in setup-consumer.sh already do this;
  // this parser was the odd one out.
  const raw = line[1].replace(/\s*#.*$/, "").trim();
  if (!raw) return [];
  if (!raw.startsWith("[")) {
    throw new Error(
      `${skill}: 'invokes:' must use the inline form 'invokes: [a, b]'. ` +
        `Got: ${raw.slice(0, 40)}`,
    );
  }
  if (!raw.endsWith("]")) {
    throw new Error(`${skill}: unterminated 'invokes:' list — missing ']'.`);
  }
  return raw
    .slice(1, -1)
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/**
 * Build the graph. Every known skill gets a key — including those with no
 * edges — so a consumer can distinguish "declares nothing" from "not a skill".
 */
export function buildGraph(skillsDir = SKILLS_DIR) {
  const names = skillNames(skillsDir);
  const graph = {};
  const problems = [];
  for (const skill of [...names].sort()) {
    const text = readFileSync(join(skillsDir, skill, "SKILL.md"), "utf8");
    const declared = parseInvokes(text, skill);
    const deps = [];
    for (const dep of declared) {
      if (dep === skill) {
        problems.push(`${skill}: 'invokes:' lists itself`);
        continue;
      }
      if (!names.has(dep)) {
        problems.push(`${skill}: 'invokes:' names unknown skill '${dep}'`);
        continue;
      }
      if (!deps.includes(dep)) deps.push(dep);
    }
    graph[skill] = deps.sort();
  }
  if (problems.length) {
    throw new Error(
      "Invalid 'invokes:' declarations:\n  " + problems.join("\n  "),
    );
  }
  return graph;
}

// ── candidate report (advisory) ──────────────────────────────────────────────
// Neither a word character nor a path character may precede the slash, or every
// file path in the doc (`.agents/skills/develop-task/...`) becomes a match.
const INVOCATION = /(?:^|[^\w./-])\/([a-z][a-z0-9-]{2,})\b/g;

export function candidateEdges(skillsDir = SKILLS_DIR) {
  const names = skillNames(skillsDir);
  const out = {};
  for (const skill of [...names].sort()) {
    const text = readFileSync(join(skillsDir, skill, "SKILL.md"), "utf8");
    const declared = new Set(parseInvokes(text, skill));
    const seen = new Set();
    let inRelated = false;
    for (const line of text.split(/\r?\n/)) {
      if (/^##+\s/.test(line))
        inRelated = /related skills|see also/i.test(line);
      if (inRelated) continue;
      for (const [, cmd] of line.matchAll(INVOCATION)) {
        if (names.has(cmd) && cmd !== skill && !declared.has(cmd))
          seen.add(cmd);
      }
    }
    if (seen.size) out[skill] = [...seen].sort();
  }
  return out;
}

// Real-path compare — see the note in resolve-skill-set-cli.mjs. A symlinked
// invocation path (every macOS temp dir) makes a string compare fail and this
// block silently never run.
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
  if (process.argv.includes("--report-candidates")) {
    const cand = candidateEdges();
    const total = Object.values(cand).reduce((n, d) => n + d.length, 0);
    console.log(
      `Candidate edges mentioned in prose but not declared in 'invokes:' — ` +
        `${total} across ${Object.keys(cand).length} skills.`,
    );
    console.log(
      "ADVISORY. Most are legitimate prose (cross-references, negations,",
      "\ncalled-by notes). Scan for a genuine missed invocation; do not bulk-add.",
    );
    for (const [skill, deps] of Object.entries(cand)) {
      console.log(`  ${skill}: ${deps.join(", ")}`);
    }
  } else {
    const graph = buildGraph();
    writeFileSync(OUT, JSON.stringify(graph, null, 2) + "\n");
    const edges = Object.values(graph).reduce((n, d) => n + d.length, 0);
    const declaring = Object.values(graph).filter((d) => d.length).length;
    console.log(
      `skill-dependencies.json: ${Object.keys(graph).length} skills, ` +
        `${edges} edges declared by ${declaring} skills`,
    );
  }
}
