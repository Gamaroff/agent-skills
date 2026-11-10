#!/usr/bin/env node
/**
 * qa-snippets-differential.mjs — the QA snippet classifier against real bash (task.292).
 *
 * THE CLAIM IT TESTS
 * ------------------
 * Nothing `classifyBlock` calls `runnable` writes to disk under real `bash`. A seeded generator
 * builds blocks from atom sets that hold bash's lexical hazards (blank characters bash does not
 * treat as blanks, quote and backslash runs, substitutions, heredocs), appends a writer, and every
 * block the classifier calls `runnable` is run under `bash -c` in a fresh temp directory. A file
 * left in that directory is a write the classifier let through.
 *
 * It exists because task.290's QA loop found every one of its findings with a scratch copy of this
 * script (a fixed list of contexts in the suite never found a neighbour), and the scratch copy was
 * not in the repository. The suite runs a fixed-seed slice (`runSlice`); the full run is a Phase 4
 * deliverable of task.292 and is run by hand:
 *
 *   node scripts/qa-snippets-differential.mjs --count 70000 --atoms escapes --seed 1
 *
 * CLI: `[--engine <path>] [--atoms escapes|blanks|nesting|all] [--seed N] [--count N] [--json]`.
 * Exit 0 when no block wrote, 1 when any did, 2 on a usage error.
 *
 * CALIBRATION: an instrument is not trusted until it has caught a known failure. Run it against a
 * pre-task.292 engine (`git show 4223cfac:shared/resources/qa-execute-snippets.mjs`, written to a
 * temp `.mjs` and passed as `--engine`): it must report T290-QA-3's CR/FF/VT/NBSP/U+2028-before-`#`
 * writes. The suite holds this with `calibrate` below, which runs a deliberately blind classifier.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ENGINE = resolve(
  HERE,
  "..",
  "shared",
  "resources",
  "qa-execute-snippets.mjs",
);

/** The atoms each set draws from. Every atom is a shell fragment; the generator joins 2..8. */
export const ATOM_SETS = {
  escapes: [
    "\\'",
    '\\"',
    "'",
    '"',
    "\\",
    "\\\n",
    "#",
    " ",
    "a",
    "$(",
    ")",
    "`",
    ";",
    "\\ ",
    "\n",
    "$'",
    "\\\\",
  ],
  blanks: [
    "\t",
    "\r",
    "\f",
    "\v",
    " ",
    " ",
    " ",
    "#",
    "a",
    "\\",
    "\\\\",
    "\n",
    ";",
  ],
  // Non-blank "whitespace" between WORDS at command position. `A=1<CR>echo touch out` is, to bash,
  // the command `touch out` with `A=1<CR>echo` as an assignment; a scan that splits words on `\s`
  // reads `echo touch out`. Whole words with a separator glued on, so the generator can form the
  // shape; the bare separators after them are extra. The block carries its own writer (BARE_SETS).
  splits: [
    "A=1\r",
    "A=1\f",
    "A=1\v",
    "A=1 ",
    "A=1 ",
    "A=1 ",
    "echo\r",
    "echo ",
    "echo ",
    "env\v",
    "env ",
    "touch out",
    "touch\f",
    "out\n",
    "x\r",
    "tee",
    "\n",
    "\n",
    "\r",
    "\f",
    "\v",
    " ",
    " ",
    " ",
    " ",
    "\t",
    ";",
  ],
  nesting: [
    "$(",
    ")",
    "`",
    '"',
    "'",
    "<<E\nx\nE\n",
    "{ ",
    "; }",
    "(",
    "|",
    "&",
    "a",
    "#",
    " ",
  ],
  // Arithmetic, where `<<` is a left shift and not a heredoc opener (task 292, QA cycle 1): the
  // `\nz\n` atom is the line a mis-read heredoc would take for its delimiter.
  arith: [
    "$[",
    "]",
    "$((",
    "))",
    "((",
    "<<",
    "<<z",
    "1",
    "z",
    "\nz\n",
    "\n",
    " ",
    ";",
    "$(",
    ")",
    // An operator, and substitutions that carry a writer: without these the random run cannot
    // build `$((1+$(touch out)))`, where the writer sits inside an arithmetic body (T292-QA-2).
    "+",
    "$(touch out)",
    "`touch out`",
  ],
};

/** A seeded linear congruential generator; the sequence is a pure function of the seed. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s;
  };
}

/** The writers appended to a generated prefix; alternated so both a same-line and a next-line write occur. */
const WRITERS = [" ; touch out", "\ntouch out"];

/**
 * `count` blocks from one atom set: `echo ` + 2..8 atoms + a writer. A pure function of
 * (atoms, seed, count), so a failing block is reproduced by its seed and index.
 */
export function generateBlocks(atoms, seed, count, bare = false) {
  const next = rng(seed);
  const blocks = [];
  for (let n = 0; n < count; n += 1) {
    const len = 2 + (next() % 7);
    let code = bare ? "" : "echo ";
    for (let k = 0; k < len; k += 1) code += atoms[next() % atoms.length];
    // A bare block holds its own writer among its atoms: the classifier must not see one it
    // would refuse on sight, so the hazard is whatever a misread word split leaves hidden.
    blocks.push(bare ? code : code + WRITERS[n % WRITERS.length]);
  }
  return blocks;
}

/** Atom sets whose blocks carry no prefix and no appended writer (see generateBlocks). */
export const BARE_SETS = new Set(["splits"]);

/**
 * Run `bash -c code` in a fresh directory and say whether it left anything there. The directory
 * is removed in a `finally`, so a throwing run leaves nothing behind either.
 */
export function bashWrites(code, timeoutMs = 2000) {
  const dir = mkdtempSync(join(tmpdir(), "qa-diff-"));
  try {
    spawnSync("bash", ["-c", code], {
      cwd: dir,
      stdio: "ignore",
      timeout: timeoutMs,
    });
    return readdirSync(dir).length > 0;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Classify every block with `isRunnable` and run the runnable ones under bash.
 * @returns {{ total: number, runnable: number, writes: number, first: string[] }}
 */
export function runDifferential({
  isRunnable,
  atoms,
  seed,
  count,
  timeoutMs = 2000,
  keep = 10,
  bare = false,
}) {
  const blocks = generateBlocks(atoms, seed, count, bare);
  let runnable = 0;
  const writers = [];
  for (const code of blocks) {
    if (!isRunnable(code)) continue;
    runnable += 1;
    if (bashWrites(code, timeoutMs) && writers.length < keep)
      writers.push(code);
  }
  return {
    total: blocks.length,
    runnable,
    writes: writers.length,
    first: writers,
  };
}

async function loadEngine(path) {
  const mod = await import(pathToFileURL(resolve(path)).href);
  return (code) => mod.classifyBlock(code).klass === "runnable";
}

function parseArgs(argv) {
  const opts = {
    engine: DEFAULT_ENGINE,
    atoms: "all",
    seed: 1,
    count: 20000,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (["--engine", "--atoms", "--seed", "--count"].includes(a)) {
      const v = argv[(i += 1)];
      if (v === undefined) return { error: `${a} needs a value` };
      opts[a.slice(2)] = a === "--seed" || a === "--count" ? Number(v) : v;
    } else return { error: `unknown argument: ${a}` };
  }
  if (
    !Number.isInteger(opts.seed) ||
    !Number.isInteger(opts.count) ||
    opts.count < 1
  )
    return { error: "--seed and --count must be integers, --count >= 1" };
  if (opts.atoms !== "all" && !ATOM_SETS[opts.atoms])
    return {
      error: `--atoms must be all or one of ${Object.keys(ATOM_SETS).join(", ")}`,
    };
  return { opts };
}

async function main() {
  const { opts, error } = parseArgs(process.argv.slice(2));
  if (error) {
    process.stderr.write(`qa-snippets-differential: ${error}\n`);
    process.exitCode = 2;
    return;
  }
  const isRunnable = await loadEngine(opts.engine);
  const names = opts.atoms === "all" ? Object.keys(ATOM_SETS) : [opts.atoms];
  const report = { seed: opts.seed, engine: opts.engine, sets: {} };
  let writes = 0;
  for (const name of names) {
    const r = runDifferential({
      isRunnable,
      atoms: ATOM_SETS[name],
      seed: opts.seed,
      count: opts.count,
      bare: BARE_SETS.has(name),
    });
    report.sets[name] = r;
    writes += r.writes;
  }
  report.writes = writes;
  const out = opts.json
    ? JSON.stringify(report, null, 2)
    : names
        .map((n) => {
          const r = report.sets[n];
          return `${n}: total ${r.total}, runnable ${r.runnable}, writes ${r.writes}${r.first.map((c) => `\n  ${JSON.stringify(c)}`).join("")}`;
        })
        .join("\n");
  process.stdout.write(out + "\n");
  process.exitCode = writes > 0 ? 1 : 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
