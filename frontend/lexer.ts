
export enum TokenType {
    Number,
    Identifier,
    Let,
    Const,
    Func,
    Return,
    If,
    For,
    While,
    Break,
    Continue,
    Of,
    Class,
    Extends,
    Try,
    Catch,
    Finally,
    Throw,
    Switch,
    Case,
    Default,
    Else,
    BinaryOperator,
    Equals,
    Coma,
    Dot,
    Colon,
    Semicolon,
    Newline,
    String,
    OpenParen, 
    CloseParen,
    OpenBrace,
    CloseBrace,
    OpenBracket,
    CloseBracket,
    EOF,

}

const KEYWORDS: Record<string, TokenType> = {
    let:TokenType.Let,
    const:TokenType.Const,
    func:TokenType.Func,
    return: TokenType.Return,
    if: TokenType.If,
    for: TokenType.For,
    while: TokenType.While,
    break: TokenType.Break,
    continue: TokenType.Continue,
    of: TokenType.Of,
    class: TokenType.Class,
    extends: TokenType.Extends,
    try: TokenType.Try,
    catch: TokenType.Catch,
    finally: TokenType.Finally,
    throw: TokenType.Throw,
    switch: TokenType.Switch,
    case: TokenType.Case,
    default: TokenType.Default,
    else: TokenType.Else,
}

export interface Token {
    value: string;
    type: TokenType;
}

function token (value = "", type: TokenType): Token {
    return { value, type};
}

function isalpha (src: string) {
    return src.toUpperCase() != src.toLowerCase();
}

function isalnum_or_underscore(ch: string) {
    if (!ch) return false;
    if (ch === '_') return true;
    if (isint(ch)) return true;
    return isalpha(ch);
}

function isskippable (str: string) {
    return str == ' ' || str == '\t' || str == "\r";
}

function isint(str: string) {
    const c = str.charCodeAt(0);
    const bounds = ['0'.charCodeAt(0), '9'.charCodeAt(0)];
    return (c >= bounds[0] && c <= bounds[1]);
}

export function tokenize (sourceCode: string): Token[] {
    const tokens = new Array<Token>();
    const src = sourceCode.split("");

    //build each token until end of file
    while (src.length > 0) {
        if (src[0] ==  '(') {
            tokens.push(token(src.shift(), TokenType.OpenParen));
        } else if (src[0] ==  ')') {
            tokens.push(token(src.shift(), TokenType.CloseParen));
        } else if (src[0] ==  '{') {
            tokens.push(token(src.shift(), TokenType.OpenBrace)); 
        } else if (src[0] ==  '}') {
            tokens.push(token(src.shift(), TokenType.CloseBrace)); 
        } else if (src[0] ==  '[') {
            tokens.push(token(src.shift(), TokenType.OpenBracket)); 
        } else if (src[0] ==  ']') {
            tokens.push(token(src.shift(), TokenType.CloseBracket)); 
        } else if (src[0] == "/" && src[1] == "/") {
            // line comment // ... skip until newline
            src.shift(); src.shift();
            while (src.length > 0) {
                const ch = src.shift();
                if (ch == '\n') break;
            }
        } else if (src[0] == "/" && src[1] == "*") {
            // block comment /* ... */
            src.shift(); src.shift();
            while (src.length > 1) {
                const a = src.shift();
                const b = src[0];
                if (a == '*' && b == '/') { src.shift(); break; }
            }
        } else if (src[0] == "+" || src[0] == "-" || src[0] == "*" || src[0] == "/" ||
            src[0] == "%"
        ) { tokens.push(token(src.shift(), TokenType.BinaryOperator));
        } else if (src[0] == "=") {
            // could be == or =
            src.shift();
            if (src[0] == "=") {
                src.shift();
                tokens.push(token("==", TokenType.BinaryOperator));
            } else {
                tokens.push(token("=", TokenType.Equals));
            }
        } else if (src[0] == ">" || src[0] == "<" || src[0] == "!") {
            // relational or not-equals: > < >= <= !=
            const first = src.shift() as string;
            // Avoid TypeScript narrowing of src[0] (it was previously narrowed to '>'|'<'|'!')
            // Read the next character into a temp variable and compare that.
            const nextChar = src.length > 0 ? src[0] : undefined;
            if (String(nextChar) === "=") {
                const second = src.shift();
                tokens.push(token(first + second, TokenType.BinaryOperator));
            } else {
                tokens.push(token(first, TokenType.BinaryOperator));
            }
        } else if (src[0] == ";") {
            tokens.push(token(src.shift(), TokenType.Semicolon));
        } else if (src[0] == '\n') {
            // Emit explicit Newline tokens so parser can distinguish line breaks
            tokens.push(token(src.shift(), TokenType.Newline));
        } else if (src[0] == ":") {
            tokens.push(token(src.shift(), TokenType.Colon));
        } else if (src[0] == '"' || src[0] == "'" || ((src[0] == 'f' || src[0] == 'F') && (src[1] == '"' || src[1] == "'"))) {
            // string literal; support optional f prefix for f-strings
            let isF = false;
            if ((src[0] == 'f' || src[0] == 'F') && (src[1] == '"' || src[1] == "'")) {
                isF = true;
                src.shift(); // consume f
            }

            const quote = src.shift();
            // check for triple-quote
            let isTriple = false;
            if (src[0] == quote && src[1] == quote) {
                isTriple = true;
                src.shift(); src.shift(); // consume two more quotes
            }

            let str = "";
            while (src.length > 0) {
                if (!isTriple && src[0] == quote) {
                    src.shift();
                    break;
                }
                if (isTriple && src[0] == quote && src[1] == quote && src[2] == quote) {
                    src.shift(); src.shift(); src.shift();
                    break;
                }

                const ch = src.shift();
                if (ch == "\\") {
                    // escape sequence
                    const next = src.shift();
                    if (next == 'n') str += '\n';
                    else if (next == 't') str += '\t';
                    else if (next == 'r') str += '\r';
                    else if (next == '"') str += '"';
                    else if (next == "'") str += "'";
                    else if (next == "\\") str += "\\";
                    else str += next;
                } else {
                    str += ch;
                }
            }

            const prefix = isF ? 'f:' : 's:';
            tokens.push(token(prefix + str, TokenType.String));
        } else if (src[0] == ",") {
            tokens.push(token(src.shift(), TokenType.Coma));
        } else if (src[0] == ".") {
            // If this is a leading-dot number like `.5`, parse as Number token
            if (src.length > 1 && isint(src[1])) {
                let num = "";
                // treat leading '.' as '0.' followed by digits
                num += '0.';
                src.shift(); // consume '.'
                while (src.length > 0 && isint(src[0])) {
                    num += src.shift();
                }
                tokens.push(token(num, TokenType.Number));
            } else {
                tokens.push(token(src.shift(), TokenType.Dot));
            }
        } else {
            // handle multicahaacter tokens

                //number token (support decimals like 3.14)
                if (isint(src[0])) {
                    let num = "";
                    while (src.length> 0 && isint(src[0])) {
                        num += src.shift();
                    }
                    // fractional part
                    if (src[0] == '.' && src.length > 1 && isint(src[1])) {
                        num += src.shift(); // consume '.'
                        while (src.length > 0 && isint(src[0])) {
                            num += src.shift();
                        }
                    }

                    tokens.push(token(num, TokenType.Number))
                } else if (isalpha(src[0])) {
                let ident = ""; // foo let
                while (src.length> 0 && isalnum_or_underscore(src[0])) {
                    ident += src.shift();
                }
                //check for keywords
                const reserved = KEYWORDS[ident];
                if (typeof reserved == "number") {
                    tokens.push(token(ident, reserved));
                } else {
                    tokens.push(token(ident, TokenType.Identifier));
                }
            } else if (isskippable(src[0])) {
                src.shift(); //SKIP THE CURRENT CHARACTER
            } else {
                throw new Error('Unrecognized character found in source: ' + src[0]);
            }
        }
    }
    tokens.push({type: TokenType.EOF, value: "EndOfFile"});
    return tokens
}

//const source = await Deno.readTextFile("./test.txt");
//for (const token of tokenize(source)) {
//    console.log(token);
//}