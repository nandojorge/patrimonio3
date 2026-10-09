# Património 3

Nova versão da exportação estática da app Património. Correções e limites documentados em [AUDITORIA.md](AUDITORIA.md).

## Abrir localmente

```sh
python3 -m http.server 8033 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8033/`.

## Verificar e manter

```sh
npm test
npm run build:runtime
```

Não é necessário instalar dependências para os testes. `tools/app-runtime.json` é a configuração legível; o comando de build incorpora-a no motor exportado. Não substitui uma recompilação do projeto original AppGyver/Next.js.

A app usa os endpoints reais do Stein. Os testes automatizados não enviam gravações para esses endpoints.
