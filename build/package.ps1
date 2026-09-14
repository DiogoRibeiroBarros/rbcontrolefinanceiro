$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist 'stage'
$installerWork = Join-Path $dist 'installer-work'
$launcherName = 'RB_Gestao_Financeira.exe'
$launcherPath = Join-Path $dist $launcherName
$setupPath = Join-Path $dist 'RB_Gestao_Financeira_Setup.exe'
$payloadPath = Join-Path $installerWork 'payload.zip'
$iconPath = Join-Path $root 'app\assets\rb_gestao.ico'

if (Test-Path $dist) {
  Remove-Item -LiteralPath $dist -Recurse -Force
}

$iconHeader = [System.IO.File]::ReadAllBytes($iconPath)[0..3]
if (!($iconHeader[0] -eq 0 -and $iconHeader[1] -eq 0 -and $iconHeader[2] -eq 1 -and $iconHeader[3] -eq 0)) {
  $sourceIconImage = Join-Path $root 'app\assets\rb_gestao_icon_source.png'
  Copy-Item -LiteralPath $iconPath -Destination $sourceIconImage -Force
  $iconToolPath = Join-Path $env:TEMP 'RB_Gestao_IconTool.exe'
  $iconCompilerParameters = New-Object System.CodeDom.Compiler.CompilerParameters
  $iconCompilerParameters.GenerateExecutable = $true
  $iconCompilerParameters.OutputAssembly = $iconToolPath
  $iconCompilerParameters.CompilerOptions = '/target:exe /optimize+'
  $iconCompilerParameters.ReferencedAssemblies.Add('System.dll') | Out-Null
  $iconCompilerParameters.ReferencedAssemblies.Add('System.Drawing.dll') | Out-Null
  Add-Type -TypeDefinition (Get-Content -Raw (Join-Path $PSScriptRoot 'IconTool.cs')) -CompilerParameters $iconCompilerParameters
  & $iconToolPath $sourceIconImage $iconPath
}

New-Item -ItemType Directory -Force -Path $dist, $stage, $installerWork | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'app') -Destination (Join-Path $dist 'app') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root 'app') -Destination (Join-Path $stage 'app') -Recurse -Force

$compilerOptions = '/target:winexe /optimize+ /win32icon:"' + (Join-Path $root 'app\assets\rb_gestao.ico') + '"'
$compilerParameters = New-Object System.CodeDom.Compiler.CompilerParameters
$compilerParameters.GenerateExecutable = $true
$compilerParameters.OutputAssembly = $launcherPath
$compilerParameters.CompilerOptions = $compilerOptions
$compilerParameters.ReferencedAssemblies.Add('System.dll') | Out-Null
$compilerParameters.ReferencedAssemblies.Add('System.Windows.Forms.dll') | Out-Null
Add-Type -TypeDefinition (Get-Content -Raw (Join-Path $PSScriptRoot 'Launcher.cs')) -CompilerParameters $compilerParameters

Copy-Item -LiteralPath $launcherPath -Destination (Join-Path $stage $launcherName) -Force
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $payloadPath -Force

$setupCompilerParameters = New-Object System.CodeDom.Compiler.CompilerParameters
$setupCompilerParameters.GenerateExecutable = $true
$setupCompilerParameters.OutputAssembly = $setupPath
$setupCompilerParameters.CompilerOptions = '/target:winexe /optimize+ /win32icon:"' + (Join-Path $root 'app\assets\rb_gestao.ico') + '"'
$setupCompilerParameters.ReferencedAssemblies.Add('System.dll') | Out-Null
$setupCompilerParameters.ReferencedAssemblies.Add('System.Core.dll') | Out-Null
$setupCompilerParameters.ReferencedAssemblies.Add('System.Windows.Forms.dll') | Out-Null
$setupCompilerParameters.ReferencedAssemblies.Add('System.IO.Compression.dll') | Out-Null
$setupCompilerParameters.ReferencedAssemblies.Add('System.IO.Compression.FileSystem.dll') | Out-Null
$setupCompilerParameters.EmbeddedResources.Add($payloadPath) | Out-Null
Add-Type -TypeDefinition (Get-Content -Raw (Join-Path $PSScriptRoot 'Setup.cs')) -CompilerParameters $setupCompilerParameters

if (!(Test-Path $launcherPath)) {
  throw "Launcher não foi gerado: $launcherPath"
}
if (!(Test-Path $setupPath)) {
  throw "Instalador não foi gerado: $setupPath"
}

Remove-Item -LiteralPath $stage -Recurse -Force
Remove-Item -LiteralPath $installerWork -Recurse -Force

Write-Host "EXE gerado: $launcherPath"
Write-Host "Instalador gerado: $setupPath"
