# Contrato inicial da API de sincronização

Base: `/v1` · Autenticação: `Authorization: Bearer <token>` · Dados em JSON.

## Autenticação

- `POST /auth/login` — recebe e-mail e senha, devolve token e perfil ativo.
- `POST /auth/refresh` — renova o token.

## Dados financeiros

- `GET /profiles` e `PATCH /profiles/:id`
- `GET /dashboard?period=YYYY-MM`
- `GET|POST|PATCH|DELETE /transactions`
- `GET|POST|PATCH|DELETE /salaries`
- `GET|POST|PATCH|DELETE /cards`
- `GET|POST|PATCH|DELETE /loans`
- `GET|POST|PATCH|DELETE /subscriptions`
- `GET|POST|PATCH|DELETE /home-expenses`
- `GET|POST|PATCH|DELETE /categories`

## Sincronização

- `POST /sync/push` — envia lançamentos pendentes criados no celular.
- `GET /sync/pull?since=<ISO-8601>` — busca alterações feitas no desktop ou em outro celular.

Cada registro deve conter `id`, `profileId`, `createdAt`, `updatedAt`, `deletedAt` opcional e `revision`. Em conflito, a API responde `409` com as duas versões do registro; o aplicativo deverá solicitar uma decisão do usuário antes de substituir qualquer dado.
