import Parser from "../frontend/parser.ts";
import { createGlovalEnv } from "../runtime/enviroment.ts";
import { evaluate } from "../runtime/interpreter.ts";

function runTest(code: string) {
  const p = new Parser();
  const env = createGlovalEnv();
  const prog = p.produceAST(code);
  evaluate(prog, env);
  return env;
}

// Simple tests
runTest(`let a = []; if (a) { print("truthy") } else { print("falsy") }`);
console.log('--- test1 done');

runTest(`let a = []; if (a) print("truthy single") else print("falsy single")`);
console.log('--- test2 done');

runTest(`let s = ""; if (s) print("s truthy") else print("s falsy")`);
console.log('--- test3 done');

// builtins
runTest(`print("join", "with", "sep", { sep: "," })`);
console.log('--- test4 done');

runTest(`let arr = [1,2,3]
print(len(arr))
print(len("hi"))`);
console.log('--- test5 done');

console.log('All quick tests executed');
