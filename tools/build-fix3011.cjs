/**
 * 3.0.11 — correções dos dois erros reportados + nome do atalho + pedidos do utilizador:
 *  1. ★ falhava sempre ("Não foi possível guardar"): atalho.post.inputs.body não tinha
 *     source:'expression' → o runtime enviava body:null e o Stein devolvia 500. Corrigido.
 *  2. "Não consigo adicionar despesas": a leitura de ids via gviz (despesasidsdiretos)
 *     pendurava-se no browser (content-type application/javascript) e o botão Submeter
 *     nunca reaparecia. Substituída por export CSV da coluna T (despesasidscsv):
 *     CORS aberto, 48KB, ~0,8s, cache-buster _fresh como o das despesas diretas.
 *  3. Valor opcional ao guardar atalho; data assume sempre hoje ao abrir atalho;
 *     dá-se nome ao atalho num campo que abre ao tocar na ★ (o Prompt nativo não
 *     suporta web) — campo com ✕ para cancelar.
 *  4. Montagem/foco limpam o botão Submeter (botaosubmeterdespesa) para nunca ficar preso.
 * Uso: node tools/build-fix3011.cjs && npm run build:runtime && npm test
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const PATH = path.resolve(ROOT, 'tools', 'app-runtime.json');
const app = JSON.parse(fs.readFileSync(PATH, 'utf8'));

const newUuid = (old, salt) => {
  const h = crypto.createHash('sha256').update(salt + old).digest('hex');
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20,32)].join('-');
};
const P2 = 'page.Page2';
const SUBMIT = 'bca11f6d-2255-4d55-9eac-4da768e41314';
const STAR = '25c8f442-1a39-ef84-6a4f-3387f5af4916';
const STAR_EXPR = '9eab90ae-babd-528f-3210-8cb75162ca11';
const ROOT_NODE = '2-72df4097-eff7-4a1b-9c4f-61a93a54484e';
const HEADER = 'd8a2614e-3e8e-4d7f-8823-74585f28dae7';
const CONT = 'ca96d456-1629-4bb0-be8d-70173da00235';
const COMP = '38e24be0-5a9a-43cb-a20a-adccc97d3fad';
const LABEL = 'de788fe7-15ec-460f-b22e-0636f129a31b';
const INPUT = '9778c330-9b49-498d-bd64-aa02598f4266';
const TRUE = 'ceeba261-e546-4b5f-af45-47b75226fb2c', FALSE = '871f4881-b57c-41d5-9934-a69367733066';
const SET = 'aab5c5a6-049b-4e2b-8068-aac6d1c8cab3';
const OK = '180fc790-08a9-44c1-b7ab-265caf4f13e7', BAD = 'a4ec0b24-5bf1-40d3-97f0-91689c16c0be', ERR = 'd0ffa631-53c6-4352-8b33-0db7034ae11f';
const IF_REF = 'own_225eb957.12fbd', SET_REF = 'own_23268044.e1e2b';

const PANEL = newUuid(SUBMIT, 'at3:panel');
const PCOMP = newUuid(SUBMIT, 'at3:panelcomp');
const PLABEL = newUuid(SUBMIT, 'at3:panellabel');
const PIN = newUuid(SUBMIT, 'at3:panelin');
const PCANCEL = newUuid(SUBMIT, 'at3:cancel');
const PEXPR = newUuid(SUBMIT, 'at3:panelvis');

const expr = (script, functions, dependencies) =>
  ({ source: 'expression', key: { script, formula: script, functions, dependencies } });
const setExpr = (ref, script, functions, dependencies, next, outputId) => ({
  type: 'function', title: 'Set page variable', ref: { type: 'flow-function', id: SET_REF },
  inputs: { variable: { key: { value: expr(script, functions, dependencies), reference: { source: 'page-variable-ref', key: ref } }, source: 'object' } },
  connections: { [SET]: next ? [{ type: 'node', id: next }] : [{ type: 'output', id: outputId }] },
});
const ifNode = (script, functions, dependencies, yes, no) => ({
  type: 'function', title: 'If condition', ref: { type: 'flow-function', id: IF_REF },
  inputs: { condition: expr(script, functions, dependencies) },
  connections: { [TRUE]: [{ type: 'node', id: yes }], [FALSE]: [{ type: 'node', id: no }] },
});

// ---------- 1. versão ----------
const pkgPath = path.resolve(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '3.0.11';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// ---------- 2. estrela: visibilidade só com descrição (valor opcional) ----------
const vis = '!IS_EMPTY(LOOKUP(pageVars,"descricaodespesa"))';
Object.assign(app.expressions[STAR_EXPR], {
  formula: vis, script: vis,
  dependencies: [['pageVars', 'descricaodespesa']], functions: ['IS_EMPTY', 'LOOKUP'],
});

// ---------- 3. pageVariables do painel de nome ----------
app.screens[P2].pageVariables.atalhonome = '';
app.screens[P2].pageVariables.atalhomodo = '';

// ---------- 4. painel de nome (clones do campo Descrição) ----------
const drop = (arr, v) => (arr || []).filter(x => x !== v);
const panel = JSON.parse(JSON.stringify(app.components[CONT]));
panel.id = PANEL;
panel.props.flowGroupId = 'page:2:component:' + PANEL;
panel.props.bindings = [{ type: 'expression', sourceId: PEXPR, targetProp: 'visible' }];
panel.props.expressionProps = ['visible'];
app.components[PANEL] = panel;

const pcomp = JSON.parse(JSON.stringify(app.components[COMP]));
pcomp.id = PCOMP;
pcomp.props.flowGroupId = 'page:2:component:' + PCOMP;
pcomp.props.label = 'Nome do atalho';
pcomp.props.placeholder = 'Ex.: Gasolina';
pcomp.props.bindings = pcomp.props.bindings
  .filter(b => !(b.type === 'expression' && b.targetProp === 'placeholder'))
  .map(b => (b.type === 'page-variable' ? { ...b, sourceId: 'atalhonome' } : b));
pcomp.props.expressionProps = drop(pcomp.props.expressionProps, 'placeholder');
pcomp.props.dynamicProps = drop(pcomp.props.dynamicProps, 'placeholder');
app.components[PCOMP] = pcomp;

const plabel = JSON.parse(JSON.stringify(app.components[LABEL]));
plabel.id = PLABEL;
plabel.props.flowGroupId = 'page:2:component:' + PLABEL;
plabel.props.bindings = plabel.props.bindings.map(b =>
  b.type === 'internal-property' ? { ...b, sourceId: PCOMP + ':label' } : b);
app.components[PLABEL] = plabel;

const pin = JSON.parse(JSON.stringify(app.components[INPUT]));
pin.id = PIN;
pin.props.flowGroupId = 'page:2:component:' + PIN;
pin.props.placeholder = 'Ex.: Gasolina';
pin.props.bindings = pin.props.bindings
  .filter(b => !(b.type === 'expression' && b.targetProp === 'placeholder'))
  .map(b => b.type === 'page-variable' ? { ...b, sourceId: 'atalhonome' }
    : b.type === 'internal-property' ? { ...b, sourceId: b.sourceId.replace(COMP, PCOMP) } : b);
pin.props.expressionProps = drop(pin.props.expressionProps, 'placeholder');
pin.props.dynamicProps = drop(pin.props.dynamicProps, 'placeholder');
app.components[PIN] = pin;

const cancel = JSON.parse(JSON.stringify(app.components[STAR]));
cancel.id = PCANCEL;
cancel.props.flowGroupId = 'page:2:component:' + PCANCEL;
cancel.props.content = '✕';
cancel.props.events = { tap: [{ id: 'atalho.cancelTap' }], onPress: [{ id: 'atalho.cancelTap' }] };
cancel.props.bindings = [];
cancel.props.expressionProps = [];
cancel.props.styles.text.color = '#89919a';
cancel.props.styles.text.fontSize = 20;
cancel.props.styles.view.paddingLeft = 12;
cancel.props.styles.view.paddingRight = 12;
app.components[PCANCEL] = cancel;

app.screens[P2].initStateProps[PCOMP] =
  ['label', 'keyboardType', 'disabled', 'multlineInput', 'autoCapitalize', 'passwordInput'];

// ---------- 5. visibilidade do painel + árvore ----------
app.expressions[PEXPR] = {
  id: PEXPR, type: 'expression',
  formula: 'IS_EQUAL(LOOKUP(pageVars,"atalhomodo"),"1")',
  script: 'IS_EQUAL(LOOKUP(pageVars,"atalhomodo"),"1")',
  dependencies: [['pageVars', 'atalhomodo']], functions: ['IS_EQUAL', 'LOOKUP'],
};
const tree = app.screens[P2].components.find(n => n.id === ROOT_NODE);
if (!tree.ch.some(n => n.id === PANEL)) {
  const i = tree.ch.findIndex(n => n.id === HEADER);
  if (i < 0) throw new Error('Cabeçalho do Page2 não encontrado');
  tree.ch.splice(i + 1, 0, { id: PANEL, ch: [{ id: PCOMP, ch: [{ id: PLABEL }, { id: PIN }] }, { id: PCANCEL }] });
}

// ---------- 6. atalho.save: nome em dois toques + POST corrigido ----------
const save = app.logic.flows['atalho.save'];
const modeScript = 'IS_EQUAL(LOOKUP(pageVars,"atalhomodo"),"1")';
const suggestScript = 'IF(IS_EMPTY(LOOKUP(pageVars,"atalhonome")),LOOKUP(pageVars,"descricaodespesa"),LOOKUP(pageVars,"atalhonome"))';
const checkScript = '!IS_EMPTY(LOOKUP(pageVars,"descricaodespesa"))';
save.nodes['atalho.modeCheck'] = ifNode(modeScript, ['IS_EQUAL', 'LOOKUP'], [['pageVars', 'atalhomodo']], 'atalho.saveCheck', 'atalho.namemode');
save.nodes['atalho.namemode'] = setExpr('atalhomodo', '"1"', [], [], 'atalho.suggest', null);
save.nodes['atalho.suggest'] = setExpr('atalhonome', suggestScript, ['IF', 'IS_EMPTY', 'LOOKUP'],
  [['pageVars', 'atalhonome'], ['pageVars', 'descricaodespesa']], null, 'atalho.save-success-output');
save.startConnection = { type: 'node', id: 'atalho.modeCheck' };
Object.assign(save.nodes['atalho.saveCheck'].inputs.condition, expr(checkScript, ['IS_EMPTY', 'LOOKUP'], [['pageVars', 'descricaodespesa']]));

const bodyScript = '[{nome:IF(IS_EMPTY(LOOKUP(pageVars,"atalhonome")),LOOKUP(pageVars,"descricaodespesa"),LOOKUP(pageVars,"atalhonome")),valor:IF(IS_EMPTY(LOOKUP(pageVars,"valordespesa")),"",NUMBER(REPLACE_ALL(STRING(LOOKUP(pageVars,"valordespesa")),",","."))),movimento:LOOKUP(pageVars,"entradasaida"),vivus_pessoal:LOOKUP(pageVars,"vivuspessoal"),categoria:LOOKUP(pageVars,"categoriadespesa"),despesas_fixas:LOOKUP(pageVars,"despesafixa"),descricao:LOOKUP(pageVars,"descricaodespesa"),conta:LOOKUP(pageVars,"conta"),classificacao:LOOKUP(pageVars,"contacontabilidade"),percentagem:LOOKUP(pageVars,"percentagemarepor"),reposicao_valor:LOOKUP(pageVars,"valorarepor"),cu:LOOKUP(pageVars,"cu")}]';
save.nodes['atalho.post'].inputs.body = {
  key: {
    script: bodyScript, formula: bodyScript,
    functions: ['LOOKUP', 'IF', 'IS_EMPTY', 'NUMBER', 'REPLACE_ALL', 'STRING'],
    dependencies: [['pageVars', 'atalhonome'], ['pageVars', 'descricaodespesa'], ['pageVars', 'valordespesa'],
      ['pageVars', 'entradasaida'], ['pageVars', 'vivuspessoal'], ['pageVars', 'categoriadespesa'],
      ['pageVars', 'despesafixa'], ['pageVars', 'conta'], ['pageVars', 'contacontabilidade'],
      ['pageVars', 'percentagemarepor'], ['pageVars', 'valorarepor'], ['pageVars', 'cu']],
  },
  source: 'expression',
};
save.nodes['atalho.post'].connections[OK] = [{ type: 'node', id: 'atalho.closePanel' }];
save.nodes['atalho.closePanel'] = setExpr('atalhomodo', '""', [], [], 'atalho.clearName', null);
save.nodes['atalho.clearName'] = setExpr('atalhonome', '""', [], [], 'atalho.alertOk', null);
save.nodes['atalho.alertMissing'].inputs.message.key =
  'Preenche a descrição para guardar o atalho. O valor é opcional.';

// ---------- 7. atalho.cancel (✕) ----------
app.logic.flows['atalho.cancel'] = {
  title: 'Component tap (Component: ✕ Cancelar nome do atalho)',
  nodes: {
    'atalho.cancelMode': setExpr('atalhomodo', '""', [], [], 'atalho.cancelName', null),
    'atalho.cancelName': setExpr('atalhonome', '""', [], [], null, 'atalho.cancel-success-output'),
  },
  inputs: { type: 'object', properties: {}, required: [] },
  outputs: { 'atalho.cancel-success-output': { title: 'Success', description: 'Flow executed successfully', kind: 'success', order: 0, values: {} } },
  startConnection: { type: 'node', id: 'atalho.cancelMode' },
  variables: {}, pageId: P2, contextId: 'page:2:component:' + PCANCEL,
};
app.logic.events['atalho.cancelTap'] = {
  id: 'atalho.cancelTap', name: '', eventSource: 'page:2:component:' + PCANCEL + ':tap',
  triggeredFlows: ['atalho.cancel'], fallbackName: 'Tap', pageId: P2, contextId: 'page:2:component:' + PCANCEL,
};

// ---------- 8. atalho.apply: data de hoje + nome original ----------
const apply = app.logic.flows['atalho.apply'];
apply.nodes['atalho.guard'].connections[TRUE] = [{ type: 'node', id: 'atalho.today' }];
apply.nodes['atalho.today'] = setExpr('datadespesa', 'NOW("YYYY-MM-DD")', ['NOW'], [], 'atalho.v1', null);
apply.nodes['atalho.v11'].connections[SET] = [{ type: 'node', id: 'atalho.name' }];
apply.nodes['atalho.name'] = setExpr('atalhonome',
  'IF(IS_EMPTY(LOOKUP(params,"atalhonome")),"",LOOKUP(params,"atalhonome"))',
  ['IF', 'IS_EMPTY', 'LOOKUP'], [['params', 'atalhonome']], null, 'atalho.apply-success-output');

// ---------- 9. montagem/foco: nunca deixar o botão Submeter preso ----------
const mount = app.logic.flows['7373435c.faeaec'];
mount.nodes['7373435c.faeaec'].connections[SET] = [{ type: 'node', id: 'mount.clearBtn' }];
mount.nodes['mount.clearBtn'] = setExpr('botaosubmeterdespesa', '""', [], [], 'mount.clearPanel', null);
mount.nodes['mount.clearPanel'] = setExpr('atalhomodo', '""', [], [], null, '7373435c.faeaec-success-output');

// ---------- 10. recurso despesasidscsv (export CSV da coluna T) ----------
const urlScript = JSON.stringify('https://docs.google.com/spreadsheets/d/18zBgIUcwIjTc1fOzsmh46CrBnX_usNrCSAHtGEc9RJQ/export?format=csv&gid=1862163396&range=T:T') + '+' + JSON.stringify('&_fresh=') + '+STRING(NOW())';
const mapperScript = `(()=>{const records=(function csv(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\\n'||c==='\\r')){row.push(cell);cell='';if(c!==','){if(c==='\\r'&&text[i+1]==='\\n')i++;rows.push(row);row=[];}}else cell+=c;}if(quoted)throw Error('Invalid CSV');if(cell||row.length){row.push(cell);rows.push(row);}const headers=rows.shift();if(!headers||headers[0]!=='id_despesa')throw Error('Invalid sheet');return rows.filter(x=>x.length===1&&x[0]!=='').map(x=>({id_despesa:x[0]}));})(LOOKUP(response,"data"));return {records,driverCode:LOOKUP(response,"status")};})()`;
const csvRes = JSON.parse(JSON.stringify(app.dataResources.despesasidsdiretos));
csvRes.id = 'despesasidscsv';
csvRes.driverConfiguration.base.baseURL = expr(urlScript, ['STRING', 'NOW'], []);
csvRes.driverConfiguration.operations.list.responseMapper = {
  key: { script: mapperScript, formula: mapperScript, functions: ['LOOKUP'],
    dependencies: [['response', 'data'], ['response', 'status']] },
  source: 'expression',
};
app.dataResources.despesasidscsv = csvRes;

// ---------- 11. ler ids via CSV (nunca mais via gviz pendurado) ----------
let repointed = 0;
for (const f of Object.values(app.logic.flows)) {
  for (const [nid, n] of Object.entries(f.nodes || {})) {
    const r = n.title === 'Get record collection' && n.inputs.request?.key?.resourceName;
    const isAuditNode = nid.startsWith('audit.readIDs') || nid.startsWith('audit.recheck.');
    if (isAuditNode && r && ['despesasidsdiretos', 'despesasdiretas', 'despesasidscsv', 'despesasidscsv2'].includes(r.key)) { r.key = 'despesasidscsv'; repointed++; }
  }
}
if (repointed !== 6) throw new Error('Esperados 6 nós de ids, repointados: ' + repointed);

// ---------- 12. refs canónicas (nós com ref forjada nunca executam no runtime) ----------
// O motor resolve a implementação de cada nó pelo ref.id; ids inventados são ignorados
// em silêncio (o fluxo morre sem canal de erro). Causa raiz do travamento do recheck.
const CANON = {
  'Get record collection': 'own_100f5064.6f140',
  'Set data variable': 'own_105ec0bb.2f7d7',
  'If condition': 'own_225eb957.12fbd',
  'Alert': 'own_bd0c25ba.5aaf3',
};
let fixedRefs = 0;
for (const f of Object.values(app.logic.flows)) {
  for (const n of Object.values(f.nodes || {})) {
    if (n.ref && CANON[n.title] && n.ref.id !== CANON[n.title]) { n.ref.id = CANON[n.title]; fixedRefs++; }
  }
}

// ---------- 13. remover sondas de diagnóstico e repor a cadeia de auditoria ----------
const f9 = app.logic.flows['f990588c.3257d8'];
for (const p of ['probeP1', 'probeP2', 'probeP2b', 'probeP3', 'probeR1', 'probeR2', 'probeR3']) delete f9.nodes[p];
f9.nodes['audit.readIDs'].connections['81ba0b09-224c-4016-8f13-839c8a3ef20a'] = [{ type: 'node', id: 'audit.setIDs' }];
f9.nodes['audit.setIDs'].connections['60c0a221-8687-465d-9249-53c98311db9b'] = [{ type: 'node', id: 'audit.recheck.f990588c.3257d8' }];
f9.nodes['audit.recheck.f990588c.3257d8'].connections['81ba0b09-224c-4016-8f13-839c8a3ef20a'] = [{ type: 'node', id: 'audit.recheckSet.f990588c.3257d8' }];
f9.nodes['audit.recheckSet.f990588c.3257d8'].connections['60c0a221-8687-465d-9249-53c98311db9b'] = [{ type: 'node', id: 'audit.compare.f990588c.3257d8' }];
f9.nodes['audit.compare.f990588c.3257d8'].connections['ceeba261-e546-4b5f-af45-47b75226fb2c'] = [{ type: 'node', id: '41e789d6.06ae28' }];

// ---------- 14. recurso único de ids (remover clone de diagnóstico) ----------
delete app.dataResources.despesasidscsv2;

fs.writeFileSync(PATH, JSON.stringify(app, null, 1));
console.log('OK 3.0.11 escrita. Painel de nome + POST corrigido + ids via CSV (' + repointed + ' nós) + ' + fixedRefs + ' refs canónicas.');
