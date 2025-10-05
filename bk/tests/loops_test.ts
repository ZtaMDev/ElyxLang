import { assertEquals } from "https://deno.land/std@0.201.0/testing/asserts.ts";
import Parser from "../frontend/parser.ts";
import { createGlovalEnv } from "../runtime/enviroment.ts";
import { evaluate } from "../runtime/interpreter.ts";
import { NumberVal, ArrayVal, RuntimeVal } from "../runtime/values.ts";

function runSource(src: string) {
  const p = new Parser();
  const prog = p.produceAST(src);
  const env = createGlovalEnv();
  const _res = evaluate(prog, env);
  return { env };
}

Deno.test("for loop sums", () => {
  const src = `let sum = 0\nfor (let i = 0; i < 5; i = i + 1) { sum = sum + i }\nsum`;
  const { env } = runSource(src);
  const sum = env.lookupVar("sum") as NumberVal;
  assertEquals(sum.type, 'number');
  assertEquals(sum.value, 10);
});

Deno.test("while loop countdown", () => {
  const src = `let out = []\nlet c = 3\nwhile (c > 0) { out.push(c); c = c - 1 }\nout`;
  const { env } = runSource(src);
  const out = env.lookupVar('out') as ArrayVal;
  assertEquals(out.type, 'array');
  const items = out.elements.map((x: RuntimeVal) => (x as NumberVal).value);
  assertEquals(items, [3,2,1]);
});

Deno.test("for-of over array", () => {
  const src = `let arr = [10,20,30]\nlet sum = 0\nfor (let v of arr) { sum = sum + v }\nsum`;
  const { env } = runSource(src);
  const sum = env.lookupVar('sum') as NumberVal;
  assertEquals(sum.value, 60);
});

Deno.test("break and continue in loops", () => {
  const src = `let out = []\nfor (let i = 0; i < 5; i = i + 1) { if (i == 2) continue; if (i == 4) break; out.push(i) }\nout`;
  const { env } = runSource(src);
  const out = env.lookupVar('out') as ArrayVal;
  const items = out.elements.map((x: RuntimeVal) => (x as NumberVal).value);
  // expected pushed: 0,1,3
  assertEquals(items, [0,1,3]);
});
