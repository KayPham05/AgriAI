# Run from PowerShell with any pnpm arguments, for example: .\pnpm.ps1 start
# Keep setup output on the host stream so command stdout remains pipeable.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$PSNativeCommandUseErrorActionPreference = $false
$pnpmArguments = @($args)
if ($pnpmArguments.Count -eq 0) {
    $pnpmArguments = @('start')
}

$projectRoot = $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.tools'
$nodeVersion = (Get-Content (Join-Path $projectRoot '.nvmrc') -Raw).Trim()
$package = Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
if ($nodeVersion -notmatch '^24\.\d+\.\d+$' -or $package.packageManager -notmatch '^pnpm@(\d+\.\d+\.\d+)$') {
    throw 'Expected a pinned Node 24 version in .nvmrc and pnpm version in packageManager.'
}
$pnpmVersion = $Matches[1]
if ($env:OS -ne 'Windows_NT' -or -not [Environment]::Is64BitOperatingSystem) {
    throw 'This portable launcher requires 64-bit Windows.'
}

$nodeFolder = "node-v$nodeVersion-win-x64"
$nodeDirectory = Join-Path $toolsRoot $nodeFolder
$nodeExecutable = Join-Path $nodeDirectory 'node.exe'
$npmCli = Join-Path $nodeDirectory 'node_modules/npm/bin/npm-cli.js'
$pnpmDirectory = Join-Path $toolsRoot 'pnpm'
$pnpmCli = Join-Path $pnpmDirectory 'node_modules/pnpm/bin/pnpm.cjs'
$pnpmManifest = Join-Path $pnpmDirectory 'node_modules/pnpm/package.json'
$originalPath = $env:Path
$originalCache = $env:npm_config_cache
$exitCode = 1

Push-Location $projectRoot
try {
    if (-not (Test-Path -LiteralPath $nodeExecutable)) {
        New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
        $archiveName = "$nodeFolder.zip"
        $archivePath = Join-Path $toolsRoot $archiveName
        $releaseUrl = "https://nodejs.org/dist/v$nodeVersion"
        Write-Host "Preparing project-local Node $nodeVersion..."
        $checksums = (Invoke-WebRequest -Uri "$releaseUrl/SHASUMS256.txt" -UseBasicParsing).Content
        $checksumPattern = '(?m)^([a-f0-9]{64})\s+' + [regex]::Escape($archiveName) + '\s*$'
        $checksumMatch = [regex]::Match($checksums, $checksumPattern)
        if (-not $checksumMatch.Success) {
            throw "Official SHA256 checksum not found for $archiveName."
        }
        Invoke-WebRequest -Uri "$releaseUrl/$archiveName" -OutFile $archivePath -UseBasicParsing
        if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ine $checksumMatch.Groups[1].Value) {
            throw 'Node archive checksum mismatch; refusing to extract or execute it.'
        }
        Expand-Archive -LiteralPath $archivePath -DestinationPath $toolsRoot -Force
        Remove-Item -LiteralPath $archivePath
    }

    $actualNodeVersion = (& $nodeExecutable --version | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $actualNodeVersion -ne "v$nodeVersion") {
        throw "Local runtime version mismatch: expected v$nodeVersion; got $actualNodeVersion."
    }
    # Process-only changes: finally restores them even when the child fails.
    $env:Path = "$nodeDirectory;$originalPath"
    $env:npm_config_cache = Join-Path $toolsRoot 'npm-cache'

    $installedPnpmVersion = $null
    if (Test-Path -LiteralPath $pnpmManifest) {
        $installedPnpmVersion = (Get-Content $pnpmManifest -Raw | ConvertFrom-Json).version
    }
    if ($installedPnpmVersion -ne $pnpmVersion -or -not (Test-Path -LiteralPath $pnpmCli)) {
        Write-Host "Preparing project-local pnpm $pnpmVersion..."
        & $nodeExecutable $npmCli install --prefix $pnpmDirectory --ignore-scripts --no-audit --no-fund --package-lock=false "pnpm@$pnpmVersion" | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not install project-local pnpm.'
        }
    }

    & $nodeExecutable $pnpmCli @pnpmArguments
    $exitCode = $LASTEXITCODE
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
} finally {
    $env:Path = $originalPath
    $env:npm_config_cache = $originalCache
    Pop-Location
}
exit $exitCode
