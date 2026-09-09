# ============================================
#   Step 1: Get Your Vercel URL
# ============================================

$host.UI.RawUI.WindowTitle = "Get Vercel URL"

Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    Step 1 - Get Your Live Vercel URL" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  This will deploy your app and give you the URL." -ForegroundColor White
Write-Host "  You will then add that URL to Google Console." -ForegroundColor White
Write-Host ""
Write-Host "  Press ENTER to begin..." -ForegroundColor Yellow
Read-Host | Out-Null

# Go to app folder
Set-Location (Join-Path $PSScriptRoot "app")

# ── Vercel Login ─────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  Logging in to Vercel..." -ForegroundColor Yellow
Write-Host "  (Your browser will open — log in with Google or email)" -ForegroundColor Gray
Write-Host ""

vercel login

# ── First Deploy ──────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  Deploying to get your URL..." -ForegroundColor Yellow
Write-Host "  (Press ENTER for all questions)" -ForegroundColor Gray
Write-Host ""

$deployOutput = vercel --yes 2>&1
Write-Host $deployOutput

# Extract URL
$previewUrl = ($deployOutput | Select-String "https://.*\.vercel\.app" | Select-Object -Last 1).Matches[0].Value

if ([string]::IsNullOrWhiteSpace($previewUrl)) {
    Write-Host ""
    Write-Host "  Could not detect URL. Please check Vercel dashboard at vercel.com" -ForegroundColor Yellow
    $previewUrl = Read-Host "  Paste your Vercel URL here manually"
}

# Get production URL (project name based)
$prodUrl = $previewUrl -replace "-[a-z0-9]+-[a-z0-9]+\.vercel\.app", ".vercel.app"

Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "    YOUR VERCEL URL IS READY!" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Preview URL: $previewUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Yellow
Write-Host "    NOW DO THIS IN GOOGLE CONSOLE:" -ForegroundColor Yellow
Write-Host "  ============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Go to: console.cloud.google.com/auth/clients" -ForegroundColor White
Write-Host "  2. Click + Create Client" -ForegroundColor White
Write-Host "  3. Type: Web application" -ForegroundColor White
Write-Host "  4. Name: SEO Dashboard" -ForegroundColor White
Write-Host "  5. Under Authorized redirect URIs -> + Add URI" -ForegroundColor White
Write-Host "  6. Paste this EXACTLY:" -ForegroundColor White
Write-Host ""
Write-Host "     $previewUrl/api/auth/callback/google" -ForegroundColor Cyan
Write-Host ""
Write-Host "  7. Click Create" -ForegroundColor White
Write-Host "  8. COPY the Client ID and Client Secret from the popup" -ForegroundColor White
Write-Host "  9. Paste both in Claude chat" -ForegroundColor White
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Gray
Write-Host "  Saving your URL for the next step..." -ForegroundColor Gray

# Save URL to file for next script
$previewUrl | Out-File -FilePath (Join-Path $PSScriptRoot "vercel-url.txt") -Encoding UTF8

Write-Host ""
Write-Host "  URL saved! Now go do the Google Console steps above." -ForegroundColor Green
Write-Host "  Once you have Client ID + Secret, run: VERCEL DEPLOY KARO.bat" -ForegroundColor Yellow
Write-Host ""
Read-Host "  Press ENTER to exit"
