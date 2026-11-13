#!/usr/bin/env node
/**
 * qa-snippets-docscan.mjs — what a change to the QA snippet classifier does to the repository's own
 * documentation (task.292).
 *
 * Every fenced `bash` block in every tracked Markdown file is classified by two engines: the base
 * ref's (default `develop`, read with `git show` into a temp `.mjs`) and the working tree's. A block
 * the working tree calls `runnable` that the base did not is NEWLY RUNNABLE: the change widened what
 * QA will execute, which is the one outcome a lexical refactor must never have. A block the base
 * called `runnable` that the working tree refuses is NEWLY REFUSED: the cost of a stricter reading,
 * listed with its file so each can be judged (a real hazard stays refused; a tokenizer gap is fixed
 * in the tokenizer, never by widening a command rule).
 *
 * CLI: `[--base <ref>] [--engine <path>] [--time] [--json]`. Exit 0 when nothing is newly runnable,
 * 1 when anything is, 2 on a usage error or when the base engine cannot be read. `--time` adds the
 * wall-clock of each engine's pass over the corpus (run it five times, alternating, with `uptime`
 * beside each; one number is not a measurement).
 *
 * CALIBRATION: run it with `--engine` pointing at a copy of the engine with a deliberately widened
 * rule. The task.290 precedent: skipping the character after every backslash outside quotes made
 * `task.83.bug.1…md:102` newly runnable. A scan that cannot report that has not earned its green.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const ENGINE_REL = "shared/resources/qa-execute-snippets.mjs";

/** Tracked Markdown files, from git, so an untracked scratch file is never part of the corpus. */
export function trackedMarkdown(cwd = REPO) {
  return execFileSync("git", ["ls-files", "*.md"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\n")
    .filter(Boolean);
}

/** The base ref's engine written to a temp `.mjs` that sits beside the real one, so its relative imports resolve. */
export function loadBaseEngine(ref, cwd = REPO) {
  const text = execFileSync("git", ["show", `${ref}:${ENGINE_REL}`], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const dir = mkdtempSync(join(tmpdir(), "qa-docscan-"));
  const file = join(dir, "base-engine.mjs");
  writeFileSync(file, text);
  return { file, dir };
}

/** Classify every block of `files` with each engine; returns the per-block verdict pairs. */
export function scanCorpus(files, engineA, engineB, cwd = REPO) {
  const rows = [];
  let msA = 0;
  let msB = 0;
  for (const f of files) {
    let md;
    try {
      md = readFileSync(join(cwd, f), "utf8");
    } catch {
      continue;
    }
    for (const b of engineB.extractBlocks(md)) {
      let t0 = process.hrtime.bigint();
      const a = engineA.classifyBlock(b.code).klass;
      msA += Number(process.hrtime.bigint() - t0) / 1e6;
      t0 = process.hrtime.bigint();
      const w = engineB.classifyBlock(b.code).klass;
      msB += Number(process.hrtime.bigint() - t0) / 1e6;
      rows.push({ file: f, line: b.line, base: a, now: w });
    }
  }
  return { rows, msBase: msA, msNow: msB };
}

/** The two lists the report is about. */
export function diffVerdicts(rows) {
  return {
    newlyRunnable: rows.filter(
      (r) => r.now === "runnable" && r.base !== "runnable",
    ),
    newlyRefused: rows.filter(
      (r) => r.base === "runnable" && r.now !== "runnable",
    ),
  };
}

function parseArgs(argv) {
  const opts = {
    base: "develop",
    engine: resolve(REPO, ENGINE_REL),
    time: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--time") opts.time = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--base" || a === "--engine") {
      const v = argv[(i += 1)];
      if (v === undefined) return { error: `${a} needs a value` };
      opts[a.slice(2)] = a === "--engine" ? resolve(v) : v;
    } else return { error: `unknown argument: ${a}` };
  }
  return { opts };
}

async function main() {
  const { opts, error } = parseArgs(process.argv.slice(2));
  if (error) {
    process.stderr.write(`qa-snippets-docscan: ${error}\n`);
    process.exitCode = 2;
    return;
  }
  let base;
  try {
    base = loadBaseEngine(opts.base);
  } catch (e) {
    process.stderr.write(
      `qa-snippets-docscan: cannot read ${opts.base}:${ENGINE_REL}: ${e.message}\n`,
    );
    process.exitCode = 2;
    return;
  }
  try {
    const engineBase = await import(pathToFileURL(base.file).href);
    const engineNow = await import(pathToFileURL(opts.engine).href);
    // extractBlocks comes from the working tree for both, so the two engines see the same blocks.
    const wrap = (eng) => ({
      classifyBlock: eng.classifyBlock,
      extractBlocks: engineNow.extractBlocks,
    });
    const { rows, msBase, msNow } = scanCorpus(
      trackedMarkdown(),
      wrap(engineBase),
      wrap(engineNow),
    );
    const { newlyRunnable, newlyRefused } = diffVerdicts(rows);
    const report = {
      base: opts.base,
      blocks: rows.length,
      runnableBase: rows.filter((r) => r.base === "runnable").length,
      runnableNow: rows.filter((r) => r.now === "runnable").length,
      newlyRunnable,
      newlyRefused,
      ...(opts.time
        ? { msBase: Math.round(msBase), msNow: Math.round(msNow) }
        : {}),
    };
    if (opts.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    else {
      const lines = [
        `blocks ${report.blocks}; runnable on ${opts.base} ${report.runnableBase}, now ${report.runnableNow}`,
        `newly runnable: ${newlyRunnable.length}`,
        ...newlyRunnable.map(
          (r) => `  ${r.file}:${r.line} (${r.base} -> ${r.now})`,
        ),
        `newly refused: ${newlyRefused.length}`,
        ...newlyRefused.map(
          (r) => `  ${r.file}:${r.line} (${r.base} -> ${r.now})`,
        ),
      ];
      if (opts.time)
        lines.push(
          `time: ${opts.base} ${report.msBase} ms, now ${report.msNow} ms`,
        );
      process.stdout.write(lines.join("\n") + "\n");
    }
    process.exitCode = newlyRunnable.length > 0 ? 1 : 0;
  } finally {
    rmSync(base.dir, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
