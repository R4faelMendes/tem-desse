# Plano de integração com Instagram

**Ainda não implementado.** Não insira senhas ou tokens na aplicação atual. A demonstração usa exclusivamente dados fictícios.

## Escopo inicial

Ler publicações e comentários de contas profissionais que autorizaram o aplicativo. A primeira integração não enviará respostas, mensagens privadas, publicações ou ações de moderação.

Usar APIs oficiais. Não depender de scraping, automação de login, acesso a perfis privados ou extração de dados de contas arbitrárias.

## Referência e validação prévia

A [coleção oficial da Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api) descreve as capacidades de leitura e gerenciamento de mídia e comentários para contas profissionais. Existem fluxos de autenticação distintos; o vínculo com uma Página e as permissões variam conforme o fluxo escolhido.

Antes de implementar, confirmar na documentação vigente:

- Fluxo de Instagram Login ou Facebook Login adequado ao caso.
- Permissões mínimas para leitura de publicações e comentários.
- Contas de teste, níveis de acesso, App Review e requisitos para atender terceiros.
- Paginação, cotas, retenção de dados e eventos de webhook disponíveis.
- Requisitos de política de privacidade, desconexão e exclusão de dados.

## Desenho proposto

1. O backend inicia a autorização com proteção de estado e trata o callback.
2. O backend troca as credenciais e armazena tokens com proteção adequada; o navegador não recebe segredos.
3. Uma rotina importa mídia e comentários de forma paginada e retomável.
4. IDs externos são únicos por conta e preservam a classificação interna em novas sincronizações.
5. O frontend consulta a API própria e permite associação e revisão manual.
6. A desconexão interrompe sincronizações e aplica a política de exclusão.

Webhooks devem ter autenticidade validada, confirmação rápida e processamento idempotente. Um evento repetido não deve criar dois comentários. Exclusões e mudanças de acesso devem ser refletidas nos dados e resultados.

## Critérios de aceite

- Conta profissional de teste conectada por autorização oficial.
- Importação sem duplicação, incluindo múltiplas páginas.
- Classificações conservadas após nova sincronização.
- Falhas de token e limites apresentadas com recuperação clara.
- Conta desconectada não continua sendo sincronizada.
- Tokens ausentes do bundle, logs, repositório e armazenamento local.
