const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const bundle = '_next/static/chunks/pages/_app-257c353de153362d.js';
function read(root) {
  const source = fs.readFileSync(path.join(root, bundle), 'utf8');
  for (const match of source.matchAll(/JSON\.parse\(('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\)/g)) {
    if (match[1].length < 100000) continue;
    const config = JSON.parse(vm.runInNewContext(match[1], {}, { timeout: 1000 }));
    if (config.screens && config.logic) return { config, source, start: match.index, end: match.index + match[0].length };
  }
  throw new Error('Configuração AppGyver não encontrada.');
}
function write(root, runtime) {
  // A double-quoted JS literal preserves JSON escapes, apostrophes and Unicode safely.
  const expression = 'JSON.parse(' + JSON.stringify(JSON.stringify(runtime.config)) + ')';
  fs.writeFileSync(path.join(root, bundle), runtime.source.slice(0, runtime.start) + expression + runtime.source.slice(runtime.end));
}
module.exports = { read, write, bundle };
