#!/usr/bin/env node
/**
 * review-prd — migration guard (task 204, QA cycle 8).
 *
 * Reads the numbering migration's plan (`migrate-doc-numbering.mjs --check --json`) on stdin and
 * refuses the shapes the migration cannot carry through safely yet. Each refusal is a blocker with
 * the same shape as the engine's own, so review-prd reports it and offers no apply:
 *
 *   no-frontmatter   a PRD to be moved has no frontmatter block, so the number cannot be written
 *                    into it and the apply would fail its own post-check after moving files
 *   no-domain        the PRD would land directly under the PRD root, a layout create-prd refuses
 *   outside-links    files outside the PRD root name a PRD file that sits outside it (a root-level
 *                    docs/prd.md); the migration does not re-point them, so they would go dead
 *
 * Usage:  migration-guard.mjs --root <PRD_ROOT>  < plan.json
 * Prints JSON {reason: "ok" | "blocked" | "usage", blockers: [...]}; exit 0 ok, 1 blocked, 2 usage.
 * Run from the repository root. Reads files; writes nothing.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { inRewriteScope } from "../references/migrate-doc-numbering.mjs";

// Every exit goes through main()'s return, so stdout drains before the process ends: the
// result is written once below and the status set with process.exitCode, never process.exit
// straight after a write (the stdout-drain-on-exit test).
const out = (o, code) => ({ o, code });

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--root");
  const root = i >= 0 ? argv[i + 1] : "";
  if (!root || argv.length !== 2)
    return out(
      {
        reason: "usage",
        error: "usage: migration-guard.mjs --root <PRD_ROOT> < plan.json",
      },
      2,
    );

  let plan;
  try {
    plan = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return out(
      { reason: "usage", error: "stdin is not the migration plan's JSON" },
      2,
    );
  }
  if (!Array.isArray(plan.mapping))
    return out({ reason: "usage", error: "the plan carries no mapping[]" }, 2);

  const rootAbs = path.resolve(root);
  const inRoot = (p) => path.resolve(p).startsWith(rootAbs + path.sep);
  const blockers = [];

  for (const m of plan.mapping) {
    if (m.kind !== "prd") continue;
    // no-frontmatter — the engine edits prd_number into an existing block and never creates one.
    const text = existsSync(m.old) ? readFileSync(m.old, "utf8") : "";
    // An opening fence with no closing one is no block either.
    if (!/^---[ \t]*\r?\n(?:.*\r?\n)*?---[ \t]*(?:\r?\n|$)/.test(text)) {
      blockers.push({
        code: "no-frontmatter",
        path: m.old,
        detail:
          "has no closed frontmatter block, so the migration cannot write its number — add one (---, type: prd, ---) and plan again",
      });
    }
    // no-domain — create-prd's layout is {domain}/prd.{P}.{feature}/prd.{P}.{feature}.md.
    const rel = path.relative(rootAbs, path.resolve(m.new)).split(path.sep);
    if (rel.length !== 3) {
      blockers.push({
        code: "no-domain",
        path: m.old,
        detail: `would land at ${m.new}, outside a domain directory — move it to ${root}/{domain}/prd.{slug}.md by hand (git mv) and plan again`,
      });
    }
    // outside-links — only a source outside the root can be named by files the engine never reads.
    // Fail closed, by design a stopgap until task.211 makes the engine re-point these: any file
    // that MENTIONS the PRD's basename and sits where the run rewrites (inRewriteScope, the
    // engine's own rule — not history, a fixture, a bundled or vendored copy) blocks the offer.
    // No reference parser: two cycles of one (QA cycles 9–10) each found a way it read a real
    // reference as none, or ran in quadratic time. The search is a fixed string; -z keeps a name
    // with non-ASCII characters or quotes unquoted, so every listed file is the real path.
    if (!inRoot(m.old)) {
      const target = path.normalize(m.old);
      const g = spawnSync(
        "git",
        ["grep", "-l", "-z", "-F", "-e", path.basename(target), "--", "."],
        { encoding: "utf8" },
      );
      if (g.status !== 0 && g.status !== 1) {
        blockers.push({
          code: "outside-links",
          path: m.old,
          detail: "could not search for references to it (git grep failed)",
        });
      } else {
        const files = g.stdout
          .split("\0")
          .filter(Boolean)
          .filter((f) => f !== target && !inRoot(f) && inRewriteScope(f));
        if (files.length) {
          blockers.push({
            code: "outside-links",
            path: m.old,
            detail: `mentioned by ${files.length} file(s) outside ${root} that the migration would not re-point (${files.slice(0, 5).join(", ")}${files.length > 5 ? ", …" : ""}) — update or remove each mention, or move the PRD by hand`,
          });
        }
      }
    }
  }
  return out(
    { reason: blockers.length ? "blocked" : "ok", blockers },
    blockers.length ? 1 : 0,
  );
}

const { o, code } = main();
process.stdout.write(`${JSON.stringify(o)}\n`);
process.exitCode = code;
