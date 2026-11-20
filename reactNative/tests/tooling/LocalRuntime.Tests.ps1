$ErrorActionPreference = 'Stop'

function Assert-Equal($Actual, $Expected, [string]$Message) {
    if ($Actual -cne $Expected) {
        throw "$Message. Expected: '$Expected'; actual: '$Actual'."
    }
}

$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$launcher = Join-Path $projectRoot 'pnpm.ps1'
if (-not (Test-Path -LiteralPath $launcher)) {
    throw 'Project-local Node launcher has not been implemented.'
}

$expectedNode = (Get-Content (Join-Path $projectRoot '.nvmrc') -Raw).Trim()
$originalPath = $env:Path
$originalCache = $env:npm_config_cache
$originalDirectory = (Get-Location).Path
$originalNode = (& node --version | Out-String).Trim()
$originalNpm = (& npm --version | Out-String).Trim()
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')

# Invoke from outside the mobile folder: the launcher must choose its own root.
Push-Location (Split-Path $projectRoot -Parent)
try {
    $result = (& $launcher exec node --version | Out-String).Trim()
    Assert-Equal $LASTEXITCODE 0 'Node command should succeed'
    Assert-Equal $result "v$expectedNode" 'Mobile command must use the pinned Node'

    $npmVersion = (& $launcher exec npm --version | Out-String).Trim()
    Assert-Equal $LASTEXITCODE 0 'Local npm should succeed'
    if ([int]($npmVersion.Split('.')[0]) -lt 8) {
        throw 'Mobile commands must not inherit legacy system npm.'
    }

    & $launcher exec node -e 'process.exit(7)'
    Assert-Equal $LASTEXITCODE 7 'Child failure exit code must be preserved'

    Assert-Equal $env:Path $originalPath 'Process PATH must be restored after success and failure'
    Assert-Equal $env:npm_config_cache $originalCache 'npm cache environment must be restored'
    Assert-Equal (Get-Location).Path (Split-Path $projectRoot -Parent) 'Caller directory must be restored'
    Assert-Equal ((& node --version | Out-String).Trim()) $originalNode 'Default Node must remain unchanged'
    Assert-Equal ((& npm --version | Out-String).Trim()) $originalNpm 'Default npm must remain unchanged'
    Assert-Equal ([Environment]::GetEnvironmentVariable('Path', 'User')) $userPath 'User PATH must remain unchanged'
    Assert-Equal ([Environment]::GetEnvironmentVariable('Path', 'Machine')) $machinePath 'Machine PATH must remain unchanged'
} finally {
    Pop-Location
}

Assert-Equal (Get-Location).Path $originalDirectory 'Test must restore the original directory'
Write-Output "PASS: local Node $expectedNode, local npm, child exit code, PATH/cache/directory isolation and unchanged default tools."
