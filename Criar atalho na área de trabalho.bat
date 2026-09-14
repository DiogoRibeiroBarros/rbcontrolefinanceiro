@echo off
setlocal
set "TARGET=%~dp0Abrir RB Gestão Financeira.bat"
set "ICON=%~dp0app\assets\rb_gestao.ico"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\RB Gestão Financeira.lnk'); $s.TargetPath='%TARGET%'; $s.WorkingDirectory='%~dp0'; $s.IconLocation='%ICON%'; $s.Save()"
echo Atalho criado na area de trabalho.
pause
