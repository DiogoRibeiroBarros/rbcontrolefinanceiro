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

Preencha `database_id` e o `id` do namespace KV em `wrangler.toml`. A chave privada deve ficar somente como secret do Worker; nunca deve ser commitada.

O desktop deve receber no `app/commercial-config.json` a URL HTTPS publicada e a chave pública correspondente:

```json
{"enabled":true,"apiUrl":"https://subscriptions.seu-dominio.workers.dev","publicKey":"-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----","portalUrl":"https://...","channel":"stable","releaseAudience":"public"}
```

O D1 guarda contas, instalações, licenças e revogações. O KV fica reservado para rate limit, sessões curtas e cache de planos; nenhuma chave privada ou senha é armazenada no KV.
