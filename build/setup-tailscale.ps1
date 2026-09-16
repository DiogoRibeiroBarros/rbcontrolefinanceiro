param(
  [string]$ApplicationPath = '',
  [int]$SyncPort = 41732
)

$ErrorActionPreference = 'Stop'
$progressPreference = 'SilentlyContinue'

Add-Type -AssemblyName System.Windows.Forms

$logFolder = Join-Path $env:LOCALAPPDATA 'RB Gestão Financeira'
$logFile = Join-Path $logFolder 'configuracao-tailscale.log'
New-Item -ItemType Directory -Force -Path $logFolder | Out-Null
Set-Content -LiteralPath $logFile -Value "$(Get-Date -Format s) - Início da configuração automática." -Encoding UTF8

function Write-SetupLog([string]$Message) {
  "$(Get-Date -Format s) - $Message" | Add-Content -LiteralPath $logFile -Encoding UTF8
}

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-SetupLog 'Solicitando permissão de administrador.'
  $arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`" -ApplicationPath `"$ApplicationPath`" -SyncPort $SyncPort"
  $elevated = Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -ArgumentList $arguments -Wait -PassThru
  exit $elevated.ExitCode
}

function Show-RBMessage([string]$Message, [string]$Title = 'RB Gestão Financeira') {
  [System.Windows.Forms.MessageBox]::Show($Message, $Title, 'OK', 'Information') | Out-Null
}

function Find-TailscaleExecutable {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'),
    $(if (${env:ProgramW6432}) { Join-Path ${env:ProgramW6432} 'Tailscale\tailscale.exe' }),
    $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} 'Tailscale\tailscale.exe' }),
    'C:\Program Files\Tailscale\tailscale.exe',
    'C:\Program Files (x86)\Tailscale\tailscale.exe'
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  $command = Get-Command tailscale.exe -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  try {
    $servicePath = (Get-CimInstance Win32_Service -Filter "Name='Tailscale'").PathName
    if ($servicePath) {
      $serviceFolder = Split-Path ([regex]::Match($servicePath, '^"?([^\"]+\.exe)').Groups[1].Value)
      $serviceCli = Join-Path $serviceFolder 'tailscale.exe'
      if (Test-Path -LiteralPath $serviceCli) { return $serviceCli }
    }
  } catch {}
  return $null
}

function Wait-TailscaleExecutable([int]$Seconds = 90) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    $executable = Find-TailscaleExecutable
    if ($executable) { return $executable }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)
  return $null
}

function Get-TailscaleStatus([string]$Executable) {
  try {
    $raw = & $Executable status --json 2>$null | Out-String
    if (-not $raw.Trim()) { return $null }
    return $raw | ConvertFrom-Json
  } catch { return $null }
}

function Enable-RBFunnel([string]$Executable, [int]$Port) {
  $openedAuthorization = $false
  $deadline = (Get-Date).AddMinutes(10)
  do {
    Write-SetupLog "Tentando ativar o Funnel na porta $Port."
    $output = & $Executable funnel --bg $Port 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) { Write-SetupLog 'Funnel ativado com sucesso.'; return $output }
    $authorizationUrl = [regex]::Match($output, 'https://[^\s]+').Value.TrimEnd('.', ',', ')')
    if (-not $openedAuthorization -and $authorizationUrl) {
      $openedAuthorization = $true
      Set-Clipboard -Value $authorizationUrl
      Show-RBMessage "É necessário autorizar o Funnel nesta conta do Tailscale.`n`nO site de autorização será aberto no navegador. Confirme a ativação e aguarde; o instalador continuará automaticamente.`n`nEndereço copiado:`n$authorizationUrl"
      Start-Process explorer.exe -ArgumentList $authorizationUrl
      Write-SetupLog "Página de autorização do Funnel aberta: $authorizationUrl"
    }
    Start-Sleep -Seconds 5
  } while ($openedAuthorization -and (Get-Date) -lt $deadline)
  throw "Não foi possível ativar o Funnel. $($output.Trim())"
}

function Complete-TailscaleLogin([string]$Executable) {
  $stdoutFile = Join-Path $env:TEMP 'rb-gestao-tailscale-login.out.log'
  $stderrFile = Join-Path $env:TEMP 'rb-gestao-tailscale-login.err.log'
  Remove-Item -LiteralPath $stdoutFile, $stderrFile -Force -ErrorAction SilentlyContinue
  Write-SetupLog 'Iniciando a autenticação no Tailscale.'
  $process = Start-Process -FilePath $Executable -ArgumentList 'up' -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile -PassThru
  $openedLogin = $false
  $deadline = (Get-Date).AddMinutes(15)
  try {
    do {
      $status = Get-TailscaleStatus $Executable
      if ($status -and $status.BackendState -eq 'Running' -and $status.Self.DNSName) {
        Write-SetupLog 'Autenticação no Tailscale concluída.'
        return $status
      }
      $loginOutput = ''
      if (Test-Path -LiteralPath $stdoutFile) { $loginOutput += Get-Content -Raw -LiteralPath $stdoutFile -ErrorAction SilentlyContinue }
      if (Test-Path -LiteralPath $stderrFile) { $loginOutput += "`n" + (Get-Content -Raw -LiteralPath $stderrFile -ErrorAction SilentlyContinue) }
      $loginUrl = [regex]::Match($loginOutput, 'https://[^\s]+').Value.TrimEnd('.', ',', ')')
      if (-not $openedLogin -and $loginUrl) {
        Start-Process $loginUrl
        $openedLogin = $true
        Write-SetupLog "Página de login aberta: $loginUrl"
      }
      if ($process.HasExited -and -not $openedLogin) {
        throw "O comando de autenticação foi encerrado antes de fornecer o endereço de login. $($loginOutput.Trim())"
      }
      Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw 'O tempo limite de 15 minutos para autenticação no Tailscale foi excedido.'
  } finally {
    if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
  }
}

function New-AccessToken {
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

try {
  Write-SetupLog 'Procurando uma instalação existente do Tailscale.'
  $tailscaleExe = Find-TailscaleExecutable
  if (-not $tailscaleExe) {
    Show-RBMessage 'O RB Gestão foi instalado. Agora, o instalador oficial do Tailscale será baixado e executado.'
    $architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } elseif ([Environment]::Is64BitOperatingSystem) { 'amd64' } else { 'x86' }
    $download = Join-Path $env:TEMP "tailscale-setup-latest-$architecture.msi"
    Invoke-WebRequest -UseBasicParsing -Uri "https://pkgs.tailscale.com/stable/tailscale-setup-latest-$architecture.msi" -OutFile $download
    Write-SetupLog "Tailscale baixado para $download."
    $installArguments = "/i `"$download`" /qn TS_UNATTENDEDMODE=always"
    $install = Start-Process -FilePath msiexec.exe -ArgumentList $installArguments -Wait -PassThru
    if ($install.ExitCode -notin @(0, 3010)) { throw "O instalador do Tailscale retornou o código $($install.ExitCode)." }
    Write-SetupLog "Instalação do Tailscale concluída com o código $($install.ExitCode)."
    $tailscaleExe = Wait-TailscaleExecutable 90
    if (-not $tailscaleExe) { throw 'O Tailscale foi instalado, mas o executável não foi localizado.' }
  }
  Write-SetupLog "Tailscale localizado em $tailscaleExe."

  $status = Get-TailscaleStatus $tailscaleExe
  if (-not $status -or $status.BackendState -ne 'Running') {
    Show-RBMessage 'Faça login no Tailscale usando a página indicada na próxima janela. A configuração continuará automaticamente assim que a autenticação for concluída.'
    $status = Complete-TailscaleLogin $tailscaleExe
  }

  $deadline = (Get-Date).AddMinutes(15)
  do {
    $status = Get-TailscaleStatus $tailscaleExe
    if ($status -and $status.BackendState -eq 'Running' -and $status.Self.DNSName) { break }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)
  if (-not $status -or $status.BackendState -ne 'Running' -or -not $status.Self.DNSName) {
    throw 'O tempo limite para concluir o login no Tailscale foi excedido. Abra o Tailscale, conclua a autenticação e execute novamente o instalador do RB Gestão.'
  }

  $dnsName = ([string]$status.Self.DNSName).Trim().TrimEnd('.')
  $publicUrl = "https://$dnsName"
  Write-SetupLog "Endereço público detectado: $publicUrl"

  $funnelOutput = Enable-RBFunnel $tailscaleExe $SyncPort

  $configFolder = Join-Path $env:APPDATA 'RB Gestão Financeira'
  $configFile = Join-Path $configFolder 'mobile-sync.json'
  New-Item -ItemType Directory -Force -Path $configFolder | Out-Null
  $accessToken = $null
  if (Test-Path -LiteralPath $configFile) {
    try { $accessToken = (Get-Content -Raw -LiteralPath $configFile | ConvertFrom-Json).accessToken } catch {}
  }
  if (-not $accessToken -or ([string]$accessToken).Length -lt 24) { $accessToken = New-AccessToken }
  [ordered]@{ accessToken = $accessToken; publicUrl = $publicUrl } |
    ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding UTF8
  Write-SetupLog "Configuração de acesso salva em $configFile."

  if ($ApplicationPath -and (Test-Path -LiteralPath $ApplicationPath)) {
    Start-Process -FilePath $ApplicationPath
  }

  $ready = $false
  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    try {
      $response = Invoke-RestMethod -Uri "$publicUrl/health" -Headers @{ Authorization = "Bearer $accessToken" } -TimeoutSec 5
      if ($response.ok) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
  }

  $mobileUrl = "$publicUrl/mobile?key=$([Uri]::EscapeDataString($accessToken))"
  $siteUrl = $mobileUrl
  $desktopFile = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Acesso RB Gestão.txt'
  $resultText = @"
RB GESTÃO FINANCEIRA - ACESSO REMOTO

Link do site:
$siteUrl

URL para configurar o aplicativo móvel:
$publicUrl

Chave de acesso do aplicativo móvel:
$accessToken

Status no momento da configuração: $(if ($ready) { 'ONLINE E TESTADO' } else { 'CONFIGURADO; O SERVIÇO PODE LEVAR ALGUNS SEGUNDOS PARA RESPONDER' })

Este computador deve permanecer ligado, com o RB Gestão e o Tailscale executando em segundo plano.
"@
  Set-Content -LiteralPath $desktopFile -Value $resultText -Encoding UTF8
  Write-SetupLog "Dados de acesso salvos em $desktopFile."
  Write-SetupLog "Configuração concluída. Teste de disponibilidade: $(if ($ready) { 'aprovado' } else { 'aguardando resposta' })."
  Set-Clipboard -Value $siteUrl
  Start-Process notepad.exe -ArgumentList ('"' + $desktopFile + '"')
  Show-RBMessage "Configuração concluída com sucesso.`n`nLink do site: $siteUrl`n`nA chave e todos os endereços foram salvos no arquivo 'Acesso RB Gestão.txt', na área de trabalho. O link do site também foi copiado para a área de transferência."
} catch {
  Write-SetupLog "ERRO: $($_.Exception.Message)"
  [System.Windows.Forms.MessageBox]::Show("O RB Gestão foi instalado, mas não foi possível concluir a configuração automática do acesso remoto.`n`n$($_.Exception.Message)`n`nConsulte os detalhes em: $logFile", 'RB Gestão Financeira', 'OK', 'Error') | Out-Null
  exit 1
}
