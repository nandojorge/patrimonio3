# Otimização 3.0.2

Removidas cinco leituras automáticas sem consumidores na interface: listas na página principal; histórico de despesas nos formulários de nova despesa, reposição e depósito; histórico de viagens no formulário de nova viagem. Os eventos associados deixam de ser disparados na montagem e no foco. Fluxos originais permanecem disponíveis na configuração.

Os quatro processos de criação continuam a consultar identificadores atualizados imediatamente antes de gravar. Listas, totais, validações e operações de gravação permanecem intactos.

Medição pontual em 9/10/2026, apenas GET: despesas ativas 4,71 s / 294 KB / 500 registos; listas 2,19 s / 18 KB / 61 registos; viagens 2,89 s / 670 KB / 2133 registos; histórico completo de despesas 5,09 s / 5,05 MB / 8234 registos. Estas medidas são da API, não uma promessa de ganho fixo no tempo total da interface.

A gravação ainda necessita do histórico completo para calcular MAX(id)+1. Para acelerar esse passo sem reutilizar identificadores desatualizados, o próximo trabalho deverá introduzir atribuição atómica de identificadores no servidor.

Verificação: npm test inclui regressão dos movimentos, cancelamentos, erros, preservação dos fluxos existentes e ausência dos cinco carregamentos automáticos.
