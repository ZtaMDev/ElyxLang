// deno-lint-ignore-file verbatim-module-syntax
import { Stmt } from "../frontend/ast.ts";
import Enviroment from "./enviroment.ts";

export type ValueType = "null" | "number" | "boolean" | "object" | "native-fn" | "function" | "string" | "array" | "map" | "set" | "class" | "instance";
    // Note: we'll add 'class' and 'instance' for OO support
    // appended via union edit below

export type StringValueType = "string";

export interface RuntimeVal {
    type: ValueType;
}

export interface NullVal extends RuntimeVal {
    type: "null";
    value: null;
}

export function MK_NULL() {
    return {type: "null", value: null} as NullVal;
}
export interface BooleanVal extends RuntimeVal {
    type: "boolean";
    value: boolean;
}

export function MK_BOOL(b = true) {
    return {type: "boolean", value: b} as BooleanVal;
}


export interface NumberVal extends RuntimeVal {
    type: "number";
    value: number;
}

export function MK_NUMBER(n = 0) {
    return {type: "number", value: n} as NumberVal;
}

export interface ObjectVal extends RuntimeVal {
    type: "object";
    properties: Map<string, RuntimeVal>;
}

export interface ArrayVal extends RuntimeVal {
    type: "array";
    elements: RuntimeVal[];
}

export function MK_ARRAY(elements: RuntimeVal[] = []) {
    return { type: "array", elements } as ArrayVal;
}

export interface MapVal extends RuntimeVal {
    type: "map";
    map: Map<string, RuntimeVal>;
}

export function MK_MAP(entries?: [string, RuntimeVal][]) {
    const m = new Map<string, RuntimeVal>();
    if (entries) for (const [k, v] of entries) m.set(k, v);
    return { type: "map", map: m } as MapVal;
}

export interface SetVal extends RuntimeVal {
    type: "set";
    values: RuntimeVal[];
}

export function MK_SET(values: RuntimeVal[] = []) {
    return { type: "set", values } as SetVal;
}

export interface StringVal extends RuntimeVal {
    type: "string";
    value: string;
}

export function MK_STRING(s = "") {
    return { type: "string", value: s } as StringVal;
}

export type FunctionCall = (args: RuntimeVal[], env: Enviroment) => RuntimeVal;

export interface NativeFnValue extends RuntimeVal {
    type: "native-fn";
    call: FunctionCall;
}

export function MK_NATIVE_FN(call: FunctionCall) {
    return { type: "native-fn", call} as NativeFnValue;
}

export interface FunctionValue extends RuntimeVal {
    type: "function";
    name: string;
    parameters: string[];
    declarationEnv: Enviroment;
    body: Stmt[];
}

export interface ClassVal extends RuntimeVal {
    type: "class";
    name: string;
    superName?: string;
    methods: Map<string, FunctionValue>;
    fields: Map<string, RuntimeVal>;
}

export interface InstanceVal extends RuntimeVal {
    type: "instance";
    className: string;
    fields: Map<string, RuntimeVal>;
}

// helper constructors
export function MK_CLASS(name: string, superName?: string) {
    return { type: 'class', name, superName, methods: new Map(), fields: new Map() } as ClassVal;
}

export function MK_INSTANCE(className: string) {
    return { type: 'instance', className, fields: new Map() } as InstanceVal;
}