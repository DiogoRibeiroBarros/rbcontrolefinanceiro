RB GESTÃO FINANCEIRA — VERSÃO 2.0.18 PARA WINDOWS

INSTALAÇÃO

1. Execute release\RB_Gestao_Financeira_Setup_2.0.18.exe.
2. Escolha a pasta de instalação.
3. O instalador cria o atalho RB Gestão Financeira na Área de Trabalho e no
   Menu Iniciar.
4. Ao atualizar a versão anterior, o atalho separado RB Gestão Cartões é
   removido automaticamente. Os dados dos cartões permanecem preservados.

O aplicativo possui uma janela nativa Electron e não depende do Microsoft Edge,
Chrome, Node.js ou servidor externo. O ícone RB Gestão identifica o executável,
os atalhos e a janela na barra de tarefas.

DADOS

- Os dados ficam armazenados localmente neste computador.
- Na primeira abertura da versão 2.0, os registros anteriores são associados
  automaticamente ao Perfil Principal.
- Cada perfil possui transações, cartões, salários, empréstimos, assinaturas e
  categorias totalmente separados.
- Use Configurações > Exportar manualmente para guardar todos os perfis em uma cópia JSON.
- Use Configurações > Importar backup para restaurar ou trocar de computador.
- A desinstalação não apaga automaticamente os dados do usuário.

PERFIS FINANCEIROS

- Clique no avatar no alto da barra lateral para trocar de perfil.
- Use + Novo perfil para criar um ambiente financeiro vazio e independente.
- Nome, foto ou avatar alternativo, cor, data de criação e dados financeiros são mantidos localmente.
- A foto é recortada automaticamente, pode ser removida e acompanha o perfil no backup.
- É possível editar a identificação ou excluir um perfil.
- A exclusão apresenta a quantidade de registros e exige confirmação explícita.
- É obrigatório manter pelo menos um perfil.

INTERFACE 2.0

A versão 2.0.18 permite alternar entre tema escuro em preto e grafite e tema claro
otimizado para leitura, mantendo verde-limão como destaque,
sidebar fixa, cards financeiros, gráfico real de despesas por categoria,
movimentações recentes e atalhos rápidos. Nenhum valor fictício é apresentado.

A seta na divisória da barra lateral permite recolher o menu e deixar somente
os ícones coloridos dos módulos. A escolha é mantida ao atualizar ou reabrir o aplicativo.
As barras de rolagem seguem o tema em grafite e verde-limão.
O botão de tema no topo salva a preferência para as próximas aberturas.
No modo claro, valores financeiros, textos secundários, botões e indicadores
utilizam cores próprias de alto contraste em vez das tonalidades neon do modo escuro.

COMPETÊNCIA E NAVEGAÇÃO

- Em Configurações, escolha se uma nova abertura começa no mês atual ou no próximo mês.
- Alterar a tela, o mês, os filtros ou a ordenação e pressionar F5 mantém o
  usuário no mesmo contexto.

CÁLCULO DO PAINEL

O painel consolida por competência:
- salário líquido, já com proventos, descontos e empréstimos CLT vigentes;
- receitas e despesas;
- parcelas de empréstimos a pagar e a receber;
- assinaturas mensais, trimestrais ou anuais devidas naquele mês.

Cartões e faturas ficam no mesmo aplicativo, mas não entram nos cálculos do
painel financeiro.

O painel inicial apresenta três totais informativos dos cartões: limite total,
limite disponível e faturas da competência. Esses valores permanecem fora do
cálculo do saldo previsto.

FILTROS E ORDENAÇÃO

As telas com registros do aplicativo possuem filtros e ordenação próprios
por tipo, situação, direção, ciclo, data, nome e valor, conforme as informações
disponíveis. O módulo de Cartões também filtra por cartão e situação da
fatura e ordena cartões e compras separadamente.

Visão Geral, Transações e compras dos Cartões também podem ser filtradas por
categoria. A aba Categorias pode ser filtrada pelo grupo de cadastro.

Ao editar uma transação criada com recorrência mensal, o sistema pergunta se
a alteração deve valer somente para a parcela escolhida ou para todas as
parcelas relacionadas. As datas, identificadores e numeração são preservados.

O topo do módulo Cartões apresenta um resumo consolidado da competência com
quantidade de cartões e compras, limites total, comprometido e disponível,
faturas, pagamentos e valores em aberto. Os totais acompanham os filtros.

EMPRÉSTIMOS CLT NO SALÁRIO

No módulo Salário, o tipo Empréstimo CLT possui mês inicial e quantidade de
parcelas. O valor aparece automaticamente nas competências seguintes, pode ter
as competências atuais e anteriores marcadas como pagas e participa do cálculo
do salário líquido durante toda a vigência.

EMPRÉSTIMOS E BAIXAS PARCIAIS

- O cadastro aceita Valor total, Valor da parcela ou Somente montante.
- Em Sem data limite, Valor total cria uma cobrança única e Valor da parcela
  cria uma recorrência mensal sem término definido.
- Somente montante não gera parcelas. As baixas integrais ou parciais são
  registradas diretamente no saldo e podem ser estornadas individualmente.
- Uma parcela aceita diversas baixas parciais até completar o valor total.
- O cronograma mostra valor baixado, restante e data do último pagamento.
- Um contrato pode ter quantidade definida ou ficar sem data limite.
- Contratos sem data limite aparecem em todos os meses a partir do primeiro
  vencimento.

CONFIGURAÇÕES E BACKUP AUTOMÁTICO

- A antiga aba Backup foi incorporada à aba Configurações.
- O modo automático pode ficar desativado, executar diariamente em horário
  fixo, executar sempre que o aplicativo for fechado ou combinar os dois modos.
- O backup diário exige que o aplicativo esteja aberto no horário definido.
- É possível escolher a pasta de destino e manter 7, 15, 30, 60 ou 90 cópias.
- Gerar backup agora cria imediatamente uma cópia completa de todos os perfis.
- Ao fechar normalmente o aplicativo, o backup é concluído antes da janela encerrar.
- O painel informa data, hora, caminho e eventual erro do último backup.

MÓDULOS

- Início
- Transações
- Cartões
- Salário
- Empréstimos
- Assinaturas
- Categorias
- Configurações
- Help

A aba Help contém o tutorial completo do sistema, com instruções de uso para
todos os módulos, cálculos, filtros, navegação mensal e proteção dos dados.

RELATÓRIOS E PDF

O cabeçalho dos relatórios destaca o nome RB Gestão Financeira em tamanho
ampliado, acompanhado do símbolo da marca, do tipo de relatório, perfil e
competência selecionada.
Na pré-visualização, escolha PDF claro ou PDF escuro antes de imprimir ou salvar.
Cada módulo possui sua própria ação Relatório PDF. No painel Início, o botão
Relatório completo reúne as informações de salário, movimentações, cartões,
empréstimos, assinaturas e categorias da competência selecionada.
O tema do aplicativo é escolhido em Configurações, sem ocupar espaço na barra superior.
