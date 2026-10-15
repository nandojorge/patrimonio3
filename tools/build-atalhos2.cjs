/**
 * Etapa 2A — Page2 (nova despesa) lê os parâmetros do atalho:
 *  - declara os parâmetros aceites em Page2.parameters
 *  - fluxo `atalho.apply` (guard: usaratalho=='1') que pré-preenche os pageVars
 *  - evento de montagem `atalho.mount` -> atalho.apply (uma vez por navegação)
 * Uso: node tools/build-atalhos2.cjs && npm test
 */
const fs = require('node:fs');
const path = require('node:path');
const PATH = path.resolve(__dirname, '..', 'tools', 'app-runtime.json');
const app = JSON.parse(fs.readFileSync(PATH, 'utf8'));

const P2 = 'page.Page2';
const FIELDS = ['valordespesa','entradasaida','vivuspessoal','categoriadespesa','despesafixa',
  'descricaodespesa','conta','contacontabilidade','percentagemarepor','valorarepor','cu'];

// 1. declarar parâmetros aceites
app.screens[P2].parameters = app.screens[P2].parameters || {};
for (const f of ['usaratalho','atalhonome',...FIELDS]) app.screens[P2].parameters[f] = null;

// 2. fluxo atalho.apply: guard -> Set1 -> Set2 -> ... -> fim
const TRUE='ceeba261-e546-4b5f-af45-47b75226fb2c', FALSE='871f4881-b57c-41d5-9934-a69367733066', SET='aab5c5a6-049b-4e2b-8068-aac6d1c8cab3';
const nodes = {
  'atalho.guard': {
    type:'function', title:'If condition', ref:{type:'flow-function', id:'own_225eb957.12fbd'},
    inputs:{ condition:{ source:'expression', key:{
      script:'IS_EQUAL(LOOKUP(params,"usaratalho"),"1")',
      formula:'IS_EQUAL(LOOKUP(params,"usaratalho"),"1")',
      functions:['IS_EQUAL','LOOKUP'],
      dependencies:[['params','usaratalho']],
    }}},
    connections:{ [TRUE]:[{type:'node', id:'atalho.v1'}], [FALSE]:[{type:'output', id:'atalho.apply-success-output'}] },
  },
};
FIELDS.forEach((f,i)=>{
  const id = 'atalho.v'+(i+1);
  const next = i+1 < FIELDS.length ? 'atalho.v'+(i+2) : null;
  nodes[id] = {
    type:'function', title:'Set page variable', ref:{type:'flow-function', id:'own_23268044.e1e2b'},
    inputs:{ variable:{ key:{ value:{source:'parameter', key:f}, reference:{source:'page-variable-ref', key:f} }, source:'object' } },
    connections: next ? { [SET]:[{type:'node', id:next}] } : { [SET]:[{type:'output', id:'atalho.apply-success-output'}] },
  };
});
app.logic.flows['atalho.apply'] = {
  title:'atalho.apply', nodes,
  inputs:{type:'object', properties:{}, required:[]},
  outputs:{ 'atalho.apply-success-output':{ title:'Success', description:'Flow executed successfully', kind:'success', order:0, values:{} } },
  startConnection:{type:'node', id:'atalho.guard'},
  variables:{}, pageId:P2, contextId:'page:2',
};

// 3. evento de montagem -> atalho.apply
app.logic.events['atalho.mount'] = {
  id:'atalho.mount', name:'', eventSource:'page:2:onPageDidMount',
  triggeredFlows:['atalho.apply'], fallbackName:'Page mounted', pageId:P2, contextId:'page:2',
};
const mountEvents = app.screens[P2].events.onPageDidMount;
if (!mountEvents.some(e=>e.id==='atalho.mount')) mountEvents.push({id:'atalho.mount'});

fs.writeFileSync(PATH, JSON.stringify(app, null, 1));
console.log('OK etapa 2A escrita. atalho.apply + evento de montagem + parâmetros Page2.');
