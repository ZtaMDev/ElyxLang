// deno-lint-ignore-file no-explicit-any
import { RuntimeVal, NumberVal, MK_STRING } from "./values.ts";
import { 
AssignmentExpr,
    BinaryExpr, 
    CallExpr, 
    FunctionDeclaration, 
    Identifier, 
    NumericLiteral, 
    ObjectLiteral, 
    Program, 
    Stmt, 
    VarDeclaration,
    MemberExpr
} from "../frontend/ast.ts";
import { StringLiteral, ReturnStatement } from "../frontend/ast.ts";
import Enviroment from "./enviroment.ts";
import { eval_assignment, eval_binary_expr, eval_call_expr, eval_identifier, eval_object_expr, eval_array_literal, eval_member_expr } from "./eval/expressions.ts";
import { eval_function_declaration, eval_program, eval_var_declaration, eval_return_statement, eval_class_declaration, eval_throw_statement, eval_try_statement, eval_switch_statement } from "./eval/statements.ts";
import { eval_if_statement } from "./eval/statements.ts";
import { eval_while_statement, eval_for_statement } from "./eval/statements.ts";
import { eval_for_of_statement } from "./eval/statements.ts";

export function evaluate(astNode: Stmt, env: Enviroment): RuntimeVal {
    switch (astNode.kind) {
    case "MemberExpr":
        return eval_member_expr(astNode as MemberExpr, env);
        case "StringLiteral":
            return MK_STRING((astNode as StringLiteral).value);
        case "NumericLiteral":
            return { 
                value: ((astNode as NumericLiteral).value), 
                type: "number",
            } as NumberVal;
        case "Identifier":
            return eval_identifier(astNode as Identifier, env);
        case "ObjectLiteral":
            return eval_object_expr(astNode as ObjectLiteral, env);
        case "ReturnStatement":
            return eval_return_statement(astNode as ReturnStatement, env);
        case "ArrayLiteral":
            return eval_array_literal(astNode as any, env);
        case "CallExpr":
            return eval_call_expr(astNode as CallExpr, env);
        case "AssignmentExpr":
            return eval_assignment(astNode as AssignmentExpr, env);
        case "BinaryExpr":
            return eval_binary_expr(astNode as BinaryExpr, env);
        case "Program":
            return eval_program(astNode as Program, env);
        case "IfStatement":
            return eval_if_statement(astNode as any, env);
        case "WhileStatement":
            return eval_while_statement(astNode as any, env);
        case "ForStatement":
            return eval_for_statement(astNode as any, env);
        case "ForOfStatement":
            return eval_for_of_statement(astNode as any, env);
        case "ClassDeclaration":
            return eval_class_declaration(astNode as any, env);
        case "ThrowStatement":
            return eval_throw_statement(astNode as any, env);
        case "TryStatement":
            return eval_try_statement(astNode as any, env);
        case "SwitchStatement":
            return eval_switch_statement(astNode as any, env);
        case "BreakStatement":
            throw { __isBreak: true };
        case "ContinueStatement":
            throw { __isContinue: true };
        case "VariableDeclaration":
            return eval_var_declaration (astNode as VarDeclaration, env);
        case "FunctionDeclaration":
            return eval_function_declaration (astNode as FunctionDeclaration, env);
        default:
            console.error("This AST Node has not yet been setup for interpretation", astNode);
            Deno.exit(1);
    }
}

