!macro removeLegacyCardsShortcuts
  Delete "$DESKTOP\RB Gestão Cartões.lnk"
  Delete "$SMPROGRAMS\RB Gestão Cartões.lnk"
  Delete "$SMPROGRAMS\RB Gestão Financeira\RB Gestão Cartões.lnk"
  RMDir "$SMPROGRAMS\RB Gestão Financeira"
!macroend

!macro customInstall
  !insertmacro removeLegacyCardsShortcuts
  DetailPrint "Atualizando o RB Gestão Financeira..."
!macroend

!macro customUnInstall
  !insertmacro removeLegacyCardsShortcuts
!macroend
