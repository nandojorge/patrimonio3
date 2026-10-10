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
 const trace=[],requests=[],alerts=[],results={};let current=f.startConnection,confirmIndex=0,navigated=false;
 for(let step=0;step<60&&current?.type==='node';step++){
  const n=f.nodes[current.id];assert(n,'Dangling node '+current.id);trace.push(n.title);let channel;
  if(n.title==='Set page variable'){const a=n.inputs.variable.key;pageVars[a.reference.key]=a.value.source==='expression'?evaluate(a.value.key.script,state):a.value.key;channel=channels.set;}
  else if(n.title==='Get record collection'){results[current.id]={records:options.records||[{id_despesa:'20',id_viagens:'10'}]};channel=(options.readFailure||(options.directReadFailure&&current.id==='audit.readIDs'))?channels.getError:channels.get;}
  else if(n.title==='Set data variable'){const a=n.inputs.assignment.key;const [field,node]=a.data.key.split('@@@');state.data[a.reference.key]=results[node][field];channel=channels.data;}
  else if(n.title==='If condition'){channel=evaluate(n.inputs.condition.key.script,state)?channels.true:channels.false;}
  else if(n.title==='Confirm'){channel=(options.confirms?.[confirmIndex++]??true)?channels.yes:channels.no;}
  else if(n.title==='HTTP request'){requests.push({node:current.id,method:n.inputs.method.key,url:n.inputs.url.key,body:evaluate(n.inputs.body.key.script,state)});channel=options.failAt===current.id?channels[options.failure||'bad']:channels.ok;}
  else if(n.title==='Alert'){alerts.push(n.inputs.message.key);channel=channels.alert;}
  else if(n.title==='Navigate back'){navigated=true;current=null;break;}
  else throw Error('Unsupported '+n.title);
  current=n.connections[channel]?.[0];
 }
 assert(current?.type!=='node','Unbounded graph');return {pageVars,trace,requests,alerts,navigated};
}
const expenseVars={valordespesa:'12,50',datadespesa:'2026-10-09',descricaodespesa:'Teste',categoriadespesa:'Transferência',entradasaida:'Saída',vivuspessoal:'Pessoal',conta:'Ana',contadestino:'Vivus'};
const flows=['f990588c.3257d8','6ef17c69.47f764','2474c70.1b28e','62fd473.d2d768','80c0e322.fee95','f325090b.4931b8'];
test('All 10 screens, six original resources, navigation preserved',()=>{
 if(!originalRoot)return;const before=read(originalRoot).config;
 assert.deepEqual(Object.keys(app.screens),Object.keys(before.screens));assert.deepEqual(app.navigation,before.navigation);
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
 for(const [id,f] of Object.entries(before.logic.flows))if(!flows.includes(id)&&!["48b0666.cf70ca2","2f0f0c6b.66e364","4263321b.59d78c"].includes(id))assert.deepEqual(app.logic.flows[id],f,id);
 assert.deepEqual(app.logic.events,before.logic.events);
});

test('Unused history requests are absent from form mounting and focus',()=>{
 const removed=[["page.Page1","listasStein"],["page.Page2","despesasstein"],["page.Page7","viagensstein"],["page.Page10","despesasstein"],["page.Page11","despesasstein"]];
 for(const [p,res] of removed){const s=app.screens[p];assert(!s.dataResources.some(x=>x.resource_name===res));if(originalRoot){const old=read(originalRoot).config.screens[p].dataResources.find(x=>x.resource_name===res);for(const es of Object.values(s.events))for(const e of es)assert.notEqual(app.logic.events[e.id]?.contextId,old.data_canvas_flow_id);}}
});
test('All four creation flows still fetch current identifiers before writing',()=>{for(const fid of [flows[0],flows[2],flows[4],flows[5]]){const r=run(fid,{pageVars:fid===flows[0]?expenseVars:{data:'2026-10-09'}});assert(r.trace.indexOf('Get record collection')>=0);assert(r.trace.indexOf('Get record collection')<r.trace.indexOf('HTTP request'));}});

test('Direct CSV preserves commas, quotes, newlines, zero and active flags',()=>{const script=app.dataResources.despesasdiretas.driverConfiguration.operations.list.responseMapper.key.script;const records=evaluate(script,{response:{status:200,data:'id_despesa,ativa,descricao,valor\r\n1,TRUE,"Teste, com ""aspas""\nsegunda linha",0\r\n2,FALSE,Outra,10\r\n'}}).records;assert.equal(records.length,1);assert.equal(records[0].descricao,'Teste, com "aspas"\nsegunda linha');assert.equal(records[0].valor,'0');assert.throws(()=>evaluate(script,{response:{status:200,data:'<html>Login</html>'}}));});
test('Aggregate identifier parser validates Google errors and empty sheet',()=>{const script=app.dataResources.despesasidsdiretos.driverConfiguration.operations.list.responseMapper.key.script;const parse=v=>evaluate(script,{DECODE_JSON:JSON.parse,response:{status:200,data:'/*O_o*/\ngoogle.visualization.Query.setResponse('+JSON.stringify(v)+');'}});assert.equal(parse({status:'ok',table:{cols:[{type:'number'}],rows:[{c:[{v:50}]}]}}).records[0].id_despesa,50);assert.equal(parse({status:'ok',table:{cols:[{type:'number'}],rows:[{c:[{v:null}]}]}}).records.length,0);assert.throws(()=>parse({status:'error'}));});
for(const fid of [flows[0],flows[4],flows[5]])test('Direct identifier failure uses Stein and preserves write '+fid,()=>{const r=run(fid,{pageVars:fid===flows[0]?expenseVars:{data:'2026-10-09'},directReadFailure:true});assert.equal(r.trace.filter(x=>x==='Get record collection').length,2);assert(r.requests.length>0);const ordinary=run(fid,{pageVars:fid===flows[0]?expenseVars:{data:'2026-10-09'}});assert.equal(JSON.stringify(r.requests),JSON.stringify(ordinary.requests));assert.equal(r.navigated,ordinary.navigated);});

test('Reimbursement checkbox remains visible for all stored boolean forms',()=>{for(const v of ['',null,false,'FALSE','false']){assert.equal(evaluate(app.expressions['21f02fe2-ff47-5f2a-a6bb-a3c660f4f3c9'].script,{pageVars:{reposicaovalor:v}}),true);assert.equal(evaluate(app.expressions['09ba065e-eab5-5e74-b6e8-9cc9b546bf1d'].script,{pageVars:{reposicaovalor:v}}),false);}for(const v of [true,'true','TRUE'])assert.equal(evaluate(app.expressions['09ba065e-eab5-5e74-b6e8-9cc9b546bf1d'].script,{pageVars:{reposicaovalor:v}}),true);});
test('Editing a trip preserves optional blank arrival km',()=>{const r=run(flows[3],{pageVars:{kmSaida:'100',kmChegada:'',data:'2026-10-10'}});assert.equal(r.requests[0].body.set.km_chegada,'');});
for(const [fid,key]of [['2f0f0c6b.66e364','iddespesa'],['4263321b.59d78c','id']])test('Focus cannot overwrite unsaved edits for the same record '+fid,()=>{const script=app.logic.flows[fid].nodes['editing.initializeGuard'].inputs.condition.key.script;assert.equal(evaluate(script,{pageVars:{editingRecord:'5'},params:{[key]:'5'}}),false);assert.equal(evaluate(script,{pageVars:{editingRecord:'5'},params:{[key]:'6'}}),true);assert.equal(evaluate(script,{pageVars:{editingRecord:null},params:{[key]:'5'}}),true);});
console.log(`\n${checks} checks passed. No live writes were made.`);
