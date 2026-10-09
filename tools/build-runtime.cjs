const fs=require('node:fs');
const path=require('node:path');
const {read,write}=require('./runtime-config.cjs');
const root=path.resolve(__dirname,'..'),runtime=read(root);
runtime.config=JSON.parse(fs.readFileSync(path.join(__dirname,'app-runtime.json'),'utf8'));
write(root,runtime);
console.log('Configuração incorporada no runtime. Execute npm test e verifique a app no navegador.');
