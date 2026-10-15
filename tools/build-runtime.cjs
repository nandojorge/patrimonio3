const fs=require('node:fs');
const path=require('node:path');
const {read,write}=require('./runtime-config.cjs');
const root=path.resolve(__dirname,'..'),runtime=read(root);
runtime.config=JSON.parse(fs.readFileSync(path.join(__dirname,'app-runtime.json'),'utf8'));
write(root,runtime);
// Keep the discreet version indicator in sync with the package release.
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const badge=`<details id="patrimonio-version" style="position:fixed;right:8px;bottom:4px;z-index:9999;font:10px/1.4 system-ui,sans-serif;color:#666;background:rgba(255,255,255,.94);border-radius:4px;padding:2px 5px;max-width:230px"><summary style="cursor:pointer" aria-label="Consultar versão da aplicação">v${version}</summary><div style="padding:6px 2px;font-size:12px">Património · Versão ${version}</div></details>`;
// O menu lateral é desenhado a partir do navConfig hibernado em __NEXT_DATA__ (index.html),
// não do runtime JSON. Derivá-lo da navegação atual mantém ambos sincronizados.
const nav=runtime.config.navigation, tabs=nav.mobile.tabs;
const routeConfigs={}; tabs.forEach((t,i)=>{routeConfigs['t'+i]={initialRouteName:t.pageId,iconName:t.iconName||''};}); routeConfigs.Login={};
const navConfig={
  blueprint:'legacy', legacyLayouts:nav.legacyLayouts,
  initPageId:tabs[0].pageId, defaultPageId:tabs[0].pageId,
  authenticationEnabled:nav.mobile.isAuthenticationEnabled,
  authPageId:nav.mobile.authPageId||tabs[0].pageId,
  enabled:nav.mobile.enabled, headerEnabled:nav.mobile.headerEnabled, headerText:nav.mobile.headerText||'',
  tabs:tabs.map((t,i)=>({title:t.title,name:'t'+i})),
  screens:Object.keys(runtime.config.screens), routeConfigs,
};
// Cada ecrã de separador tem o seu ficheiro de rota (page.PageN.html e m-page.PageN.html).
// Gerar os que faltam a partir de um doador existente, trocando apenas rota/slug.
function makeRouteFile(prefix,pageId){
  const file=path.join(root,prefix+pageId+'.html');
  if(fs.existsSync(file))return;
  const donor=fs.readdirSync(root).find(n=>n.endsWith('.html')&&n.startsWith(prefix+'page.')&&n!==prefix+pageId+'.html');
  if(!donor)return;
  const donorId=donor.replace(/\.html$/,'');
  let html=fs.readFileSync(path.join(root,donor),'utf8');
  html=html.split('"name":"'+donorId+'"').join('"name":"'+pageId+'"');
  html=html.split('"key":"'+donorId+'"').join('"key":"'+pageId+'"');
  html=html.split('"slug":"'+donorId+'"').join('"slug":"'+pageId+'"');
  fs.writeFileSync(file,html);
}
for(const t of nav.mobile.tabs){ makeRouteFile('',t.pageId); makeRouteFile('m-',t.pageId); }
for(const name of fs.readdirSync(root).filter(name=>name.endsWith('.html'))){
  const file=path.join(root,name);
  let html=fs.readFileSync(file,'utf8').replace(/<details id="patrimonio-version"[\s\S]*?<\/details>/g,'');
  html=html.replace(/(<script id="__NEXT_DATA__" type="application\/json">)([\s\S]*?)(<\/script>)/,(m,open,payload,close)=>{
    const nd=JSON.parse(payload);
    if(nd&&nd.props&&nd.props.pageProps&&nd.props.pageProps.initialState){
      const st=typeof nd.props.pageProps.initialState==='string'?JSON.parse(nd.props.pageProps.initialState):nd.props.pageProps.initialState;
      st.navConfig=navConfig;
      nd.props.pageProps.initialState=JSON.stringify(st);
    }
    return open+JSON.stringify(nd)+close;
  });
  html=html.replace('</body>',badge+'</body>').replace(/(_app-257c353de153362d\.js\?v=)[^" ]+/g,'$1'+version);
  // Adiar o runtime JSONata (não usado pela app) para não bloquear o parsing.
  html=html.replace(/<script type="text\/javascript" src="nodered\.min\.js">/g,'<script type="text/javascript" src="nodered.min.js" defer>');
  fs.writeFileSync(file,html);
}
console.log('Configuração incorporada no runtime. Execute npm test e verifique a app no navegador.');
