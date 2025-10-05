// deno-lint-ignore-file no-explicit-any verbatim-module-syntax
import { AssignmentExpr, BinaryExpr, CallExpr, Identifier, ObjectLiteral, ArrayLiteral, MemberExpr } from "../../frontend/ast.ts";
import Enviroment from "../enviroment.ts";
import { evaluate } from "../interpreter.ts";
import { FunctionValue, MK_NULL, MK_STRING, MK_ARRAY, MK_NUMBER, MK_BOOL, MK_NATIVE_FN, NativeFnValue, NumberVal, ObjectVal, RuntimeVal, StringVal, BooleanVal, ArrayVal, MapVal, SetVal } from "../values.ts";
import { MK_INSTANCE } from "../values.ts";
import { ClassVal, InstanceVal } from "../values.ts";

// numeric binary operations are handled inline in eval_binary_expr now

export function eval_binary_expr (binop: BinaryExpr, env: Enviroment): RuntimeVal {

    const lhs = evaluate(binop.left, env);
    const rhs = evaluate(binop.right, env);

    if (lhs.type == "number" && rhs.type == "number") {
        const l = lhs as NumberVal;
        const r = rhs as NumberVal;
        switch (binop.operator) {
            case '+': return MK_NUMBER(l.value + r.value);
            case '-': return MK_NUMBER(l.value - r.value);
            case '*': return MK_NUMBER(l.value * r.value);
            case '/': return MK_NUMBER(l.value / r.value);
            case '%': return MK_NUMBER(l.value % r.value);
            case '>': return MK_BOOL(l.value > r.value);
            case '<': return MK_BOOL(l.value < r.value);
            case '>=': return MK_BOOL(l.value >= r.value);
            case '<=': return MK_BOOL(l.value <= r.value);
            case '==': return MK_BOOL(l.value === r.value);
            case '!=': return MK_BOOL(l.value !== r.value);
            default: return MK_NULL();
        }
    }

    // string concatenation
    if (binop.operator == '+' && (lhs.type == 'string' || rhs.type == 'string')) {
        const runtimeToString = (v: RuntimeVal) => {
            switch (v.type) {
                case 'string': return (v as StringVal).value;
                case 'number': return String((v as NumberVal).value);
                case 'boolean': return String((v as BooleanVal).value);
                case 'null': return 'null';
                case 'object': return '[object]';
                default: return '[unknown]';
            }
        };

        const lefts = runtimeToString(lhs);
        const rights = runtimeToString(rhs);
        return MK_STRING(lefts + rights);
    }
    // helper: deep equality for any RuntimeVal
    function deepEqual(a: RuntimeVal, b: RuntimeVal, visited = new Set<any>()): boolean {
        if (a === b) return true;
        if (a.type !== b.type) return false;

        switch (a.type) {
            case 'string':
                return (a as StringVal).value === (b as StringVal).value;
            case 'number':
                return (a as NumberVal).value === (b as NumberVal).value;
            case 'boolean':
                return (a as BooleanVal).value === (b as BooleanVal).value;
            case 'null':
                return true;
            case 'array': {
                const arrA = (a as ArrayVal).elements;
                const arrB = (b as ArrayVal).elements;
                if (arrA.length !== arrB.length) return false;
                for (let i = 0; i < arrA.length; i++) {
                    if (!deepEqual(arrA[i], arrB[i], visited)) return false;
                }
                return true;
            }
            case 'object': {
                const propsA = (a as ObjectVal).properties;
                const propsB = (b as ObjectVal).properties;
                if (propsA.size !== propsB.size) return false;
                for (const [key, valA] of propsA.entries()) {
                    const valB = propsB.get(key);
                    if (!valB || !deepEqual(valA, valB, visited)) return false;
                }
                return true;
            }
            case 'map': {
                const mapA = (a as MapVal).map;
                const mapB = (b as MapVal).map;
                if (mapA.size !== mapB.size) return false;
                for (const [key, valA] of mapA.entries()) {
                    const valB = mapB.get(key);
                    if (!valB || !deepEqual(valA, valB, visited)) return false;
                }
                return true;
            }
            case 'set': {
                const setA = (a as SetVal).values;
                const setB = (b as SetVal).values;
                if (setA.length !== setB.length) return false;
                const serialize = (v: RuntimeVal): string => {
                    switch (v.type) {
                        case 'string': return `"${(v as StringVal).value}"`;
                        case 'number': return String((v as NumberVal).value);
                        case 'boolean': return String((v as BooleanVal).value);
                        case 'null': return 'null';
                        default: return v.type;
                    }
                };
                const normA = setA.map(serialize).sort().join(',');
                const normB = setB.map(serialize).sort().join(',');
                return normA === normB;
            }
            case 'function':
            case 'native-fn':
                return a === b;
            default:
                return false;
        }
    }
    if (binop.operator == '==' || binop.operator == '!=') {
        const isEqual = deepEqual(lhs, rhs);
        return MK_BOOL(binop.operator == '==' ? isEqual : !isEqual);
    }



    return MK_NULL();
}

export function eval_identifier(ident: Identifier, env: Enviroment): RuntimeVal {
    const val = env.lookupVar(ident.symbol);
    return val;
}

export function eval_assignment (node: AssignmentExpr, env: Enviroment) {
    // assignment to identifier
    if (node.assigne.kind === "Identifier") {
        const varname = (node.assigne as Identifier).symbol;
        return env.assignVar(varname, evaluate(node.value, env));
    }

    // assignment to member expression (obj.prop = val or arr[index] = val)
    if (node.assigne.kind === "MemberExpr") {
        const mem = node.assigne as MemberExpr;
        const obj = evaluate(mem.object, env);
        // compute property name
        let propName: string | number;
        if (mem.computed) {
            const p = evaluate(mem.property, env);
            propName = p.type === 'number' ? (p as NumberVal).value : (p as StringVal).value;
        } else {
            if (mem.property.kind !== 'Identifier') throw `Invalid member LHS`;
            propName = (mem.property as Identifier).symbol;
        }

        const rhs = evaluate(node.value, env);

        if (obj.type === 'object') {
            const o = obj as ObjectVal;
            o.properties.set(String(propName), rhs);
            return rhs;
        }

        if (obj.type === 'array') {
            const a = obj as ArrayVal;
            if (typeof propName === 'number') {
                a.elements[propName] = rhs;
                return rhs;
            }
            const idx = Number(propName);
            if (!isNaN(idx)) {
                a.elements[idx] = rhs;
                return rhs;
            }
            throw `Invalid array assignment index ${propName}`;
        }

        if (obj.type === 'map') {
            const m = obj as MapVal;
            m.map.set(String(propName), rhs);
            return rhs;
        }

        if (obj.type === 'instance') {
            // allow setting instance fields
            const inst = obj as any;
            inst.fields.set(String(propName), rhs);
            return rhs;
        }

        throw `Cannot assign to member of type ${obj.type}`;
    }

    throw `Invalid LHS inside assignment expr ${JSON.stringify(node.assigne)}`;
}

export function eval_object_expr (obj: ObjectLiteral, env: Enviroment): RuntimeVal {
    const object = { type: "object", properties: new Map()} as ObjectVal;
    for (const { key, value} of obj.properties) {
        const runtimeVal = (value == undefined)
         ? env.lookupVar(key) 
         : evaluate(value, env);
        object.properties.set(key, runtimeVal);
    }
    
    return object;
}

export function eval_call_expr (expr: CallExpr, env: Enviroment): RuntimeVal {
    const args = expr.args.map((arg) => evaluate(arg, env));
    const fn = evaluate(expr.caller, env);

    if (fn.type == "native-fn") {
        const result = (fn as NativeFnValue).call(args,env);
        return result;
        
    }
    if (fn.type == "function") {
        const func = fn as FunctionValue;
        const scope = new Enviroment(func.declarationEnv);

        //create variables for parameters
        for (let i = 0 ; i < func.parameters.length; i++) {
            //TODO CHECK THE BOUNDS HERE PLS
            //VERIFI ARITI OF FUNCTION
            const varname = func.parameters[i];
            scope.declareVar(varname, args[i], false);
        }

        let result: RuntimeVal = MK_NULL();
        //EVAL FUNCTION BODDY LINE BY LINE
        try {
            for (const stmt of func.body) {
                result = evaluate(stmt, scope);
            }
            return result;
        } catch (e) {
            const maybe = e as { __isReturn?: boolean; value?: RuntimeVal };
            if (maybe && maybe.__isReturn) {
                return maybe.value as RuntimeVal;
            }
            throw e;
        }
    }
    // class instantiation: allow calling a class value like a constructor
    if (fn.type == 'class') {
        const cls = fn as ClassVal;
        const inst = MK_INSTANCE(cls.name) as InstanceVal;
        // copy default fields
    for (const [k, v] of cls.fields.entries()) inst.fields.set(k, v);

        // if there's a constructor method, call it with the instance bound
        const ctor = (cls.methods as Map<string, FunctionValue>).get('constructor');
        if (ctor) {
            const scope = new Enviroment(ctor.declarationEnv);
            // bind 'this' in the scope
            scope.declareVar('this', inst, false);
            // declare parameters
            for (let i = 0; i < ctor.parameters.length; i++) scope.declareVar(ctor.parameters[i], args[i], false);
            try {
                for (const s of ctor.body) evaluate(s, scope);
            } catch (e) {
                const maybe = e as { __isReturn?: boolean; value?: RuntimeVal };
                if (maybe && maybe.__isReturn) return maybe.value as RuntimeVal;
                throw e;
            }
        }

        return inst as RuntimeVal;
    }

    throw `Cannot call value that is not a function or class: ${JSON.stringify(fn)}`;
}

export function eval_array_literal(arr: ArrayLiteral, env: Enviroment): RuntimeVal {
    const elements: RuntimeVal[] = [];
    for (const el of arr.elements) {
        elements.push(evaluate(el, env));
    }
    return MK_ARRAY(elements) as ArrayVal;
}

function deepEqualRuntime(a: RuntimeVal, b: RuntimeVal): boolean {
    if (a.type !== b.type) return false;
    switch (a.type) {
        case 'null': return true;
        case 'number': return (a as NumberVal).value === (b as NumberVal).value;
        case 'boolean': return (a as BooleanVal).value === (b as BooleanVal).value;
        case 'string': return (a as StringVal).value === (b as StringVal).value;
        case 'array': {
            const aa = (a as ArrayVal).elements;
            const bb = (b as ArrayVal).elements;
            if (aa.length !== bb.length) return false;
            for (let i = 0; i < aa.length; i++) if (!deepEqualRuntime(aa[i], bb[i])) return false;
            return true;
        }
        default:
            return a === b;
    }
}

export function eval_member_expr(node: MemberExpr, env: Enviroment): RuntimeVal {
    const obj = evaluate(node.object, env);
    let propName: string | number;
    if (node.computed) {
        const p = evaluate(node.property, env);
        if (p.type === 'number') propName = (p as NumberVal).value;
        else propName = (p as StringVal).value;
    } else {
        if (node.property.kind !== 'Identifier') throw 'Invalid member property';
        propName = (node.property as Identifier).symbol;
    }
    
    // Array behavior
    if (obj.type === 'array') {
        const arr = obj as ArrayVal;
        if (typeof propName === 'number') {
            const idx = propName as number;
            return arr.elements[idx] ?? MK_NULL();
        }
        switch (String(propName)) {
            case 'length': return MK_NUMBER(arr.elements.length);
            case 'push':
            case 'add':
                return MK_NATIVE_FN((args) => { arr.elements.push(...args); return MK_NUMBER(arr.elements.length); });
            case 'pop':
                return MK_NATIVE_FN(() => { const v = arr.elements.pop(); return v ?? MK_NULL(); });
            case 'remove':
                return MK_NATIVE_FN((args) => {
                    if (args.length === 0) return MK_BOOL(false);
                    const target = args[0];
                    const idx = arr.elements.findIndex(e => deepEqualRuntime(e, target));
                    if (idx >= 0) { arr.elements.splice(idx, 1); return MK_BOOL(true); }
                    return MK_BOOL(false);
                });
            case 'indexOf':
                return MK_NATIVE_FN((args) => {
                    const t = args[0];
                    const idx = arr.elements.findIndex(e => deepEqualRuntime(e, t));
                    return MK_NUMBER(idx);
                });
            case 'contains':
                return MK_NATIVE_FN((args) => MK_BOOL(arr.elements.some(e => deepEqualRuntime(e, args[0]))));
            case 'get':
                return MK_NATIVE_FN((args) => { const i = (args[0] as NumberVal).value; return arr.elements[i] ?? MK_NULL(); });
            default:
                // allow numeric string index
                if (!isNaN(Number(propName))) {
                    const idx = Number(propName);
                    return arr.elements[idx] ?? MK_NULL();
                }
        }
        return MK_NULL();
    }

    // Object properties
    if (obj.type === 'object') {
        const o = obj as ObjectVal;
        if (typeof propName === 'string') {
            if (o.properties.has(propName)) return o.properties.get(propName)!;
            return MK_NULL();
        }
    }

    // Instance behavior
    if (obj.type === 'instance') {
        const inst = obj as InstanceVal;
        if (typeof propName === 'string') {
            // field
            if (inst.fields.has(propName)) return inst.fields.get(propName)!;
            // method lookup on class prototype: assume env lookup by name
            // The instance should have a special __class reference stored by the constructor environment; as a simplification, lookup the class object in the global scope via env
            try {
                const cls = env.lookupVar(inst.className);
                if (cls && cls.type === 'class') {
                    const method = (cls as ClassVal).methods.get(propName) as FunctionValue | undefined;
                    if (method) {
                        // return a bound native-fn that sets `this` when called
                        return MK_NATIVE_FN((args, _callEnv) => {
                            const scope = new Enviroment(method.declarationEnv);
                            scope.declareVar('this', inst, false);
                            for (let i = 0; i < method.parameters.length; i++) scope.declareVar(method.parameters[i], args[i], false);
                            try {
                                let res: RuntimeVal = MK_NULL();
                                for (const s of method.body) res = evaluate(s, scope);
                                return res;
                            } catch (e) {
                                const maybe = e as { __isReturn?: boolean; value?: RuntimeVal };
                                if (maybe && maybe.__isReturn) return maybe.value as RuntimeVal;
                                throw e;
                            }
                        });
                    }
                }
            } catch {
                // ignore lookup errors
            }
        }
        return MK_NULL();
    }

    // dentro de eval_member_expr, caso map:
    if (obj.type === 'map') {
        const m = obj as MapVal;

        const runtimeKeyToStr = (k: RuntimeVal) => {
            switch (k.type) {
                case "string": return (k as StringVal).value;
                case "number": return String((k as NumberVal).value);
                case "boolean": return String((k as BooleanVal).value);
                default: return JSON.stringify(k); // fallback
            }
        };

        if (propName === 'get') return MK_NATIVE_FN((args) => {
            if (args.length === 0) return MK_NULL();
            const keyStr = runtimeKeyToStr(args[0]);
            return m.map.has(keyStr) ? m.map.get(keyStr)! : MK_NULL();
        });

        if (propName === 'set') return MK_NATIVE_FN((args) => {
            if (args.length === 0) throw `map.set expects (key, value)`;
            const keyStr = runtimeKeyToStr(args[0]);
            const val = args[1] ?? MK_NULL();
            m.map.set(keyStr, val);
            return MK_NULL();
        });

        if (propName === 'has') return MK_NATIVE_FN((args) => {
            if (args.length === 0) return MK_BOOL(false);
            return MK_BOOL(m.map.has(runtimeKeyToStr(args[0])));
        });

        if (propName === 'size') return MK_NATIVE_FN(() => MK_NUMBER(m.map.size));

        return MK_NULL();
    }
    // --- SET METHODS ---
    if (obj.type === 'set') {
        const s = obj as SetVal;

        // helper para comparar valores (igual que deepEqualRuntime)
        const deepEq = (a: RuntimeVal, b: RuntimeVal): boolean => {
            if (a.type !== b.type) return false;
            switch (a.type) {
                case "number": return (a as NumberVal).value === (b as NumberVal).value;
                case "string": return (a as StringVal).value === (b as StringVal).value;
                case "boolean": return (a as BooleanVal).value === (b as BooleanVal).value;
                case "null": return true;
                default: return a === b;
            }
        };

        // --- has() ---
        if (propName === "has")
            return MK_NATIVE_FN((args) => {
                if (args.length === 0) return MK_BOOL(false);
                const val = args[0];
                return MK_BOOL(s.values.some(v => deepEq(v, val)));
            });

        // --- add() ---
        if (propName === "add")
            return MK_NATIVE_FN((args) => {
                if (args.length === 0) return MK_NULL();
                const val = args[0];
                if (!s.values.some(v => deepEq(v, val))) s.values.push(val);
                return MK_NULL();
            });

        // --- remove() ---
        if (propName === "remove")
            return MK_NATIVE_FN((args) => {
                if (args.length === 0) return MK_BOOL(false);
                const val = args[0];
                const idx = s.values.findIndex(v => deepEq(v, val));
                if (idx >= 0) {
                    s.values.splice(idx, 1);
                    return MK_BOOL(true);
                }
                return MK_BOOL(false);
            });

        // --- size ---
        if (propName === "size")
            return MK_NATIVE_FN(() => MK_NUMBER(s.values.length));

        return MK_NULL();
    }



    return MK_NULL();
}