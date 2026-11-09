# Progresso — Etapa 1: autenticação e homologação

## Atualização — 07/11/2026: autorização para produção e Etapa 2 Android

- A migração aditiva de autenticação foi aplicada ao D1 de produção após backup verificável, e o Worker `rbfinanceirosite-api` foi publicado na versão `05d4584e-4e7e-499b-9068-39ba353b10e0`.
- A verificação de produção somente de leitura passou (27 verificações); os seis usuários, seus seis vínculos de tenant e suas políticas de segurança permaneceram presentes.
- O aplicativo foi migrado para a autenticação única do site: token em armazenamento seguro, sessão por usuário/tenant, painel direto sem tela de pareamento/offline repetitiva, e biometria após três minutos em segundo plano.
- Validações concluídas: `npm run typecheck` e `npm test` do aplicativo (17 testes aprovados).
- A versão Android `2.0.17` / `versionCode 217` compilou localmente em arm64 (`BUILD SUCCESSFUL`), mas a primeira publicação pelo GitHub Actions foi interrompida pelo `expo-doctor`: quatro dependências estavam abaixo da correção exigida pelo SDK 57. As dependências foram alinhadas para gerar a nova versão `2.0.18` / `versionCode 218`.
- A versão `2.0.18` também substitui a tela de conexão antiga por uma tela própria de verificação com a marca RB Gestão, permite desbloqueio por digital ou senha/PIN do aparelho e torna o atualizador tolerante ao checksum publicado como arquivo da release.
- Em Gastos da casa, uma competência passada ou já baixada fica imutável; exclusão é bloqueada quando houver histórico encerrado e confirmações de moradores não baixam mais a conta automaticamente.

## Atualização — 07/11/2026: ajustes solicitados após produção

- O bloqueio do aplicativo móvel permanece opcional e usa a digital/biometria ou a senha/PIN do próprio aparelho. O tempo fora do app foi ajustado de 3 para 4 minutos antes de pedir o desbloqueio.
- Gastos da casa agora permite corrigir uma baixa já feita exclusivamente naquela competência. Mudanças em contas abertas passam a valer somente para competências abertas; valores baixados continuam registrados no histórico.
- Ao encerrar uma conta que já possui baixa, o sistema interrompe apenas as competências abertas e preserva os registros baixados.
- A versão móvel 2.0.20 exige desbloqueio por digital/biometria sempre que o processo é iniciado do zero. Quando o app permanece nos recentes, o bloqueio só é solicitado após quatro minutos em segundo plano.
- A versão móvel 2.0.21 guarda a credencial de acesso apenas no cofre seguro do aparelho, mantendo a conta disponível entre aberturas. Quando a proteção está ativada, a liberação da tela financeira usa somente biometria, sem fallback de PIN ou senha do telefone.
- A versão móvel 2.0.22 recria essa persistência em um único cofre atômico (`rb_mobile_account_v3`), migra as chaves seguras anteriores sem apagar a conta e só remove o acesso salvo no logout manual. Em aparelhos com biometria cadastrada, a proteção é obrigatória e é pedida no processo novo ou após quatro minutos fora do aplicativo.
- A versão móvel 2.0.23 reformula as telas de abertura e de bloqueio com a identidade RB Gestão; o desbloqueio é um controle visual de digital em vez de um botão textual grande, mantendo a chamada biométrica nativa e a acessibilidade do controle.
- A versão móvel 2.0.24 usa a assinatura horizontal RB Gestão solicitada e reproduz a composição de desbloqueio com digital, texto e indicador dourado. Ao montar a tela protegida, a solicitação biométrica é aberta automaticamente; o ícone de digital permite chamá-la novamente se ela for cancelada.
- A versão móvel 2.0.25 torna o aviso de atualização global, inclusive sobre a tela bloqueada por digital e a entrada da conta. A consulta de novas releases também passa a ocorrer a cada dez minutos e ao retornar ao aplicativo.
- A versão móvel 2.0.26 adapta a abertura protegida à referência visual recebida: fundo azul profundo, brilho central, logo horizontal oficial RB Gestão, digital dourada, texto e indicador centralizados. A captura não é inserida como imagem inteira para não duplicar a barra de status real do dispositivo.
- A versão móvel 2.0.27 corrige uma incompatibilidade de tipagem da barra de status encontrada antes da compilação assinada da versão visual anterior.
- A versão móvel 2.0.28 substitui o símbolo grande com barra vertical pelo ícone compacto RB fornecido nos assets, somente na abertura protegida.

## Próximos passos ativos

1. Publicar o Worker com a proteção de histórico de Gastos da casa e validar a resposta de produção.
2. Executar a publicação assinada de `2.0.18` pelo workflow do GitHub e confirmar o artefato da release.
3. Validar em aparelho Android físico após a disponibilização.

## Escopo ativo

- Branch: `codex/stage1-site-homologation`
- Repositório solicitado: `DiogoRibeiroBarros/rbcontrolefinanceiro`
- Produção autorizada pelo titular: Worker publicado e APK móvel `2.0.18` publicado pela release assinada `vMB.2.0.18`.

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
