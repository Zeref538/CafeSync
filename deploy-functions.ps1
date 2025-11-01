# Cloud Run Deployment Script for CafeSync
# This script helps you deploy your functions to Google Cloud Run

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Cloud Run Deployment Guide for CafeSync" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
$gcloudInstalled = $false
$gcloudCheck = & {
    try {
        $null = gcloud --version 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

if ($gcloudCheck) {
    $gcloudInstalled = $true
    Write-Host "✓ gcloud CLI is installed" -ForegroundColor Green
    Write-Host ""
} else {
    $gcloudInstalled = $false
}

if (-not $gcloudInstalled) {
    Write-Host "⚠ gcloud CLI is NOT installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You have TWO options:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OPTION 1: Use Google Cloud Console (No installation needed)" -ForegroundColor Green
    Write-Host "  1. Open: https://console.cloud.google.com/run" -ForegroundColor White
    Write-Host "  2. Select project: cafesync-3b25a" -ForegroundColor White
    Write-Host "  3. Click on your 'api' service" -ForegroundColor White
    Write-Host "  4. Click 'EDIT & DEPLOY NEW REVISION'" -ForegroundColor White
    Write-Host "  5. Use Cloud Shell (click >_ icon) OR upload source" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTION 2: Install gcloud CLI" -ForegroundColor Green
    Write-Host "  1. Download: https://cloud.google.com/sdk/docs/install" -ForegroundColor White
    Write-Host "  2. Install the SDK" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening deployment guide..." -ForegroundColor Yellow
    Start-Process "CLOUD_RUN_DEPLOYMENT_GUIDE.md"
    exit
}

# gcloud is installed, proceed with deployment
Write-Host "Checking authentication..." -ForegroundColor Yellow
gcloud auth list --format="value(account)" | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ You need to authenticate first" -ForegroundColor Yellow
    Write-Host "  Running: gcloud auth login" -ForegroundColor White
    gcloud auth login
}

Write-Host ""
Write-Host "Setting project to cafesync-3b25a..." -ForegroundColor Yellow
gcloud config set project cafesync-3b25a

Write-Host ""
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Gray
Write-Host "Functions folder: functions\index.js" -ForegroundColor Gray

Write-Host ""
Write-Host "Ready to deploy! This will:" -ForegroundColor Cyan
Write-Host "  - Deploy from: functions/ folder" -ForegroundColor White
Write-Host "  - Service name: api" -ForegroundColor White
Write-Host "  - Region: us-central1" -ForegroundColor White
Write-Host "  - Make it publicly accessible" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Deploy now? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host "This may take 2-5 minutes..." -ForegroundColor Gray
Write-Host ""

# Deploy
gcloud run deploy api --source functions --region us-central1 --allow-unauthenticated

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your API URL: https://api-rr3ogyefda-uc.a.run.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Test your app: https://cafesync-3b25a.web.app/analytics" -ForegroundColor White
    Write-Host "  2. Try clicking 'Helpful' or 'Not Useful' on recommendations" -ForegroundColor White
    Write-Host "  3. Check that peak hours heatmap shows today's orders" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "✗ Deployment failed. Check the error messages above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Authentication: Run 'gcloud auth login'" -ForegroundColor White
    Write-Host "  - Permissions: Make sure you have Cloud Run Admin role" -ForegroundColor White
    Write-Host "  - Service name: The service might be named differently" -ForegroundColor White
    Write-Host ""
    Write-Host "Check the full guide: CLOUD_RUN_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
}

