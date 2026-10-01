"use strict";

// glob-match — the small, total glob matcher, shared.
//
// Moved verbatim out of qa-diminishing-returns.js (task.172) so that a second consumer
// (ci-tree-equivalence.js) does not have to bundle a 1,000-line QA module into every skill that
// carries it. qa-diminishing-returns.js requires this file and keeps exporting `matchesAnyGlob`,
// so its public surface is unchanged.
//
// `*` does not cross `/` here: `*.md` matches only repository-root markdown, and `**/*.md` is the
// spelling that reads as "every markdown file" (measured, task.172).

// A small, total glob matcher. `**` crosses separators, `*` and `?` do not, and every other
// character is literal. Deliberately not a dependency: this repo has no production runtime deps
// (tech-stack.md), and the alternative — matching on substrings like "test" — is what would let
// `src/latest-price.ts` read as machinery.
//
// Order matters in the scanner below: `**/` is consumed before `**`, so `tests/**/*.mjs` also
// matches `tests/a.mjs` (zero intervening directories), which is what every reader expects a `**/`
// to mean.
//
// NOT A REGULAR EXPRESSION, and that is the point (task.172, DoD security gate). This matcher used
// to compile the glob to a RegExp and collapse runs of `*` to stop the textbook catastrophic
// shape. That closed one spelling: `*a` repeated N times against `a` x 40 + `c` still took 3.4 s
// at N=8 and 15 s at N=9, and `**/` repeated did the same, because alternating a wildcard with a
// literal backtracks exactly as a run of wildcards does. Every guard written against a backtracking
// engine closes the spellings someone has already found. The matcher below walks the path once per
// token (a set of reachable positions), so its cost is tokens x path length whatever the pattern
// looks like, and there is no spelling left to find.
//
// Semantics are those of the RegExp it replaced, including its one oddity: `**` and `**/` do not
// cross a line terminator (`.` in a RegExp does not match one), so a path with a newline in it is
// not matched by `docs/**`. That is the safe direction for both consumers (a path nobody could
// have meant is "not docs", "not test machinery"), and a differential test against the old
// implementation holds it.

const MAX_GLOB_LENGTH = 1024;
const MAX_PATH_LENGTH = 4096;

const isLineTerminator = (ch) =>
  ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029";

// Glob → tokens. Runs of three or more `*` mean exactly what two mean, so they read as two.
function tokenise(glob) {
  const tokens = [];
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      let run = 0;
      while (glob[i + run] === "*") run++;
      if (run > 2) i += run - 2; // leave exactly two for the `**` handling below
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          tokens.push({ t: "dslash" }); // `**/` — any number of directories, including none
          i += 3;
        } else {
          tokens.push({ t: "dstar" }); // bare `**` — anything, separators included
          i += 2;
        }
      } else {
        tokens.push({ t: "star" }); // `*` — anything but a separator
        i += 1;
      }
      continue;
    }
    tokens.push(c === "?" ? { t: "any" } : { t: "lit", c });
    i += 1;
  }
  return tokens;
}

/**
 * Does `path` match `glob`, whole-string? Total: it always answers, in time proportional to
 * (tokens x path length). `null` input or an empty glob never matches.
 */
function globMatch(glob, path) {
  if (typeof glob !== "string" || glob === "") return false;
  if (typeof path !== "string") return false;
  if (glob.length > MAX_GLOB_LENGTH || path.length > MAX_PATH_LENGTH)
    return false;
  const n = path.length;
  let reach = new Array(n + 1).fill(false);
  reach[0] = true; // anchored at the start
  for (const tok of tokenise(glob)) {
    const next = new Array(n + 1).fill(false);
    if (tok.t === "lit") {
      for (let p = 0; p < n; p++)
        if (reach[p] && path[p] === tok.c) next[p + 1] = true;
    } else if (tok.t === "any") {
      for (let p = 0; p < n; p++)
        if (reach[p] && path[p] !== "/") next[p + 1] = true;
    } else if (tok.t === "star") {
      for (let p = 0; p <= n; p++) {
        next[p] = reach[p] || (p > 0 && next[p - 1] && path[p - 1] !== "/");
      }
    } else if (tok.t === "dstar") {
      for (let p = 0; p <= n; p++) {
        next[p] =
          reach[p] || (p > 0 && next[p - 1] && !isLineTerminator(path[p - 1]));
      }
    } else {
      // dslash: zero, or one `anything-without-a-line-terminator then /`. `open` is true while some
      // reachable start has only non-terminators between it and here.
      let open = false; // exists q <= p-1 reachable with path[q..p-2] free of terminators
      for (let p = 0; p <= n; p++) {
        next[p] = reach[p] || (p > 0 && path[p - 1] === "/" && open);
        // update for p+1: the start set now includes p, and path[p-1]... (see below)
        open =
          (open && (p === 0 || !isLineTerminator(path[p - 1]))) || reach[p];
      }
    }
    reach = next;
  }
  return reach[n];
}

// Normalise a `file:` value to the repo-relative form the globs are written
// against. Backslashes become forward slashes (a Windows checkout writes them),
// a `./` prefix is dropped, and a leading `/` is dropped — a gate written by hand
// sometimes carries one, and `/shared/x.js` and `shared/x.js` are the same file.
function normalisePath(file) {
  if (typeof file !== "string") return null;
  let p = file.trim().replace(/\\/g, "/");
  if (p === "") return null;
  p = p.replace(/^\.\//, "").replace(/^\/+/, "");
  return p === "" ? null : p;
}

/**
 * Does `file` match any of `globs`?
 *
 * An empty or absent glob list matches nothing — that is the default, and it is
 * what makes an unconfigured consumer keep today's behaviour exactly.
 */
function matchesAnyGlob(file, globs) {
  const p = normalisePath(file);
  if (p === null) return false;
  if (!Array.isArray(globs)) return false;
  for (const g of globs) {
    if (globMatch(g, p)) return true;
  }
  return false;
}

module.exports = { globMatch, normalisePath, matchesAnyGlob };
