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
