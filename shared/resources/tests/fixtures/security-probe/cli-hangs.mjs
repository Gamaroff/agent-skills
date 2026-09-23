#!/usr/bin/env node
/** A CLI that never exits — the engine's timeout must turn it into `errored`. */
setInterval(() => {}, 1000);
