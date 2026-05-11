"use strict";
/**
 * Driver contract for skill eval backends.
 *
 * Drivers own *invocation* — how an agent is launched, how skills are
 * discovered, how Q&A is intercepted. Everything else (sandboxing, fixture
 * copying, assertion eval) lives in runner.mjs and is driver-agnostic.
 *
 * @typedef {Object} DriverContext
 * @property {string}                       sandbox    absolute path; agent cwd
 * @property {string}                       skill      skill name (e.g. "create-task")
 * @property {string}                       skillRoot  absolute path to skills/<skill>/
 * @property {string}                       prompt     user-facing instruction
 * @property {Array<{matches:string,answer:string}>} answers  scripted Q&A queue
 * @property {Object<string,string>}        env        env vars (DRY_RUN, …)
 *
 * @typedef {Object} DriverResult
 * @property {Array<{matches:string,answer:string}>} remainingAnswers  unconsumed scripted entries
 *
 * @typedef {Object} AvailabilityResult
 * @property {boolean} ok
 * @property {string}  [reason]   present iff ok === false
 *
 * @typedef {Object} AgentDriver
 * @property {string}                                 name
 * @property {() => Promise<AvailabilityResult>}      isAvailable
 * @property {(ctx: DriverContext) => Promise<DriverResult>} run
 */

export {};
