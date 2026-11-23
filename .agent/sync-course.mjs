import fs from 'node:fs';
import path from 'node:path';
import ts from '../ts_version/project/node_modules/typescript/lib/typescript.js';
const root = process.cwd();
const from = path.join(root, 'ts_version/project'), to = path.join(root, 'js_version/project');
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (file.endsWith('.d.ts')) continue;
    const rel = path.relative(from, file), target = path.join(to, rel.replace(/\.ts$/, '.js'));
    let text = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.ts')) text = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true } }).outputText;
    if (file.endsWith('.svelte')) text = text.replace(/<script lang="ts">([\s\S]*?)<\/script>/g, (_, body) => '<script>\n' + ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true } }).outputText.replace(/^export \{\};\s*$/m, '') + '</script>');
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text);
  }
}
walk(path.join(from, 'src'));
for (const name of ['.env.example', 'server.mjs']) fs.copyFileSync(path.join(from, name), path.join(to, name));
if (fs.existsSync(path.join(from, 'scripts'))) walk(path.join(from, 'scripts'));
if (fs.existsSync(path.join(from, 'tests'))) {
  walk(path.join(from, 'tests'));
  const tests = path.join(to, 'tests/unit.test.mjs');
  fs.writeFileSync(tests, fs.readFileSync(tests, 'utf8').replaceAll('.ts\'', '.js\''));
}
for (const name of ['Dockerfile', '.dockerignore']) fs.copyFileSync(path.join(from, name), path.join(to, name));
fs.copyFileSync(path.join(from, 'static/openapi.json'), path.join(to, 'static/openapi.json'));
console.log('JS/TS source synchronized');
