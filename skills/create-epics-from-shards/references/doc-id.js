#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/doc-id.js. Regenerate via `npm run bundle`.
"use strict";

/**
 * doc-id.js — the one definition of a document id under the hierarchical scheme
 * (task 202). Pure library plus a thin CLI.
 *
 *   prd.{P}.{slug}            P — the PRD number, global, from the PRD registry
 *   epic.{P}.{E}.{slug}       E — counts epics WITHIN that PRD
 *   story.{P}.{E}.{S}.{slug}  S — counts stories within that epic; `3A` is a sub-story
 *   task.{N}.{slug}           unchanged
 *   bug.{N}.{slug}            unchanged
 *
 * Numbers are positive integers with no leading zeros. A prd / epic / story slug is
 * lowercase kebab-case BEGINNING WITH A LETTER — that is what keeps `story.1.2.3.x`
 * unambiguous: the fourth segment can never be a number. Task and bug slugs keep
 * today's looser grammar.
 *
 * Nothing calls this module yet: tasks 203–207 migrate the callers. Until task 206,
 * `finalise-fix-and-recheck.mjs` keeps its own artifact regex, and a contract test
 * pins the two vocabularies equal.
 *
 * CLI (exit codes: 0 = ok / empty, 1 = a guard tripped, 2 = usage error — the
 * contract of tracker-comment.js and its peers):
 *
 *   node doc-id.js parse <name> [--json]
 *   node doc-id.js next prd   [--prd-root R] [--json]
 *   node doc-id.js next epic  --prd-dir  <dir> [--json]
 *   node doc-id.js next story --epic-dir <dir> [--json]
 *   node doc-id.js check <path> [--prd-root R] [--json]
 *   node doc-id.js check --corpus [--prd-root R] [--json]
 */

const fs = require("fs");
const path = require("path");

const NUM = "[1-9][0-9]*";
const NUM_RE = new RegExp(`^${NUM}$`);
const SLUG_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/; // prd / epic / story
const LOOSE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // task / bug: today's grammar

const KINDS = Object.freeze(["prd", "epic", "story", "task", "bug"]);
const HIERARCHICAL = Object.freeze(["prd", "epic", "story"]);

// The ONE artifact vocabulary. Until task 206 makes finalise-fix-and-recheck.mjs
// re-export it, doc-id.test.mjs pins it equal to that file's WORK_ITEM_ARTIFACT_RE.
const ARTIFACTS = Object.freeze([
  "qa",
  "gate",
  "bug",
  "implementation",
  "review",
  "dod",
  "plan",
  "handover",
  "handoff",
  "pr-review",
  "risk",
  "test-design",
  "validate",
  "sprint-review-summary",
]);

const ID_RE = Object.freeze({
  prd: new RegExp(`^prd\\.(?<prd>${NUM})(?=\\.|$)`),
  epic: new RegExp(`^epic\\.(?<prd>${NUM})\\.(?<epic>${NUM})(?=\\.|$)`),
  story: new RegExp(
    `^story\\.(?<prd>${NUM})\\.(?<epic>${NUM})\\.(?<story>${NUM})(?<sub>[A-Z])?(?=\\.|$)`,
  ),
  task: new RegExp(`^task\\.(?<n>${NUM})(?=\\.|$)`),
  bug: new RegExp(`^bug\\.(?<n>${NUM})(?=\\.|$)`),
});

// The legacy shapes task 203 migrates from. Read by parseLegacy() only.
const LEGACY_ID_RE = Object.freeze({
  prd: /^prd(?=\.)/,
  epic: new RegExp(`^epic\\.(?<epic>${NUM})(?=\\.|$)`),
  story: new RegExp(
    `^story\\.(?<epic>${NUM})\\.(?<story>${NUM})(?<sub>[A-Z])?(?=\\.|$)`,
  ),
});

const EXT_RE = /\.(?:md|ya?ml|json|sh)$/;

// A number segment is a JS number only while it is a safe integer: past
// Number.MAX_SAFE_INTEGER, Number() rounds, and the parsed value would no longer
// name the file it came from (QA cycle 1, PROBE-1).
const isSafeNum = (v) => v === undefined || Number.isSafeInteger(Number(v));

/** Basename without directory or a known extension. */
function stemOf(name) {
  return path.basename(String(name)).replace(EXT_RE, "");
}

function fail(reason) {
  return Object.freeze({ ok: false, reason });
}

/**
 * Classify what follows the id. Returns `{ artifact, seq, slug, canonical }` or a
 * failure reason. `slugOk` is the kind's slug rule.
 *
 *   .{slug}                     the document (a single segment is ALWAYS the slug,
 *                               even when it spells an artifact word)
 *   .{artifact}.{seq}.{slug}    a canonical artifact
 *   .plan.{slug}                the plan, which has no seq
 *   anything else holding an artifact word as a whole segment — a dated review,
 *   a slug before the keyword, a seq-less DoD sidecar: a non-canonical artifact,
 *   classified the way WORK_ITEM_ARTIFACT_RE classifies it.
 */
function parseRemainder(rest, slugOk, docSlugOk = slugOk) {
  if (rest === "") return { reason: "bad-slug" };
  const segs = rest.slice(1).split(".");
  const none = { docSlug: null };
  if (segs.length === 1) {
    // `sprint-review-summary` is a fixed-name artifact: it carries no seq and no
    // slug, so its one segment is the artifact, not a document's slug (QA cycle 2,
    // QA-1). Every other lone segment is the slug, even an artifact word.
    if (segs[0] === "sprint-review-summary") {
      return {
        ...none,
        artifact: segs[0],
        seq: null,
        slug: null,
        canonical: true,
      };
    }
    return slugOk(segs[0])
      ? { ...none, artifact: null, seq: null, slug: segs[0], canonical: true }
      : { reason: "bad-slug" };
  }
  const [head] = segs;
  if (head === "plan" && segs.length === 2 && slugOk(segs[1])) {
    return {
      ...none,
      artifact: "plan",
      seq: null,
      slug: segs[1],
      canonical: true,
    };
  }
  const isSeq = (v) => NUM_RE.test(v) && isSafeNum(v);
  // The full-stem form `{docSlug}.{artifact}.{seq}.{slug}` — a PRD or general-bug
  // review report carries its document's slug before the keyword (file-naming.md;
  // QA cycle 2, CR-7).
  if (
    segs.length === 4 &&
    docSlugOk(segs[0]) &&
    ARTIFACTS.includes(segs[1]) &&
    !["plan", "sprint-review-summary"].includes(segs[1]) &&
    isSeq(segs[2]) &&
    slugOk(segs[3])
  ) {
    return {
      artifact: segs[1],
      seq: Number(segs[2]),
      slug: segs[3],
      docSlug: segs[0],
      canonical: true,
    };
  }
  if (
    ARTIFACTS.includes(head) &&
    !["plan", "sprint-review-summary"].includes(head) &&
    segs.length === 3 &&
    isSeq(segs[1]) &&
    slugOk(segs[2])
  ) {
    return {
      ...none,
      artifact: head,
      seq: Number(segs[1]),
      slug: segs[2],
      canonical: true,
    };
  }
  const keyword = segs.find((s) => ARTIFACTS.includes(s));
  if (keyword)
    return {
      ...none,
      artifact: keyword,
      seq: null,
      slug: null,
      canonical: false,
    };
  return { reason: "bad-artifact" };
}

function buildId(kind, g) {
  switch (kind) {
    case "prd":
      return `prd.${g.prd}`;
    case "epic":
      return `epic.${g.prd}.${g.epic}`;
    case "story":
      return `story.${g.prd}.${g.epic}.${g.story}${g.sub || ""}`;
    default:
      return `${kind}.${g.n}`;
  }
}

/**
 * Parse a basename or stem under the hierarchical scheme.
 * @returns {object} frozen `{ ok: true, kind, prd, epic, story, sub, n, artifact,
 *   seq, slug, canonical, id }`, or `{ ok: false, reason }` with reason one of
 *   `unknown-kind`, `bad-number`, `bad-slug`, `bad-artifact`.
 */
function parse(name) {
  if (typeof name !== "string" || name === "") return fail("unknown-kind");
  const stem = stemOf(name);
  const kind = stem.split(".")[0];
  if (!KINDS.includes(kind)) return fail("unknown-kind");
  const m = ID_RE[kind].exec(stem);
  if (!m) return fail("bad-number");
  const g = m.groups;
  if (![g.prd, g.epic, g.story, g.n].every(isSafeNum))
    return fail("bad-number");
  const slugOk = (s) =>
    (HIERARCHICAL.includes(kind) ? SLUG_RE : LOOSE_SLUG_RE).test(s);
  const r = parseRemainder(stem.slice(m[0].length), slugOk);
  if (r.reason) return fail(r.reason);
  const toNum = (v) => (v === undefined ? null : Number(v));
  return Object.freeze({
    ok: true,
    kind,
    prd: toNum(g.prd),
    epic: toNum(g.epic),
    story: toNum(g.story),
    sub: g.sub || null,
    n: toNum(g.n),
    artifact: r.artifact,
    seq: r.seq,
    slug: r.slug,
    docSlug: r.docSlug,
    canonical: r.canonical,
    id: buildId(kind, g),
  });
}

/**
 * Read the LEGACY shapes only — `prd.{slug}`, `epic.{E}.{slug}` and
 * `story.{E}.{S}{sub?}.{slug}` — for task 203's migration. No pipeline reader may
 * call this: once the tree is migrated, the legacy shapes are malformed.
 * @returns {object} frozen `{ ok: true, legacy: true, kind, epic, story, sub,
 *   artifact, seq, slug, canonical }`, or `{ ok: false, reason }`.
 */
function parseLegacy(name) {
  if (typeof name !== "string" || name === "") return fail("unknown-kind");
  const stem = stemOf(name);
  const kind = stem.split(".")[0];
  if (!LEGACY_ID_RE[kind]) return fail("unknown-kind");
  const m = LEGACY_ID_RE[kind].exec(stem);
  if (!m) return fail("bad-number");
  const g = m.groups || {};
  if (![g.epic, g.story].every(isSafeNum)) return fail("bad-number");
  const rest = stem.slice(m[0].length);
  // A digit-first remainder is the new scheme's next number (`epic.1.1.…`), not a
  // legacy slug: refused, so the migrator never claims a new-scheme file (QA cycle
  // 4, CR-2). For the same reason a full-stem document slug must begin with a
  // letter here — and only here: parse() keeps the kind's own slug rule, under
  // which a task or bug slug may start with a digit (QA cycle 4, CR-1).
  // …with or without a sub-story suffix (`story.1.2.3A.…`; QA cycle 5, CR-1).
  if (/^\.\d+[A-Z]?(?:\.|$)/.test(rest)) return fail("bad-number");
  const r = parseRemainder(
    rest,
    (s) => LOOSE_SLUG_RE.test(s),
    (s) => SLUG_RE.test(s),
  );
  if (r.reason) return fail(r.reason);
  return Object.freeze({
    ok: true,
    legacy: true,
    kind,
    epic: g.epic === undefined ? null : Number(g.epic),
    story: g.story === undefined ? null : Number(g.story),
    sub: g.sub || null,
    artifact: r.artifact,
    seq: r.seq,
    slug: r.slug,
    docSlug: r.docSlug,
    canonical: r.canonical,
  });
}

/**
 * The inverse of parse() for canonical names: returns the stem (no extension).
 * Throws on parts that cannot form a canonical name.
 */
function format(parts) {
  const p = parts || {};
  if (!KINDS.includes(p.kind))
    throw new TypeError(`format: unknown kind ${p.kind}`);
  if (p.canonical === false)
    throw new TypeError("format: a non-canonical artifact has no format");
  const id = buildId(p.kind, {
    prd: p.prd,
    epic: p.epic,
    story: p.story,
    sub: p.sub,
    n: p.n,
  });
  let out;
  if (!p.artifact) out = `${id}.${p.slug}`;
  else if (p.artifact === "plan") out = `${id}.plan.${p.slug}`;
  else if (p.artifact === "sprint-review-summary") out = `${id}.${p.artifact}`;
  else if (p.docSlug)
    out = `${id}.${p.docSlug}.${p.artifact}.${p.seq}.${p.slug}`;
  else out = `${id}.${p.artifact}.${p.seq}.${p.slug}`;
  const back = parse(out);
  if (!back.ok)
    throw new TypeError(
      `format: parts do not form a valid name (${back.reason}): ${out}`,
    );
  // The output must parse back to exactly these parts — a missing or zero seq,
  // or a dotted slug, can still produce a name that parses as something else
  // (QA cycle 1, CR-3).
  // Numeric parts are compared as numbers: `prd: "1"` builds `prd.1…` and is the
  // same part as `prd: 1` (QA cycle 2, CR-3). A non-numeric string stays itself
  // and drifts, as it should.
  const num = (v) =>
    v === undefined || v === null
      ? null
      : typeof v === "string" && NUM_RE.test(v)
        ? Number(v)
        : v;
  const fixed = p.artifact === "sprint-review-summary";
  const want = {
    prd: num(p.prd),
    epic: num(p.epic),
    story: num(p.story),
    sub: p.sub || null,
    n: num(p.n),
    artifact: p.artifact || null,
    seq: p.artifact && p.artifact !== "plan" ? num(p.seq) : null,
    // A fixed-name artifact takes no slug: one passed is drift, never dropped
    // silently (QA cycle 3, CR-4).
    slug: fixed ? (p.slug ?? null) : p.slug,
    docSlug: p.docSlug || null,
  };
  const drift = Object.keys(want).filter((k) => back[k] !== want[k]);
  if (!back.canonical || drift.length) {
    throw new TypeError(
      `format: ${out} does not round-trip (${drift.join(", ") || "non-canonical"})`,
    );
  }
  return out;
}

const isPositiveInt = (v) => Number.isInteger(v) && v > 0;

/**
 * True for the epic `epic.P.E.*` and every story or artifact beneath it. P is
 * REQUIRED: a caller cannot ask by E alone, which is what makes `epic.1.*` unable
 * to claim `epic.12.1.*` or `epic.1.21.*`.
 */
function matchesEpic(name, P, E) {
  if (!isPositiveInt(P) || !isPositiveInt(E)) {
    throw new TypeError(
      "matchesEpic(name, P, E): P and E must both be positive integers",
    );
  }
  const p = parse(name);
  return (
    p.ok &&
    (p.kind === "epic" || p.kind === "story") &&
    p.prd === P &&
    p.epic === E
  );
}

// The words a tracker title prefixes an id with, per kind (task 205).
const TITLE_WORD = Object.freeze({ epic: "Epic", story: "Story" });

/**
 * Drop a leading id prefix from a tracker title: `[Epic 3] `, `[Epic 1.3] `,
 * `Epic 3: `, `Epic 1.3 — ` (case-insensitive; `Story` for a story, whose id may
 * carry a sub-story letter: `[Story 1.2.3A] `). The separator after an unbracketed
 * id is a colon, an en or em dash, or a hyphen; a bracketed id may be followed by
 * one too. The legacy one-number form is accepted on input so an old title
 * converges on the next sync. This is the ONE title-prefix rule: the epic-index
 * generator and both Jira epic scripts call it rather than carrying a regex of
 * their own (task 205).
 */
function stripIdPrefix(kind, title) {
  const word = TITLE_WORD[kind];
  if (!word) {
    throw new TypeError(
      `stripIdPrefix(kind, title): kind must be one of ${Object.keys(TITLE_WORD).join(", ")}`,
    );
  }
  const id = String.raw`\d+(?:\.\d+)*[A-Z]?`;
  const sep = String.raw`[:\u2013\u2014-]`;
  return String(title ?? "")
    .replace(
      new RegExp(String.raw`^\s*\[${word}\s+${id}\]\s*(?:${sep}\s*)?`, "i"),
      "",
    )
    .replace(new RegExp(String.raw`^\s*${word}\s+${id}\s*${sep}\s*`, "i"), "")
    .trim();
}

/** "1.3" for an epic, "1.3.2" for a story: a parsed id's numeric segments, dot-joined. */
function idLabel(p) {
  return [p && p.prd, p && p.epic, p && p.story]
    .filter((n) => n != null)
    .join(".");
}

// A frontmatter number arrives as a number or a string; anything else is absent.
const asPositiveInt = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isPositiveInt(n) && String(v).trim() === String(n) ? n : null;
};

/**
 * The canonical tracker summary of an epic: `[Epic P.E] {title}`. The frontmatter
 * pair `{ prd, epic }` wins over any id already in the title; when either number is
 * missing the result is the bare title — never a guessed id (review-epic is the
 * gate for a missing number). Idempotent.
 */
function epicSummary(summary, { prd, epic } = {}) {
  const bare = stripIdPrefix("epic", summary);
  const P = asPositiveInt(prd);
  const E = asPositiveInt(epic);
  return P && E ? `[Epic ${P}.${E}] ${bare}` : bare;
}

// `**Next Available PRD Number:** **N**` — the bold-in-bold form task-registry.md uses.
const PRD_COUNTER_RE =
  /\*\*Next Available PRD Number:?\*\*:?\s*\*\*([^*]*)\*\*/;

// The selector's id-column aliases (select-next.mjs COLUMN_ALIASES → "n" / "title").
const N_ALIASES = Object.freeze(["#", "prd #", "no", "num", "number", "id"]);
const TITLE_ALIASES = Object.freeze(["title", "name"]);

/**
 * Read a PRD registry the way the selector's `parseRegistry(text, "prd", …)` reads
 * it, for the two facts doc-id needs: the registered numbers and the counter.
 *
 * The rules are the selector's, ported because this module is CommonJS and the
 * selector is ESM (QA cycle 2, CR-2 — the earlier reader kept its own rules and
 * disagreed). doc-id.test.mjs runs both readers over one input set and fails on any
 * difference, so a change to either side is a red test, not a silent split:
 *   - a fence line (``` or ~~~) toggles fenced state, whatever its length — the
 *     selector's rule, kept for parity (CR-8);
 *   - a non-table line ends the table and forgets its header;
 *   - a header row (the line above a separator) maps the id column when it names
 *     both an id alias and a title alias; a headless table reads column 0;
 *   - a row is a registration when its id cell is all digits — malformed or not,
 *     the row's other cells are the selector's to judge.
 * The counter is the first counter line outside a fence (CR-4).
 * @returns {{ numbers: number[], counter: string|null }}
 */
function scanRegistry(text) {
  const numbers = [];
  let counter = null;
  let fenced = false;
  let nCol = null;
  let pending = null;
  for (const line of String(text || "").split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      pending = null;
      continue;
    }
    if (fenced) continue;
    if (counter === null) {
      const c = PRD_COUNTER_RE.exec(line);
      if (c) counter = c[1].trim();
    }
    const t = line.trim();
    if (!t.startsWith("|")) {
      pending = null;
      nCol = null;
      continue;
    }
    if (/^\|[\s:|-]*\|?\s*$/.test(t)) {
      if (pending) {
        const low = pending.map((c) => c.toLowerCase());
        const n = low.findIndex((c) => N_ALIASES.includes(c));
        const ti = low.findIndex((c) => TITLE_ALIASES.includes(c));
        if (n >= 0 && ti >= 0) nCol = n;
      }
      pending = null;
      continue;
    }
    const cells = t
      .replace(/^\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((c) => c.trim());
    const id = cells[nCol === null ? 0 : nCol] || "";
    if (!/^\d+$/.test(id)) {
      if (nCol === null) pending = cells;
      continue;
    }
    numbers.push(Number(id));
  }
  return { numbers, counter };
}

/** The PRD numbers a registry registers — scanRegistry(text).numbers. */
function registryNumbers(text) {
  return scanRegistry(text).numbers;
}

/**
 * Allocate the next number.
 *
 *   prd          — the registry's **Next Available PRD Number** is authoritative and
 *                  never moves backwards, so a deleted PRD's number is never reused;
 *                  `entries` (PRD directory names) only guard against a stale counter.
 *   epic / story — highest + 1 over `entries` (directory basenames that parse as
 *                  documents of that kind); 1 when there are none. A gap left by a
 *                  deleted epic or story is never refilled — deliberately NOT the
 *                  gap-filling rule of create-story's nextStoryId. These numbers have
 *                  no counter, so deleting the HIGHEST-numbered one does free its
 *                  number again (QA cycle 1, CR-1).
 *
 * @returns {object} `{ ok: true, reason: "ok", next }` or `{ ok: false, reason }`
 *   with reason `registry-missing` / `registry-invalid` / `registry-behind` /
 *   `unknown-kind`.
 */
function next(kind, entries, registryText) {
  const docs = (entries || [])
    .map((e) => parse(e))
    .filter((p) => p.ok && p.kind === kind && !p.artifact);
  if (kind === "prd") {
    // No text is a missing registry; text with no usable counter is an invalid one
    // (QA cycle 2, CR-10). The counter is an id: a positive integer, no leading
    // zeros, a safe integer (QA cycle 1, CR-7).
    if (registryText === null || registryText === undefined)
      return fail("registry-missing");
    const scan = scanRegistry(registryText);
    if (
      scan.counter === null ||
      !NUM_RE.test(scan.counter) ||
      !isSafeNum(scan.counter)
    )
      return fail("registry-invalid");
    const counter = Number(scan.counter);
    const used = docs.map((p) => p.prd).concat(scan.numbers);
    if (used.some((n) => n >= counter)) return fail("registry-behind");
    return Object.freeze({ ok: true, reason: "ok", next: counter });
  }
  if (kind !== "epic" && kind !== "story") return fail("unknown-kind");
  const key = kind === "epic" ? "epic" : "story";
  const highest = docs.reduce((max, p) => Math.max(max, p[key]), 0);
  return Object.freeze({ ok: true, reason: "ok", next: highest + 1 });
}

/** next() for callers that want a number; throws an Error carrying `.reason`. */
function nextNumber(kind, entries, registryText) {
  const r = next(kind, entries, registryText);
  if (!r.ok) {
    const e = new Error(`nextNumber(${kind}): ${r.reason}`);
    e.reason = r.reason;
    throw e;
  }
  return r.next;
}

// The empty registry, in the shape docs/standards/prd-registry.md § Format defines.
const PRD_REGISTRY_HEADER = "| PRD # | Title | Folder | Status | Created |";
const EMPTY_PRD_REGISTRY = [
  "---",
  "type: registry",
  "---",
  "",
  "# PRD Registry",
  "",
  "**Next Available PRD Number:** **1**",
  "",
  PRD_REGISTRY_HEADER,
  "|---|---|---|---|---|",
  "",
].join("\n");

/**
 * The PRD registry's one row writer (task 203). Appends `row` and moves the counter
 * to at least `row.n + 1` — it never moves backwards. With `registryText` null or
 * undefined it starts from the empty registry (counter 1): the bootstrap.
 *
 * `row` is `{ n, title, href, folder, status, created }`; `href` is relative to the
 * registry (`{domain}/prd.{P}.{slug}/prd.{P}.{slug}.md`). Pure: returns the new
 * text. Throws an Error carrying `.reason` — `registry-invalid` (no usable
 * counter), `duplicate-row` (`n` already registered), `no-table` (no PRD table to
 * append to), `bad-row` (a malformed `row`).
 */
function appendPrdRow(registryText, row) {
  const r = row || {};
  const bad = (reason, msg) => {
    const e = new Error(`appendPrdRow: ${msg}`);
    e.reason = reason;
    return e;
  };
  if (!isPositiveInt(r.n)) throw bad("bad-row", "n must be a positive integer");
  for (const k of ["title", "href", "folder", "status", "created"]) {
    if (typeof r[k] !== "string" || r[k] === "" || /[|\r\n]/.test(r[k]))
      throw bad(
        "bad-row",
        `${k} must be a non-empty string with no | or newline`,
      );
  }
  const text =
    registryText === null || registryText === undefined
      ? EMPTY_PRD_REGISTRY
      : String(registryText);
  const scan = scanRegistry(text);
  if (scan.counter === null || !NUM_RE.test(scan.counter))
    throw bad("registry-invalid", "no usable Next Available PRD Number");
  if (scan.numbers.includes(r.n))
    throw bad("duplicate-row", `PRD ${r.n} is already registered`);
  const counter = Math.max(Number(scan.counter), r.n + 1);
  const lines = text.split("\n");
  const head = lines.findIndex(
    (l) => l.trim().replace(/\s+/g, " ") === PRD_REGISTRY_HEADER,
  );
  if (head < 0) throw bad("no-table", "no PRD table header to append to");
  let end = head + 1; // the separator row
  while (end + 1 < lines.length && lines[end + 1].trim().startsWith("|")) end++;
  const cell = `| ${r.n} | [${r.title}](${r.href}) | ${r.folder} | ${r.status} | ${r.created} |`;
  lines.splice(end + 1, 0, cell);
  // The counter line: the first one outside a fence, as scanRegistry reads it.
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && PRD_COUNTER_RE.test(lines[i])) {
      lines[i] = lines[i].split(`**${scan.counter}**`).join(`**${counter}**`);
      break;
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// check / checkCorpus
// ---------------------------------------------------------------------------

const CHECK_REASONS = Object.freeze([
  "bad-shape",
  "dir-stem-mismatch",
  "frontmatter-mismatch",
  "parent-missing",
  "parent-number-mismatch",
  "unregistered",
  "duplicate-id",
  "registry-missing",
  "unreadable",
]);

const REAL_FS = Object.freeze({
  readFile: (p) => {
    try {
      return fs.readFileSync(p, "utf8");
    } catch {
      return null;
    }
  },
  exists: (p) => fs.existsSync(p),
  readDir: (p) => {
    try {
      return fs.readdirSync(p, { withFileTypes: true }).map((d) => ({
        name: d.name,
        dir: d.isDirectory(),
      }));
    } catch {
      return null;
    }
  },
});

/** A frontmatter scalar, read from the leading `---` block only (quotes stripped). */
function frontmatterField(src, key) {
  // Line by line, with no backtracking regex: a long whitespace run in a crafted
  // line must not make this quadratic (QA cycle 2, CR-6).
  const lines = String(src || "").split(/\r?\n/);
  const isFence = (l) => /^---[ \t]*$/.test(l);
  if (!isFence(lines[0])) return "";
  // Only a CLOSED block is frontmatter: find the closing fence first, then read
  // the lines between — an unclosed block, or one closed by `---   `, must not let
  // a body line answer for a field (QA cycle 3, CR-2).
  const close = lines.findIndex((l, i) => i > 0 && isFence(l));
  if (close < 0) return "";
  for (let i = 1; i < close; i++) {
    const line = lines[i];
    if (!line.startsWith(`${key}:`)) continue;
    const v = line.slice(key.length + 1).trim();
    // A quoted scalar ends at its own closing quote — a comment after it may hold
    // the same quote character (QA cycle 2, CR-5). '' is YAML's escaped '.
    if (v[0] === '"') {
      const end = v.indexOf('"', 1);
      return end > 0 ? v.slice(1, end).trim() : v;
    }
    if (v[0] === "'") {
      let j = 1;
      let out = "";
      while (j < v.length) {
        if (v[j] === "'" && v[j + 1] === "'") {
          out += "'";
          j += 2;
        } else if (v[j] === "'") {
          return out.trim();
        } else out += v[j++];
      }
      return v;
    }
    // An unquoted value loses a YAML trailing comment: `#` after whitespace
    // (QA cycle 1, CR-9) — found by a linear scan.
    for (let j = 1; j < v.length; j++) {
      if (v[j] === "#" && (v[j - 1] === " " || v[j - 1] === "\t"))
        return v.slice(0, j).trim();
    }
    return v;
  }
  return "";
}

function finding(reason, file, detail) {
  return Object.freeze({ reason, path: file, detail });
}

/** The document of a directory, `{dir}/{dir}.md`, and its parse. */
function parentDoc(dir, io) {
  const name = path.basename(dir);
  const doc = path.join(dir, `${name}.md`);
  return { name, doc, parsed: parse(name), exists: io.exists(doc) };
}

/**
 * Check one prd / epic / story document against the scheme. Filesystem access is
 * injected (`ctx.io = { readFile, exists, readDir }`) so the unit tests stay pure.
 * Collects every finding rather than stopping at the first — except `bad-shape`,
 * after which there are no numbers to check anything else against.
 * @returns {object[]} findings `{ reason, path, detail }`; empty means ok.
 */
function check(docPath, ctx = {}) {
  const io = ctx.io || REAL_FS;
  const prdRoot = ctx.prdRoot || "docs/prd";
  const out = [];
  const base = path.basename(docPath);
  const p = parse(base);
  if (
    !p.ok ||
    p.artifact ||
    !HIERARCHICAL.includes(p.kind) ||
    !base.endsWith(".md")
  ) {
    const why = !p.ok
      ? p.reason
      : p.artifact
        ? `an artifact (${p.artifact}), not a document`
        : `a ${p.kind} document is not checked here`;
    return [finding("bad-shape", docPath, `${base}: ${why}`)];
  }
  // A path that names no file is one finding, not a frontmatter defect plus a
  // registry one (QA cycle 1, CR-8).
  if (!io.exists(docPath)) {
    return [finding("bad-shape", docPath, `${base}: not found`)];
  }
  const stem = stemOf(base);
  const dir = path.dirname(docPath);
  if (path.basename(dir) !== stem) {
    out.push(
      finding(
        "dir-stem-mismatch",
        docPath,
        `directory ${path.basename(dir)} ≠ ${stem}`,
      ),
    );
  }

  // Frontmatter numbers must equal the filename's.
  const src = io.readFile(docPath);
  if (src === null) {
    // It exists (checked above) and cannot be read: its own reason, never a
    // frontmatter defect (QA cycle 2, CR-9).
    out.push(
      finding("unreadable", docPath, "document exists but cannot be read"),
    );
  } else {
    const want = { prd_number: p.prd };
    if (p.kind === "epic") want.epic_number = p.epic;
    for (const [key, val] of Object.entries(want)) {
      const got = frontmatterField(src, key);
      if (got !== String(val)) {
        out.push(
          finding(
            "frontmatter-mismatch",
            docPath,
            `${key}: ${got || "(missing)"} ≠ ${val}`,
          ),
        );
      }
    }
    if (p.kind === "story") {
      const epicRef = frontmatterField(src, "epic");
      const e = parse(epicRef);
      if (
        !e.ok ||
        e.kind !== "epic" ||
        e.artifact ||
        e.prd !== p.prd ||
        e.epic !== p.epic
      ) {
        out.push(
          finding(
            "frontmatter-mismatch",
            docPath,
            `epic: ${epicRef || "(missing)"} is not epic.${p.prd}.${p.epic}.{slug}`,
          ),
        );
      }
    }
  }

  // The parent: an epic's PRD and a story's epic are two directories up
  // (…/prd.P.x/epics/epic.P.E.y/, …/epic.P.E.y/stories/story.P.E.S.z/).
  if (p.kind !== "prd") {
    const parentKind = p.kind === "epic" ? "prd" : "epic";
    const parent = parentDoc(path.dirname(path.dirname(dir)), io);
    const pp = parent.parsed;
    if (!pp.ok || pp.kind !== parentKind || pp.artifact || !parent.exists) {
      out.push(
        finding(
          "parent-missing",
          docPath,
          `no ${parentKind} document at ${parent.doc}`,
        ),
      );
    } else if (
      pp.prd !== p.prd ||
      (parentKind === "epic" && pp.epic !== p.epic)
    ) {
      out.push(
        finding(
          "parent-number-mismatch",
          docPath,
          `${p.id} sits under ${pp.id}`,
        ),
      );
    }
  }

  // A PRD needs its registry row.
  if (p.kind === "prd") {
    const regPath = path.join(prdRoot, "prd-registry.md");
    const reg = io.readFile(regPath);
    if (reg === null)
      out.push(
        io.exists(regPath)
          ? finding(
              "unreadable",
              docPath,
              `${regPath} exists but cannot be read`,
            )
          : finding("registry-missing", docPath, `${regPath} not found`),
      );
    else if (!registryNumbers(reg).includes(p.prd)) {
      out.push(
        finding("unregistered", docPath, `no row ${p.prd} in ${regPath}`),
      );
    }
  }
  return out;
}

/** True when a basename names an artifact even though it does not parse (legacy). */
function looksLikeArtifact(base) {
  // A keyword with nothing after it is a slug, as in parse(): `epic.1.qa.md` is a
  // malformed document to report, not an artifact to skip (QA cycle 1, CR-10).
  const segs = stemOf(base).split(".").slice(1);
  return segs.some(
    (s, i) =>
      s === "sprint-review-summary" ||
      (ARTIFACTS.includes(s) && i < segs.length - 1),
  );
}

/**
 * Walk `prdRoot` and check every prd / epic / story DOCUMENT — any `.md` whose name
 * starts with one of those kind words, artifacts excepted. `prd-registry.md` and
 * shard files carry no kind prefix and are never considered. Adds one
 * `duplicate-id` per id held by more than one document.
 * A directory that cannot be read is never read as an empty one: the run answers
 * `unreadable` and names it, so a misconfigured root cannot pass as `empty`
 * (QA cycle 1, CR-4).
 * @returns {object} `{ reason: "ok" | "findings" | "empty" | "root-missing" |
 *   "unreadable", findings, documents, unreadable }`
 */
function checkCorpus(prdRoot, ctx = {}) {
  const io = ctx.io || REAL_FS;
  if (!io.exists(prdRoot)) {
    return Object.freeze({
      reason: "root-missing",
      findings: [],
      documents: 0,
    });
  }
  const docs = [];
  const unreadable = [];
  const walk = (dir) => {
    const ents = io.readDir(dir);
    if (ents === null) {
      unreadable.push(dir);
      return;
    }
    for (const ent of ents) {
      const full = path.join(dir, ent.name);
      if (ent.dir) {
        walk(full);
        continue;
      }
      if (!ent.name.endsWith(".md")) continue;
      const kind = ent.name.split(".")[0];
      if (!HIERARCHICAL.includes(kind)) continue;
      const p = parse(ent.name);
      if (p.ok ? p.artifact : looksLikeArtifact(ent.name)) continue;
      docs.push(full);
    }
  };
  walk(prdRoot);
  docs.sort();
  if (unreadable.length) {
    return Object.freeze({
      reason: "unreadable",
      findings: [],
      documents: docs.length,
      unreadable,
    });
  }
  if (docs.length === 0)
    return Object.freeze({
      reason: "empty",
      findings: [],
      documents: 0,
      unreadable,
    });

  const findings = [];
  const byId = new Map();
  for (const doc of docs) {
    findings.push(...check(doc, { io, prdRoot }));
    const p = parse(path.basename(doc));
    if (p.ok && !p.artifact) byId.set(p.id, [...(byId.get(p.id) || []), doc]);
  }
  for (const [id, paths] of byId) {
    if (paths.length > 1) {
      findings.push(
        finding(
          "duplicate-id",
          paths[1],
          `${id} is held by ${paths.join(", ")}`,
        ),
      );
    }
  }
  return Object.freeze({
    reason: findings.length ? "findings" : "ok",
    findings,
    documents: docs.length,
    unreadable,
  });
}

/** Read a `--flag <value>` / `--flag=value` argument; "" when absent. */
function argValue(argv, flag) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag) {
      const v = argv[i + 1];
      return v && !v.startsWith("--") ? v : "";
    }
    if (argv[i].startsWith(`${flag}=`)) return argv[i].slice(flag.length + 1);
  }
  return "";
}

/**
 * PRD_ROOT, in the order generate-prd-epic-index.mjs's prdRootFromConfig uses:
 * `--prd-root`, then skills-config.yaml `prd.prdShardedLocation`, then `docs/prd`.
 * A sibling of that function, not shared with it: the generator runs its CLI at
 * import. Task 205 switches the generator to this resolver.
 */
function resolvePrdRoot(argv = [], cwd = process.cwd()) {
  const flag = argValue(argv, "--prd-root");
  if (flag) return flag;
  let text = "";
  try {
    text = fs.readFileSync(path.join(cwd, "skills-config.yaml"), "utf8");
  } catch {
    return "docs/prd";
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
      if (m) return m[1].replace(/^['"]|['"]$/g, "").trim() || "docs/prd";
    }
  }
  return "docs/prd";
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `Usage:
  doc-id parse <name> [--json]
  doc-id next prd   [--prd-root R] [--json]
  doc-id next epic  --prd-dir <dir> [--json]
  doc-id next story --epic-dir <dir> [--json]
  doc-id check <path> [--prd-root R] [--json]
  doc-id check --corpus [--prd-root R] [--json]
`;

/**
 * Directory names one level down: `[]` when the directory does not exist, `null`
 * when it exists and cannot be read — the allocator must not read "could not look"
 * as "nothing there" (QA cycle 2, CR-1).
 */
function childDirs(dir, io) {
  const ents = io.readDir(dir);
  if (ents === null) return io.exists(dir) ? null : [];
  return ents.filter((e) => e.dir).map((e) => e.name);
}

/** Every directory name under `root`, any depth, plus the ones it could not read. */
function allDirs(root, io) {
  const names = [];
  const unreadable = [];
  const walk = (d) => {
    const kids = childDirs(d, io);
    if (kids === null) {
      unreadable.push(d);
      return;
    }
    for (const name of kids) {
      names.push(name);
      walk(path.join(d, name));
    }
  };
  walk(root);
  return { names, unreadable };
}

/**
 * Run the CLI over `argv` (no node / script entries). Pure apart from `io`:
 * returns `{ exitCode, payload }` and writes nothing.
 */
function runCli(argv, { cwd = process.cwd(), io = REAL_FS } = {}) {
  const usage = (error) => ({
    exitCode: 2,
    payload: { reason: "usage", exitCode: 2, error },
  });
  const flagsWithValue = ["--prd-root", "--prd-dir", "--epic-dir"];
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (flagsWithValue.includes(a)) i++;
    else if (!a.startsWith("--")) positional.push(a);
  }
  const known = ["--json", "--corpus", ...flagsWithValue];
  const unknown = argv.filter(
    (a) => a.startsWith("--") && !known.includes(a.split("=")[0]),
  );
  if (unknown.length) return usage(`unknown flag ${unknown[0]}`);
  const [cmd, arg] = positional;
  // Every path the CLI is handed resolves against `cwd`, not process.cwd(), so a
  // caller's cwd means the same thing for skills-config.yaml and for the paths it
  // names (QA cycle 1, CR-5).
  const at = (p) => path.resolve(cwd, p);
  const done = (exitCode, body) => ({
    exitCode,
    payload: { ...body, exitCode },
  });

  if (cmd === "parse") {
    if (!arg) return usage("parse needs a <name>");
    const p = parse(arg);
    return done(p.ok ? 0 : 1, { ...p, reason: p.ok ? "ok" : p.reason });
  }

  if (cmd === "next") {
    if (arg === "prd") {
      const root = at(resolvePrdRoot(argv, cwd));
      const regPath = path.join(root, "prd-registry.md");
      const reg = io.readFile(regPath);
      // A registry that exists and cannot be read is `unreadable`, as in check();
      // `registry-missing` stays for an absent file (QA cycle 3, CR-3).
      if (reg === null && io.exists(regPath)) {
        return done(1, {
          ok: false,
          reason: "unreadable",
          detail: `${regPath} exists but cannot be read`,
          prdRoot: root,
        });
      }
      const dirs = allDirs(root, io);
      if (dirs.unreadable.length) {
        return done(1, {
          ok: false,
          reason: "unreadable",
          detail: `cannot read ${dirs.unreadable.join(", ")}`,
          prdRoot: root,
        });
      }
      const r = next("prd", dirs.names, reg);
      return done(r.ok ? 0 : 1, { ...r, prdRoot: root });
    }
    if (arg === "epic" || arg === "story") {
      const flag = arg === "epic" ? "--prd-dir" : "--epic-dir";
      const given = argValue(argv, flag);
      if (!given) return usage(`next ${arg} needs ${flag} <dir>`);
      const dir = at(given);
      const parent = parse(path.basename(dir));
      const parentKind = arg === "epic" ? "prd" : "epic";
      if (!parent.ok || parent.kind !== parentKind || parent.artifact) {
        return done(1, {
          ok: false,
          reason: "bad-shape",
          detail: `${dir} is not a ${parentKind} directory`,
        });
      }
      // A mistyped parent must not allocate a number: the directory and its own
      // document must both exist (QA cycle 1, CR-2).
      const parentDocPath = path.join(dir, `${path.basename(dir)}.md`);
      // One read of the parent directory: null = unreadable, [] = absent (CR-5).
      const parentListing = childDirs(dir, io);
      if (parentListing === null) {
        return done(1, {
          ok: false,
          reason: "unreadable",
          detail: `cannot read ${dir}`,
        });
      }
      if (!io.exists(dir) || !io.exists(parentDocPath)) {
        return done(1, {
          ok: false,
          reason: "parent-missing",
          detail: `no ${parentKind} document at ${parentDocPath}`,
        });
      }
      const container = path.join(dir, arg === "epic" ? "epics" : "stories");
      const listed = childDirs(container, io);
      if (listed === null) {
        return done(1, {
          ok: false,
          reason: "unreadable",
          detail: `cannot read ${container}`,
        });
      }
      const children = listed.filter((n) => {
        const c = parse(n);
        return (
          c.ok &&
          c.prd === parent.prd &&
          (arg === "epic" || c.epic === parent.epic)
        );
      });
      const r = next(arg, children, null);
      const id =
        arg === "epic"
          ? `epic.${parent.prd}.${r.next}`
          : `story.${parent.prd}.${parent.epic}.${r.next}`;
      return done(0, { ...r, id });
    }
    return usage("next needs prd | epic | story");
  }

  if (cmd === "check") {
    const prdRoot = at(resolvePrdRoot(argv, cwd));
    if (argv.includes("--corpus")) {
      const r = checkCorpus(prdRoot, { io });
      const code = r.reason === "ok" || r.reason === "empty" ? 0 : 1;
      return done(code, {
        reason: r.reason,
        prdRoot,
        documents: r.documents,
        findings: r.findings,
        unreadable: r.unreadable,
      });
    }
    if (!arg) return usage("check needs <path> or --corpus");
    const findings = check(at(arg), { io, prdRoot });
    return done(findings.length ? 1 : 0, {
      reason: findings.length ? "findings" : "ok",
      findings,
    });
  }

  return usage(cmd ? `unknown command ${cmd}` : "no command");
}

function render(payload) {
  if (payload.reason === "usage") return `doc-id: ${payload.error}\n${USAGE}`;
  if (payload.findings) {
    const lines = payload.findings.map(
      (f) => `  ✖ ${f.reason}  ${f.path} — ${f.detail}`,
    );
    return [`doc-id: ${payload.reason}`, ...lines].join("\n") + "\n";
  }
  if (payload.next !== undefined) return `${payload.next}\n`;
  if (payload.id && payload.ok) return `${payload.id} (${payload.kind})\n`;
  return `doc-id: ${payload.reason}\n`;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const { exitCode, payload } = runCli(argv);
  const json = argv.includes("--json");
  // Set exitCode and let the process end on its own: process.exit() after an
  // async stdout write truncates a large payload on a pipe (the select-next defect).
  const text = json ? JSON.stringify(payload, null, 2) + "\n" : render(payload);
  (exitCode === 2 && !json ? process.stderr : process.stdout).write(text);
  process.exitCode = exitCode;
}

module.exports = {
  ARTIFACTS,
  CHECK_REASONS,
  KINDS,
  parse,
  parseLegacy,
  format,
  matchesEpic,
  stripIdPrefix,
  idLabel,
  epicSummary,
  next,
  nextNumber,
  appendPrdRow,
  check,
  checkCorpus,
  resolvePrdRoot,
  registryNumbers,
  frontmatterField,
  runCli,
};
