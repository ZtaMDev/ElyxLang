import Parser from "../frontend/parser.ts";
import { createGlovalEnv } from "../runtime/enviroment.ts";
import { evaluate } from "../runtime/interpreter.ts";

const src = `
func foo() {
  return 42;
}

let v = foo();
print(v);
`;

const p = new Parser();
const env = createGlovalEnv();
const prog = p.produceAST(src);
evaluate(prog, env);
