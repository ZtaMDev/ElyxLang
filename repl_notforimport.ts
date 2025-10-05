// deno-lint-ignore-file verbatim-module-syntax
import Parser from "./frontend/parser.ts";
import { createGlovalEnv } from "./runtime/enviroment.ts";
import { evaluate } from "./runtime/interpreter.ts";
import { NativeFnValue } from "./runtime/values.ts";

await repl(); // Remove top-level running to allow CLI to import and call it
export async function repl () {
    const parser = new Parser()
    let env = createGlovalEnv();
    console.log(`Running repl (type ':raw <expr>' to show raw evaluate output, otherwise print()). Use ':help' to show the help screen.`);
    const history: string[] = [];
    while (true) {
        const input = prompt("> ");
        if (!input || input.includes('exit')) {
            Deno.exit(1);
        }

        // store history
        history.push(input);

        // clear screen command
        const trimmed = input.trim();
            if (trimmed === ':clear' || trimmed === 'clear' || trimmed === ':cls' || trimmed === 'cls') {
                // Detect VS Code integrated terminal heuristically (env access optional)
                let isVSCode = false;
                try {
                    const vscodePid = Deno.env.get('VSCODE_PID');
                    const termProgram = Deno.env.get('TERM_PROGRAM');
                    isVSCode = !!vscodePid || termProgram === 'vscode';
                } catch {
                    // If we don't have permission to read env, assume not VS Code
                    isVSCode = false;
                }

                // Multi-strategy clear: order depends on whether we think we're in VS Code.
                const encoder = new TextEncoder();
                const tryWrite = (s: string) => {
                    try { Deno.stdout.writeSync(encoder.encode(s)); return true; } catch { return false; }
                };

                // Helper to try platform clear commands
                const tryPlatformClear = async () => {
                    try {
                        if (Deno.build.os === 'windows') {
                            // Prefer cmd cls on VS Code (often invoked by cmd), otherwise try PowerShell first.
                            if (isVSCode) {
                                try { await new Deno.Command('cmd', { args: ['/c', 'cls'], stdout: 'null', stderr: 'null' }).output(); return; } catch (_e) { /* ignore */ }
                                try { await new Deno.Command('powershell', { args: ['-NoProfile', '-Command', 'Clear-Host'], stdout: 'null', stderr: 'null' }).output(); return; } catch (_e) { /* ignore */ }
                            } else {
                                try { await new Deno.Command('powershell', { args: ['-NoProfile', '-Command', 'Clear-Host'], stdout: 'null', stderr: 'null' }).output(); return; } catch (_e) { /* ignore */ }
                                try { await new Deno.Command('cmd', { args: ['/c', 'cls'], stdout: 'null', stderr: 'null' }).output(); return; } catch (_e) { /* ignore */ }
                            }
                        } else {
                            // unix-like
                            if (isVSCode) {
                                try { await new Deno.Command('clear', { stdout: 'null', stderr: 'null' }).output(); return; } catch (_e) { /* ignore */ }
                                try { await new Deno.Command('reset', { stdout: 'null', stderr: 'null' }).output(); return; } catch (_e) { /* ignore */ }
                            } else {
                                try { await new Deno.Command('clear', { stdout: 'null', stderr: 'null' }).output(); return; } catch (_e) { /* ignore */ }
                                try { await new Deno.Command('reset', { stdout: 'null', stderr: 'null' }).output(); return; } catch (_e) { /* ignore */ }
                            }
                        }
                    } catch {
                        // ignore permission or execution errors
                    }
                };

                if (isVSCode) {
                    // In VS Code try shell-native clear first (cls/clear), then fall back to device reset and ANSI sequences.
                    await tryPlatformClear();
                    // device reset
                    tryWrite('\x1bc');
                    // ANSI scrollback + screen clear + home
                    tryWrite('\x1b[3J\x1b[2J\x1b[H');
                } else {
                    // Non-VS Code terminals: ANSI first, then device reset, then platform commands
                    tryWrite('\x1b[3J\x1b[2J\x1b[H');
                    tryWrite('\x1bc');
                    await tryPlatformClear();
                }

                // Fallback: write a bunch of newlines and move cursor home to simulate a clear
                if (!tryWrite('\n'.repeat(200) + '\x1b[H')) {
                    for (let i = 0; i < 200; i++) console.log('');
                }

                continue;
        }

        // help
        if (trimmed === ':help' || trimmed === 'help') {
            console.log(":help / help    - show this help\n:env           - list environment variables\n:reset         - recreate the global environment (clears variables)\n:history       - show last commands\n:clear / clear - clear screen\n:raw <expr>    - evaluate and show raw runtime value");
            continue;
        }

        // env
        if (trimmed === ':env') {
            const vars = env.listVars();
            for (const v of vars) console.log(`${v.name}: ${v.type} = ${v.repr}`);
            continue;
        }

        // reset environment
        if (trimmed === ':reset') {
            env = createGlovalEnv();
            console.log('Environment reset.');
            continue;
        }

        // history
        if (trimmed === ':history') {
            history.slice(-100).forEach((h, i) => console.log(i + 1, h));
            continue;
        }

        let useRaw = false;
        let expr = input;
        if (input.startsWith(":raw ")) {
            useRaw = true;
            expr = input.slice(5);
        }

        try {
            const program = parser.produceAST(expr);
            const result = evaluate(program, env);
            if (useRaw) {
                console.log(result);
            } else {
                // call print with the result so it is formatted nicely
                const p = env.lookupVar('print');
                // p is native-fn
                if (p && p.type === 'native-fn') {
                    (p as NativeFnValue).call([result], env);
                } else {
                    console.log(result);
                }
            }
        } catch (err) {
            // Show the error, reset environment, and continue the REPL
            console.error("Error:", err);
            env = createGlovalEnv();
            console.log("Environment reset due to error. You can continue in a fresh environment.");
            continue;
        }
    }
}