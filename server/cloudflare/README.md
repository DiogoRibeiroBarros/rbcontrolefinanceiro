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

A chave privada deve ficar somente como secret do Worker; nunca deve ser commitada. O secret `LICENSE_PRIVATE_KEY` já foi enviado ao Worker. Para substituir a chave no futuro, use `npx wrangler secret put LICENSE_PRIVATE_KEY`.

O desktop deve receber no `app/commercial-config.json` a URL HTTPS publicada e a chave pública correspondente:

```json
{"enabled":true,"apiUrl":"https://rb-gestao-subscriptions.rbgestao.workers.dev","publicKey":"(chave pública já configurada em app/commercial-config.json)","portalUrl":"https://rb-gestao-subscriptions.rbgestao.workers.dev","channel":"stable","releaseAudience":"public"}
```

O D1 guarda contas, instalações, licenças e revogações. O KV fica reservado para rate limit, sessões curtas e cache de planos; nenhuma chave privada ou senha é armazenada no KV.
