# RB Gestão Mobile — nova base

Projeto independente do aplicativo anterior em `mobile/`. Código e armazenamento locais não são compartilhados com a implementação antiga.

## Arquitetura

- `App.tsx`: telas nativas de configuração em três etapas, estado da conexão, diagnóstico, interface do PC e aviso de atualização.
- `src/domain`: normalização de endereço, cliente HTTP com timeout, pareamento e seleção de releases `vMB`.
- `src/hooks`: ciclo de vida da conexão, heartbeat/reconexão e verificação global de versões.
- `src/platform`: credencial no Android Keystore via SecureStore, preferências no AsyncStorage, logs sem segredos, download/validação de APK e ponte isolada para biometria/PDF.
- Desktop: `app/services/mobile-v2-http.cjs` expõe `/v2/mobile/identity`, `/pair/request`, `/pair/complete`, `/heartbeat` e `/session`. As rotas anteriores continuam disponíveis para o navegador e o aplicativo antigo.

O código de seis dígitos inicia uma solicitação que precisa ser aprovada no PC. Após a aprovação, cada dispositivo recebe token aleatório próprio; o navegador interno troca esse token por cookie HttpOnly, sem colocar segredo no endereço. O token é persistido no SecureStore e o código de pareamento não é utilizado para chamadas normais. O primeiro vínculo requer o link HTTPS do PC: não há serviço público de descoberta por código, portanto o código sozinho não localiza um PC na internet.

A tela mostra o último PC salvo imediatamente. O heartbeat consulta o PC a cada 10 segundos, além da retomada do app e de mudanças na rede. Timeouts, internet ausente, PC indisponível e autenticação inválida possuem estados distintos. O navegador incorporado só abre depois do heartbeat autenticado.

O atualizador roda ao abrir e a cada quatro horas, independentemente da tela. Consulta somente tags `vMB.X.Y.Z`, ignora versões já instaladas, exige digest SHA-256 do asset e só inicia a instalação após verificar o arquivo. O Android ainda solicita autorização/confirmação para instalar APK; o app não pode suprimir controles do sistema. Atualizações posteriores precisam preservar `android.package` e a **mesma chave de assinatura** da primeira publicação.

## Desenvolvimento e validação

```
npm ci
npm run typecheck
npm test
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```

O build Android no Windows exige caminho curto para evitar limite de 260 caracteres no CMake/Ninja. Para distribuição, o workflow exige uma assinatura permanente e falha se ela não estiver configurada. Cadastre `RB_MOBILE_KEYSTORE_BASE64`, `RB_MOBILE_STORE_PASSWORD`, `RB_MOBILE_KEY_ALIAS` e `RB_MOBILE_KEY_PASSWORD` nos secrets do GitHub. O pacote novo é `com.rbgestao.financeira.mobilev2`; ele pode coexistir com o APK antigo, mas não o substitui como atualização direta.

Antes da publicação, testar em aparelho Android real: instalação limpa, vínculo/aprovação, reinícios, rede offline/online, PC offline/online, uso concorrente, navegador, atualização assinada e preservação do vínculo. Esses testes físicos não são substituídos pelos testes de domínio/HTTP.
