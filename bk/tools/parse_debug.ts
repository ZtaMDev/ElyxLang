import Parser from "../frontend/parser.ts";
import { tokenize } from "../frontend/lexer.ts";
const txt = await Deno.readTextFile('./test.dsx');
const toks = tokenize(txt);
console.log('TOKENS:');
for (let i=0;i<toks.length;i++) console.log(i, toks[i]);

try {
  const p = new Parser();
  const ast = p.produceAST(txt);
  ast;
  console.log('AST produced OK');
} catch (e) {
  console.error('Parser threw:', e);
}
