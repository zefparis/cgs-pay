Write-Host "Testing Congo Gaming Payout API..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/healthz" -Method Get
    Write-Host "`n✅ API is running!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json
    
    if ($response.services.database -eq "healthy") {
        Write-Host "`n✅ Database connection: HEALTHY" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ Database connection: UNHEALTHY" -ForegroundColor Yellow
    }
    
    if ($response.services.redis -eq "healthy") {
        Write-Host "✅ Redis connection: HEALTHY" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Redis connection: UNHEALTHY" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ API is not responding" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nTry running: npm run dev" -ForegroundColor Yellow
}
