// deno-lint-ignore-file no-explicit-any verbatim-module-syntax
import { FunctionDeclaration, Program, VarDeclaration, IfStatement, Stmt, ForOfStatement, ClassDeclaration, TryStatement, ThrowStatement, SwitchStatement } from "../../frontend/ast.ts";
import { WhileStatement, ForStatement } from "../../frontend/ast.ts";
import Enviroment from "../enviroment.ts";
import { evaluate } from "../interpreter.ts";
import { FunctionValue, MK_NULL, RuntimeVal, BooleanVal, NumberVal, StringVal, ArrayVal, MK_CLASS } from "../values.ts";
import { ReturnStatement } from "../../frontend/ast.ts";
export function eval_program (program: Program, env: Enviroment): RuntimeVal {
    let lasEvaluated: RuntimeVal = MK_NULL();

    for (const statement of program.body) {
        lasEvaluated = evaluate(statement, env);
    }

    return lasEvaluated;
}

export function eval_class_declaration(node: ClassDeclaration, env: Enviroment): RuntimeVal {
    const classVal = MK_CLASS(node.name, node.superName);
    // collect methods and fields
    for (const m of node.body) {
        if ((m as any).kind === 'FunctionDeclaration') {
            const fd = m as FunctionDeclaration;
            const fn: FunctionValue = {
                type: 'function',
                name: fd.name,
                parameters: fd.parameters,
                declarationEnv: env,
                body: fd.body,
            };
            (classVal as any).methods.set(fd.name, fn);
            continue;
        }
        if ((m as any).kind === 'VariableDeclaration') {
            const vd = m as VarDeclaration;
            const val = vd.value ? evaluate(vd.value, env) : MK_NULL();
            (classVal as any).fields.set(vd.identifier, val);
            continue;
        }
    }

    return env.declareVar(node.name, classVal as any, true);
}

export function eval_throw_statement(node: ThrowStatement, env: Enviroment): RuntimeVal {
    const val = evaluate(node.expr, env);
    throw { __isThrow: true, value: val };
}

export function eval_try_statement(node: TryStatement, env: Enviroment): RuntimeVal {
    let last: RuntimeVal = MK_NULL();
    let thrown: any = undefined;
    try {
        const blockEnv = new Enviroment(env);
        for (const s of node.tryBlock) last = evaluate(s, blockEnv);
    } catch (e) {
        const ex = e as { __isThrow?: boolean; value?: RuntimeVal } | undefined;
        if (ex && ex.__isThrow) {
            thrown = ex.value;
            if (node.catchBlock) {
                const catchEnv = new Enviroment(env);
                if (node.catchParam) catchEnv.declareVar(node.catchParam, thrown, false);
                for (const s of node.catchBlock) last = evaluate(s, catchEnv);
            }
        } else {
            // rethrow other exceptions
            throw e;
        }
    } finally {
        if (node.finallyBlock) {
            const finallyEnv = new Enviroment(env);
            for (const s of node.finallyBlock) last = evaluate(s, finallyEnv);
        }
    }
    return last;
}

function simpleEquals(a: RuntimeVal, b: RuntimeVal): boolean {
    if (a.type !== b.type) return false;
    switch (a.type) {
        case 'null': return true;
        case 'number': return (a as any).value === (b as any).value;
        case 'string': return (a as any).value === (b as any).value;
        case 'boolean': return (a as any).value === (b as any).value;
        default: return a === b;
    }
}

export function eval_switch_statement(node: SwitchStatement, env: Enviroment): RuntimeVal {
    const disc = evaluate(node.discriminant, env);
    let found = false;
    let last: RuntimeVal = MK_NULL();
    // execute cases in order, allowing fallthrough until a break
    try {
        for (const c of node.cases) {
            if (!found) {
                if (!c.test) {
                    // default
                    found = true;
                } else {
                    const testVal = evaluate((c as any).test, env);
                    if (simpleEquals(disc, testVal)) found = true;
                }
            }

            if (found) {
                for (const s of c.consequent) {
                    last = evaluate(s, env);
                }
            }
        }
    } catch (e) {
        const ex = e as { __isBreak?: boolean } | undefined;
        if (ex && ex.__isBreak) {
            return MK_NULL();
        }
        throw e;
    }
    return last;
}

export function eval_var_declaration(
    declaration: VarDeclaration, 
    env: Enviroment): RuntimeVal {
  const value = declaration.value ? evaluate(declaration.value, env) : MK_NULL();
  return env.declareVar(declaration.identifier, value, declaration.constant);
}

export function eval_function_declaration(
    declaration: FunctionDeclaration, 
    env: Enviroment): RuntimeVal {
    const fn = { 
        type: "function",
        name: declaration.name,
        parameters: declaration.parameters,
        declarationEnv: env,
        body: declaration.body,
    } as FunctionValue

    return env.declareVar(declaration.name, fn, true);
}

export function eval_return_statement(node: ReturnStatement, env: Enviroment): RuntimeVal {
    const value = node.value ? evaluate(node.value, env) : MK_NULL();
    // throw a special object to unwind to the function call
    throw { __isReturn: true, value };
}

export function eval_if_statement(node: IfStatement, env: Enviroment): RuntimeVal {
    const testVal = evaluate(node.test, env);
    // truthiness: numbers != 0, non-empty strings, true boolean
    let truthy = false;
    truthy = runtimeTruthiness(testVal);

    if (truthy) {
        let out: RuntimeVal = MK_NULL();
        for (const s of node.consequent) out = evaluate(s, env);
        return out;
    }

    // elif chain
    if (node.elifs) {
        for (const e of node.elifs) {
            const tv = evaluate(e.test, env);
            if (runtimeTruthiness(tv)) {
                let out: RuntimeVal = MK_NULL();
                for (const s of e.consequent) out = evaluate(s, env);
                return out;
            }
        }
    }

    if (node.alternate) {
        let out: RuntimeVal = MK_NULL();
        for (const s of node.alternate) out = evaluate(s, env);
        return out;
    }

    return MK_NULL();
}

export function eval_while_statement(node: WhileStatement, env: Enviroment): RuntimeVal {
    // Evaluate while loop by repeatedly testing and executing body
    while (runtimeTruthiness(evaluate(node.test, env))) {
        try {
            for (const s of node.body) {
                evaluate(s, env);
            }
        } catch (e) {
            const ex = e as { __isBreak?: boolean; __isContinue?: boolean } | undefined;
            if (ex && ex.__isBreak) {
                break;
            }
            if (ex && ex.__isContinue) {
                continue;
            }
            throw e;
        }
    }
    return MK_NULL();
}

export function eval_for_statement(node: ForStatement, env: Enviroment): RuntimeVal {
    // Create a new block scope for the loop
    const loopEnv = new Enviroment(env);

    // init
    if (node.init) {
        // init may be a var declaration (Stmt) or an expression
        try {
            evaluate(node.init as Stmt, loopEnv);
        } catch (_e) {
            // ignore runtime errors in init
        }
    }

    // test
    while (true) {
        if (node.test) {
            const tv = evaluate(node.test, loopEnv);
            if (!runtimeTruthiness(tv)) break;
        }

        // body
            try {
                for (const s of node.body) {
                    evaluate(s, loopEnv);
                }
            } catch (e) {
                const ex = e as { __isBreak?: boolean; __isContinue?: boolean } | undefined;
                if (ex && ex.__isBreak) {
                    break;
                }
                if (ex && ex.__isContinue) {
                    // run update (if any) and continue to next iteration
                    if (node.update) {
                        try { evaluate(node.update, loopEnv); } catch (_err) { /* ignore update errors on continue */ }
                    }
                    continue;
                }
                throw e;
            }

        // update
        if (node.update) {
            try { evaluate(node.update, loopEnv); } catch (_err) { /* ignore update errors */ }
        }
    }

    return MK_NULL();
}

export function eval_for_of_statement(node: ForOfStatement, env: Enviroment): RuntimeVal {
    const iterableVal = evaluate(node.iterable, env);
    if (iterableVal.type !== 'array') return MK_NULL();
    const arr = (iterableVal as ArrayVal).elements;

    for (const item of arr) {
        // create a child scope for the body with loop variable
        const loopEnv = new Enviroment(env);
        if (node.declaration) {
            loopEnv.declareVar(node.identifier, item, false);
        } else {
            loopEnv.assignVar(node.identifier, item);
        }

        try {
            for (const s of node.body) {
                evaluate(s, loopEnv);
            }
        } catch (e) {
            const ex = e as { __isBreak?: boolean; __isContinue?: boolean } | undefined;
            if (ex && ex.__isBreak) {
                break;
            }
            if (ex && ex.__isContinue) {
                continue;
            }
            throw e;
        }
    }

    return MK_NULL();
}

function runtimeTruthiness(v: RuntimeVal): boolean {
    switch (v.type) {
        case 'boolean': return (v as BooleanVal).value === true;
        case 'number': return (v as NumberVal).value !== 0;
        case 'string': return (v as StringVal).value.length !== 0;
        case 'null': return false;
        case 'array': return ((v as ArrayVal).elements || []).length !== 0; // empty array is falsy
        case 'object': return true; // objects are truthy
        default: return true;
    }
}
