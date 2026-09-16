/**
 * Behavioural checks for the develop-pipeline hook WRAPPERS.
 *
 * WHY THIS EXISTS
 * ---------------
 * `skills/develop-{story,task,bug}/scripts/{install-hooks,on-precompact,on-stop}.sh`
 * are one-line wrappers — `exec "$(dirname "$0")/../references/develop-pipeline-<name>.sh" "$@"`
 * — over the shared scripts, which are tested. The wrappers themselves were
 * tested by nothing. `evals/develop-story/protocol/install-hooks-behavior.test.mjs`
 * looked like it covered develop-story's set, and task 111 was filed on that
 * reading; it does not — that test runs the shared INSTALLER against a sandbox
 * in which the hook scripts are stubs it writes itself, so no wrapper under
 * `skills/` is ever executed. A wrapper whose `exec` target moved, or that
 * dropped `"$@"`, would break every hook fire for that pipeline and stay green.
 *
 * WHAT IS ASSERTED, PER WRAPPER
 * -----------------------------
 *   1. The `exec` target `skills/<pipeline>/references/develop-pipeline-<name>.sh`
 *      exists in the real tree (a wrapper pointing at nothing).
 *   2. Behaviourally, in a sandbox where the reference is a stub: argv reaches
 *      the target intact (including an argument with a space), stdin reaches it
 *      (hooks read a JSON event there), the target's exit status propagates,
 *      and the target runs IN the wrapper's process — the stub's `$$` equals
 *      the pid that was spawned. Dropping `"$@"` fails the argv assertion;
 *      dropping `exec` fails the pid assertion (a non-exec child still
 *      propagates argv, stdin and exit status, so those three alone could not
 *      tell — QA cycle 2, CR-3).
 *
 * The population is ENUMERATED FROM THE TREE, never typed: every
 * `skills/develop-*` directory with a `scripts/` dir is a pipeline, and every
 * `*.sh` in that dir is a wrapper. A floor of three pipelines × three wrappers
 * guards the enumeration itself — a glob that matches nothing passes vacuously,
 * and a vacuous pass is what this file replaces.
 *
 * Hermetic: bash only, no network, no model calls, no real hook is executed.
 *
 * Run: node --test evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs
 * Mutation that must go red: drop `"$@"` from
 * skills/develop-task/scripts/on-stop.sh → fails naming develop-task/on-stop.sh.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SKILLS = path.join(REPO_ROOT, "skills");

const MIN_PIPELINES = 3;
const MIN_WRAPPERS_PER_PIPELINE = 3;
const STUB_EXIT = 7;
const STDIN_EVENT = '{"hook_event_name":"Stop","session_id":"t111"}';

/** Every develop-* skill that ships a scripts/ dir, with its *.sh wrappers. */
function enumerateWrappers() {
  return readdirSync(SKILLS)
    .filter((d) => d.startsWith("develop-"))
    .map((pipeline) => {
      const scriptsDir = path.join(SKILLS, pipeline, "scripts");
      if (!existsSync(scriptsDir) || !statSync(scriptsDir).isDirectory())
        return null;
      const wrappers = readdirSync(scriptsDir).filter((f) => f.endsWith(".sh"));
      return wrappers.length ? { pipeline, scriptsDir, wrappers } : null;
    })
    .filter(Boolean);
}

/** The `../references/<target>` a wrapper execs, parsed from its own source. */
function execTargetOf(wrapperPath) {
  const src = readFileSync(wrapperPath, "utf-8");
  const m = src.match(
    /exec\s+"\$\(dirname\s+"\$0"\)\/\.\.\/references\/([A-Za-z0-9._-]+\.sh)"/,
  );
  return m ? m[1] : null;
}

/**
 * A sandbox with the wrapper copied to the same relative depth
 * (skills/<pipeline>/scripts/<wrapper>) and a stub planted at the exec target
 * (skills/<pipeline>/references/<target>) that echoes what it received and
 * exits STUB_EXIT.
 */
function makeSandbox(t, pipeline, wrapperPath, wrapper, target) {
  const dir = mkdtempSync(path.join(tmpdir(), "agent-skills-wrappers-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const scripts = path.join(dir, "skills", pipeline, "scripts");
  const refs = path.join(dir, "skills", pipeline, "references");
  mkdirSync(scripts, { recursive: true });
  mkdirSync(refs, { recursive: true });
  const sbWrapper = path.join(scripts, wrapper);
  copyFileSync(wrapperPath, sbWrapper);
  chmodSync(sbWrapper, 0o755);
  const stub = path.join(refs, target);
  writeFileSync(
    stub,
    [
      "#!/usr/bin/env bash",
      // $$ is the stub's own pid. Under `exec` the wrapper's process IS the
      // stub, so this equals the pid spawnSync started; without exec the stub
      // is a child and the two differ. That is what makes "drop exec" red.
      'printf "PID=%s\\n" "$$"',
      'printf "ARGC=%s\\n" "$#"',
      'for a in "$@"; do printf "ARG=[%s]\\n" "$a"; done',
      'printf "STDIN=%s\\n" "$(cat)"',
      `exit ${STUB_EXIT}`,
      "",
    ].join("\n"),
  );
  chmodSync(stub, 0o755);
  return sbWrapper;
}

const pipelines = enumerateWrappers();

test("the wrapper population is enumerated from the tree and meets the floor", () => {
  assert.ok(
    pipelines.length >= MIN_PIPELINES,
    `expected at least ${MIN_PIPELINES} develop-* pipelines with scripts/, found ` +
      `${pipelines.length}: ${pipelines.map((p) => p.pipeline).join(", ") || "(none)"}`,
  );
  for (const p of pipelines) {
    assert.ok(
      p.wrappers.length >= MIN_WRAPPERS_PER_PIPELINE,
      `${p.pipeline}/scripts/ has ${p.wrappers.length} wrapper(s), expected at least ` +
        `${MIN_WRAPPERS_PER_PIPELINE}: ${p.wrappers.join(", ")}`,
    );
  }
});

for (const { pipeline, scriptsDir, wrappers } of pipelines) {
  for (const wrapper of wrappers) {
    const wrapperPath = path.join(scriptsDir, wrapper);
    const label = `${pipeline}/${wrapper}`;

    test(`${label} — execs an existing ../references/ target`, () => {
      const target = execTargetOf(wrapperPath);
      assert.ok(
        target !== null,
        `${label} does not exec "$(dirname "$0")/../references/<script>.sh" — ` +
          "it is not a delegating wrapper (or the form changed; update execTargetOf). " +
          'The "$@" pass-through is asserted behaviourally by the sibling test.',
      );
      const real = path.join(SKILLS, pipeline, "references", target);
      assert.ok(
        existsSync(real),
        `${label} execs ../references/${target}, which does not exist in the tree ` +
          "(run `npm run bundle`, or the shared script was renamed)",
      );
    });

    test(`${label} — argv, stdin and exit status pass through the exec`, (t) => {
      const target = execTargetOf(wrapperPath);
      // `t.skip()` marks the test skipped but does NOT stop the function —
      // without the return, execution continued into makeSandbox(..., null)
      // and the "skip" was reported as a failure (QA cycle 1, CR-1).
      if (target === null)
        return t.skip("not a delegating wrapper — covered above");
      const sbWrapper = makeSandbox(t, pipeline, wrapperPath, wrapper, target);

      const args = ["--skill", pipeline, "an argument with spaces"];
      const res = spawnSync("bash", [sbWrapper, ...args], {
        input: STDIN_EVENT,
        encoding: "utf-8",
        // A cwd that is NOT the sandbox root: the wrapper must resolve its
        // target from its own location ($0), never from the caller's cwd.
        cwd: tmpdir(),
      });

      assert.match(
        res.stdout,
        new RegExp(`^PID=${res.pid}$`, "m"),
        `${label}: the target must run in the wrapper's own process (exec dropped?)\n${res.stdout}`,
      );
      assert.equal(
        res.status,
        STUB_EXIT,
        `${label}: exit status must propagate from the exec target ` +
          `(got ${res.status}; stderr: ${res.stderr.trim()})`,
      );
      assert.match(
        res.stdout,
        new RegExp(`^ARGC=${args.length}$`, "m"),
        `${label}: expected ${args.length} arguments to reach the target`,
      );
      for (const a of args) {
        assert.ok(
          res.stdout.includes(`ARG=[${a}]\n`),
          `${label}: argument ${JSON.stringify(a)} did not reach the target intact ` +
            `("$@" dropped or unquoted?)\n${res.stdout}`,
        );
      }
      assert.ok(
        res.stdout.includes(`STDIN=${STDIN_EVENT}\n`),
        `${label}: stdin did not reach the target (hooks read the event there)\n${res.stdout}`,
      );
    });
  }
}
