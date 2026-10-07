# API de subscriptions — Cloudflare Workers + D1/KV

## Configuração

```bash
npm install -D wrangler
npx wrangler login
npx wrangler d1 create rb-gestao-subscriptions
npx wrangler kv namespace create KV
npx wrangler d1 execute rb-gestao-subscriptions --remote --file=server/cloudflare/schema.sql
npx wrangler secret put LICENSE_PRIVATE_KEY
npx wrangler deploy server/cloudflare/src/index.js --config server/cloudflare/wrangler.toml
```

Os recursos já configurados para esta instalação são:

- Worker: `https://rb-gestao-subscriptions.rbgestao.workers.dev`
- D1: `rb-gestao-subscriptions` (`de119220-9c6a-419f-88bb-e6fd0128d096`)
- KV: `KV` (`d4615088952543bfab90767cefaed8f9`)

A chave privada Ed25519 deve ficar somente como secret do Worker; nunca deve ser commitada. O desktop e o mobile usam a chave pública correspondente para validar a mesma licença. Para substituir a chave no futuro, use `npx wrangler secret put LICENSE_PRIVATE_KEY` e atualize também `app/commercial-config.json` e o secret `RB_LICENSE_PUBLIC_KEY` do GitHub.

O desktop deve receber no `app/commercial-config.json` a URL HTTPS publicada e a chave pública correspondente:

```json
{"enabled":true,"apiUrl":"https://rb-gestao-subscriptions.rbgestao.workers.dev","publicKey":"(chave pública já configurada em app/commercial-config.json)","portalUrl":"https://rb-gestao-subscriptions.rbgestao.workers.dev","channel":"stable","releaseAudience":"public"}
```

O D1 guarda contas, instalações, licenças e revogações. O KV fica reservado para rate limit, sessões curtas e cache de planos; nenhuma chave privada ou senha é armazenada no KV.

## Painel administrativo online

O painel está publicado no mesmo Worker, em:

`https://rb-gestao-subscriptions.rbgestao.workers.dev/admin/`

Ele usa a API do próprio Worker e permite consultar métricas, cadastrar clientes, alterar planos, bloquear/desbloquear contas e revogar dispositivos. A autenticação administrativa usa `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` e `ADMIN_SESSION_SECRET`; os dois últimos são secrets do Worker e não devem ser commitados. Para trocar a senha, gere um novo hash PBKDF2 com 100.000 iterações usando o e-mail administrativo como salt e execute `wrangler secret put ADMIN_PASSWORD_HASH`.

Para validar o painel publicado sem expor credenciais no código, execute `ADMIN_TEST_EMAIL=... ADMIN_TEST_PASSWORD=... node admin-smoke.mjs` dentro desta pasta. O smoke test cobre login, métricas, listagem, edição, bloqueio e desbloqueio e restaura o status do cliente usado.
