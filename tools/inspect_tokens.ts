import { tokenize, TokenType } from "../frontend/lexer.ts";
const txt = await Deno.readTextFile('./test.dsx');
const toks = tokenize(txt);
for (const t of toks) {
  console.log(TokenType[t.type], t.value);
}
