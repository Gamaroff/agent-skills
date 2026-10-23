#!/usr/bin/env node
/**
 * migrate-doc-numbering.mjs — move PRDs, epics and stories from the flat names
 * (`prd.{feature}`, `epic.{E}`, `story.{E}.{S}`) to the hierarchical scheme
 * (`prd.{P}`, `epic.{P}.{E}`, `story.{P}.{E}.{S}`) — task 203.
 *
 * Every identifier is read and written through doc-id.js (parse / parseLegacy /
 * format). This module defines no id regex of its own; a test fails if one appears.
 *
 * The run has four stages, and nothing is written until all have passed:
 *   1. discover — walk PRD_ROOT and classify every PRD (L1 own-dir, L2 file in its
 *      domain dir, L3 index or monolith), epic, story and artifact.
 *   2. plan     — the rename map (file and directory), the numbers, and every text
 *      edit: frontmatter fields, live relative links (repo-wide), exact repo-relative
 *      path literals (outside history, example-copy bodies and test fixtures) and
 *      whole old stems / basenames inside the tree.
 *   3. verify   — the blockers, all collected (one run reports every one).
 *   4. apply    — only with --apply: moves (`git mv` for a tracked file, a rename
 *      otherwise), empty old directories removed, the edited text written, the PRD
 *      registry and the epic-registry pointer written, then `checkCorpus`.
 *
 * Rules worth knowing before changing anything here:
 *   - LOCATION DECIDES THE PARENT. An epic belongs to the PRD document that owns its
 *     `epics/` directory. `prd_source` is rewritten, never used to place an epic.
 *   - DEAD LINKS STAY BYTE-IDENTICAL. Only a link that resolves today is re-pointed;
 *     one that would start resolving after the move is reported as `wouldHeal`.
 *   - A NAME PRECEDED BY `/` IS A PATH, NOT A NAME. The tree mentions example copies
 *     that share a basename with the documents (`examples/prd-example/prd.onboarding.md`),
 *     so the stem/basename pass skips any occurrence inside a slash path; paths are
 *     the literal pass's job, which maps whole repo-relative paths.
 *   - NOTHING TO MOVE IS `already` ONLY WHEN THE CORPUS IS CLEAN. A tree with no
 *     legacy name left but corpus findings (a crashed apply) answers
 *     `post-check-failed`, never `already`.
 *
 * CLI (exit codes: 0 = ok family, 1 = a guard tripped, 2 = usage — the contract of
 * tracker-comment.js and its peers):
 *   node migrate-doc-numbering.mjs [--apply | --check] [--json] [--root <dir>]
 *                                  [--prd <path-to-prd-doc>]...
 *                                  [--name <path>=[<domain>/]<slug>]... [--allow-in-flight]
 *     --name names a PRD the plan cannot name, and with `<domain>/` places it under that
 *     domain directory — required for a PRD that would land directly under the root.
 *     --prd (repeatable) migrates only the named PRDs, their epics, stories and artifacts,
 *     so a large legacy tree can move one PRD at a time. The link and literal rewrite stays
 *     repo-wide but covers only the paths that move; every blocker considers only the moved
 *     set; the post-check counts findings under the migrated PRDs plus any duplicate-id, so
 *     legacy documents left for a later run are not findings. The epic registry keeps the
 *     rows of epics still legacy, moves the migrated ones to a "Migrated epics" table, and
 *     is retired only by the run that moves the last legacy epic. A --prd value that names
 *     no PRD document under the root is usage. Without --prd the whole tree is migrated.
 *     dry-run           0  the plan was printed; nothing was written (the default)
 *     ok                0  --apply wrote everything and checkCorpus is clean
 *     already           0  nothing to migrate and checkCorpus is clean
 *     needs-migration   1  --check found documents still to migrate
 *     blocked           1  at least one blocker; nothing was written
 *     post-check-failed 1  checkCorpus is not clean (after --apply, or with nothing
 *                          left to move); the payload carries the revert command
 *     usage             2  a bad flag, --apply with --check, no git repository, or
 *                          a PRD root that does not exist
 *
 * Blocker codes: prd-less-epic, unplaced-prd, in-flight, target-exists, dirty-path
 * (any tracked path the run would change, not only a move source), id-collision (two
 * documents that would carry one id), link-would-break, registry-behind,
 * registry-missing, unclosed-frontmatter (a document whose opening --- never closes,
 * so its number cannot be written), displaced-frontmatter (a BOM or blank lines before
 * an opening --- that closes over YAML), stale-reference (a path, in any in-scope text
 * file but a frozen example copy, to a
 * moved file outside the PRD root that neither the link pass nor the literal pass
 * rewrites), needs-domain (a PRD that would move to directly under the root — a layout
 * create-prd refuses; name a legacy PRD's domain with --name <path>=<domain>/<slug>,
 * move a numbered one by hand) — plus two that doc-id.js can
 * answer and this module passes through rather than guessing past: registry-invalid
 * (a registry with no usable counter), registry-unwritable (appendPrdRow refused a
 * row: no PRD table header it recognises, a duplicate, a malformed cell) and bad-slug
 * (a legacy slug that no hierarchical name can carry, such as one starting with a
 * digit, or a --name domain that is not a lowercase kebab-case segment). Every one of them is raised by the dry run and by --check, before --apply
 * writes anything.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const docId = require("./doc-id.js");
const { extractRelativeLinks } = require("./doc-links.js");

const P = path.posix;

export const BLOCKER_CODES = Object.freeze([
  "prd-less-epic",
  "unplaced-prd",
  "in-flight",
  "target-exists",
  "dirty-path",
  "link-would-break",
  "registry-behind",
  "registry-missing",
  "registry-invalid",
  "registry-unwritable",
  "id-collision",
  "bad-slug",
  "unclosed-frontmatter",
  "displaced-frontmatter",
  "needs-domain",
  "stale-reference",
]);

const TERMINAL_STATUSES = Object.freeze(["accepted", "cancelled"]);
const EPIC_REGISTRY = "docs/development/epic-registry.md";
const HISTORY_PREFIXES = Object.freeze([
  "docs/tasks/",
  "docs/bugs/",
  ".agents/",
]);
const HISTORY_FILES = Object.freeze(["CHANGELOG.md"]);
// A test file holds fixtures, which move with the parser change in task 206 — except
// this one, whose KNOWN_ARTIFACT_* keys are live repo paths the ratchet looks up.
// Spelled as segments: a shared-resources path literal inside a shared script is a bundling
// instruction, and this one is a repo path the run compares against, not a dependency —
// as a literal it vendored the test and its whole closure into every skill that bundles
// this script (task 204).
const TEST_FILE_EXCEPTIONS = Object.freeze([
  ["shared", "resources", "tests", "doc-links.test.mjs"].join("/"),
]);
const LITERAL_EXTS = Object.freeze([
  ".md",
  ".yml",
  ".yaml",
  ".js",
  ".mjs",
  ".cjs",
]);
const EXAMPLE_FRONTMATTER_KEYS = Object.freeze(["prd_source", "source_path"]);
// Types the stale-reference scan never reads: no path in them is a reference it could name.
const BINARY_EXTS = Object.freeze([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".tgz",
  ".tar",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp4",
  ".mov",
  ".mp3",
  ".wasm",
]);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const isUnder = (p, dir) => p === dir || p.startsWith(`${dir}/`);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const stemOf = (base) => base.replace(/\.(?:md|ya?ml|json|sh)$/, "");

function blocker(code, file, detail) {
  return Object.freeze({ code, path: file, detail });
}

function isHistory(rel) {
  return (
    HISTORY_FILES.includes(rel) ||
    HISTORY_PREFIXES.some((pre) => rel.startsWith(pre))
  );
}

function isTestFixture(rel) {
  if (TEST_FILE_EXCEPTIONS.includes(rel)) return false;
  const segs = rel.split("/");
  return (
    rel.startsWith("evals/") ||
    segs.includes("tests") ||
    /\.test\.[cm]?[jt]s$/.test(rel)
  );
}

const isExampleCopy = (rel) => rel.startsWith("examples/");
const isBundledCopy = (rel) => /^skills\/[^/]+\/references\//.test(rel);
// Which files the stale-reference scan judges: what the run may rewrite, less the frozen
// example copies, which the literal pass rewrites only through their frontmatter. One
// predicate for both scan loops (task.211 QA cycle 3, CR-3).
const scansForStale = (rel) => inRewriteScope(rel) && !isExampleCopy(rel);
// Whether the literal pass reads `rel`, by its exact extension. Both scan loops ask this one
// question, so each tracked file falls into exactly one of them (task.211 QA cycle 4, CR-1).
const isLiteralType = (rel) => LITERAL_EXTS.includes(P.extname(rel));

/**
 * Whether the literal pass may rewrite `rel`: not history, a test fixture, a bundled copy or a
 * dependency. Exported so a caller judges the same files the run rewrites.
 */
export function inRewriteScope(rel) {
  return (
    !isHistory(rel) &&
    !isTestFixture(rel) &&
    !isBundledCopy(rel) &&
    !rel.startsWith("node_modules/")
  );
}

/** Classify a basename under either scheme, through doc-id only. */
function classify(base) {
  const p = docId.parse(base);
  if (p.ok) return { scheme: "new", ...p };
  const l = docId.parseLegacy(base);
  if (l.ok) return { scheme: "legacy", ...l };
  return null;
}

/** The short id of a legacy document (`story.1.2`, `epic.3`), built from its parts. */
function legacyShortId(c) {
  if (c.kind === "epic") return `epic.${c.epic}`;
  if (c.kind === "story") return `story.${c.epic}.${c.story}${c.sub || ""}`;
  return null; // a legacy PRD has no short id: its artifacts carry the full stem
}

/** Rename a basename by its document's old full stem, then its old short id. */
function renameBase(base, rule) {
  if (!rule || rule.oldStem === rule.newStem) return base;
  if (base.startsWith(`${rule.oldStem}.`))
    return rule.newStem + base.slice(rule.oldStem.length);
  if (rule.oldShort && base.startsWith(`${rule.oldShort}.`))
    return rule.newShort + base.slice(rule.oldShort.length);
  return base;
}

// ---------------------------------------------------------------------------
// Real I/O — everything repo-relative (POSIX), rooted at the repository
// ---------------------------------------------------------------------------

function git(args, cwd) {
  return spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
}

/**
 * A --name value: `<slug>` or `<domain>/<slug>`, each a segment create-prd accepts (the
 * docId.format slug rule). Both become path segments under the PRD root, so this is the
 * containment check for a caller-supplied name: `..`, an absolute path, an encoded, empty
 * or upper-case part, a NUL or a third segment answer null (task.211 QA cycle 1, QA-2).
 * The one definition — parseArgs and discover both call it. Pure.
 * @returns {{slug: string, domain: string|null} | null}
 */
export function parseNameValue(value) {
  if (typeof value !== "string") return null;
  const parts = value.split("/");
  if (parts.length > 2) return null;
  const segment = (x) => {
    try {
      docId.format({ kind: "prd", prd: 1, slug: x });
      return true;
    } catch {
      return false;
    }
  };
  if (!parts.every(segment)) return null;
  return parts.length === 2
    ? { slug: parts[1], domain: parts[0] }
    : { slug: parts[0], domain: null };
}

export function realIo(repoRoot) {
  const abs = (rel) => path.join(repoRoot, rel);
  let trackedCache = null;
  return {
    repoRoot,
    readFile(rel) {
      try {
        return fs.readFileSync(abs(rel), "utf8");
      } catch {
        return null;
      }
    },
    readDir(rel) {
      try {
        return fs
          .readdirSync(abs(rel), { withFileTypes: true })
          .map((d) => ({ name: d.name, dir: d.isDirectory() }));
      } catch {
        return null;
      }
    },
    exists: (rel) => fs.existsSync(abs(rel)),
    tracked() {
      if (trackedCache) return trackedCache;
      const r = git(["ls-files", "-z", "--full-name"], repoRoot);
      if (r.status !== 0) throw new Error(`git ls-files failed: ${r.stderr}`);
      trackedCache = r.stdout.split("\0").filter(Boolean);
      return trackedCache;
    },
    /** Of `paths`, the tracked ones with uncommitted changes (untracked excluded). */
    dirty(paths) {
      const list = Array.isArray(paths) ? paths : [paths];
      if (!list.length) return new Set();
      const r = git(
        [
          "--literal-pathspecs",
          "status",
          "--porcelain=v1",
          "-z",
          "--untracked-files=no",
          "--",
          ...list,
        ],
        repoRoot,
      );
      if (r.status !== 0) throw new Error(`git status failed: ${r.stderr}`);
      const out = new Set();
      const parts = r.stdout.split("\0");
      for (let i = 0; i < parts.length; i++) {
        const e = parts[i];
        if (e.length < 4) continue;
        out.add(e.slice(3));
        if (e[0] === "R" || e[0] === "C") out.add(parts[++i]); // the source path
      }
      return out;
    },
    mkdirp: (rel) => fs.mkdirSync(abs(rel), { recursive: true }),
    move(from, to, { tracked }) {
      if (tracked) {
        const r = git(["mv", "--", from, to], repoRoot);
        if (r.status !== 0)
          throw new Error(`git mv ${from} ${to} failed: ${r.stderr}`);
      } else fs.renameSync(abs(from), abs(to));
    },
    rmdirIfEmpty(rel) {
      try {
        fs.rmdirSync(abs(rel));
        return true;
      } catch {
        return false;
      }
    },
    writeFile: (rel, text) => fs.writeFileSync(abs(rel), text),
  };
}

// ---------------------------------------------------------------------------
// 1. Discover
// ---------------------------------------------------------------------------

/**
 * Walk `root` once and classify what is there.
 * @param {string} root repo-relative PRD root
 * @param {object} io   { readDir, readFile, exists }
 * @param {object} [opts] { names: Map<docPath, "<slug>" | "<domain>/<slug>"> } — the --name answers
 * @returns {{ root, files, dirs, prds, epics, stories, unreadable }}
 */
export function discover(root, io, opts = {}) {
  const given = opts.names || new Map();
  // A --name value through its one validator. parseArgs refuses a bad one as usage; a
  // library caller passing names directly gets bad-slug from plan() instead (badName).
  const nameOf = (f) => {
    const v = given.get(f);
    if (!v) return { slug: null, domain: null, bad: null };
    const n = parseNameValue(v);
    return n ? { ...n, bad: null } : { slug: null, domain: null, bad: v };
  };
  const files = [];
  const dirs = [];
  const unreadable = [];
  const walk = (dir) => {
    const ents = io.readDir(dir);
    if (ents === null) {
      unreadable.push(dir);
      return;
    }
    dirs.push(dir);
    for (const e of ents) {
      const full = P.join(dir, e.name);
      if (e.dir) walk(full);
      else files.push(full);
    }
  };
  walk(root);
  files.sort();
  dirs.sort();
  const fileSet = new Set(files);

  // PRDs ------------------------------------------------------------------
  const prds = [];
  for (const f of files) {
    if (!f.endsWith(".md")) continue;
    const base = P.basename(f);
    const dir = P.dirname(f);
    const c = classify(base);
    let shape = null;
    if (c && c.kind === "prd" && !c.artifact) {
      shape = P.basename(dir) === stemOf(base) ? "L1" : "L2";
    } else if (f === P.join(root, "index.md")) {
      shape = "L3";
    } else continue;
    prds.push({
      doc: f,
      dir,
      shape,
      legacy: c ? c.scheme === "legacy" : true,
      number: c && c.scheme === "new" ? c.prd : null,
      slug: nameOf(f).slug || (c ? c.slug : null),
      namedDomain: nameOf(f).domain,
      badName: nameOf(f).bad,
      oldStem: stemOf(base),
      epicsDir: P.join(dir, "epics"),
    });
  }
  // L3 monolith: `prd.md` beside the PRD root.
  const mono = P.join(P.dirname(root), "prd.md");
  if (root !== "." && io.exists(mono) && io.readFile(mono) !== null) {
    prds.push({
      doc: mono,
      dir: P.dirname(mono),
      shape: "L3",
      legacy: true,
      number: null,
      slug: nameOf(mono).slug,
      namedDomain: nameOf(mono).domain,
      badName: nameOf(mono).bad,
      oldStem: "prd",
      epicsDir: null,
    });
  }
  // L1 documents own their directory, so a nested index.md or a shard is not a PRD.
  const ownerOfEpics = new Map(
    prds.filter((p) => p.epicsDir).map((p) => [p.epicsDir, p]),
  );

  // Epics and stories -------------------------------------------------------
  const epics = [];
  const stories = [];
  for (const d of dirs) {
    if (P.basename(P.dirname(d)) !== "epics") continue;
    const c = classify(P.basename(d));
    if (!c || c.kind !== "epic" || c.artifact) continue;
    const epicsDir = P.dirname(d);
    const doc = P.join(d, `${P.basename(d)}.md`);
    const epic = {
      dir: d,
      doc: fileSet.has(doc) ? doc : null,
      legacy: c.scheme === "legacy",
      oldNumber: c.epic,
      prd: c.scheme === "new" ? c.prd : null,
      slug: c.slug,
      oldStem: P.basename(d),
      oldShort: c.scheme === "legacy" ? legacyShortId(c) : c.id,
      owner: ownerOfEpics.get(epicsDir) || null,
    };
    epics.push(epic);
    for (const sd of dirs) {
      if (P.dirname(sd) !== P.join(d, "stories")) continue;
      const s = classify(P.basename(sd));
      if (!s || s.kind !== "story" || s.artifact) continue;
      const sdoc = P.join(sd, `${P.basename(sd)}.md`);
      stories.push({
        dir: sd,
        doc: fileSet.has(sdoc) ? sdoc : null,
        legacy: s.scheme === "legacy",
        story: s.story,
        sub: s.sub,
        slug: s.slug,
        oldStem: P.basename(sd),
        oldShort: s.scheme === "legacy" ? legacyShortId(s) : s.id,
        epic,
      });
    }
  }
  return { root, files, dirs, prds, epics, stories, unreadable };
}

// ---------------------------------------------------------------------------
// 2. Plan — numbers and the rename map
// ---------------------------------------------------------------------------

/**
 * Number everything and build the rename map.
 * @param {object} disc  discover()'s result
 * @param {string|null} registryText the PRD registry, or null when absent
 * @param {object} io    { readFile, exists }
 * @returns {object} { prds, epics, stories, fileMap, dirMap, docRules, mapping,
 *   blockers, registryText, newPrds }
 */
export function plan(disc, registryText, io, opts = {}) {
  const blockers = [];
  const root = disc.root;
  // --prd: only the named PRDs (and so only their epics and stories) are planned. Every
  // numbered PRD still feeds the P counter, so a scoped run never reuses a number.
  const scope = opts.scope || null;
  const inScope = (p) => !scope || scope.has(p.doc);

  // PRD numbers: a numbered PRD keeps P; the rest take the counter in path order.
  const numbered = disc.prds.filter((p) => !p.legacy);
  const legacy = disc.prds
    .filter((p) => p.legacy && inScope(p))
    .sort((a, b) => a.doc.localeCompare(b.doc));
  let nextP = null;
  if (legacy.length) {
    if (registryText === null) {
      if (numbered.length) {
        blockers.push(
          blocker(
            "registry-missing",
            P.join(root, "prd-registry.md"),
            `no PRD registry, but ${numbered.map((p) => p.doc).join(", ")} already carries a number — rows are never invented`,
          ),
        );
      } else nextP = 1; // the bootstrap: an empty registry starts at 1
    } else {
      const r = docId.next(
        "prd",
        numbered.map((p) => p.oldStem),
        registryText,
      );
      if (r.ok) nextP = r.next;
      else
        blockers.push(
          blocker(
            r.reason,
            P.join(root, "prd-registry.md"),
            `the PRD registry answered ${r.reason}`,
          ),
        );
    }
  }
  const prdPlans = [];
  for (const p of [...numbered.filter(inScope), ...legacy]) {
    let n = p.number;
    if (p.badName) {
      blockers.push(
        blocker(
          "bad-slug",
          p.doc,
          `--name value "${p.badName}" is not <slug> or <domain>/<slug>, each a lowercase kebab-case segment starting with a letter`,
        ),
      );
      continue;
    }
    if (!p.legacy && p.namedDomain) {
      blockers.push(
        blocker(
          "bad-slug",
          p.doc,
          `--name gives domain "${p.namedDomain}" for a PRD that is already numbered, and a numbered PRD keeps its place — pass --name ${p.doc}=<slug>`,
        ),
      );
      continue;
    }
    if (p.legacy) {
      if (!p.slug) {
        blockers.push(
          blocker(
            "unplaced-prd",
            p.doc,
            `${p.shape} PRD has no feature slug — pass --name ${p.doc}=<slug>, or =<domain>/<slug> to name its domain too`,
          ),
        );
        continue;
      }
      if (nextP === null) continue; // blocked above
      n = nextP++;
    }
    let newStem;
    try {
      newStem = docId.format({ kind: "prd", prd: n, slug: p.slug });
    } catch {
      blockers.push(
        blocker(
          "bad-slug",
          p.doc,
          `"${p.slug}" cannot form a PRD name — pass --name ${p.doc}=<slug>`,
        ),
      );
      continue;
    }
    // Where the PRD's directory goes. A named domain wins — parseNameValue validated it with
    // the call create-prd's blocks use, so the result is a layout create-prd accepts (task.211).
    // Only a legacy PRD reaches here with one: a numbered PRD keeps its place, or its registry
    // row's Folder is left behind, and is refused above (task.211 QA cycle 1, CR-3).
    let newDir;
    let domain;
    if (p.namedDomain) {
      domain = p.namedDomain;
      newDir = P.join(root, domain, newStem);
    } else if (p.shape === "L1") {
      newDir = P.join(P.dirname(p.dir), newStem);
      domain = P.relative(root, P.dirname(p.dir)) || ".";
    } else if (p.shape === "L2") {
      newDir = P.join(p.dir, newStem);
      domain = P.relative(root, p.dir) || ".";
    } else if (p.doc === P.join(root, "index.md")) {
      newDir = P.join(root, newStem);
      domain = ".";
    } else {
      newDir = P.join(root, p.slug, newStem);
      domain = p.slug;
    }
    // A PRD directly under the root is a layout create-prd refuses ({domain}/prd.{P}.{f}/),
    // so one that moves there needs a domain — whether or not it is numbered: a numbered L2
    // PRD at the root moves too (task.211 QA cycle 2, CR-2). A numbered PRD that stays where
    // it is is not blocked. A numbered one cannot take --name's domain, because its registry
    // row's Folder is not rewritten, so its remedy is a hand move.
    if (domain === "." && (p.legacy || newDir !== P.dirname(p.doc))) {
      blockers.push(
        blocker(
          "needs-domain",
          p.doc,
          p.legacy
            ? `${p.shape} PRD would land directly under ${root}, outside a domain directory — pass --name ${p.doc}=<domain>/<slug>`
            : `numbered ${p.shape} PRD would move to ${newDir}, directly under ${root} and outside a domain directory — move it into ${root}/<domain>/ by hand, set its registry row's Folder to <domain>, and plan again`,
        ),
      );
      continue;
    }
    prdPlans.push({ ...p, n, newStem, newDir, domain });
  }
  const prdByEpicsDir = new Map(prdPlans.map((p) => [p.epicsDir, p]));

  // Epic numbers, per PRD.
  const epicPlans = [];
  const epicsByPrd = new Map();
  for (const e of disc.epics) {
    const owner = e.owner ? prdByEpicsDir.get(e.owner.epicsDir) : null;
    if (!e.owner) {
      // A PRD-less epic is outside every --prd scope, so it blocks only a whole-tree run.
      if (e.legacy && !scope)
        blockers.push(
          blocker(
            "prd-less-epic",
            e.doc || e.dir,
            `${P.dirname(e.dir)} is owned by no PRD document — location decides the parent, whatever prd_source says`,
          ),
        );
      continue;
    }
    if (!owner) continue; // its PRD is blocked, or outside the --prd scope
    if (!epicsByPrd.has(owner)) epicsByPrd.set(owner, []);
    epicsByPrd.get(owner).push(e);
  }
  for (const [owner, list] of epicsByPrd) {
    const kept = list.filter((e) => !e.legacy).map((e) => e.oldNumber);
    let nextE = kept.length ? Math.max(...kept) + 1 : 1;
    const ordered = [
      ...list.filter((e) => !e.legacy),
      ...list
        .filter((e) => e.legacy)
        .sort(
          (a, b) => a.oldNumber - b.oldNumber || a.dir.localeCompare(b.dir),
        ),
    ];
    for (const e of ordered) {
      const E = e.legacy ? nextE++ : e.oldNumber;
      let newStem;
      try {
        newStem = docId.format({
          kind: "epic",
          prd: owner.n,
          epic: E,
          slug: e.slug,
        });
      } catch {
        blockers.push(
          blocker(
            "bad-slug",
            e.doc || e.dir,
            `"${e.slug}" cannot form an epic name`,
          ),
        );
        continue;
      }
      const newEpicsDir = P.join(owner.newDir, "epics");
      epicPlans.push({
        ...e,
        prdPlan: owner,
        E,
        newStem,
        newShort: docId.parse(newStem).id,
        newDir: P.join(newEpicsDir, newStem),
      });
    }
  }
  const epicPlanOf = new Map(epicPlans.map((e) => [e.dir, e]));

  const storyPlans = [];
  for (const s of disc.stories) {
    const ep = epicPlanOf.get(s.epic.dir);
    if (!ep) continue;
    let newStem;
    try {
      newStem = docId.format({
        kind: "story",
        prd: ep.prdPlan.n,
        epic: ep.E,
        story: s.story,
        sub: s.sub || undefined,
        slug: s.slug,
      });
    } catch {
      blockers.push(
        blocker(
          "bad-slug",
          s.doc || s.dir,
          `"${s.slug}" cannot form a story name`,
        ),
      );
      continue;
    }
    storyPlans.push({
      ...s,
      epicPlan: ep,
      newStem,
      newShort: docId.parse(newStem).id,
      newDir: P.join(ep.newDir, "stories", newStem),
    });
  }

  // Two documents that would carry one id. A story keeps its number under its new
  // parent, so a legacy story can land on the id an already-numbered one holds
  // (task.203 QA cycle 2, CR-2). Checked over every planned epic and story, and
  // raised only when at least one of the pair is renamed — a pre-existing
  // duplicate between unmoved documents is checkCorpus's to report.
  const byId = new Map();
  for (const x of [...epicPlans, ...storyPlans]) {
    const id = docId.parse(x.newStem).id;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(x);
  }
  for (const [id, list] of byId) {
    if (list.length < 2 || list.every((x) => x.dir === x.newDir)) continue;
    blockers.push(
      blocker(
        "id-collision",
        list[1].doc || list[1].dir,
        `${id} would be held by ${list.map((x) => x.dir).join(" and ")}`,
      ),
    );
  }

  // Directory map (old → new) and the basename rule of each document directory.
  const dirMap = new Map();
  const docRules = new Map(); // old dir whose direct files take a prefix rename
  for (const p of prdPlans) {
    const rule = {
      oldStem: p.oldStem,
      oldShort: null,
      newStem: p.newStem,
      newShort: null,
    };
    if (p.shape === "L1") {
      if (p.dir !== p.newDir) dirMap.set(p.dir, p.newDir);
      docRules.set(p.dir, rule);
    } else if (p.epicsDir) {
      dirMap.set(p.epicsDir, P.join(p.newDir, "epics"));
    }
    p.rule = rule;
  }
  for (const e of epicPlans) {
    if (e.dir !== e.newDir) dirMap.set(e.dir, e.newDir);
    docRules.set(e.dir, {
      oldStem: e.oldStem,
      oldShort: e.oldShort,
      newStem: e.newStem,
      newShort: e.newShort,
    });
  }
  for (const s of storyPlans) {
    if (s.dir !== s.newDir) dirMap.set(s.dir, s.newDir);
    docRules.set(s.dir, {
      oldStem: s.oldStem,
      oldShort: s.oldShort,
      newStem: s.newStem,
      newShort: s.newShort,
    });
  }
  const dirKeys = [...dirMap.keys()].sort((a, b) => b.length - a.length);

  // Explicit file moves for the L2 / L3 PRD documents and their prefixed artifacts.
  const explicit = new Map();
  for (const p of prdPlans) {
    if (p.shape === "L1") continue;
    for (const f of disc.files) {
      if (P.dirname(f) !== p.dir) continue;
      const base = P.basename(f);
      if (f === p.doc || base.startsWith(`${p.oldStem}.`))
        explicit.set(f, P.join(p.newDir, renameBase(base, p.rule)));
    }
    if (p.shape === "L3")
      explicit.set(p.doc, P.join(p.newDir, `${p.newStem}.md`));
  }

  /** Map any repo-relative path (file or directory, existing or not). */
  const mapPath = (p) => {
    if (explicit.has(p)) return explicit.get(p);
    let out = p;
    const parentOld = P.dirname(p);
    for (const k of dirKeys) {
      if (isUnder(p, k)) {
        out = dirMap.get(k) + p.slice(k.length);
        break;
      }
    }
    const rule = docRules.get(parentOld);
    if (rule) out = P.join(P.dirname(out), renameBase(P.basename(p), rule));
    return out;
  };

  // Every discovered file, plus every explicit move — the L3 monolith sits beside
  // the root, outside the walk, and reaches the map only through `explicit`
  // (task.203 QA cycle 1, CR-1).
  const fileMap = new Map();
  for (const f of new Set([...disc.files, ...explicit.keys()])) {
    const to = mapPath(f);
    if (to !== f) fileMap.set(f, to);
  }

  const mapping = [
    ...prdPlans
      .filter((p) => p.doc !== mapPath(p.doc))
      .map((p) => ({
        kind: "prd",
        old: p.doc,
        new: mapPath(p.doc),
        oldId: p.oldStem,
        newId: `${p.n}`,
      })),
    ...epicPlans
      .filter((e) => e.dir !== e.newDir)
      .map((e) => ({
        kind: "epic",
        old: e.dir,
        new: e.newDir,
        oldId: e.legacy ? `${e.oldNumber}` : `${e.prdPlan.n}.${e.oldNumber}`,
        newId: `${e.prdPlan.n}.${e.E}`,
      })),
    ...storyPlans
      .filter((s) => s.dir !== s.newDir)
      .map((s) => ({
        kind: "story",
        old: s.dir,
        new: s.newDir,
        oldId: s.oldShort,
        newId: s.newShort,
      })),
  ];

  return {
    root,
    prds: prdPlans,
    epics: epicPlans,
    stories: storyPlans,
    fileMap,
    dirMap,
    docRules,
    mapPath,
    mapping,
    blockers,
    registryText,
  };
}

// ---------------------------------------------------------------------------
// Text edits
// ---------------------------------------------------------------------------

const isFence = (l) => /^---[ \t]*\r?$/.test(l);

/**
 * The leading frontmatter block of `text`: "closed", "unclosed" (an opening fence that
 * never closes), "displaced" (the first non-blank line is a fence that closes, but a BOM or
 * blank lines come before it — a block the readers cannot see and the migration must not stack a second
 * one over; task.211 QA cycle 1, CR-1) or "none". Pure.
 */
export function frontmatterState(text) {
  const lines = text.split("\n");
  if (isFence(lines[0]))
    return lines.findIndex((l, i) => i > 0 && isFence(l)) < 0
      ? "unclosed"
      : "closed";
  // A late fence is a displaced block only when it closes over YAML: a blank line and a
  // thematic break ("\n---\n# Title"), with or without a later break, is a body with no
  // block (task.211 QA cycle 2, CR-5; cycle 3, CR-4).
  const first = lines.findIndex((l) => l.replace(/^\uFEFF/, "").trim() !== "");
  if (first < 0 || !isFence(lines[first].replace(/^\uFEFF/, ""))) return "none";
  const close = lines.findIndex((l, i) => i > first && isFence(l));
  if (close < 0) return "none";
  const inner = lines.slice(first + 1, close).filter((l) => l.trim() !== "");
  return inner.some((l) => YAML_KEY.test(l)) &&
    inner.every((l) => YAML_KEY.test(l) || /^(?:\s|#|-\s)/.test(l))
    ? "displaced"
    : "none";
}

// A top-level YAML mapping key: what a frontmatter line looks like and a body line does not.
// A key may be quoted, or hold spaces and dots ("Last updated", prd.version); it may not
// open with Markdown (#, -, *, >, [) (task.211 QA cycle 4, CR-2).
const YAML_KEY =
  /^(?:(?:"[^"\n]*"|'[^'\n]*')[ \t]*|[A-Za-z0-9_][^:\n]*):(?:[ \t]|\r?$)/;

/**
 * Set (or insert) frontmatter fields inside the leading `---` block. Pure.
 * A file with no block gets one holding every edit, inserted or not, in order — a
 * legacy PRD written without frontmatter would otherwise move and then fail the
 * post-check (task.211). A `createOnly` edit is written only into a created block.
 * An unclosed or displaced block is left alone: planEdits refuses that file as a blocker.
 */
export function editFrontmatter(text, edits) {
  const lines = text.split("\n");
  const state = frontmatterState(text);
  // Read the state, never the first fence: a displaced block's blank line 0 would be taken
  // as the opening fence and the edit written above the real block (task.221, CR-2).
  if (state === "unclosed" || state === "displaced") return text;
  if (state === "none")
    return [
      "---",
      ...edits.map((e) => `${e.key}: ${e.value}`),
      "---",
      text,
    ].join("\n");
  let close = lines.findIndex((l, i) => i > 0 && isFence(l));
  for (const e of edits) {
    if (e.createOnly) continue;
    let at = -1;
    for (let i = 1; i < close; i++) {
      if (lines[i].startsWith(`${e.key}:`)) {
        at = i;
        break;
      }
    }
    if (at >= 0) {
      const raw = lines[at].slice(e.key.length + 1).trim();
      const q = raw[0] === '"' || raw[0] === "'" ? raw[0] : "";
      const v = e.quote === false ? String(e.value) : `${q}${e.value}${q}`;
      lines[at] = `${e.key}: ${v}`;
      continue;
    }
    if (!e.insert) continue;
    let pos = 1;
    const find = (k) => {
      for (let i = 1; i < close; i++)
        if (lines[i].startsWith(`${k}:`)) return i;
      return -1;
    };
    if (e.after && find(e.after) >= 0) pos = find(e.after) + 1;
    else if (e.before && find(e.before) >= 0) pos = find(e.before);
    lines.splice(pos, 0, `${e.key}: ${e.value}`);
    close++;
  }
  return lines.join("\n");
}

/** Set a top-level YAML key (a gate's `story:`), keeping its quote character. */
function editTopLevelYaml(text, key, value) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (at < 0) return text;
  const raw = lines[at].slice(key.length + 1).trim();
  const q = raw[0] === '"' || raw[0] === "'" ? raw[0] : "";
  lines[at] = `${key}: ${q}${value}${q}`;
  return lines.join("\n");
}

function splitTarget(target) {
  const cut = target.search(/[#?]/);
  return cut < 0 ? [target, ""] : [target.slice(0, cut), target.slice(cut)];
}

function decodeSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function withDirs(paths) {
  const out = new Set(paths);
  for (const p of paths) {
    let d = P.dirname(p);
    while (d !== "." && d !== "/" && !out.has(d)) {
      out.add(d);
      d = P.dirname(d);
    }
  }
  return out;
}

/**
 * The link pass for one markdown file: every relative link, classified live or
 * dead against `liveSet`, re-pointed when live, re-resolved against `postSet`.
 * Pure. Returns { rewrites: [{line, from, to}], protect: [{line, text}],
 *   blockers, wouldHeal, live, dead }.
 */
export function linkPass(file, text, { liveSet, postSet, mapPath }) {
  const links = extractRelativeLinks(text);
  const newFile = mapPath(file);
  const out = {
    rewrites: [],
    protect: [],
    blockers: [],
    wouldHeal: [],
    live: 0,
    dead: 0,
  };
  for (const { target, line } of links) {
    const [rawPath, suffix] = splitTarget(target);
    if (rawPath === "") continue;
    const decoded = decodeSafe(rawPath);
    const oldAbs = P.normalize(P.join(P.dirname(file), decoded)).replace(
      /\/$/,
      "",
    );
    const inside = oldAbs !== ".." && !oldAbs.startsWith("../");
    if (!inside || !liveSet.has(oldAbs)) {
      out.dead++;
      out.protect.push({ line, text: target });
      // Would it start resolving from the file's new home? Reported, never healed.
      const fromNew = P.normalize(P.join(P.dirname(newFile), decoded)).replace(
        /\/$/,
        "",
      );
      if (postSet.has(fromNew)) out.wouldHeal.push({ file, line, target });
      continue;
    }
    out.live++;
    const newTarget = mapPath(oldAbs);
    let rel = P.relative(P.dirname(newFile), newTarget) || ".";
    if (rawPath.endsWith("/") && !rel.endsWith("/")) rel += "/";
    if (rawPath.startsWith("./") && !rel.startsWith(".")) rel = `./${rel}`;
    const encoded = decoded !== rawPath ? encodeURI(rel) : rel;
    const next = encoded + suffix;
    // Re-resolve what will be written, from where it will be written.
    const check = P.normalize(P.join(P.dirname(newFile), rel)).replace(
      /\/$/,
      "",
    );
    if (!postSet.has(check)) {
      out.blockers.push(
        blocker(
          "link-would-break",
          file,
          `line ${line}: ${target} resolves today but ${next} would not after the move`,
        ),
      );
      out.protect.push({ line, text: target });
      continue;
    }
    if (next !== target) out.rewrites.push({ line, from: target, to: next });
    else out.protect.push({ line, text: target });
  }
  return out;
}

/** A regex over whole tokens, longest first, built from escaped literal keys. */
function tokenRe(keys, { pathTail }) {
  if (!keys.length) return null;
  const alt = [...keys]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");
  const tail = pathTail ? "(?:\\/[A-Za-z0-9._+@-]+)*\\/?" : "";
  return new RegExp(
    `(?<![A-Za-z0-9._/-])(?:${alt})${tail}(?![A-Za-z0-9_-])(?!\\.[A-Za-z0-9])`,
    "g",
  );
}

const PH = "\u0000";

/**
 * Replace `from` with `to` only where it stands as a link target — after `(`, `<`,
 * `]:` (whitespace allowed) or an attribute quote, and before a closing delimiter.
 * A label that repeats its target (`[\`path\`](path)`) keeps its text.
 */
function replaceTargets(line, from, to) {
  let out = "";
  let i = 0;
  for (;;) {
    const j = line.indexOf(from, i);
    if (j < 0) break;
    const prefix = line.slice(0, j).trimEnd();
    const before = line[j - 1];
    const after = line[j + from.length];
    const okBefore =
      prefix.endsWith("(") ||
      prefix.endsWith("<") ||
      prefix.endsWith("]:") ||
      before === '"' ||
      before === "'";
    const okAfter = after === undefined || /[)>"'\s]/.test(after);
    out += line.slice(i, j) + (okBefore && okAfter ? to : from);
    i = j + from.length;
  }
  return out + line.slice(i);
}

// A path-shaped occurrence: it starts at a path boundary (no path character before it) and
// holds at least one `/`. The lookbehind keeps the scan linear: a long run with no `/` is
// tried once, from its start, not from every position in it.
const PATH_TOKEN = /(?<![\w.~\/-])[\w.~-]*(?:\/[\w.~-]+)+/g;
// A variable ending right before a `/`: $VAR, ${VAR...}, $(command) or {{template}}, each
// optionally closed by a quote. Group 1 or 2 is the variable name, when it has one.
const VARIABLE_BEFORE =
  /(?:\$(\w+)|\$\{(\w+)[^}]*\}|\$\([^)]*\)|\{\{[^}]*\}\})["']?$/;
const NON_REPO_VARIABLE =
  /^(?:HOME|TMPDIR|TMP|TEMP|USERPROFILE|APPDATA|LOCALAPPDATA|XDG_\w+)$/;

/**
 * The occurrences in `text` (the content of repo-relative `file`) that name one of
 * `sources`. Only a path-shaped token is a reference: a bare name is prose (task.204 gate 7,
 * CR-1), and a token that only ends with a source's text names another file
 * (apps/web/docs/prd.md, ../../../prd.md). Each token is resolved, never substring-matched:
 * a `./` or `../` token against the file's directory, any other against both the file's
 * directory and the repository root. Trailing sentence dots are not part of a path. An
 * absolute or URL path never matches (task.211 QA cycle 2, CR-3, CR-4). A path rooted in a
 * variable (`${ROOT}/docs/prd.md`, `$ROOT/docs/prd.md`, `$(dirname "$0")/../prd.md`) is not
 * absolute: its variable is dropped and the rest resolved as a relative token (cycle 3,
 * CR-1). Pure.
 * @returns {{token: string, source: string}[]}
 */
export function outsideReferences(file, text, sources) {
  const hits = [];
  if (!sources.some((s) => text.includes(P.basename(s)))) return hits;
  const want = new Set(sources);
  const dir = P.dirname(file);
  for (const match of text.matchAll(PATH_TOKEN)) {
    const token = match[0].replace(/\.+$/, "");
    // None longer than PATH_MAX: path.join is quadratic on a long `../` chain, and no real
    // reference is that long.
    if (token.length > 4096) continue;
    const before = text[match.index - 1];
    let rest = token;
    let variable = null;
    if (before === "$") {
      variable = token.slice(0, token.indexOf("/"));
      rest = token.slice(variable.length + 1);
    } else if (token.startsWith("/")) {
      // Absolute unless something closes right before it. After `}` or `)` the path is
      // rooted in whatever opened it — ${..}, $(..), f"{..}", #{..} — named or not (cycle 3,
      // CR-1; cycle 5, CR-1). After a quote it is rooted only in a variable the quote closes
      // ("$ROOT"/…; cycle 4, CR-3). The lookback also names the variable, for the check below.
      if (!"})\"'".includes(before)) continue;
      const v = VARIABLE_BEFORE.exec(
        text.slice(Math.max(0, match.index - 128), match.index),
      );
      if (!v && (before === '"' || before === "'")) continue;
      variable = v ? (v[1] ?? v[2] ?? null) : null;
      rest = token.slice(1);
    }
    // A variable that names a place outside the repository is not a reference into it,
    // as `~` is not (cycle 4, CR-4).
    if (variable && NON_REPO_VARIABLE.test(variable)) continue;
    // Only ./ and ../ are relative-only; a dot-directory (.docs/prd.md) is a name and is
    // compared at the root too (task.221, CR-1).
    const forms = /^\.\.?\//.test(rest)
      ? [P.join(dir, rest)]
      : [P.join(dir, rest), P.normalize(rest)];
    const source = forms.find((f) => want.has(f));
    if (source) hits.push({ token, source });
  }
  return hits;
}

/**
 * Every text edit, computed in memory. Returns Map<oldPath, newText> for each file
 * whose content changes, plus the link report and link blockers.
 */
export function planEdits(planned, disc, io) {
  const tracked = io.tracked();
  // A move source is live whether or not it is tracked: an untracked monolith beside the
  // root still exists, and a link to it must be re-pointed, not counted dead (task.211).
  const liveSet = withDirs([
    ...new Set([...tracked, ...disc.files, ...planned.fileMap.keys()]),
  ]);
  const postSet = withDirs(
    [...liveSet].filter((p) => !p.endsWith("/")).map(planned.mapPath),
  );
  const edits = new Map();
  const blockers = [];
  const links = { live: 0, dead: 0, rewritten: 0, wouldHeal: [] };
  const root = planned.root;

  // Old stems and basenames inside the tree (the token pass). Only a dotted stem
  // (`prd.onboarding`, `epic.3.auth`) is distinctive enough to rewrite as a whole word:
  // the monolith's stem is the bare word `prd` and a root index's is `index`, and as
  // tokens they rewrote `type: prd` in every other PRD and every `prd` in prose
  // (task.204 QA cycle 7, CR-1). Their paths still move through the literal pass.
  const distinctive = (stem) => stem.includes(".");
  const tokenKeys = new Set();
  for (const p of planned.prds)
    if (p.oldStem !== p.newStem && distinctive(p.oldStem))
      tokenKeys.add(p.oldStem);
  for (const e of planned.epics)
    if (e.oldStem !== e.newStem) tokenKeys.add(e.oldStem);
  for (const s of planned.stories)
    if (s.oldStem !== s.newStem) tokenKeys.add(s.oldStem);
  const baseMap = new Map();
  for (const [from, to] of planned.fileMap) {
    const a = P.basename(from);
    const b = P.basename(to);
    if (a !== b && distinctive(stemOf(a))) baseMap.set(a, b);
  }
  for (const k of baseMap.keys()) tokenKeys.add(k);
  const stemMap = new Map();
  for (const x of [...planned.prds, ...planned.epics, ...planned.stories])
    stemMap.set(x.oldStem, x.newStem);
  const tokRe = tokenRe([...tokenKeys], { pathTail: false });

  // Old repo-relative paths (the literal pass).
  const literalKeys = [...planned.fileMap.keys(), ...planned.dirMap.keys()];
  const litRe = tokenRe(literalKeys, { pathTail: true });

  const docFields = new Map(); // old doc path → frontmatter edits
  for (const p of planned.prds) {
    if (p.doc === planned.mapPath(p.doc) && !p.legacy) continue;
    docFields.set(p.doc, [
      { key: "name", value: p.newStem },
      {
        key: "prd_number",
        value: p.n,
        quote: false,
        insert: true,
        after: "name",
      },
      { key: "type", value: "prd", createOnly: true },
    ]);
  }
  for (const e of planned.epics) {
    if (!e.doc) continue;
    if (e.dir === e.newDir && e.prdPlan.doc === planned.mapPath(e.prdPlan.doc))
      continue;
    docFields.set(e.doc, [
      {
        key: "prd_number",
        value: e.prdPlan.n,
        quote: false,
        insert: true,
        before: "epic_number",
      },
      { key: "epic_number", value: e.E, quote: false },
      { key: "prd_source", value: planned.mapPath(e.prdPlan.doc) },
    ]);
  }
  const gateEdits = new Map();
  for (const s of planned.stories) {
    if (s.dir === s.newDir) continue;
    const ep = s.epicPlan;
    const newEpicDoc = ep.doc ? planned.mapPath(ep.doc) : null;
    const f = [
      { key: "id", value: s.newStem },
      {
        key: "prd_number",
        value: ep.prdPlan.n,
        quote: false,
        insert: true,
        after: "id",
      },
      { key: "epic", value: ep.newStem },
      { key: "prd_source", value: planned.mapPath(ep.prdPlan.doc) },
    ];
    if (newEpicDoc)
      f.push({ key: "epic_file", value: P.relative(s.newDir, newEpicDoc) });
    if (s.doc) docFields.set(s.doc, f);
    for (const file of disc.files) {
      if (P.dirname(file) !== s.dir || !/\.ya?ml$/.test(file)) continue;
      const c = docId.parse(P.basename(planned.mapPath(file)));
      if (c.ok && c.artifact === "gate") {
        const id = docId.parse(s.newStem);
        gateEdits.set(file, `${id.prd}.${id.epic}.${id.story}${id.sub || ""}`);
      }
    }
  }

  const prefix = `${root}/`;
  // Move sources outside the root (the L3 monolith, `docs/prd.md`). A file outside the tree
  // that names one by neither the root's segment nor its prefix is still read for it — by
  // its repo-relative path, or by the relative path from the file's own directory. Never by
  // a bare word: as tokens, `prd` and `index` rewrote prose across the tree (task.204 gate 7
  // CR-1; task.211).
  const outsideSources = [...planned.fileMap.keys()].filter(
    (f) => !isUnder(f, root),
  );
  const namesOutsideSource = (file, text) =>
    outsideSources.some(
      (s) => text.includes(s) || text.includes(P.relative(P.dirname(file), s)),
    );
  const staleReferences = (file, text) => {
    const seen = new Set();
    for (const { token, source } of outsideReferences(
      file,
      text,
      outsideSources,
    )) {
      if (seen.has(token)) continue;
      seen.add(token);
      blockers.push(
        blocker(
          "stale-reference",
          file,
          `"${token}" still names ${source}, which moves to ${planned.mapPath(source)}, and neither the link pass nor the literal pass rewrites it — edit it by hand and plan again`,
        ),
      );
    }
  };
  // Every file the run moves is a candidate, the L3 monolith beside the root
  // included even when it is untracked (task.203 QA cycle 2, CR-6).
  const candidates = new Set([...disc.files, ...planned.fileMap.keys()]);
  for (const f of tracked) if (isLiteralType(f)) candidates.add(f);
  for (const file of candidates) {
    // Text only: a binary file under the tree moves, but is never rewritten.
    if (!isLiteralType(file)) continue;
    const inTree = isUnder(file, root);
    const isMd = file.endsWith(".md");
    const litOk = isLiteralType(file) && inRewriteScope(file);
    // Cheap prefilters: a file outside the tree can only point into it by naming
    // the root's last segment, and can only hold a literal by naming the root.
    const rootSeg = `${P.basename(root)}/`;
    if (!inTree && !docFields.has(file) && !gateEdits.has(file)) {
      if (!isMd && !litOk) continue;
    }
    const text = io.readFile(file);
    if (text === null) continue;
    // A file with a frontmatter or gate edit is never skipped: the L3 monolith sits
    // outside the root and need not name it (task.203 QA cycle 1, CR-1).
    if (
      !inTree &&
      !docFields.has(file) &&
      !gateEdits.has(file) &&
      !text.includes(rootSeg) &&
      !text.includes(prefix) &&
      !namesOutsideSource(file, text)
    )
      continue;
    let out = text;

    if (docFields.has(file)) {
      // A fence that never closes cannot be edited, so the file must not move: its
      // new name would carry a number its frontmatter never states (task.211).
      const fm = frontmatterState(out);
      if (fm === "unclosed")
        blockers.push(
          blocker(
            "unclosed-frontmatter",
            file,
            "the opening --- never closes, so the migration cannot write its number — close the block and plan again",
          ),
        );
      else if (fm === "displaced")
        blockers.push(
          blocker(
            "displaced-frontmatter",
            file,
            "a BOM or blank lines come before the opening ---, so no reader sees the block — remove them and plan again",
          ),
        );
      else out = editFrontmatter(out, docFields.get(file));
    }
    if (gateEdits.has(file))
      out = editTopLevelYaml(out, "story", gateEdits.get(file));

    // Links: re-point live ones and protect every target (dead ones stay as they are).
    const restore = [];
    if (isMd) {
      const lp = linkPass(file, out, {
        liveSet,
        postSet,
        mapPath: planned.mapPath,
      });
      links.live += lp.live;
      links.dead += lp.dead;
      links.rewritten += lp.rewrites.length;
      links.wouldHeal.push(...lp.wouldHeal);
      blockers.push(...lp.blockers);
      const lines = out.split("\n");
      const byLine = new Map();
      for (const r of lp.rewrites) {
        if (!byLine.has(r.line)) byLine.set(r.line, []);
        byLine.get(r.line).push({ from: r.from, to: r.to });
      }
      for (const r of lp.protect) {
        if (!byLine.has(r.line)) byLine.set(r.line, []);
        byLine.get(r.line).push({ from: r.text, to: r.text });
      }
      for (const [ln, list] of byLine) {
        list.sort((a, b) => b.from.length - a.from.length);
        let s = lines[ln - 1];
        if (s === undefined) continue;
        for (const { from, to } of list) {
          const i = restore.length;
          const next = replaceTargets(s, from, `${PH}${i}${PH}`);
          if (next === s) continue;
          restore.push(to);
          s = next;
        }
        lines[ln - 1] = s;
      }
      out = lines.join("\n");
    }

    // Literal repo-relative paths.
    if (
      litOk &&
      litRe &&
      (out.includes(prefix) || outsideSources.some((s) => out.includes(s)))
    ) {
      const rewrite = (seg) =>
        seg.replace(litRe, (m) => {
          const slash = m.endsWith("/") ? "/" : "";
          const bare = slash ? m.slice(0, -1) : m;
          return planned.mapPath(bare) + slash;
        });
      if (isExampleCopy(file)) {
        // A frozen copy: only its provenance fields in frontmatter move.
        const lines = out.split("\n");
        if (/^---[ \t]*$/.test(lines[0])) {
          for (
            let i = 1;
            i < lines.length && !/^---[ \t]*$/.test(lines[i]);
            i++
          ) {
            if (
              EXAMPLE_FRONTMATTER_KEYS.some((k) => lines[i].startsWith(`${k}:`))
            )
              lines[i] = rewrite(lines[i]);
          }
          out = lines.join("\n");
        }
      } else out = rewrite(out);
    }

    // Whole old stems and basenames, inside the tree only, never inside a path.
    if (inTree && tokRe) {
      out = out.replace(tokRe, (m) => baseMap.get(m) || stemMap.get(m) || m);
    }

    if (restore.length) {
      out = out.replace(
        new RegExp(`${PH}(\\d+)${PH}`, "g"),
        (_, i) => restore[Number(i)],
      );
    }
    // A path to an outside move source that neither pass rewrote — a relative one outside a
    // link — would point at nothing after the move. Name it rather than answer ok over it
    // (task.211 QA cycle 1, QA-1).
    if (scansForStale(file)) staleReferences(file, out);
    if (out !== text) edits.set(file, out);
  }
  // The passes rewrite only the literal-pass file types, so every other tracked text file
  // the scan covers is stale after the move if it names an outside source — under the PRD
  // root or outside it. The loop above reads exactly the literal-pass types, so this one
  // reads exactly the rest: each file once, by one predicate (task.211 QA cycle 3, CR-2,
  // CR-3). Read only when an outside source exists (cycle 2, CR-1); a known binary type is
  // never read, and a NUL byte marks any other.
  if (outsideSources.length)
    for (const file of tracked) {
      if (isLiteralType(file)) continue;
      if (BINARY_EXTS.includes(P.extname(file).toLowerCase())) continue;
      if (!scansForStale(file)) continue;
      const text = io.readFile(file);
      if (text !== null && !text.includes("\0")) staleReferences(file, text);
    }
  return { edits, blockers, links };
}

// ---------------------------------------------------------------------------
// 3. Verify
// ---------------------------------------------------------------------------

/** Every blocker, aggregated. Pure over the plan and io answers. */
export function verify(planned, disc, io, opts = {}) {
  const blockers = [...planned.blockers];
  for (const s of planned.stories) {
    if (s.dir === s.newDir || !s.doc) continue;
    const status = docId
      .frontmatterField(io.readFile(s.doc) || "", "status")
      .toLowerCase();
    if (!TERMINAL_STATUSES.includes(status) && !opts.allowInFlight) {
      blockers.push(
        blocker(
          "in-flight",
          s.doc,
          `status ${status || "(missing)"} is not terminal — a live branch may still name it; finish it or pass --allow-in-flight`,
        ),
      );
    }
  }
  const olds = new Set(planned.fileMap.keys());
  const seen = new Map();
  for (const [from, to] of planned.fileMap) {
    if (seen.has(to)) {
      blockers.push(
        blocker(
          "target-exists",
          to,
          `both ${seen.get(to)} and ${from} map here`,
        ),
      );
    }
    seen.set(to, from);
    if (io.exists(to) && !olds.has(to))
      blockers.push(
        blocker(
          "target-exists",
          to,
          `${from} would move onto an existing path`,
        ),
      );
  }
  // Every pre-existing path the run will change — a move source, a file edited in
  // place, a registry it rewrites — must be clean, or the revert would erase the
  // uncommitted change with the run's (task.203 QA cycle 2, CR-1).
  const dirtyPaths = opts.dirtyPaths || [...planned.fileMap.keys()];
  if (dirtyPaths.length) {
    const dirty = io.dirty(dirtyPaths);
    for (const p of dirtyPaths) {
      if (dirty.has(p))
        blockers.push(
          blocker(
            "dirty-path",
            p,
            "uncommitted changes the run would rewrite — commit or stash first",
          ),
        );
    }
  }
  return blockers;
}

// ---------------------------------------------------------------------------
// 4. Apply
// ---------------------------------------------------------------------------

const MIGRATED_EPICS_HEADING = "## Migrated epics";
const MIGRATED_EPICS_HEADER = [
  "| Old epic # | New id | PRD | Folder | Tracker key | Title | Status |",
  "|---:|---|---|---|---|---|---|",
];

// A header cell naming the epic number: `Epic #` or `Epic Number`, read as one column.
const epicNumberHeader = (c) =>
  /^epic\s*#$/i.test(c) || /^epic\s+number$/i.test(c);

/**
 * The rows of an epic registry: `rows` from its epic table (header `Epic #` or `Epic
 * Number`), `migrated` from the "Migrated epics" table a --prd run writes. Each row carries
 * its line index, so a scoped run can lift it out. Pure.
 */
export function epicRegistryRows(text) {
  const lines = String(text || "").split("\n");
  const rows = [];
  const migrated = [];
  let header = null;
  let kind = null;
  lines.forEach((l, idx) => {
    const t = l.trim();
    if (!t.startsWith("|")) {
      header = null;
      return;
    }
    const cells = t
      .replace(/^\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((c) => c.trim());
    if (/^[\s:|-]+$/.test(t.replace(/\|/g, ""))) return;
    if (!header) {
      if (cells.some(epicNumberHeader)) {
        kind = "rows";
        header = cells.map((c) =>
          epicNumberHeader(c) ? "epic #" : c.toLowerCase(),
        );
      } else if (cells.some((c) => /^old\s+epic\s*#$/i.test(c))) {
        kind = "migrated";
        header = cells.map((c) => c.toLowerCase());
      }
      return;
    }
    const get = (name) => cells[header.findIndex((h) => h === name)] || "—";
    if (kind === "migrated")
      migrated.push({
        idx,
        n: get("old epic #"),
        newId: get("new id"),
        prd: get("prd"),
        folder: get("folder"),
        tracker: get("tracker key"),
        title: get("title"),
        status: get("status"),
      });
    else
      rows.push({
        idx,
        n: get("epic #"),
        tracker: get("tracker key"),
        folder: get("folder"),
        title: get("title"),
        status: get("status"),
      });
  });
  return { lines, rows, migrated };
}

/**
 * The planned epic a registry row names: by folder, or for a legacy epic by its number —
 * legacy epic numbers are global, so the number alone identifies one. A numbered epic is
 * matched by folder only: its E counts within its PRD and can equal any legacy number.
 */
function epicOfRow(row, planned) {
  const byFolder = planned.epics.find((e) => e.oldStem === row.folder);
  if (byFolder) return byFolder;
  const digits = String(row.n).match(/\d+/);
  if (!digits) return null;
  return (
    planned.epics.find((e) => e.legacy && e.oldNumber === Number(digits[0])) ||
    null
  );
}

/**
 * The epic registry after a --prd run that leaves legacy epics behind: it is NOT retired,
 * because those epics still read their numbers from it. The moved epics' rows leave the
 * epic table and are appended to a "Migrated epics" table (old id → new id, PRD), created
 * the first time. Every other line is kept as it is. Pure.
 */
export function epicRegistryMigrated(oldText, planned) {
  const { lines, rows } = epicRegistryRows(oldText);
  const lift = new Set();
  const added = [];
  for (const r of rows) {
    const e = epicOfRow(r, planned);
    if (!e || e.dir === e.newDir) continue;
    lift.add(r.idx);
    added.push(
      `| ${r.n} | ${e.prdPlan.n}.${e.E} | ${e.prdPlan.newStem} | ${e.newStem} | ${r.tracker} | ${r.title} | ${r.status} |`,
    );
  }
  const kept = lines.filter((_, i) => !lift.has(i));
  if (!added.length) return kept.join("\n");
  const at = kept.findIndex((l) => l.trim() === MIGRATED_EPICS_HEADING);
  if (at >= 0) {
    // Append after the last row of the table that follows the heading.
    let end = at + 1;
    while (end < kept.length && !kept[end].trim().startsWith("|")) end++;
    while (end < kept.length && kept[end].trim().startsWith("|")) end++;
    kept.splice(end, 0, ...added);
    return kept.join("\n");
  }
  while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
  kept.push(
    "",
    MIGRATED_EPICS_HEADING,
    "",
    "Epics moved to the hierarchical scheme one PRD at a time (`migrate-doc-numbering.mjs --prd`).",
    "Their rows left the table above; each now counts within its PRD. This registry is retired",
    "when the last legacy epic has moved.",
    "",
    ...MIGRATED_EPICS_HEADER,
    ...added,
    "",
  );
  return kept.join("\n");
}

/**
 * The epic-registry pointer, keeping the old table as a historical mapping — and, after
 * earlier --prd runs, the rows of their "Migrated epics" table after it.
 */
export function epicRegistryPointer(oldText, planned, { rel, repoPath }) {
  const { rows, migrated } = epicRegistryRows(oldText);
  const out = [
    "---",
    "name: epic-registry",
    "description: Retired — epic numbers now count within their parent PRD.",
    "type: registry",
    "status: retired",
    "---",
    "",
    "# Epic Registry (retired)",
    "",
    `Epic numbers count within their PRD (\`epic.{P}.{E}\`). Allocate a PRD number from`,
    `[\`${repoPath}\`](${rel}); the epics of a PRD are listed in that PRD's`,
    "epics-index block. `create-epic` allocates an epic's number with `doc-id.js next epic`",
    "(**task.205**); nothing reads a counter here.",
    "",
    "See [`docs/standards/epic-registry.md`](../standards/epic-registry.md) for the history of this registry.",
    "",
    "## Historical mapping",
    "",
    "| Old epic # | New id | Folder | Tracker key | Title | Status |",
    "|---:|---|---|---|---|---|",
  ];
  for (const r of rows) {
    const e = epicOfRow(r, planned);
    const newId = e ? `${e.prdPlan.n}.${e.E}` : "—";
    const folder = e ? e.newStem : r.folder;
    out.push(
      `| ${r.n} | ${newId} | ${folder} | ${r.tracker} | ${r.title} | ${r.status} |`,
    );
  }
  for (const r of migrated)
    out.push(
      `| ${r.n} | ${r.newId} | ${r.folder} | ${r.tracker} | ${r.title} | ${r.status} |`,
    );
  out.push("");
  return out.join("\n");
}

/**
 * Write the plan. Order: directories, moves, empty old directories removed, text,
 * registries. Returns { moved, written }.
 */
export function apply(planned, disc, editsOut, io, extra = {}) {
  const tracked = extra.tracked || new Set(io.tracked());
  // What has been done so far — read by the caller's revert when a step throws
  // part-way (task.203 QA cycle 2, CR-3).
  const progress = extra.progress || { moved: new Set(), written: new Set() };
  const newDirs = new Set(
    [...planned.fileMap.values()].map((p) => P.dirname(p)),
  );
  for (const d of [...newDirs].sort()) io.mkdirp(d);
  let moved = 0;
  for (const [from, to] of planned.fileMap) {
    io.move(from, to, { tracked: tracked.has(from) });
    progress.moved.add(from);
    moved++;
  }
  // Only the directories this run's moves emptied — never any other empty
  // directory under the root (task.203 QA cycle 2, CR-4).
  const emptied = new Set();
  for (const from of planned.fileMap.keys()) {
    let d = P.dirname(from);
    while (d !== planned.root && isUnder(d, planned.root)) {
      emptied.add(d);
      d = P.dirname(d);
    }
  }
  for (const d of [...emptied].sort((a, b) => b.length - a.length))
    io.rmdirIfEmpty(d);
  let written = 0;
  for (const [file, text] of editsOut) {
    const target = planned.mapPath(file);
    io.writeFile(target, text);
    progress.written.add(target);
    written++;
  }
  for (const [file, text] of extra.writes || []) {
    io.writeFile(file, text);
    progress.written.add(file);
    written++;
  }
  return { moved, written };
}

// ---------------------------------------------------------------------------
// The PRD root — the one input the caller names
// ---------------------------------------------------------------------------

/**
 * The PRD root as a repo-relative POSIX path, or null when it is refused. Pure over
 * the filesystem it reads (realpath only; nothing is written).
 *
 * Refused: an empty or non-string value, a NUL, a percent escape (a root is a
 * directory name, never a URL), any path whose `..` segments leave `base`, an
 * absolute path outside `base`, and a path that is lexically inside `base` but
 * resolves outside it through a symlink — the nearest existing ancestor is
 * realpath'd and re-checked, so a root that does not exist yet is still judged.
 * Existence is NOT checked here: a missing root is the caller's separate `usage`.
 * @param {string} rootArg the value the caller gave (`--root`, or the config key)
 * @param {string} base    the repository root (absolute)
 * @returns {string|null}
 */
export function checkPrdRoot(rootArg, base) {
  if (typeof rootArg !== "string" || rootArg === "" || typeof base !== "string")
    return null;
  if (rootArg.includes("\0") || rootArg.includes("%")) return null;
  let realBase;
  try {
    realBase = fs.realpathSync(base);
  } catch {
    return null;
  }
  // Containment is judged on real paths: the nearest existing ancestor is
  // realpath'd and the not-yet-existing tail re-appended. A symlink out of the
  // repository is refused, and a root named through a symlinked path to the
  // repository is accepted (task.203 QA cycle 2, CR-5).
  const abs = path.resolve(base, rootArg);
  let probe = abs;
  const tail = [];
  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) return null;
    tail.unshift(path.basename(probe));
    probe = parent;
  }
  let real;
  try {
    real = fs.realpathSync(probe);
  } catch {
    return null;
  }
  const rel = path.relative(realBase, path.join(real, ...tail));
  // The repository root itself, anything outside it, and git or dependency
  // internals are never a PRD root (CR-4).
  if (
    rel === "" ||
    rel === ".." ||
    rel.startsWith(`..${path.sep}`) ||
    path.isAbsolute(rel)
  )
    return null;
  const segs = rel.split(path.sep);
  if (segs.some((x) => x === ".git" || x === "node_modules")) return null;
  return segs.join("/");
}

/**
 * The PRD registry text this run would write, and every reason it could not.
 * Built before any write — in the dry run and under --check too — so a registry
 * refusal is a blocker, never a crash after the moves (task.203 QA cycle 1, CR-3).
 * Starts from planEdits' rewrite of the registry when there is one, so a link the
 * link pass re-pointed in an in-tree registry is not overwritten (CR-4).
 */
export function planRegistry(planned, registryText, edits, io, registryPath) {
  const blockers = [];
  const start = edits.has(registryPath)
    ? edits.get(registryPath)
    : registryText;
  let reg = start;
  const clean = (v) => String(v).replace(/[|\r\n]+/g, "-");
  for (const p of planned.prds.filter((x) => x.legacy)) {
    const src = io.readFile(p.doc) || "";
    const field = (k) => docId.frontmatterField(src, k);
    try {
      reg = docId.appendPrdRow(reg, {
        n: p.n,
        title: clean(field("title") || p.slug),
        href: P.relative(planned.root, planned.mapPath(p.doc)),
        folder: clean(p.domain),
        status: clean(field("status") || "draft"),
        created: clean(
          field("created") || new Date().toISOString().slice(0, 10),
        ),
      });
    } catch (e) {
      blockers.push(
        blocker(
          "registry-unwritable",
          registryPath,
          `appendPrdRow refused PRD ${p.n} (${e.reason || "error"}): ${e.message}`,
        ),
      );
    }
  }
  return {
    text: reg,
    changed: reg !== start || edits.has(registryPath),
    blockers,
  };
}

/**
 * The run's one record of what it changes. The dirty check, the apply and the
 * revert all read it, so what is refused, what is written and what is undone
 * cannot disagree (task.203 QA cycle 2, CR-1 — consolidated rather than patched).
 *   moves   — { from, to, tracked } per file move
 *   inPlace — pre-existing paths rewritten where they are (an edited file that does
 *             not move, a registry rewritten)
 *   created — paths the run writes that did not exist before (the PRD registry on a
 *             bootstrap)
 */
export function touchRecord(planned, edits, writes, io, tracked) {
  const moves = [...planned.fileMap].map(([from, to]) => ({
    from,
    to,
    tracked: tracked.has(from),
  }));
  const inPlace = [];
  const created = [];
  for (const f of edits.keys()) if (!planned.fileMap.has(f)) inPlace.push(f);
  for (const [f] of writes) {
    if (inPlace.includes(f)) continue;
    if (io.exists(f)) inPlace.push(f);
    else created.push(f);
  }
  return { moves, inPlace, created, tracked };
}

/**
 * The command that undoes an uncommitted --apply — exactly the paths the touch
 * record names, never a directory. With `progress`, only what was actually done.
 * Tracked paths are restored from HEAD (no-overlay, so a staged rename destination
 * is removed and its source returns); created files are removed by exact name;
 * untracked files moved by plain rename are named for moving back by hand. It runs
 * from the repository top level, so it works from any directory (CR-7).
 */
export function revertHint(touch, progress = null) {
  const q = (t) => `'${t.replace(/'/g, "'\\''")}'`;
  const didMove = (m) => !progress || progress.moved.has(m.from);
  const didWrite = (f) => !progress || progress.written.has(f);
  const restore = new Set();
  const back = [];
  const byHand = [];
  for (const m of touch.moves) {
    if (!didMove(m)) continue;
    if (m.tracked) {
      restore.add(m.from);
      restore.add(m.to);
    } else back.push(`${m.to} → ${m.from}`);
  }
  for (const f of touch.inPlace) {
    if (!didWrite(f)) continue;
    if (touch.tracked.has(f)) restore.add(f);
    else byHand.push(f);
  }
  const remove = touch.created.filter(didWrite);
  const parts = [];
  if (restore.size)
    parts.push(
      `git restore --source=HEAD --staged --worktree -- ${[...restore].sort().map(q).join(" ")}`,
    );
  if (remove.length) parts.push(`rm -f -- ${remove.sort().map(q).join(" ")}`);
  let cmd = parts.length
    ? `cd "$(git rev-parse --show-toplevel)" && ${parts.join(" && ")}`
    : "nothing to revert";
  if (back.length)
    cmd += `; then move these untracked files back by hand: ${back.join("; ")}`;
  if (byHand.length)
    cmd += `; untracked files the run rewrote, to check by hand: ${byHand.join(", ")}`;
  return cmd;
}

// ---------------------------------------------------------------------------
// The run — flags → payload
// ---------------------------------------------------------------------------

const USAGE = `Usage: node migrate-doc-numbering.mjs [--apply | --check] [--json] [--root <dir>]
                                      [--prd <path-to-prd-doc>]...
                                      [--name <path>=[<domain>/]<slug>]... [--allow-in-flight]`;

function parseArgs(argv) {
  const a = {
    apply: false,
    check: false,
    json: false,
    root: "",
    names: new Map(),
    prds: [],
    allowInFlight: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v === "" || v.startsWith("--"))
        throw new Error(`${x} needs a value`);
      return v;
    };
    if (x === "--apply") a.apply = true;
    else if (x === "--check") a.check = true;
    else if (x === "--json") a.json = true;
    else if (x === "--allow-in-flight") a.allowInFlight = true;
    else if (x === "--help" || x === "-h") a.help = true;
    else if (x === "--root" || x === "--prd-root") a.root = val();
    else if (x.startsWith("--root=") || x.startsWith("--prd-root=")) {
      a.root = x.slice(x.indexOf("=") + 1);
      if (a.root === "")
        throw new Error(`${x.slice(0, x.indexOf("="))} needs a value`);
    } else if (x === "--prd") a.prds.push(P.normalize(val()));
    else if (x.startsWith("--prd=")) {
      const v = x.slice("--prd=".length);
      if (v === "") throw new Error("--prd needs a value");
      a.prds.push(P.normalize(v));
    } else if (x === "--name") {
      const v = val();
      const eq = v.lastIndexOf("=");
      const value = v.slice(eq + 1);
      // `<slug>` or `<domain>/<slug>`, each a valid segment: parseNameValue is the one check.
      if (eq <= 0 || !parseNameValue(value))
        throw new Error(
          `--name wants <path>=<slug> or <path>=<domain>/<slug>, each a lowercase kebab-case segment starting with a letter, got ${v}`,
        );
      a.names.set(P.normalize(v.slice(0, eq)), value);
    } else throw new Error(`unknown flag ${x}`);
  }
  if (a.apply && a.check)
    throw new Error("--apply and --check are mutually exclusive");
  return a;
}

/**
 * Run the migration. `ctx.io` injects the I/O (tests); otherwise the real
 * repository at `ctx.cwd` is used. Returns the payload `{ reason, exitCode, … }`.
 */
export function run(argv, ctx = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    return { reason: "usage", exitCode: 2, error: e.message, usage: USAGE };
  }
  if (args.help) return { reason: "usage", exitCode: 0, usage: USAGE };
  let io = ctx.io;
  let repoRoot = ctx.repoRoot;
  if (!io) {
    const r = git(["rev-parse", "--show-toplevel"], ctx.cwd || process.cwd());
    if (r.status !== 0)
      return {
        reason: "usage",
        exitCode: 2,
        error: "not inside a git repository",
      };
    repoRoot = r.stdout.trim();
    io = realIo(repoRoot);
  }
  const rootArg = args.root ? ["--prd-root", args.root] : [];
  const named = docId.resolvePrdRoot(rootArg, repoRoot || ".");
  let root;
  if (repoRoot) {
    root = checkPrdRoot(named, repoRoot);
    if (root === null)
      return {
        reason: "usage",
        exitCode: 2,
        error: `PRD root ${JSON.stringify(named)} is refused: it must be a plain directory path inside the repository, not the repository root itself, .git or node_modules`,
      };
  } else {
    root = P.normalize(named).replace(/\/$/, "");
    if (root === ".." || root.startsWith("../"))
      return {
        reason: "usage",
        exitCode: 2,
        error: `PRD root ${root} is outside the tree`,
      };
  }
  if (!io.exists(root) || io.readDir(root) === null)
    return {
      reason: "usage",
      exitCode: 2,
      error: `PRD root ${root} does not exist or cannot be read`,
    };

  const disc = discover(root, io, { names: args.names });
  if (disc.unreadable.length)
    return {
      reason: "usage",
      exitCode: 2,
      error: `cannot read ${disc.unreadable.join(", ")}`,
    };
  // --prd: each value must be a PRD document the walk found, as a repo-relative path.
  let scope = null;
  if (args.prds.length) {
    const docs = new Set(disc.prds.map((p) => p.doc));
    const rel = (v) =>
      repoRoot && path.isAbsolute(v)
        ? path.relative(repoRoot, v).split(path.sep).join("/")
        : v;
    scope = new Set(args.prds.map(rel));
    const unknown = [...scope].filter((d) => !docs.has(d));
    if (unknown.length)
      return {
        reason: "usage",
        exitCode: 2,
        error: `--prd ${unknown.join(", ")} names no PRD document under ${root} — pass the PRD's own .md file, repo-relative`,
      };
  }
  const registryPath = P.join(root, "prd-registry.md");
  const registryText = io.readFile(registryPath);
  const planned = plan(disc, registryText, io, { scope });
  // The post-check of a scoped run judges the PRDs it moved, plus duplicate ids anywhere.
  const scopeDirs = scope ? planned.prds.map((p) => p.newDir) : null;
  const base = {
    root,
    ...(scope ? { scope: [...scope].sort() } : {}),
    mapping: planned.mapping,
    counts: {
      prds: planned.mapping.filter((m) => m.kind === "prd").length,
      epics: planned.mapping.filter((m) => m.kind === "epic").length,
      stories: planned.mapping.filter((m) => m.kind === "story").length,
      files: planned.fileMap.size,
    },
  };

  if (planned.fileMap.size === 0 && !planned.blockers.length) {
    const corpus = postCheck(root, io, repoRoot, scopeDirs);
    if (corpus.clean)
      return {
        ...base,
        reason: "already",
        exitCode: 0,
        corpus: corpus.summary,
      };
    return {
      ...base,
      reason: "post-check-failed",
      exitCode: 1,
      corpus: corpus.summary,
      findings: corpus.findings,
      // No command: with nothing left to move this run touched nothing, and a
      // whole-root restore would erase work it never wrote (task.203 QA cycle 2, CR-1).
      revert:
        "nothing left to move, but the corpus is not clean. If an earlier --apply stopped part-way, run the revert command it printed; otherwise fix the findings above. `git status` shows what is uncommitted.",
    };
  }

  const e = planEdits(planned, disc, io);
  const registry = planRegistry(
    planned,
    registryText,
    e.edits,
    io,
    registryPath,
  );
  // Registries — written once, after the edits, and removed from the edit map so
  // the same file is never written twice.
  const writes = [];
  if (registry.changed) {
    e.edits.delete(registryPath);
    writes.push([registryPath, registry.text]);
  }
  if (
    planned.epics.some((x) => x.dir !== x.newDir) &&
    io.exists(EPIC_REGISTRY)
  ) {
    const old = io.readFile(EPIC_REGISTRY) || "";
    if (docId.frontmatterField(old, "status") !== "retired") {
      const rel = P.relative(P.dirname(EPIC_REGISTRY), registryPath);
      // A scoped run retires the registry only with the last legacy epic: until then the
      // epics left behind still read their numbers from it.
      const moving = new Set(
        planned.epics.filter((x) => x.dir !== x.newDir).map((x) => x.dir),
      );
      const remaining =
        scope && disc.epics.some((x) => x.legacy && !moving.has(x.dir));
      const current = e.edits.has(EPIC_REGISTRY)
        ? e.edits.get(EPIC_REGISTRY)
        : old;
      e.edits.delete(EPIC_REGISTRY);
      writes.push([
        EPIC_REGISTRY,
        remaining
          ? epicRegistryMigrated(current, planned)
          : epicRegistryPointer(old, planned, { rel, repoPath: registryPath }),
      ]);
    }
  }
  const tracked = new Set(io.tracked());
  const touch = touchRecord(planned, e.edits, writes, io, tracked);
  const blockers = [
    ...verify(planned, disc, io, {
      allowInFlight: args.allowInFlight,
      dirtyPaths: [...touch.moves.map((m) => m.from), ...touch.inPlace],
    }),
    ...e.blockers,
    ...registry.blockers,
  ];
  const report = {
    ...base,
    blockers,
    links: {
      live: e.links.live,
      dead: e.links.dead,
      rewritten: e.links.rewritten,
      wouldHeal: e.links.wouldHeal,
    },
    edits: e.edits.size,
  };
  if (args.check) return { ...report, reason: "needs-migration", exitCode: 1 };
  if (blockers.length) return { ...report, reason: "blocked", exitCode: 1 };
  if (!args.apply) return { ...report, reason: "dry-run", exitCode: 0 };

  const progress = { moved: new Set(), written: new Set() };
  let done;
  try {
    done = apply(planned, disc, e.edits, io, { writes, tracked, progress });
  } catch (err) {
    // A move or write failed part-way: report what was done and how to undo it,
    // never a bare exception (task.203 QA cycle 2, CR-3).
    return {
      ...report,
      reason: "post-check-failed",
      exitCode: 1,
      error: `--apply stopped part-way: ${err.message}`,
      moved: progress.moved.size,
      written: progress.written.size,
      revert: revertHint(touch, progress),
    };
  }
  const corpus = postCheck(root, io, repoRoot, scopeDirs);
  if (!corpus.clean)
    return {
      ...report,
      ...done,
      reason: "post-check-failed",
      exitCode: 1,
      corpus: corpus.summary,
      findings: corpus.findings,
      revert: revertHint(touch),
    };
  return {
    ...report,
    ...done,
    reason: "ok",
    exitCode: 0,
    corpus: corpus.summary,
    // Nothing is committed by the run: this is how to undo it before you commit.
    revert: revertHint(touch),
  };
}

/**
 * checkCorpus over the PRD root. With `scopeDirs` (a --prd run) only findings under those
 * directories count, plus every duplicate-id: a legacy document the run was not asked to
 * move is not a finding.
 */
function postCheck(root, io, repoRoot, scopeDirs = null) {
  const ioAbs = repoRoot
    ? undefined
    : {
        exists: (p) => io.exists(p),
        readFile: (p) => io.readFile(p),
        readDir: (p) => io.readDir(p),
      };
  const r = repoRoot
    ? docId.checkCorpus(path.join(repoRoot, root), {
        prdRoot: path.join(repoRoot, root),
      })
    : docId.checkCorpus(root, { io: ioAbs, prdRoot: root });
  const rel = (p) => (repoRoot ? path.relative(repoRoot, p) : p);
  let findings = (r.findings || []).map((f) => ({ ...f, path: rel(f.path) }));
  let reason = r.reason;
  if (scopeDirs) {
    findings = findings.filter(
      (f) =>
        f.reason === "duplicate-id" ||
        scopeDirs.some((d) => isUnder(f.path, d)),
    );
    if (reason === "findings" && !findings.length) reason = "ok";
  }
  return {
    clean: reason === "ok" || reason === "empty",
    summary: {
      reason,
      documents: r.documents,
      findings: findings.length,
    },
    findings,
  };
}

function render(p) {
  const out = [];
  if (p.error) out.push(`migrate-doc-numbering: ${p.error}`);
  if (p.usage && p.reason === "usage") out.push(p.usage);
  if (p.scope) out.push(`scope: ${p.scope.join(", ")}`);
  if (p.counts) {
    out.push(
      `${p.reason}: ${p.counts.prds} PRD, ${p.counts.epics} epic(s), ${p.counts.stories} story(ies), ${p.counts.files} file(s) under ${p.root}`,
    );
  }
  for (const m of p.mapping || [])
    out.push(
      `  ${m.kind.padEnd(5)} ${m.oldId} → ${m.newId}   ${m.old} → ${m.new}`,
    );
  if (p.links)
    out.push(
      `links: ${p.links.live} live, ${p.links.dead} dead, ${p.links.rewritten} re-pointed, ${p.links.wouldHeal.length} would heal (left as written)`,
    );
  for (const h of p.links?.wouldHeal || [])
    out.push(`  would heal: ${h.file}:${h.line} → ${h.target}`);
  for (const b of p.blockers || [])
    out.push(`✖ ${b.code}: ${b.path} — ${b.detail}`);
  for (const f of p.findings || [])
    out.push(`✖ ${f.reason}: ${f.path} — ${f.detail}`);
  if (p.corpus)
    out.push(
      `corpus: ${p.corpus.reason} (${p.corpus.documents ?? 0} documents, ${p.corpus.findings ?? 0} finding(s))`,
    );
  if (p.revert) out.push(`revert: ${p.revert}`);
  if (p.moved !== undefined)
    out.push(`moved ${p.moved} file(s), wrote ${p.written}`);
  return `${out.join("\n")}\n`;
}

/** CLI wrapper: writes the payload and sets process.exitCode — never process.exit(). */
export function main(argv = process.argv.slice(2), ctx = {}) {
  const payload = run(argv, ctx);
  const json = argv.includes("--json");
  process.stdout.write(
    json ? `${JSON.stringify(payload, null, 2)}\n` : render(payload),
  );
  return payload.exitCode;
}

// Resolve BOTH sides through realpath: `.agents/skills` is a symlink in consumer
// installs, so argv[1] can arrive symlinked while import.meta.url is already real.
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isInvokedDirectly()) process.exitCode = main();
