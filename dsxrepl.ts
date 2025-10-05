#!/usr/bin/env -S deno run --unstable --allow-read --allow-run --allow-env
import { repl } from "./repl.ts";

// Simple wrapper used for building a REPL binary with `deno compile`.
// Running this file will start the REPL.
await repl();
