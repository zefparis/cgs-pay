# Test Congo Gaming Payout API

Write-Host "🧪 Testing Congo Gaming Payout API" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# API Base URL
$API_URL = "http://localhost:8080"
$SECRET = "dev-secret-change-in-production"

# Test health endpoint
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$API_URL/healthz" -Method Get
$health | ConvertTo-Json

# Test metrics endpoint  
Write-Host "`n2. Testing metrics endpoint..." -ForegroundColor Yellow
try {
    $metrics = Invoke-WebRequest -Uri "$API_URL/metrics" -Method Get
    Write-Host "Metrics endpoint returned status: $($metrics.StatusCode)" -ForegroundColor Green
    $metrics.Content.Substring(0, [Math]::Min(500, $metrics.Content.Length))
} catch {
    Write-Host "Metrics endpoint error: $_" -ForegroundColor Red
}

# Test settlement close-day
Write-Host "`n3. Testing settlement close-day..." -ForegroundColor Yellow
$payload = '{"dryRun":true}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($SECRET)
$hash = $hmac.ComputeHash($bytes)
$signature = [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()

$headers = @{
    "Content-Type" = "application/json"
    "X-CG-Signature" = $signature
}

try {
    $settlement = Invoke-RestMethod -Uri "$API_URL/v1/settlements/close-day" -Method Post -Headers $headers -Body $payload
    $settlement | ConvertTo-Json
} catch {
    Write-Host "Settlement error: $_" -ForegroundColor Red
}

# List settlements
Write-Host "`n4. Listing settlements..." -ForegroundColor Yellow
try {
    $runs = Invoke-RestMethod -Uri "$API_URL/v1/runs" -Method Get
    $runs | ConvertTo-Json -Depth 3
} catch {
    Write-Host "List runs error: $_" -ForegroundColor Red
}

# List payouts
Write-Host "`n5. Listing payouts..." -ForegroundColor Yellow
try {
    $payouts = Invoke-RestMethod -Uri "$API_URL/v1/payouts" -Method Get
    $payouts | ConvertTo-Json -Depth 3
} catch {
    Write-Host "List payouts error: $_" -ForegroundColor Red  
}

Write-Host "`n✅ API tests completed!" -ForegroundColor Green
