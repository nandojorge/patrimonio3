/**
 * Etapa 2D — mover a estrela ★ para o extremo oposto do cabeçalho:
 *  sai do bloco da seta de recuar (c7c2cc80) e passa a último filho da linha do
 *  cabeçalho (2efeb42b), ficando à direita do texto "Nova Despesa".
 * Uso: node tools/build-atalhos5.cjs && npm test
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
const SUBMIT = 'bca11f6d-2255-4d55-9eac-4da768e41314';
const starId = newUuid(SUBMIT, 'at2c:star');
const HEADER_ROW = 'c7c2cc80-7bbc-44a2-abbc-004c67e51637'; // bloco da seta
const HEADER_LINE = '2efeb42b-9eba-45ae-9d6b-29bec3aa0e4d'; // linha: [seta] [textos]

const screen = app.screens['page.Page2'];
const findNode = (ns, id) => {
  for (const n of ns) {
    if (n.id === id) return n;
    if (n.ch) { const r = findNode(n.ch, id); if (r) return r; }
  }
  return null;
};

// remover do bloco da seta
const arrowBlock = findNode(screen.components, HEADER_ROW);
if (!arrowBlock) throw new Error('Bloco da seta (c7c2cc80) não encontrado');
const i = (arrowBlock.ch||[]).findIndex(n => n.id === starId);
if (i < 0) throw new Error('Estrela não está no bloco da seta');
arrowBlock.ch.splice(i, 1);

// adicionar como último filho da linha do cabeçalho
const line = findNode(screen.components, HEADER_LINE);
if (!line) throw new Error('Linha do cabeçalho (2efeb42b) não encontrada');
line.ch = line.ch || [];
if (!line.ch.some(n => n.id === starId)) line.ch.push({ id: starId });

// encostar à direita e centrar na linha
const star = app.components[starId];
star.props.styles.view = { ...(star.props.styles.view||{}), paddingLeft: 8, paddingRight: 4, alignSelf: 'center' };

fs.writeFileSync(PATH, JSON.stringify(app, null, 1));
console.log('OK etapa 2D. Estrela ★ movida para o extremo oposto do cabeçalho.');
