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
 *   2. Every --flag in a commands.md row's first cell appears in that skill's SKILL.md
 *      as a whole token: `--read` does not pass on `--read-only` (task.169).
 *   3. Every skill named in activation-phrases.md resolves to skills/<name>/SKILL.md,
 *      and every flag the cell gives it — in the skill's span or a span of its
 *      own — appears in that SKILL.md the same way.
 *   4. An empty SKILL.md is reported as empty, not as missing: the fixes differ.
 *   5. Its own cost: resolving the whole corpus spawns no process, opens no
 *      connection, reads each SKILL.md once, and happens once per run — so it
 *      stays a cheap file read.
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
 *   - Cost via a destructured import. The cost tests patch module objects, so a
 *     `const { execSync } = require("child_process")` taken before them would
 *     escape the spy. Keep member access (`fs.readFileSync`) in this file.
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

// A flag is documented when SKILL.md carries it as a whole token: `--read` must
// not pass on `--read-only`. Anything outside [a-z0-9-] may follow — `=`, `.`,
// `,`, `)`, a backtick, whitespace — so `--apply=x` and `--read.` still match.
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function documentsFlag(body, flag) {
  return new RegExp(`${escapeRegExp(flag)}(?![a-z0-9-])`).test(body);
}

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
// class, and `/develop-story` or `handoff-verify.mjs` are not skills. A span
// that starts `--` is a flag, and belongs to the nearest skill span before it
// in the same cell; one with no skill before it belongs to nothing.
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
    // One mention per skill per row, in order of first appearance; a repeated
    // skill span re-points `last` at that first mention, so a flag after it
    // still lands on the skill it follows.
    const seen = new Map();
    let last = null;
    for (const span of spans) {
      const [head, ...rest] = span.split(/\s+/);
      if (head.startsWith("--")) {
        if (last && !last.flags.includes(head)) last.flags.push(head);
        continue;
      }
      if (!SKILL_HEAD.test(head)) continue;
      if (seen.has(head)) {
        last = seen.get(head);
      } else {
        last = { line: i + 1, skill: head, flags: [] };
        seen.set(head, last);
        named.push(last);
      }
      for (const t of rest) {
        if (t.startsWith("--") && !last.flags.includes(t)) last.flags.push(t);
      }
    }
  });
  return named;
}

// Memoised per skill, not per row: 80 rows name 63 skills. A factory, so the
// cost tests below can run the whole resolution against a fresh cache.
function makeSkillMd() {
  const cache = new Map();
  return (name) => {
    if (!cache.has(name)) {
      const p = path.join(REPO_ROOT, "skills", name, "SKILL.md");
      cache.set(name, fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);
    }
    return cache.get(name);
  };
}
const skillMd = makeSkillMd();

// The whole live-corpus check, in one function: read both pages, resolve every
// row and mention, look up every flag, and collect each failure. The describe
// blocks below assert on what this returns, and the cost tests run this same
// call under spies — so the code that is checked and the code that is spied on
// are one function, not two copies that can drift (task.142 QA cycle 2, CR-1).
//
// `lookup` returns null for a missing SKILL.md and its text otherwise, which
// may be "". The two are different failures with different fixes, so they get
// different messages: a missing file is a renamed or deleted skill, an empty
// one is a skill whose instructions were lost.
function resolveCorpus(lookup) {
  const rows = extractCommandRows(fs.readFileSync(COMMANDS, "utf8"));
  const named = extractActivationSkills(fs.readFileSync(PHRASES, "utf8"));
  const missingCommands = [];
  const missingNamed = [];
  const emptySkills = [];
  const undocumentedFlags = [];
  const undocumentedActivationFlags = [];
  let flagChecks = 0;
  let activationFlagChecks = 0;
  for (const r of rows) {
    if (r.skill === null) continue;
    const body = lookup(r.skill);
    if (body === null) {
      missingCommands.push(
        `commands.md:${r.line}: ${r.cell} names /${r.skill}, but skills/${r.skill}/SKILL.md does not exist`,
      );
      continue;
    }
    if (!body.trim()) {
      emptySkills.push(
        `commands.md:${r.line}: ${r.cell} names /${r.skill}, but skills/${r.skill}/SKILL.md is empty`,
      );
      continue;
    }
    for (const flag of r.flags) {
      flagChecks += 1;
      if (!documentsFlag(body, flag)) {
        undocumentedFlags.push(
          `commands.md:${r.line}: ${r.cell} advertises ${flag}, which skills/${r.skill}/SKILL.md never mentions`,
        );
      }
    }
  }
  for (const n of named) {
    const body = lookup(n.skill);
    if (body === null) {
      missingNamed.push(
        `activation-phrases.md:${n.line}: names \`${n.skill}\`, but skills/${n.skill}/SKILL.md does not exist`,
      );
      continue;
    }
    if (!body.trim()) {
      emptySkills.push(
        `activation-phrases.md:${n.line}: names \`${n.skill}\`, but skills/${n.skill}/SKILL.md is empty`,
      );
      continue;
    }
    for (const flag of n.flags) {
      activationFlagChecks += 1;
      if (!documentsFlag(body, flag)) {
        undocumentedActivationFlags.push(
          `activation-phrases.md:${n.line}: gives \`${n.skill}\` the flag ${flag}, which skills/${n.skill}/SKILL.md never mentions`,
        );
      }
    }
  }
  return {
    rows,
    named,
    missingCommands,
    missingNamed,
    emptySkills,
    undocumentedFlags,
    flagChecks,
    undocumentedActivationFlags,
    activationFlagChecks,
  };
}

// One resolution per run: both live describe blocks read this, so the two
// pages are read and parsed once, not once per block (task.169).
let corpusMemo = null;
function getCorpus() {
  if (!corpusMemo) corpusMemo = resolveCorpus(skillMd);
  return corpusMemo;
}

// Replace every named function on a module object with a recorder, run fn,
// then restore. Call sites use member access (fs.readFileSync, not a
// destructured copy), so a patched module object is what they reach.
// Returns how many spies were installed as well as the calls: a target that
// is missing or not a function would otherwise pass as "nothing was called"
// (task.142 QA cycle 2, CR-2). A promise from fn is refused, because the
// finally below would restore the originals before any of its work ran (CR-3).
function withSpies(targets, fn) {
  const calls = [];
  const saved = [];
  let requested = 0;
  for (const [label, obj, names] of targets) {
    for (const name of names) {
      requested += 1;
      if (typeof obj[name] !== "function") continue;
      const orig = obj[name];
      saved.push([obj, name, orig]);
      obj[name] = function (...args) {
        calls.push({ fn: `${label}.${name}`, args });
        return orig.apply(this, args);
      };
    }
  }
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new Error(
        "withSpies: fn returned a promise — spies would be removed before its work ran",
      );
    }
  } finally {
    for (const [obj, name, orig] of saved) obj[name] = orig;
  }
  return { calls, installed: saved.length, requested };
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

  test("a flag in a span of its own attaches to the skill before it", () => {
    assert.deepEqual(
      extractActivationSkills(
        '| "x" | `review-bug` (the second phrasing picks `--validate`) |',
      ),
      [{ line: 1, skill: "review-bug", flags: ["--validate"] }],
    );
  });

  test("with two skills in a cell, a trailing flag attaches to the nearer one", () => {
    assert.deepEqual(
      extractActivationSkills(
        '| "x" | `review-story` or `review-bug` (picks `--validate`) |',
      ),
      [
        { line: 1, skill: "review-story", flags: [] },
        { line: 1, skill: "review-bug", flags: ["--validate"] },
      ],
    );
  });

  test("a skill named twice in a cell is one mention, and keeps its flags", () => {
    assert.deepEqual(
      extractActivationSkills(
        '| "x" | `observe-work` (or `observe-work` with `--review`) |',
      ),
      [{ line: 1, skill: "observe-work", flags: ["--review"] }],
    );
  });

  test("a flag span with no skill before it belongs to nothing", () => {
    assert.deepEqual(
      extractActivationSkills('| "x" | pass `--validate` to `review-bug` |'),
      [{ line: 1, skill: "review-bug", flags: [] }],
    );
  });
});

describe("resolution rules (fixtures over the live pages)", () => {
  test("a flag is documented only as a whole token", () => {
    assert.equal(documentsFlag("use --read-only here", "--read"), false);
    assert.equal(documentsFlag("--readx", "--read"), false);
    assert.equal(documentsFlag("pass --read.", "--read"), true);
    assert.equal(documentsFlag("--apply=x", "--apply"), true);
    assert.equal(documentsFlag("(`--json`)", "--json"), true);
    assert.equal(documentsFlag("ends with --json", "--json"), true);
  });

  test("every flag check fails when each SKILL.md documents only longer flags", () => {
    // Lengthen every --flag in every SKILL.md (`--x` → `--x-z`): a whole-token
    // match must now find none of them, where `includes` would find them all.
    // This holds the call sites in resolveCorpus, not only documentsFlag.
    const corpus = resolveCorpus((name) => {
      const body = skillMd(name);
      return body === null
        ? null
        : body.replace(/(--[a-z][a-z0-9-]*)/g, "$1-z");
    });
    assert.ok(corpus.flagChecks > 0, "no command-row flag checks ran");
    assert.equal(corpus.undocumentedFlags.length, corpus.flagChecks);
    assert.ok(corpus.activationFlagChecks > 0, "no activation flag checks ran");
    assert.equal(
      corpus.undocumentedActivationFlags.length,
      corpus.activationFlagChecks,
    );
  });

  test("an empty SKILL.md is reported as empty, not missing, on both pages", () => {
    const corpus = resolveCorpus((name) =>
      name === "develop-next" ? "" : skillMd(name),
    );
    const empty = corpus.emptySkills.filter((m) =>
      m.includes("skills/develop-next/SKILL.md is empty"),
    );
    // develop-next is named on both pages; each must report it once or more.
    assert.ok(
      empty.some((m) => m.startsWith("commands.md:")),
      "commands.md side did not report develop-next as empty",
    );
    assert.ok(
      empty.some((m) => m.startsWith("activation-phrases.md:")),
      "activation-phrases.md side did not report develop-next as empty",
    );
    const asMissing = [
      ...corpus.missingCommands,
      ...corpus.missingNamed,
    ].filter((m) => m.includes("skills/develop-next/"));
    assert.deepEqual(asMissing, []);
  });

  test("a missing SKILL.md is reported as missing, not empty", () => {
    const corpus = resolveCorpus((name) =>
      name === "develop-next" ? null : skillMd(name),
    );
    assert.ok(corpus.missingCommands.some((m) => m.includes("/develop-next")));
    assert.ok(corpus.missingNamed.some((m) => m.includes("`develop-next`")));
    assert.deepEqual(
      corpus.emptySkills.filter((m) => m.includes("develop-next")),
      [],
    );
  });
});

describe("commands.md names commands that exist", () => {
  const corpus = getCorpus();
  const { rows } = corpus;

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
    assert.deepEqual(corpus.missingCommands, []);
  });

  test("no SKILL.md a row names is empty", () => {
    assert.deepEqual(
      corpus.emptySkills.filter((m) => m.startsWith("commands.md:")),
      [],
    );
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
    assert.deepEqual(corpus.undocumentedFlags, []);
    // 20 at 80f460bc (2026-09-30); 24 at 81ea2550 (2026-10-26).
    assert.ok(
      corpus.flagChecks >= 16,
      `only ${corpus.flagChecks} flag assertions ran — the flag extractor is probably broken, not the corpus`,
    );
  });
});

describe("activation-phrases.md names skills that exist", () => {
  const corpus = getCorpus();
  const { named } = corpus;

  test("the extractor still finds the corpus", () => {
    // 67 skill mentions naming 62 distinct skills, at 80f460bc (2026-09-30).
    assert.ok(
      named.length >= 58,
      `only ${named.length} skill mentions extracted from activation-phrases.md — the cell ` +
        `extractor is probably broken, not the corpus shrunk`,
    );
  });

  test("every named skill exists", () => {
    assert.deepEqual(corpus.missingNamed, []);
  });

  test("no SKILL.md a mention names is empty", () => {
    assert.deepEqual(
      corpus.emptySkills.filter((m) => m.startsWith("activation-phrases.md:")),
      [],
    );
  });

  test("every flag a mention gives its skill is documented by that skill", () => {
    assert.deepEqual(corpus.undocumentedActivationFlags, []);
    // 3 at 81ea2550 (2026-10-26): review-story --validate (in-span),
    // review-bug --validate and observe-work --review (spans of their own).
    // The floor is 2 so that dropping the standalone-span attachment (1 left)
    // turns this red.
    assert.ok(
      corpus.activationFlagChecks >= 2,
      `only ${corpus.activationFlagChecks} activation flag assertions ran — standalone \`--flag\` ` +
        `spans are probably no longer attached to their skill`,
    );
  });
});

describe("the guard's cost", () => {
  test("resolving the whole corpus spawns no process and opens no connection", () => {
    const spied = withSpies(
      [
        [
          "child_process",
          require("child_process"),
          [
            "spawn",
            "spawnSync",
            "exec",
            "execSync",
            "execFile",
            "execFileSync",
            "fork",
          ],
        ],
        ["net", require("net"), ["connect", "createConnection"]],
        ["http", require("http"), ["request", "get"]],
        ["https", require("https"), ["request", "get"]],
        ["globalThis", globalThis, ["fetch"]],
      ],
      () => resolveCorpus(makeSkillMd()),
    );
    assert.equal(
      spied.installed,
      spied.requested,
      `only ${spied.installed} of ${spied.requested} spies installed — a missing target would read as "never called"`,
    );
    assert.deepEqual(
      spied.calls.map((c) => c.fn),
      [],
      "the guard must stay a pure file read — no spawn, no network",
    );
  });

  test("the corpus is resolved once per run", () => {
    const first = getCorpus();
    const spied = withSpies([["fs", fs, ["readFileSync"]]], () => getCorpus());
    assert.equal(
      spied.installed,
      1,
      "the fs.readFileSync spy was not installed",
    );
    assert.equal(getCorpus(), first, "getCorpus returned a different object");
    assert.deepEqual(
      spied.calls
        .map((c) => String(c.args[0]))
        .filter((p) => p === COMMANDS || p === PHRASES),
      [],
      "a second getCorpus() re-read a reference page — the corpus is not memoised",
    );
  });

  test("each SKILL.md is read once per run, however many rows name it", () => {
    let corpus;
    const spied = withSpies([["fs", fs, ["readFileSync"]]], () => {
      corpus = resolveCorpus(makeSkillMd());
    });
    assert.equal(
      spied.installed,
      1,
      "the fs.readFileSync spy was not installed",
    );
    const skillReads = spied.calls
      .map((c) => String(c.args[0]))
      .filter((p) => p.endsWith(`${path.sep}SKILL.md`));
    const distinct = new Set(skillReads);
    assert.equal(
      skillReads.length,
      distinct.size,
      `${skillReads.length} SKILL.md reads for ${distinct.size} skills — the lookup is not memoised`,
    );
    // Non-vacuity: the corpus names each of these skills more than once, so a
    // run with no repeats proves nothing unless the reads actually happened.
    const mentions =
      corpus.rows.filter((r) => r.skill).length + corpus.named.length;
    assert.ok(
      distinct.size >= 58 && mentions > distinct.size,
      `only ${distinct.size} SKILL.md reads over ${mentions} mentions — the spy saw too little to judge memoisation`,
    );
  });
});
