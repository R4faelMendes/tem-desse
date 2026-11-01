# Arquitetura da primeira entrega

## Objetivo e recorte

Validar um fluxo completo e pequeno: publicação associada a produto → comentário classificado manualmente → sinal agregado → consulta das evidências. A integração externa será implementada depois que esse fluxo estiver estável.

## Stack

- React + TypeScript com modo estrito.
- Vite para desenvolvimento e build estático.
- Material UI + Emotion, tema próprio e localização pt-BR.
- Zod para validar o snapshot persistido.
- Vitest, Testing Library e jsdom para testes.
- Prettier para formatação e GitHub Actions para validação.

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

### Sem backend nesta etapa

Reduz o custo de executar e avaliar o projeto. Funções de domínio são puras, separadas dos componentes e testáveis sem rede. Uma futura camada de repositório substituirá o armazenamento local. A interface poderá continuar usando os mesmos tipos de domínio.

### Interface

Três telas: visão geral, comentários e produtos/posts. Links de ranking levam aos comentários do produto. Filtros são combináveis. O editor permite salvar ou cancelar. Controles usam componentes MUI com rótulos; ações de navegação e cards usam botões ou links acessíveis por teclado.

## Validação

Testes cobrem contagens e evidências, reclassificação e imutabilidade, transferência de sinais entre produtos, posts sem associação, filtros combinados, recuperação de persistência, dados inválidos, armazenamento indisponível e o fluxo de classificação/reabertura da interface.

## Evolução prevista

Separar as telas de `App.tsx` quando o próximo fluxo for introduzido. Adicionar backend TypeScript com autenticação, isolamento por loja e persistência em banco antes da integração com contas reais. Paginação e agregações no servidor serão necessárias para conjuntos maiores.
