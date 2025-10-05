import { tokenize } from '../frontend/lexer.ts';
const args = Deno.args;
if (args.length < 1) {
  console.log('Usage: deno run --allow-read tools/show_tokens_at.ts <file>');
  Deno.exit(1);
}
const src = await Deno.readTextFile(args[0]);
const tokens = tokenize(src);
for (let i=0;i<tokens.length;i++) {
  console.log(i, tokens[i]);
}
