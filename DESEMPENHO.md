# Otimização 3.0.2

Removidas cinco leituras automáticas sem consumidores na interface: listas na página principal; histórico de despesas nos formulários de nova despesa, reposição e depósito; histórico de viagens no formulário de nova viagem. Os eventos associados deixam de ser disparados na montagem e no foco. Fluxos originais permanecem disponíveis na configuração.

Os quatro processos de criação continuam a consultar identificadores atualizados imediatamente antes de gravar. Listas, totais, validações e operações de gravação permanecem intactos.

Medição pontual em 9/10/2026, apenas GET: despesas ativas 4,71 s / 294 KB / 500 registos; listas 2,19 s / 18 KB / 61 registos; viagens 2,89 s / 670 KB / 2133 registos; histórico completo de despesas 5,09 s / 5,05 MB / 8234 registos. Estas medidas são da API, não uma promessa de ganho fixo no tempo total da interface.

A gravação ainda necessita do histórico completo para calcular MAX(id)+1. Para acelerar esse passo sem reutilizar identificadores desatualizados, o próximo trabalho deverá introduzir atribuição atómica de identificadores no servidor.

Verificação: npm test inclui regressão dos movimentos, cancelamentos, erros, preservação dos fluxos existentes e ausência dos cinco carregamentos automáticos.

## Versão 3.0.3 — leitura direta autorizada

A lista principal passa a ler a exportação CSV da folha Google Sheets fornecida. O CSV conserva campos de texto mistos, aspas, vírgulas e quebras de linha; a filtragem `ativa=TRUE` e a ordenação original permanecem. Comparação pontual dos 500 movimentos, incluindo todos os campos, sem diferenças. Os totais continuam a vir do recurso Entradas existente.

A criação de despesas, reposições e depósitos consulta `MAX(T)` diretamente na mesma folha imediatamente antes de gravar. O máximo coincide com a leitura completa Stein, sem carregar o histórico. Não altera o algoritmo MAX+1 nem resolve a condição de concorrência já documentada. Gravações, confirmações e campos enviados permanecem no Stein.

Em falha de leitura direta, cada fluxo tenta o recurso Stein original. Falha nos dois caminhos mantém o tratamento de erro existente. Sem cache persistente de dados financeiros. A ligação depende das permissões atuais da folha; nenhuma permissão de partilha foi alterada.

Medições pontuais da API: maior identificador 0,82 s direto / 5,0 s Stein; CSV 1,32 s direto / 4,23 s Stein. Não representam o tempo total de gravação: o POST Stein continua a poder demorar.

Validação: 47 testes de regressão e parsing; comparação integral dos 500 registos; navegador com lista real; inserção simulada interceptada em servidor isolado, sem escrever na folha real.

## Versão 3.0.7

A leitura CSV filtra as linhas inativas antes de construir os objetos dos movimentos. Evita criar objetos para todo o histórico que seria descartado, mantendo os mesmos campos, ordem e registos ativos. Não reduz a latência do POST Stein. Comparação sintética de 8500 linhas/500 ativas confirmou resultados idênticos; testes existentes cobrem aspas e quebras de linha.

## Versão 3.0.8 — verificação de concorrência antes de gravar

Os quatro processos de criação (nova despesa, transferência, nova reposição e novo depósito) e o de nova viagem passam a reler o maior identificador imediatamente antes de calcular o próximo. Se a releitura mostrar que outra sessão gravou entretanto (máximo alterado), a operação é cancelada antes de qualquer POST, com a mensagem «Outra sessão gravou entretanto…» e os campos do formulário preservados. A releitura usa o mesmo recurso da leitura inicial (CSV direto para despesas, Stein para viagens), com recurso Stein na falha.

Isto reduz a janela de duas sessões escolherem o mesmo próximo ID, mas não a elimina: a garantia de unicidade continua a exigir atribuição de identificadores no backend. Verificação: 64 testes, incluindo cancelamento por deteção de escrita concorrente nos quatro fluxos de criação e gravação normal quando a releitura coincide.

## Versão 3.0.9 — leituras duplicadas e script bloqueante

Duas otimizações de arranque, sem alterar resultados apresentados.

**Leituras duplicadas no arranque.** Os fluxos de leitura da página 1 (despesas via CSV e totais via `entradasstein`) e da página 6 (viagens) estavam ligados a dois gatilhos — `onPageDidMount` e `onPageDidFocus` — que disparavam em conjunto na primeira abertura, fazendo cada leitura duas vezes. Como a app navega em SPA (o foco também dispara ao voltar), removidos os gatilhos `onPageDidMount` desses três fluxos, mantendo os `onPageDidFocus`, que carregam dados na primeira abertura e atualizam ao voltar. A página 1 passa de 4 para 2 pedidos de rede e a página 6 de 2 para 1, sem perda de dados. A lista de viagens da página 6 mostrava «Lista de Viagens Vazia» antes e depois: o filtro só exibe viagens sem `km_chegada` preenchido, com data entre hoje e cinco dias ou distância negativa, e os dados atuais da folha não satisfazem nenhuma condição — confirmado por teste A/B (com e sem o gatilho, resultado idêntico).

**Runtime JSONata adiado.** O `nodered.min.js` (≈858 KB gzip), que contém o interpretador JSONata, era carregado de forma síncrona e bloqueante no `<head>` de todas as páginas, embora nenhuma das 160 expressões da app use o tipo `jsonata`. Passa a carregar com `defer`, deixando de bloquear o parsing. Removê-lo de todo não foi arriscado; adiar é reversível e não altera o comportamento. O `build:runtime` mantém o `defer` em reconstruções futuras.

Medição no navegador (página 1, dados reais): pedidos de API 4 → 2; o `nodered.min.js` continua a ser pedido mas já não trava a renderização. Verificação: 64 testes, navegador com páginas 1 e 6 a carregar dados reais e badge v3.0.9.
