import Parser from "../frontend/parser.ts";
import { evaluate } from "../runtime/interpreter.ts";
import { createGlovalEnv } from "../runtime/enviroment.ts";

// This runner will exercise the fs API we added.
const code = `
let path = "./tools/_fs_test_dir";
fs.mkdir(path);
let file1 = path + "/foo.txt";
fs.writeText(file1, "hello world");
let exists1 = fs.exists(file1);
print(exists1);
let txt = fs.readText(file1);
print(txt);
let jsonFile = path + "/data.json";
let obj = { a: 1, b: [1,2,3], c: "hi" };
fs.writeJSON(jsonFile, obj);
let read = fs.readJSON(jsonFile);
repr(read);
let listing = fs.readdir(path);
repr(listing);
fs.remove(path);
print(fs.exists(path));
`;

const parser = new Parser();
const ast = parser.produceAST(code);
const env = createGlovalEnv();
evaluate(ast, env);

console.log("Done test_fs");
