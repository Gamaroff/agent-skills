#!/usr/bin/env node
// uat-status.mjs — the UAT tracker tool behind /qa-next.
//
// The tracker (default docs/qa/uat-tracker.md) is the OWNER'S acceptance record: one row per
// live story (frontmatter `status: accepted`, not in an excluded PRD), grouped by QA surface.
// It is deliberately separate from a story's `status`, which is the development pipeline's
// Definition of Done — an agent signed that; nobody has yet signed that the feature is the
// one that was wanted. Story status is never touched here: a UAT failure is a bug.
//
//   node uat-status.mjs                       scoreboard per surface + total, and the next item
//   node uat-status.mjs --init [--force]      generate the tracker from the story corpus
//   node uat-status.mjs --sync                append rows for accepted stories the tracker lacks
//   node uat-status.mjs --check               drift + integrity gate (exit 1 on any error)
//   node uat-status.mjs --next [--json]       first ⬜ row in surface order (exit 3 when none)
//   node uat-status.mjs --set <id> <state> --run <path> [--bug <path>] [--note "..."]
//   node uat-status.mjs --verified <id> "<items>"      fill the Verified-by cell
//   node uat-status.mjs --accept <id> [--note "..."]   🟡 pass → ✅ accepted — the owner's command
//
// Paths: --root <dir> (default: cwd) · --tracker <path> (default docs/qa/uat-tracker.md) ·
// --surfaces <path> (default: uat-surfaces.json beside the tracker) · --stories <dir> (default docs/prd).
// Every relative link written into the tracker is relative to the tracker's own directory.

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

// ---------- options ----------

export function parseArgs(argv) {
  const args = argv.slice(2);
  const val = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const root = resolve(val("--root") ?? process.cwd());
  const tracker = val("--tracker") ?? "docs/qa/uat-tracker.md";
  return {
    args,
    root,
    tracker,
    trackerDir: dirname(tracker),
    surfaces: val("--surfaces") ?? join(dirname(tracker), "uat-surfaces.json"),
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
  cfg.excludedPrds ??= [];
  cfg.defaultSurface ??= cfg.surfaces.at(-1).letter;
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

// ---------- tracker parse / render ----------

const ROW =
  /^\|\s*\[?([0-9]+\.[0-9]+)\]?(?:\([^)]*\))?\s*\|(.*)\|(.*)\|(.*)\|(.*)\|(.*)\|\s*$/;
const SECTION = /^### ([A-Z])\. (.*)$/;

export function parseTracker(text) {
  const sections = [];
  let cur = null;
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const s = line.match(SECTION);
    if (s) {
      cur = { letter: s[1], title: s[2], rows: [], headerLine: i };
      sections.push(cur);
      return;
    }
    const r = line.match(ROW);
    if (r && cur) {
      const [, id, title, verifiedBy, state, run, notes] = r;
      cur.rows.push({
        id,
        title: title.trim(),
        verifiedBy: verifiedBy.trim(),
        state: state.trim(),
        run: run.trim(),
        notes: notes.trim(),
        line: i,
        surface: cur.letter,
      });
    }
  });
  return { sections, lines };
}

export function stateKey(cell) {
  return (
    Object.keys(STATES).find((k) => cell.startsWith(STATES[k].split(" ")[0])) ??
    null
  );
}

function relFromTracker(opts, repoRelPath) {
  return relative(opts.trackerDir, repoRelPath);
}

function renderRow(opts, story, row = null) {
  const link = story.path
    ? `[${story.id}](${relFromTracker(opts, story.path)})`
    : story.id;
  const r = row ?? {
    title: story.title,
    verifiedBy: "",
    state: STATES.untested,
    run: "",
    notes: "",
  };
  return `| ${link} | ${r.title} | ${r.verifiedBy} | ${r.state} | ${r.run} | ${r.notes} |`;
}

const TABLE_HEAD = [
  "| Story | Title | Verified by | UAT | Last run | Notes / bug |",
  "| :--- | :--- | :--- | :--- | :--- | :--- |",
];

function renderTracker(opts, cfg, stories, today) {
  const tool = `node ${cfg.toolPath ?? ".agents/skills/qa-next/scripts/uat-status.mjs"}`;
  const out = [
    "---",
    "title: UAT Tracker — owner acceptance per story",
    "type: guide",
    "status: active",
    `created: ${today}`,
    `updated: ${today}`,
    "---",
    "",
    "# UAT Tracker — owner acceptance per story",
    "",
    "One row per **live story** (`status: accepted`, non-superseded PRD), grouped by QA surface. This is the *owner's* acceptance record — distinct from a story's `status: accepted`, which is the development pipeline's Definition of Done.",
    "",
    "**States:** `⬜ untested` → `🟡 pass` (behaved as the checklist expects) → `✅ accepted` (owner sign-off — it is the feature that was wanted). `❌ fail` branches to a bug; `⏸ blocked` could not be exercised in the test environment (note says why; the loop skips it); `➖ n/a` marks infra/non-user-facing stories (note required). Story status is **never** changed by UAT — a failure is a bug, filed via `/create-bug-report` and linked here.",
    "",
    `**Rules** (enforced by \`${tool} --check\`): 🟡 / ✅ / ❌ need a **Last run** link into \`runs/\`; ❌ needs a bug link in **Notes**; ⏸ and ➖ need a note; every live story has exactly one row. Rows are hand-movable between surfaces; \`--sync\` only appends, never moves.`,
    "",
    `**Tooling:** \`${tool}\` (scoreboard) · \`--next\` (the \`/qa-next\` selector) · \`--set <id> <state> --run <path>\` · \`--verified <id> "<items>"\` · \`--accept <id>\` · \`--sync\` · \`--check\`. Surface checklists live beside this file as \`qa.<letter>.<slug>.md\`; per-run results under \`runs/\`.`,
    "",
  ];
  for (const { letter, title } of cfg.surfaces) {
    const rows = stories.filter((s) => s.surface === letter);
    out.push(`### ${letter}. ${title}`, "");
    if (rows.length === 0) {
      out.push("_No live stories mapped here yet._", "");
      continue;
    }
    out.push(...TABLE_HEAD, ...rows.map((s) => renderRow(opts, s)), "");
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

function readTracker(opts) {
  const p = join(opts.root, opts.tracker);
  if (!existsSync(p)) die(`${opts.tracker} not found — run --init first`);
  return parseTracker(readFileSync(p, "utf8"));
}

function writeTracker(opts, lines) {
  writeFileSync(
    join(opts.root, opts.tracker),
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
  const p = join(opts.root, opts.tracker);
  if (existsSync(p) && !opts.has("--force"))
    die(
      `${opts.tracker} exists — use --sync to add missing rows, or --force to regenerate (loses all state)`,
    );
  const live = loadStories(opts, cfg).filter((s) => s.status === "accepted");
  mkdirSync(dirname(p), { recursive: true });
  mkdirSync(join(dirname(p), "runs"), { recursive: true });
  writeFileSync(p, renderTracker(opts, cfg, live, today()));
  console.log(
    `wrote ${opts.tracker}: ${live.length} rows across ${cfg.surfaces.length} surfaces`,
  );
}

function cmdSync(opts) {
  const cfg = requireSurfaces(opts);
  const { sections, lines } = readTracker(opts);
  const have = new Set(sections.flatMap((s) => s.rows.map((r) => r.id)));
  const missing = loadStories(opts, cfg).filter(
    (s) => s.status === "accepted" && !have.has(s.id),
  );
  if (missing.length === 0)
    return console.log("tracker in sync — nothing to add");
  const inserts = new Map();
  for (const s of missing) {
    const sec = sections.find((x) => x.letter === s.surface);
    if (!sec)
      die(
        `no section for surface ${s.surface} — add it to the tracker or to ${opts.surfaces}`,
      );
    const lastRow = sec.rows.at(-1);
    let at;
    if (lastRow) at = lastRow.line + 1;
    else {
      at = sec.headerLine + 2;
      if (lines[at]?.startsWith("_No live stories"))
        lines[at] = TABLE_HEAD.join("\n");
      at += 1;
    }
    inserts.set(at, [...(inserts.get(at) ?? []), renderRow(opts, s)]);
  }
  for (const at of [...inserts.keys()].sort((a, b) => b - a))
    lines.splice(at, 0, ...inserts.get(at));
  writeTracker(opts, lines);
  console.log(
    `added ${missing.length} row(s): ${missing.map((s) => s.id).join(", ")}`,
  );
}

// Pure: `exists` is injected so the unit tests need no filesystem.
export function checkTracker({ sections }, stories, exists = () => true) {
  const errors = [];
  const warns = [];
  const rows = sections.flatMap((s) => s.rows);
  const seen = new Map();
  for (const r of rows) {
    if (seen.has(r.id))
      errors.push(`${r.id}: duplicate row (also in ${seen.get(r.id)})`);
    seen.set(r.id, r.surface);
  }
  const byId = new Map(stories.map((s) => [s.id, s]));
  for (const s of stories)
    if (s.status === "accepted" && !seen.has(s.id))
      errors.push(`${s.id}: accepted story has no tracker row — run --sync`);
  for (const r of rows) {
    const story = byId.get(r.id);
    if (!story)
      warns.push(
        `${r.id}: row has no live story (deleted, or in an excluded PRD)`,
      );
    else if (story.status !== "accepted")
      warns.push(
        `${r.id}: story status is ${story.status}, not accepted — row is stale`,
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
  }
  return { errors, warns };
}

function cmdCheck(opts) {
  const cfg = requireSurfaces(opts);
  const exists = (rel) => existsSync(join(opts.root, opts.trackerDir, rel));
  const { errors, warns } = checkTracker(
    readTracker(opts),
    loadStories(opts, cfg),
    exists,
  );
  for (const w of warns) console.log(`[warn ] ${w}`);
  for (const e of errors) console.log(`[ERROR] ${e}`);
  console.log(
    `uat-check: ${errors.length} error(s), ${warns.length} warning(s)`,
  );
  process.exitCode = errors.length ? 1 : 0;
}

export function nextItem({ sections }) {
  for (const sec of sections) {
    const r = sec.rows.find((row) => stateKey(row.state) === "untested");
    if (r) return { ...r, surfaceTitle: sec.title };
  }
  return null;
}

function cmdNext(opts) {
  const cfg = requireSurfaces(opts);
  const r = nextItem(readTracker(opts));
  if (!r) {
    console.log(
      opts.has("--json") ? "null" : "nothing untested — tracker complete",
    );
    process.exitCode = 3;
    return;
  }
  const story = loadStories(opts, cfg).find((s) => s.id === r.id);
  const dir = join(opts.root, opts.trackerDir);
  const checklist = readdirSync(dir).find(
    (f) => f.startsWith(`qa.${r.surface.toLowerCase()}.`) && f.endsWith(".md"),
  );
  const out = {
    id: r.id,
    title: r.title,
    surface: r.surface,
    surfaceTitle: r.surfaceTitle,
    storyPath: story?.path ?? null,
    storyType: story?.storyType ?? null,
    verifiedBy: r.verifiedBy,
    checklist: checklist ? join(opts.trackerDir, checklist) : null,
  };
  if (opts.has("--json")) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`next: ${out.id} — ${out.title}`);
    console.log(`  surface:   ${out.surface}. ${out.surfaceTitle}`);
    console.log(`  story:     ${out.storyPath}`);
    console.log(
      `  checklist: ${out.checklist ?? "(none for this surface yet — author items first)"}`,
    );
    console.log(`  verified:  ${out.verifiedBy || "(no items mapped)"}`);
  }
}

function updateRow(opts, id, mutate) {
  const cfg = requireSurfaces(opts);
  const tracker = readTracker(opts);
  const row = tracker.sections.flatMap((s) => s.rows).find((r) => r.id === id);
  if (!row) die(`${id}: no tracker row`);
  mutate(row);
  const story = loadStories(opts, cfg).find((s) => s.id === id) ?? {
    id,
    path: "",
  };
  tracker.lines[row.line] = renderRow(opts, story, row);
  writeTracker(opts, tracker.lines);
  console.log(`${id}: ${row.state}${row.run ? ` · ${row.run}` : ""}`);
}

function linkTo(opts, repoRelPath) {
  return `[${basename(repoRelPath).replace(/\.md$/, "")}](${relFromTracker(opts, repoRelPath)})`;
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
        run.startsWith(opts.trackerDir) ? run : join(opts.trackerDir, run),
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

function cmdVerified(opts) {
  const i = opts.args.indexOf("--verified");
  const [id, items] = [opts.args[i + 1], opts.args[i + 2]];
  if (!items) die('--verified <id> "<items>"');
  updateRow(opts, id, (row) => {
    row.verifiedBy = items;
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
  const tracker = readTracker(opts);
  const { counts, total } = scoreboard(tracker);
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
  for (const sec of tracker.sections) line(sec.letter, counts[sec.letter]);
  line("total", total);
  const next = nextItem(tracker);
  console.log(
    next
      ? `next: ${next.id} — ${next.title} (${next.surface})`
      : "next: nothing untested",
  );
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
  if (opts.has("--init")) return cmdInit(opts);
  if (opts.has("--sync")) return cmdSync(opts);
  if (opts.has("--check")) return cmdCheck(opts);
  if (opts.has("--next")) return cmdNext(opts);
  if (opts.has("--set")) return cmdSet(opts);
  if (opts.has("--verified")) return cmdVerified(opts);
  if (opts.has("--accept")) return cmdAccept(opts);
  return cmdScoreboard(opts);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv);
