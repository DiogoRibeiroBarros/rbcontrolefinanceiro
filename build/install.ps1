$ErrorActionPreference = 'Stop'

$appName = 'RB Gestão Financeira'
$installRoot = Join-Path $env:LOCALAPPDATA 'Programs\RB Gestao Financeira'
$payload = Join-Path $PSScriptRoot 'payload.zip'

if (!(Test-Path $payload)) {
  throw 'Pacote payload.zip não encontrado.'
}

if (Test-Path $installRoot) {
  Remove-Item -LiteralPath $installRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
Expand-Archive -LiteralPath $payload -DestinationPath $installRoot -Force

$exePath = Join-Path $installRoot 'RB Gestão Financeira.exe'
$iconPath = Join-Path $installRoot 'app\assets\rb_gestao.ico'

$shell = New-Object -ComObject WScript.Shell
$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) "$appName.lnk"
$startMenuDir = Join-Path ([Environment]::GetFolderPath('Programs')) $appName
New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null
$startMenuShortcut = Join-Path $startMenuDir "$appName.lnk"

foreach ($shortcutPath in @($desktopShortcut, $startMenuShortcut)) {
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $exePath
  $shortcut.WorkingDirectory = $installRoot
  if (Test-Path $iconPath) {
    $shortcut.IconLocation = $iconPath
  }
  $shortcut.Save()
}

Start-Process -FilePath $exePath
