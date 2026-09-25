# Implantação

## API

1. Copie `server/.env.example` para o ambiente de execução e preencha PostgreSQL, SMTP, URLs públicas, chave Ed25519 e provedor de pagamento.
2. Execute `npm ci --prefix server` e `npm run db:deploy --prefix server`.
3. Rode `npm run typecheck --prefix server` e `npm test --prefix server`.
4. Publique atrás de HTTPS com limites de requisição, health check e backup do PostgreSQL.

## Cliente

Preencha `app/commercial-config.json` e `mobile-rebuild/.env` com a API HTTPS, portal e chave pública. Gere o instalador assinado e o APK assinado em pipeline; não coloque segredos no cliente. Para a publicação Android, o repositório esperado é `PandaRaivoso/rbcontrolefinanceiropremium`.

O modo mock não deve ser habilitado em produção. Releases são manuais e não são publicados automaticamente por este repositório.
