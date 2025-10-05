// deno-lint-ignore-file no-explicit-any
import { 
    Stmt, 
    Program, 
    Expr, 
    BinaryExpr, 
    NumericLiteral, 
    Identifier,
    VarDeclaration,
    AssignmentExpr,
    Property,
    ObjectLiteral,
    CallExpr,
    MemberExpr, 
    FunctionDeclaration,
} from "./ast.ts"

import { tokenize, Token, TokenType } from "./lexer.ts";

export default class Parser {
    private tokens: Token[] = [];

    private not_eof (): boolean {
        return this.tokens[0].type != TokenType.EOF;
    }

    private at() {
        return this.tokens[0] as Token;
    }

    private eat() {
        const prev = this.tokens.shift() as Token;
        return prev;
    }

    private expect(type: TokenType, err: any) {
        const prev = this.tokens.shift() as Token;
        if (!prev || prev.type != type) {
            console.error("Parser Error\n", err, prev, " - Expecting: ", type);
            Deno.exit(1);
        }

        return prev;
    }

    public produceAST (sourceCode: string): Program {
        this.tokens = tokenize(sourceCode);
        const program: Program = {
            kind: 'Program',
            body: [],
        };
        //Parse util de file
        // skip any leading newlines
        while (this.at().type == TokenType.Newline) {
            this.eat();
        }

        while (this.not_eof()) {
            // skip any blank lines
            if (this.at().type == TokenType.Newline) {
                this.eat();
                continue;
            }

            // parse one statement
            const stmt = this.parse_stmt();
            program.body.push(stmt);

            // If semicolon(s) follow, consume them and continue (allows multiple statements on same line)
            if (this.at().type == TokenType.Semicolon) {
                while (this.at().type == TokenType.Semicolon) {
                    this.eat();
                }
                // continue to next statement (same line allowed because semicolons were present)
                continue;
            }

            // If newline(s) follow, consume them and continue (new line separates statements)
            if (this.at().type == TokenType.Newline) {
                while (this.at().type == TokenType.Newline) {
                    this.eat();
                }
                continue;
            }

            // If neither semicolon nor newline and another statement appears, it's an error
            if (this.at().type != TokenType.EOF && this.at().type != TokenType.CloseBrace) {
                const t = this.at().type;
                const startsNewStmt = (
                    t == TokenType.Let ||
                    t == TokenType.Const ||
                    t == TokenType.Func ||
                    t == TokenType.Identifier ||
                    t == TokenType.Number ||
                    t == TokenType.OpenParen ||
                    t == TokenType.OpenBrace
                );

                if (startsNewStmt) {
                    console.error("Parser Error: Multiple statements in one line without semicolon aren't allowed.");
                    console.error('Current token:', this.at());
                    // show a little context from upcoming tokens
                    console.error('Next few tokens:', this.tokens.slice(0, 6));
                    Deno.exit(1);
                }
            }
        }
        return program;
    }

    private parse_stmt(): Stmt {
        switch (this.at().type) {
            case TokenType.Let:
            case TokenType.Const:
                return this.parse_var_declaration();
            case TokenType.Func:
                return this.parse_fn_declaration();
            case TokenType.If:
                return this.parse_if_statement();
            case TokenType.Class:
                return this.parse_class_declaration();
            case TokenType.Try:
                return this.parse_try_statement();
            case TokenType.Throw:
                return this.parse_throw_statement();
            case TokenType.Switch:
                return this.parse_switch_statement();
            case TokenType.While:
                return this.parse_while_statement();
            case TokenType.For:
                return this.parse_for_statement();
            case TokenType.Return:
                return this.parse_return_statement();
            case TokenType.Break:
                this.eat();
                // optional semicolon
                if (this.at().type == TokenType.Semicolon) this.eat();
                return { kind: 'BreakStatement' } as any;
            case TokenType.Continue:
                this.eat();
                if (this.at().type == TokenType.Semicolon) this.eat();
                return { kind: 'ContinueStatement' } as any;
            default:
                return this.parse_expr();
        }
    }

    private parse_while_statement(): Stmt {
        this.eat(); // eat 'while'
        let test: Expr;
        if (this.at().type == TokenType.OpenParen) {
            this.eat();
            test = this.parse_expr();
            this.expect(TokenType.CloseParen, "Missing closing parenthesis in while condition");
        } else {
            test = this.parse_expr();
        }

        const body: Stmt[] = [];
        if (this.at().type == TokenType.OpenBrace) {
            this.eat();
            while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                    if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                    body.push(this.parse_stmt());
                    // consume optional trailing semicolons/newlines between statements
                    while (this.at().type == TokenType.Semicolon) this.eat();
                    while (this.at().type == TokenType.Newline) this.eat();
            }
            this.expect(TokenType.CloseBrace, "Missing closing brace for while body");
        } else {
            body.push(this.parse_stmt());
        }

        return { kind: "WhileStatement", test, body } as any;
    }

    private parse_for_statement(): Stmt {
        this.eat(); // eat 'for'
        // optional parentheses
        if (this.at().type == TokenType.OpenParen) this.eat();

        // init: could be let/const declaration or expression (assignment)
        let init: Stmt | undefined = undefined;
        // detect for..of: 'for (let x of iterable)' or 'for (x of iterable)'
        if (this.at().type == TokenType.Let || this.at().type == TokenType.Const) {
            // could be declaration or for-of
            const save = this.tokens.slice();
            const decl = this.parse_var_declaration();
            if (this.at().type == TokenType.Of) {
                // for-of
                // decl must be a VariableDeclaration with identifier
                const ident = (decl as any).identifier;
                this.eat(); // eat 'of'
                const iterable = this.parse_expr();
                // optional closing paren
                if (this.at().type == TokenType.CloseParen) this.eat();
                // parse body
                const body: Stmt[] = [];
                if (this.at().type == TokenType.OpenBrace) {
                    this.eat();
                    while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                        if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                        body.push(this.parse_stmt());
                    }
                    this.expect(TokenType.CloseBrace, "Missing closing brace for for-of body");
                } else {
                    body.push(this.parse_stmt());
                }

                return { kind: 'ForOfStatement', declaration: true, identifier: ident, iterable, body } as any;
            }
            // not for-of, restore tokens and fallthrough to normal init parsing
            this.tokens = save;
            init = this.parse_var_declaration();
        } else if (this.at().type != TokenType.Semicolon) {
            // detect for (x of iterable) pattern where x is an identifier
            if (this.at().type == TokenType.Identifier && this.tokens[1] && this.tokens[1].type == TokenType.Of) {
                const ident = this.eat().value;
                this.eat(); // eat 'of'
                const iterable = this.parse_expr();
                if (this.at().type == TokenType.CloseParen) this.eat();
                const body: Stmt[] = [];
                if (this.at().type == TokenType.OpenBrace) {
                    this.eat();
                    while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                        if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                        body.push(this.parse_stmt());
                    }
                    this.expect(TokenType.CloseBrace, "Missing closing brace for for-of body");
                } else {
                    body.push(this.parse_stmt());
                }
                return { kind: 'ForOfStatement', declaration: false, identifier: ident, iterable, body } as any;
            }

            // parse expression until semicolon
            init = this.parse_expr() as any;
            // if expression ended with semicolon token, consume it
            if (this.at().type == TokenType.Semicolon) this.eat();
        }

        // expect semicolon separator
        if (this.at().type == TokenType.Semicolon) {
            this.eat();
        }

        // test
        let test: Expr | undefined = undefined;
        if (this.at().type != TokenType.Semicolon) {
            test = this.parse_expr();
        }
        // consume semicolon
        if (this.at().type == TokenType.Semicolon) this.eat();

        // update
        let update: Expr | undefined = undefined;
        if (this.at().type != TokenType.CloseParen && this.at().type != TokenType.OpenBrace) {
            update = this.parse_expr();
        }

        // optional closing paren
        if (this.at().type == TokenType.CloseParen) this.eat();

        const body: Stmt[] = [];
        if (this.at().type == TokenType.OpenBrace) {
            this.eat();
            while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                body.push(this.parse_stmt());
                while (this.at().type == TokenType.Semicolon) this.eat();
                while (this.at().type == TokenType.Newline) this.eat();
            }
            this.expect(TokenType.CloseBrace, "Missing closing brace for for body");
        } else {
            body.push(this.parse_stmt());
        }

        return { kind: "ForStatement", init, test, update, body } as any;
    }


    private parse_if_statement(): Stmt {
        this.eat(); // eat 'if'
        // optional parentheses around condition
        let test: Expr;
        if (this.at().type == TokenType.OpenParen) {
            this.eat();
            test = this.parse_expr();
            this.expect(TokenType.CloseParen, "Missing closing parenthesis in if condition");
        } else {
            test = this.parse_expr();
        }

        // consequent may be a block or a single statement
        const consequent: Stmt[] = [];
        if (this.at().type == TokenType.OpenBrace) {
            this.eat();
            while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                consequent.push(this.parse_stmt());
            }
            this.expect(TokenType.CloseBrace, "Missing closing brace for if consequent");
        } else {
            // single statement consequent (no braces)
            consequent.push(this.parse_stmt());
        }

        let alternate: Stmt[] | undefined = undefined;
        const elifs: { test: Expr; consequent: Stmt[] }[] = [];
        // Skip any trailing newlines between consequent and possible else/elif
        while (this.at().type == TokenType.Newline) this.eat();
        while (this.at().type == TokenType.Else) {
            this.eat(); // eat else
            // else if (...) ...
            if (this.at().type == TokenType.If) {
                // parse the 'if' following the else
                this.eat();
                // parse its condition
                let elifTest: Expr;
                if (this.at().type == TokenType.OpenParen) {
                    this.eat();
                    elifTest = this.parse_expr();
                    this.expect(TokenType.CloseParen, "Missing closing parenthesis in else-if condition");
                } else {
                    elifTest = this.parse_expr();
                }

                // parse its consequent as block or single statement
                const elifConsequent: Stmt[] = [];
                if (this.at().type == TokenType.OpenBrace) {
                    this.eat();
                    while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                        if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                        elifConsequent.push(this.parse_stmt());
                    }
                    this.expect(TokenType.CloseBrace, "Missing closing brace for else-if consequent");
                } else {
                    elifConsequent.push(this.parse_stmt());
                }

                elifs.push({ test: elifTest, consequent: elifConsequent });
                // continue to see if there's another else/elif
                while (this.at().type == TokenType.Newline) this.eat();
                continue;
            }

            // else with block or single statement -> final alternate
            if (this.at().type == TokenType.OpenBrace) {
                alternate = [];
                this.eat();
                while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                    if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                    alternate.push(this.parse_stmt());
                }
                this.expect(TokenType.CloseBrace, "Missing closing brace for else block");
            } else {
                alternate = [this.parse_stmt()];
            }

            // after an else (not elif), break out
            break;
        }

        return { kind: "IfStatement", test, consequent, elifs: elifs.length ? elifs : undefined, alternate } as any;
    }

    private parse_return_statement(): Stmt {
        this.eat(); // eat 'return'
        // optional expression
        if (this.at().type == TokenType.Semicolon) {
            this.eat();
            return { kind: 'ReturnStatement' } as any;
        }
        if (this.at().type == TokenType.Newline || this.at().type == TokenType.EOF) {
            return { kind: 'ReturnStatement' } as any;
        }
        const value = this.parse_expr();
        // optional semicolon
        if (this.at().type == TokenType.Semicolon) this.eat();
        return { kind: 'ReturnStatement', value } as any;
    }

        private parse_class_declaration(): Stmt {
            this.eat(); // eat 'class'
            const name = this.expect(TokenType.Identifier, 'Expected class name').value;
            let superName: string | undefined = undefined;
            if (this.at().type == TokenType.Extends) {
                this.eat();
                superName = this.expect(TokenType.Identifier, 'Expected super class name after extends').value;
            }

            this.expect(TokenType.OpenBrace, 'Expected class body');
            const body: Stmt[] = [];
            while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                // allow method declarations (func) or variable declarations inside class
                if (this.at().type == TokenType.Func) {
                    body.push(this.parse_fn_declaration());
                    continue;
                }
                if (this.at().type == TokenType.Let || this.at().type == TokenType.Const) {
                    body.push(this.parse_var_declaration());
                    continue;
                }
                // otherwise parse a statement (could be a property initializer)
                body.push(this.parse_stmt());
            }
            this.expect(TokenType.CloseBrace, 'Missing closing brace for class body');

            return { kind: 'ClassDeclaration', name, superName, body } as any;
        }

        private parse_try_statement(): Stmt {
            this.eat(); // eat 'try'
            const tryBlock: Stmt[] = [];
            if (this.at().type == TokenType.OpenBrace) {
                this.eat();
                while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                    if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                    tryBlock.push(this.parse_stmt());
                }
                this.expect(TokenType.CloseBrace, 'Missing closing brace for try block');
            } else {
                tryBlock.push(this.parse_stmt());
            }

            let catchParam: string | undefined = undefined;
            let catchBlock: Stmt[] | undefined = undefined;
            let finallyBlock: Stmt[] | undefined = undefined;

            // optional catch
            if (this.at().type == TokenType.Catch) {
                this.eat();
                // optional paren-ized param: catch (e) { ... }
                if (this.at().type == TokenType.OpenParen) {
                    this.eat();
                    catchParam = this.expect(TokenType.Identifier, 'Expected catch parameter name').value;
                    this.expect(TokenType.CloseParen, 'Missing closing paren for catch parameter');
                } else if (this.at().type == TokenType.Identifier) {
                    catchParam = this.eat().value;
                }

                // parse catch block
                if (this.at().type == TokenType.OpenBrace) {
                    this.eat();
                    catchBlock = [];
                    while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                        if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                        catchBlock.push(this.parse_stmt());
                    }
                    this.expect(TokenType.CloseBrace, 'Missing closing brace for catch block');
                } else {
                    catchBlock = [this.parse_stmt()];
                }
            }

            // optional finally
            if (this.at().type == TokenType.Finally) {
                this.eat();
                if (this.at().type == TokenType.OpenBrace) {
                    this.eat();
                    finallyBlock = [];
                    while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                        if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                        finallyBlock.push(this.parse_stmt());
                    }
                    this.expect(TokenType.CloseBrace, 'Missing closing brace for finally block');
                } else {
                    finallyBlock = [this.parse_stmt()];
                }
            }

            return { kind: 'TryStatement', tryBlock, catchParam, catchBlock, finallyBlock } as any;
        }

        private parse_throw_statement(): Stmt {
            this.eat(); // eat 'throw'
            const expr = this.parse_expr();
            if (this.at().type == TokenType.Semicolon) this.eat();
            return { kind: 'ThrowStatement', expr } as any;
        }

        private parse_switch_statement(): Stmt {
            this.eat(); // eat 'switch'
            // optional parentheses
            if (this.at().type == TokenType.OpenParen) {
                this.eat();
            }
            const discriminant = this.parse_expr();
            if (this.at().type == TokenType.CloseParen) this.eat();

            this.expect(TokenType.OpenBrace, 'Expected switch body');
            const cases: any[] = [];
            while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                if (this.at().type == TokenType.Case) {
                    this.eat();
                    const test = this.parse_expr();
                    this.expect(TokenType.Colon, 'Expected : after case expression');
                    const consequent: Stmt[] = [];
                    while (this.at().type !== TokenType.Case && this.at().type !== TokenType.Default && this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                        if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                        consequent.push(this.parse_stmt());
                    }
                    cases.push({ kind: 'CaseClause', test, consequent } as any);
                    continue;
                }
                if (this.at().type == TokenType.Default) {
                    this.eat();
                    this.expect(TokenType.Colon, 'Expected : after default');
                    const consequent: Stmt[] = [];
                    while (this.at().type !== TokenType.Case && this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                        if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                        consequent.push(this.parse_stmt());
                    }
                    cases.push({ kind: 'CaseClause', test: undefined, consequent } as any);
                    continue;
                }
                // otherwise, try to parse statement inside switch (fallthrough content)
                cases.push({ kind: 'CaseClause', test: undefined, consequent: [this.parse_stmt()] } as any);
            }

            this.expect(TokenType.CloseBrace, 'Missing closing brace for switch body');
            return { kind: 'SwitchStatement', discriminant, cases } as any;
        }
    
    parse_fn_declaration(): Stmt {
      this.eat(); //eat func keyword
      const name = this.expect(TokenType.Identifier, `Expected function name following func keyword`).value;
      
      const args = this.parse_args();
      const params: string[] = [];
      for (const arg of args) {
        if(arg.kind !== "Identifier") {
            console.log(arg);
            throw "Inside function declaration expected parameters to be of type string."
        }
        params.push((arg as Identifier).symbol);
      }

      this.expect(TokenType.OpenBrace, "Expected function body following declaration");

      const body: Stmt[] = [];

      while(this.at().type !== TokenType.EOF 
      && this.at().type !== TokenType.CloseBrace)
      {
                if (this.at().type == TokenType.Newline) {
                        this.eat();
                        continue;
                }
                body.push(this.parse_stmt());
      }
      this.expect(TokenType.CloseBrace, "Closing brace expected inside function dclaration");
      const fn = {
        body,
        name,
        parameters: params,
        kind: "FunctionDeclaration",
      } as FunctionDeclaration;

      return fn
    }

    parse_var_declaration(): Stmt {
      const isConstant = this.eat().type == TokenType.Const;
      const identifier = this.expect(
        TokenType.Identifier, 
        "Expected identifier name following let | const keywords."
      ).value;

            // If next token is semicolon, it's a declaration without initializer.
            if (this.at().type == TokenType.Semicolon) {
                this.eat();
                if (isConstant) {
                    throw `Must assign a value to constant expression, no value provided.`;
                }

                return {
                    kind: "VariableDeclaration",
                    identifier,
                    constant: false,
                } as VarDeclaration;
            }

            // If next token is equals, parse initializer. Otherwise, for let/const
            // declarations without '=', const is not allowed; for let it's permitted.
            if (this.at().type == TokenType.Equals) {
                this.eat();
                const declaration = {
                    kind: "VariableDeclaration",
                    value: this.parse_expr(),
                    identifier,
                    constant: isConstant,
                } as VarDeclaration;

                // Semicolon is optional: consume it if present, but don't require it.
                if (this.at().type == TokenType.Semicolon) {
                    this.eat();
                }

                return declaration;
            }

            // No '=' and no semicolon: const must have initializer, let without initializer is allowed
            if (isConstant) {
                throw `Must assign a value to constant expression, no value provided.`;
            }

            return {
                kind: "VariableDeclaration",
                identifier,
                constant: false,
            } as VarDeclaration;
    }

    private parse_expr(): Expr {
        return this.parse_assignment_expr();
    }

    private parse_assignment_expr(): Expr {
      const left = this.parse_object_expr();

      if (this.at().type == TokenType.Equals) {
        this.eat();
        const value = this.parse_assignment_expr();
        return { value, assigne: left, kind: "AssignmentExpr" } as AssignmentExpr;
      }

      return left;
    }
        private parse_object_expr(): Expr {
            if (this.at().type !== TokenType.OpenBrace){
                return this.parse_comparison_expr();
            }

            this.eat()
            const properties = new Array<Property>();

            while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
                // allow blank lines inside object literals
                if (this.at().type == TokenType.Newline) { this.eat(); continue; }
                const key = this.expect(TokenType.Identifier, `Object literal key expected.`).value;
        if (this.at().type == TokenType.Coma) {
            this.eat();
            properties.push({key, kind: "Property"} as Property);
            continue;
        }
        else if (this.at().type == TokenType.CloseBrace) {
            properties.push({key, kind: "Property"} as Property);
            continue;
        }
        this.expect(TokenType.Colon, `Missing colon following identifier in ObejctExpr`);
        const value = this.parse_expr();

        properties.push({kind: "Property", value, key});

        if (this.at().type != TokenType.CloseBrace) {
            this.expect(TokenType.Coma, `Expected coma or Closing Bracket following property`);
        }
      }

      this.expect(TokenType.CloseBrace, `Object literal missing closing brace.`);
      return { kind: "ObjectLiteral", properties} as ObjectLiteral;
    }

    private parse_additive_expr(): Expr {
        let left = this.parse_multiplicative_expr();

        while (this.at().value == "+" || this.at().value == "-") {
            const operator = this.eat().value;
            const right = this.parse_multiplicative_expr();
            left = {
                kind: "BinaryExpr",
                left,
                right,
                operator,
            } as BinaryExpr;
        }

        return left;
    }

    private parse_call_member_expr(): Expr {
        const member = this.parse_member_expr();

        if(this.at().type == TokenType.OpenParen) {
            return this.parse_call_expr(member);
        }
        return member
    }
    
    private parse_call_expr(caller: Expr): Expr {
      let call_expr: Expr = { 
            kind: "CallExpr", 
            caller, 
            args: this.parse_args()
      } as CallExpr;

      if(this.at().type == TokenType.OpenParen) {
        call_expr = this.parse_call_expr(call_expr);
      }

      return call_expr;
    }

    private parse_args(): Expr[] {
      this.expect(TokenType.OpenParen, `Expected open parenthesis`);
      const args = this.at().type == TokenType.CloseParen
      ? []
      : this.parse_arguments_list();

      this.expect(TokenType.CloseParen, `Missing closing parenthesis inside arguments list`);
      return args;
    }

    private parse_arguments_list(): Expr[] {
      const args = [this.parse_assignment_expr()];

      while (this.at().type == TokenType.Coma && this.eat()) {
        args.push(this.parse_assignment_expr());
      }

      return args;
    }

    private parse_member_expr(): Expr {
      let object = this.parse_primary_expr();

      while (
            this.at().type == TokenType.Dot || this.at().type == TokenType.OpenBracket
        ) {
            const operator = this.eat();
            let property: Expr;
            let computed: boolean;

            //non computed values aka obj.expr
            if(operator.type == TokenType.Dot) {
                computed = false;
                //get identifier
                property = this.parse_primary_expr();

                if (property.kind != "Identifier") {
                    throw `Cnnot use dot operator without right hand side being a identifier`;
                } 
            } else { // allows obj[COMPUTEDVALUE]
                computed = true;
                property = this.parse_expr();
                this.expect(TokenType.CloseBracket, `Missing closing bracket in computed value.`);

            }
             object = { kind: "MemberExpr", object, property, computed} as MemberExpr;
        }

        return object;
    }
    
    private parse_multiplicative_expr(): Expr {
        let left = this.parse_call_member_expr();

        while (this.at().value == "/" || this.at().value == "*" || this.at().value == "%") {
            const operator = this.eat().value;
            const right = this.parse_call_member_expr();
            left = {
                kind: "BinaryExpr",
                left,
                right,
                operator,
            } as BinaryExpr;
        }

        return left;
    }

    private parse_comparison_expr(): Expr {
        // Comparisons with relational and equality operators
        let left = this.parse_additive_expr();
        while (this.at().type == TokenType.BinaryOperator && (this.at().value == '>' || this.at().value == '<' || this.at().value == '>=' || this.at().value == '<=' || this.at().value == '==' || this.at().value == '!=')) {
            const operator = this.eat().value;
            const right = this.parse_additive_expr();
            left = {
                kind: "BinaryExpr",
                left,
                right,
                operator,
            } as BinaryExpr;
        }
        return left;
    }

    
    //orders of presidence
    

    private parse_primary_expr (): Expr {
        // support unary + and - by treating them as prefix operators
        if (this.at().type == TokenType.BinaryOperator && (this.at().value == '+' || this.at().value == '-')) {
            const op = this.eat().value;
            const rhs = this.parse_primary_expr();
            if (op == '+' ) {
                // unary plus is no-op
                return rhs;
            }
            // unary minus: if numeric literal, negate the value; otherwise synthesize 0 - rhs
            if (rhs.kind == 'NumericLiteral') {
                return { kind: 'NumericLiteral', value: - (rhs as NumericLiteral).value } as NumericLiteral;
            }
            return { kind: 'BinaryExpr', left: { kind: 'NumericLiteral', value: 0 } as NumericLiteral, right: rhs, operator: '-' } as BinaryExpr;
        }

        const tk = this.at().type;

    switch (tk) {
            case TokenType.Identifier:
                return { 
                    kind: "Identifier", 
                    symbol: this.eat().value 
                } as Identifier;
                
            case TokenType.Number:
                return { 
                    kind: "NumericLiteral", 
                    value: parseFloat(this.eat().value) 
                } as NumericLiteral;
            
            case TokenType.OpenParen: {
                this.eat();
                const value = this.parse_expr();
                this.expect(
                    TokenType.CloseParen,
                    "Unexpected token found inside parenthesised expression. Expected closing parenthesis.",
                );
                return value;
            }
            case TokenType.OpenBracket: {
                this.eat();
                const elements: Expr[] = [];
                if (this.at().type !== TokenType.CloseBracket) {
                    elements.push(this.parse_assignment_expr());
                    while (this.at().type == TokenType.Coma) {
                        this.eat();
                        elements.push(this.parse_assignment_expr());
                    }
                }
                this.expect(TokenType.CloseBracket, "Missing closing bracket for array literal");
                return { kind: 'ArrayLiteral', elements } as any;
            }
            case TokenType.String: {
                const raw = this.eat().value; // prefix 'f:' or 's:' + content
                const isF = raw.startsWith('f:');
                const content = raw.slice(2);

                // create a simple StringLiteral node
                const makeStrNode = (s: string) => ({ kind: 'StringLiteral', value: s } as any);

                if (!isF) {
                    return makeStrNode(content) as any;
                }

                // f-string: split into literal parts and {identifier} placeholders
                const parts: Array<any> = [];
                const re = /\{([^}]+)\}/g;
                let lastIndex = 0;
                let m: RegExpExecArray | null;
                while ((m = re.exec(content)) !== null) {
                    if (m.index > lastIndex) {
                        parts.push(makeStrNode(content.slice(lastIndex, m.index)));
                    }
                    const exprText = m[1].trim();
                    // Parse arbitrary expression inside braces using a temporary parser
                    const tmpParser = new Parser();
                    const parsed = tmpParser.produceAST(exprText);
                    // Expect a single expression statement
                    const exprNode = parsed.body[0] as any;
                    parts.push(exprNode as any);
                    lastIndex = m.index + m[0].length;
                }
                if (lastIndex < content.length) {
                    parts.push(makeStrNode(content.slice(lastIndex)));
                }

                // fold parts into concatenated BinaryExpr using +
                if (parts.length == 0) return makeStrNode('') as any;
                let node = parts[0] as Expr;
                for (let i = 1; i < parts.length; i++) {
                    node = { kind: 'BinaryExpr', left: node, right: parts[i], operator: '+' } as any;
                }
                return node;
            }

            default:
                console.error("Unexpected token found douring parsing!", this.at());
                Deno.exit(1);
        }


    }
}