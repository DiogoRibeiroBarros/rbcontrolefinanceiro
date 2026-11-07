# Progresso — Etapa 1: autenticação e homologação

## Atualização — 07/11/2026: autorização para produção e Etapa 2 Android

- A migração aditiva de autenticação foi aplicada ao D1 de produção após backup verificável, e o Worker `rbfinanceirosite-api` foi publicado na versão `05d4584e-4e7e-499b-9068-39ba353b10e0`.
- A verificação de produção somente de leitura passou (27 verificações); os seis usuários, seus seis vínculos de tenant e suas políticas de segurança permaneceram presentes.
- O aplicativo foi migrado para a autenticação única do site: token em armazenamento seguro, sessão por usuário/tenant, painel direto sem tela de pareamento/offline repetitiva, e biometria após três minutos em segundo plano.
- Validações concluídas: `npm run typecheck` e `npm test` do aplicativo (17 testes aprovados).
- A versão Android foi incrementada para `2.0.17` / `versionCode 217`. A geração do APK ainda depende de uma compilação limpa em caminho curto no Windows e de uma chave de assinatura de distribuição; a configuração local não contém as quatro variáveis de assinatura necessárias. Não publicar APK assinado com a chave de depuração.

## Próximos passos ativos

1. Concluir a compilação limpa do APK em diretório curto, sem os artefatos CMake herdados.
2. Configurar a chave de distribuição no mecanismo seguro de release e assinar o APK/AAB.
3. Validar em aparelho Android físico antes de disponibilizar a atualização em produção.

## Escopo ativo

- Branch: `codex/stage1-site-homologation`
- Repositório solicitado: `DiogoRibeiroBarros/rbcontrolefinanceiro`
- Limites: somente site, API e autenticação; não alterar Android; não publicar em produção.

## Concluído anteriormente e preservado

- O Worker de homologação `rb-gestao-subscriptions-staging` foi configurado com D1 e KV próprios, separados da produção.
- A migração aditiva `server/cloudflare/user-access-migration.sql` cria tenants, membros, sessões revogáveis e auditoria sem remover dados existentes.
- O backend contém autenticação por e-mail e senha, membros por tenant, bloqueio, revogação de sessões e expiração por inatividade.

## Pendente nesta etapa

- Confirmar a origem do site web completo que deve receber a mudança visual de login.
- Revisar e testar o fluxo de autenticação somente no site, sem tocar em Android.
- Criar dados sintéticos e executar os testes obrigatórios da etapa no ambiente de homologação.
- Fazer commits incrementais somente dos arquivos pertencentes à Etapa 1.

## Impedimento de escopo identificado

O endereço web informado anteriormente (`rbfinanceirosite-api.../gestao`) é servido por outro projeto local, `rbfinanceirosite`, e não pelo repositório `rbcontrolefinanceiro` indicado nesta etapa. Alterar o repositório errado não atualizaria a tela do site mostrada nas imagens. É necessária confirmação antes de editar esse segundo projeto.

## Próximo passo

Confirmar se a Etapa 1 deve abranger também o projeto `rbfinanceirosite` que publica `/gestao`, ou somente os componentes web presentes neste repositório.
