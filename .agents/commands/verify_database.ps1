param([string]$BaseUrl)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(20)
$marker = 'dbcheck_' + [Guid]::NewGuid().ToString('N')
$email = "$marker@example.com"
$otherEmail = "${marker}_other@example.com"
$password = [Guid]::NewGuid().ToString('N') + 'Aa1!'
$plantId = $null
$diseaseId = $null
$classId = [Guid]::NewGuid().ToString()
$predictionId = [Guid]::NewGuid().ToString()

function Sql([string]$Statement) {
    $output = $Statement | & docker compose exec -T postgres psql -X -w -U agrivision_user -d agrivision_db -v ON_ERROR_STOP=1 -qAt
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL verification command failed.' }
    return ($output -join "`n").Trim()
}

function Request([string]$Method, [string]$Path, $Body = $null, [int]$Expected = 200, [string]$Token = '') {
    $request = New-Object System.Net.Http.HttpRequestMessage ([System.Net.Http.HttpMethod]::new($Method)), "$BaseUrl$Path"
    if ($Body) {
        $request.Content = [System.Net.Http.StringContent]::new(($Body | ConvertTo-Json -Depth 20 -Compress), [Text.Encoding]::UTF8, 'application/json')
    }
    if ($Token) { $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Token) }
    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        try {
            if ([int]$response.StatusCode -ne $Expected) { throw "$Method $Path returned $([int]$response.StatusCode), expected $Expected." }
            $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            if ($text) { return $text | ConvertFrom-Json }
        } finally { $response.Dispose() }
    } finally { $request.Dispose() }
}

function Assert([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

try {
    & docker compose config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Invalid Compose configuration.' }
    if (-not $BaseUrl) {
        $port = & docker compose port backend 8080
        if ($LASTEXITCODE -ne 0 -or -not $port) { throw 'Backend is not running in Compose.' }
        $BaseUrl = 'http://127.0.0.1:' + (($port | Select-Object -First 1) -split ':')[-1]
    }
    $health = Request GET '/api/health'
    Assert ($health.checks.database -eq 'Healthy') 'Backend cannot connect to PostgreSQL.'
    $expectedMigrations = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '../../backend/src/AgriVision.Infrastructure/Persistence/Migrations') |
        Where-Object { $_.Name -match '^\d{14}_[^.]+\.cs$' } | ForEach-Object { $_.BaseName } | Sort-Object)
    $appliedMigrations = @((Sql 'SELECT "MigrationId" FROM public."__EFMigrationsHistory" ORDER BY "MigrationId";') -split '\r?\n')
    Assert (($expectedMigrations -join ',') -eq ($appliedMigrations -join ',')) 'Source migrations and applied migrations differ.'
    Write-Host 'PASS: image backend connects to PostgreSQL; source migrations match database history.'

    $auth = Request POST '/api/auth/register' @{ fullName = 'Database smoke test'; email = $email; password = $password }
    Assert ((Sql "SELECT count(*) FROM users WHERE email = '$email' AND password_hash IS NOT NULL;") -eq '1') 'Registration was not persisted.'
    # Elevate only this newly-created fixture account to exercise protected catalog CRUD.
    Sql "UPDATE users SET role = 'Admin' WHERE id = '$($auth.user.id)' AND email = '$email';" | Out-Null
    $auth = Request POST '/api/auth/login' @{ email = $email; password = $password }
    $me = Request GET '/api/auth/me' -Token $auth.token
    Assert ($me.email -eq $email -and $me.role -eq 'Admin') 'Authenticated database read failed.'
    Write-Host 'PASS: register/write, login/read, authenticated account read.'

    $plant = Request POST '/api/plants' @{ name = $marker; vietnameseName = 'Test'; description = 'Smoke fixture' } -Expected 201 -Token $auth.token
    $plantId = $plant.id
    Assert ((Sql "SELECT count(*) FROM plants WHERE id = '$plantId' AND name = '$marker';") -eq '1') 'Plant create was not persisted.'
    $plant = Request PUT "/api/plants/$plantId" @{ name = $marker; vietnameseName = 'Updated'; description = 'Updated fixture'; isActive = $true } -Token $auth.token
    Assert ((Sql "SELECT vietnamese_name FROM plants WHERE id = '$plantId';") -eq 'Updated') 'Plant update was not persisted.'
    $plant = Request GET "/api/plants/$plantId"
    $disease = Request POST '/api/diseases' @{ name = $marker; vietnameseName = 'Test condition'; description = 'Original fixture' } -Expected 201 -Token $auth.token
    $diseaseId = $disease.id
    Write-Host 'PASS: API catalog create/read/update is persisted in the real database.'

    # History fixture is synthetic SQL data, not an AI prediction or model validation.
    $fixtureClassIndex = [int](Sql 'SELECT COALESCE(max(class_index), -1) + 1 FROM plant_diseases;')
    $snapshot = @{
        id = $predictionId; imagePath = '/no-physical-smoke-image.jpg'; imagePublicId = $null
        predictedPlantDisease = @{ id = $classId; plantId = $plantId; diseaseId = $diseaseId; className = $marker; classIndex = $fixtureClassIndex; isActive = $true; plant = $plant; disease = $disease }
        confidence = 0.9; predictionDetails = @(); createdAt = [DateTime]::UtcNow.ToString('o')
        images = @(); hasHistoricalSnapshot = $true; informationPending = $true
    } | ConvertTo-Json -Depth 20 -Compress
    # All interpolated SQL values are generated UUIDs/hex markers, never caller input.
    Sql @"
BEGIN;
INSERT INTO plant_diseases (id, plant_id, disease_id, class_name, class_index)
VALUES ('$classId', '$plantId', '$diseaseId', '$marker', $fixtureClassIndex);
INSERT INTO predictions (id, user_id, image_path, predicted_plant_disease_id, confidence, created_at, result_snapshot)
VALUES ('$predictionId', '$($auth.user.id)', '/no-physical-smoke-image.jpg', '$classId', 0.9, now(), '$snapshot'::jsonb);
INSERT INTO prediction_images (id, prediction_id, position, image_path, confidence, uploaded_at, expires_at)
VALUES ('$predictionId', '$predictionId', 0, '/no-physical-smoke-image.jpg', 0.9, now() - interval '31 days', now() - interval '1 day');
UPDATE diseases SET description = 'Changed after snapshot' WHERE id = '$diseaseId';
COMMIT;
"@ | Out-Null
    $stored = Request GET "/api/predictions/$predictionId" -Token $auth.token
    Assert ($stored.predictedPlantDisease.disease.description -eq 'Original fixture') 'History snapshot changed with the catalog.'
    Assert ($stored.images[0].isExpired -and -not $stored.images[0].imagePath -and -not $stored.imagePath) 'Expired image URL was exposed.'
    $history = Request GET '/api/predictions' -Token $auth.token
    Assert ($history.totalCount -eq 1) 'History was lost after image expiry.'
    $other = Request POST '/api/auth/register' @{ fullName = 'Other smoke user'; email = $otherEmail; password = $password }
    Request GET "/api/predictions/$predictionId" -Expected 404 -Token $other.token | Out-Null
    Request GET "/api/predictions/$predictionId" -Expected 401 | Out-Null
    Request DELETE "/api/predictions/$predictionId" -Expected 204 -Token $auth.token | Out-Null
    Assert ((Sql "SELECT count(*) FROM prediction_images WHERE prediction_id = '$predictionId';") -eq '0') 'Image metadata did not cascade on history deletion.'
    Write-Host 'PASS: synthetic history snapshot, expired image state, ownership and deletion.'

    Sql "DELETE FROM plant_diseases WHERE id = '$classId';" | Out-Null
    Request DELETE "/api/diseases/$diseaseId" -Expected 204 -Token $auth.token | Out-Null
    Request DELETE "/api/plants/$plantId" -Expected 204 -Token $auth.token | Out-Null
    Assert ((Sql "SELECT count(*) FROM plants WHERE id = '$plantId' AND is_active = false;") -eq '1') 'API catalog soft deletion was not persisted.'
    Assert ((Sql "SELECT count(*) FROM diseases WHERE id = '$diseaseId' AND is_active = false;") -eq '1') 'API disease soft deletion was not persisted.'
    Write-Host 'PASS: API catalog soft deletion is persisted. No inference/model accuracy was tested.'
} finally {
    try {
        # Delete only fixtures of this run, even if an assertion or request failed.
        Sql "DELETE FROM predictions WHERE id = '$predictionId'; DELETE FROM plant_diseases WHERE id = '$classId';" | Out-Null
        if ($diseaseId) { Sql "DELETE FROM diseases WHERE id = '$diseaseId';" | Out-Null }
        if ($plantId) { Sql "DELETE FROM plants WHERE id = '$plantId';" | Out-Null }
        # Cover the case where POST committed but its HTTP response was interrupted.
        Sql "DELETE FROM diseases WHERE name = '$marker'; DELETE FROM plants WHERE name = '$marker'; DELETE FROM users WHERE email IN ('$email', '$otherEmail');" | Out-Null
        Assert ((Sql "SELECT (SELECT count(*) FROM users WHERE email IN ('$email', '$otherEmail')) + (SELECT count(*) FROM plants WHERE name = '$marker') + (SELECT count(*) FROM diseases WHERE name = '$marker');") -eq '0') 'Fixture cleanup was incomplete.'
        Write-Host 'CLEANUP PASS: all test accounts, catalog and history fixtures removed; no image files were uploaded.'
    } finally { $client.Dispose() }
}
