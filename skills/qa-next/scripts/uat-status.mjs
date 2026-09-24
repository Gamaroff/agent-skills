#!/usr/bin/env node
// uat-status.mjs — the UAT registry tool behind /qa-next.
//
// The registry (default docs/qa/uat-registry.md) is the OWNER'S acceptance record: one row per
// USER FUNCTION ("register an account", "submit a score"), stated in one sentence, grouped by QA
// surface, in the order the owner wants them exercised. Stories are the development unit and are
// referenced from a function's `Stories` cell; `--coverage` names the accepted stories no function
// covers, so a shipped feature cannot silently miss the registry. Story status is never touched
// here: a UAT failure is a bug.
//
//   node uat-status.mjs                       scoreboard per surface + total, and the next function
//   node uat-status.mjs --init [--force]      write the registry skeleton (sections + headers; rows are authored)
//   node uat-status.mjs --coverage [--json]   accepted stories covered by no function (never writes)
//   node uat-status.mjs --check               integrity gate (exit 1 on any error)
//   node uat-status.mjs --next [--json]       first ⬜ row in file order (exit 3 when none)
//   node uat-status.mjs --item <id> [--json]  one named row, whatever its state — same payload as
//                                             --next (exit 4 when the id is not a row).
//                                             NOT --items, one character away, which WRITES a cell.
//   node uat-status.mjs --run-path <id> [--env <label>]   next free run file path (creates runs/<id>/)
//   node uat-status.mjs --set <id> <state> --run <path> [--bug <path>] [--note "..."] [--clear-note]
//   node uat-status.mjs --items <id> "<items>"         fill the Items cell
//   node uat-status.mjs --automated <id> "<specs>"     fill the Automated-by cell
//   node uat-status.mjs --accept <id> [--note "..."] [--force]   🟡 pass → ✅ accepted — the owner's command
//   node uat-status.mjs --findings [--all] [--json]    open findings across every run file
//
// The /qa-next run state file (default .claude/state/qa-next.state.json under --root; --state <path>
// overrides) — the single-flight lock and resume record. Its fields and who writes each: STATE_FIELDS.
//   node uat-status.mjs --state-init (--item <id> | --next) [--json]   resolve the row and write the
//                                             file (exit 5 run-in-progress when --item names another item)
//   node uat-status.mjs --state-get [--json]          print it (exit 6 when there is none)
//   node uat-status.mjs --state-set <field> <value>   phase / runFile / filedBug / lane only
//   node uat-status.mjs --state-clear                  delete it (idempotent)
//
// Paths: --root <dir> (default: cwd) · --registry <path> (default docs/qa/uat-registry.md) ·
// --surfaces <path> (default: uat-surfaces.json beside the registry) · --stories <dir> (default docs/prd).
// Every relative link written into the registry is relative to the registry's own directory.
// Run files live at runs/<function id>/<date>-<env>.md beside the registry; --findings walks that
// tree recursively.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  copyFileSync,
  mkdirSync,
  renameSync,
  rmSync,
  linkSync,
} from "node:fs";
import { join, relative, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const STATES = {
  untested: "⬜ untested",
  pass: "🟡 pass",
  fail: "❌ fail",
  blocked: "⏸ blocked",
  accepted: "✅ accepted",
  na: "➖ n/a",
};
// Terminal for the loop: counted as "done" on the scoreboard.
const DONE = new Set(["accepted", "na"]);

// Column names as the registry header spells them. Parsing is header-driven, so the owner may add
// or reorder columns; only these are read, and REQUIRED ones must be present in every section.
export const COLUMNS = [
  "#",
  "Function",
  "What it does",
  "Entry",
  "Stories",
  "Items",
  "Automated by",
  "UAT",
  "Last run",
  "Notes / bug",
];
const REQUIRED = ["#", "UAT", "Last run", "Notes / bug"];
const ID_RE = /^[A-Z]\.\d+$/;

// ---------- options ----------

const OPTIONS = new Set([
  "--root",
  "--registry",
  "--surfaces",
  "--stories",
  "--init",
  "--force",
  "--coverage",
  "--check",
  "--next",
  "--item",
  "--run-path",
  "--env",
  "--json",
  "--set",
  "--run",
  "--bug",
  "--note",
  "--clear-note",
  "--items",
  "--automated",
  "--accept",
  "--findings",
  "--all",
  "--state-init",
  "--state-get",
  "--state-set",
  "--state-clear",
  "--state",
]);

export function parseArgs(argv) {
  const args = argv.slice(2);
  const val = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const root = resolve(val("--root") ?? process.cwd());
  const registry = val("--registry") ?? "docs/qa/uat-registry.md";
  return {
    args,
    root,
    registry,
    registryDir: dirname(registry),
    surfaces: val("--surfaces") ?? join(dirname(registry), "uat-surfaces.json"),
    stories: val("--stories") ?? "docs/prd",
    val,
    has: (name) => args.includes(name),
  };
}

export function loadSurfaces(opts) {
  const p = join(opts.root, opts.surfaces);
  if (!existsSync(p)) return null;
  const cfg = JSON.parse(readFileSync(p, "utf8"));
  for (const k of ["surfaces", "epicSurface"])
    if (!cfg[k]) die(`${opts.surfaces}: missing "${k}"`);
  cfg.storySurface ??= {};
  cfg.storyNa ??= {};
  cfg.excludedPrds ??= [];
  cfg.defaultSurface ??= cfg.surfaces.at(-1).letter;
  cfg.uatSpecPattern ??= "^apps/portal/e2e/(smoke|uat)/";
  return cfg;
}

// ---------- stories ----------

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Canonical story file only — sidecars (story.7.5.review.1.name.md, story.7.5.qa.1.name.md) have
// a dotted segment between the number and the name and are excluded by the [a-z0-9-]+ name.
const STORY_FILE = /\/story\.(\d+)\.(\d+)\.[a-z0-9-]+\.md$/;

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return fm;
}

export function loadStories(opts, cfg) {
  const base = join(opts.root, opts.stories);
  if (!existsSync(base)) die(`stories root not found: ${opts.stories}`);
  const excluded = new Set(cfg.excludedPrds);
  const stories = [];
  for (const file of walk(base)) {
    const m = file.match(STORY_FILE);
    if (!m) continue;
    const rel = relative(opts.root, file);
    const prd = relative(base, file).split("/")[0];
    if (excluded.has(prd)) continue;
    const fm = frontmatter(readFileSync(file, "utf8"));
    const id = `${m[1]}.${m[2]}`;
    stories.push({
      id,
      epic: Number(m[1]),
      story: Number(m[2]),
      title: fm.title ?? "",
      status: fm.status ?? "",
      storyType: fm.story_type ?? "",
      path: rel,
      surface:
        cfg.storySurface[id] ??
        cfg.epicSurface[String(m[1])] ??
        cfg.defaultSurface,
    });
  }
  return stories.sort((a, b) => a.epic - b.epic || a.story - b.story);
}

// ---------- registry parse / render ----------

const SECTION = /^### ([A-Z])\. (.*)$/;
const SEPARATOR = /^\|\s*:?-+/;

function splitCells(line) {
  // UNESCAPES what renderRow escapes. The two must be inverses: renderRow escapes `|` so a pipe in
  // a cell cannot split the row, and every `--set` re-renders the row it just parsed — so a parse
  // that leaves `\|` standing means the next render escapes it again, and the backslashes grow by
  // one per rewrite. Four writes turned an authored `a \| b` into `a \\\\| b`, with --check green
  // throughout and the backslashes handed to the skill in --item --json.
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));
}

// Header-driven: the first `|` row under a section heading names the columns; every later `|` row
// is a function row whose cells are keyed by those names. `state`/`run`/`notes`/`title` are the
// cells the shared functions (nextItem, scoreboard, checks) read.
export function parseRegistry(text) {
  const sections = [];
  let cur = null;
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const s = line.match(SECTION);
    if (s) {
      cur = {
        letter: s[1],
        title: s[2],
        rows: [],
        headerLine: i,
        columns: null,
      };
      sections.push(cur);
      return;
    }
    if (!cur || !line.startsWith("|")) return;
    if (!cur.columns) {
      cur.columns = splitCells(line);
      cur.columnsLine = i;
      return;
    }
    if (SEPARATOR.test(line)) return;
    const values = splitCells(line);
    const cells = Object.fromEntries(
      cur.columns.map((c, k) => [c, values[k] ?? ""]),
    );
    cur.rows.push({
      id: cells["#"] ?? values[0] ?? "",
      cells,
      cellCount: values.length,
      title: cells.Function ?? "",
      state: cells.UAT ?? "",
      run: cells["Last run"] ?? "",
      notes: cells["Notes / bug"] ?? "",
      line: i,
      surface: cur.letter,
    });
  });
  return { sections, lines };
}

export function stateKey(cell) {
  return (
    Object.keys(STATES).find((k) => cell.startsWith(STATES[k].split(" ")[0])) ??
    null
  );
}

export function storyIds(cell) {
  return [...new Set((cell ?? "").match(/\b\d+\.\d+\b/g) ?? [])];
}

export function specPaths(cell) {
  return (cell ?? "")
    .split(" · ")
    .map((s) => s.trim().replace(/^`|`$/g, ""))
    .filter((s) => s && !/^manual only$/i.test(s));
}

function relFromRegistry(opts, repoRelPath) {
  return relative(opts.registryDir, repoRelPath);
}

// The inverse: a link as written in the registry (relative to its directory) → repo-relative.
// ONE conversion, used by --check's `exists` and by describeRow's `bug`, so the file --check looks
// for and the file the payload names are the same file by construction. Repo-relative is the form
// `--bug` takes and `/create-bug-report` returns, so the payload round-trips: a registry-relative
// `bug` fed back through `--bug` was re-relativised to `../../../bugs/…` (TASK-141-BUG-21).
function repoPathOf(opts, registryRelPath) {
  return join(opts.registryDir, registryRelPath);
}

function renderRow(columns, cells) {
  // `|` is escaped HERE, in the one place every cell the tool emits is rendered, because
  // splitCells already honours `\\|` through its `(?<!\\)` lookbehind — so the round-trip is
  // closed by two halves that were written for each other and never met. Unescaped, a pipe in a
  // --note splits the row and --check reports a cell-count error, which /qa-next Step 0 treats as
  // HALT `registry-invalid`. That corruption predates this change; what this change added is its
  // irrecoverability, because on a kept ✅ --clear-note is refused and every later --set appends
  // onto the already-split cell.
  const escape = (v) => String(v ?? "").replace(/\|/g, "\\|");
  return `| ${columns.map((c) => escape(cells[c])).join(" | ")} |`;
}

function renderSkeleton(cfg, today) {
  const tool = `node ${cfg.toolPath ?? ".agents/skills/qa-next/scripts/uat-status.mjs"}`;
  const out = [
    "---",
    "title: UAT Registry — the application's user functions, and the owner's acceptance of each",
    "type: guide",
    "status: active",
    `created: ${today}`,
    `updated: ${today}`,
    "---",
    "",
    "# UAT Registry — the application's user functions",
    "",
    "One row per **user function** — something a person does with the application, stated in one sentence that names the actor — grouped by QA surface, in the order they are exercised. This is the *owner's* acceptance record: a function is `✅ accepted` when the owner has seen it behave and judged it the right feature. It is distinct from a story's `status: accepted`, which is the development pipeline's Definition of Done.",
    "",
    "**Columns:** `#` the function id `<letter>.<n>` · **Function** a verb phrase · **What it does** one sentence, actor first · **Entry** the route (and `flag: <NAME>` when gated) · **Stories** the stories that built it · **Items** the checklist items in `qa.<letter>.<slug>.md` (`<letter>.<n>.<k>`) · **Automated by** the real-stack specs that exercise it, or `manual only` · **UAT** · **Last run** · **Notes / bug**.",
    "",
    "**States:** `⬜ untested` → `🟡 pass` (every item behaved as expected) → `✅ accepted` (owner sign-off). `❌ fail` branches to a bug; `⏸ blocked` could not be exercised in the test environment (note says why; the loop skips it); `➖ n/a` is reachable in no environment (note required).",
    "",
    `**Rules** (enforced by \`${tool} --check\`): 🟡 / ✅ / ❌ need a **Last run** link into \`runs/\`; ❌ needs a bug link in **Notes / bug**, and ${BUG_LINK_RULE}; ⏸ and ➖ need a note; every \`Stories\` id is a real story; every accepted story is named by some function or listed under \`storyNa\` in \`uat-surfaces.json\` (\`--coverage\` lists the rest). Rows are authored and reordered by hand — the tool only fills cells.`,
    "",
    `**Tooling:** \`${tool}\` (scoreboard) · \`--next\` (the \`/qa-next\` selector) · \`--set <id> <state> --run <path>\` · \`--items <id> "<items>"\` · \`--automated <id> "<specs>"\` · \`--accept <id>\` · \`--coverage\` · \`--check\` · \`--findings\`. Per-run results live under \`runs/\`, each with a Findings table for what was seen beyond the items themselves.`,
    "",
  ];
  for (const { letter, title } of cfg.surfaces) {
    out.push(
      `### ${letter}. ${title}`,
      "",
      renderRow(COLUMNS, Object.fromEntries(COLUMNS.map((c) => [c, c]))),
      `| ${COLUMNS.map(() => ":---").join(" | ")} |`,
      "",
    );
  }
  return out.join("\n");
}

// ---------- commands ----------

function today() {
  return new Date().toISOString().slice(0, 10);
}

// A refusal is thrown, never exited: `main` prints it and sets `process.exitCode`
// so control flow returns and stdout drains. `process.exit()` after a write
// truncates at ~64KB on a pipe (bug.3, `stdout-drain-on-exit.test.mjs`).
class UsageError extends Error {
  constructor(msg, code) {
    super(msg);
    this.code = code;
  }
}
function die(msg, code = 2) {
  throw new UsageError(msg, code);
}

function readRegistry(opts) {
  const p = join(opts.root, opts.registry);
  if (!existsSync(p)) die(`${opts.registry} not found — run --init first`);
  return parseRegistry(readFileSync(p, "utf8"));
}

function writeRegistry(opts, lines) {
  writeFileSync(
    join(opts.root, opts.registry),
    lines.join("\n").replace(/^updated: .*$/m, `updated: ${today()}`),
  );
}

function requireSurfaces(opts) {
  const cfg = loadSurfaces(opts);
  if (cfg) return cfg;
  const template = join(HERE, "..", "assets", "uat-surfaces.template.json");
  mkdirSync(join(opts.root, dirname(opts.surfaces)), { recursive: true });
  copyFileSync(template, join(opts.root, opts.surfaces));
  die(
    `${opts.surfaces} did not exist — a template was written there. Fill in surfaces / epicSurface / excludedPrds for this project, then re-run.`,
  );
}

function cmdInit(opts) {
  const cfg = requireSurfaces(opts);
  const p = join(opts.root, opts.registry);
  if (existsSync(p) && !opts.has("--force"))
    die(
      `${opts.registry} exists — rows are authored by hand; --force rewrites the skeleton (loses every row)`,
    );
  mkdirSync(dirname(p), { recursive: true });
  mkdirSync(join(dirname(p), "runs"), { recursive: true });
  writeFileSync(p, renderSkeleton(cfg, today()));
  console.log(
    `wrote ${opts.registry}: ${cfg.surfaces.length} empty surface sections — author one row per user function, then --check`,
  );
}

// Pure. Which accepted stories does no function name? `storyNa` (in uat-surfaces.json) is the
// owner's list of stories with nothing to accept; everything else must appear in some `Stories` cell.
export function checkCoverage({ sections }, stories, cfg) {
  const referenced = new Set(
    sections.flatMap((s) => s.rows.flatMap((r) => storyIds(r.cells.Stories))),
  );
  const byId = new Map(stories.map((s) => [s.id, s]));
  const pick = ({ id, title, path, surface }) => ({
    id,
    title,
    path,
    suggestedSurface: surface,
  });
  return {
    unmapped: stories
      .filter(
        (s) =>
          s.status === "accepted" &&
          !referenced.has(s.id) &&
          !cfg.storyNa[s.id],
      )
      .map(pick),
    notAccepted: stories
      .filter((s) => referenced.has(s.id) && s.status !== "accepted")
      .map((s) => ({ ...pick(s), status: s.status })),
    unknown: [...referenced].filter((id) => !byId.has(id)).sort(),
    na: Object.entries(cfg.storyNa).map(([id, note]) => ({ id, note })),
  };
}

function cmdCoverage(opts) {
  const cfg = requireSurfaces(opts);
  const c = checkCoverage(readRegistry(opts), loadStories(opts, cfg), cfg);
  if (opts.has("--json")) return console.log(JSON.stringify(c, null, 2));
  for (const s of c.unmapped)
    console.log(
      `unmapped   ${s.id}  ${s.title}  → surface ${s.suggestedSurface}`,
    );
  for (const s of c.notAccepted)
    console.log(`not-accepted ${s.id}  ${s.title}  (${s.status})`);
  for (const id of c.unknown) console.log(`unknown    ${id}  (no story file)`);
  console.log(
    `coverage: ${c.unmapped.length} accepted stories covered by no function · ${c.na.length} n/a · ${c.notAccepted.length} referenced but not accepted · ${c.unknown.length} unknown`,
  );
}

// Pure: `exists` is injected so the unit tests need no filesystem.
export function checkRegistry({ sections }, stories, cfg, exists = () => true) {
  const errors = [];
  const warns = [];
  const byId = new Map(stories.map((s) => [s.id, s]));
  const seen = new Map();
  for (const sec of sections) {
    if (!sec.columns) {
      if (sec.rows.length)
        errors.push(`${sec.letter}: section has rows but no header`);
      continue;
    }
    for (const c of REQUIRED)
      if (!sec.columns.includes(c))
        errors.push(`${sec.letter}: header lacks the "${c}" column`);
    for (const r of sec.rows) {
      if (!ID_RE.test(r.id)) {
        errors.push(
          `${sec.letter}: malformed row id "${r.id}" (line ${r.line + 1})`,
        );
        continue;
      }
      if (!r.id.startsWith(`${sec.letter}.`))
        errors.push(`${r.id}: row is under surface ${sec.letter}`);
      if (seen.has(r.id))
        errors.push(`${r.id}: duplicate row (also in ${seen.get(r.id)})`);
      seen.set(r.id, r.surface);
      if (r.cellCount !== sec.columns.length)
        errors.push(
          `${r.id}: ${r.cellCount} cells, header has ${sec.columns.length}`,
        );
      const k = stateKey(r.state);
      if (!k) errors.push(`${r.id}: unknown state cell "${r.state}"`);
      const runLink = r.run.match(/\]\(([^)]+)\)/);
      if (["pass", "fail", "accepted"].includes(k)) {
        if (!runLink) errors.push(`${r.id}: ${k} requires a Last run link`);
        else if (!exists(runLink[1]))
          errors.push(`${r.id}: run file not found: ${runLink[1]}`);
      }
      // Every bug link, on EVERY row — not only on `fail`. describeRow publishes `bug` for a row in
      // any state and SKILL.md Step 4 opens that path, so validating `fail` rows only left the
      // published path unchecked on four of the six states. Requiring a link AT ALL stays
      // fail-only; that is the separate rule. Both sides consume `bugLinkPaths`, so the path
      // `exists` is called on is by construction the path that is published.
      const bugPaths = bugLinkPaths(r.notes);
      if (k === "fail" && !bugPaths.length)
        errors.push(`${r.id}: fail requires a bug link in Notes`);
      for (const p of bugPaths)
        if (!exists(p)) errors.push(`${r.id}: bug file not found: ${p}`);
      if ((k === "na" || k === "blocked") && r.notes === "")
        errors.push(`${r.id}: ${k} requires a note saying why`);
      for (const id of storyIds(r.cells.Stories)) {
        const story = byId.get(id);
        if (!story)
          errors.push(`${r.id}: Stories names ${id}, which is not a story`);
        else if (story.status !== "accepted")
          warns.push(`${r.id}: story ${id} is ${story.status}, not accepted`);
      }
    }
  }
  for (const s of checkCoverage({ sections }, stories, cfg).unmapped)
    warns.push(
      `${s.id}: accepted story is covered by no function — --coverage`,
    );
  return { errors, warns };
}

// ---------- findings ----------
//
// A run file's `## Findings` table holds what was seen that is not an item's own result — a rough
// edge on a passing function, a defect on another surface, a harness fault. Parsed here so
// `--findings` can list them across every run and `--check` can prove their bug links resolve.

// A relative link, resolved against the registry's directory: no scheme, no anchor, no
// protocol-relative host. `linkTo` emits nothing else, so anything failing this is a human's prose
// reference. The converse does not hold — a human's relative link passes too and is checked the
// same way; the name says which shape the tool writes, not who wrote a given link.
//
// ONE definition, used by the reader (describeRow's `bug`) and the checker (checkRegistry) alike,
// through `bugLinkPaths` below.
// They were aligned on the row-state axis and then diverged on the LINK-SHAPE axis: the checker
// learned to skip a prose URL and the reader did not, so a note whose newest bug-shaped link was
// `https://…` passed --check while the payload handed that URL to the skill, which opens it.
// Two predicates for "is this a bug link we own" is the same defect twice.
const isToolWrittenLink = (href) =>
  !!href &&
  !/^[a-z][a-z0-9+.-]*:/i.test(href) &&
  !href.startsWith("#") &&
  !href.startsWith("//");

// The path part, without a `#fragment`: `../bugs/b.md#repro` names a file that exists. A `#` in an
// href begins a fragment (URL semantics), so a filename carrying a literal `#` is not addressable
// here — no bug filename create-bug-report writes contains one.
const linkTarget = (href) => href.replace(/#.*$/, "");

// `bug.` must not follow an ASCII letter, digit or underscore (`\b`, which without the `u` flag is
// ASCII-only): `[debug.log](…)` is not a bug link, and `[ébug.9](…)` is. Before the
// validation covered every row and fed the published `bug`, the unanchored match only ever saw fail
// rows; widened, it would have validated — and handed Step 4 — a log file (PR review 1, CR-4).
const BUG_LINK_RE = /\[[^\]]*\bbug\.[^\]]*\]\(([^)]+)\)/g;

// The PATHS of a note cell's bug links, relative to the registry, in cell order: the predicate applied, then the fragment
// removed. This is the one value both sides consume — checkRegistry calls `exists` on exactly these
// strings and describeRow publishes the last of them — so the published path is the verified path.
// Sharing only the predicate was not enough: cycle 7 applied `linkTarget` on the checking side
// alone, and `--check` passed a `#repro` link whose published form Step 4 cannot open.
function bugLinkPaths(notes) {
  return [...(notes ?? "").matchAll(BUG_LINK_RE)]
    .map((m) => m[1])
    .filter(isToolWrittenLink)
    .map(linkTarget);
}

// The rule as the owner reads it — written into every registry `--init` creates and quoted
// verbatim by the README, which a test holds to this string. Worded in the predicate's own terms:
// the checker cannot know who wrote a link, only what its text and target look like.
export const BUG_LINK_RULE =
  "every bug link in **Notes / bug** — link text in which `bug.` is not preceded by an ASCII letter, digit or underscore, target a path relative to the registry file — must resolve, on **any** row; a `#fragment` is ignored, and a link with a scheme (`https:`), a `//host` or only an `#anchor` is prose and is skipped";

const FINDING_ROW = /^\|\s*(\d+)\s*\|(.*)\|(.*)\|(.*)\|(.*)\|\s*$/;
const BUG_CLOSED = /^(closed|done|fixed|resolved)$/i;

export function parseFindings(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^## Findings\s*$/.test(l));
  if (start < 0) return [];
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (/^## /.test(line)) break;
    const m = line.match(FINDING_ROW);
    if (!m) continue;
    const [, n, where, what, severity, filed] = m;
    const link = filed.match(/\[[^\]]*\]\(([^)]+)\)/);
    out.push({
      n: Number(n),
      where: where.trim(),
      what: what.trim(),
      severity: severity.trim(),
      filedAs: filed.trim(),
      bug: link ? link[1] : null,
    });
  }
  return out;
}

// A basename with no sequence is run 1 of its day, so compare it as "-01". Without this,
// ["…-lan.md", "…-lan-02.md"].sort() yields ["…-lan-02.md", "…-lan.md"] — "." sorts after "-" —
// and the day's FIRST run reads as its last: in --findings, in priorRuns, and in the "previous
// run" link a re-run's header cites. Normalising in the comparator rather than renaming also
// repairs the ordering of run files already on disk, which a rename could not.
const seqKey = (p) =>
  basename(p).replace(
    /^(.*?)(?:-(\d{2}))?\.md$/,
    (_, base, n) => `${base}-${n ?? "01"}.md`,
  );

// Every `.md` under runs/, at any depth, as paths relative to the registry directory. Run files
// live at runs/<function id>/<date>-<env>.md, so the walk must recurse: a flat readdir would skip
// every nested run and report a clean zero — the one answer nobody questions. Ordered by file
// name (the date prefix, then the run sequence) first, so "oldest run first" holds across
// function directories.
export function listRunFiles(runsDir) {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      return e.isFile() && e.name.endsWith(".md") ? [p] : [];
    });
  return walk(runsDir)
    .map((p) => relative(dirname(runsDir), p))
    .sort((a, b) => seqKey(a).localeCompare(seqKey(b)) || a.localeCompare(b));
}

// Every finding in every run file, oldest run first. `bug` is relative to the run file; `bugStatus`
// is the bug's frontmatter status, `missing` when the link does not resolve, null for a note.
function loadFindings(opts) {
  const runsDir = join(opts.root, opts.registryDir, "runs");
  if (!existsSync(runsDir)) return [];
  const out = [];
  for (const run of listRunFiles(runsDir)) {
    const runPath = join(opts.root, opts.registryDir, run);
    for (const f of parseFindings(readFileSync(runPath, "utf8"))) {
      let bugStatus = null;
      if (f.bug) {
        const p = join(dirname(runPath), f.bug);
        bugStatus = existsSync(p)
          ? (frontmatter(readFileSync(p, "utf8")).status ?? "")
          : "missing";
      }
      out.push({ ...f, run, bugStatus });
    }
  }
  return out;
}

export function isOpenFinding(f) {
  return f.bugStatus === null || !BUG_CLOSED.test(f.bugStatus);
}

// Pure: a finding whose bug link does not resolve is an error — the row claims a record that
// does not exist, which is the one thing the Findings table must never do.
export function checkFindings(findings) {
  return findings
    .filter((f) => f.bugStatus === "missing")
    .map((f) => `${f.run} finding ${f.n}: bug file not found: ${f.bug}`);
}

function cmdCheck(opts) {
  const cfg = requireSurfaces(opts);
  const exists = (rel) => existsSync(join(opts.root, repoPathOf(opts, rel)));
  const { errors, warns } = checkRegistry(
    readRegistry(opts),
    loadStories(opts, cfg),
    cfg,
    exists,
  );
  errors.push(...checkFindings(loadFindings(opts)));
  for (const w of warns) console.log(`[warn ] ${w}`);
  for (const e of errors) console.log(`[ERROR] ${e}`);
  console.log(
    `uat-check: ${errors.length} error(s), ${warns.length} warning(s)`,
  );
  process.exitCode = errors.length ? 1 : 0;
}

function cmdFindings(opts) {
  const all = loadFindings(opts);
  const shown = opts.has("--all") ? all : all.filter(isOpenFinding);
  if (opts.has("--json")) return console.log(JSON.stringify(shown, null, 2));
  let run = null;
  for (const f of shown) {
    if (f.run !== run) console.log((run = f.run));
    const filed =
      f.bugStatus === null
        ? "note"
        : `${basename(f.bug).replace(/\.md$/, "")} (${f.bugStatus})`;
    console.log(
      `  ${String(f.n).padStart(2)}  ${f.severity.padEnd(7)}  ${f.where} — ${f.what}  [${filed}]`,
    );
  }
  const open = all.filter(isOpenFinding);
  const unfiled = open.filter((f) => f.bugStatus === null).length;
  console.log(
    `findings: ${open.length} open (${unfiled} unfiled, ${open.length - unfiled} in open bugs) · ${all.length - open.length} closed${opts.has("--all") ? "" : " — --all to include them"}`,
  );
}

export function nextItem({ sections }) {
  for (const sec of sections) {
    const r = sec.rows.find((row) => stateKey(row.state) === "untested");
    if (r) return { ...r, surfaceTitle: sec.title };
  }
  return null;
}

// The checklist files beside the registry that hold this function's items: any `qa.*.md` with a
// heading for the function (`### D.2.1`, `## D.2 —`) or for an item its Items cell names (`### S2`).
function findChecklists(opts, id, itemsCell) {
  const dir = join(opts.root, opts.registryDir);
  const tokens = [...new Set(itemsCell.match(/[A-Z]+\.?\d+(?:\.\d+)*/g) ?? [])];
  const wanted = [
    new RegExp(`^##+ ${id.replace(".", "\\.")}(\\.|\\s)`, "m"),
    ...tokens.map(
      (t) => new RegExp(`^##+ ${t.replace(/\./g, "\\.")}(\\s|$)`, "m"),
    ),
  ];
  return readdirSync(dir)
    .filter((f) => /^qa\..*\.md$/.test(f))
    .sort()
    .filter((f) => {
      const text = readFileSync(join(dir, f), "utf8");
      return wanted.some((re) => re.test(text));
    })
    .map((f) => join(opts.registryDir, f));
}

// The row a named id resolves to, whatever state it is in. The sibling of `nextItem`, and it
// returns the same shape — `surfaceTitle` included, which the section carries and the row does not.
export function itemById({ sections }, id) {
  for (const sec of sections) {
    const r = sec.rows.find((row) => row.id === id);
    if (r) return { ...r, surfaceTitle: sec.title };
  }
  return null;
}

// An id is case-insensitive at the boundary: the owner types `d.2`, the registry spells it `D.2`.
const normaliseId = (s) => (s ?? "").trim().toUpperCase();

// "You named no row" and "you named a row that is not there" are different answers, and /qa-next
// stops differently on each: exit 4 maps to STOP `unknown-item`, which is the wrong stop for a
// malformed call. A missing value, or one that is the next flag, is a usage error (exit 2).
function requireIdValue(flag, raw) {
  if (!raw || raw.startsWith("--")) die(`${flag} <id> is required`);
  return normaliseId(raw);
}

// This function's earlier run files, oldest first, relative to the registry directory. Reuses
// listRunFiles rather than walking again: two sort orders for "oldest run first" would drift, and
// one recursive walk of a directory of Markdown files is cheap. The cost is paid on --next too,
// deliberately — see the task 141 notes.
function priorRuns(opts, id) {
  const runsDir = join(opts.root, opts.registryDir, "runs");
  if (!existsSync(runsDir)) return [];
  const prefix = `${join("runs", id)}/`;
  return listRunFiles(runsDir).filter((p) => p.startsWith(prefix));
}

// The ONE description of a registry row that the skill consumes. `--next` and `--item` differ only
// in HOW they find the row; what they say about it must be identical, so they say it here. Two
// payload builders would be two enumerations of "what the skill needs to know about a row", and
// enumerations drift in the worst direction — docs/reference/anti-patterns.md.
function describeRow(opts, cfg, r) {
  const stories = loadStories(opts, cfg);
  const automatedBy = specPaths(r.cells["Automated by"]);
  const uat = new RegExp(cfg.uatSpecPattern);
  return {
    id: r.id,
    function: r.title,
    what: r.cells["What it does"] ?? "",
    entry: r.cells.Entry ?? "",
    surface: r.surface,
    surfaceTitle: r.surfaceTitle,
    stories: storyIds(r.cells.Stories).map((id) => {
      const s = stories.find((x) => x.id === id);
      return s
        ? { id, title: s.title, path: s.path, storyType: s.storyType }
        : { id, title: null, path: null, storyType: null };
    }),
    items: r.cells.Items ?? "",
    automatedBy,
    uatSpecs: automatedBy.filter((p) => uat.test(p)),
    checklists: findChecklists(opts, r.id, r.cells.Items ?? ""),
    // The re-run fields, on BOTH commands. Without state/lastRun/priorRuns the skill cannot say
    // "3rd run of this function, follows 2026-08-02-lan.md" in the run file, which is the one
    // thing a re-run's evidence has to state. `bug` is the link the row already carries, parsed
    // with the SAME regex checkRegistry owns, so there is one parser: Step 4's "a repeat failure
    // reuses the open bug" reads it here rather than re-parsing the registry by hand.
    state: stateKey(r.state),
    lastRun: (r.run.match(/\]\(([^)]+)\)/) ?? [])[1] ?? null,
    priorRuns: priorRuns(opts, r.id),
    notes: r.notes,
    // The file the LAST bug link names — `bugLinkPaths`, the same values checkRegistry calls
    // `exists` on, fragment removed — converted by `repoPathOf`, the same conversion `exists` uses.
    // Repo-relative, so it opens from the repo root and round-trips through `--bug`. Last, not
    // first, because the note cell is appended to on a kept ✅ and Step 4 wants the most recent.
    // The link as the author wrote it, anchor included, is still in `notes`.
    bug: rowBugPath(opts, r),
  };
}

// The repo-relative path of the file the row's NEWEST bug link names, or null. One definition, read
// by describeRow's `bug` and by the state file's legacy derivation, so "the bug this row links" is
// computed once — the derivation must name exactly the file --item would have handed out.
function rowBugPath(opts, r) {
  const p = bugLinkPaths(r.notes).at(-1);
  return p === undefined ? null : repoPathOf(opts, p);
}

// Printed by both commands, for the same reason the payload is shared.
function printRow(label, out) {
  console.log(`${label}: ${out.id} — ${out.function}`);
  console.log(`  surface:    ${out.surface}. ${out.surfaceTitle}`);
  console.log(`  what:       ${out.what}`);
  console.log(`  entry:      ${out.entry || "(none)"}`);
  console.log(`  state:      ${out.state ?? "(unknown)"}`);
  console.log(
    `  stories:    ${out.stories.map((s) => s.id).join(", ") || "(none)"}`,
  );
  console.log(
    `  items:      ${out.items || "(none mapped — author items first)"}`,
  );
  console.log(`  checklists: ${out.checklists.join(", ") || "(none)"}`);
  console.log(`  automated:  ${out.automatedBy.join(" · ") || "manual only"}`);
  console.log(
    `  prior runs: ${out.priorRuns.join(", ") || "(none — 1st run)"}`,
  );
}

// How --next, --item and --state-init find their row: ONE resolver, so --state-init cannot drift
// from the commands whose payload it records. Returns the payload, or null after reporting the miss
// exactly as the command always has (exit 3 nothing untested, exit 4 no such row).
function resolvePayload(opts) {
  const cfg = requireSurfaces(opts);
  if (opts.has("--item")) {
    const id = requireIdValue("--item", opts.val("--item"));
    const r = itemById(readRegistry(opts), id);
    if (!r) {
      // Exit 4, not the usage family's 2: "you named a row that is not there" is a different answer
      // from "you called me wrongly", and /qa-next stops differently on each (unknown-item).
      console.error(`uat-status: ${id}: no registry row`);
      process.exitCode = 4;
      return null;
    }
    return describeRow(opts, cfg, r);
  }
  const r = nextItem(readRegistry(opts));
  if (!r) {
    console.log(
      opts.has("--json") ? "null" : "nothing untested — registry complete",
    );
    process.exitCode = 3;
    return null;
  }
  return describeRow(opts, cfg, r);
}

function printPayload(opts, out) {
  if (opts.has("--json")) console.log(JSON.stringify(out, null, 2));
  else printRow(opts.has("--item") ? "item" : "next", out);
}

function cmdNext(opts) {
  const out = resolvePayload(opts);
  if (out) printPayload(opts, out);
}

function cmdItem(opts) {
  const out = resolvePayload(opts);
  if (out) printPayload(opts, out);
}

// Pure, and therefore testable without a filesystem. Run files are runs/<id>/<date>-<env>.md. The
// date and the env label are both fixed within a session, so a second run today would write the
// same path and take the first run's `## Findings` rows with it — and --findings is DERIVED from
// those files, so the loss reads as a shorter list nobody can tell is short. Zero-padded so "-10"
// does not sort before "-2"; the other half of the ordering is listRunFiles' seqKey above.
export function runPathFor(existing, date, env) {
  // An env label ending in `-NN` makes the sequence unreadable: `2026-09-22-ci-02.md` is
  // indistinguishable from run 02 of env `ci`, so seqKey normalises it to itself and it sorts
  // AFTER its own `-02` and `-10` re-runs — the very inversion the sort key exists to remove.
  // The ambiguity is created at WRITE time, so it is refused here rather than guessed at read
  // time, where nothing knows the env. (A hand-written file of that shape is still ordered
  // wrongly; the tool simply will not add one.)
  // The label is part of a file name under runs/<id>/, so it can neither be empty nor steer the
  // path out of that directory.
  if (!env || /[/\\]/.test(env) || env.includes(".."))
    die(
      `--env ${JSON.stringify(env)}: an env label must be non-empty and may not contain "/", "\\" or ".." — it becomes part of a file name under runs/<id>/`,
    );
  if (/-\d{2}$/.test(env))
    die(
      `--env ${env}: an env label may not end in -NN — it is indistinguishable from a run sequence`,
    );
  // Checked on the BUILT name, which is what seqKey reads: the date itself ends in -DD, so a
  // two-digit label ("10") builds 2026-09-22-10.md — run 10 of env "2026-09-22" to seqKey — although
  // the label alone ends in no "-NN". A guard on the label passed it (task.141 PR review 2, CR-1).
  const base = `${date}-${env}`;
  if (/-\d{2}$/.test(base))
    die(
      `--env ${env}: the run file would be ${base}.md, which reads as a run sequence — an env label may not be two digits; use one with a letter (e.g. env-${env})`,
    );
  const taken = new Set(existing.map((f) => basename(f)));
  if (!taken.has(`${base}.md`)) return `${base}.md`;
  for (let n = 2; n < 100; n++) {
    const name = `${base}-${String(n).padStart(2, "0")}.md`;
    if (!taken.has(name)) return name;
  }
  die(`${base}: 99 runs already recorded today`);
}

function cmdRunPath(opts) {
  requireSurfaces(opts);
  const id = requireIdValue("--run-path", opts.val("--run-path"));
  if (!itemById(readRegistry(opts), id)) {
    console.error(`uat-status: ${id}: no registry row`);
    process.exitCode = 4;
    return;
  }
  const env = opts.val("--env") ?? "local";
  const dir = join(opts.root, opts.registryDir, "runs", id);
  // Compute BEFORE creating: runPathFor refuses an ambiguous env label, and a refusal that has
  // already made a directory is a refusal the caller cannot trust. One readdir of a single
  // function's directory — not the recursive walk listRunFiles does.
  const name = runPathFor(
    existsSync(dir) ? readdirSync(dir) : [],
    today(),
    env,
  );
  mkdirSync(dir, { recursive: true });
  console.log(join("runs", id, name));
}

function updateRow(opts, rawId, mutate) {
  requireSurfaces(opts);
  // Normalised HERE, in the single writer, so every command that writes a row — --set, --accept,
  // --items, --automated — is case-insensitive by construction rather than by each remembering.
  // The readers (--item, --run-path) normalise at their own call sites. The population is "every
  // command that takes a row id", and `--item`/`--run-path` having it while these four did not is
  // the enumeration class: each site correct alone, the set never listed.
  const id = normaliseId(rawId);
  const reg = readRegistry(opts);
  const sec = reg.sections.find((s) => s.rows.some((r) => r.id === id));
  if (!sec) die(`${id}: no registry row`);
  const row = sec.rows.find((r) => r.id === id);
  mutate(row);
  row.cells.UAT = row.state;
  row.cells["Last run"] = row.run;
  row.cells["Notes / bug"] = row.notes;
  reg.lines[row.line] = renderRow(sec.columns, row.cells);
  writeRegistry(opts, reg.lines);
  // `(kept)` is the mitigation for the one silent branch in this file: a caller that expected a
  // verdict to move the state cell must be able to see that it did not.
  console.log(
    `${id}: ${row.state}${row.keptAccepted ? " (kept)" : ""}${row.run ? ` · ${row.run}` : ""}`,
  );
}

function appendNote(existing, addition) {
  // A PLAIN append. Duplicate suppression was tried three ways and each traded one wrong answer
  // for another, because ` · ` is the registry's own separator AND is legal inside a note: no
  // string comparison can distinguish "the cell's last segment is X" from "the cell ends with a
  // compound note whose tail reads X". Splitting on the separator dropped a genuinely new note;
  // matching the tail dropped it too; restricting the match to atomic additions dropped it once
  // more while letting an identical compound through twice.
  //
  // So the suppression is gone rather than approximated. A dropped note is data loss and is
  // silent; a repeated segment is noise a reader can see. The cost is that a ✅ row blocked nightly
  // by the same reason grows its cell — recorded as an accepted limitation in the gate's
  // recommendations rather than papered over, and bounded in practice because the loop writes one
  // segment per run.
  const add = (addition ?? "").trim();
  const have = (existing ?? "").trim();
  if (!add) return have;
  if (!have) return add;
  return `${have} · ${add}`;
}

function linkTo(opts, repoRelPath) {
  return `[${basename(repoRelPath).replace(/\.md$/, "")}](${relFromRegistry(opts, repoRelPath)})`;
}

function cmdSet(opts) {
  const i = opts.args.indexOf("--set");
  const [id, state] = [
    requireIdValue("--set", opts.args[i + 1]),
    opts.args[i + 2],
  ];
  if (!STATES[state])
    die(`state must be one of ${Object.keys(STATES).join("|")}`);
  if (state === "accepted") die("use --accept for owner sign-off");
  const run = opts.val("--run");
  const bug = opts.val("--bug");
  const note = opts.val("--note");
  if (["pass", "fail"].includes(state) && !run)
    die(`--run <path> is required for ${state}`);
  if (state === "fail" && !bug)
    die("--bug <path to bug report> is required for fail");
  if (["na", "blocked"].includes(state) && !note)
    die(`--note <why> is required for ${state}`);
  const clear = opts.has("--clear-note");
  if (clear && (bug || note))
    die("--clear-note cannot be combined with --note or --bug");
  updateRow(opts, id, (row) => {
    // ONLY A FAIL MOVES AN ACCEPTED ROW. ✅ means "this is the feature I wanted" — an owner's
    // judgement. A machine re-pass agrees with it; a "blocked" says the environment could not
    // supply a credential; an "n/a" says the function is gone. None of the three is evidence
    // against the judgement. A fail IS, and still overrides. Written as one predicate over the
    // verdict rather than a special case for "pass": Step 2's two early exits write blocked and
    // na, so guarding pass alone would leave the same defect reachable through another door — a
    // regression sweep must not replace fifty owner signatures with fifty ⏸.
    // `untested` is excluded alongside `fail` because it is not a VERDICT — it is the deliberate
    // demotion, the documented way to take an owner's ✅ back before re-testing from scratch
    // (README § Registry states, and this change's own migration line). Keeping ✅ for it left the
    // row accepted while the `state === "untested"` block below still cleared `Last run`, which
    // --check then rejected and /qa-next Step 0 HALTed on as `registry-invalid` — so the one
    // documented way out of an accepted row was the command that broke the registry.
    const kept =
      !["fail", "untested"].includes(state) &&
      stateKey(row.state) === "accepted";
    // On a kept ✅ the note cell is APPENDED TO, never replaced — by construction, for every flag
    // that writes it, present and future. That cell holds the owner's "accepted <date> — <why>",
    // and checkRegistry imposes no note requirement on an accepted row, so any loss here is
    // silent. Two earlier attempts guarded it by ENUMERATING the ways in, and each missed one:
    // `state === "pass"` missed `blocked` and `na`; `clear || note` missed `--bug`, which took the
    // kept branch and replaced the sign-off with a bug link while --check stayed green. An
    // enumeration of doors has to be re-checked every time a flag is added and nothing forces
    // that re-check, so the invariant is expressed as an operation instead: append. `--clear-note`
    // is still refused here, because clearing is not appending — it is the one flag whose whole
    // purpose is to empty the cell.
    if (kept && clear)
      die(
        "--clear-note cannot empty an accepted row's sign-off note — --set <id> untested first to demote it",
      );
    if (!kept) row.state = STATES[state];
    row.keptAccepted = kept;
    if (run)
      row.run = linkTo(
        opts,
        run.startsWith(opts.registryDir) ? run : join(opts.registryDir, run),
      );
    const parts = [];
    if (bug) parts.push(linkTo(opts, bug));
    if (note) parts.push(note);
    if (clear) row.notes = "";
    else if (parts.length)
      // The append rule above. ` · ` is the separator --accept already uses to join a sign-off to
      // whatever preceded it, so a kept row reads as one history rather than two conventions.
      row.notes = kept
        ? appendNote(row.notes, parts.join(" — "))
        : parts.join(" — ");
    if (state === "untested") {
      row.run = "";
      row.notes = note ?? "";
    }
  });
}

function cmdCell(opts, flag, column) {
  const i = opts.args.indexOf(flag);
  const [id, value] = [
    requireIdValue(flag, opts.args[i + 1]),
    opts.args[i + 2],
  ];
  if (!value) die(`${flag} <id> "<value>"`);
  updateRow(opts, id, (row) => {
    if (!(column in row.cells))
      die(`${id}: registry has no "${column}" column`);
    row.cells[column] = value;
  });
}

function cmdAccept(opts) {
  // Through the same boundary as every other id-taking command — the population the comment in
  // updateRow names is only closed if all six go through it, and `--accept --force` reported
  // `--FORCE: no registry row` while it did not.
  const id = requireIdValue("--accept", opts.val("--accept"));
  const note = opts.val("--note");
  updateRow(opts, id, (row) => {
    if (stateKey(row.state) !== "pass" && !opts.has("--force"))
      die(
        `${id} is ${row.state} — only 🟡 pass can be accepted (use --force to override)`,
      );
    row.state = STATES.accepted;
    row.notes = [row.notes, `accepted ${today()}${note ? ` — ${note}` : ""}`]
      .filter(Boolean)
      .join(" · ");
  });
}

export function scoreboard({ sections }) {
  const blank = () =>
    Object.fromEntries([...Object.keys(STATES), "rows"].map((k) => [k, 0]));
  const counts = {};
  const total = blank();
  for (const sec of sections) {
    const c = blank();
    c.rows = sec.rows.length;
    for (const r of sec.rows) {
      const k = stateKey(r.state);
      if (k) {
        c[k] += 1;
        total[k] += 1;
      }
    }
    total.rows += c.rows;
    counts[sec.letter] = c;
  }
  return { counts, total };
}

function cmdScoreboard(opts) {
  const cfg = requireSurfaces(opts);
  const reg = readRegistry(opts);
  const { counts, total } = scoreboard(reg);
  const pad = (s, n) => String(s).padStart(n);
  const line = (label, c) => {
    const done = c.rows
      ? Math.round(([...DONE].reduce((n, k) => n + c[k], 0) / c.rows) * 100)
      : 0;
    console.log(
      `${label.padEnd(7)} ${pad(c.rows, 4)}  ${pad(c.untested, 3)}  ${pad(c.pass, 4)}  ${pad(c.fail, 4)}  ${pad(c.blocked, 4)}  ${pad(c.accepted, 4)}  ${pad(c.na, 4)}  ${pad(done, 3)}%`,
    );
  };
  console.log("surface rows  ⬜    🟡    ❌    ⏸     ✅    ➖   done");
  for (const sec of reg.sections) line(sec.letter, counts[sec.letter]);
  line("total", total);
  const next = nextItem(reg);
  console.log(
    next
      ? `next: ${next.id} — ${next.title} (${next.surface})`
      : "next: nothing untested",
  );
  const unmapped = checkCoverage(reg, loadStories(opts, cfg), cfg).unmapped
    .length;
  if (unmapped)
    console.log(
      `stories: ${unmapped} accepted covered by no function — --coverage to list them`,
    );
  const open = loadFindings(opts).filter(isOpenFinding).length;
  if (open) console.log(`findings: ${open} open — --findings to list them`);
}

// ---------- the /qa-next run state file ----------
//
// The single-flight lock and resume record, created at selection and deleted last in Step 6. It used
// to be a JSON shape described across SKILL.md Steps 0–6, and a contract that existed only as
// sentences produced one defect per QA cycle (task.141 BUG-21/22/23): a reader drifted from its
// writer and nothing mechanical could see it. The fields, who writes each and who reads it are
// stated ONCE, here; the skill calls the four commands below and describes no JSON.

export const STATE_PHASES = Object.freeze([
  "selected",
  "resolved",
  "executed",
  "recorded",
  "committed",
]);

// `writer`: "init" — written once by --state-init from the --item/--next payload and never again, so
// it describes the row AS IT WAS WHEN THE RUN BEGAN; or "set" — mutable through --state-set, whose
// `value` says how the argument is parsed. `readers`: the SKILL.md steps that read the field.
export const STATE_FIELDS = Object.freeze({
  item: Object.freeze({ writer: "init", readers: ["0", "resume"] }),
  function: Object.freeze({ writer: "init", readers: ["5", "6"] }),
  surface: Object.freeze({ writer: "init", readers: ["2"] }),
  stories: Object.freeze({ writer: "init", readers: ["4"] }),
  uatSpecs: Object.freeze({ writer: "init", readers: ["3"] }),
  targeted: Object.freeze({ writer: "init", readers: ["resume"] }),
  priorRuns: Object.freeze({ writer: "init", readers: ["4", "5", "6"] }),
  // The bug the row linked BEFORE this run — Step 4's reuse decision only. This run's bug is filedBug.
  bug: Object.freeze({ writer: "init", readers: ["4"] }),
  startedAt: Object.freeze({ writer: "init", readers: [] }),
  phase: Object.freeze({
    writer: "set",
    value: "phase",
    readers: ["0", "resume"],
  }),
  runFile: Object.freeze({
    writer: "set",
    value: "path",
    readers: ["4", "legacy"],
  }),
  lane: Object.freeze({ writer: "set", value: "json", readers: ["4", "6"] }),
  filedBug: Object.freeze({
    writer: "set",
    value: "path",
    readers: ["4", "6"],
  }),
});

const STATE_DEFAULT = ".claude/state/qa-next.state.json";

function statePath(opts) {
  return join(opts.root, opts.val("--state") ?? STATE_DEFAULT);
}

// null when there is no state file; a file that is not a state file is refused by name (exit 1)
// rather than read as whatever each step would make of it.
function readState(opts) {
  const p = statePath(opts);
  if (!existsSync(p)) return null;
  let state;
  try {
    state = JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    die(
      `state-malformed: ${p} is not JSON (${e.message}) — --state-clear it and start over`,
      1,
    );
  }
  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state) ||
    typeof state.item !== "string" ||
    !STATE_PHASES.includes(state.phase)
  )
    die(
      `state-malformed: ${p} names no item or no known phase (${STATE_PHASES.join(" → ")}) — --state-clear it and start over`,
      1,
    );
  return state;
}

// Write a per-process temp file, then move it into place, so a reader never sees half a lock and
// two writers never share a temp name. `exclusive` (--state-init) moves it with link(), which fails
// with EEXIST if the lock appeared since the check: the check and the create are one atomic step, so
// two concurrent inits cannot both win. Updates (--state-set) replace with rename().
function writeState(opts, state, { exclusive = false } = {}) {
  writeStateFile(statePath(opts), state, { exclusive });
}

// The file-level writer, exported so the exclusive create is testable without racing processes.
export function writeStateFile(p, state, { exclusive = false } = {}) {
  const tmp = `${p}.${process.pid}.tmp`;
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  if (!exclusive) return renameSync(tmp, p);
  try {
    linkSync(tmp, p);
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    let existing = null;
    try {
      existing = JSON.parse(readFileSync(p, "utf8"));
    } catch {
      // unreadable — still a run in flight; the message names no item
    }
    die(runInProgress(existing), 5);
  } finally {
    rmSync(tmp, { force: true });
  }
}

function runInProgress(existing) {
  return `run-in-progress: a qa-next run for ${existing?.item ?? "another item"} is in flight — resume it through --state-get (Step 0), or --state-clear it`;
}

// The state as the skill reads it. A LEGACY file — the shape released in v0.51.0, before targeted,
// priorRuns, bug and filedBug existed — is answered with each missing field DERIVED and named in
// `derived`, never a silent default: an empty priorRuns reports a re-run as a first run, and a null
// bug files a duplicate on a repeat failure. Derived on every read, never written back, so each
// answer is computed against the phase it is read at.
export function stateView(opts, state) {
  const has = (k) => Object.hasOwn(state, k);
  const out = { ...state };
  const derived = [];
  if (!has("targeted")) {
    out.targeted = false; // v0.51.0 took no id argument: every run was untargeted
    derived.push("targeted");
  }
  if (!has("priorRuns")) {
    // The row's history minus this run's own file — the row as it was when the run began. v0.51.0
    // never told the skill to record runFile, so on a real legacy file it is null (TASK-143-BUG-2)
    // and "this run's own file" has to be found another way: the file Step 4.4 linked as the row's
    // Last run once the phase is `recorded`, and any run file written after the run started (Step 4
    // writes it before `recorded`, and a resume mid-Step-4 finds it on disk).
    const own = new Set([state.runFile].filter(Boolean));
    if (!state.runFile) {
      const recorded =
        STATE_PHASES.indexOf(state.phase) >= STATE_PHASES.indexOf("recorded");
      const r = recorded && itemById(readRegistry(opts), state.item);
      const lastRun = r ? (r.run.match(/\]\(([^)]+)\)/) ?? [])[1] : undefined;
      if (lastRun) own.add(lastRun);
      const started = Date.parse(state.startedAt);
      const base = join(opts.root, opts.registryDir);
      if (!Number.isNaN(started))
        for (const f of priorRuns(opts, state.item))
          if (statSync(join(base, f)).mtimeMs >= started) own.add(f);
    }
    out.priorRuns = priorRuns(opts, state.item).filter((f) => !own.has(f));
    derived.push("priorRuns");
  }
  if (!has("bug") || !has("filedBug")) {
    const r = itemById(readRegistry(opts), state.item);
    const current = r ? rowBugPath(opts, r) : null;
    // Step 4.4 rewrites the note cell and the phase then moves to `recorded`: before that the row's
    // link IS the pre-run bug; from then on it is this run's, and the pre-run one has been read.
    const recorded =
      STATE_PHASES.indexOf(state.phase) >= STATE_PHASES.indexOf("recorded");
    if (!has("bug")) {
      out.bug = recorded ? null : current;
      derived.push("bug");
    }
    if (!has("filedBug")) {
      out.filedBug =
        recorded && r && stateKey(r.state) === "fail" ? current : null;
      derived.push("filedBug");
    }
  }
  if (derived.length) out.derived = derived;
  return out;
}

function printState(opts, view) {
  if (opts.has("--json")) {
    console.log(JSON.stringify(view, null, 2));
    return;
  }
  for (const [k, v] of Object.entries(view))
    console.log(`  ${k.padEnd(10)} ${JSON.stringify(v)}`);
}

function cmdStateInit(opts) {
  if (!opts.has("--item") && !opts.has("--next"))
    die("--state-init needs --item <id> or --next");
  // Exit 0 means ONE thing: a fresh selection, printed as the --next/--item payload. A state file
  // that already exists is a run in flight whatever item it names — resuming it is --state-get's job
  // (SKILL.md Step 0), and reaching here past Step 0 means another run started in between. Printing
  // the stored state instead, on the same exit 0, handed Step 1 a shape it would read as a payload
  // (TASK-143-BUG-1).
  const existing = readState(opts);
  if (existing) die(runInProgress(existing), 5);
  const out = resolvePayload(opts);
  if (!out) return; // exit 3 / 4, and nothing written
  writeState(
    opts,
    {
      item: out.id,
      function: out.function,
      surface: out.surface,
      stories: out.stories.map((s) => s.id),
      uatSpecs: out.uatSpecs,
      targeted: opts.has("--item"),
      priorRuns: out.priorRuns,
      bug: out.bug,
      startedAt: new Date().toISOString(),
      phase: "selected",
      runFile: null,
      lane: null,
      filedBug: null,
    },
    { exclusive: true },
  );
  printPayload(opts, out);
}

function cmdStateGet(opts) {
  const state = readState(opts);
  if (!state) die(`no-state: no qa-next run in flight (${statePath(opts)})`, 6);
  printState(opts, stateView(opts, state));
}

function cmdStateSet(opts) {
  const i = opts.args.indexOf("--state-set");
  const field = opts.args[i + 1];
  const raw = opts.args[i + 2];
  if (!field || field.startsWith("--") || raw === undefined)
    die("--state-set <field> <value> — both are required");
  if (!Object.hasOwn(STATE_FIELDS, field))
    die(
      `--state-set ${field}: unknown state field — the fields are ${Object.keys(STATE_FIELDS).join(", ")}`,
    );
  const spec = STATE_FIELDS[field];
  if (spec.writer !== "set")
    die(
      `--state-set ${field}: init-only — --state-init wrote it from the row as it was when the run began, and the run has changed the row since`,
    );
  const state = readState(opts);
  if (!state) die(`no-state: no qa-next run in flight (${statePath(opts)})`, 6);
  let value;
  if (spec.value === "phase") {
    if (!STATE_PHASES.includes(raw))
      die(
        `--state-set phase ${raw}: the phases are ${STATE_PHASES.join(" → ")}`,
      );
    if (STATE_PHASES.indexOf(raw) < STATE_PHASES.indexOf(state.phase))
      die(
        `--state-set phase ${raw}: phase moves forward only (${state.phase} → ${raw} is backward) — --state-clear and re-init to start the run over`,
      );
    value = raw;
  } else if (spec.value === "path") {
    if (raw === "") die(`--state-set ${field}: a path, or the literal null`);
    value = raw === "null" ? null : raw;
  } else {
    try {
      value = JSON.parse(raw);
    } catch {
      die(
        `--state-set ${field}: the value must be JSON (e.g. '{"exit":0,"report":"…"}' or null)`,
      );
    }
  }
  writeState(opts, { ...state, [field]: value });
  if (opts.has("--json"))
    printState(opts, stateView(opts, { ...state, [field]: value }));
  else console.log(`state: ${field} = ${JSON.stringify(value)}`);
}

function cmdStateClear(opts) {
  const p = statePath(opts);
  const had = existsSync(p);
  rmSync(p, { force: true });
  console.log(had ? `state: cleared ${p}` : "state: none to clear");
}

export function main(argv) {
  try {
    return dispatch(parseArgs(argv));
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(`uat-status: ${e.message}`);
    process.exitCode = e.code;
  }
}

function dispatch(opts) {
  const unknown = opts.args.find((a) => a.startsWith("--") && !OPTIONS.has(a));
  if (unknown) die(`unknown option ${unknown}`);
  // The state commands first: `--state-init --item D.2` also carries --item, and must not be taken
  // for a read-only --item.
  if (opts.has("--state-init")) return cmdStateInit(opts);
  if (opts.has("--state-get")) return cmdStateGet(opts);
  if (opts.has("--state-set")) return cmdStateSet(opts);
  if (opts.has("--state-clear")) return cmdStateClear(opts);
  if (opts.has("--init")) return cmdInit(opts);
  if (opts.has("--coverage")) return cmdCoverage(opts);
  if (opts.has("--check")) return cmdCheck(opts);
  if (opts.has("--next")) return cmdNext(opts);
  if (opts.has("--item")) return cmdItem(opts);
  if (opts.has("--run-path")) return cmdRunPath(opts);
  if (opts.has("--set")) return cmdSet(opts);
  if (opts.has("--items")) return cmdCell(opts, "--items", "Items");
  if (opts.has("--automated"))
    return cmdCell(opts, "--automated", "Automated by");
  if (opts.has("--accept")) return cmdAccept(opts);
  if (opts.has("--findings")) return cmdFindings(opts);
  return cmdScoreboard(opts);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv);
