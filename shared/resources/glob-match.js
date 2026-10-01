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

// A small, total glob→RegExp. `**` crosses separators, `*` and `?` do not, and
// every other character is escaped. Deliberately not a dependency: this repo has
// no production runtime deps (tech-stack.md), and the alternative — matching on
// substrings like "test" — is what would let `src/latest-price.ts` read as
// machinery.
//
// Order matters in the scanner below: `**/` is consumed before `**`, so
// `tests/**/*.mjs` also matches `tests/a.mjs` (zero intervening directories),
// which is what every reader expects a `**/` to mean.
function globToRegExp(glob) {
  if (typeof glob !== "string" || glob === "") return null;
  let out = "^";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      // COLLAPSE RUNS OF `*` FIRST. Three or more consecutive stars mean exactly
      // what two mean in glob semantics, so collapsing is a no-op on meaning —
      // and it is what stops the compiler emitting a chain of adjacent
      // quantifiers.
      //
      // Without it, `*` × N compiles to `[^/]*` × N, which is the textbook
      // catastrophic-backtracking shape: matching a non-matching path takes time
      // exponential in N. Measured on the shipped code before this fix, against a
      // 60-character path: 8 stars 15ms, 10 stars 193ms, 12 stars 2.2s, **14
      // stars 23s** — and it does not stop, it just takes longer.
      //
      // Not a vulnerability: both inputs are repo-controlled — the globs come
      // from a committed `skills-config.yaml` and the paths from a committed gate
      // file — so there is no untrusted-input path. It is a **hang**, self-
      // inflicted by an unusual but legal config, in a rule that runs inside the
      // QA loop. Found by executing the predicate against generated candidates at
      // the DoD security gate, not by reading it; four QA cycles of review had
      // walked past it.
      let run = 0;
      while (glob[i + run] === "*") run++;
      if (run > 2) {
        i += run - 2; // leave exactly two for the `**` handling below
      }
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          out += "(?:.*/)?"; // `**/` — any number of directories, including none
          i += 3;
          continue;
        }
        out += ".*"; // bare `**` — anything, separators included
        i += 2;
        continue;
      }
      out += "[^/]*"; // `*` — anything but a separator
      i += 1;
      continue;
    }
    if (c === "?") {
      out += "[^/]";
      i += 1;
      continue;
    }
    out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    i += 1;
  }
  return new RegExp(out + "$");
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
    const re = globToRegExp(g);
    if (re !== null && re.test(p)) return true;
  }
  return false;
}

module.exports = { globToRegExp, normalisePath, matchesAnyGlob };
