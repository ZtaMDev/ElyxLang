export type NodeType =
    | "Program"
    | "VariableDeclaration"
    | "FunctionDeclaration"
    | "AssignmentExpr"
    | "MemberExpr"
    | "CallExpr"
    | "Property"
    | "ObjectLiteral"
    | "NumericLiteral"
    | "Identifier"
    | "StringLiteral"
    | "BinaryExpr"
    | "FormattedExpr"
    | "ArrayLiteral"
    | "IfStatement"
    | "WhileStatement"
    | "ForStatement"
    | "ForOfStatement"
    | "BreakStatement"
    | "ContinueStatement"
    | "ClassDeclaration"
    | "TryStatement"
    | "ThrowStatement"
    | "SwitchStatement"
    | "CaseClause"
    | "ReturnStatement";

export interface ReturnStatement extends Stmt {
    kind: "ReturnStatement";
    value?: Expr;
}

export interface ClassDeclaration extends Stmt {
    kind: "ClassDeclaration";
    name: string;
    superName?: string;
    body: Stmt[]; // methods and property initializers (use FunctionDeclaration / VarDeclaration)
}

export interface TryStatement extends Stmt {
    kind: "TryStatement";
    tryBlock: Stmt[];
    catchParam?: string; // identifier name for catch
    catchBlock?: Stmt[];
    finallyBlock?: Stmt[];
}

export interface ThrowStatement extends Stmt {
    kind: "ThrowStatement";
    expr: Expr;
}

export interface CaseClause extends Stmt {
    kind: "CaseClause";
    test?: Expr; // undefined for 'default'
    consequent: Stmt[];
}

export interface SwitchStatement extends Stmt {
    kind: "SwitchStatement";
    discriminant: Expr;
    cases: CaseClause[];
}


export interface StringLiteral extends Expr {
    kind: "StringLiteral";
    value: string;
}

export interface FormattedExpr extends Expr {
    kind: "FormattedExpr";
    expr: Expr;
    spec?: string;
}

export interface ArrayLiteral extends Expr {
    kind: "ArrayLiteral";
    elements: Expr[];
}

export interface IfStatement extends Stmt {
    kind: "IfStatement";
    test: Expr;
    consequent: Stmt[];
    elifs?: { test: Expr; consequent: Stmt[] }[];
    alternate?: Stmt[];
}

export interface WhileStatement extends Stmt {
    kind: "WhileStatement";
    test: Expr;
    body: Stmt[];
}

export interface ForStatement extends Stmt {
    kind: "ForStatement";
    init?: Stmt; // variable declaration or expression
    test?: Expr;
    update?: Expr;
    body: Stmt[];
}

export interface ForOfStatement extends Stmt {
    kind: "ForOfStatement";
    declaration: boolean; // true if "let" declaration
    identifier: string;
    iterable: Expr;
    body: Stmt[];
}

export interface BreakStatement extends Stmt {
    kind: "BreakStatement";
}

export interface ContinueStatement extends Stmt {
    kind: "ContinueStatement";
}

export interface Stmt {
    kind: NodeType;
}

export interface Program extends Stmt {
    kind: 'Program';
    body: Stmt[];
}

export interface VarDeclaration extends Stmt {
    kind: 'VariableDeclaration';
    constant: boolean;
    identifier: string;
    value?: Expr;
}

export interface FunctionDeclaration extends Stmt {
    kind: 'FunctionDeclaration';
    parameters: string[];
    name: string;
    body: Stmt[];
}

export interface Expr extends Stmt {}

export interface AssignmentExpr extends Expr {
    kind: "AssignmentExpr";
    assigne: Expr;
    value: Expr;
}

export interface BinaryExpr extends Expr {
    kind: "BinaryExpr"
    left: Expr;
    right: Expr;
    operator: string;
}

export interface CallExpr extends Expr {
    kind: "CallExpr"
    args: Expr[];
    caller: Expr;
}

export interface MemberExpr extends Expr {
    kind: "MemberExpr"
    object: Expr;
    property: Expr;
    computed: boolean;
}

export interface Identifier extends Expr {
    kind: "Identifier";
    symbol: string;
}

export interface NumericLiteral extends Expr {
    kind: "NumericLiteral";
    value: number;
}

export interface Property extends Expr {
    kind: "Property";
    key: string,
    value?: Expr,
}

export interface ObjectLiteral extends Expr {
    kind: "ObjectLiteral";
    properties: Property[]
}