# Entregas pequenas e verificáveis

## 1. Classificação manual e radar — implementado

- [x] Projeto React + TypeScript + MUI.
- [x] Demonstração com produtos, publicações e comentários fictícios.
- [x] Classificação, tratamento interno e filtros.
- [x] Associação publicação/produto.
- [x] Radar derivado das evidências.
- [x] Persistência local validada, testes e CI.

Aceite: classificar um comentário altera o ranking, permite consultar a evidência e permanece após recarregar a página.

## 2. Catálogo próprio e importação de demonstração

- [ ] Cadastro e edição de produtos com validação.
- [ ] Campos estruturados de cor e tamanho, opcionais e revisados manualmente.
- [ ] Importação de JSON/CSV com prévia, validação e deduplicação por ID.
- [ ] Testes de importação parcial e conflitos de IDs.

Aceite: executar o fluxo com um catálogo próprio, sem depender de uma conta da Meta.

## 3. Backend e contas de lojas

- [ ] API TypeScript e banco relacional com migrações.
- [ ] Autenticação e isolamento de dados por loja.
- [ ] Contrato de API e repositório de dados para o frontend.
- [ ] Paginação e processamento seguro de reimportações.

Aceite: duas lojas autenticadas não conseguem consultar ou alterar dados uma da outra.

## 4. Integração oficial com Instagram

- [ ] App da Meta e fluxo de autorização de conta profissional.
- [ ] Tokens guardados no backend e desconexão com revogação/limpeza.
- [ ] Importação paginada de publicações e comentários permitidos.
- [ ] Sincronização incremental e deduplicação.
- [ ] Tratamento de token expirado, acesso revogado e limites da API.
- [ ] Webhooks com verificação de autenticidade e processamento idempotente.

Aceite: importar de uma conta de teste autorizada, repetir a sincronização sem duplicação e manter a classificação manual.

## 5. Sugestões e simulação

- [ ] Sugestões de intenção com revisão humana e origem identificada.
- [ ] Registro de correções e testes com exemplos ambíguos.
- [ ] Simulador de reposição por produto, cor e tamanho, usando somente dados estruturados suficientes.
- [ ] Separar claramente interesse observado, demanda estimada e venda efetiva.

Aceite: toda sugestão pode ser corrigida e todo resultado tem evidências consultáveis. Nenhuma precisão de IA será divulgada sem avaliação própria.
