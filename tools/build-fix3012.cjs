/**
 * 3.0.12 — pedidos do utilizador: eliminar atalhos, editar atalhos e melhorar
 * o espaço do campo "Nome do atalho".
 *
 * 1. EDITAR: ao abrir a nova despesa a partir de um atalho (Page12 → usaratalho=1)
 *    o painel do nome abre em modo "2" (editar) com o nome original. A ★ nesse
 *    modo faz PUT (condition: nome original) com os campos do formulário.
 * 2. ELIMINAR: botão "Eliminar" no painel, visível só no modo "2". Pede
 *    confirmação, faz DELETE (condition: nome original) e volta à lista.
 * 3. ESPAÇO DO NOME: o painel passa a linha (campo à esquerda a crescer,
 *    Eliminar e ✕ à direita), com padding, cantos 8 e ✕ com alvo de toque maior.
 *
 * Notas: a folha `atalhos` não tem coluna id — a chave é o nome original,
 * guardado em atalhoeditnome no momento de abrir o atalho. O mount/foco limpam
 * o modo com IF(usaratalho=1,"2","") para serem idempotentes em qualquer ordem.
 * Uso: node tools/build-fix3012.cjs && npm run build:runtime && npm test
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const PATH = path.resolve(ROOT, 'tools', 'app-runtime.json');
const app = JSON.parse(fs.readFileSync(PATH, 'utf8'));

const newUuid = (old, salt) => {
  const h = crypto.createHash('sha256').update(salt + old).digest('hex');
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20,32)].join('-');
};
const P2 = 'page.Page2';
const SUBMIT = 'bca11f6d-2255-4d55-9eac-4da768e41314';
const PANEL = '64424eed-c034-f5bb-31df-bc58d107cd9c';
const PCOMP = '6f1a08b8-cee4-a85b-eaf6-87fc027c2164';
const PCANCEL = '61277849-2114-4faf-a985-ea571040b29c';
const PANEL_VIS = '0ecdc962-5de5-2fd0-823a-c1cc2ac71afb';
const ELIM = newUuid(SUBMIT, 'at4:elim');
const ELIM_VIS = newUuid(SUBMIT, 'at4:elimvis');

const TRUE = 'ceeba261-e546-4b5f-af45-47b75226fb2c', FALSE = '871f4881-b57c-41d5-9934-a69367733066';
const SET = 'aab5c5a6-049b-4e2b-8068-aac6d1c8cab3';
const OK = '180fc790-08a9-44c1-b7ab-265caf4f13e7', BAD = 'a4ec0b24-5bf1-40d3-97f0-91689c16c0be', ERR = 'd0ffa631-53c6-4352-8b33-0db7034ae11f';
const ALERTCH = '4b40389a-e389-4658-8a3b-4fe47959ade7';
const CONF_YES = 'd439758f-3d3e-4b03-adcf-bb093c3ff1fc', CONF_NO = '08c2f10b-bcff-4c63-a29d-cbfe6fa69a9c';
const REF_HTTP = 'own_1a22567d.4d69a', REF_SET = 'own_23268044.e1e2b', REF_IF = 'own_225eb957.12fbd';
const REF_ALERT = 'own_bd0c25ba.5aaf3', REF_CONFIRM = 'own_1adc86bb.3d695', REF_NAVBACK = 'own_20bb6b4f.8c11d';
const STEIN = 'https://api.steinhq.com/v1/storages/66fe6b324d11fd04f0335b3a/atalhos';

const exprObj = (script, functions, dependencies) => ({ source: 'expression', key: { script, formula: script, functions, dependencies } });
const setVar = (refKey, script, functions, dependencies, next, outputId) => ({
  type: 'function', title: 'Set page variable', ref: { type: 'flow-function', id: REF_SET },
  inputs: { variable: { key: { value: exprObj(script, functions, dependencies), reference: { source: 'page-variable-ref', key: refKey } }, source: 'object' } },
  connections: { [SET]: next ? [{ type: 'node', id: next }] : [{ type: 'output', id: outputId }] },
});
const ifNode = (script, functions, dependencies, yes, no) => ({
  type: 'function', title: 'If condition', ref: { type: 'flow-function', id: REF_IF },
  inputs: { condition: exprObj(script, functions, dependencies) },
  connections: { [TRUE]: [{ type: 'node', id: yes }], [FALSE]: [{ type: 'node', id: no }] },
});
const alertNode = (title, message, next) => ({
  type: 'function', title: 'Alert', ref: { type: 'flow-function', id: REF_ALERT },
  inputs: { title: { key: title, source: 'str' }, message: { key: message, source: 'str' }, dismissLabel: { key: 'OK', source: 'str' } },
  connections: next ? { [ALERTCH]: [{ type: 'node', id: next }] } : {},
});
const httpNode = (method, bodyScript, functions, dependencies, connections) => ({
  type: 'function', title: 'HTTP request', ref: { type: 'flow-function', id: REF_HTTP },
  inputs: {
    url: { key: STEIN, source: 'str' }, method: { key: method, source: 'str' },
    headers: { key: [{ value: 'application/json', header: 'Content-Type' }], source: [{ value: 'str', header: 'str' }] },
    bodyType: { key: 'json', source: 'str' },
    body: exprObj(bodyScript, functions, dependencies),
  },
  connections,
});

// ---------- 1. versão ----------
const pkgPath = path.resolve(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '3.0.12';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// ---------- 2. pageVariable com o nome original do atalho ----------
app.screens[P2].pageVariables.atalhoeditnome = '';

// ---------- 3. o painel do nome fica visível nos modos criar ("1") e editar ("2") ----------
const panelVis = '!IS_EQUAL(LOOKUP(pageVars,"atalhomodo"),"")';
Object.assign(app.expressions[PANEL_VIS], {
  formula: panelVis, script: panelVis,
  dependencies: [['pageVars', 'atalhomodo']], functions: ['IS_EQUAL', 'LOOKUP'],
});

// ---------- 4. mount/foco: modo editar ("2") quando a página abre com um atalho ----------
const clearPanel = app.logic.flows['7373435c.faeaec'].nodes['mount.clearPanel'];
clearPanel.inputs.variable.key.value = exprObj(
  'IF(IS_EQUAL(LOOKUP(params,"usaratalho"),"1"),"2","")',
  ['IF', 'IS_EQUAL', 'LOOKUP'],
  [['params', 'usaratalho']],
);

// ---------- 5. atalho.apply guarda o nome original (chave do PUT/DELETE) ----------
const apply = app.logic.flows['atalho.apply'];
apply.nodes['atalho.editnome'] = setVar(
  'atalhoeditnome',
  'IF(IS_EMPTY(LOOKUP(params,"atalhonome")),"",LOOKUP(params,"atalhonome"))',
  ['IF', 'IS_EMPTY', 'LOOKUP'],
  [['params', 'atalhonome']],
  null, 'atalho.apply-success-output',
);
apply.nodes['atalho.name'].connections[SET] = [{ type: 'node', id: 'atalho.editnome' }];

// ---------- 6. ★ em modo editar faz PUT (condition: nome original) ----------
const save = app.logic.flows['atalho.save'];
save.nodes['atalho.modeCheck'].connections[FALSE] = [{ type: 'node', id: 'atalho.editModeCheck' }];
const putBody = '{condition:{nome:LOOKUP(pageVars,"atalhoeditnome")},set:{nome:IF(IS_EMPTY(LOOKUP(pageVars,"atalhonome")),LOOKUP(pageVars,"descricaodespesa"),LOOKUP(pageVars,"atalhonome")),valor:IF(IS_EMPTY(LOOKUP(pageVars,"valordespesa")),"",NUMBER(REPLACE_ALL(STRING(LOOKUP(pageVars,"valordespesa")),",","."))),movimento:LOOKUP(pageVars,"entradasaida"),vivus_pessoal:LOOKUP(pageVars,"vivuspessoal"),categoria:LOOKUP(pageVars,"categoriadespesa"),despesas_fixas:LOOKUP(pageVars,"despesafixa"),descricao:LOOKUP(pageVars,"descricaodespesa"),conta:LOOKUP(pageVars,"conta"),classificacao:LOOKUP(pageVars,"contacontabilidade"),percentagem:LOOKUP(pageVars,"percentagemarepor"),reposicao_valor:LOOKUP(pageVars,"valorarepor"),cu:LOOKUP(pageVars,"cu")}}';
save.nodes['atalho.editModeCheck'] = ifNode(
  'IS_EQUAL(LOOKUP(pageVars,"atalhomodo"),"2")', ['IS_EQUAL', 'LOOKUP'], [['pageVars', 'atalhomodo']],
  'atalho.editCheck', 'atalho.namemode',
);
save.nodes['atalho.editCheck'] = ifNode(
  '!IS_EMPTY(LOOKUP(pageVars,"atalhoeditnome"))&&!IS_EMPTY(LOOKUP(pageVars,"descricaodespesa"))',
  ['IS_EMPTY', 'LOOKUP'],
  [['pageVars', 'atalhoeditnome'], ['pageVars', 'descricaodespesa']],
  'atalho.put', 'atalho.alertEditMissing',
);
save.nodes['atalho.put'] = httpNode('PUT', putBody,
  ['LOOKUP', 'IF', 'IS_EMPTY', 'NUMBER', 'REPLACE_ALL', 'STRING'],
  [['pageVars', 'atalhoeditnome'], ['pageVars', 'atalhonome'], ['pageVars', 'descricaodespesa'], ['pageVars', 'valordespesa'], ['pageVars', 'entradasaida'], ['pageVars', 'vivuspessoal'], ['pageVars', 'categoriadespesa'], ['pageVars', 'despesafixa'], ['pageVars', 'conta'], ['pageVars', 'contacontabilidade'], ['pageVars', 'percentagemarepor'], ['pageVars', 'valorarepor'], ['pageVars', 'cu']],
  { [OK]: [{ type: 'node', id: 'atalho.editClose' }], [BAD]: [{ type: 'node', id: 'atalho.alertUpdateErr' }], [ERR]: [{ type: 'node', id: 'atalho.alertUpdateErr' }] },
);
save.nodes['atalho.editClose'] = setVar('atalhomodo', '""', [], [], 'atalho.editClearName');
save.nodes['atalho.editClearName'] = setVar('atalhonome', '""', [], [], 'atalho.editClearEdit');
save.nodes['atalho.editClearEdit'] = setVar('atalhoeditnome', '""', [], [], 'atalho.alertUpdated');
save.nodes['atalho.alertUpdated'] = alertNode('Atalho atualizado', 'O atalho foi atualizado e já aparece na página Atalhos.');
save.nodes['atalho.alertUpdateErr'] = alertNode('Não foi possível guardar', 'Verifica a ligação com a folha e tenta novamente.');
save.nodes['atalho.alertEditMissing'] = alertNode('Faltam dados', 'Para editar um atalho tem de estar preenchido o nome original e a descrição.');

// ---------- 7. ✕ também limpa o nome original ----------
const cancel = app.logic.flows['atalho.cancel'];
cancel.nodes['atalho.cancelEdit'] = setVar('atalhoeditnome', '""', [], [], null, 'atalho.cancel-success-output');
cancel.nodes['atalho.cancelName'].connections[SET] = [{ type: 'node', id: 'atalho.cancelEdit' }];

// ---------- 8. layout do painel: linha com campo a crescer e botões à direita ----------
const panelHolder = app.components[PANEL].props.styles.holder;
Object.assign(panelHolder, {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
  paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 8,
  borderRadius: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
});
delete panelHolder.minHeight;
const compHolder = app.components[PCOMP].props.styles.holder;
Object.assign(compHolder, { marginLeft: 0, marginRight: 0, flexGrow: 1, flexShrink: 1 });
const cancelView = app.components[PCANCEL].props.styles.view;
Object.assign(cancelView, { paddingTop: 8, paddingBottom: 8 });

// ---------- 9. botão "Eliminar" (só no modo editar) ----------
if (!app.components[ELIM]) {
  const elim = JSON.parse(JSON.stringify(app.components[PCANCEL]));
  elim.id = ELIM;
  elim.props.content = 'Eliminar';
  elim.props.flowGroupId = 'page:2:component:' + ELIM;
  elim.props.expressionProps = ['visible'];
  elim.props.bindings = [{ type: 'expression', sourceId: ELIM_VIS, targetProp: 'visible' }];
  elim.props.events = { tap: [{ id: 'atalho.deleteTap' }], onPress: [{ id: 'atalho.deleteTap' }] };
  Object.assign(elim.props.styles.text, { color: '#d64545', fontSize: 14, fontWeight: '700', lineHeight: 20, textAlign: 'center' });
  Object.assign(elim.props.styles.view, { paddingLeft: 12, paddingRight: 8, paddingTop: 8, paddingBottom: 8, marginBottom: 0 });
  app.components[ELIM] = elim;
}
const elimVis = 'IS_EQUAL(LOOKUP(pageVars,"atalhomodo"),"2")';
app.expressions[ELIM_VIS] = { id: ELIM_VIS, type: 'expression', formula: elimVis, script: elimVis, dependencies: [['pageVars', 'atalhomodo']], functions: ['IS_EQUAL', 'LOOKUP'] };

const findNode = (arr, pred) => { for (const n of (arr || [])) { if (pred(n.id)) return n; const r = findNode(n.ch, pred); if (r) return r; } return null; };
const panelNode = findNode(app.screens[P2].components, id => id === PANEL);
if (!panelNode.ch.some(n => n.id === ELIM)) panelNode.ch.splice(1, 0, { id: ELIM, ch: [] });

// ---------- 10. evento + fluxo de eliminação ----------
app.logic.events['atalho.deleteTap'] = {
  id: 'atalho.deleteTap', name: '', eventSource: 'page:2:component:' + ELIM + ':tap',
  triggeredFlows: ['atalho.delete'], fallbackName: 'Tap', pageId: 'page.Page2', contextId: 'page:2:component:' + ELIM,
};
const delMsg = 'LOOKUP(pageVars,"atalhoeditnome")+" será eliminado da folha. Esta ação não pode ser desfeita."';
app.logic.flows['atalho.delete'] = {
  title: 'Component tap (Component: Eliminar atalho)',
  nodes: {
    'atalho.delConfirm': {
      type: 'function', title: 'Confirm', ref: { type: 'flow-function', id: REF_CONFIRM },
      inputs: {
        title: { key: 'Eliminar atalho', source: 'str' },
        message: exprObj(delMsg, ['ADD', 'LOOKUP'], [['pageVars', 'atalhoeditnome']]),
        cancelLabel: { key: 'Não', source: 'str' }, confirmLabel: { key: 'Sim', source: 'str' },
      },
      connections: { [CONF_YES]: [{ type: 'node', id: 'atalho.del' }], [CONF_NO]: [{ type: 'output', id: 'atalho.delete-success-output' }] },
    },
    'atalho.del': httpNode('DELETE', '{condition:{nome:LOOKUP(pageVars,"atalhoeditnome")}}',
      ['LOOKUP'], [['pageVars', 'atalhoeditnome']],
      { [OK]: [{ type: 'node', id: 'atalho.delClose' }], [BAD]: [{ type: 'node', id: 'atalho.alertDeleteErr' }], [ERR]: [{ type: 'node', id: 'atalho.alertDeleteErr' }] },
    ),
    'atalho.delClose': setVar('atalhomodo', '""', [], [], 'atalho.delClearName'),
    'atalho.delClearName': setVar('atalhonome', '""', [], [], 'atalho.delClearEdit'),
    'atalho.delClearEdit': setVar('atalhoeditnome', '""', [], [], 'atalho.alertDeleted'),
    'atalho.alertDeleted': alertNode('Atalho eliminado', 'O atalho foi eliminado da lista de atalhos.', 'atalho.delBack'),
    'atalho.delBack': {
      type: 'function', title: 'Navigate back', ref: { type: 'flow-function', id: REF_NAVBACK },
      inputs: { numberOfPages: { key: 1, source: 'num' } }, connections: {},
    },
    'atalho.alertDeleteErr': alertNode('Não foi possível eliminar', 'Verifica a ligação com a folha e tenta novamente.'),
  },
  inputs: { type: 'object', properties: {}, required: [] },
  outputs: {
    'atalho.delete-success-output': { title: 'Success', description: 'Flow executed successfully', kind: 'success', order: 0, values: {} },
    'atalho.delete-error-output': { title: 'Error', description: 'Flow executed with an error', kind: 'error', order: 1, values: {} },
  },
  startConnection: { type: 'node', id: 'atalho.delConfirm' },
  variables: {}, pageId: 'page.Page2', contextId: 'page:2:component:' + ELIM,
};

fs.writeFileSync(PATH, JSON.stringify(app, null, 1) + '\n');
console.log('build-fix3012 aplicado. ELIM=' + ELIM + ' ELIM_VIS=' + ELIM_VIS);
