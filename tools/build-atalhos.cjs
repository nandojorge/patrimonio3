/**
 * Etapa 1 — Página "Atalhos" (page.Page12):
 *  - novo recurso Stein `atalhos`
 *  - clona a Page9 (lista) para Page12 com UUIDs novos
 *  - reescreve expressões/bindings para os campos de atalho
 *  - fluxo de leitura (Get record collection -> Set data variable)
 *  - toque na linha -> abre "nova despesa" (Page2) com params do atalho
 *  - separador "Atalhos" na navegação
 * Uso: node tools/build-atalhos.cjs && npm test
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const PATH = require('node:path').resolve(__dirname, '..', 'tools', 'app-runtime.json');
const app = JSON.parse(fs.readFileSync(PATH, 'utf8'));

const newUuid = (old, salt) => {
  const h = crypto.createHash('sha256').update(salt + old).digest('hex');
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20,32)].join('-');
};

// Ids completos da Page9 que precisam de conversão
const OLD = {
  list: 'caebf2f9-3d47-5451-9939-edd2794bbfe7',
  nome: 'df7d329b-aea7-5045-84c8-2bf1d3fa6ec0',
  valor: '349ccccd-2c8d-5e67-81eb-b1f901c576d1',
  date: '8c7fd425-c37c-581f-af0b-b4d1b6ecbb1d',
  empty: 'fe0ad1b5-28f5-51a9-889c-2f962c095083',
  icon: null, // resolvido por prefixo
  emptyPic: null,
};
const NEW_EXPR = {
  list: newUuid(OLD.list, 'at12:'),
  nome: newUuid(OLD.nome, 'at12:'),
  valor: newUuid(OLD.valor, 'at12:'),
  date: newUuid(OLD.date, 'at12:'),
  empty: newUuid(OLD.empty, 'at12:'),
};

// ---------- 1. recurso `atalhos` ----------
if (!app.dataResources.atalhos) {
  const r = JSON.parse(JSON.stringify(app.dataResources.listasStein));
  r.id = 'atalhos';
  r.driverConfiguration.base.baseURL.key =
    'https://api.steinhq.com/v1/storages/66fe6b324d11fd04f0335b3a/atalhos';
  r.schema = {
    type: 'object',
    properties: Object.fromEntries(
      ['nome','valor','movimento','vivus_pessoal','categoria','despesas_fixas','descricao',
       'conta','classificacao','percentagem','reposicao_valor','cu']
        .map(k => [k, { type: 'string' }])
    ),
    identifiers: ['id'],
  };
  app.dataResources.atalhos = r;
}

// ---------- 2. clonar componentes Page9 -> Page12 ----------
const P9 = 'page.Page9', P12 = 'page.Page12';
const p9ids = Object.entries(app.components)
  .filter(([, c]) => c.pageId === P9).map(([id]) => id);
const idMap = Object.fromEntries(p9ids.map(id => [id, newUuid(id, 'at12:')]));

// prefixo -> id completo (para remover imagem de linha e do estado vazio)
const byPrefix = pre => p9ids.find(i => i.startsWith(pre));
const REMOVE = [byPrefix('89e00a01'), byPrefix('380bde7c')].filter(Boolean);

const sub = s => {
  let out = s;
  for (const [o, n] of Object.entries(idMap)) out = out.split(o).join(n);
  for (const [o, n] of Object.entries(NEW_EXPR)) out = out.split(OLD[Object.keys(NEW_EXPR)[Object.keys(NEW_EXPR).indexOf(o)]] || o).join(n);
  return out;
};
// substitui ids de expressões antigos -> novos (mapeamento explícito)
const exprSwap = s => {
  let out = s;
  out = out.split(OLD.list).join(NEW_EXPR.list);
  out = out.split(OLD.nome).join(NEW_EXPR.nome);
  out = out.split(OLD.valor).join(NEW_EXPR.valor);
  out = out.split(OLD.date).join(NEW_EXPR.date);
  out = out.split(OLD.empty).join(NEW_EXPR.empty);
  return out;
};
const remap = o => JSON.parse(exprSwap(JSON.stringify(o)
  .replace(new RegExp(p9ids.map(escapeRe).join('|'), 'g'), m => idMap[m] || m)
  .split(P9).join(P12)
  .split('page:9').join('page:12')));
function escapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

for (const [old, c] of Object.entries(app.components)) {
  if (c.pageId !== P9) continue;
  const clone = remap(c);
  app.components[clone.id] = clone;
}

// ---------- 3. ecrã Page12 ----------
const p12 = remap(app.screens[P9]);
p12.pageId = P12;
p12.title = '5.0 Atalhos';
p12.pageFlowId = 'page:12';
p12.dataReferences = { atalhos1: [] };
p12.dataResources = [];
// limpar eventos do clone (vamos recriar load/tap)
p12.events = { onPageDidMount: [], onPageDidFocus: [] };
app.screens[P12] = p12;

// remover imagem da linha e do estado vazio da árvore
const dropNodes = nodes => (nodes || [])
  .filter(n => !REMOVE.includes(n.id))
  .map(n => (n.ch = dropNodes(n.ch), n));
p12.components = dropNodes(p12.components);

// ---------- 4. expressões novas ----------
Object.assign(app.expressions, {
  [NEW_EXPR.list]: {
    id: NEW_EXPR.list, type: 'expression',
    formula: 'data.atalhos1', script: 'data.atalhos1',
    dependencies: [['data','atalhos1']], functions: [],
  },
  [NEW_EXPR.nome]: {
    id: NEW_EXPR.nome, type: 'expression',
    formula: 'repeated.current.nome', script: 'repeated.current.nome',
    dependencies: [['repeated','current','nome']], functions: [],
  },
  [NEW_EXPR.valor]: {
    id: NEW_EXPR.valor, type: 'expression',
    formula: 'repeated.current.valor + " €"', script: 'repeated.current.valor + " €"',
    dependencies: [['repeated','current','valor']], functions: [],
  },
  [NEW_EXPR.date]: {
    id: NEW_EXPR.date, type: 'expression',
    formula: 'repeated.current.categoria', script: 'repeated.current.categoria',
    dependencies: [['repeated','current','categoria']], functions: [],
  },
  [NEW_EXPR.empty]: {
    id: NEW_EXPR.empty, type: 'expression',
    formula: 'COUNT(data.atalhos1)==0', script: 'COUNT(data.atalhos1)==0',
    dependencies: [['data','atalhos1']], functions: ['COUNT'],
  },
});

// reescrever bindings repeat da linha: `current.conta` -> categoria etc.
const parentId = idMap[byPrefix('44bfb58e')];
for (const [cid, c] of Object.entries(app.components)) {
  if (c.pageId !== P12) continue;
  for (const b of c.props?.bindings || []) {
    if (b.type === 'repeat' && b.aliasKey === 'current-' + parentId) {
      if (b.sourceProp === 'current.conta') b.sourceProp = 'current.descricao';
      if (b.sourceProp === 'current.id_despesa') b.sourceProp = 'current.movimento';
    }
  }
}

// ---------- 5. fluxo de leitura + evento mount ----------
app.logic.flows['atalhos.load'] = {
  title: 'atalhos.load',
  nodes: {
    'atalhos.read': {
      type: 'function', title: 'Get record collection',
      ref: { type: 'flow-function', id: 'own_100f5064.6f140' },
      inputs: { request: { key: { resourceName: { source: 'resource', key: 'atalhos' } }, source: 'object' } },
      connections: { '81ba0b09-224c-4016-8f13-839c8a3ef20a': [{ type: 'node', id: 'atalhos.set' }] },
    },
    'atalhos.set': {
      type: 'function', title: 'Set data variable',
      ref: { type: 'flow-function', id: 'own_105ec0bb.2f7d7' },
      inputs: { assignment: { key: {
        data: { source: 'node', key: 'records@@@atalhos.read' },
        reference: { source: 'data-reference', key: 'atalhos1' },
      }, source: 'object' } },
      connections: {},
    },
  },
  inputs: { type: 'object', properties: {}, required: [] },
  outputs: {},
  startConnection: { type: 'node', id: 'atalhos.read' },
  variables: {},
  pageId: P12,
  contextId: 'page:12',
};

const mountId = 'atalhos.mount';
app.logic.events[mountId] = {
  id: mountId, name: '', eventSource: 'page:12:onPageDidMount',
  triggeredFlows: ['atalhos.load'], fallbackName: 'Page mounted',
  pageId: P12, contextId: 'page:12',
};
p12.events.onPageDidMount.push({ id: mountId });

// ---------- 6. toque na linha -> Page2 com params ----------
const tapFlowId = 'atalhos.use';
app.logic.flows[tapFlowId] = {
  title: 'Component tap (Component: list)',
  nodes: {
    [tapFlowId]: {
      type: 'function', title: 'Open page',
      ref: { type: 'flow-function', id: 'own_2277ac59.912ff' },
      inputs: {
        page: { key: 'page.Page2', source: 'page' },
        params: { key: {
          usaratalho: { source: 'str', key: '1' },
          atalhonome: { source: 'repeated', key: 'current.nome' },
          valordespesa: { source: 'repeated', key: 'current.valor' },
          entradasaida: { source: 'repeated', key: 'current.movimento' },
          vivuspessoal: { source: 'repeated', key: 'current.vivus_pessoal' },
          categoriadespesa: { source: 'repeated', key: 'current.categoria' },
          despesafixa: { source: 'repeated', key: 'current.despesas_fixas' },
          descricaodespesa: { source: 'repeated', key: 'current.descricao' },
          conta: { source: 'repeated', key: 'current.conta' },
          contacontabilidade: { source: 'repeated', key: 'current.classificacao' },
          percentagemarepor: { source: 'repeated', key: 'current.percentagem' },
          valorarepor: { source: 'repeated', key: 'current.reposicao_valor' },
          cu: { source: 'repeated', key: 'current.cu' },
        }, source: 'object' },
        openInModal: { key: false, source: 'bool' },
      },
      connections: {},
    },
  },
  inputs: { type: 'object', properties: {}, required: [] },
  outputs: {},
  startConnection: { type: 'node', id: tapFlowId },
  variables: {},
  pageId: P12,
  contextId: 'page:12:component:' + parentId,
};

const tapEventId = 'atalhos.tap';
app.logic.events[tapEventId] = {
  id: tapEventId, name: '', eventSource: 'page:12:component:' + parentId + ':tap',
  triggeredFlows: [tapFlowId], fallbackName: 'Tap',
  pageId: P12, contextId: 'page:12:component:' + parentId,
};
p12.events.onPageDidTap = [{ id: tapEventId }];

// ---------- 7. separador de navegação ----------
const tabs = app.navigation.mobile.tabs;
if (!tabs.some(t => t.pageId === P12)) {
  tabs.push({ title: 'Atalhos', pageId: P12, iconName: 'star' });
}

fs.writeFileSync(PATH, JSON.stringify(app, null, 1));
console.log('OK etapa 1 escrita. Recurso atalhos + Page12 + navegação.');
console.log('Componentes clonados:', p9ids.length, '| removidos:', REMOVE.length);
