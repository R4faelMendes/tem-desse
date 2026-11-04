# API local — primeira fatia

Status: backend em desenvolvimento, conectado à interface pelo modo **API local**. Nenhum endpoint acessa o Instagram.

## Iniciar

Na raiz do projeto, com Node.js 22.17 ou superior:

```bash
npm ci
npm run api:seed
npm run api:dev
```

O seed é opcional. Sem ele, o banco é criado vazio. O seed só insere os exemplos quando todas as tabelas estão vazias; não há opção de sobrescrita. Uma segunda execução retorna código de saída 1 e preserva os dados.

- Endereço: `http://127.0.0.1:3001`.
- Banco padrão: `.data/tem-desse.sqlite`, ignorado pelo Git.
- Configuração opcional: `.env`, usando `.env.example` como referência.
- `API_PORT`: inteiro de 1 a 65535; padrão 3001.
- `API_DATABASE_PATH`: caminho do SQLite, relativo à raiz de onde o comando foi executado ou absoluto.
- `npm run api:start`: sem recarga automática.
- `npm run test:api`: testes isolados, sem tocar no banco padrão.

Execute os scripts na raiz. O servidor é local, de uma única loja e sem autenticação. Não há publicação nem configuração de acesso pela rede nesta etapa. O SQLite nativo do Node 22 pode emitir `ExperimentalWarning`; o ambiente validado é Node 22.17.

## Usar com a interface

Com a API aberta, execute `npm run dev` em outro terminal e escolha **API local** no seletor **Origem dos dados**. O proxy de desenvolvimento do Vite encaminha `/api` para o backend; não é necessário habilitar CORS.

O cliente lê produtos, publicações e todas as páginas de comentários em blocos de até 100, validando as respostas com Zod antes de exibi-las. A classificação e as associações são atualizadas na tela após a confirmação do PATCH. Os totais continuam derivados das mesmas funções de domínio compartilhadas com o backend.

Falhas de leitura não carregam dados fictícios automaticamente. Falhas de escrita mantêm a edição e não exibem sucesso. **Atualizar dados** permite repetir a leitura; o carregamento tem limite de 15 segundos. A demonstração do navegador é preservada e não é enviada ao banco.

Esta primeira integração carrega todo o conjunto em memória e não oferece um snapshot transacional entre as páginas. Se detectar contagens incompatíveis, pede nova leitura. Otimização para grande volume e sincronização entre clientes ficam para depois. O modo API em hospedagem ainda exige configuração de proxy; `npm run preview` é somente estático.

## Endpoints

### GET /health

Verifica leitura e estrutura dos dados persistidos. Resposta 200:

```json
{ "status": "ok", "service": "tem-desse-api" }
```

### GET /api/v1/products

Retorna `{ "data": [...] }` com os produtos do banco. Não há cadastro ou exclusão nesta entrega.

### GET /api/v1/posts

Retorna `{ "data": [...] }` com publicações e `productId`, que pode ser `null` quando não há associação.

### GET /api/v1/comments

Parâmetros opcionais e combináveis:

- `query`: texto ou autor, até 200 caracteres; busca ignora maiúsculas e acentos.
- `intent`: `all` (padrão), `unclassified`, `restock`, `variation`, `shipping`, `price` ou `other`.
- `productId`: ID do produto ou `all` (padrão). Produto inexistente retorna 404.
- `onlyOpen`: somente `true` ou `false`; padrão `false`.
- `page`: inteiro positivo, até 100000; padrão 1.
- `pageSize`: inteiro de 1 a 100; padrão 20.

Campos desconhecidos, parâmetros repetidos ou valores fora do contrato retornam 400. Resultados seguem a ordem de inserção. Uma página além do total retorna lista vazia; filtros sem resultados produzem `totalPages: 0`.

```bash
curl 'http://127.0.0.1:3001/api/v1/comments?productId=linen&intent=restock&pageSize=1'
```

Formato da resposta:

```json
{
  "data": [
    {
      "id": "c1",
      "postId": "post-1",
      "author": "marina.exemplo",
      "text": "Essa camisa vai voltar no tamanho G? Estou esperando!",
      "intent": "restock",
      "resolved": false
    }
  ],
  "pagination": { "page": 1, "pageSize": 1, "total": 3, "totalPages": 3 }
}
```

### PATCH /api/v1/comments/:id

Atualiza somente `intent` e/ou `resolved`. Pelo menos um campo deve estar presente. Campos omitidos permanecem intactos; `null`, campos extras e strings no lugar de booleanos retornam 400.

```bash
curl -X PATCH 'http://127.0.0.1:3001/api/v1/comments/c7' \
  -H 'Content-Type: application/json' \
  -d '{"intent":"restock","resolved":true}'
```

Resposta 200: `{ "data": { ...comentário atualizado... } }`. ID inexistente retorna 404. Marcar tratado é um controle interno e não envia mensagens.

### PATCH /api/v1/posts/:id/product

Associa uma publicação a um produto existente:

```json
{ "productId": "bag" }
```

Para desassociar:

```json
{ "productId": null }
```

Resposta 200: `{ "data": { ...publicação atualizada... } }`. Publicação ou produto inexistente retorna 404 e preserva a associação anterior.

### GET /api/v1/radar

Retorna `{ "data": { "summary": {...}, "demand": [...] } }`.

- `summary`: `totalComments`, `totalPosts`, `signals`, `unclassified` e `open`.
- `demand`: produto, contagens `restock`/`variation` e `evidence`, contendo os comentários que compõem o sinal.
- Ordenação: total de evidências decrescente, depois nome do produto.
- Produtos sem sinais continuam presentes com contagem zero.

Nos exemplos iniciais: 12 comentários, 4 posts, 6 sinais, 3 não classificados e 10 não tratados. Classificar `c7` como reposição aumenta os sinais para 7. Marcar tratado não remove o sinal histórico. Desassociar um post retira seus sinais do ranking, preservando seus comentários.

## Erros

```json
{
  "error": {
    "code": "COMMENT_NOT_FOUND",
    "message": "Comentário não encontrado.",
    "requestId": "req-1"
  }
}
```

- 400 `VALIDATION_ERROR`: parâmetros/corpo inválidos; inclui `details` com caminho e mensagem.
- 400/413/415 `INVALID_REQUEST`: JSON inválido, corpo maior que 16 KiB ou formato de mídia não suportado.
- 404 `COMMENT_NOT_FOUND`, `POST_NOT_FOUND`, `PRODUCT_NOT_FOUND` ou `ROUTE_NOT_FOUND`.
- 500 `INTERNAL_ERROR`: resposta genérica, sem SQL ou stack trace.

## O que fica para depois

Autenticação, múltiplas lojas, cadastro de produtos, importação, Instagram, sugestões automáticas e simulador. As leituras ainda carregam o conjunto em memória e depois filtram/paginam; consultas SQL paginadas e agregações para volume maior são trabalho futuro. Atualizações no mesmo campo seguem a última gravação; ainda não há controle de versões concorrentes.
