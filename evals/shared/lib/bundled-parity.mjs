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
const repoRoot = resolve(__dirname, "..", "..", "..");
const BUNDLER = join(
  repoRoot,
  "skills",
  "create-skill",
  "scripts",
  "bundle_skill.py",
);

const cache = new Map();

/**
 * Run `bundle_skill.py --check <skillDir>`. Returns
 * `{ ok, problems: Map<referencesRelativePath, "KLASS: detail"> , stdout }`.
 * `ok` is false when the bundler reported any problem OR could not resolve the
 * skill — an unresolvable skill is not "clean".
 */
export function bundleCheck(skillDir) {
  const key = resolve(skillDir);
  if (cache.has(key)) return cache.get(key);
  let stdout = "";
  let ok = true;
  try {
    stdout = execFileSync("python3", [BUNDLER, "--check", key], {
      encoding: "utf-8",
      cwd: repoRoot,
    });
  } catch (err) {
    ok = false;
    stdout = `${err.stdout || ""}${err.stderr || ""}`;
  }
  // Problem lines are printed as `  KLASS        references/<rel> — detail`.
  const problems = new Map();
  for (const line of stdout.split("\n")) {
    const m = /^\s+([A-Z][A-Z ]*?)\s+references\/(\S+) — (.*)$/.exec(line);
    if (m) problems.set(m[2], `${m[1]}: ${m[3]}`);
  }
  const result = { ok: ok && problems.size === 0, problems, stdout };
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
 */
export function isFreshBundledCopy(file, source) {
  const abs = resolve(file);
  const parts = abs.split(sep);
  const i = parts.lastIndexOf("references");
  if (i < 1) return false;
  const skillDir = parts.slice(0, i).join(sep);
  const rel = parts.slice(i + 1).join("/");
  if (declaredSource(abs) !== source) return false;
  const { problems } = bundleCheck(skillDir);
  return !problems.has(rel);
}
