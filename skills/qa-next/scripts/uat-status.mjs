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
//   node uat-status.mjs --set <id> <state> --run <path> [--bug <path>] [--note "..."]
//   node uat-status.mjs --items <id> "<items>"         fill the Items cell
//   node uat-status.mjs --automated <id> "<specs>"     fill the Automated-by cell
//   node uat-status.mjs --accept <id> [--note "..."]   🟡 pass → ✅ accepted — the owner's command
//   node uat-status.mjs --findings [--all] [--json]    open findings across every run file
//
// Paths: --root <dir> (default: cwd) · --registry <path> (default docs/qa/uat-registry.md) ·
// --surfaces <path> (default: uat-surfaces.json beside the registry) · --stories <dir> (default docs/prd).
// Every relative link written into the registry is relative to the registry's own directory.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  copyFileSync,
  mkdirSync,
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
  "--json",
  "--set",
  "--run",
  "--bug",
  "--note",
  "--items",
  "--automated",
  "--accept",
  "--findings",
  "--all",
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
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
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

function renderRow(columns, cells) {
  return `| ${columns.map((c) => cells[c] ?? "").join(" | ")} |`;
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
    `**Rules** (enforced by \`${tool} --check\`): 🟡 / ✅ / ❌ need a **Last run** link into \`runs/\`; ❌ needs a bug link in **Notes**; ⏸ and ➖ need a note; every \`Stories\` id is a real story; every accepted story is named by some function or listed under \`storyNa\` in \`uat-surfaces.json\` (\`--coverage\` lists the rest). Rows are authored and reordered by hand — the tool only fills cells.`,
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
      if (k === "fail") {
        const bugLink = r.notes.match(/\[[^\]]*bug\.[^\]]*\]\(([^)]+)\)/);
        if (!bugLink) errors.push(`${r.id}: fail requires a bug link in Notes`);
        else if (!exists(bugLink[1]))
          errors.push(`${r.id}: bug file not found: ${bugLink[1]}`);
      }
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

// Every finding in every run file, oldest run first. `bug` is relative to the run file; `bugStatus`
// is the bug's frontmatter status, `missing` when the link does not resolve, null for a note.
function loadFindings(opts) {
  const runsDir = join(opts.root, opts.registryDir, "runs");
  if (!existsSync(runsDir)) return [];
  const out = [];
  for (const name of readdirSync(runsDir).sort()) {
    if (!name.endsWith(".md")) continue;
    const run = join("runs", name);
    for (const f of parseFindings(readFileSync(join(runsDir, name), "utf8"))) {
      let bugStatus = null;
      if (f.bug) {
        const p = join(runsDir, f.bug);
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
  const exists = (rel) => existsSync(join(opts.root, opts.registryDir, rel));
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

function cmdNext(opts) {
  const cfg = requireSurfaces(opts);
  const r = nextItem(readRegistry(opts));
  if (!r) {
    console.log(
      opts.has("--json") ? "null" : "nothing untested — registry complete",
    );
    process.exitCode = 3;
    return;
  }
  const stories = loadStories(opts, cfg);
  const automatedBy = specPaths(r.cells["Automated by"]);
  const uat = new RegExp(cfg.uatSpecPattern);
  const out = {
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
  };
  if (opts.has("--json")) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`next: ${out.id} — ${out.function}`);
    console.log(`  surface:    ${out.surface}. ${out.surfaceTitle}`);
    console.log(`  what:       ${out.what}`);
    console.log(`  entry:      ${out.entry || "(none)"}`);
    console.log(
      `  stories:    ${out.stories.map((s) => s.id).join(", ") || "(none)"}`,
    );
    console.log(
      `  items:      ${out.items || "(none mapped — author items first)"}`,
    );
    console.log(`  checklists: ${out.checklists.join(", ") || "(none)"}`);
    console.log(
      `  automated:  ${out.automatedBy.join(" · ") || "manual only"}`,
    );
  }
}

function updateRow(opts, id, mutate) {
  requireSurfaces(opts);
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
  console.log(`${id}: ${row.state}${row.run ? ` · ${row.run}` : ""}`);
}

function linkTo(opts, repoRelPath) {
  return `[${basename(repoRelPath).replace(/\.md$/, "")}](${relFromRegistry(opts, repoRelPath)})`;
}

function cmdSet(opts) {
  const i = opts.args.indexOf("--set");
  const [id, state] = [opts.args[i + 1], opts.args[i + 2]];
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
  updateRow(opts, id, (row) => {
    row.state = STATES[state];
    if (run)
      row.run = linkTo(
        opts,
        run.startsWith(opts.registryDir) ? run : join(opts.registryDir, run),
      );
    const parts = [];
    if (bug) parts.push(linkTo(opts, bug));
    if (note) parts.push(note);
    if (parts.length) row.notes = parts.join(" — ");
    if (state === "untested") {
      row.run = "";
      row.notes = note ?? "";
    }
  });
}

function cmdCell(opts, flag, column) {
  const i = opts.args.indexOf(flag);
  const [id, value] = [opts.args[i + 1], opts.args[i + 2]];
  if (!value) die(`${flag} <id> "<value>"`);
  updateRow(opts, id, (row) => {
    if (!(column in row.cells))
      die(`${id}: registry has no "${column}" column`);
    row.cells[column] = value;
  });
}

function cmdAccept(opts) {
  const id = opts.val("--accept");
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
  if (opts.has("--init")) return cmdInit(opts);
  if (opts.has("--coverage")) return cmdCoverage(opts);
  if (opts.has("--check")) return cmdCheck(opts);
  if (opts.has("--next")) return cmdNext(opts);
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
