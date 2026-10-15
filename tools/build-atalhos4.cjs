/**
 * Etapa 2C — substituir o botão ★ grande por uma estrela discreta no topo do ecrã:
 *  - remove o botão clonado (label '★ Guardar como atalho')
 *  - cria um texto '★' (primeiro elemento do cabeçalho) com o mesmo evento e visibilidade
 * Uso: node tools/build-atalhos4.cjs && npm test
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
const TITLE = '7f0af8d2-2528-4d26-b8d4-f32694f6dac1';   // "Nova Despesa"
const HEADER_ROW = 'c7c2cc80-7bbc-44a2-abbc-004c67e51637'; // cabeçalho (ícone + títulos)
const btnId = newUuid(SUBMIT, 'at2b:');
const exprId = newUuid(SUBMIT, 'at2b:expr');
const starId = newUuid(SUBMIT, 'at2c:star');

// ---------- 1. remover o botão grande ---------- 
const screen = app.screens[P2];
const removeNode = nodes => {
  for (const n of nodes) {
    const i = (n.ch || []).findIndex(c => c.id === btnId);
    if (i >= 0) { n.ch.splice(i, 1); return true; }
    if (n.ch && removeNode(n.ch)) return true;
  }
  return false;
};
if (removeNode(screen.components)) delete app.components[btnId];

// ---------- 2. criar a estrela (texto ★ no cabeçalho) ---------- 
const star = JSON.parse(JSON.stringify(app.components[TITLE]));
star.id = starId;
star.props.content = '★';
star.props.flowGroupId = 'page:2:component:' + starId;
star.props.events = { tap: [{id:'atalho.saveTap'}], onPress: [{id:'atalho.saveTap'}] };
star.props.bindings = [{ type:'expression', sourceId: exprId, targetProp: 'visible' }];
star.props.expressionProps = ['visible'];
star.props.styles.text = { ...star.props.styles.text, fontSize: 26, color: '#f5a623', fontWeight: '700', lineHeight: 30 };
star.props.styles.view = { ...(star.props.styles.view||{}), paddingRight: 8, alignSelf: 'flex-start' };
app.components[starId] = star;

// ---------- 3. inserir como primeiro elemento do cabeçalho ---------- 
if (!JSON.stringify(screen.components).includes(starId)) {
  const row = screen.components.find(n => n.id === HEADER_ROW)
    || (() => { const find = ns => { for (const n of ns) { if (n.id === HEADER_ROW) return n; if (n.ch) { const r = find(n.ch); if (r) return r; } } return null; }; return find(screen.components); })();
  if (!row) throw new Error('Cabeçalho (c7c2cc80) não encontrado');
  row.ch = row.ch || [];
  row.ch.unshift({ id: starId });
}

// ---------- 4. evento e fluxo passam a apontar à estrela ---------- 
app.logic.events['atalho.saveTap'].eventSource = 'page:2:component:' + starId + ':tap';
app.logic.events['atalho.saveTap'].contextId = 'page:2:component:' + starId;
app.logic.flows['atalho.save'].contextId = 'page:2:component:' + starId;

fs.writeFileSync(PATH, JSON.stringify(app, null, 1));
console.log('OK etapa 2C. Estrela ★ no cabeçalho; botão grande removido.');
