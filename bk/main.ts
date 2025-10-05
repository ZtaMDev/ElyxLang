import Parser from "./frontend/parser.ts";
import { createGlovalEnv } from "./runtime/enviroment.ts";
import { evaluate } from "./runtime/interpreter.ts";


run("./test.dsx");
//repl()
export async function run(filename:string) {
    const parser = new Parser();
    const env = createGlovalEnv();
    console.log(`Running ${filename}`);

    const input = await Deno.readTextFile(filename);
    const program = parser.produceAST(input);
    // deno-lint-ignore no-unused-vars
    const result = evaluate(program, env);
    //console.log(result);

}