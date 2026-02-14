# ====================================================
# FUNCTIONAL TEST SCRIPT - MONITORING APPLICATION
# ====================================================
# Testing: API Endpoints, Database, Google Sheets Integration
# Author: Automated Testing
# Date: January 23, 2026

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "MONITORING APP - FUNCTIONAL TESTING" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$testResults = @()

# Function to test API endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  URL: $Url" -ForegroundColor Gray
    Write-Host "  Method: $Method" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            UseBasicParsing = $true
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-WebRequest @params
        $content = $response.Content | ConvertFrom-Json
        
        Write-Host "  ✅ Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Response: $($content | ConvertTo-Json -Compress -Depth 2)" -ForegroundColor Gray
        Write-Host ""
        
        return @{
            Name = $Name
            Status = "PASS"
            StatusCode = $response.StatusCode
            Response = $content
        }
    }
    catch {
        Write-Host "  ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        
        return @{
            Name = $Name
            Status = "FAIL"
            Error = $_.Exception.Message
        }
    }
}

# ====================================================
# TEST 1: Database Connection & Fetch Nodes
# ====================================================
Write-Host "`n[TEST 1] Database - Fetch All Nodes" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
$test1 = Test-Endpoint -Name "GET /api/nodes" -Url "$baseUrl/api/nodes"
$testResults += $test1

if ($test1.Status -eq "PASS") {
    $nodeCount = $test1.Response.data.Count
    Write-Host "📊 Total Nodes in Database: $nodeCount" -ForegroundColor Cyan
    
    if ($nodeCount -gt 0) {
        Write-Host "`nNode Details:" -ForegroundColor White
        foreach ($node in $test1.Response.data) {
            Write-Host "  • Name: $($node.name)" -ForegroundColor White
            Write-Host "    URL: $($node.url)" -ForegroundColor Gray
            Write-Host "    Status: $($node.status)" -ForegroundColor Gray
            Write-Host "    Group: $($node.group)" -ForegroundColor Gray
        }
    }
}

# ====================================================
# TEST 2: Create New Node (POST)
# ====================================================
Write-Host "`n[TEST 2] Database - Create New Node" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta

$newNodeData = @{
    name = "Test Node $(Get-Date -Format 'HHmmss')"
    url = "https://example.com/api/health"
    group = "Backend"
    dependencies = @()
}

$test2 = Test-Endpoint -Name "POST /api/nodes" -Url "$baseUrl/api/nodes" -Method "POST" -Body $newNodeData
$testResults += $test2

# ====================================================
# TEST 3: Google Sheets Configuration Check
# ====================================================
Write-Host "`n[TEST 3] Google Sheets - Configuration Check" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
$test3 = Test-Endpoint -Name "GET /api/google-sheets/sync" -Url "$baseUrl/api/google-sheets/sync"
$testResults += $test3

# ====================================================
# TEST 4: Google Sheets Sync (POST)
# ====================================================
Write-Host "`n[TEST 4] Google Sheets - Sync Data" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta

$syncData = @{
    deleteOrphaned = $false
}

$test4 = Test-Endpoint -Name "POST /api/google-sheets/sync" -Url "$baseUrl/api/google-sheets/sync" -Method "POST" -Body $syncData
$testResults += $test4

# ====================================================
# TEST 5: Health Check Cron
# ====================================================
Write-Host "`n[TEST 5] Cron - Health Check Endpoint" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
$test5 = Test-Endpoint -Name "GET /api/cron/check" -Url "$baseUrl/api/cron/check"
$testResults += $test5

# ====================================================
# SUMMARY REPORT
# ====================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalTests = $testResults.Count

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""

foreach ($result in $testResults) {
    $icon = if ($result.Status -eq "PASS") { "✅" } else { "❌" }
    $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "$icon $($result.Name): $($result.Status)" -ForegroundColor $color
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Save results to file
$testResults | ConvertTo-Json -Depth 5 | Out-File "test-results.json"
Write-Host "📄 Detailed results saved to: test-results.json" -ForegroundColor Cyan
