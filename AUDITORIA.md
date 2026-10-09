# Auditoria Património 3 — 9 de outubro de 2026

## Âmbito e estrutura

A app é uma exportação estática do AppGyver sobre Next.js. Não contém o projeto original do AppGyver, componentes de desenvolvimento ou código do backend. Foram analisadas as 10 definições de páginas, 156 expressões originais, 261 fluxos, ligações de navegação, referências a recursos, formulários e seis recursos REST do Stein. As páginas `m-page.*` partilham o mesmo motor e configurações.

A ligação aos dados reais funciona. O `undefined` observado inicialmente era um problema de apresentação durante o carregamento, não uma ligação permanentemente avariada.

## Correções

| Problema confirmado | Correção |
| --- | --- |
| Totais mostravam `undefined` antes da resposta | Mensagem de carregamento; zero real continua a ser mostrado como zero. |
| Segunda parte de uma transferência convertia `12,50` de forma diferente da primeira | Conversão numérica consistente nos dois registos e na edição. |
| Transferência de nova despesa reutilizava o mesmo identificador | Identificadores distintos para os dois movimentos. |
| Confirmação de entrada podia ser cancelada após a saída já ter sido gravada | Ambas as confirmações de reposição e depósito ocorrem antes de qualquer gravação. |
| Cada metade da transferência era enviada separadamente | Um único POST contém os dois registos, mantendo os campos e movimentos originais. |
| Cancelar transferência deixava a submissão bloqueada | Reposição do estado do botão e retenção dos campos preenchidos. |
| Falhas HTTP eram ignoradas em vários fluxos | Mensagem visível e recuperação do formulário; não há navegação de sucesso em caso de falha. |
| Edição usava alertas com referências a nós inexistentes ou conteúdo inadequado | Mensagem de erro legível, sem depender dos nós incorretos. |
| Identificador calculado a partir de dados ainda não carregados ou apenas despesas ativas | Leitura atualizada da coleção completa antes de calcular o próximo ID. |
| Primeiro registo podia ficar preso num ciclo de espera | A coleção vazia recebe o identificador 1, sem ciclo de espera. |
| Submissão de viagens e depósitos não ativava o estado de operação em curso | Estado de submissão consistente e recuperação após falhas. |
| Valor inicial nulo ou texto não numérico podia ultrapassar a validação | Validação numérica; zero válido e viagem sem chegada continuam permitidos. |
| Transferência sem destino, ou para a mesma conta | Submissão indisponível enquanto a conta de destino não for válida e distinta. |
| Abertura direta da edição/reposição sem um registo selecionado | Botão desativado quando falta o identificador necessário. |
| Fevereiro e Maio tinham substituições invertidas; Abril não era traduzido | Mapeamento completo dos 12 meses nas viagens e depósitos. |
| Data contabilística opcional podia converter uma ausência em data inválida | Ausência mantida como campo vazio. |
| HTML identificava a app portuguesa como inglesa | `lang="pt-PT"` nas 22 páginas HTML. |
| Navegador podia reutilizar o runtime anterior em cache | Referências ao runtime com versão de atualização. |

O envio de arrays de registos é suportado pelo Stein: [documentação oficial](https://docs.steinhq.com/add-rows). Um pedido único reduz a possibilidade de uma transferência interrompida entre dois pedidos; não se afirma uma garantia de transação do fornecedor.

## Preservação e validação

- Preservadas as 10 páginas, a navegação, os seis recursos REST originais e os campos dos registos.
- Alterados apenas os seis fluxos de gravação auditados; os restantes 255 fluxos e os eventos originais permanecem idênticos.
- A pasta `patrimonio2` e os dados reais não foram alterados.
- 40 testes automatizados passam: referências de recursos, grafos, expressões, valores com vírgula, cancelamento, respostas de erro, IDs, coleção vazia, meses e proteção da edição sem registo.
- Verificada a abertura de páginas principais e variantes móveis no navegador, sem páginas de erro de execução.
- Testada uma transferência no motor real da app, com gravação intercetada por um servidor local: um POST, dois registos de 12,50, IDs distintos e data contabilística vazia.
- Testadas falhas HTTP simuladas nos formulários de despesas e viagens: mensagem visível, dados retidos e botão recuperado após fechar a mensagem.
- Formulário de viagens verificado a 375 px de largura, sem transbordo horizontal; registo de viagem sem chegada continua permitido.

Os testes automatizados executam os grafos com serviços simulados. As verificações do navegador complementam esses testes com o runtime AppGyver real. Não foram efetuadas gravações de teste na API real.

## Limites e questões que exigem trabalho no backend

1. **Autenticação:** a exportação não tem autenticação ativa e os pedidos de leitura observados ao Stein não exigem credenciais. A proteção do repositório privado não protege esses endpoints. Corrigir o acesso exige configurar a API/backend e uma estratégia de autenticação; introduzir apenas um login visual não resolveria o problema.
2. **Gravações simultâneas:** ler o maior ID antes de gravar evita usar dados desatualizados ou filtrados, mas duas sessões simultâneas ainda podem escolher o mesmo próximo ID. A garantia de unicidade exige atribuição de ID no backend.
3. **Reposição e estado de pagamento:** os dois movimentos são gravados juntos, mas marcar a despesa como paga continua a ser uma operação posterior. Se essa operação falhar, a app informa que os movimentos já foram gravados e não sugere repetir a transferência. Resolver integralmente exige uma operação transacional/idempotente no backend.
4. **Histórico antigo:** não foi feita migração de possíveis IDs duplicados ou movimentos inconsistentes já existentes. Alterar esses registos sem reconciliação poderia afetar dados reais.
5. **Motor compilado:** permanece um aviso legado do adaptador Redux/Next.js. Atualizar as bibliotecas do motor requer o projeto original e uma recompilação, para evitar mudanças não verificáveis em código de terceiros.
6. **Garantia de regressão:** os testes cobrem os cenários descritos, mas não permitem afirmar ausência absoluta de todos os erros ou garantir todos os comportamentos possíveis do fornecedor remoto.

## Manutenção

`tools/app-runtime.json` contém a configuração legível usada nesta versão. Após uma alteração intencional, executar `npm run build:runtime` e `npm test`, atualizar a versão de cache nas páginas e verificar os fluxos no navegador. `build:runtime` incorpora a configuração no runtime existente; não recompila Next.js nem substitui o projeto original AppGyver.

Executar localmente: `python3 -m http.server 8033 --bind 127.0.0.1` na pasta da app. Abrir `http://127.0.0.1:8033/`.
