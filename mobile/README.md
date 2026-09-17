# RB Gestão Financeira Mobile

Aplicativo mobile separado do sistema Windows, desenvolvido com Expo e React Native.

## Executar

1. Instale as dependências com `npm install`.
2. Execute `npm start`.
3. Abra pelo Expo Go, emulador Android ou simulador iOS.

## Gerar APK

O perfil `preview` em `eas.json` gera um APK instalável para testes. Após entrar na conta Expo neste computador, execute `npx eas-cli build --platform android --profile preview`.

## Estado atual

- Login de demonstração.
- Dashboard financeiro e navegação pelos módulos.
- Listagem e inclusão de transações.
- Tema claro e escuro.
- Serviço de sincronização simulado, estruturado para API REST.

## Integração planejada

O aplicativo mobile não acessará o banco local do Windows diretamente. A integração será feita por uma API autenticada e versionada, que será usada tanto pelo desktop quanto pelo celular.

Rotas planejadas: `/v1/auth`, `/v1/profiles`, `/v1/dashboard`, `/v1/transactions`, `/v1/salaries`, `/v1/cards`, `/v1/loans`, `/v1/subscriptions`, `/v1/home-expenses` e `/v1/categories`.

O contrato inicial está em [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

## Conexão privada com o desktop via Tailscale

1. Atualize o desktop para a versão 2.0.34 e abra-o uma vez. Ele inicia o serviço local de sincronização em `127.0.0.1:41731`.
2. Instale o Tailscale no computador e no celular e entre na mesma rede privada.
3. No computador, execute `tailscale serve --bg http://127.0.0.1:41731`.
4. Execute `tailscale serve status` e copie o endereço HTTPS exibido.
5. No mobile, abra **Configurações → Configurar conexão**, informe o endereço HTTPS e use **Testar conexão**. Em seguida, toque em **Sincronizar**.

O Tailscale Serve mantém o serviço acessível somente aos dispositivos autorizados na sua rede Tailscale; não use Tailscale Funnel para esta integração.
