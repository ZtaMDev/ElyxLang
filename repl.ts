// deno-lint-ignore-file verbatim-module-syntax no-empty
import Parser from "./frontend/parser.ts";
import { createGlovalEnv } from "./runtime/enviroment.ts";
import { evaluate } from "./runtime/interpreter.ts";
import { NativeFnValue } from "./runtime/values.ts";

// await repl(); // Remove top-level running to allow CLI to import and call it
export async function repl () {
    const parser = new Parser()
    let env = createGlovalEnv();
    console.log(`Running repl (type ':raw <expr>' to show raw evaluate output, otherwise print()). Use ':help' to show the help screen.`);
    const history: string[] = [];
    while (true) {
            const input = prompt("> ");
            // prompt() returns string | null. If null, exit the REPL.
            if (input === null) {
                Deno.exit(1);
            }

            // store history
            history.push(input);

            const trimmed = input.trim();

            // exit command
            if (trimmed === ":exit" || trimmed === "exit" || trimmed === ":quit" || trimmed === "quit") {
                console.log("Exiting DSX REPL. Bye!");
                Deno.exit(0);
            }

            // clear screen command
            if (trimmed === ':clear' || trimmed === 'clear' || trimmed === ':cls' || trimmed === 'cls') {
                // Detect VS Code integrated terminal heuristically (optional)
                let isVSCode = false;
                try {
                    const vscodePid = Deno.env.get("VSCODE_PID");
                    const termProgram = Deno.env.get("TERM_PROGRAM");
                    isVSCode = !!vscodePid || termProgram === "vscode";
                } catch {
                    isVSCode = false;
                }

                const encoder = new TextEncoder();
                const tryWrite = (s: string) => {
                    try {
                        Deno.stdout.writeSync(encoder.encode(s));
                        return true;
                    } catch {
                        return false;
                    }
                };

                // Helper to try platform-specific clear commands
                const tryPlatformClear = async () => {
                    try {
                        if (Deno.build.os === "windows") {
                            if (isVSCode) {
                                try {
                                    await new Deno.Command("cmd", { args: ["/c", "cls"], stdout: "null", stderr: "null" }).output();
                                    return;
                                } catch {}
                                try {
                                    await new Deno.Command("powershell", { args: ["-NoProfile", "-Command", "Clear-Host"], stdout: "null", stderr: "null" }).output();
                                    return;
                                } catch {}
                            } else {
                                try {
                                    await new Deno.Command("powershell", { args: ["-NoProfile", "-Command", "Clear-Host"], stdout: "null", stderr: "null" }).output();
                                    return;
                                } catch {}
                                try {
                                    await new Deno.Command("cmd", { args: ["/c", "cls"], stdout: "null", stderr: "null" }).output();
                                    return;
                                } catch {}
                            }
                        } else {
                            if (isVSCode) {
                                try {
                                    await new Deno.Command("clear", { stdout: "null", stderr: "null" }).output();
                                    return;
                                } catch {}
                                try {
                                    await new Deno.Command("reset", { stdout: "null", stderr: "null" }).output();
                                    return;
                                } catch {}
                            } else {
                                try {
                                    await new Deno.Command("clear", { stdout: "null", stderr: "null" }).output();
                                    return;
                                } catch {}
                                try {
                                    await new Deno.Command("reset", { stdout: "null", stderr: "null" }).output();
                                    return;
                                } catch {}
                            }
                        }
                    } catch {
                        // ignore permission or execution errors
                    }
                };

                if (isVSCode) {
                    // VSCode terminals sometimes need both ANSI and shell commands
                    await tryPlatformClear();
                    tryWrite("\x1bc"); // device reset
                    tryWrite("\x1b[3J\x1b[2J\x1b[H"); // scrollback + clear + home
                } else {
                    // Non-VSCode: ANSI first, then device reset, then platform commands
                    tryWrite("\x1b[3J\x1b[2J\x1b[H");
                    tryWrite("\x1bc");
                    await tryPlatformClear();
                }

                // Fallback: write a bunch of newlines and move cursor home
                if (!tryWrite("\n".repeat(200) + "\x1b[H")) {
                    for (let i = 0; i < 200; i++) console.log("");
                }

                continue;
            }


            // help
            if (trimmed === ':help' || trimmed === 'help') {
                console.log(
            `:help / help     - show this help
            :env             - list environment variables
            :reset           - recreate the global environment (clears variables)
            :history         - show last commands
            :clear / clear   - clear screen
            :exit / exit     - exit the REPL
            :raw <expr>      - evaluate and show raw runtime value`
                );
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
                // no mostrar `null` retornado por funciones nativas (como print)
                if (result.type !== "null") {
                    const p = env.lookupVar("print");
                    if (p && p.type === "native-fn") {
                        (p as NativeFnValue).call([result], env);
                    } else {
                        console.log(result);
                    }
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