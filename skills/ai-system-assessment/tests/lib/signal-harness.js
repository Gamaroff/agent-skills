"use strict";

// Runs a checklist's declared evidence signals over a directory tree, in plain Node.
// Read-only: it lists and reads files under `root`, and never writes or spawns anything.
//
// Signal table contract (the checklists' "Evidence signals" section):
//   | ID | Signal | Kind | Pattern | Paths |
//   Kind  grep     Pattern is an extended regex (case-insensitive); `\|` in a cell is a literal `|` in the regex.
//         file     Pattern is `—`; the signal hits when Paths matches at least one file.
//         command  run by hand; the harness skips it.
//   Paths is a glob in backticks: `**`, `*`, `?` and `{a,b}` are supported; matched from `root`.

const fs = require("node:fs");
const path = require("node:path");

function cells(line) {
  // Split on unescaped pipes; a `\|` stays inside its cell.
  const out = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\" && line[i + 1] === "|") {
      cur += "\\|";
      i++;
    } else if (line[i] === "|") {
      out.push(cur);
      cur = "";
    } else {
      cur += line[i];
    }
  }
  out.push(cur);
  return out.slice(1, -1).map((c) => c.trim());
}

function unwrap(cell) {
  const m = /^`(.*)`$/.exec(cell);
  return m ? m[1] : cell;
}

/** Parse the signals table from a checklist's markdown. */
function parseSignals(markdown) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^##\s+Evidence signals\s*$/.test(l));
  if (start === -1) return [];
  const signals = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    if (!lines[i].startsWith("|")) continue;
    const c = cells(lines[i]);
    if (c.length < 5 || c[0] === "ID" || /^-+$/.test(c[0].replace(/\s/g, "")))
      continue;
    signals.push({
      id: c[0],
      signal: c[1],
      kind: c[2],
      pattern: unwrap(c[3]).replace(/\\\|/g, "|"),
      paths: unwrap(c[4]),
    });
  }
  return signals;
}

/** Translate a glob (`**`, `*`, `?`, `{a,b}`) to an anchored RegExp over `/`-separated paths. */
function globToRegExp(glob) {
  let re = "";
  let depth = 0;
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (ch === "?") {
      re += "[^/]";
    } else if (ch === "{") {
      re += "(?:";
      depth++;
    } else if (ch === "}" && depth > 0) {
      re += ")";
      depth--;
    } else if (ch === "," && depth > 0) {
      re += "|";
    } else if ("\\^$.+()[]|".includes(ch)) {
      re += "\\" + ch;
    } else {
      re += ch;
    }
  }
  return new RegExp("^" + re + "$");
}

/** All files under root, as `/`-separated paths relative to it, sorted. */
function listFiles(root) {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile())
        out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  })(root);
  return out.sort();
}

/** Run one signal. Returns { id, kind, skipped, hit, files } where files are the paths that satisfied it. */
function runSignal(signal, root) {
  if (signal.kind === "command")
    return {
      id: signal.id,
      kind: "command",
      skipped: true,
      hit: false,
      files: [],
    };
  const glob = globToRegExp(signal.paths);
  const candidates = listFiles(root).filter((f) => glob.test(f));
  if (signal.kind === "file") {
    return {
      id: signal.id,
      kind: "file",
      skipped: false,
      hit: candidates.length > 0,
      files: candidates,
    };
  }
  const rx = new RegExp(signal.pattern, "i");
  const files = candidates.filter((f) =>
    rx.test(fs.readFileSync(path.join(root, f), "utf8")),
  );
  return {
    id: signal.id,
    kind: "grep",
    skipped: false,
    hit: files.length > 0,
    files,
  };
}

/** Hash every file under root (path + bytes), to prove a run left the tree untouched. */
function treeHash(root) {
  const h = require("node:crypto").createHash("sha256");
  for (const f of listFiles(root)) {
    h.update(f + "\0");
    h.update(fs.readFileSync(path.join(root, f)));
    h.update("\0");
  }
  return h.digest("hex");
}

module.exports = { parseSignals, globToRegExp, listFiles, runSignal, treeHash };
