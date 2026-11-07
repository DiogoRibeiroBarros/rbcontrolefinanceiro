# Progresso — Etapa 1: autenticação e homologação

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
