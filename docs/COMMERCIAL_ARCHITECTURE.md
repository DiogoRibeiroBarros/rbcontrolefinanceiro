# Arquitetura comercial

O repositório `PandaRaivoso/rbcontrolefinanceiropremium` separa duas fronteiras:

- o aplicativo mantém os dados financeiros localmente, no cofre do dispositivo;
- a API comercial mantém conta, sessão, licença, dispositivos, plano, cobrança e auditoria mínima.

O backend em `server/` usa Fastify, Prisma e PostgreSQL. A licença é um documento assinado com Ed25519; clientes verificam a assinatura localmente e o servidor nunca recebe senha, PIN ou o conteúdo financeiro. O desktop usa `safeStorage` e o mobile usa `SecureStore` para credenciais e AES-GCM para o cache offline.

Planos e limites ficam centralizados em `server/src/plans.ts`. A API aplica entitlements em cada operação protegida. O cliente pode continuar offline dentro da janela de tolerância da licença, mas downgrade, expiração e limite de dispositivos são decididos pelo servidor e refletidos na próxima sincronização.

Fluxo de pagamento: o cliente solicita checkout, o provedor redireciona o assinante, e o webhook assinado atualiza o estado da assinatura. O provedor é uma interface; o mock só é permitido em desenvolvimento.
