Elyx — small scripting language (Deno)
=====================================

Elyx is a compact scripting language implemented in TypeScript and designed to run on Deno. It grew from a tutorial-based interpreter project and has been extended with many practical features including a usable REPL, classes, try/catch, switch/case, and packaging-ready CLI binaries.

Features
--------
- Familiar C/JS-like expression and statement syntax with optional semicolons.
- Numbers (including decimal literals, e.g. `3.14`, `.5`).
- Strings and f-strings (interpolated with `{}` inside `f"..."`).
- Arrays, objects, maps and sets.
- First-class functions and native functions.
- Classes with methods and `this` binding, fields and simple instantiation via calling the class name.
- try / catch / finally and `throw`.
- switch / case with fallthrough and `break`.
- Control flow: `if` / `elif` / `else`, `for`, `for..of`, `while`, `break`, `continue`, `return`.
- Built-in helpers: `print`, `repr`, `len`, `typeOf`, and FS helpers via standard library in the environment.

REPL
----
- Persistent command history.
- Commands: `:help`, `:env`, `:reset`, `:history`, `:clear` / `:cls`, `:raw <expr>`.
- Robust clearing behavior (ANSI sequences, device reset, tries shell `clear`/`cls` when allowed).
- REPL is resilient: parse/eval errors do not exit the session; errors are printed and the environment is reset so you can continue.

CLI and Packaging
-----------------
- `cli.ts` — CLI entry to run `.dsx` scripts or launch the REPL.
- `dsxrepl.ts` — small wrapper used as a clean REPL entrypoint for `deno compile`.
- Prebuilt native binaries (compiled with `deno compile`) are placed in the project root when you run the build steps (`dsx.exe` and `dsxrepl.exe` on Windows in this repo).
- `deno.json` contains compiler options with `deno.ns` types and basic project metadata.

Examples
--------
Class example:

```
class Person {
  constructor(name) {
    this.name = name;
  }

  greet() {
    print("Hello, " + this.name + "!");
  }
}

p = Person("Alice");
p.greet();

p.name = "Bob";
p.greet();
```

Switch example:

```
x = 2;
switch (x) {
  case 1:
    print("one");
    break;
  case 2:
    print("two");
    // fallthrough
  case 3:
    print("two or three");
    break;
  default:
    print("other");
}
```

Decimal numbers:

```
const PI = 3.14
let half = .5
```

Permissions
-----------
- REPL / CLI features that interact with the host (clearing terminal via external commands, listing environment variables, file IO) require appropriate Deno permissions: `--allow-read`, `--allow-run`, `--allow-env`.
- For local development you can run the CLI with full permissions (`-A`) or use the compiled executables to avoid permission prompts.

Author, credits and history
---------------------------
- Author / maintainer of these changes and packaging: ZtaMDev (https://github.com/ZtaMDev).
- Original interpreter tutorial and foundation: inspired by the tutorial by Tyler Laceby and other educational resources on building interpreters.
- Notable additions in this fork / work:
  - A robust REPL with persistent history and commands.
  - Improved terminal clear handling and VS Code heuristics.
  - Decimal number support (including leading-dot decimals like `.5`).
  - Classes, method binding (`this`), class instantiation via calling, and instance field assignment.
  - try/catch/finally, throw semantics.
  - switch/case statements with fallthrough handling.
  - Packaging as native executables via `deno compile` and helper scripts for production runs.

Build / run
-----------
- To run the REPL using Deno (development):

```powershell
deno run --allow-read --allow-run --allow-env cli.ts repl
```

- To run a `.dsx` script:

```powershell
deno run --allow-read cli.ts test.dsx
```

- To build native binaries (Windows):

```powershell
deno compile --allow-read --allow-run --allow-env --unstable --output dsx cli.ts
deno compile --allow-read --allow-run --allow-env --unstable --output dsxrepl dsxrepl.ts
```

- Production helper scripts included:
  - `run-dsx.ps1` — runs `dsx.exe` if present and sets `DENO_TRACE_PERMISSIONS=0` to avoid permission trace prompts.
  - `run-all.ps1` — uses compiled executable if present, otherwise runs `deno run -A cli.ts`.

License
-------
MIT

---

If you want, I can expand the README with API docs for the builtins, examples linked from `test.dsx`, and a short contributor guide. ¿Quieres que añada eso?  

Installer / Windows setup (Inno Setup)
------------------------------------
You can distribute Elyx as a normal Windows application installer so users can "install" it and run `dsx` or `dsxrepl` from a terminal or via the Start menu.

Basic workflow (what the installer will do):
- Copy `dsx.exe` and `dsxrepl.exe` to the installation folder (e.g., `C:\Program Files\Elyx`).
- Install the `icon.ico` and `README.md` into the install folder.
- Create Start Menu shortcuts for the REPL (`dsxrepl`) and for the CLI documentation/README if desired.
- Optionally add the install folder to the user PATH (Inno Setup can do this) so the user can run `dsx` and `dsxrepl` from any terminal.

Files to prepare before building the installer:
1. `dsx.exe` and `dsxrepl.exe` (generated with `deno compile`).
2. `icon.ico` (optional) to use as installer/app icon.
3. `README.md`, `LICENSE` and any other extras you want to ship.

I included an example Inno Setup script and a tiny packaging helper to collect the files into `dist\` (so you can open the `.iss` file in Inno Setup and build a standard Windows installer):

- `installer/elyx_installer.iss` — an example script for Inno Setup (edit AppName/AppVersion/Publisher paths as needed).
- `package_for_installer.ps1` — simple PowerShell helper that copies the compiled binaries + README + icon to a `dist` folder ready for Inno Setup to package.

Typical steps to create the installer on Windows:

1. Build binaries (if you haven't yet):

```powershell
deno compile --allow-read --allow-run --allow-env --unstable --output dsx cli.ts
deno compile --allow-read --allow-run --allow-env --unstable --output dsxrepl dsxrepl.ts
```

2. Prepare the `dist` folder using the helper:

```powershell
.\package_for_installer.ps1
```

3. Open `installer\elyx_installer.iss` in Inno Setup (https://jrsoftware.org/isinfo.php) and click Build.

4. The resulting `Setup_Elyx_x.y.z.exe` will install Elyx to Program Files and create Start Menu shortcuts. After installation the user can run `dsx` or `dsxrepl` from a terminal or search for "Elyx REPL" in the Start Menu.

If you want I can further customize the Inno script to automatically add the installation folder to the PATH (with an option), register uninstaller entries, or create a multi-architecture installer. Tell me how you want the installer to behave and I'll adapt the `.iss` script.