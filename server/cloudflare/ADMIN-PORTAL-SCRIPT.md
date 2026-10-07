# Roteiro funcional do portal administrativo

URL de produção: `https://rb-gestao-subscriptions.rbgestao.workers.dev/admin/`

## Fluxo do administrador

1. Abrir `/admin/` e informar e-mail e senha administrativa.
2. O Worker valida a credencial com PBKDF2 e devolve uma sessão assinada com HMAC.
3. O painel carrega métricas e a lista de contas sem armazenar a senha no navegador.
4. Usar a busca ou o filtro para atualizar a lista em tempo real.
5. Clicar em **Cadastrar cliente** para abrir a janela secundária de cadastro.
6. Clicar em **Editar** para abrir a mesma janela sobre o painel. Nome e plano podem ser alterados; a senha é opcional.
7. Clicar em **Salvar cliente**. A alteração é persistida no D1 por `PATCH /v1/admin/customers/:id` e a lista é recarregada.
8. Clicar em **Bloquear** ou **Desbloquear** para alternar o acesso. O bloqueio suspende a assinatura, revoga tokens e revoga instalações ativas.
9. Clicar em **Atualizar** para sincronizar métricas e clientes novamente.
10. Clicar em **Sair** para encerrar a sessão local do painel.

## Endpoints administrativos

| Método | Rota | Função |
| --- | --- | --- |
| POST | `/v1/admin/login` | Autentica o administrador. |
| GET | `/v1/admin/overview` | Retorna clientes, ativos, bloqueados, dispositivos e planos pagos. |
| GET | `/v1/admin/customers?q=&status=` | Lista, pesquisa e filtra clientes. |
| POST | `/v1/admin/customers` | Cria cliente e assinatura inicial. |
| PATCH | `/v1/admin/customers/:id` | Atualiza nome, plano e, opcionalmente, senha. |
| POST | `/v1/admin/customers/:id/block` | Bloqueia ou desbloqueia uma conta. |

Todas as rotas administrativas, exceto login, exigem `Authorization: Bearer <sessão>` e não são cacheadas.

## Checklist de aceitação

- Login válido abre o painel; credencial inválida mostra erro.
- Cadastrar cliente exige nome, e-mail e senha de 8 caracteres.
- Editar abre uma janela secundária mantendo a lista visível ao fundo.
- Editar nome/plano e salvar atualiza a linha sem recarregar a página inteira.
- Editar senha vazia preserva a senha atual; senha preenchida exige 8 caracteres.
- Bloquear muda o status e as métricas; desbloquear restaura o acesso.
- Busca, filtro, atualizar e sair respondem sem navegação para uma rota inexistente.
- Layout adapta-se a telas pequenas e os campos têm foco visível e rótulos acessíveis.
