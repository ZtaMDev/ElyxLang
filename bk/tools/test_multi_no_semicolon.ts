import Parser from "../frontend/parser.ts";

const src = `x = 3 y = 1 z = -4`;
const p = new Parser();
try {
  p.produceAST(src);
  console.error('ERROR: parser should have failed for multiple statements without semicolons');
} catch (e) {
  console.log('Expected failure:', e);
}
