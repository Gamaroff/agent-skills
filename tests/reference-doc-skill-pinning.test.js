"use strict";
/**
 * Reference-doc pinning guard — every command, flag and skill name that the two
 * hand-written reference pages mention must exist.
 *
 * Motivation (obs #159): a skill's behaviour is restated in four places — its
 * SKILL.md, its README.md, docs/reference/commands.md and
 * docs/reference/activation-phrases.md. docs/reference/skill-catalog.md needs no
 * such test: it is generated, and `npm run check:generated` guards it. These two
 * are hand-written, and until this file nothing connected a row to the skill it
 * describes. A renamed skill left its rows behind; a row could advertise a flag
 * the skill never had, and a reader who copied the invocation found out.
 *
 * WHAT THIS PINS, one direction only:
 *   1. Every slash command a commands.md row names resolves to skills/<name>/SKILL.md,
 *      or the row is on NON_SKILL_ROWS — which must equal the unresolvable set
 *      exactly, so a new non-skill row fails instead of joining a silent skip.
 *   2. Every --flag in a commands.md row's first cell appears in that skill's SKILL.md.
 *   3. Every skill named in activation-phrases.md resolves to skills/<name>/SKILL.md.
 *   Each group carries a floor. An empty result is a claim about the instrument:
 *   a scan that finds nothing means either there is nothing to find or the
 *   extractor is broken, and those look identical from here.
 *
 * WHAT THIS DOES NOT PIN:
 *   - Whether a row DESCRIBES the skill correctly. On 2026-09-22 `qa-next` was
 *     re-indexed from stories to user functions; commands.md went on describing
 *     its unit of work as a story, and activation-phrases.md offered "UAT the next
 *     accepted story" as its trigger. Every token in those rows was valid — the
 *     meaning was wrong, and no assertion here would have seen it. The prose sweep
 *     lives in skills/create-skill/SKILL.md (obs #159). Do not retire it because
 *     this file is green.
 *   - The reverse direction (every skill appears in both pages). That is
 *     tests/skill-doc-coverage.test.js, which sits beside this file.
 *   - Flags a skill has that a row does not list. The pages are not an index of
 *     every flag.
 *   - Non-skill spans in activation-phrases.md — `/develop-story`, the built-in
 *     `/security-review`, `handoff-verify.mjs`. They are skipped, not checked.
 *   - The skills' own README.md files, the third hand-written restatement.
 *
 * Run: node --test tests/reference-doc-skill-pinning.test.js
 */

const fs = require("fs");
const path = require("path");
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const COMMANDS = path.join(REPO_ROOT, "docs", "reference", "commands.md");
const PHRASES = path.join(
  REPO_ROOT,
  "docs",
  "reference",
  "activation-phrases.md",
);

// Rows whose first cell names no slash command. Named, not bucketed: the test
// asserts this is EXACTLY the unresolvable set, in both directions.
const NON_SKILL_ROWS = new Set([
  "`run-loop.mjs run`",
  "`run-loop.mjs dry-run`",
  "`run-loop.mjs status`",
  "`run-loop.mjs watch`",
]);

// Split a table row on UNESCAPED pipes: `/review-pr [PR\|branch]` is one cell.
// A plain split("|") truncates it, and drops the flags of every such row.
function cells(line) {
  return line.split(/(?<!\\)\|/);
}

// A command token is a `/name` that begins at a word start — the start of the
// cell, whitespace, a backtick or "(". The last one wins: `/loop /develop-next`
// is the /loop built-in wrapping a skill, and the row is about the skill. The
// word-start rule keeps a quoted path from winning instead: a row that quotes
// `.agents/skills/session-handoff/scripts/handoff-verify.mjs` would otherwise
// resolve to "handoff-verify", because every `/` in a path is followed by a name.
const COMMAND_TOKEN = /(?:^|[\s`(])\/([a-z0-9][a-z0-9-]*)/g;
const FLAG_TOKEN = /--[a-z][a-z0-9-]*/g;

function extractCommandRows(md) {
  const rows = [];
  md.split("\n").forEach((line, i) => {
    if (!line.startsWith("| `")) return;
    const cell = cells(line)[1].trim();
    const names = [...cell.matchAll(COMMAND_TOKEN)].map((m) => m[1]);
    rows.push({
      line: i + 1,
      cell,
      skill: names.length ? names[names.length - 1] : null,
      flags: [...new Set(cell.match(FLAG_TOKEN) ?? [])],
    });
  });
  return rows;
}

// activation-phrases.md: the right-hand cell backticks the skill, and any flag
// or script as a SEPARATE span — `review-bug` (the second phrasing picks
// `--validate`). A span is a skill mention only when its head token starts with
// a letter or digit and is [a-z0-9-]+: `--validate` would otherwise match the
// class, and `/develop-story` or `handoff-verify.mjs` are not skills.
const SKILL_HEAD = /^[a-z0-9][a-z0-9-]*$/;

function extractActivationSkills(md) {
  const named = [];
  md.split("\n").forEach((line, i) => {
    if (!line.startsWith("|")) return;
    const row = cells(line)
      .slice(1, -1)
      .map((c) => c.trim());
    if (row.length < 2) return;
    const spans = [...row[row.length - 1].matchAll(/`([^`]+)`/g)].map(
      (m) => m[1],
    );
    for (const span of new Set(spans)) {
      const [head, ...rest] = span.split(/\s+/);
      if (!SKILL_HEAD.test(head)) continue;
      named.push({
        line: i + 1,
        skill: head,
        flags: rest.filter((t) => t.startsWith("--")),
      });
    }
  });
  return named;
}

// Memoised per skill, not per row: 80 rows name 63 skills.
const skillMdCache = new Map();
function skillMd(name) {
  if (!skillMdCache.has(name)) {
    const p = path.join(REPO_ROOT, "skills", name, "SKILL.md");
    skillMdCache.set(
      name,
      fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null,
    );
  }
  return skillMdCache.get(name);
}

describe("extractors (fixtures, independent of the live corpus)", () => {
  test("a plain command row resolves to its skill", () => {
    const [r] = extractCommandRows(
      "| `/develop-story <path>` | does things | ref |",
    );
    assert.equal(r.skill, "develop-story");
    assert.deepEqual(r.flags, []);
    assert.equal(r.line, 1);
  });

  test("`/loop /develop-next` resolves to develop-next, not the /loop built-in", () => {
    const [r] = extractCommandRows("| `/loop /develop-next` | loops | ref |");
    assert.equal(r.skill, "develop-next");
  });

  test("a row with two flags yields both, once each", () => {
    const [r] = extractCommandRows(
      "| `/tracker-reconcile --apply --json` (`--apply` again) | x | y |",
    );
    assert.equal(r.skill, "tracker-reconcile");
    assert.deepEqual(r.flags, ["--apply", "--json"]);
  });

  test("an escaped pipe does not end the cell", () => {
    const [r] = extractCommandRows(
      "| `/tracker-reconcile [<dir> \\| --all] [--json]` | x | y |",
    );
    assert.equal(r.skill, "tracker-reconcile");
    assert.deepEqual(r.flags, ["--all", "--json"]);
  });

  test("a quoted script path does not win over the command", () => {
    const [r] = extractCommandRows(
      "| `/session-handoff` or run `command node .agents/skills/session-handoff/scripts/handoff-verify.mjs [--json]` | x | y |",
    );
    assert.equal(r.skill, "session-handoff");
    assert.deepEqual(r.flags, ["--json"]);
  });

  test("a non-slash row is returned as unresolvable, not dropped", () => {
    const rows = extractCommandRows(
      "| `run-loop.mjs status` | snapshot | ref |",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].skill, null);
    assert.equal(rows[0].cell, "`run-loop.mjs status`");
  });

  test("an activation cell yields the skill and its flag", () => {
    assert.deepEqual(
      extractActivationSkills(
        '| "Is this bug ready?" | `review-bug --validate` |',
      ),
      [{ line: 1, skill: "review-bug", flags: ["--validate"] }],
    );
  });

  test("activation spans that are flags, slash commands or scripts are not skills", () => {
    const named = extractActivationSkills(
      '| "x" | `review-bug` (picks `--validate`; see `/develop-story` and `handoff-verify.mjs`) |',
    );
    assert.deepEqual(
      named.map((n) => n.skill),
      ["review-bug"],
    );
  });

  test("header and separator rows yield nothing", () => {
    assert.deepEqual(
      extractActivationSkills("| Say something like… | Activates |\n|---|---|"),
      [],
    );
  });
});

describe("commands.md names commands that exist", () => {
  const rows = extractCommandRows(fs.readFileSync(COMMANDS, "utf8"));

  test("the extractor still finds the corpus", () => {
    // 80 rows, 76 of them slash commands naming 63 distinct skills, at 80f460bc
    // (2026-09-30). A floor, not an equality: rows get added.
    assert.ok(
      rows.length >= 70,
      `only ${rows.length} command rows extracted from commands.md — the row extractor is ` +
        `probably broken (a table reformatted?), not the corpus shrunk`,
    );
  });

  test("every row resolves to a skill", () => {
    const missing = rows
      .filter((r) => r.skill !== null && !skillMd(r.skill))
      .map(
        (r) =>
          `commands.md:${r.line}: ${r.cell} names /${r.skill}, but skills/${r.skill}/SKILL.md does not exist`,
      );
    assert.deepEqual(missing, []);
  });

  test("NON_SKILL_ROWS is exactly the set of rows that name no command", () => {
    const unresolved = rows.filter((r) => r.skill === null);
    const unexpected = unresolved
      .filter((r) => !NON_SKILL_ROWS.has(r.cell))
      .map(
        (r) =>
          `commands.md:${r.line}: ${r.cell} names no /command — if it is deliberately not a ` +
          `skill, add it to NON_SKILL_ROWS`,
      );
    const stale = [...NON_SKILL_ROWS]
      .filter((c) => !unresolved.some((r) => r.cell === c))
      .map(
        (c) =>
          `NON_SKILL_ROWS lists ${c}, which no longer appears as an unresolvable row — remove it`,
      );
    assert.deepEqual([...unexpected, ...stale], []);
  });

  test("every flag a row advertises is documented by that skill", () => {
    let checked = 0;
    const undocumented = [];
    for (const r of rows) {
      const body = r.skill && skillMd(r.skill);
      if (!body) continue;
      for (const flag of r.flags) {
        checked += 1;
        if (!body.includes(flag)) {
          undocumented.push(
            `commands.md:${r.line}: ${r.cell} advertises ${flag}, which skills/${r.skill}/SKILL.md never mentions`,
          );
        }
      }
    }
    assert.deepEqual(undocumented, []);
    // 20 at 80f460bc (2026-09-30).
    assert.ok(
      checked >= 16,
      `only ${checked} flag assertions ran — the flag extractor is probably broken, not the corpus`,
    );
  });
});

describe("activation-phrases.md names skills that exist", () => {
  const named = extractActivationSkills(fs.readFileSync(PHRASES, "utf8"));

  test("the extractor still finds the corpus", () => {
    // 67 skill mentions naming 62 distinct skills, at 80f460bc (2026-09-30).
    assert.ok(
      named.length >= 58,
      `only ${named.length} skill mentions extracted from activation-phrases.md — the cell ` +
        `extractor is probably broken, not the corpus shrunk`,
    );
  });

  test("every named skill exists", () => {
    const missing = named
      .filter((n) => !skillMd(n.skill))
      .map(
        (n) =>
          `activation-phrases.md:${n.line}: names \`${n.skill}\`, but skills/${n.skill}/SKILL.md does not exist`,
      );
    assert.deepEqual(missing, []);
  });
});
