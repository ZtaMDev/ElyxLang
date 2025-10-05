// deno-lint-ignore-file no-explicit-any verbatim-module-syntax
import { MK_BOOL, MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_STRING, MK_ARRAY, RuntimeVal, StringVal, NumberVal, BooleanVal, ObjectVal, ArrayVal, MapVal, SetVal, MK_MAP, MK_SET } from "./values.ts";
// no-op import for map/set constructors in this file

export function createGlovalEnv () {
    const env = new Enviroment();
    env.declareVar('true', MK_BOOL(true), true);
    env.declareVar('false', MK_BOOL(false), true);
    env.declareVar("null", MK_NULL(), true);

    // --- Map constructor (acepta array-of-pairs, object o key/value pairs) ---
    env.declareVar("Map", MK_NATIVE_FN((args) => {
        const m = new Map<string, RuntimeVal>();

        const keyToStr = (k: RuntimeVal) => {
            switch (k.type) {
                case "string": return (k as StringVal).value;
                case "number": return String((k as NumberVal).value);
                case "boolean": return String((k as BooleanVal).value);
                default: throw `Map key must be string|number|boolean (got ${k.type})`;
            }
        };

        if (args.length === 1) {
            const a0 = args[0];
            if (a0.type === "array") {
                // array of pairs: [ [k,v], [k,v] ]
                for (const item of (a0 as ArrayVal).elements) {
                    if (item.type !== "array") throw `Map(array): expected inner pairs to be arrays`;
                    const pair = (item as ArrayVal).elements;
                    const key = pair[0] ?? MK_NULL();
                    const val = pair[1] ?? MK_NULL();
                    m.set(keyToStr(key), val);
                }
            } else if (a0.type === "object") {
                for (const [k, v] of (a0 as ObjectVal).properties.entries()) {
                    m.set(k, v);
                }
            } else {
                throw `Map(): unsupported single-arg type ${a0.type}`;
            }
        } else if (args.length === 0) {
            // empty map
        } else {
            // treat args as key,value,key,value...
            if (args.length % 2 !== 0) throw `Map(): expected even number of args (key, value) pairs`;
            for (let i = 0; i < args.length; i += 2) {
                m.set(keyToStr(args[i]), args[i + 1]);
            }
        }

        return MK_MAP(Array.from(m.entries()));
    }), true);

    // --- Set constructor (dedup) ---
    env.declareVar("Set", MK_NATIVE_FN((args) => {
        let items: RuntimeVal[] = [];
        if (args.length === 1 && args[0].type === "array") {
            items = (args[0] as ArrayVal).elements;
        } else {
            items = args.slice();
        }

        const seen = new Set<string>();
        const out: RuntimeVal[] = [];

        const serialize = (v: RuntimeVal) => {
            switch (v.type) {
                case "string": return "s:" + (v as StringVal).value;
                case "number": return "n:" + String((v as NumberVal).value);
                case "boolean": return "b:" + String((v as BooleanVal).value);
                case "null": return "null";
                default: return v.type + ":" + JSON.stringify(v); // fallback
            }
        };

        for (const it of items) {
            const s = serialize(it);
            if (!seen.has(s)) { seen.add(s); out.push(it); }
        }

        return MK_SET(out);
    }), true);




    // pretty printing helper
    function reprVal(v: RuntimeVal, depth = 0, visited = new Set<RuntimeVal|object>()) : string {
        // prevent cycles
        if (v && visited.has(v)) return "<cyclic>";
        if (v) visited.add(v);

        const indent = (n: number) => "  ".repeat(n);
        switch (v.type) {
            case "null": return "null";
            case "number": return String((v as NumberVal).value);
            case "boolean": return String((v as BooleanVal).value);
            case "string": return `"${(v as StringVal).value}"`;
            case "array": {
                const el = (v as ArrayVal).elements as RuntimeVal[];
                if (el.length === 0) return "[]";
                if (depth >= 2) return `[...${el.length} items...]`;
                const parts = el.map(x => reprVal(x, depth+1, visited));
                if (parts.join(", ").length > 60) {
                    return "[\n" + parts.map(p => indent(depth+1) + p).join(",\n") + "\n" + indent(depth) + "]";
                }
                return "[" + parts.join(", ") + "]";
            }
            case "object": {
                const obj = (v as ObjectVal).properties as Map<string, RuntimeVal>;
                const entries = Array.from(obj.entries()).map(([k, val]) => `${k}: ${reprVal(val, depth+1, visited)}`);
                if (entries.length === 0) return "{}";
                if (depth >= 2) return `{...${entries.length} props...}`;
                if (entries.join(", ").length > 60) {
                    return "{\n" + entries.map(e => indent(depth+1) + e).join(",\n") + "\n" + indent(depth) + "}";
                }
                return "{" + entries.join(", ") + "}";
            }
            case "map": {
                const m = (v as MapVal).map as Map<string, RuntimeVal>;
                if (m.size === 0) return "Map{}";
                if (depth >= 2) return `Map{...${m.size} entries...}`;
                const entries = Array.from(m.entries()).map(([k, val]) => `${k} => ${reprVal(val, depth+1, visited)}`);
                return "Map{\n" + entries.map(e => indent(depth+1) + e).join(",\n") + "\n" + indent(depth) + "}";
            }
            case "set": {
                const s = (v as SetVal).values as RuntimeVal[];
                if (s.length === 0) return "Set{}";
                if (depth >= 2) return `Set{...${s.length} items...}`;
                const parts = s.map(x => reprVal(x, depth+1, visited));
                return "Set{\n" + parts.map(p => indent(depth+1) + p).join(",\n") + "\n" + indent(depth) + "}";
            }
            case "function": return "<function>";
            case "native-fn": return "<native-function>";
            default: return String(v);
        }
    }

    function stringifyVal(v: RuntimeVal): string {
        // concise single-line representation for print
        switch (v.type) {
            case "string": return (v as StringVal).value;
            case "number": return String((v as NumberVal).value);
            case "boolean": return String((v as BooleanVal).value);
            case "null": return "null";
            case "array": return "[" + ((v as ArrayVal).elements || []).map((x: RuntimeVal) => stringifyVal(x)).join(", ") + "]";
            case "object": {
                const obj = (v as ObjectVal).properties as Map<string, RuntimeVal>;
                const entries = Array.from(obj.entries()).map(([k, val]) => `${k}: ${stringifyVal(val)}`);
                return "{" + entries.join(", ") + "}";
            }
            case "map": {
                const m = (v as MapVal).map as Map<string, RuntimeVal>;
                const entries = Array.from(m.entries()).map(([k, val]) => `${k}=>${stringifyVal(val)}`);
                return "Map{" + entries.join(", ") + "}";
            }
            case "set": {
                const s = (v as SetVal).values as RuntimeVal[];
                return "Set{" + s.map((x: RuntimeVal) => stringifyVal(x)).join(", ") + "}";
            }
            case "function": return "<function>";
            case "native-fn": return "<native-fn>";
            default: return String(v);
        }
    }

    env.declareVar("print", MK_NATIVE_FN((args) => {
        // If last arg is an options object with {sep, end}, consume it
        let sep = " ";
        let end = "\n";
        if (args.length > 0) {
            const last = args[args.length-1];
            if (last && last.type === 'object') {
                try {
                    const maybeSep = (last as any).properties.get('sep');
                    const maybeEnd = (last as any).properties.get('end');
                    if (maybeSep && maybeSep.type === 'string') sep = (maybeSep as StringVal).value;
                    if (maybeEnd && maybeEnd.type === 'string') end = (maybeEnd as StringVal).value;
                    args = args.slice(0, args.length-1);
                } catch {
                    // ignore
                }
            }
        }

        // Print all args on the same line separated by sep
        const out = args.map(a => stringifyVal(a)).join(sep) + end;
        // console.log auto-appends newline; use stdout.writeSync for control
        Deno.stdout.writeSync(new TextEncoder().encode(out));
        return MK_NULL();
    }), true);

    // len(v) - length of array or string, 0 for others
    env.declareVar('len', MK_NATIVE_FN((args) => {
        if (!args || args.length === 0) return MK_NUMBER(0);
        const v = args[0];
        if (v.type === 'string') return MK_NUMBER((v as StringVal).value.length);
        if (v.type === 'array') return MK_NUMBER((v as ArrayVal).elements.length);
        return MK_NUMBER(0);
    }), true);

    // toString(v)
    env.declareVar('toString', MK_NATIVE_FN((args) => {
        if (!args || args.length === 0) return MK_STRING('');
        return MK_STRING(stringifyVal(args[0]));
    }), true);

    // typeOf(v)
    env.declareVar('typeOf', MK_NATIVE_FN((args) => {
        if (!args || args.length === 0) return MK_STRING('undefined');
        return MK_STRING((args[0] as any).type || 'unknown');
    }), true);

    // assert(expr, msg?) - throws if expr falsy
    env.declareVar('assert', MK_NATIVE_FN((args) => {
        const cond = args[0];
        if (!cond) throw `Assertion failed: ${args[1] ? (args[1] as any).value : ''}`;
        return MK_NULL();
    }), true);

    // repr: detailed representation for debugging
    env.declareVar("repr", MK_NATIVE_FN((args) => {
        for (const a of args) {
            console.log(reprVal(a));
        }
        return MK_NULL();
    }), true);

    env.declareVar("format", MK_NATIVE_FN((args, _scope) => {
        if (!args || args.length == 0) return MK_STRING("");
        const first = args[0];
        if (first.type !== 'string') throw `format: first argument must be a string`;
        const outOrig = first as StringVal;
        let out = outOrig.value;
        for (let i = 1; i < args.length; i++) {
            const a = args[i];
            let replacement: string;
            switch (a.type) {
                case 'string': replacement = (a as StringVal).value; break;
                case 'number': replacement = String((a as NumberVal).value); break;
                case 'boolean': replacement = String((a as BooleanVal).value); break;
                case 'null': replacement = 'null'; break;
                default: replacement = '[object]'; break;
            }
            out = out.replace('{}', replacement);
        }
        return MK_STRING(out);
    }), true);

    // Simple fs object exposing a few useful sync wrappers
    const fsProps = new Map<string, RuntimeVal>();
    fsProps.set("readText", MK_NATIVE_FN((args) => {
        const path = args[0] as StringVal;
        const p = path.value as string;
        const txt = Deno.readTextFileSync(p);
        return MK_STRING(txt);
    }));
    fsProps.set("writeText", MK_NATIVE_FN((args) => {
        const path = args[0] as StringVal;
        const txt = args[1] as StringVal;
        Deno.writeTextFileSync(path.value, txt.value);
        return MK_NULL();
    }));
    fsProps.set("exists", MK_NATIVE_FN((args) => {
        const p = (args[0] as StringVal).value as string;
        try { Deno.statSync(p); return MK_BOOL(true); } catch { return MK_BOOL(false); }
    }));
    fsProps.set("readdir", MK_NATIVE_FN((args) => {
        const p = (args[0] as StringVal).value as string;
        const arr: any[] = [];
        for (const e of Deno.readDirSync(p)) {
            arr.push(MK_STRING(e.name));
        }
        return MK_ARRAY(arr as any);
    }));
    // new helpers
    fsProps.set("readJSON", MK_NATIVE_FN((args) => {
        const p = (args[0] as any).value as string;
        const txt = Deno.readTextFileSync(p);
        const parsed = JSON.parse(txt);
        // convert to runtime values shallowly
        function toRV(x: any): RuntimeVal {
            if (x === null) return MK_NULL();
            if (typeof x === "number") return MK_NUMBER(x);
            if (typeof x === "boolean") return MK_BOOL(x);
            if (typeof x === "string") return MK_STRING(x);
            if (Array.isArray(x)) return MK_ARRAY(x.map(toRV));
            if (typeof x === "object") {
                const m = new Map<string, RuntimeVal>();
                for (const k of Object.keys(x)) m.set(k, toRV(x[k]));
                return { type: "object", properties: m } as any;
            }
            return MK_NULL();
        }
        return toRV(parsed);
    }));
    fsProps.set("writeJSON", MK_NATIVE_FN((args) => {
        const p = (args[0] as any).value as string;
        const rv = args[1];
        function fromRV(v: RuntimeVal): any {
            switch (v.type) {
                case "null": return null;
                case "number": return (v as any).value;
                case "boolean": return (v as any).value;
                case "string": return (v as any).value;
                case "array": return (v as any).elements.map(fromRV);
                case "object": {
                    const o: any = {};
                    for (const [k, val] of (v as any).properties.entries()) o[k] = fromRV(val);
                    return o;
                }
                default: return null;
            }
        }
        const obj = fromRV(rv);
        Deno.writeTextFileSync(p, JSON.stringify(obj, null, 2));
        return MK_NULL();
    }));
    fsProps.set("mkdir", MK_NATIVE_FN((args) => {
        const p = (args[0] as any).value as string;
        Deno.mkdirSync(p, { recursive: true });
        return MK_NULL();
    }));
    fsProps.set("remove", MK_NATIVE_FN((args) => {
        const p = (args[0] as any).value as string;
        Deno.removeSync(p, { recursive: true });
        return MK_NULL();
    }));

    env.declareVar('fs', { type: 'object', properties: fsProps } as ObjectVal, true);

    function timeFunction(_args: RuntimeVal[], _env: Enviroment) {
        return MK_NUMBER(Date.now());
    }
    
    env.declareVar("time", MK_NATIVE_FN(timeFunction), true);

        // input(prompt?) - lee una línea desde stdin
    env.declareVar("input", MK_NATIVE_FN((args) => {
        let prompt = "";
        if (args.length > 0 && args[0].type === "string") {
            prompt = (args[0] as StringVal).value;
        }

        // Mostrar el prompt sin salto de línea
        if (prompt) {
            Deno.stdout.writeSync(new TextEncoder().encode(prompt));
        }

        // Leer la entrada del usuario desde stdin
        const buf = new Uint8Array(1024);
        const n = <number>Deno.stdin.readSync(buf);
        if (n === null) return MK_STRING(""); // EOF

        // Convertir a string limpio
        const inputStr = new TextDecoder().decode(buf.subarray(0, n)).trimEnd();

        return MK_STRING(inputStr);
    }), true);

    return env;
}

export default class Enviroment {
    private parent?: Enviroment;
    private variables: Map<string, RuntimeVal>;
    private constants: Set<string>;

    constructor (parentENV?: Enviroment) {
        //const global = parentENV ? true : false;
        this.parent = parentENV;
        this.variables = new Map();
        this.constants = new Set();
    }

    public declareVar (varname: string, value: RuntimeVal, constant: boolean): RuntimeVal {
        if (this.variables.has(varname)) {
            throw `Cannot declare variable ${varname}. As it already is defined.`;
        }
        this.variables.set(varname, value);

        if (constant)
            this.constants.add(varname);
        return value;
    }

    public assignVar (varname: string, value: RuntimeVal): RuntimeVal {
        const env = this.resolve(varname);
        if (env.constants.has(varname)) {
            throw `Cannot reassign to variable ${varname} as it was declared constant.`;
        }
        env.variables.set(varname, value);
        return value;
    }

    public lookupVar (varname: string): RuntimeVal {
        const env  = this.resolve(varname);
        return env.variables.get(varname) as RuntimeVal;
    }

    public resolve(varname: string): Enviroment {
        if(this.variables.has(varname)){
            return this;
        }
        if (this.parent == undefined) {
            throw `Cannot resolve '${varname}' as it does not exist.`;
        }

        return this.parent.resolve(varname); 
    }

    // Return a lightweight snapshot of declared variables (name, type, string)
    public listVars(): Array<{ name: string; type: string; repr: string }> {
        const out: Array<{ name: string; type: string; repr: string }> = [];
        for (const [k, v] of this.variables.entries()) {
            let repr = '';
            switch (v.type) {
                case 'string': repr = '"' + (v as any).value + '"'; break;
                case 'number': repr = String((v as any).value); break;
                case 'boolean': repr = String((v as any).value); break;
                case 'null': repr = 'null'; break;
                case 'array': repr = '[' + ((v as any).elements || []).slice(0,5).map((x: any) => x.type === 'string' ? '"'+x.value+'"' : String(x.type)).join(', ') + ((v as any).elements && (v as any).elements.length > 5 ? ', ...' : '') + ']'; break;
                case 'object': repr = '{...}'; break;
                case 'map': repr = 'Map{...}'; break;
                case 'set': repr = 'Set{...}'; break;
                case 'function': repr = '<function>'; break;
                case 'native-fn': repr = '<native-fn>'; break;
                default: repr = String(v);
            }
            out.push({ name: k, type: v.type, repr });
        }
        return out;
    }
}