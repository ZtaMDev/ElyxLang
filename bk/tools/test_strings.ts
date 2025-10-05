import Parser from "../frontend/parser.ts";
import { createGlovalEnv } from "../runtime/enviroment.ts";
import { evaluate } from "../runtime/interpreter.ts";

const src = `
let name = "World";
let x = 5;
print(f"Hello {name}, x={x}");
print(format("Hi {} {}", name, x));
`;

const parser = new Parser();
const env = createGlovalEnv();
const program = parser.produceAST(src);
evaluate(program, env);
