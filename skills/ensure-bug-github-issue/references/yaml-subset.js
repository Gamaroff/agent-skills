// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/yaml-subset.js. Regenerate via `npm run bundle`.
"use strict";

// ── minimal YAML subset ──────────────────────────────────────────────────────
// Enough for skills-config.yaml's shape: nested maps, lists of maps, lists of
// scalars, and scalar values. Deliberately NOT a general YAML parser — no
// anchors, no multi-line strings, no flow collections. A consumer whose config
// needs those should be told so loudly rather than parsed wrongly.
//
// Promoted from skills/develop-batch/scripts/schedule.mjs, where it was the most
// capable of this repo's five hand-rolled readers. The body is unchanged from
// that original; only the export form differs (ESM `export function` →
// `module.exports`), because package.json is "type": "commonjs" and
// bundle_skill.py's sibling-follow regex recognises only the CommonJS require
// form — an ESM module here would silently break transitive bundling for
// anything that depends on it.
//
// (That regex is matched against file contents, so this note describes the
// require form rather than spelling it out: a literal example in a comment is
// indistinguishable from a real dependency and sends the bundler looking for a
// file that does not exist.)

function stripComment(line, strict) {
  // Only strip a `#` that is not inside quotes. Strict mode follows YAML: a comment starts at a `#`
  // at the start of the line or after whitespace, so `Pat#z` stays one value (T271-QA-32). The
  // lenient default cuts at any `#`, which the other readers of this parser rely on.
  let inS = false;
  let inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (
      c === "#" &&
      !inS &&
      !inD &&
      (!strict || i === 0 || /\s/.test(line[i - 1]))
    )
      return line.slice(0, i);
  }
  return line;
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v === "") return "";
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length > 1) ||
    (v.startsWith("'") && v.endsWith("'") && v.length > 1)
  ) {
    return v.slice(1, -1);
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "~") return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d*\.\d+$/.test(v)) return Number(v);
  if (v === "[]") return [];
  if (v === "{}") return {};
  return v;
}

/** Rows of {indent, text} for non-blank, non-comment lines. */
function significantLines(text, strict) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const noComment = stripComment(raw, strict);
    if (!noComment.trim()) continue;
    out.push({
      indent: noComment.match(/^\s*/)[0].length,
      text: noComment.trim(),
    });
  }
  return out;
}

// A mapping key: bare (`[\w.-]+`) or quoted. Quoted keys are the reason this is a
// named pattern rather than an inline literal — `byIssueType:` is keyed on live Jira
// issue type names such as "IT / DevOps Task", which contain spaces and slashes and
// so match no bare-key pattern. Before quoted keys were admitted here, such a row
// matched nothing and was skipped by the `if (!m) continue` branch below: the entire
// overlay disappeared with no error of any kind.
//
// This is the one deliberate extension to the promoted body. It is additive — a bare
// key takes the third alternative and the identical downstream path, which the
// "unquoted keys are unaffected" test pins.
const KEY_RE = /^(?:"([^"]+)"|'([^']+)'|([\w.-]+))\s*:\s*(.*)$/;
const KEY_PREFIX_RE = /^(?:"[^"]+"|'[^']+'|[\w.-]+)\s*:/;

/**
 * Set `obj[key]`. With `strict`, a key that repeats in one mapping throws: real YAML forbids it, and
 * readers disagree on which value wins (this one keeps the last), so a caller that treats the
 * document as a record must not guess (task 271, T271-QA-28).
 */
function put(obj, key, val, strict) {
  if (strict) {
    // (strict here is the boolean "opts present")
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error(`key "${key}" is not allowed`);
    }
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      throw new Error(`duplicate key "${key}" in one mapping`);
    }
  }
  obj[key] = val;
}

/**
 * Strict mode accounts for every row. A row this parser does not consume is silently dropped, so a
 * second key written in a spelling it cannot read (an odd indent, a `? key` complex key) would
 * override a value without the duplicate check ever seeing it (T271-QA-30). After a block ends, a row
 * still inside it (indented deeper than the block) is such a row; one shallower belongs to the parent.
 * `whole` is set where nothing may remain at all (the document root and a list entry's own rows).
 */
function assertConsumed(rows, i, indent, unread, whole) {
  if (!unread || i >= rows.length) return;
  if (whole || rows[i].indent > indent) {
    throw new Error(
      `unreadable row (wrong indent or unsupported syntax): ${rows[i].text.slice(0, 60)}`,
    );
  }
}

// `opts` is null (lenient) or { under: Set<string> }. Repeated keys, prototype keys and escaped quoted
// keys are refused everywhere. Unreadable rows are refused only inside a subtree under one of the
// `under` keys (`unread`): prose elsewhere in a real document legitimately continues over lines this
// parser cannot read, and refusing those would refuse 8% of the repository's committed gates.
function parseBlock(rows, start, indent, opts, whole, unread) {
  const strict = Boolean(opts);
  // Decide list vs map by the first row at this indent.
  if (
    start < rows.length &&
    rows[start].indent === indent &&
    rows[start].text.startsWith("- ")
  ) {
    const arr = [];
    let i = start;
    while (
      i < rows.length &&
      rows[i].indent === indent &&
      rows[i].text.startsWith("- ")
    ) {
      const inline = rows[i].text.slice(2).trim();
      // `- key: value` starts a map entry whose siblings are indented further.
      if (KEY_PREFIX_RE.test(inline)) {
        const synthetic = [{ indent: indent + 2, text: inline }];
        let j = i + 1;
        while (j < rows.length && rows[j].indent > indent) {
          synthetic.push(rows[j]);
          j++;
        }
        const [val] = parseBlock(synthetic, 0, indent + 2, opts, true, unread);
        arr.push(val);
        i = j;
      } else {
        arr.push(parseScalar(inline));
        i++;
      }
    }
    assertConsumed(rows, i, indent, unread, whole);
    return [arr, i];
  }

  const obj = {};
  let i = start;
  while (i < rows.length && rows[i].indent === indent) {
    const m = rows[i].text.match(KEY_RE);
    if (!m) {
      if (unread)
        throw new Error(`unreadable row: ${rows[i].text.slice(0, 60)}`);
      i++;
      continue;
    }
    const [, dq, sq, bare, rest] = m;
    if (strict && dq !== undefined && dq.includes("\\")) {
      throw new Error(`quoted key with an escape is not supported: ${dq}`);
    }
    const key = dq !== undefined ? dq : sq !== undefined ? sq : bare;
    if (rest.trim() !== "") {
      put(obj, key, parseScalar(rest), strict);
      i++;
      continue;
    }
    // Nested block: everything indented further than this key.
    let j = i + 1;
    if (j < rows.length && rows[j].indent > indent) {
      const enters = Boolean(opts && opts.under.has(key));
      if (enters) opts.entered = true;
      const [val, next] = parseBlock(
        rows,
        j,
        rows[j].indent,
        opts,
        false,
        unread || enters,
      );
      put(obj, key, val, strict);
      i = next;
    } else {
      put(obj, key, null, strict);
      i = j;
    }
  }
  assertConsumed(rows, i, indent, unread, whole);
  return [obj, i];
}

/**
 * `options.rejectDuplicateKeys`: throw when a key repeats within one mapping (default: last wins),
 * on a `__proto__`/`constructor`/`prototype` key, and on a quoted key holding a backslash escape.
 * `options.strictUnder`: key names whose subtree must be read completely; a row the parser would
 * drop there (a `? key`, an odd indent) throws instead (task 271, T271-QA-28, 30, 31).
 */
function parseYamlSubset(text, options) {
  // YAML forbids a tab in indentation. This parser counts one as a single column, so a tab-indented
  // row lands at an indent the structure never expected; strict mode refuses it rather than guess.
  if (options && options.rejectDuplicateKeys && /^ *\t/m.test(text)) {
    throw new Error("a tab in indentation is not valid YAML");
  }
  const strict = Boolean(options && options.rejectDuplicateKeys);
  const rows = significantLines(text, strict);
  if (!rows.length) return {};
  const opts = strict
    ? { under: new Set(options.strictUnder || []), entered: false }
    : null;
  const [val, next] = parseBlock(rows, 0, rows[0].indent, opts, false, false);
  // Once a strictUnder subtree was read, nothing may be left over after the root mapping ends: a
  // row the parser stopped at could hold a second, overriding key (T271-QA-33).
  if (opts && opts.entered && next < rows.length) {
    throw new Error(
      `unreadable row after the document body: ${rows[next].text.slice(0, 60)}`,
    );
  }
  return val ?? {};
}

module.exports = { parseYamlSubset };
