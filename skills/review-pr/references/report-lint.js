#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/report-lint.js. Regenerate via `npm run bundle`.
/**
 * report-lint — read a pipeline implementation report back and refuse a structurally
 * broken one before any boundary commits it.
 *
 * task.124, Phase 3 (obs #115). task.117's HALT commit shipped an implementation
 * report that was doubled and spliced mid-line: a second `**Task**:` header block
 * landed inside the Completion section and seven `## ` sections repeated after it.
 * Every writer of the report Edits it; no reader ever read it back, so the corruption
 * was committed, pushed, and only noticed by a human. This is the reader.
 *
 * Pure engine + thin CLI, the shape of `change-log.js` and `registry-tick.js`:
 *
 *   lintReport(text, { sections })  → { ok, variant, problems: [{ code, line, detail }] }
 *   loadTemplate(templatePath?)     → { story: [{ name, optional }], task: […], bug: […] }
 *
 * `sections` — what a report must carry — is NOT restated here. It is read from
 * `implementation-report-template.md`, the one definition, which §0e of the step-0
 * doc also creates reports from. Two definitions of "what sections a report has"
 * drift silently and in the worst direction (docs/reference/anti-patterns.md, the
 * enumeration class); one definition read by both cannot.
 *
 * Fence-aware: headings inside a fenced block are examples, not sections, and a
 * report legitimately carries a fenced `# Implementation Report` in a Decisions Log
 * entry. Fences are found with `change-log.js`'s exported `fencedRanges` — the one
 * fence parser this repository has — never with a second regex.
 *
 * Problem codes (each `problems[]` entry carries one, the 1-based `line`, and a
 * `detail` sentence):
 *
 *   multiple-h1              a second `# ` line outside a fence
 *   section-missing          a required template section is absent
 *   section-duplicated       a template section (required or optional) appears more than once
 *   section-out-of-order     a template section appears before one the template places earlier
 *                            (one per report — the first offending heading)
 *   qa-cycle-duplicated      the same `### QA Cycle N` heading appears more than once
 *   header-block-duplicated  a second `**Task**:` / `**Story**:` header line — the spliced-copy signature
 *   trailing-duplicate-body  after the FIRST occurrence of the template's last section, a template
 *                            section or header block reappears (one per report)
 *   variant-undetected       the report matches no variant: no `**Task**:` / `**Story**:` line and
 *                            no bug-report frontmatter — nothing to lint it against
 *
 * Sections the template does not name are ignored by every check: the PreCompact
 * hook appends `## Pipeline Paused — …` after Completion by design, and a run may
 * add `## Completion Summary`. The linter holds a report to the template's
 * sections, not to the absence of others.
 *
 * CLI:
 *   node report-lint.js --file <report.md> [--template <path>] [--variant story|task|bug] [--json]
 *
 *   reason: ok | problems | usage   (exit 0 | 1 | 2)
 *
 * The linter never repairs. A `problems` result is a HALT for the caller with nothing
 * committed; a human repairs the report (Out of scope, task.124 §4).
 */
"use strict";
// The template is loaded at runtime by basename beside this file; the declaration below is what
// makes the bundler carry it into every skill that bundles the linter.
// bundle-dependency: shared/resources/implementation-report-template.md

const fs = require("fs");
const path = require("path");
const { fencedRanges } = require("./change-log.js");

const VARIANTS = Object.freeze(["story", "task", "bug"]);
const DEFAULT_TEMPLATE = path.join(
  __dirname,
  "implementation-report-template.md",
);

// ── Template ──────────────────────────────────────────────────────────────────

/**
 * Parse the template file into per-variant section lists.
 *
 * Each `## <Name> variant` heading (outside a fence) is followed by exactly one fenced
 * block; the `## ` lines INSIDE that fence are the variant's sections, in order. A
 * `<!-- optional -->` marker on the heading line makes the section optional. The
 * variant name is the heading's first word, lower-cased.
 */
function parseTemplate(text) {
  const fences = fencedRanges(text);
  const inFence = (offset) =>
    fences.some(([a, b]) => offset >= a && offset < b);
  const lines = text.split("\n");
  const out = {};
  let offset = 0;
  let current = null; // variant name whose fence we are waiting for / inside
  let insideVariantFence = false;
  for (const line of lines) {
    const lineStart = offset;
    offset += line.length + 1;
    const fenced = inFence(lineStart);
    if (!fenced) {
      const m = /^## (\w+) variant\b/i.exec(line);
      if (m) {
        current = m[1].toLowerCase();
        out[current] = out[current] || [];
        insideVariantFence = false;
      }
      continue;
    }
    if (!current) continue;
    // The fence's own opening line is inside the range; skip fence markers.
    if (/^ {0,3}(`{3,}|~{3,})/.test(line)) {
      insideVariantFence = !insideVariantFence;
      continue;
    }
    const h = /^## (.+?)\s*$/.exec(line);
    if (!h) continue;
    const optional = /<!--\s*optional\s*-->/i.test(h[1]);
    const name = h[1].replace(/<!--\s*optional\s*-->/i, "").trim();
    out[current].push({ name, optional });
  }
  return out;
}

function loadTemplate(templatePath = DEFAULT_TEMPLATE) {
  const text = fs.readFileSync(templatePath, "utf8");
  const sections = parseTemplate(text);
  for (const v of ["story", "task"]) {
    if (!sections[v] || sections[v].length === 0) {
      throw new Error(
        `report-lint: template at ${templatePath} defines no sections for the ${v} variant`,
      );
    }
  }
  return sections;
}

// ── Engine ────────────────────────────────────────────────────────────────────

function detectVariant(lines, isFencedLine) {
  // The header block wins: `**Story**:` / `**Task**:` is what §0e writes and what the
  // spliced-copy check keys on. Frontmatter hints come second — a story report that
  // predates the header block carries `story-ref:`, and a develop-bug report carries
  // `bug:` and `**Fix Iterations:**`. `type: implementation-report` alone decides
  // nothing: every variant may carry it.
  let hint = null;
  for (let i = 0; i < lines.length; i++) {
    if (isFencedLine(i)) continue;
    const l = lines[i];
    if (/^\*\*Story\*\*:/.test(l)) return "story";
    if (/^\*\*Task\*\*:/.test(l)) return "task";
    if (!hint && /^story-ref:/.test(l)) hint = "story";
    if (!hint && /^task-ref:/.test(l)) hint = "task";
    if (!hint && (/^bug:\s*\S/.test(l) || /^\*\*Fix Iterations:\*\*/.test(l)))
      hint = "bug";
  }
  return hint;
}

/**
 * lintReport(text, { sections, variant }) → { ok, variant, problems }
 *
 * `sections` is the object `loadTemplate` returns. `variant` forces one; otherwise it
 * is detected from the report's own header. Pure: no I/O, no process.exit.
 */
function lintReport(text, opts = {}) {
  const sections = opts.sections;
  if (!sections || typeof sections !== "object") {
    throw new TypeError(
      "lintReport: opts.sections is required — pass the result of loadTemplate()",
    );
  }
  const problems = [];
  const fences = fencedRanges(text);
  const lines = text.split("\n");
  const starts = [];
  let off = 0;
  for (const l of lines) {
    starts.push(off);
    off += l.length + 1;
  }
  const isFencedLine = (i) =>
    fences.some(([a, b]) => starts[i] >= a && starts[i] < b);

  const variant = opts.variant || detectVariant(lines, isFencedLine);
  if (!variant || !sections[variant]) {
    problems.push({
      code: "variant-undetected",
      line: 1,
      detail: variant
        ? `variant '${variant}' has no section list in the template`
        : "no `**Task**:` / `**Story**:` header line and no bug-report frontmatter — cannot pick a template variant",
    });
    return { ok: false, variant: variant || null, problems };
  }
  const spec = sections[variant];
  const order = new Map(spec.map((s, i) => [s.name, i]));
  const lastName = spec[spec.length - 1].name;

  // One pass over the unfenced lines.
  let h1Count = 0;
  let headerBlocks = 0;
  const seen = new Map(); // section name → [line numbers]
  const qaCycles = new Map(); // cycle number → [line numbers]
  let maxIdx = -1;
  let outOfOrderReported = false;
  let lastSectionFirstLine = null;
  let trailingReported = false;
  const headerRe =
    variant === "bug" ? /^\*\*Started:\*\*/ : /^\*\*(Task|Story)\*\*:/;

  for (let i = 0; i < lines.length; i++) {
    if (isFencedLine(i)) continue;
    const l = lines[i];
    const ln = i + 1;

    if (/^# /.test(l)) {
      h1Count += 1;
      if (h1Count > 1)
        problems.push({
          code: "multiple-h1",
          line: ln,
          detail: `second H1: ${l.trim()}`,
        });
      continue;
    }
    if (headerRe.test(l)) {
      headerBlocks += 1;
      if (headerBlocks > 1) {
        problems.push({
          code: "header-block-duplicated",
          line: ln,
          detail: `second header block: ${l.trim()}`,
        });
        if (lastSectionFirstLine !== null && !trailingReported) {
          problems.push({
            code: "trailing-duplicate-body",
            line: ln,
            detail: `a header block reappears after \`## ${lastName}\` (line ${lastSectionFirstLine})`,
          });
          trailingReported = true;
        }
      }
      continue;
    }
    const qa = /^### QA Cycle (\d+)\b/.exec(l);
    if (qa) {
      const n = qa[1];
      const prev = qaCycles.get(n) || [];
      prev.push(ln);
      qaCycles.set(n, prev);
      if (prev.length > 1)
        problems.push({
          code: "qa-cycle-duplicated",
          line: ln,
          detail: `### QA Cycle ${n} already appeared at line ${prev[0]}`,
        });
      continue;
    }
    const h2 = /^## (.+?)\s*$/.exec(l);
    if (!h2) continue;
    const name = h2[1].trim();
    if (!order.has(name)) continue; // not a template section — ignored by every check
    const idx = order.get(name);
    const prev = seen.get(name) || [];
    prev.push(ln);
    seen.set(name, prev);
    if (prev.length > 1) {
      problems.push({
        code: "section-duplicated",
        line: ln,
        detail: `\`## ${name}\` already appeared at line ${prev[0]}`,
      });
    }
    if (idx < maxIdx && !outOfOrderReported) {
      const before = spec[maxIdx].name;
      problems.push({
        code: "section-out-of-order",
        line: ln,
        detail: `\`## ${name}\` appears after \`## ${before}\`, which the template places later`,
      });
      outOfOrderReported = true;
    }
    if (idx > maxIdx) maxIdx = idx;
    if (name === lastName && lastSectionFirstLine === null)
      lastSectionFirstLine = ln;
    else if (
      lastSectionFirstLine !== null &&
      ln > lastSectionFirstLine &&
      !trailingReported
    ) {
      problems.push({
        code: "trailing-duplicate-body",
        line: ln,
        detail: `\`## ${name}\` reappears after \`## ${lastName}\` (line ${lastSectionFirstLine})`,
      });
      trailingReported = true;
    }
  }

  for (const s of spec) {
    if (!s.optional && !seen.has(s.name)) {
      problems.push({
        code: "section-missing",
        line: 0,
        detail: `required section \`## ${s.name}\` not found`,
      });
    }
  }

  problems.sort((a, b) => a.line - b.line);
  return { ok: problems.length === 0, variant, problems };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function usage(msg) {
  process.stderr.write(
    `report-lint: ${msg}\n\nUsage:\n  node report-lint.js --file <report.md> [--template <path>] [--variant story|task|bug] [--json]\n`,
  );
  process.exitCode = 2;
}

function parseArgs(argv) {
  const out = { file: null, template: null, variant: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const takes = (k) => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--"))
        return usage(`${k} needs a value`) || null;
      i += 1;
      return v;
    };
    if (a === "--file") out.file = takes("--file");
    else if (a === "--template") out.template = takes("--template");
    else if (a === "--variant") out.variant = takes("--variant");
    else if (a === "--json") out.json = true;
    else return usage(`unknown argument '${a}'`) || null;
    if (process.exitCode === 2) return null;
  }
  return out;
}

function emit(payload, json) {
  if (json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else {
    process.stdout.write(`${payload.reason}: ${payload.message}\n`);
    for (const p of payload.problems || [])
      process.stdout.write(`  ${p.code} (line ${p.line}): ${p.detail}\n`);
  }
  process.exitCode = payload.exitCode;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args) return;
  if (!args.file) return usage("--file is required");
  if (args.variant && !VARIANTS.includes(args.variant))
    return usage(`--variant must be one of ${VARIANTS.join("|")}`);
  let text;
  try {
    text = fs.readFileSync(args.file, "utf8");
  } catch (e) {
    return usage(`cannot read ${args.file}: ${e.message}`);
  }
  let sections;
  try {
    sections = loadTemplate(args.template || DEFAULT_TEMPLATE);
  } catch (e) {
    return usage(e.message);
  }
  const r = lintReport(text, { sections, variant: args.variant });
  if (r.ok) {
    emit(
      {
        reason: "ok",
        exitCode: 0,
        file: args.file,
        variant: r.variant,
        problems: [],
        message: `${args.file} is well-formed (${r.variant} variant)`,
      },
      args.json,
    );
  } else {
    emit(
      {
        reason: "problems",
        exitCode: 1,
        file: args.file,
        variant: r.variant,
        problems: r.problems,
        message: `${args.file} has ${r.problems.length} structural problem(s) — repair by hand; the linter never edits`,
      },
      args.json,
    );
  }
}

module.exports = {
  lintReport,
  loadTemplate,
  parseTemplate,
  VARIANTS,
  DEFAULT_TEMPLATE,
};

if (require.main === module) main(process.argv.slice(2));
