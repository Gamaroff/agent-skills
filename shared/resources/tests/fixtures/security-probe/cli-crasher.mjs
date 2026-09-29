#!/usr/bin/env node
/**
 * A CLI that CRASHES rather than answering — an uncaught error at top level,
 * which Node reports with its `Node.js vX.Y.Z` footer and exit 1. Exit 1 is
 * also what a refusal looks like; the footer is what tells them apart, and a
 * crash must read as "could not look", never as a control that refuses.
 */
throw new Error(`cannot start: ${process.argv.length} args`);
