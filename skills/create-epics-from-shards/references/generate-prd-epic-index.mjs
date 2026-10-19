#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/generate-prd-epic-index.mjs.
// Regenerate via `npm run bundle`.
//
// Unlike every other shared resource, this file has TWO destinations. The bundler copies
// it to `skills/*/references/`, and `setup-consumer.sh` ALSO vendors it to a consumer's
// `scripts/generate-prd-epic-index.mjs` so their `docs:epic-index` npm script can reach it.
// That second copy lands in `scripts/`, beside the consumer's own tooling, with nothing
// around it to suggest it is not theirs — and `--update` overwrites it silently.
//
// A downstream repo hit exactly that: it fixed a YAML quote-escaping bug here, in its own
// `scripts/`, and lost the fix twice to `--update` before anyone noticed. Nothing failed;
// the fix simply stopped existing. This header travels with the file to both destinations,
// so the next person to open it in a consumer repo is told before they edit rather than after.
/**
 * generate-prd-epic-index.mjs
 *
 * Injects (or regenerates) a marker-delimited "## Epics" index into every sharded
 * sub-PRD under <prd-root>/ — a `prd.{P}.{feature}/` directory at depth 1 or under a
 * domain directory at depth 2 — giving each PRD clickable links down to its child
 * epic files. The reverse link already exists (each epic's `prd_source` frontmatter
 * points back up); this closes the loop between a PRD and its epics.
 *
 * The index is derived from the filesystem, not from `prd_source` (which is sometimes
 * a bare filename): for a PRD dir `<p>/`, the PRD file is `<p>/<p>.md` and each epic
 * is `<p>/epics/<dir>/<dir>.md` (the canonical epic file is the one whose basename
 * equals its directory — this excludes `epic.P.E.review.M.*.md` siblings).
 *
 * Ids are read with doc-id.js, never a regex of this file's own (task 205). An epic is
 * indexed only when its directory parses as `epic.{P}.{E}.{slug}`, `P` is the PRD's
 * number, and its `prd_number` / `epic_number` frontmatter agree with the directory;
 * any other epic directory is skipped and named. The `#` column reads `P.E`, sorted by
 * `E` numerically within the PRD.
 *
 * Idempotent: re-running produces byte-identical output. Safe to run any time an epic
 * is added, renumbered, retitled, or its status changes.
 *
 * PRD root resolution (first match wins):
 *   1. --prd-root <path>              CLI override (skills pass "${PRD_ROOT}")
 *   2. prd.prdShardedLocation         from skills-config.yaml at the repo root
 *   3. docs/prd                       default (the skill convention)
 *
 * Usage:  node scripts/generate-prd-epic-index.mjs [--prd-root <path>] [--check] [--strict]
 *   --prd-root <path>  base directory of the PRD shard tree (overrides config).
 *   --check            exit non-zero if any PRD's index is stale (for CI); writes nothing.
 *   --strict           treat a skipped epic (missing or disagreeing numbers) as a hard
 *                      error (non-zero exit) instead of reporting and skipping it.
 *
 * This file is the single source of truth. It is bundled into consuming skills'
 * `references/` by `npm run bundle`, and vendored into consumer repos at
 * `scripts/generate-prd-epic-index.mjs` by `setup-consumer.sh`. Do not fork the logic.
 *
 * Its doc-id dependency is loaded with createRequire, from `./doc-id.cjs` when present
 * (the consumer's vendored copy — `.cjs` so a `"type": "module"` consumer does not parse
 * the CommonJS engine as ESM) and from `./doc-id.js` otherwise (this repository and a
 * skill's bundled `references/`).
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { join, basename } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const docId = existsSync(new URL("./doc-id.cjs", import.meta.url))
  ? require("./doc-id.cjs")
  : require("./doc-id.js");

const START = "<!-- epics-index-start -->";
const END = "<!-- epics-index-end -->";
const CHECK = process.argv.includes("--check");
const STRICT = process.argv.includes("--strict");

/** Read a `--flag <value>` CLI argument (value must not itself be a flag). */
function argValue(flag) {
  for (let i = 0; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === flag) {
      const v = process.argv[i + 1];
      return v && !v.startsWith("--") ? v : "";
    }
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return "";
}

/**
 * Read `prd.prdShardedLocation` from skills-config.yaml without a YAML dependency.
 * Mirrors the awk fallback in resolve-paths.sh (a shared resource): find the top-level
 * `prd:` block, then the first indented `prdShardedLocation:` within it.
 */
function prdRootFromConfig() {
  const CONFIG = "skills-config.yaml";
  if (!existsSync(CONFIG)) return "";
  let text;
  try {
    text = readFileSync(CONFIG, "utf8");
  } catch {
    return "";
  }
  let inBlock = false;
  for (const line of text.split("\n")) {
    if (/^prd:\s*(#.*)?$/.test(line)) {
      inBlock = true;
      continue;
    }
    if (inBlock && /^\S/.test(line)) inBlock = false;
    if (inBlock) {
      const m = line.match(/^\s+prdShardedLocation:\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^['"]|['"]$/g, "").trim();
    }
  }
  return "";
}

const PRDS_DIR = argValue("--prd-root") || prdRootFromConfig() || "docs/prd";

/** Extract a single frontmatter scalar (order-independent), stripping surrounding quotes. */
function frontmatterField(src, key) {
  const m = src.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
  if (!m) return "";
  return unquote(m[1]);
}

// Strip the matching quote pair and undo YAML's in-string escaping.
//
// Stripping the quotes alone is not enough: a value that contains the quote
// character it is wrapped in must escape it, and that escape then leaks verbatim
// into the generated table. A title written `'Anna''s wallet'` — the only legal
// single-quoted YAML spelling of an apostrophe — renders as `Anna''s wallet`.
//
// The old one-line strip also removed a leading OR trailing quote independently,
// so an unquoted value that merely ends in a quote character lost it.
function unquote(value) {
  const v = value.trim();
  if (v.startsWith("'") && v.endsWith("'") && v.length > 1) {
    return v.slice(1, -1).replace(/''/g, "'").trim();
  }
  if (v.startsWith('"') && v.endsWith('"') && v.length > 1) {
    return v.slice(1, -1).replace(/\\"/g, '"').trim();
  }
  return v;
}

/** Clean an epic title for display: drop a leading id prefix (either form), escape table pipes. */
function cleanTitle(raw) {
  return docId.stripIdPrefix("epic", raw).replace(/\|/g, "\\|").trim();
}

function listDirs(dir) {
  return readdirSync(dir)
    .map((n) => join(dir, n))
    .filter((p) => statSync(p).isDirectory());
}

const isPrdDir = (d) => {
  const p = docId.parse(basename(d));
  return p.ok && p.kind === "prd" && !p.artifact;
};

/**
 * Every PRD directory under the root: `prd.{P}.{feature}/` at depth 1, or under a
 * `{domain}/` directory at depth 2. Discovered by parsing the directory name — a
 * directory that is not a PRD is never treated as one.
 */
function prdDirs(root) {
  const out = [];
  for (const d1 of listDirs(root)) {
    if (isPrdDir(d1)) {
      out.push(d1);
      continue;
    }
    for (const d2 of listDirs(d1)) if (isPrdDir(d2)) out.push(d2);
  }
  return out;
}

function buildBlock(epics) {
  const lines = [
    START,
    "",
    "## Epics",
    "",
    `_Auto-generated index — regenerate with \`node scripts/generate-prd-epic-index.mjs\`._`,
    "",
    "| #   | Epic | Status |",
    "| --- | ---- | ------ |",
    ...epics.map(
      (e) => `| ${e.label} | [${e.title}](${e.link}) | ${e.status || "—"} |`,
    ),
    "",
    END,
  ];
  return lines.join("\n");
}

/** Insert the block after the first H1, else after the frontmatter, else at top. */
function insertBlock(src, block) {
  const h1 = src.match(/^#\s.+$/m);
  if (h1) {
    const idx = src.indexOf(h1[0]) + h1[0].length;
    return src.slice(0, idx) + "\n\n" + block + "\n" + src.slice(idx);
  }
  const fm = src.match(/^---\n[\s\S]*?\n---\n/);
  if (fm)
    return (
      src.slice(0, fm[0].length) +
      "\n" +
      block +
      "\n\n" +
      src.slice(fm[0].length)
    );
  return block + "\n\n" + src;
}

// The whole imperative body lives in main() so that an early exit can be a
// `return` with `process.exitCode` set, never `process.exit()`. Node's stdio
// is ASYNCHRONOUS on a pipe: `process.exit()` tears the process down before
// the buffer drains, truncating output at ~64KB. Top-level `return` is illegal
// in an ES module, so the function wrapper is what makes the correct idiom
// available here at all. See bug.3.stdout-truncation-on-exit.
function main() {
  if (!existsSync(PRDS_DIR)) {
    console.log(`No PRD root at ${PRDS_DIR} — nothing to index.`);
    process.exitCode = 0;
    return;
  }

  let changed = 0;
  let stale = 0;
  const skipped = [];

  for (const prdDir of prdDirs(PRDS_DIR)) {
    const p = basename(prdDir);
    const P = docId.parse(p).prd;
    const prdFile = join(prdDir, `${p}.md`); // dir is already named prd.<P>.<name>, file is <dir>.md
    const epicsDir = join(prdDir, "epics");
    if (!existsSync(prdFile) || !existsSync(epicsDir)) continue;

    const epics = [];
    for (const epicDir of listDirs(epicsDir)) {
      const d = basename(epicDir);
      const epicFile = join(epicDir, `${d}.md`);
      if (!existsSync(epicFile)) continue; // excludes review/QA siblings
      const id = docId.parse(d);
      if (!id.ok || id.kind !== "epic" || id.artifact) {
        skipped.push(`${epicFile} (directory is not epic.{P}.{E}.{slug})`);
        continue;
      }
      if (id.prd !== P) {
        skipped.push(
          `${epicFile} (directory says PRD ${id.prd}, parent is PRD ${P})`,
        );
        continue;
      }
      const fm = readFileSync(epicFile, "utf8");
      const fmPrd = frontmatterField(fm, "prd_number");
      const fmEpic = frontmatterField(fm, "epic_number");
      if (fmPrd !== String(id.prd) || fmEpic !== String(id.epic)) {
        skipped.push(
          `${epicFile} (frontmatter prd_number/epic_number ${fmPrd || "—"}/${fmEpic || "—"} disagrees with directory ${docId.idLabel(id)})`,
        );
        continue;
      }
      epics.push({
        number: id.epic,
        label: docId.idLabel(id),
        title: cleanTitle(frontmatterField(fm, "title")) || d,
        status: frontmatterField(fm, "status"),
        link: `epics/${d}/${d}.md`,
      });
    }
    if (epics.length === 0) continue;
    epics.sort((a, b) => a.number - b.number);

    const block = buildBlock(epics);
    const src = readFileSync(prdFile, "utf8");
    const has = src.includes(START) && src.includes(END);
    // The replacement MUST stay a function. A string replacement is a pattern, so an
    // epic title carrying `$&`, `$\``, `$'` or `$$` would be expanded instead of
    // inserted — `$&` splices the whole matched index block back inside a table cell,
    // and because the regex is lazy each rerun nests another copy. A function argument
    // suppresses all `$` expansion and is otherwise identical. Do not "simplify" it.
    const next = has
      ? src.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => block)
      : insertBlock(src, block);

    if (next === src) continue;
    if (CHECK) {
      stale++;
      console.log(`STALE  ${prdFile}  (${epics.length} epics)`);
      continue;
    }
    writeFileSync(prdFile, next);
    changed++;
    console.log(
      `${has ? "updated" : "added  "}  ${prdFile}  (${epics.length} epics)`,
    );
  }

  if (skipped.length) {
    console.warn(`\n${skipped.length} epic file(s) skipped:`);
    for (const s of skipped) console.warn(`  - ${s}`);
  }

  if (STRICT && skipped.length) {
    console.error(
      `\n${skipped.length} epic file(s) skipped — missing or disagreeing numbers (--strict).`,
    );
    process.exitCode = 2;
    return;
  }

  if (CHECK) {
    console.log(
      stale
        ? `\n${stale} PRD(s) have a stale epics index.`
        : "\nAll epics indexes up to date.",
    );
    process.exitCode = stale ? 1 : 0;
    return;
  }
  console.log(`\nDone: ${changed} PRD(s) updated.`);
}

main();
