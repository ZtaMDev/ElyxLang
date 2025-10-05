import Parser from "../frontend/parser.ts";

const src = `x = 3; y = 1; z = -4;`;
const p = new Parser();
const ast = p.produceAST(src);
console.log('OK - parsed with semicolons');
console.log(JSON.stringify(ast, null, 2));
