/**
 * Is a bundled copy under `skills/<skill>/references/` in sync with its shared
 * source? Answered by the bundler itself — `bundle_skill.py --check`, the single
 * definition of "in sync" — rather than by a test-local normaliser.
 *
 * Two eval tests used to undo the bundler's rewrite by hand (`references/` →
 * `shared/resources/`, drop the banner) and compare bytes. That stopped being a
 * faithful inverse when task.108 taught the bundler to re-relativise every
 * other prose link in a copy (a `../../docs/…` target becomes an upstream URL),
 * and would stop again the next time the rewrite grows. A helper that asks the
 * bundler cannot drift from the bundler.
 *
 * `--check` is read-only and cheap (one skill: well under a second). Results
 * are memoised per skill for the life of the process.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, "..", "..", "..");
export const BUNDLER = join(
  repoRoot,
  "skills",
  "create-skill",
  "scripts",
  "bundle_skill.py",
);

const cache = new Map();

/**
 * Run `bundle_skill.py --check <skillDir>`. Returns
 * `{ ran, ok, problems: Map<referencesRelativePath, "KLASS: detail">, stdout }`.
 *
 * Two different questions, two flags:
 *   - `ran`  — the bundler executed AND resolved the skill (it printed its
 *              freshness summary line). False when python3 is missing, the
 *              spawn failed, or the skill could not be resolved.
 *   - `ok`   — `ran` AND it reported zero problems for the whole skill.
 *
 * A per-copy question (`isFreshBundledCopy`) reads `ran` and then its own
 * entry in `problems`; a whole-skill question (the finalise prompt test) reads
 * `ok`. Conflating the two made one stale sibling de-allowlist a fresh copy
 * with a message that pointed at the MCP rule rather than the stale file.
 */
export function bundleCheck(skillDir, { python = "python3" } = {}) {
  const key = `${python}\u0000${resolve(skillDir)}`;
  if (cache.has(key)) return cache.get(key);
  let stdout = "";
  let spawned = true;
  try {
    stdout = execFileSync(python, [BUNDLER, "--check", resolve(skillDir)], {
      encoding: "utf-8",
      cwd: repoRoot,
    });
  } catch (err) {
    // A non-zero exit still means the bundler RAN (it exits 1 on problems);
    // a missing binary or an unresolvable skill prints no summary line.
    spawned = err.code !== "ENOENT";
    stdout = `${err.stdout || ""}${err.stderr || ""}`;
  }
  // Problem lines are printed as `  KLASS        references/<rel> — detail`.
  const problems = new Map();
  for (const line of stdout.split("\n")) {
    const m = /^\s+([A-Z][A-Z ]*?)\s+references\/(\S+) — (.*)$/.exec(line);
    if (m) problems.set(m[2], `${m[1]}: ${m[3]}`);
  }
  // Both the clean and the problems form print a `bundle freshness:` summary;
  // an unresolvable target prints it too, with a `could not be resolved`
  // trailer — so that trailer is what distinguishes "ran" from "could not".
  const ran =
    spawned &&
    /bundle freshness: /.test(stdout) &&
    !/could not be resolved as skills/.test(stdout);
  const result = { ran, ok: ran && problems.size === 0, problems, stdout };
  cache.set(key, result);
  return result;
}

/**
 * The `shared/resources/<name>` a bundled copy declares in its banner, or null
 * when the file carries no banner (it is not bundler output).
 */
export function declaredSource(file) {
  // The banner sits AFTER the YAML frontmatter, whose `description:` can run
  // to several hundred characters — read a generous head, not the first line.
  const head = readFileSync(file, "utf-8").slice(0, 4000);
  const m =
    /AUTO-GENERATED — DO NOT EDIT\. Source: shared\/resources\/(\S+?)\.\s/.exec(
      head,
    );
  return m ? m[1] : null;
}

/**
 * True when `file` is a bundled copy of `shared/resources/<source>` that the
 * bundler certifies as in sync — by CONTENT (its banner names the source and
 * `--check` finds nothing wrong with it), never by filename alone.
 *
 * Fails CLOSED. `ran` is consulted, not only `problems`: when the bundler could
 * not run at all (no `python3`, ENOENT) or could not resolve the skill,
 * `problems` is empty for the wrong reason, and a copy nobody could look at is
 * not fresh. It reads `ran` rather than `ok` so that a stale UNRELATED sibling
 * does not de-allowlist a fresh copy (that whole-skill question belongs to
 * `ok`, which the finalise prompt test asserts separately). The first cut of
 * this helper returned `!problems.has(rel)` alone, which certified every
 * banner-carrying copy on exactly the runner that could not check any of them
 * (task.108 QA cycle 1, CR-1).
 */
export function isFreshBundledCopy(file, source, opts = {}) {
  const abs = resolve(file);
  const parts = abs.split(sep);
  const i = parts.lastIndexOf("references");
  if (i < 1) return false;
  const skillDir = parts.slice(0, i).join(sep);
  const rel = parts.slice(i + 1).join("/");
  if (declaredSource(abs) !== source) return false;
  const { ran, problems } = bundleCheck(skillDir, opts);
  return ran && !problems.has(rel);
}
