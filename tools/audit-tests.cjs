const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {read,bundle}=require('./runtime-config.cjs');
const root=path.resolve(__dirname,'..'),app=read(root).config;
const originalRoot=process.argv[2] || (fs.existsSync(path.resolve(root,'../patrimonio2')) ? path.resolve(root,'../patrimonio2') : null);
let checks=0;function test(name,fn){fn();checks++;console.log('PASS',name);}
const channels={set:'aab5c5a6-049b-4e2b-8068-aac6d1c8cab3',data:'60c0a221-8687-465d-9249-53c98311db9b',get:'81ba0b09-224c-4016-8f13-839c8a3ef20a',getError:'08036d98-5276-477e-885d-bf5a093053e3',yes:'d439758f-3d3e-4b03-adcf-bb093c3ff1fc',no:'08c2f10b-bcff-4c63-a29d-cbfe6fa69a9c',ok:'180fc790-08a9-44c1-b7ab-265caf4f13e7',bad:'a4ec0b24-5bf1-40d3-97f0-91689c16c0be',err:'d0ffa631-53c6-4352-8b33-0db7034ae11f',alert:'4b40389a-e389-4658-8a3b-4fe47959ade7',true:'ceeba261-e546-4b5f-af45-47b75226fb2c',false:'871f4881-b57c-41d5-9934-a69367733066'};
const functions={LOOKUP:(o,k)=>o?.[k],IS_EMPTY:v=>v==null||v===''||(Array.isArray(v)&&!v.length),IS_EQUAL:(a,b)=>a===b,IS_NUMBER:v=>typeof v==='number'&&Number.isFinite(v),NUMBER:v=>Number(v),STRING:v=>String(v),REPLACE_ALL:(s,a,b)=>String(s).split(a).join(b),IF:(c,a,b)=>c?a:b,MAP:(xs,f)=>(xs||[]).map(f),MAX:xs=>Math.max(...xs),RANDOM:()=>0.25,NOW:()=>new Date('2026-10-09T12:00:00Z'),DATETIME:v=>new Date(v),PICK_ITEM:(xs,i)=>xs[i],FORMAT_DATETIME_WITH_TIMEZONE:(v)=>new Date(v).toISOString().slice(0,10),FORMAT_DATETIME_LOCAL:(v,fmt)=>{const d=new Date(v);if(!Number.isFinite(+d))return 'Invalid date';const s=d.toISOString();return fmt==='DD'?s.slice(8,10):fmt==='MM'?s.slice(5,7):fmt==='YYYY'?s.slice(0,4):s.slice(0,10);}};
function evaluate(script,state){return vm.runInNewContext('('+script+')',{...functions,...state},{timeout:100});}
function run(fid,options={}){
 const f=app.logic.flows[fid];const pageVars={...app.screens[f.pageId].pageVariables,...options.pageVars};
 const state={pageVars,params:{id:'5',iddespesa:'5',conta:'Ana',valorarepor:'12.50',descricao:'Teste',...options.params},data:{despesasstein1:[],viagensstein1:[]},repeated:{current:{Valor:'12.50',nome:'Teste',Data:'2026-10-09',codigopagamento:'9',codigocontacto:'8'}}};
 const trace=[],requests=[],alerts=[],results={};state.outputs=results;let current=f.startConnection,confirmIndex=0,navigated=false;
 for(let step=0;step<60&&current?.type==='node';step++){
  const n=f.nodes[current.id];assert(n,'Dangling node '+current.id);trace.push(n.title);let channel;
  if(n.title==='Set page variable'){const a=n.inputs.variable.key;pageVars[a.reference.key]=a.value.source==='expression'?evaluate(a.value.key.script,state):a.value.source==='parameter'?state.params[a.value.key]:a.value.key;channel=channels.set;}
  else if(n.title==='Get record collection'){results[current.id]={records:options.records||[{id_despesa:'20',id_viagens:'10'}]};channel=(options.readFailure||(options.directReadFailure&&current.id==='audit.readIDs'))?channels.getError:channels.get;if(options.recheckRecords&&current.id.startsWith('audit.recheck.'))results[current.id]={records:options.recheckRecords};}
  else if(n.title==='Set data variable'){const a=n.inputs.assignment.key;const [field,node]=a.data.key.split('@@@');state.data[a.reference.key]=results[node][field];channel=channels.data;}
  else if(n.title==='If condition'){const script=n.inputs.condition.key.script;if(script.includes('audit.recheckSet')||current.id.startsWith('audit.compare.')){const isViagens=script.includes('viagensstein1');const ref1=isViagens?'viagensstein1':'despesasstein1';const ref2=isViagens?'viagensstein2':'despesasstein2';const data1=state.data[ref1]||[];const data2=state.data[ref2]||[];const max1=data1.length?Math.max(...data1.map(r=>Number(r.id_despesa||r.id_viagens))):0;const max2=data2.length?Math.max(...data2.map(r=>Number(r.id_despesa||r.id_viagens))):0;channel=max1===max2?channels.true:channels.false;}else{channel=evaluate(script,state)?channels.true:channels.false;}}
  else if(n.title==='Confirm'){channel=(options.confirms?.[confirmIndex++]??true)?channels.yes:channels.no;}
  else if(n.title==='HTTP request'){results[current.id]={resBodyParsed:options.updateResponse===undefined?{updatedRange:'Despesas!A2:W2'}:options.updateResponse};requests.push({node:current.id,method:n.inputs.method.key,url:n.inputs.url.key,body:evaluate(n.inputs.body.key.script,state)});channel=options.failAt===current.id?channels[options.failure||'bad']:channels.ok;}
  else if(n.title==='Alert'){alerts.push(n.inputs.message.key);channel=channels.alert;}
  else if(n.title==='Navigate back'){navigated=true;current=null;break;}
  else throw Error('Unsupported '+n.title);
  current=n.connections[channel]?.[0];
 }
 assert(current?.type!=='node','Unbounded graph');return {pageVars,trace,requests,alerts,navigated};
}
const expenseVars={valordespesa:'12,50',datadespesa:'2026-10-09',descricaodespesa:'Teste',categoriadespesa:'Transferência',entradasaida:'Saída',vivuspessoal:'Pessoal',conta:'Ana',contadestino:'Vivus'};
const flows=['f990588c.3257d8','6ef17c69.47f764','2474c70.1b28e','62fd473.d2d768','80c0e322.fee95','f325090b.4931b8'];
test('All original screens plus Atalhos page, resources and navigation preserved',()=>{
 if(!originalRoot)return;const before=read(originalRoot).config;
 for(const k of Object.keys(before.screens))assert(k in app.screens,k);
 assert('page.Page12' in app.screens);
 assert.equal(Object.keys(app.screens).length,Object.keys(before.screens).length+1);
 const {tabs:bt,...bmobile}=before.navigation.mobile;const {tabs:at,...amobile}=app.navigation.mobile;
 assert.deepEqual(amobile,bmobile);assert.deepEqual(app.navigation.custom,before.navigation.custom);
 assert.deepEqual(app.navigation.legacyLayouts,before.navigation.legacyLayouts);
 for(const s of before.navigation.screens)assert(s in app.screens,s);
 assert.deepEqual(app.navigation.screens.slice(0,before.navigation.screens.length),before.navigation.screens);
 assert.equal(app.navigation.screens.length,before.navigation.screens.length+1);
 assert.equal(app.navigation.screens.at(-1),'page.Page12');
 assert.deepEqual(at.slice(0,bt.length),bt);assert.equal(at.length,bt.length+1);
 assert.equal(at[bt.length].pageId,'page.Page12');
 for(const name of Object.keys(before.dataResources))assert.deepEqual(app.dataResources[name],before.dataResources[name]);
});
test('Every graph connection and expression binding resolves',()=>{
 for(const f of Object.values(app.logic.flows)){assert(f.nodes[f.startConnection.id]);for(const n of Object.values(f.nodes))for(const ts of Object.values(n.connections||{}))if(Array.isArray(ts))for(const t of ts)if(t?.type==='node')assert(f.nodes[t.id],t.id);}
 for(const c of Object.values(app.components))for(const b of [...(c.props?.bindings||[]),...(c.props?.stylesBindings||[])])if(b.type==='expression')assert(app.expressions[b.sourceId],b.sourceId);
});
test('Every original HTML script, stylesheet and image asset exists',()=>{
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html')))for(const m of fs.readFileSync(path.join(root,file),'utf8').matchAll(/(?:src|href)="([^"?#]+)"/g))if(!m[1].startsWith('/')&&!m[1].includes(':'))assert(fs.existsSync(path.join(root,decodeURIComponent(m[1]))),file+': '+m[1]);
});
test('All expression scripts have valid JS syntax',()=>{for(const e of Object.values(app.expressions))new vm.Script('('+e.script+')');});
test('Loading totals never contain undefined and real zero is preserved',()=>{
 for(const id of ['88e4ce3c-331f-51e1-a0e9-b5edc0843ec1','ae3e8815-2d1f-5483-bea9-121d7fd0b5ab']){const s=app.expressions[id].script;assert(!evaluate(s,{pageVars:{},data:{entradasstein1:[]}}).includes('undefined'));assert(evaluate(s,{pageVars:{},data:{entradasstein1:[{resultado:0,valorareceber:0}]}}).includes('0'));}
});
for(const [id,field] of [['8c7fd425-c37c-581f-af0b-b4d1b6ecbb1d','data'],['77aca373-b0e8-5b8d-8824-425c24be40e9','Data']])test('All 12 Portuguese months: '+field,()=>{const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];months.forEach((month,i)=>assert.equal(evaluate(app.expressions[id].script,{repeated:{current:{[field]:`2026-${String(i+1).padStart(2,'0')}-15`}}}),`15 ${month} 2026`));});
test('Expense validation rejects null, nonnumeric and missing/same transfer destination',()=>{
 const s=app.expressions['18aeedaf-7e22-542a-b566-ffa341149a8b'].script;
 for(const v of [null,'','abc'])assert.equal(evaluate(s,{pageVars:{...expenseVars,botaosubmeterdespesa:'',valordespesa:v}}),false);
 for(const dest of ['','Ana'])assert.equal(evaluate(s,{pageVars:{...expenseVars,botaosubmeterdespesa:'',contadestino:dest}}),false);
 for(const val of ['12,50','12.50',0])assert.equal(evaluate(s,{pageVars:{...expenseVars,botaosubmeterdespesa:'',valordespesa:val}}),true);
});
test('Transfer uses one POST with equal decimal values and distinct IDs',()=>{
 const r=run(flows[0],{pageVars:expenseVars});assert.equal(r.requests.length,1);const [a,b]=r.requests[0].body;assert.equal(a.valor,12.5);assert.equal(b.valor,12.5);assert.equal(a.id_despesa,21);assert.equal(b.id_despesa,22);assert.equal(a.data_contabilidade_stein,'');assert.equal(b.data_contabilidade_stein,'');assert(r.navigated);
});
test('Cancelling transfer preserves fields, resets busy and writes nothing',()=>{const r=run(flows[0],{pageVars:expenseVars,confirms:[false]});assert.equal(r.requests.length,0);assert.equal(r.pageVars.botaosubmeterdespesa,'');assert.equal(r.pageVars.valordespesa,'12,50');});
test('Ordinary expense still creates a single row',()=>{const r=run(flows[0],{pageVars:{...expenseVars,categoriadespesa:'Compras'}});assert.equal(r.requests.length,1);assert.equal(r.requests[0].body.length,1);assert.equal(r.requests[0].body[0].valor,12.5);});
test('First row on an empty sheet succeeds without infinite retry',()=>{const r=run(flows[0],{pageVars:{...expenseVars,categoriadespesa:'Compras'},records:[]});assert.equal(r.requests[0].body[0].id_despesa,1);});
for(const fid of [flows[4],flows[5]]){
 test('Both confirmations precede paired write '+fid,()=>{const r=run(fid);const i=r.trace.indexOf('HTTP request');assert.equal(r.trace.slice(0,i).filter(t=>t==='Confirm').length,2);assert.equal(r.requests[0].body.length,2);assert.equal(r.requests[0].body[0].valor,r.requests[0].body[1].valor);assert.notEqual(r.requests[0].body[0].id_despesa,r.requests[0].body[1].id_despesa);});
 for(const confirms of [[false],[true,false]])test('Cancel never writes half of a pair '+fid+' '+confirms,()=>{assert.equal(run(fid,{confirms}).requests.length,0);});
}
for(const fid of flows){
 const f=app.logic.flows[fid];
 for(const [nid,n] of Object.entries(f.nodes)){
  if(n.title!=='HTTP request')continue;
  for(const failure of ['bad','err'])test('HTTP '+failure+' produces visible error and no false navigation '+fid+'/'+nid,()=>{
   const r=run(fid,{pageVars:fid===flows[0]?{...expenseVars,...(nid==='b609658e.c8c1b8'?{categoriadespesa:'Compras'}:{})}:{valor:'12,50',data:'2026-10-09',kmSaida:'100',kmChegada:'120'},failAt:nid,failure});assert(r.alerts.length);assert(!r.navigated);
   if(nid!=='97f2a87c.ceec78'){const busy={ 'page.Page2':'botaosubmeterdespesa','page.Page4':'botaovisivel','page.Page7':'submeterviagem','page.Page8':'botaovisivel','page.Page10':'botaovisivel','page.Page11':'aGravar'}[f.pageId];assert.equal(r.pageVars[busy],app.screens[f.pageId].pageVariables[busy]);}
  });
 }
 if(f.nodes['audit.readIDs'])test('Failed ID read stops before any write '+fid,()=>{const r=run(fid,{pageVars:fid===flows[0]?expenseVars:{data:'2026-10-09'},readFailure:true});assert.equal(r.requests.length,0);assert.equal(r.alerts.length,1);});
}
test('Direct links without record IDs cannot update expenses, trips or reimbursements',()=>{
 for(const [id,vars] of [['audit.expenseEditInvalid',{valor:'12,50'}],['audit.tripEditInvalid',{kmSaida:'100'}],['audit.reimbursementInvalid',{}]])assert.equal(evaluate(app.expressions[id].script,{pageVars:vars,params:{}}),true);
 assert.equal(evaluate(app.expressions['audit.expenseEditInvalid'].script,{pageVars:{valor:'12,50'},params:{iddespesa:'5'}}),false);
 assert.equal(evaluate(app.expressions['audit.tripEditInvalid'].script,{pageVars:{kmSaida:'100',kmChegada:''},params:{id:'5'}}),false);
});
test('Only audited writes and main data loader changed; other original flows identical',()=>{
 if(!originalRoot)return;const before=read(originalRoot).config;
 for(const [id,f] of Object.entries(before.logic.flows))if(!flows.includes(id)&&!["48b0666.cf70ca2","2f0f0c6b.66e364","4263321b.59d78c","7373435c.faeaec"].includes(id))assert.deepEqual(app.logic.flows[id],f,id);
 for(const [id,event] of Object.entries(before.logic.events))if(!['fd2f8be.9582c15','f573873.113c982','0b140ab.33b6f91'].includes(id))assert.deepEqual(app.logic.events[id],event,id);
});

test('Unused history requests are absent from form mounting and focus',()=>{
 const removed=[["page.Page1","listasStein"],["page.Page2","despesasstein"],["page.Page7","viagensstein"],["page.Page10","despesasstein"],["page.Page11","despesasstein"]];
 for(const [p,res] of removed){const s=app.screens[p];assert(!s.dataResources.some(x=>x.resource_name===res));if(originalRoot){const old=read(originalRoot).config.screens[p].dataResources.find(x=>x.resource_name===res);for(const es of Object.values(s.events))for(const e of es)assert.notEqual(app.logic.events[e.id]?.contextId,old.data_canvas_flow_id);}}
});
test('All four creation flows still fetch current identifiers before writing',()=>{for(const fid of [flows[0],flows[2],flows[4],flows[5]]){const r=run(fid,{pageVars:fid===flows[0]?expenseVars:{data:'2026-10-09'}});assert(r.trace.indexOf('Get record collection')>=0);assert(r.trace.indexOf('Get record collection')<r.trace.indexOf('HTTP request'));}});

test('Direct CSV preserves commas, quotes, newlines, zero and active flags',()=>{const script=app.dataResources.despesasdiretas.driverConfiguration.operations.list.responseMapper.key.script;const records=evaluate(script,{response:{status:200,data:'id_despesa,ativa,descricao,valor\r\n1,TRUE,"Teste, com ""aspas""\nsegunda linha",0\r\n2,FALSE,Outra,10\r\n'}}).records;assert.equal(records.length,1);assert.equal(records[0].descricao,'Teste, com "aspas"\nsegunda linha');assert.equal(records[0].valor,'0');assert.throws(()=>evaluate(script,{response:{status:200,data:'<html>Login</html>'}}));});
test('Aggregate identifier parser validates Google errors and empty sheet',()=>{const script=app.dataResources.despesasidsdiretos.driverConfiguration.operations.list.responseMapper.key.script;const parse=v=>evaluate(script,{DECODE_JSON:JSON.parse,response:{status:200,data:'/*O_o*/\ngoogle.visualization.Query.setResponse('+JSON.stringify(v)+');'}});assert.equal(parse({status:'ok',table:{cols:[{type:'number'}],rows:[{c:[{v:50}]}]}}).records[0].id_despesa,50);assert.equal(parse({status:'ok',table:{cols:[{type:'number'}],rows:[{c:[{v:null}]}]}}).records.length,0);assert.throws(()=>parse({status:'error'}));});
for(const fid of [flows[0],flows[4],flows[5]])test('Direct identifier failure uses Stein and preserves write '+fid,()=>{const r=run(fid,{pageVars:fid===flows[0]?expenseVars:{data:'2026-10-09'},directReadFailure:true});assert.equal(r.trace.filter(x=>x==='Get record collection').length,3);assert(r.requests.length>0);const ordinary=run(fid,{pageVars:fid===flows[0]?expenseVars:{data:'2026-10-09'}});assert.equal(JSON.stringify(r.requests),JSON.stringify(ordinary.requests));assert.equal(r.navigated,ordinary.navigated);});

for(const fid of [flows[0],flows[2],flows[4],flows[5]])test('Recheck reads the current sheet before writing '+fid,()=>{const r=run(fid,{pageVars:fid===flows[0]?expenseVars:{data:'2026-10-09'}});const i=r.trace.indexOf('Get record collection');assert(i>=0);assert.equal(r.trace.filter(x=>x==='Get record collection').length,2);assert(r.trace.indexOf('If condition')>=i);assert(r.requests.length>0);});
for(const fid of [flows[0],flows[2],flows[4],flows[5]])test('Concurrent write detected on recheck cancels the save '+fid,()=>{const r=run(fid,{pageVars:fid===flows[0]?expenseVars:{data:'2026-10-09'},recheckRecords:[{id_despesa:'25',id_viagens:'25'}]});assert.equal(r.requests.length,0);assert.equal(r.alerts.length,1);assert(r.alerts[0].includes('Outra sessão'));assert(!r.navigated);});
test('Matching recheck MAX allows the write to proceed',()=>{const r=run(flows[0],{pageVars:expenseVars,recheckRecords:[{id_despesa:'20',id_viagens:'10'}]});assert.equal(r.requests.length,1);assert(r.navigated);});

test('Reimbursement checkbox remains visible for all stored boolean forms',()=>{for(const v of ['',null,false,'FALSE','false']){assert.equal(evaluate(app.expressions['21f02fe2-ff47-5f2a-a6bb-a3c660f4f3c9'].script,{pageVars:{reposicaovalor:v}}),true);assert.equal(evaluate(app.expressions['09ba065e-eab5-5e74-b6e8-9cc9b546bf1d'].script,{pageVars:{reposicaovalor:v}}),false);}for(const v of [true,'true','TRUE'])assert.equal(evaluate(app.expressions['09ba065e-eab5-5e74-b6e8-9cc9b546bf1d'].script,{pageVars:{reposicaovalor:v}}),true);});
test('Editing a trip preserves optional blank arrival km',()=>{const r=run(flows[3],{pageVars:{kmSaida:'100',kmChegada:'',data:'2026-10-10'}});assert.equal(r.requests[0].body.set.km_chegada,'');});
for(const [fid,key]of [['2f0f0c6b.66e364','iddespesa'],['4263321b.59d78c','id']])test('Focus cannot overwrite unsaved edits for the same record '+fid,()=>{const script=app.logic.flows[fid].nodes['editing.initializeGuard'].inputs.condition.key.script;assert.equal(evaluate(script,{pageVars:{editingRecord:'5'},params:{[key]:'5'}}),false);assert.equal(evaluate(script,{pageVars:{editingRecord:'5'},params:{[key]:'6'}}),true);assert.equal(evaluate(script,{pageVars:{editingRecord:null},params:{[key]:'5'}}),true);});

for(const fid of [flows[1],flows[3]])test('HTTP 200 without updatedRange does not report a successful edit '+fid,()=>{for(const response of [{},{updatedRange:''},null]){const r=run(fid,{pageVars:{valor:'12,50',data:'2026-10-10',kmSaida:'100',kmChegada:''},updateResponse:response});assert(!r.navigated);assert(r.alerts.length===1);assert.equal(r.pageVars.valor,'12,50');assert.equal(String(r.pageVars.botaovisivel),'0');}});
test('Returning to expenses, balances and trips refreshes the matching lists',()=>{for(const [focus,mount]of [['fd2f8be.9582c15','6c0dc38.f78bd05'],['f573873.113c982','bcc3597.d671050'],['0b140ab.33b6f91','7a8420c.28fafd3']])assert.deepEqual(app.logic.events[focus].triggeredFlows,app.logic.events[mount].triggeredFlows);assert.equal(app.dataResources.despesasdiretas.driverConfiguration.base.baseURL.source,'expression');});
test('All edited write formulas declare the functions needed by the runtime',()=>{for(const fid of flows)for(const n of Object.values(app.logic.flows[fid].nodes))if(n.title==='HTTP request')for(const fn of n.inputs.body.key.script.match(/\b[A-Z][A-Z_]+(?=\()/g)||[])assert(n.inputs.body.key.functions.includes(fn),fid+': '+fn);});
test('Hibernate navConfig in every HTML mirrors the navigation',()=>{
 const nav=app.navigation,tabs=nav.mobile.tabs;
 for(const name of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
  const m=fs.readFileSync(path.join(root,name),'utf8').match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if(!m)continue;const nd=JSON.parse(m[1]);
  const raw=nd&&nd.props&&nd.props.pageProps&&nd.props.pageProps.initialState;if(!raw)continue;
  const st=JSON.parse(raw);
  assert.equal(st.navConfig.tabs.length,tabs.length,name);
  assert.deepEqual(st.navConfig.tabs.map(t=>t.title),tabs.map(t=>t.title),name);
  assert.deepEqual(st.navConfig.screens,Object.keys(app.screens),name);
  for(const [i,t] of tabs.entries())assert.equal(st.navConfig.routeConfigs['t'+i].initialRouteName,t.pageId,name+' t'+i);
 }
});
test('Every navigation tab has desktop and mobile route files',()=>{
 for(const t of app.navigation.mobile.tabs){
  assert(fs.existsSync(path.join(root,t.pageId+'.html')),t.pageId+'.html');
  assert(fs.existsSync(path.join(root,'m-'+t.pageId+'.html')),'m-'+t.pageId+'.html');
 }
});
test('Atalho preenche os campos da nova despesa quando o sinalizador está ativo',()=>{
 const r=run('atalho.apply',{params:{usaratalho:'1',valordespesa:'12,50',categoriadespesa:'Compras',conta:'Ana',entradasaida:'Saída',cu:'C1'}});
 assert.equal(r.pageVars.valordespesa,'12,50');
 assert.equal(r.pageVars.categoriadespesa,'Compras');
 assert.equal(r.pageVars.conta,'Ana');
 assert.equal(r.pageVars.entradasaida,'Saída');
 assert.equal(r.pageVars.cu,'C1');
});
test('Sem o sinalizador do atalho nada é sobrescrito na nova despesa',()=>{
 const r=run('atalho.apply',{params:{}});
 for(const f of ['valordespesa','categoriadespesa','conta','cu'])
  assert.equal(r.pageVars[f],app.screens['page.Page2'].pageVariables[f],f);
});
test('O atalho abre a nova despesa com todos os campos do atalho',()=>{
 const open=app.logic.flows['atalhos.use'];
 const n=open.nodes[open.startConnection.id];
 const p=n.inputs.params.key;
 assert.equal(p.usaratalho.key,'1');
 for(const f of ['valordespesa','entradasaida','vivuspessoal','categoriadespesa','despesafixa','descricaodespesa','conta','contacontabilidade','percentagemarepor','valorarepor','cu'])
  assert(p[f],'param '+f);
 const ev=app.logic.events['atalhos.tap'];
 assert.deepEqual(ev.triggeredFlows,['atalhos.use']);
});
test('O atalho só se aplica na montagem, não ao refocar a página',()=>{
 const mount=app.logic.events['atalho.mount'];
 assert.deepEqual(mount.triggeredFlows,['atalho.apply']);
 assert.equal(mount.eventSource,'page:2:onPageDidMount');
 assert(app.screens['page.Page2'].events.onPageDidMount.some(e=>e.id==='atalho.mount'));
 assert(!app.screens['page.Page2'].events.onPageDidFocus.some(e=>e.id==='atalho.mount'));
});
test('A estrela ★ no cabeçalho guarda o atalho com os campos do formulário',()=>{
 const star=Object.values(app.components).find(c=>c.pageId==='page.Page2'&&c.props.content==='★');
 assert(star,'estrela ★ ausente');
 assert.equal(star.props.events.tap[0].id,'atalho.saveTap');
 assert(star.props.bindings.some(b=>b.targetProp==='visible'),'visibilidade da estrela em falta');
 assert.equal(app.logic.events['atalho.saveTap'].eventSource,'page:2:component:'+star.id+':tap');
 assert(!Object.values(app.components).some(c=>c.props.label==='★ Guardar como atalho'),'botão grande ainda presente');
 const r=run('atalho.save',{pageVars:{...expenseVars,atalhomodo:'1'}});
 assert.equal(r.requests.length,1);
 assert.equal(r.requests[0].url,'https://api.steinhq.com/v1/storages/66fe6b324d11fd04f0335b3a/atalhos');
 assert.equal(app.logic.flows['atalho.save'].nodes['atalho.post'].inputs.body.source,'expression');
 const b=r.requests[0].body[0];
 assert.equal(b.nome,'Teste');
 assert.equal(b.valor,12.5);
 assert.equal(b.movimento,'Saída');
 assert.equal(b.categoria,'Transferência');
 assert.equal(b.conta,'Ana');
 assert(r.alerts.some(a=>/guardado/i.test(a)),'alerta de sucesso em falta');
});
test('Sem descrição o atalho não é gravado; valor vazio é permitido',()=>{
 const r=run('atalho.save',{pageVars:{...expenseVars,atalhomodo:'1',descricaodespesa:''}});
 assert.equal(r.requests.length,0);
 assert(r.alerts.some(a=>/descrição/i.test(a)));
 const r2=run('atalho.save',{pageVars:{...expenseVars,atalhomodo:'1',valordespesa:''}});
 assert.equal(r2.requests.length,1);
 assert.equal(r2.requests[0].body[0].valor,'');
 assert(r2.alerts.some(a=>/guardado/i.test(a)));
});
test('Falha gravação de atalho mostra alerta e não navega',()=>{
 const r=run('atalho.save',{pageVars:{...expenseVars,atalhomodo:'1'},failAt:'atalho.post',failure:'bad'});
 assert.equal(r.requests.length,1);
 assert(r.alerts.some(a=>/Verifica a ligação/i.test(a)));
 assert.equal(r.navigated,false);
});
test('Célula vazia de atalho mantém o valor por omissão do formulário',()=>{
 const r=run('atalho.apply',{params:{usaratalho:'1'}});
 assert.equal(r.pageVars.cu,0);
 assert.equal(r.pageVars.valordespesa,null);
});
test('★ abre o campo de nome antes de gravar e sugere a descrição',()=>{
 const r=run('atalho.save',{pageVars:{...expenseVars,atalhomodo:''}});
 assert.equal(r.requests.length,0);
 assert.equal(r.pageVars.atalhomodo,'1');
 assert.equal(r.pageVars.atalhonome,'Teste');
});
test('O nome escrito no campo de nome é o nome do atalho guardado',()=>{
 const r=run('atalho.save',{pageVars:{...expenseVars,atalhomodo:'1',atalhonome:'Gasolina trabalho'}});
 assert.equal(r.requests.length,1);
 assert.equal(r.requests[0].body[0].nome,'Gasolina trabalho');
 assert(r.alerts.some(a=>/guardado/i.test(a)));
});
test('Cancelar (✕) limpa o modo de nome e o nome sem gravar nada',()=>{
 const r=run('atalho.cancel',{pageVars:{...expenseVars,atalhomodo:'1',atalhonome:'X'}});
 assert.equal(r.requests.length,0);
 assert.equal(r.pageVars.atalhomodo,'');
 assert.equal(r.pageVars.atalhonome,'');
});
test('O painel do nome existe no Page2, liga a pageVariable e cancela com ✕',()=>{
 const vis=Object.values(app.expressions).find(e=>e.script.includes('atalhomodo'));
 assert(vis,'expressão de visibilidade do painel em falta');
 const panel=Object.values(app.components).find(c=>(c.props.bindings||[]).some(b=>b.type==='expression'&&b.sourceId===vis.id&&b.targetProp==='visible'));
 assert(panel,'painel do nome em falta');
 const root=app.screens['page.Page2'].components[0];
 assert(root.ch.some(n=>n.id===panel.id),'painel fora da árvore');
 const nameLabel=Object.values(app.components).find(c=>c.props.label==='Nome do atalho');
 assert(nameLabel,'campo de nome em falta');
 assert(nameLabel.props.bindings.some(b=>b.type==='page-variable'&&b.sourceId==='atalhonome'),'campo de nome sem ligação a atalhonome');
 const cancel=Object.values(app.components).find(c=>c.props.content==='✕');
 assert(cancel,'✕ em falta');
 assert.equal(cancel.props.events.tap[0].id,'atalho.cancelTap');
 assert.deepEqual(app.logic.events['atalho.cancelTap'].triggeredFlows,['atalho.cancel']);
});
test('Abrir um atalho assume a data de hoje e mantém o nome original',()=>{
 const r=run('atalho.apply',{params:{usaratalho:'1',atalhonome:'Gasolina',datadespesa:'2020-01-01'}});
 assert.notEqual(r.pageVars.datadespesa,'2020-01-01');
 assert.equal(app.logic.flows['atalho.apply'].nodes['atalho.today'].inputs.variable.key.value.key.script,'NOW("YYYY-MM-DD")');
 assert.equal(r.pageVars.atalhonome,'Gasolina');
});
test('A montagem/foco limpa o botão Submeter e o modo de nome',()=>{
 const r=run('7373435c.faeaec',{pageVars:{botaosubmeterdespesa:'1',atalhomodo:'1'}});
 assert.equal(r.pageVars.botaosubmeterdespesa,'');
 assert.equal(r.pageVars.atalhomodo,'');
});
test('Leitura de ids usa export CSV da coluna T com cache-buster',()=>{
 const csv=app.dataResources.despesasidscsv;
 assert(csv,'recurso despesasidscsv em falta');
 assert.equal(csv.driverConfiguration.base.baseURL.source,'expression');
 assert(csv.driverConfiguration.base.baseURL.key.script.includes('range=T:T'));
 assert(csv.driverConfiguration.base.baseURL.key.script.includes('_fresh'));
 const url=evaluate(csv.driverConfiguration.base.baseURL.key.script,{NOW:()=> '2026-10-09T00:00:00Z'});
 assert(url.startsWith('https://docs.google.com/spreadsheets/'),'URL de ids inválida: '+url);
 assert(url.includes('range=T:T&_fresh='),'cache-buster do CSV de ids em falta: '+url);
 let uses=0;
 for(const f of Object.values(app.logic.flows))for(const n of Object.values(f.nodes||{}))if(n.title==='Get record collection'&&n.inputs.request.key.resourceName.key==='despesasidscsv')uses++;
 assert.equal(uses,6);
 for(const fid of ['f990588c.3257d8','80c0e322.fee95','f325090b.4931b8']){
  const f=app.logic.flows[fid];
  assert.equal(f.nodes['audit.readIDs'].inputs.request.key.resourceName.key,'despesasidscsv');
  assert.equal(f.nodes['audit.recheck.'+fid].inputs.request.key.resourceName.key,'despesasidscsv');
  assert.equal(f.nodes['performance.fallback'].inputs.request.key.resourceName.key,'despesasids');
 }
});
test('O mapper do CSV de ids valida o cabeçalho e devolve os identificadores',()=>{
 const script=app.dataResources.despesasidscsv.driverConfiguration.operations.list.responseMapper.key.script;
 const recs=evaluate(script,{response:{data:'id_despesa\r\n1\r\n8251\r\n',status:200}});
 assert.equal(recs.records.length,2);
 assert.equal(recs.records[0].id_despesa,'1');
 assert.equal(recs.records[1].id_despesa,'8251');
 assert.equal(recs.driverCode,200);
 assert.throws(()=>evaluate(script,{response:{data:'outra_coluna\r\n1\r\n',status:200}}));
});
test('Versão publicada 3.0.11 para cache-bust dos bundles',()=>{
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,'3.0.11');
});
test('Nenhum nó de fluxo usa ref forjada (o runtime ignora-as em silêncio)',()=>{
 const canon={};
 const src=originalRoot?read(originalRoot).config:app;
 for(const f of Object.values(src.logic.flows))
  for(const n of Object.values(f.nodes||{}))
   if(n.ref)(canon[n.title]=canon[n.title]||new Set()).add(n.ref.id);
 let total=0;
 for(const [fid,f] of Object.entries(app.logic.flows))
  for(const [nid,n] of Object.entries(f.nodes||{})){
   if(!n.ref)continue;
   total++;
   const c=canon[n.title];
   if(c)assert(c.has(n.ref.id),fid+'/'+nid+' ('+n.title+') tem ref forjada '+n.ref.id);
  }
 assert(total>100,'varredura de refs incompleta');
});
console.log(`\n${checks} checks passed. No live writes were made.`);
