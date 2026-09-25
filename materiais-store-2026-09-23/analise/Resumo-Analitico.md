# Resumo analítico — RB Gestão Financeira

Versão analisada: **2.4.22**. Data: **23/09/2026**.

## Visão do produto

O RB Gestão Financeira é um aplicativo de controle financeiro pessoal e doméstico para Windows. Ele combina planejamento por competência mensal, acompanhamento de contas e patrimônio, controle de compromissos e organização de despesas compartilhadas. Sua proposta atende especialmente quem quer substituir controles dispersos por uma interface única em português.

A aplicação utiliza Electron, HTML, CSS e JavaScript. O núcleo trabalha com dados locais e oferece recursos adicionais de backup, atualização e acesso móvel. A análise considera o código e a interface desta cópia do projeto, e não certifica o comportamento de um instalador publicado.

## Funcionalidades identificadas

| Área | Recursos e utilidade |
|---|---|
| Visão Geral | Consolidação do mês, salário líquido, receitas e despesas previstas, distribuição por categoria, movimentações e resumo patrimonial. Permite distinguir planejamento mensal de posição patrimonial. |
| Transações | Receitas e despesas, categorias, situação de pagamento, datas, filtros e recorrências. A edição pode alcançar um lançamento ou a série relacionada. |
| Contas | Cadastro de contas, saldo inicial, movimentações, extrato, transferências e inativação. Vinculação com instituições e outros registros financeiros. |
| Caixinhas | Reservas vinculadas às contas, metas e histórico. O valor reservado integra o saldo bancário, mas reduz o disponível para uso. |
| Investimentos | Cadastro por categoria e subcategoria, capital aplicado, valor atual, resultado, distribuição da carteira e histórico patrimonial. Registra aportes, resgates, rendimentos, dividendos, taxas e impostos. |
| Cartões e faturas | Limites, compras parceladas, fechamento, vencimento, pagamentos e valores em aberto. A fatura pode indicar a conta utilizada no pagamento. |
| Salário | Salário bruto, proventos, descontos e empréstimos CLT com vigência. Composição do líquido utilizado na previsão mensal. |
| Empréstimos | Contratos a pagar e a receber, parcelas, contratos sem prazo final, controle por montante e baixas parciais com estorno. |
| Assinaturas | Controle de serviços recorrentes e ciclos de cobrança, com participação das obrigações devidas na competência. |
| Gastos da casa | Moradores, contas compartilhadas, confirmações mensais, participação individual e acertos entre pessoas. Mantém o histórico de cada competência. |
| Categorias e instituições | Organização dos lançamentos por grupos e cores. Identificação visual de bancos e cartões, com cadastro de instituições. |
| Relatórios | Central de relatórios por módulo e competência, pré-visualização, impressão e geração de PDF. |
| Usuários e permissões | Perfis, administrador, PIN e permissões de visualizar, criar e editar por módulo. No código atual, os dados financeiros são compartilhados. |
| Configurações e ajuda | Temas claro e escuro, preferências de navegação, escolha do mês inicial, backups e tutorial. |
| Recursos desktop e mobile | Atualizações, avisos nativos, pareamento e aprovação de dispositivos. O acesso móvel depende de conectividade com o desktop e da configuração correspondente. |

## Pontos fortes

**Amplitude funcional com foco doméstico.** O aplicativo vai além de uma lista de receitas e despesas. Salário, empréstimos, cartões, reservas, patrimônio e convivência financeira aparecem em módulos específicos, com contexto próprio.

**Separação de conceitos financeiros.** As caixinhas não somam patrimônio em duplicidade. O módulo de investimentos distingue capital aplicado e resultado. O planejamento mensal também possui uma lógica diferente dos limites e faturas dos cartões. Essa separação é útil, desde que fique clara para o usuário.

**Controle compartilhado.** Permissões por módulo e gastos da casa tornam o produto relevante para famílias e pessoas que dividem despesas. O compartilhamento de dados deve aparecer com clareza na comunicação comercial.

**Autonomia local.** O armazenamento no computador favorece o uso cotidiano sem depender de um serviço financeiro central. Backups manuais e automáticos ajudam na continuidade do uso e na troca de equipamento.

## Limites e pontos de atenção

1. **Documentação desatualizada.** O README de instalação identifica a versão 2.0.18 e informa isolamento financeiro por perfil. O código 2.4.22 utiliza `sharedData` e reúne dados financeiros compartilhados. A documentação deve acompanhar esse comportamento antes da publicação.
2. **Cadastro bancário não equivale a conexão com bancos.** Foram identificados registros internos de contas, instituições e operações. Esta análise não encontrou evidência suficiente para anunciar Open Finance, importação automática de extratos, execução de Pix ou cotações de investimentos em tempo real.
3. **Previsão mensal não equivale ao saldo bancário.** Cartões possuem tratamento separado no planejamento. A explicação dos totais precisa evitar que o usuário interprete saldo previsto como dinheiro imediatamente disponível ou como consolidação automática de toda obrigação.
4. **Armazenamento local exige cuidados com cópias.** O backup diário depende de o aplicativo estar aberto no horário configurado. PIN e permissões não demonstram, por si, criptografia de toda a base ou dos arquivos exportados. Não há base para anunciar proteção absoluta.
5. **Acesso móvel tem pré-requisitos.** Pareamento, aprovação e desktop acessível fazem parte do fluxo. O histórico de mudanças descreve consulta ao último estado salvo quando offline, o que não equivale a sincronização ativa sem conexão.
6. **Prontidão para a loja permanece uma etapa própria.** O projeto está configurado para instalador EXE/NSIS. Esta entrega produz conteúdo de divulgação; assinatura, política de privacidade, requisitos da conta do desenvolvedor e certificação não foram validados.
7. **Rateio sem percentuais precisa de revisão.** No cenário de demonstração, uma conta de R$ 1.800 com dois participantes e campos percentuais vazios exibiu participação de R$ 0 para ambos. A função `homeShares` ajusta o total de percentuais, mas mantém o percentual individual em zero. Informar 50% para cada morador produz a divisão esperada. É um ponto funcional concreto a corrigir antes de apresentar o preenchimento vazio como divisão igualitária automática.

## Avaliação de posicionamento

O posicionamento mais fiel é **“controle financeiro pessoal e da casa para Windows, com planejamento mensal e acompanhamento do patrimônio”**. Os diferenciais demonstráveis são a combinação de caixinhas com contas, a visão patrimonial, o detalhamento de compromissos e a divisão de gastos domésticos.

A apresentação comercial deve priorizar tarefas concretas: saber o que está disponível, acompanhar compromissos e organizar o dinheiro reservado. Integrações bancárias, rentabilidade futura e certificações não devem ser prometidas sem comprovação.

## Base da análise

- `package.json`: versão, plataforma e empacotamento.
- `app/app.js`: módulos, regras financeiras, dados compartilhados e permissões.
- `app/index.html` e `app/styles.css`: estrutura visual.
- `electron-main.cjs`, `app/services` e `release-notes.md`: contexto dos serviços desktop e mobile.
- `README_INSTALACAO.txt`: documentação histórica, confrontada com o código atual.
- `tests/app.test.js`, `tests/banking-ui-smoke.cjs`, `tests/investments-ui-smoke.cjs` e `tests/home-expenses-smoke.cjs`: cenários existentes consultados.

Foram abertas seis telas reais em sessão Electron isolada, com dados fictícios para produzir as capturas. Esta atividade não incluiu a execução completa da suíte de testes, auditoria de segurança ou validação ponta a ponta do acesso remoto.
