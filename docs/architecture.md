# Arquitetura em desenvolvimento

## Objetivo e recorte

Validar um fluxo completo e pequeno: publicação associada a produto → comentário classificado manualmente → sinal agregado → consulta das evidências. A integração externa será implementada depois que esse fluxo estiver estável.

## Stack

- React + TypeScript com modo estrito.
- Vite para desenvolvimento e build estático.
- Material UI + Emotion, tema próprio e localização pt-BR.
- Zod para validar o snapshot persistido.
- Vitest, Testing Library e jsdom para testes.
- Prettier para formatação e GitHub Actions para validação.
- Fastify para a API REST e SQLite nativo do Node para persistência do backend.

## Modelo de domínio

Um `Workspace` possui versão, produtos, publicações e comentários. Uma publicação tem zero ou um produto. Cada comentário pertence a uma publicação e possui intenção e estado de tratamento.

As intenções são `unclassified`, `restock`, `variation`, `shipping`, `price` e `other`. O estado `resolved` registra tratamento interno, sem representar uma resposta enviada ao Instagram.

IDs duplicados, referências inexistentes, versões desconhecidas e intenções inválidas são rejeitados na leitura do snapshot.

## Decisões

### Agregações derivadas

O ranking não é persistido. Ele é recalculado a partir das associações e classificações atuais. Isso evita divergência entre contagens e evidências e permite desfazer uma classificação sem manter um contador paralelo.

Reposição e variação entram no ranking; outros tipos não. Comentários tratados continuam no histórico de interesse. Desassociar uma publicação remove seus sinais do ranking, mas conserva os comentários.

### Persistência local

A chave é `tem-desse:workspace:v1`. Não há escrita automática na montagem do React: um snapshot inválido não é sobrescrito só porque a aplicação foi aberta. Uma ação explícita do usuário salva o estado atual e pode substituir esse snapshot. A restauração é destrutiva para o estado local e exige confirmação.

Falhas de armazenamento mantêm a aplicação utilizável em memória e exibem um aviso. O armazenamento local serve à demonstração, não é banco de dados nem local adequado para tokens da Meta. Abas simultâneas não são sincronizadas; a última gravação prevalece.

### API local conectada à interface

A interface escolhe explicitamente entre demonstração e API local. `useWorkspace` controla carregamento, gravações e troca de origem; `api.ts` implementa o cliente HTTP e valida os contratos. A demonstração continua em localStorage, isolada do banco e sem sincronização implícita. A preferência de origem usa uma chave independente.

No modo API, produtos/posts e páginas de comentários são carregados antes da exibição. PATCHs atualizam a memória somente após a confirmação do servidor. Controles de escrita ficam desabilitados durante gravações; falhas preservam o editor e seus campos. Leituras são canceladas ao trocar de origem ou desmontar a interface, com descarte de respostas atrasadas e limite de 15 segundos. O Vite faz proxy de `/api` para o backend local; o build de produção ainda exige essa configuração na hospedagem.

`buildApp` monta o Fastify sem abrir uma porta, o que permite testes com injeção HTTP. `index.ts` carrega a configuração, inicia o servidor e fecha as conexões em SIGINT/SIGTERM. A API ouve apenas em `127.0.0.1` nesta etapa, sem autenticação ou CORS habilitado.

### SQLite e migração inicial

Três tabelas relacionais (`products`, `posts`, `comments`), índices de associação, constraints de intenção/estado e chaves estrangeiras. Queries de escrita usam parâmetros vinculados. A versão do schema fica em `PRAGMA user_version`; criação e seed usam transações. Uma versão de schema desconhecida interrompe a inicialização, sem tentar alterar ou apagar o banco.

Não há seed automático. O comando explícito recusa um banco com quaisquer registros e não sobrescreve classificações. Atualizações parciais preservam campos omitidos e aceitam `false` como valor válido. Desassociação de post é representada por `productId: null`.

O módulo `node:sqlite` é nativo e evita dependências de compilação no Windows; no Node 22.17 ele ainda é experimental. Este backend é um protótipo local de uma única loja. Operações são síncronas e o radar/filtro lê o conjunto em memória antes de paginar. Migrar consultas e agregações para SQL e definir concorrência será necessário ao trabalhar com volumes maiores.

### Contrato HTTP

Rotas versionadas em `/api/v1`, validação de entrada com Zod, campos desconhecidos rejeitados e erros padronizados. Comentários têm paginação limitada a 100 itens por página. JSON malformado, corpos acima de 16 KiB e recursos inexistentes recebem respostas controladas. Schemas inválidos vindos do banco são tratados como erro interno, não como erro do cliente.

Consulte [API local](api.md). Não existe endpoint para restaurar ou apagar o banco, importar comentários ou publicar no Instagram.

### Interface

Três telas: visão geral, comentários e produtos/posts. Links de ranking levam aos comentários do produto. Filtros são combináveis. O editor permite salvar ou cancelar. Controles usam componentes MUI com rótulos; ações de navegação e cards usam botões ou links acessíveis por teclado.

## Validação

Testes cobrem contagens e evidências, reclassificação e imutabilidade, transferência de sinais entre produtos, posts sem associação, filtros combinados, recuperação de persistência, dados inválidos, armazenamento indisponível e o fluxo de classificação/reabertura da interface. A suíte do backend verifica o contrato HTTP, validação, paginação, atualização parcial, migração, seed não destrutivo e persistência após fechar e reabrir o banco. Cada teste usa um arquivo SQLite isolado e o remove ao encerrar.

## Evolução prevista

Separar as telas de `App.tsx` quando o próximo fluxo for introduzido. Adicionar autenticação e isolamento por loja antes da integração com contas reais. Cadastro/importação, processamento assíncrono, controle de concorrência e implantação ficam para entregas posteriores.
