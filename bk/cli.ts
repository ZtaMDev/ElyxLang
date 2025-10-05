#!/usr/bin/env -S deno run --unstable
import Parser from "./frontend/parser.ts";
import { createGlovalEnv } from "./runtime/enviroment.ts";
import { evaluate } from "./runtime/interpreter.ts";
import { repl as replRun } from "./repl.ts";

const VERSION = "0.1.0";

async function runFile(path: string) {
  const parser = new Parser();
  const env = createGlovalEnv();
  console.log(`Running ${path}`);
  const input = await Deno.readTextFile(path);
  const program = parser.produceAST(input);
  evaluate(program, env);
}

async function main() {
  const args = Deno.args;
  if (args.length === 0) {
    console.log("Usage: dsx <file.dsx> | dsx repl | dsx --version");
    Deno.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log(`Elyx ${VERSION}`);
    Deno.exit(0);
  }

  if (args[0] === "repl") {
    await replRun();
    return;
  }

  // assume file
  await runFile(args[0]);
}

if (import.meta.main) await main();
