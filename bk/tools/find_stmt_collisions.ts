import { tokenize, TokenType } from '../frontend/lexer.ts';
const src = await Deno.readTextFile(Deno.args[0] || './test.dsx');
const tokens = tokenize(src);

function isStartNewStmt(t: number) {
  return t === TokenType.Let || t === TokenType.Const || t === TokenType.Func || t === TokenType.Identifier || t === TokenType.Number || t === TokenType.OpenParen || t === TokenType.OpenBrace;
}

for (let i=0;i<tokens.length-1;i++) {
  const cur = tokens[i];
  const next = tokens[i+1];
  if (cur.type !== TokenType.Semicolon && cur.type !== TokenType.Newline && cur.type !== TokenType.EOF) {
    if (isStartNewStmt(next.type)) {
      // but if there is a Newline or Semicolon anywhere between i and i+1? there is none
      console.log('Potential collision at token index', i, cur, '->', next);
    }
  }
}

console.log('done');
