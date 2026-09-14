!macro removeLegacyCardsShortcuts
  Delete "$DESKTOP\RB Gestão Cartões.lnk"
  Delete "$SMPROGRAMS\RB Gestão Cartões.lnk"
  Delete "$SMPROGRAMS\RB Gestão Financeira\RB Gestão Cartões.lnk"
  RMDir "$SMPROGRAMS\RB Gestão Financeira"
!macroend

!macro customInstall
  !insertmacro removeLegacyCardsShortcuts
  DetailPrint "Configurando Tailscale e acesso remoto..."
  ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\setup-tailscale.ps1" -ApplicationPath "$INSTDIR\RB Gestão Financeira.exe" -SyncPort 41732' $0
!macroend

!macro customUnInstall
  !insertmacro removeLegacyCardsShortcuts
!macroend
