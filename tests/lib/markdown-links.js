"use strict";
/**
 * Markdown relative-link extraction — the checker half of task.108.
 *
 * Twin: `skills/create-skill/scripts/bundle_skill.py` `iter_md_links()` — the
 * rewriter half. The two are deliberately duplicated across languages rather
 * than shared, and MUST agree on three rules, because a link one side sees and
 * the other does not is either rewritten and never verified, or verified and
 * never rewritten:
 *
 *   1. Fences are tracked LINE BY LINE. A fence opens or closes only where a
 *      line starts with three or more backticks (or tildes), and closes only on
 *      a run at least as long as the opener. A whole-text regex flips parity on
 *      an inline mention such as "containing at least one fenced ```bash block"
 *      (`qa-task/SKILL.md:515`) and then reads every real link after it as code.
 *   2. Inline code spans are skipped per line, matched as a backtick run closed
 *      by a run of the same length.
 *   3. A target is a placeholder — not a link — when it is `url`, `path` or `…`,
 *      or when any part of it carries `{…}`, `[…]` or `<…>` (`./task.{id}.{name}.md`,
 *      `../../prd.[name].md`, `<relative/path/to/story.md>`). This is a PATTERN,
 *      not a list of files.
 *
 * Only inline `[text](target)` and `![alt](target)` forms are handled. Reference
 * definitions (`[id]: target`) and autolinks are out of scope on both sides.
 */

const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/;
const CODE_SPAN_RE = /(`+)[^`]*?[^`]\1(?!`)|(`+)\2/g;
// `[text](target)` / `[text](target "title")`. The text may not contain `]`,
// which excludes nested-bracket text but keeps the match unambiguous.
const LINK_RE = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const PLACEHOLDER_LITERALS = new Set(["url", "path", "…", "..."]);

function isPlaceholder(target) {
  if (PLACEHOLDER_LITERALS.has(target)) return true;
  return /[{}\[\]<>]/.test(target);
}

/**
 * True for a target the checker (and the rewriter) must leave alone: an
 * absolute URL or other scheme, an in-page anchor, or a template placeholder.
 */
function isExternal(target) {
  // A root-absolute target (`/docs/x.md`) is left alone on both sides: the
  // Python twin's os.path.join would discard the source dir where posix.join
  // here would not, so neither claims it.
  return (
    SCHEME_RE.test(target) ||
    target.startsWith("#") ||
    target.startsWith("/") ||
    isPlaceholder(target)
  );
}

/**
 * Strip fenced blocks and inline code spans, replacing them with spaces so that
 * line numbers are preserved for reporting. Line-based, per rule 1 above.
 */
function proseOnly(text) {
  const out = [];
  let fence = null; // { char, len } while inside a fence
  for (const line of text.split("\n")) {
    const m = FENCE_RE.exec(line);
    if (fence) {
      if (m && m[1][0] === fence.char && m[1].length >= fence.len) fence = null;
      out.push("");
      continue;
    }
    if (m) {
      fence = { char: m[1][0], len: m[1].length };
      out.push("");
      continue;
    }
    out.push(line.replace(CODE_SPAN_RE, (s) => " ".repeat(s.length)));
  }
  return out.join("\n");
}

/**
 * Every inline link target in `text` — external, anchor and placeholder targets
 * included — with its 1-based line number. This is the "links visited" count a
 * non-vacuity floor should be measured against.
 */
function extractAllLinks(text) {
  const links = [];
  const lines = proseOnly(text).split("\n");
  lines.forEach((line, i) => {
    let m;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(line)) !== null)
      links.push({ target: m[1], line: i + 1 });
  });
  return links;
}

/**
 * Every relative link target in `text`, with its 1-based line number.
 * Returns [{ target, line }]. External, anchor-only and placeholder targets are
 * excluded; a `#fragment` on a relative target is kept on `target` verbatim.
 */
function extractRelativeLinks(text) {
  return extractAllLinks(text).filter(({ target }) => !isExternal(target));
}

module.exports = {
  proseOnly,
  extractAllLinks,
  extractRelativeLinks,
  isExternal,
  isPlaceholder,
};
