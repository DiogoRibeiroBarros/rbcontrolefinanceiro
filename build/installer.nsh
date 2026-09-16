!macro removeLegacyCardsShortcuts
  Delete "$DESKTOP\RB Gestão Cartões.lnk"
  Delete "$SMPROGRAMS\RB Gestão Cartões.lnk"
  Delete "$SMPROGRAMS\RB Gestão Financeira\RB Gestão Cartões.lnk"
  RMDir "$SMPROGRAMS\RB Gestão Financeira"
!macroend

!macro customInstall
  !insertmacro removeLegacyCardsShortcuts
  ; O instalador usado pelo electron-updater é silencioso. Não execute a configuração
  ; interativa do Tailscale durante uma atualização, pois isso abriria um terminal e
  ; manteria o aplicativo antigo bloqueado. A configuração só ocorre na instalação
  ; manual visível.
  IfSilent skipRemoteSetup
  DetailPrint "Configurando Tailscale e acesso remoto..."
  ExecWait 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "$INSTDIR\resources\setup-tailscale.ps1" -ApplicationPath "$INSTDIR\RB Gestão Financeira.exe" -SyncPort 41732' $0
  skipRemoteSetup:
!macroend

!macro customUnInstall
  !insertmacro removeLegacyCardsShortcuts
!macroend
