# Licenciamento e entitlements

Os planos atuais são `FREE`, `PRO` e `BUSINESS`. O catálogo e os limites estão em `server/src/plans.ts`; não duplique regras no frontend.

Uma licença contém conta, plano, instalação, expiração, entitlements e `keyId`. O servidor assina o payload com a chave privada; desktop e mobile verificam somente com a chave pública embutida na configuração de release. A chave privada não deve entrar no repositório nem no instalador.

Ativação revoga a licença anterior da instalação quando necessário, respeita o limite de dispositivos e emite nova licença. A verificação local rejeita assinatura inválida, instalação diferente, relógio claramente revertido e licença fora da tolerância offline.

Para trocar a chave, publique uma nova chave pública junto com uma versão compatível do cliente, aceite os dois `keyId` durante a transição e revogue o antigo depois da janela de atualização.
