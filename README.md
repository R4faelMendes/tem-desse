# Tem desse?

**Comentários viram pistas. Pistas ajudam a decidir o que oferecer.**

Radar de demanda para pequenos negócios que vendem pelo Instagram. A proposta é reunir pedidos de reposição, interesse em cores/tamanhos e dúvidas espalhadas nas publicações, preservando os comentários que sustentam cada resultado.

> **Status: primeira entrega funcional, com dados fictícios.** A versão atual não conecta contas, não importa dados reais, não publica respostas e não usa IA. Você pode explorar o fluxo completo de classificação manual sem credenciais.

## O problema

Uma loja recebe “vai voltar no G?”, “tem em preto?” e “entrega em Recife?” em publicações diferentes. Essas mensagens acabam perdidas na rotina. O Tem desse? permite associar cada publicação a um produto, classificar o comentário e consultar os sinais de interesse por produto.

O diferencial é a rastreabilidade: ao explorar um produto, a pessoa encontra os comentários originais da análise e pode corrigir a classificação.

## O que já funciona

- Interface responsiva em React, TypeScript e Material UI, em português.
- Visão geral com contagens calculadas a partir dos dados.
- Ranking de produtos por comentários de reposição e variação.
- Caixa de comentários com busca por texto/autor, filtros por intenção, produto e tratamento.
- Classificação manual e marcação interna de comentário tratado.
- Associação e desassociação de publicações a produtos, com atualização do radar.
- Persistência local versionada e validada com Zod.
- Aviso quando o armazenamento está bloqueado, inválido ou sem espaço.
- Restauração da demonstração mediante confirmação.
- Testes de regras de negócio, armazenamento e fluxo da interface.
- GitHub Actions para formatação, testes e build.

### Como os números são calculados

**Sinais de interesse = comentários classificados como reposição ou cor/tamanho em posts associados a um produto.** Cada comentário conta uma vez. Marcar como tratado não remove seu interesse histórico. Preço, entrega, outro e não classificado ficam fora desse ranking. Publicações sem produto mantêm os comentários na caixa de entrada.

Esses números não representam vendas, pessoas únicas ou previsão de compra. O ranking abre todos os comentários do produto, com filtros disponíveis para investigar cada intenção.

## Executar localmente

Requisitos: **Node.js 22.12 ou superior**, npm e Git.

```bash
git clone https://github.com/R4faelMendes/tem-desse.git
cd tem-desse
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`. Nenhuma variável de ambiente é necessária nesta etapa. A fonte Inter e os ícones são distribuídos junto com a aplicação.

```bash
npm test               # testes automatizados
npm run typecheck      # TypeScript estrito
npm run build          # verificação de tipos e bundle em dist/
npm run preview        # servir o build localmente
npm run format:check   # conferir formatação
npm run format         # aplicar formatação
```

## Experimente em dois minutos

1. Abra **Visão geral** e observe os sinais por produto.
2. Clique em **Classificar comentários**.
3. Classifique o pedido de reposição de `joao.exemplo` como **Reposição** e salve.
4. Volte à visão geral: **Bolsa Alma** passa a ter um sinal de interesse.
5. Clique no produto para encontrar os comentários que justificam o resultado.
6. Recarregue a página: a classificação permanece neste navegador.
7. Em **Produtos e posts**, altere a associação de uma publicação e observe a atualização.

**Restaurar demo** retorna ao conjunto inicial, após confirmação. Os dados são armazenados por origem do navegador; trocar a porta ou o navegador cria um espaço independente. Não há sincronização entre abas nesta versão.

## Organização

```text
src/
  components/CommentEditor.tsx  # formulário de classificação
  data/demo.ts                 # conjunto fictício e reproduzível
  data/storage.ts              # leitura/escrita local e recuperação
  domain/model.ts              # tipos, validação, filtros e agregações
  test/setup.ts                # infraestrutura dos testes
  App.tsx                      # navegação e telas da primeira entrega
  theme.ts                     # tema e localização do Material UI
  styles.css                   # layout responsivo
docs/
  architecture.md              # decisões técnicas e regras
  roadmap.md                   # próximas entregas e critérios de aceite
  instagram-integration.md     # proposta de integração oficial
```

## Limites e próximos passos

O catálogo e os comentários são exemplos fixos. Ainda não há cadastro de produtos, backend, login, importação, análise automática, envio de mensagens nem simulador de reposição. A integração oficial com Instagram será direcionada a contas profissionais autorizadas e dependerá das permissões e do processo de acesso da Meta.

Consulte o [roadmap](docs/roadmap.md), as [decisões de arquitetura](docs/architecture.md) e o [plano de integração](docs/instagram-integration.md).

## Referências

- [Material UI](https://mui.com/material-ui/)
- [Vite](https://vite.dev/guide/)
- [Coleção oficial da Meta para Instagram](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)

Projeto independente de portfólio, sem afiliação com Instagram ou Meta.
