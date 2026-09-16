Correção:
---
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

Novo Modulo:
---
* Acesso remoto e mobile com descoberta automática do endereço Tailscale quando disponível.
* Serviço global de atualização e serviços isolados de pareamento remoto, com testes automatizados.
