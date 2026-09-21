Correção:
---
* Smoke test de biometria agora ignora somente o CI sem hardware/sessão interativa; a validação local continua ativa.
* Pareamento reconstruído para WebView Android, bloqueando navegação indevida para respostas JSON e mantendo a aprovação em espera.
* Corrigida a origem do erro que misturava os painéis das abas de Configurações.
* Corrigido o layout responsivo e o fechamento do menu lateral ao trocar de módulo.
* Atualizador configurado para download completo, sem blockmap/diferencial, com validação de integridade e log de erros.
* Suíte obrigatória do pipeline separada da prévia visual; a validação visual continua disponível em `npm run test:settings`.

Novo Recurso:
---
* Aviso global de atualização em qualquer tela, com adiar, progresso, confirmação de download e reinício.
* Notificação nativa do Windows quando o aplicativo está minimizado ou sem foco.
* Código de pareamento persistente de seis dígitos com credencial interna forte, aprovação local, rotação e revogação de dispositivos.
* Conexões simultâneas de vários dispositivos Android, com fila única de alterações para preservar a ordem.
* Painel de dispositivos vinculados com aprovação, negação, inativação, bloqueio e reativação.
* Pareamento do APK sem erro de chave recusada: dispositivos não autorizados recebem diretamente a tela de conexão.
* Seletor de mês oculto nos módulos que não dependem de competência.
* Acesso mobile restaurado para o pareamento por código curto, sem expor chave longa no link.
* Solicitação nativa do APK identificada explicitamente para que o desktop atualize a fila em tempo real.
* Cliente móvel atualizado para mostrar o envio e aguardar a aprovação sem travar na etapa do nome.

Novo Modulo:
---
* Acesso remoto e mobile com descoberta automática do endereço Tailscale quando disponível.
* Serviço global de atualização e serviços isolados de pareamento remoto, com testes automatizados.
* Endpoint v2 de pareamento compartilhado entre desktop e Android para conexões simultâneas.
* Logos oficiais atualizados no instalador e nos atalhos do aplicativo.
* Corrigida a persistência da credencial Android após a aprovação do dispositivo.
* Corrigido o fechamento automático do menu lateral e o efeito de piscar em telas móveis.
* Biometria Android ajustada para abrir o prompt nativo e informar claramente sensor ausente, digital não cadastrada ou cancelamento.
