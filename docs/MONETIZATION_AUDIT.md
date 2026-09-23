# Auditoria anterior à implementação comercial

Data: 23/09/2026. Base: 2.4.22. Escopo: arquivos versionados do desktop, serviços, dois clientes móveis, instaladores, testes e workflows. Os materiais de divulgação não participam desta alteração.

## Arquitetura e funcionalidades

Electron/JavaScript com renderer em `app/app.js`, preload e main CJS. Os serviços de atualização, pareamento e fila de sincronização já estão separados. NSIS e electron-updater usam GitHub Releases. O servidor HTTP escuta no loopback e Tailscale oferece transporte. `mobile-rebuild` (Expo 57) é o cliente publicado pelo workflow; `mobile` é o cliente anterior, mantido para compatibilidade. Há módulos de transações, contas, caixinhas, investimentos, cartões/faturas, salário, empréstimos, assinaturas, gastos da casa, categorias, instituições, relatórios/PDF, usuários/permissões, auditoria e backup. Não há backend comercial.

## Persistência

A base financeira reside no localStorage `rb_gestao_financeira_profiles_v1`, com `sharedData` compartilhada entre perfis. Há chave legada v120 e backups JSON v1. Preferências usam localStorage, contexto de navegação usa sessionStorage. O main grava configuração, snapshots/backup e credenciais de pareamento em userData. O cliente reconstruído mantém token de dispositivo no SecureStore, mas snapshot financeiro no AsyncStorage em claro. O cliente anterior também persiste configuração/token no AsyncStorage.

## Riscos encontrados

- Token global aceito em `?key=`, cookie e bearer; script Tailscale grava token na Área de Trabalho e o copia em URL.
- PIN usa SHA-256 com ID do perfil e fallback legado rápido, sem KDF/salt aleatório.
- Cache offline Android não cifrado; erros de cache são convertidos silenciosamente em ausência de dados.
- Falha ao ler JSON financeiro inicia e salva base vazia: risco de sobrescrever dados corrompidos recuperáveis.
- IPC de backup não verifica sender em todos os handlers; IPC de sync/updater já possui controle.
- Direitos comerciais não existem. Restrição apenas no renderer seria contornável. Qualquer distribuição local modificável possui limite de proteção: assinatura impede falsificar licença, não impede um administrador de recompilar um cliente sem controles.
- README antigo contradiz o modelo compartilhado atual. Repositório tratado como público conforme especificação, sem alteração de visibilidade.
- Rateio sem percentuais apresenta falha independente, registrada na análise anterior; não será alterado dentro desta refatoração comercial.

## Alterações previstas

Modificar main/preload, index e pontos de integração em app.js; script Tailscale; cache e estado de conta mobile; manifests/locks; workflows e gitignore. Preservar cálculos financeiros e formato de pareamento.

Criar `server/` (Fastify, TypeScript, Prisma/PostgreSQL, autenticação, assinatura, licença assinada, dispositivos, providers, portal e testes), serviços desktop de conta/licença/entitlements/cofre, StorageService e KDF de PIN, testes de regressão e documentação de implantação/migração/segurança/pagamentos/licenciamento.

## Migrações e compatibilidade

1. Banco comercial novo, sem tabelas financeiras.
2. Wrapper de persistência mantém as chaves existentes, salva cópia anterior antes de normalizar/importar e não sobrescreve JSON inválido.
3. PIN legado migra somente após autenticação correta, com cópia anterior.
4. Cache móvel migra para envelope AES-GCM, valida leitura cifrada antes de remover legado.
5. Backups preservam identificador v1 para clientes anteriores e ganham schemaVersion/appVersion; importadores aceitam v1/v2.
6. Token em URL removido; bearer global legado limitado a migração temporária documentada. Dispositivos aprovados mantêm seus tokens próprios.
7. Comercialização é uma modalidade de build explícita, não uma variável de premium. Builds atuais permanecem de compatibilidade até provisionar backend/chave pública. Builds comerciais aplicam FREE sem licença e permissões assinadas nas operações privilegiadas. Não há exclusão financeira por downgrade.

## Rollback

Commits pequenos permitem reverter componentes. Antes da migração, manter instalador anterior e backup completo. Reverter código não remove backups nem banco comercial. PIN novo exige restaurar backup pré-migração ao voltar para cliente sem suporte a PBKDF2. Cache antigo só é removido após leitura autenticada do novo. Banco deve ter snapshot antes de aplicar migrations; não executar down destrutivo automaticamente. Revogações comerciais só chegam ao cliente offline na próxima consulta ou no vencimento do lease.

## Validação planejada

Suíte atual desktop, testes específicos de KDF/persistência/licença/offline/downgrade/tamper, backend com PostgreSQL em CI, typecheck mobile e servidor, contratos HTTP, verificação de secrets, lockfiles e empacotamento Electron. Android depende de JDK/SDK compatíveis. Pagamento real e entrega de e-mail dependem de credenciais e ambiente de homologação; não inventar aprovação de pagamento.
