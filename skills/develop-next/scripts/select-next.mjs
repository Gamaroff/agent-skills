#!/usr/bin/env node
/**
 * select-next.mjs — deterministic roadmap selector for the develop-next skill.
 *
 * Parses a project-completion roadmap (markdown checkbox rows + marker
 * vocabulary defined in references/roadmap-selection.md) and emits a JSON
 * verdict: which item to build next, or why the loop must stop/halt.
 *
 * Design stance: the roadmap is a *living backlog* — completed items are
 * archived out (to roadmap-history.md), so a dep that names no current row
 * means "already shipped", not "error". Parsing is therefore tolerant:
 * halts are reserved for a roadmap that yields no parseable content at all;
 * everything questionable is a warning, surfaced but non-fatal. This is
 * validated against a real ~370-line production roadmap (captured, sanitized,
 * as the 10-real-world unit fixture).
 *
 * Usage:
 *   select-next.mjs [--roadmap <path>]                      # selection (default)
 *   select-next.mjs --lint [--roadmap <path>]               # format lint only
 *   select-next.mjs --epic-status <n> [--assume-ticked <id>]... [--roadmap <path>]
 *
 * Output: JSON on stdout, always.
 * Exit codes:
 *   selection    0 = status "selected" or "stop"; 1 = status "halt" or I/O error
 *   --lint       0 = no errors (warnings allowed); 1 = errors
 *   --epic-status 0 = epic found; 1 = unknown epic or I/O error
 *
 * No dependencies. Node >= 22. Pure functions are exported for unit tests
 * (evals/develop-next/unit/); the CLI runs only when invoked directly.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_ROADMAP = "docs/development/project-completion-roadmap.md";

// Item ids: 5.1a, 8.4-2, 17.3-1, 13.1-1, 21.2a, 7.11-NFR2 …
// …plus `T`-prefixed standalone-task ids: T22, T26. The prefix is load-bearing:
// task and epic numbers share this namespace (Task 22 / Epic 22, Task 26 / Epic 26
// can all exist), so a bare `22` would be ambiguous. Without the `T` alternative
// these rows parsed as id-less and — worse — `deps: T22` was silently dropped,
// letting a dependent be selected while its hard prerequisite was unbuilt.
// `T` must be followed by a digit, so prose like "Task 22" still yields only `22`.
const ID_RE_SRC = "T?\\d+(?:\\.\\d+)*[a-z]?(?:-[A-Za-z0-9]+)*";
const ID_RE = new RegExp(ID_RE_SRC);
const ID_TOKEN_RE = new RegExp(`(?<![\\w.-])(${ID_RE_SRC})`, "g");
const ROW_RE = /^(\s*)[-*]\s*\[([ xX])\]\s*(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const EXCLUDED_HEADING_RE = /deferred|human.?gated|housekeeping|change\s*log/i;
const COMMAND_RE = /\/(develop-story|develop-task|create-story|create-epic|create-task)(?:\s+`?([^\s`)]+\.md))?/;
const MD_LINK_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;
const SKIP_RE = /⏭️|⏭|\bSKIP\b/;

/** Strip leading markdown decoration (strikethrough, bold, emphasis) so ids parse. */
function undecorate(s) {
  return s.replace(/^\s*(?:~~|\*\*|\*|_)+\s*/, "");
}

function idTokens(text) {
  return [...text.matchAll(ID_TOKEN_RE)].map(m => m[1]);
}

/** `T22`/`T26` — a standalone task row, as opposed to an epic story row. */
function isTaskId(id) {
  return /^T\d/.test(id);
}

/** First markdown-link href that points at a story/task file, else null. */
function workItemPath(text) {
  for (const m of text.matchAll(MD_LINK_RE)) {
    if (/(?:^|\/)(?:story|task)\.[^/]*\.md$/i.test(m[1])) return m[1];
  }
  return null;
}

/**
 * Parse roadmap markdown into a structural model.
 * @param {string} text
 * @returns {object} model: { phases, rows, flows, epicSections, byId, errors, warnings }
 */
export function parseRoadmap(text) {
  const lines = text.split("\n");
  const model = {
    phases: [],          // { index, name, line }
    rows: [],            // see row shape below
    flows: {},           // epicNum -> [ [ids…], … ] (→-separated segments; ‖ within)
    epicSections: {},    // epicNum -> { name, depth, rowIds: [] }
    errors: [],
    warnings: [],
  };

  let phaseIdx = null;
  let excluded = null;                 // { depth } when inside an excluded section
  let epic = null;                     // { num, depth } when inside an Epic section
  const sawPhaseHeading = () => model.phases.length > 0;

  lines.forEach((line, i) => {
    const ln = i + 1;
    const h = line.match(HEADING_RE);
    if (h) {
      const depth = h[1].length;
      const title = h[2].trim();
      if (excluded && depth <= excluded.depth) excluded = null;
      if (epic && depth <= epic.depth) epic = null;

      if (/\bPHASE\b/i.test(title)) {
        model.phases.push({ index: model.phases.length, name: title, line: ln });
        phaseIdx = model.phases.length - 1;
        excluded = null;
        return;
      }
      if (EXCLUDED_HEADING_RE.test(title)) { excluded = { depth }; return; }
      const em = title.match(/\bEpic\s+(\d+)\b/i);
      if (em) {
        epic = { num: em[1], depth };
        if (!model.epicSections[epic.num]) model.epicSections[epic.num] = { name: title, depth, rowIds: [] };
      }
      return;
    }

    // Epic flow line: "**Flow: `17.1 → 17.2 → (17.4 ‖ 17.3-1)`.**"
    const fm = line.match(/^\s*(?:[-*]\s*)?\**Flow\**\s*:?\s*[^`]*`?(.+)$/i);
    if (fm && epic && /→|->/.test(fm[1])) {
      const segments = fm[1].split(/→|->/).map(idTokens).filter(seg => seg.length);
      if (segments.length) model.flows[epic.num] = segments;
      return;
    }

    const rm = line.match(ROW_RE);
    if (!rm) return;
    if (excluded) return; // Deferred/Housekeeping/Change Log rows are never candidates
    const indent = rm[1].length;
    const rest = rm[3];
    const ticked = rm[2].toLowerCase() === "x";

    const idm = undecorate(rest).match(new RegExp(`^(${ID_RE_SRC})\\b`));
    if (!idm) {
      // Annotation / sub-checklist / prose checkbox — not a work item. Skip it,
      // but only note it (as a warning) when it sits in phase scope and is
      // outstanding; a ticked annotation is pure noise.
      if (!ticked && (phaseIdx !== null || !sawPhaseHeading())) {
        model.warnings.push(`line ${ln}: checkbox row has no item id, skipped: "${undecorate(rest).slice(0, 60)}"`);
      }
      return;
    }
    const id = idm[1];

    const deps = [];
    const dm = rest.match(/deps:\s*([^·|]+?)(?=·|\bgate:|\bflag:|$)/i);
    if (dm) {
      for (const seg of dm[1].split(",")) {
        const s = seg.trim();
        // "no deps" markers. `\b` cannot follow a dash (both sides non-word), so
        // the previous `…|-)\b` never matched `deps: —` and it fell through to the
        // "has no item id — ignored" warning: harmless but noisy, and noise in this
        // channel is what hid the dropped `deps: T22`. `(?![\w-])` matches the bare
        // marker while still rejecting "-foo".
        if (!s || /^(?:none|n\/a|[—–-])(?![\w-])/i.test(s)) continue;
        const shipped = /shipped/i.test(s);
        const ids = idTokens(s);
        if (!ids.length) {
          if (!shipped) model.warnings.push(`line ${ln}: dep segment "${s.slice(0, 40)}" on ${id} has no item id — ignored`);
          continue;
        }
        for (const d of ids) deps.push({ id: d, shipped });
      }
    }

    let blockedUntil = [];
    if (/⛔/.test(rest)) {
      const bm = rest.match(/⛔[^·|]*/);
      blockedUntil = idTokens(bm ? bm[0] : "");
      if (!blockedUntil.length) {
        model.warnings.push(`line ${ln}: ⛔ annotation on ${id} names no item ids — treated as blocked`);
        blockedUntil = ["<unparsed>"];
      }
    }

    const cm = rest.match(COMMAND_RE);
    const row = {
      id, line: ln, phase: phaseIdx, indent,
      epic: epic ? epic.num : null,
      ticked,
      skip: SKIP_RE.test(rest),
      manual: /\bmanual\b/i.test(rest),
      gated: /🚧/.test(rest),
      command: cm ? `/${cm[1]}` : null,
      // Path may be inline after the command, or in a [story](…)/[task](…) link.
      commandArg: (cm && cm[2]) || workItemPath(rest),
      deps, blockedUntil,
      raw: rest.trim(),
    };
    model.rows.push(row);
    // A `T`-row is a cross-cutting standalone task that lives in its *consumer*
    // epic's section for readability — it is not a story of that epic, so epic
    // completion must not wait on it (otherwise a task row would strand its host
    // epic). It stays in `byId`/`idInstances`, so deps on it still resolve.
    if (epic && !isTaskId(id)) model.epicSections[epic.num].rowIds.push(id);
    if (sawPhaseHeading() && phaseIdx === null && !ticked) {
      model.warnings.push(`line ${ln}: outstanding row ${id} appears before the first PHASE heading — ignored`);
    }
  });

  if (!sawPhaseHeading()) {
    model.phases.push({ index: 0, name: "(implicit — no PHASE headings)", line: 0 });
    for (const r of model.rows) r.phase = 0;
  }

  index(model);
  lintModel(model);
  return model;
}

function index(model) {
  const byId = new Map();       // id -> first row
  const idInstances = new Map(); // id -> [rows]
  for (const r of model.rows) {
    if (!byId.has(r.id)) byId.set(r.id, r);
    if (!idInstances.has(r.id)) idInstances.set(r.id, []);
    idInstances.get(r.id).push(r);
  }
  model.byId = byId;
  model.idInstances = idInstances;
}

function lintModel(model) {
  // A roadmap that parses to nothing is the one genuinely fatal case.
  if (model.rows.length === 0) {
    model.errors.push("no parseable checkbox rows found — is this a roadmap?");
    return;
  }
  for (const [id, rows] of model.idInstances) {
    if (rows.length < 2) continue;
    const outstanding = rows.filter(r => !r.ticked && !r.skip);
    const msg = `id ${id} appears ${rows.length}× (lines ${rows.map(r => r.line).join(", ")})`;
    // Two live, buildable rows sharing an id is a real ambiguity → error.
    // A recap/summary restating a done id is just noise → warning.
    if (outstanding.length > 1) model.errors.push(`duplicate outstanding ${msg}`);
    else model.warnings.push(`duplicate ${msg} — recap/summary assumed`);
  }
  for (const r of model.rows) {
    for (const d of r.deps) {
      if (!d.shipped && !model.byId.has(d.id) && !model.epicSections[d.id]) {
        model.warnings.push(`line ${r.line}: ${r.id} dep ${d.id} not in the current backlog — assumed shipped/archived`);
        continue;
      }
      // `idDone` treats an all-SKIP id as done, so this dep resolves as satisfied
      // while its target is explicitly deferred. That is intended (a SKIP block must
      // not stall the loop), but it means `r` can be built with `d` unbuilt and
      // nothing else says so — surface it rather than letting it pass mute.
      const targets = model.idInstances.get(d.id);
      if (!d.shipped && targets && targets.length && targets.every(t => t.skip)) {
        model.warnings.push(`line ${r.line}: ${r.id} dep ${d.id} is ⏭️ SKIP — dep treated as satisfied; ${r.id} may build before ${d.id} exists`);
      }
    }
    for (const b of r.blockedUntil) {
      if (b !== "<unparsed>" && !model.byId.has(b)) {
        model.warnings.push(`line ${r.line}: ${r.id} is ⛔ blocked on ${b}, which is not a current row — kept blocked`);
      }
    }
  }
}

/** An id counts as done if any instance is ticked, or exists only as a skip row. */
function idDone(model, id) {
  const rows = model.idInstances.get(id);
  if (!rows) return null; // unknown
  if (rows.some(r => r.ticked)) return true;
  if (rows.every(r => r.skip)) return true;
  return false; // present as an outstanding row → not done
}

function epicActionable(model, epicNum) {
  const section = model.epicSections[epicNum];
  if (!section) return null;
  return section.rowIds
    .map(id => model.byId.get(id))
    .some(r => r && !r.ticked && !r.skip);
}

function depSatisfied(model, dep) {
  if (dep.shipped) return true;
  const done = idDone(model, dep.id);
  if (done !== null) return done;
  const epicOutstanding = epicActionable(model, dep.id); // "deps: Epic 8"
  if (epicOutstanding !== null) return !epicOutstanding;
  return true; // archived out of the backlog → shipped
}

/** Ids from earlier flow segments not yet done, blocking `row`. */
function flowBlockers(model, row) {
  if (!row.epic || !model.flows[row.epic]) return [];
  const segments = model.flows[row.epic];
  const segIdx = segments.findIndex(seg => seg.includes(row.id));
  if (segIdx <= 0) return [];
  const blockers = [];
  for (let s = 0; s < segIdx; s++) {
    for (const fid of segments[s]) {
      if (idDone(model, fid) === false) blockers.push(fid);
    }
  }
  return blockers;
}

/**
 * Run the selection algorithm over a parsed model.
 * @returns {{status: "selected"|"stop"|"halt", ...}}
 */
export function selectNext(model) {
  const lint = { errors: model.errors, warnings: model.warnings };
  if (model.errors.length) {
    return { status: "halt", haltReason: model.errors[0], item: null, skipped: [], lint };
  }

  const skipped = [];
  const phaseNotes = [];
  const isActionable = r => !r.ticked && !r.skip;

  for (const phase of model.phases) {
    const rows = model.rows.filter(r => r.phase === phase.index);
    if (!rows.some(isActionable)) continue;

    const blockingIds = new Set();

    for (const row of rows) {
      if (!isActionable(row)) continue;

      if (row.manual || row.gated) {
        return {
          status: "stop", stopReason: "human-gated", item: pickItem(row, phase),
          detail: `${row.id} is ${row.manual ? "`manual`" : "🚧 gated"} — operator action required; never auto-select, never scan past`,
          skipped, lint,
        };
      }
      if (row.command && /^\/create-/.test(row.command)) {
        return {
          status: "stop", stopReason: "planning-gap", item: pickItem(row, phase),
          detail: `${row.id} needs ${row.command} — authoring is interactive and needs human review; run it attended`,
          skipped, lint,
        };
      }

      const reasons = [];
      const unsatBlocked = row.blockedUntil.filter(b => b === "<unparsed>" || idDone(model, b) !== true);
      if (unsatBlocked.length) { reasons.push(`⛔ blocked until ${unsatBlocked.join(", ")} accepted`); unsatBlocked.forEach(b => blockingIds.add(b)); }
      const fb = flowBlockers(model, row);
      if (fb.length) { reasons.push(`flow-chain: ${fb.join(", ")} not yet accepted`); fb.forEach(b => blockingIds.add(b)); }
      const unsatDeps = row.deps.filter(d => !depSatisfied(model, d));
      if (unsatDeps.length) { reasons.push(`deps unsatisfied: ${unsatDeps.map(d => d.id).join(", ")}`); unsatDeps.forEach(d => blockingIds.add(d.id)); }
      if (reasons.length) { skipped.push({ id: row.id, line: row.line, reason: reasons.join("; ") }); continue; }

      if (!row.command || !/^\/develop-(story|task)$/.test(row.command)) {
        // Eligible but not auto-runnable (e.g. a "run /review-prd" checkpoint).
        // Pause for the operator rather than erroring — the loop is unattended.
        return {
          status: "stop", stopReason: "manual-checkpoint", item: pickItem(row, phase),
          detail: `${row.id} is the next item but names no /develop-story or /develop-task command — operator must action or annotate it`,
          skipped, lint,
        };
      }
      if (!row.commandArg) {
        return {
          status: "stop", stopReason: "manual-checkpoint", item: pickItem(row, phase),
          detail: `${row.id} names ${row.command} but no resolvable story/task path (expected a [story](…)/[task](…) link) — operator must fix the row`,
          skipped, lint,
        };
      }

      return {
        status: "selected", item: pickItem(row, phase),
        rationale: buildRationale(model, row, phase, skipped, phaseNotes),
        skipped, lint,
      };
    }

    // Phase exhausted with actionable-but-blocked rows. Phases are hard
    // boundaries: advance only if every blocker lives in a later phase
    // (a forward dep can't resolve without running the later phase first).
    const nonForward = [...blockingIds].filter(id => {
      const b = model.byId.get(id);
      return !b || b.phase === null || b.phase <= phase.index;
    });
    if (nonForward.length) {
      return {
        status: "stop", stopReason: "phase-blocked", item: null,
        detail: `${phase.name}: no eligible rows; blocked within the phase by ${nonForward.join(", ")} — operator decides (phases are hard boundaries)`,
        skipped, lint,
      };
    }
    phaseNotes.push(`${phase.name}: outstanding rows blocked only by later-phase items (${[...blockingIds].join(", ")}) — advanced past it`);
  }

  return {
    status: "stop", stopReason: "roadmap-complete", item: null,
    detail: "no actionable candidate rows in any phase", skipped, lint,
  };
}

function pickItem(row, phase) {
  return {
    id: row.id, line: row.line, phase: phase.name, epic: row.epic,
    command: row.command, commandArg: row.commandArg, raw: row.raw,
  };
}

function buildRationale(model, row, phase, skipped, phaseNotes) {
  const parts = [`selected ${row.id} in "${phase.name}" (line ${row.line})`];
  parts.push(row.deps.length
    ? `deps satisfied: ${row.deps.map(d => `${d.id}${d.shipped ? " (shipped)" : ""}`).join(", ")}`
    : "no deps");
  if (skipped.length) parts.push(`${skipped.length} earlier row(s) skipped (see skipped[])`);
  if (phaseNotes.length) parts.push(...phaseNotes);
  return parts.join("; ");
}

/**
 * Epic completion check. `assumeTicked` lets the caller treat the item just
 * merged (but not yet ticked on the roadmap) as done, so epic promotion does
 * not depend on write ordering.
 */
export function epicStatus(model, epicNum, assumeTicked = []) {
  const section = model.epicSections[String(epicNum)];
  if (!section) return { found: false, epic: String(epicNum) };
  const assume = new Set(assumeTicked);
  const rows = section.rowIds.map(id => model.byId.get(id)).filter(Boolean);
  const done = r => r.ticked || r.skip || assume.has(r.id);
  const outstanding = rows.filter(r => !done(r)).map(r => r.id);
  return {
    found: true, epic: String(epicNum), name: section.name,
    total: rows.length, ticked: rows.filter(done).length,
    outstanding, complete: rows.length > 0 && outstanding.length === 0,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { roadmap: DEFAULT_ROADMAP, lint: false, epicStatus: null, assumeTicked: [] };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--roadmap": args.roadmap = argv[++i]; break;
      case "--lint": args.lint = true; break;
      case "--epic-status": args.epicStatus = argv[++i]; break;
      case "--assume-ticked": args.assumeTicked.push(argv[++i]); break;
      default: process.stderr.write(`select-next: unknown argument ${argv[i]}\n`); process.exit(1);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let text;
  try {
    text = fs.readFileSync(args.roadmap, "utf-8");
  } catch (e) {
    const missing = e.code === "ENOENT";
    process.stdout.write(JSON.stringify({
      status: "halt",
      missing,
      haltReason: missing
        ? `no roadmap at ${args.roadmap} — the project has no completion roadmap yet`
        : `cannot read roadmap: ${e.message}`,
      roadmap: args.roadmap,
    }, null, 2) + "\n");
    process.exit(1);
  }
  const model = parseRoadmap(text);

  if (args.lint) {
    process.stdout.write(JSON.stringify({ roadmap: args.roadmap, errors: model.errors, warnings: model.warnings }, null, 2) + "\n");
    process.exit(model.errors.length ? 1 : 0);
  }
  if (args.epicStatus !== null) {
    const out = epicStatus(model, args.epicStatus, args.assumeTicked);
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    process.exit(out.found ? 0 : 1);
  }
  const result = { roadmap: args.roadmap, ...selectNext(model) };
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result.status === "halt" ? 1 : 0);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
