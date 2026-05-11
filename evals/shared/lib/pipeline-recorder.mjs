"use strict";
/**
 * Pipeline-recorder — wraps an AgentDriver and intercepts Skill tool-use
 * events so callers can assert which sub-skills were invoked and in what order.
 *
 * Public API:
 *   wrapDriver(driver) -> { driver: WrappedDriver, events: RecordedEvent[] }
 *
 * RecordedEvent: { skill: string, args: string|undefined, status: "started", timestamp: number }
 *
 * Usage:
 *   const { driver: wrapped, events } = wrapDriver(baseDriver);
 *   await wrapped.run(ctx);
 *   // events now contains one entry per Skill tool-use observed in the transcript
 */

/**
 * @param {import("../drivers/types.mjs").AgentDriver} driver
 * @returns {{ driver: AgentDriver, events: RecordedEvent[] }}
 */
export function wrapDriver(driver) {
  /** @type {RecordedEvent[]} */
  const events = [];

  const wrappedDriver = {
    name: `recorded(${driver.name})`,

    async isAvailable() {
      return driver.isAvailable();
    },

    async run(ctx) {
      const originalOnToolUse = ctx.onToolUse;

      const intercepted = {
        ...ctx,
        onToolUse: (event) => {
          if (event && event.tool === "Skill") {
            events.push({
              skill: event.input?.skill ?? "(unknown)",
              args: event.input?.args,
              status: "started",
              timestamp: Date.now(),
            });
          }
          return originalOnToolUse?.(event);
        },
      };

      return driver.run(intercepted);
    },
  };

  return { driver: wrappedDriver, events };
}

/**
 * @typedef {object} RecordedEvent
 * @property {string}  skill      - The skill name passed to the Skill tool
 * @property {string|undefined} args - Raw args string, if any
 * @property {"started"} status   - Always "started" (tool invocation observed)
 * @property {number}  timestamp  - ms since epoch
 */
