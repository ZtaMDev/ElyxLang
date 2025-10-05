import Parser from "../frontend/parser.ts";

const source = `45 - fooBar * (x + y)`;

const parser = new Parser();
const ast = parser.produceAST(source);

console.log('--- console.log(ast) output ---');
console.log(ast);

console.log('\n--- JSON.stringify(ast, null, 2) output ---');
console.log(JSON.stringify(ast, null, 2));
