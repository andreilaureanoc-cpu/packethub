# Projeto 1.2 — Back-end e Aplicação Full-stack

## 1. Back-end com Express.js — 20 pts

A aplicação usa Express em `src/server/app.ts` e `src/server/routes/apiRoutes.ts`.
Rotas REST encaminham as requisições para controllers; controllers usam models
para acessar o SQLite e validam entradas antes das operações. Middlewares cuidam
da autenticação JWT. Erros são convertidos em respostas JSON consistentes pelo
tratamento centralizado em `src/server/controllers/httpController.ts`.

## 2. Integração front-end / back-end — 20 pts

Os módulos em `src/client/models/` executam `fetch` e enviam o JWT no cabeçalho
`Authorization`. Os controllers coordenam os dados e as views. Respostas HTTP
de erro são transformadas em mensagens do usuário por
`src/client/models/apiClient.ts`, que também remove a sessão expirada e redireciona
para o login. A interface apresenta feedback centralizado de rede e validação.

## 3. Banco de dados e persistência — 20 pts

O schema relaciona usuários, nós, pacotes, camadas, capturas e registros de visita.
O banco é SQLite, configurado em `src/server/infrastructure/database.ts`.
Migrations versionadas em `src/server/migrations/` criam e evoluem o schema.
Models implementam criação, consulta, atualização e exclusão parametrizadas.
Erros de persistência são capturados pelo middleware central e retornados sem
expor detalhes internos.

## 4. Autenticação e controle de acesso — 20 pts

Cadastro e login estão em `src/server/controllers/authController.ts`.
As senhas são derivadas com scrypt em `src/server/infrastructure/authentication.ts`
e armazenadas como hash com salt. O servidor assina tokens JWT com duração de uma
hora usando `JWT_SECRET`. O middleware `authenticationMiddleware.ts` valida o
token nas rotas protegidas, e o endpoint de logout revoga a sessão no servidor.

## 5. Integração com sistema ou configuração — 20 pts

Porta, caminho do banco, segredo JWT, captura, interfaces e proxy são configurados
por variáveis de ambiente. `.env.example` documenta os valores; `.env` fica fora
do controle de versão. `TCPDUMP_PATH`, `TCPDUMP_ENABLED` e
`TCPDUMP_INTERFACES` limitam a integração ao utilitário e às interfaces autorizadas.

## Demonstração sugerida

1. Mostrar estrutura MVC e uma rota completa da API.
2. Cadastrar/login, abrir uma rota protegida e demonstrar logout.
3. Consultar o SQLite e explicar as migrations e relacionamentos.
4. Criar, editar e excluir um nó ou pacote pela interface.
5. Mostrar o arquivo `.env.example`, o segredo configurado localmente e a captura
   habilitada somente em interface autorizada.
