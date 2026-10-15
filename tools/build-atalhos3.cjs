/**
 * Etapa 2B — botão «★ Guardar como atalho» na nova despesa (Page2):
 *  - clona o botão de submeter como novo botão com UUID próprio
 *  - expressão de visibilidade dedicada (descrição + valor preenchidos)
 *  - fluxo `atalho.save` -> If condition -> POST para a aba `atalhos` -> Alert
 *  - endurece `atalho.apply`: célula vazia na folha mantém o valor por omissão do formulário
 * Uso: node tools/build-atalhos3.cjs && npm test
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const PATH = path.resolve(__dirname, '..', 'tools', 'app-runtime.json');
const app = JSON.parse(fs.readFileSync(PATH, 'utf8'));

const newUuid = (old, salt) => {
  const h = crypto.createHash('sha256').update(salt + old).digest('hex');
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20,32)].join('-');
};
const P2 = 'page.Page2';
const SUBMIT = 'bca11f6d-2255-4d55-9eac-4da768e41314';
const ATELHOS_URL = 'https://api.steinhq.com/v1/storages/66fe6b324d11fd04f0335b3a/atalhos';
const TRUE = 'ceeba261-e546-4b5f-af45-47b75226fb2c', FALSE = '871f4881-b57c-41d5-9934-a69367733066';
const OK = '180fc790-08a9-44c1-b7ab-265caf4f13e7', BAD = 'a4ec0b24-5bf1-40d3-97f0-91689c16c0be', ERR = 'd0ffa631-53c6-4352-8b33-0db7034ae11f';

const btnId = newUuid(SUBMIT, 'at2b:');
const exprId = newUuid(SUBMIT, 'at2b:expr');

// ---------- 1. expressão de visibilidade do ★ ---------- 
const visScript = '!IS_EMPTY(LOOKUP(pageVars,"descricaodespesa"))&&!IS_EMPTY(LOOKUP(pageVars,"valordespesa"))';
app.expressions[exprId] = {
  id: exprId, type: 'expression', formula: visScript, script: visScript,
  dependencies: [['pageVars','descricaodespesa'],['pageVars','valordespesa']],
  functions: ['IS_EMPTY','LOOKUP'],
};

// ---------- 2. clonar o botão de submeter ---------- 
const btn = JSON.parse(JSON.stringify(app.components[SUBMIT]));
btn.id = btnId;
btn.props.flowGroupId = 'page:2:component:' + btnId;
btn.props.label = '★ Guardar como atalho';
btn.props.events = { tap: [{id:'atalho.saveTap'}], onPress: [{id:'atalho.saveTap'}] };
btn.props.bindings = [{ type:'expression', sourceId: exprId, targetProp: 'visible' }];
btn.props.styles.button.backgroundColor = '#5a5a5a';
btn.props.styles.button.minHeight = 44;
app.components[btnId] = btn;

// ---------- 3. inserir na árvore antes do botão de submeter ---------- 
const screen = app.screens[P2];
if (!JSON.stringify(screen.components).includes(btnId)) {
  const insert = nodes => {
    for (const n of nodes) {
      const i = (n.ch || []).findIndex(c => c.id === SUBMIT);
      if (i >= 0) { n.ch.splice(i, 0, {id: btnId}); return true; }
      if (n.ch && insert(n.ch)) return true;
    }
    return false;
  };
  if (!insert(screen.components)) throw new Error('Botão de submeter não encontrado na árvore do Page2');
}

// ---------- 4. atalho.apply: célula vazia mantém o valor por omissão ---------- 
for (const n of Object.values(app.logic.flows['atalho.apply'].nodes)) {
  if (n.title !== 'Set page variable') continue;
  const a = n.inputs.variable.key;
  if (a.value.source !== 'parameter') continue;
  const f = a.reference.key;
  const script = `IF(IS_EMPTY(LOOKUP(params,"${f}")),LOOKUP(pageVars,"${f}"),LOOKUP(params,"${f}"))`;
  a.value = { source: 'expression', key: { script, formula: script,
    functions: ['IF','IS_EMPTY','LOOKUP'], dependencies: [['params',f],['pageVars',f]] } };
}

// ---------- 5. fluxo atalho.save ---------- 
const bodyFields = ['descricaodespesa','valordespesa','entradasaida','vivuspessoal','categoriadespesa',
  'despesafixa','conta','contacontabilidade','percentagemarepor','valorarepor','cu'];
const bodyScript = '[{nome:LOOKUP(pageVars,"descricaodespesa"),valor:NUMBER(REPLACE_ALL(STRING(LOOKUP(pageVars,"valordespesa")),",",".")),movimento:LOOKUP(pageVars,"entradasaida"),vivus_pessoal:LOOKUP(pageVars,"vivuspessoal"),categoria:LOOKUP(pageVars,"categoriadespesa"),despesas_fixas:LOOKUP(pageVars,"despesafixa"),descricao:LOOKUP(pageVars,"descricaodespesa"),conta:LOOKUP(pageVars,"conta"),classificacao:LOOKUP(pageVars,"contacontabilidade"),percentagem:LOOKUP(pageVars,"percentagemarepor"),reposicao_valor:LOOKUP(pageVars,"valorarepor"),cu:LOOKUP(pageVars,"cu")}]';
const checkScript = '!IS_EMPTY(LOOKUP(pageVars,"descricaodespesa"))&&!IS_EMPTY(LOOKUP(pageVars,"valordespesa"))';
const alert = (id, title, message) => ({
  type: 'function', title: 'Alert', ref: { type: 'flow-function', id: 'own_bd0c25ba.5aaf3' },
  inputs: { title: { key: title, source: 'str' }, message: { key: message, source: 'str' }, dismissLabel: { key: 'OK', source: 'str' } },
  connections: {},
});
app.logic.flows['atalho.save'] = {
  title: 'Component tap (Component: ★ Guardar como atalho)',
  nodes: {
    'atalho.saveCheck': {
      type: 'function', title: 'If condition', ref: { type: 'flow-function', id: 'own_225eb957.12fbd' },
      inputs: { condition: { source: 'expression', key: { script: checkScript, formula: checkScript,
        functions: ['IS_EMPTY','LOOKUP'], dependencies: [['pageVars','descricaodespesa'],['pageVars','valordespesa']] } } },
      connections: { [TRUE]: [{type:'node', id:'atalho.post'}], [FALSE]: [{type:'node', id:'atalho.alertMissing'}] },
    },
    'atalho.post': {
      type: 'function', title: 'HTTP request', ref: { type: 'flow-function', id: 'own_1a22567d.4d69a' },
      inputs: {
        url: { key: ATELHOS_URL, source: 'str' },
        method: { key: 'POST', source: 'str' },
        headers: { key: [{ value: 'application/json', header: 'Content-Type' }], source: [{ value: 'str', header: 'str' }] },
        bodyType: { key: 'json', source: 'str' },
        body: { key: { script: bodyScript, formula: bodyScript, functions: ['LOOKUP','NUMBER','REPLACE_ALL','STRING'],
          dependencies: bodyFields.map(f => ['pageVars', f]) } },
      },
      connections: { [OK]: [{type:'node', id:'atalho.alertOk'}], [BAD]: [{type:'node', id:'atalho.alertErr'}], [ERR]: [{type:'node', id:'atalho.alertErr'}] },
    },
    'atalho.alertOk': alert('ok', 'Atalho guardado', 'O atalho foi guardado e já está disponível na página Atalhos.'),
    'atalho.alertMissing': alert('missing', 'Faltam dados', 'Preenche a descrição e o valor para guardar o atalho.'),
    'atalho.alertErr': alert('err', 'Não foi possível guardar', 'Verifica a ligação com a folha e tenta novamente.'),
  },
  inputs: { type: 'object', properties: {}, required: [] },
  outputs: {
    'atalho.save-success-output': { title: 'Success', description: 'Flow executed successfully', kind: 'success', order: 0, values: {} },
    'atalho.save-error-output': { title: 'Error', description: 'Flow executed with an error', kind: 'error', order: 1, values: {} },
  },
  startConnection: { type: 'node', id: 'atalho.saveCheck' },
  variables: {}, pageId: P2, contextId: 'page:2:component:' + btnId,
};

// ---------- 6. evento de toque do ★ ---------- 
app.logic.events['atalho.saveTap'] = {
  id: 'atalho.saveTap', name: '', eventSource: 'page:2:component:' + btnId + ':tap',
  triggeredFlows: ['atalho.save'], fallbackName: 'Tap', pageId: P2, contextId: 'page:2:component:' + btnId,
};

fs.writeFileSync(PATH, JSON.stringify(app, null, 1));
console.log('OK etapa 2B escrita. Botão ★ + atalho.save + atalho.apply endurecido.');
