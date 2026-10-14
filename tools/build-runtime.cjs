const fs=require('node:fs');
const path=require('node:path');
const {read,write}=require('./runtime-config.cjs');
const root=path.resolve(__dirname,'..'),runtime=read(root);
runtime.config=JSON.parse(fs.readFileSync(path.join(__dirname,'app-runtime.json'),'utf8'));
write(root,runtime);
// Keep the discreet version indicator in sync with the package release.
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const badge=`<details id="patrimonio-version" style="position:fixed;right:8px;bottom:4px;z-index:9999;font:10px/1.4 system-ui,sans-serif;color:#666;background:rgba(255,255,255,.94);border-radius:4px;padding:2px 5px;max-width:230px"><summary style="cursor:pointer" aria-label="Consultar versão da aplicação">v${version}</summary><div style="padding:6px 2px;font-size:12px">Património · Versão ${version}</div></details>`;
for(const name of fs.readdirSync(root).filter(name=>name.endsWith('.html'))){
  const file=path.join(root,name);
  let html=fs.readFileSync(file,'utf8').replace(/<details id="patrimonio-version"[\s\S]*?<\/details>/g,'');
  html=html.replace('</body>',badge+'</body>').replace(/(_app-257c353de153362d\.js\?v=)[^" ]+/g,'$1'+version);
  // Adiar o runtime JSONata (não usado pela app) para não bloquear o parsing.
  html=html.replace(/<script type="text\/javascript" src="nodered\.min\.js">/g,'<script type="text/javascript" src="nodered.min.js" defer>');
  fs.writeFileSync(file,html);
}
console.log('Configuração incorporada no runtime. Execute npm test e verifique a app no navegador.');
