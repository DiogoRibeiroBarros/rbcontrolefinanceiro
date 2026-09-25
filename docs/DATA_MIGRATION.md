# Migração e rollback

O primeiro carregamento preserva o formato financeiro existente. O backup exportado inclui `schemaVersion` e `appVersion`. A migração para o cofre local grava uma cópia temporária, valida o envelope e só então substitui o destino; falhas mantêm a origem intacta.

O banco comercial usa migrações Prisma versionadas. Faça backup antes de `npm run db:deploy`. Rollback de cliente deve preservar leitura do schema anterior; rollback de API deve manter a mesma chave pública e aceitar eventos de pagamento já recebidos. Nunca apague dados financeiros como parte de cancelamento de assinatura.
