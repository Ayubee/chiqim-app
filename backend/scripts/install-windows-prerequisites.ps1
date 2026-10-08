# Installs only the verified packages downloaded for this project. Never reboots.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $backendRoot '.local-tools'
$installers = Join-Path $toolsRoot 'installers'
$principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'PowerShell must be opened as Administrator.'
}
# Conservative headroom for Windows servicing, MSI cache and temporary files.
$freeGB = (Get-Volume -DriveLetter C).SizeRemaining / 1GB
if ($freeGB -lt 10) {
    Write-Output ('Installation not started: C: has {0:N1} GB free; prepare at least 10 GB of headroom first. No user files were deleted.' -f $freeGB)
    exit 2
}
function Assert-VerifiedPackage([string]$Path, [string]$Publisher, [string]$Hash) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Missing installer: $Path" }
    $signature = Get-AuthenticodeSignature -LiteralPath $Path
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch $Publisher) {
        throw 'Installer signature/publisher check failed. No installation performed.'
    }
    if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Hash) {
        throw 'Installer SHA256 differs from the verified vendor/winget metadata.'
    }
}
$wslInstaller = Join-Path $installers 'wsl.3.0.1.0.x64.msi'
$dockerInstaller = Join-Path $installers 'DockerDesktopInstaller-4.94.0.exe'
Assert-VerifiedPackage $wslInstaller 'O=Microsoft Corporation' '28b1a0d013640a2ac95898ea705fa186e5b4ff767a1c1b49257161bc106599c6'
Assert-VerifiedPackage $dockerInstaller 'O=Docker Inc' 'a9814e31049d66156477a86614e83365669677733014ec72f74229623ff3890a'
New-Item -ItemType Directory -Path (Join-Path $toolsRoot 'temp') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $toolsRoot 'logs') -Force | Out-Null
$env:TEMP = Join-Path $toolsRoot 'temp'
$env:TMP = $env:TEMP
$restartNeeded = $false
$wslVersion = & wsl.exe --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output 'Installing Microsoft WSL; automatic restart is disabled.'
    $msiLog = Join-Path $toolsRoot 'logs/wsl-install.log'
    $result = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', ('"{0}"' -f $wslInstaller), '/qn', '/norestart', '/l*v', ('"{0}"' -f $msiLog)) -WindowStyle Hidden -Wait -PassThru
    if ($result.ExitCode -notin @(0,3010)) { throw "WSL installation failed, exit code $($result.ExitCode). Log: $msiLog" }
    $restartNeeded = $result.ExitCode -eq 3010
}
$feature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
if ($feature.State -ne 'Enabled') {
    Write-Output 'Enabling VirtualMachinePlatform; automatic restart is disabled.'
    $enabled = Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart
    $restartNeeded = $true
}
if ($restartNeeded) {
    Write-Output 'Windows restart required. Save your work, restart manually, and rerun this script. Supabase has not been started or reset.'
    exit 3010
}
$dockerRoot = Join-Path $toolsRoot 'docker-desktop'
$dockerData = Join-Path $toolsRoot 'docker-data'
if (-not (Test-Path -LiteralPath (Join-Path $dockerRoot 'Docker Desktop.exe'))) {
    Write-Output 'Installing Docker Desktop on D: with its WSL data on D:. The license is not automatically accepted.'
    $arguments = @('install', '--quiet', '--backend=wsl-2', '--no-windows-containers', ('--installation-dir="{0}"' -f $dockerRoot), ('--wsl-default-data-root="{0}"' -f $dockerData))
    $result = Start-Process -FilePath $dockerInstaller -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
    if ($result.ExitCode -notin @(0,3010)) { throw "Docker Desktop installation failed, exit code $($result.ExitCode)." }
    if ($result.ExitCode -eq 3010) { Write-Output 'Docker installation requires a manual restart.'; exit 3010 }
}
Write-Output 'Prerequisites installed. Open Docker Desktop, review/accept its agreement yourself, and wait for the Linux engine. Then run npm.cmd run local:setup from backend. No database reset performed.'
