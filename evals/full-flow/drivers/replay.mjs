"use strict";
/**
 * Replay driver — copies a scenario's pre-captured fixture tree into the
 * sandbox. No agent invoked. Exercises the assertion harness + CI gate
 * without needing model access or API keys.
 *
 * Fixtures live at scenarios/<name>/replay/** and mirror the sandbox layout.
 *
 * @type {import("./types.mjs").AgentDriver}
 */
import fs from "node:fs";
import path from "node:path";

function copyTree(src, dst) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyTree(s, d);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

const driver = {
  name: "replay",

  async isAvailable() {
    return { ok: true };
  },

  async run(ctx) {
    // scenarioDir is not on DriverContext — runner passes replaySrc via env.
    // To keep the driver self-contained, we resolve replay/ relative to the
    // scenario dir the runner stamped into ctx.env.SCENARIO_DIR.
    const scenarioDir = ctx.env.SCENARIO_DIR;
    if (!scenarioDir) {
      throw new Error("replay driver: ctx.env.SCENARIO_DIR not set by runner");
    }
    copyTree(path.join(scenarioDir, "replay"), ctx.sandbox);
    return { remainingAnswers: [] };
  },
};

export default driver;
