"use strict";
/**
 * The driver a run uses, from an environment: DRIVER wins, then the deprecated MODE=live
 * (claude-sdk) / MODE=replay, else replay. The ONE definition — the runner, repeat.mjs and the
 * fake gh's install all read it here, so what repeat plans for and what the fake installs for are
 * the driver the runner runs (task.186 QA cycles 1 and 2). Its own module, with no imports, because
 * the fake gh's launcher loads fake-gh.mjs on every `gh` call.
 */
export function driverNameFrom(env) {
  if (env.DRIVER) return env.DRIVER;
  if (env.MODE === "live") return "claude-sdk";
  return "replay";
}
