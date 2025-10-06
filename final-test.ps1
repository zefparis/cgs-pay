Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Final Congo Gaming Payout Service Test" -ForegroundColor Cyan  
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test API endpoint
Write-Host "Testing API at http://localhost:8080/healthz..." -ForegroundColor Yellow

$maxAttempts = 3
$attempt = 1
$success = $false

while ($attempt -le $maxAttempts -and -not $success) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/healthz" -Method Get -TimeoutSec 2
        $content = $response.Content | ConvertFrom-Json
        
        Write-Host ""
        Write-Host "✅ SUCCESS! API is running!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "API Status: $($content.status)" -ForegroundColor Green
        Write-Host "Database: $($content.services.database)" -ForegroundColor $(if($content.services.database -eq 'healthy'){'Green'}else{'Yellow'})
        Write-Host "Redis: $($content.services.redis)" -ForegroundColor $(if($content.services.redis -eq 'healthy'){'Green'}else{'Yellow'})
        Write-Host ""
        Write-Host "🎉 The Congo Gaming Payout Service is operational!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now:" -ForegroundColor Cyan
        Write-Host "  1. Trigger settlements at /v1/settlements/close-day" -ForegroundColor White
        Write-Host "  2. View payouts at /v1/payouts" -ForegroundColor White
        Write-Host "  3. Check metrics at /metrics" -ForegroundColor White
        Write-Host "  4. Open Prisma Studio: npm run studio" -ForegroundColor White
        
        $success = $true
    } catch {
        Write-Host "Attempt $attempt of $maxAttempts failed..." -ForegroundColor Yellow
        
        if ($attempt -eq $maxAttempts) {
            Write-Host ""
            Write-Host "❌ API is not responding" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please ensure:" -ForegroundColor Yellow
            Write-Host "  1. Docker containers are running:" -ForegroundColor White
            Write-Host "     docker start postgres-alt redis-alt" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  2. The .env file has correct ports:" -ForegroundColor White
            Write-Host "     DATABASE_URL should use port 5433" -ForegroundColor Gray
            Write-Host "     REDIS_URL should use port 6380" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  3. Start the API server:" -ForegroundColor White
            Write-Host "     npm run dev" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  Or try standalone mode (no Redis required):" -ForegroundColor Yellow
            Write-Host "     npm run start:standalone" -ForegroundColor Gray
        } else {
            Start-Sleep -Seconds 2
        }
        $attempt++
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
