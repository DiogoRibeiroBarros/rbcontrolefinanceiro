# RB Gestão Mobile 2.0.17

- Login único com o mesmo e-mail e senha do site RB Gestão em produção.
- O painel financeiro abre diretamente; o aplicativo não exibe mais a tela de modo offline ou o pareamento com PC neste fluxo.
- Biometria opcional para desbloqueio após três minutos fora do aplicativo, com alternativa segura de novo login por e-mail e senha.
- Sessão, permissões e licença são validadas pela API do site; o token fica no armazenamento seguro e o WebView é efêmero.
- Dados e bancos locais existentes são preservados, sem limpeza automática.

# RB Gestão Mobile 2.0.16

- Teclado: ajuste de altura, rolagem dos formulários nativos e campo visível nas janelas financeiras do WebView.
- Código e aprovação vinculados à base da conta que gerou o código no site.
- SQLite, cache e fila de sincronização separados por vínculo. Respostas de outra base são rejeitadas.
- Bases antigas permanecem intactas. Só são copiadas para o novo armazenamento quando o vínculo pode ser comprovado.
- O APK abre a base completa da conta aprovada na Cloudflare, mantendo a compatibilidade com o desktop.
- Instale como atualização sobre o APK existente: não desinstale nem limpe os dados.

Validação automática: testes, TypeScript, Expo Doctor, compilação e assinatura Android. A experiência do teclado ainda exige confirmação em um aparelho físico.
