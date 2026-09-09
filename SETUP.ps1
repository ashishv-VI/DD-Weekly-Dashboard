# ============================================
#   SEO Dashboard - One-Time Setup Script
#   Just follow the steps on screen
# ============================================

$host.UI.RawUI.WindowTitle = "SEO Dashboard Setup"

Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    SEO Dashboard - First Time Setup" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  This will take about 2 minutes." -ForegroundColor White
Write-Host "  I will open Google in your browser." -ForegroundColor White
Write-Host "  You just copy and paste 2 things." -ForegroundColor White
Write-Host ""
Write-Host "  Press ENTER to begin..." -ForegroundColor Yellow
Read-Host | Out-Null

# ── STEP 1: Enable APIs ──────────────────────────────────────────────────────

Clear-Host
Write-Host ""
Write-Host "  STEP 1 of 4 - Enable Google APIs" -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Opening 2 pages in your browser..." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 1
Start-Process "https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=seo-agent-490820"
Start-Sleep -Seconds 2
Start-Process "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com?project=seo-agent-490820"

Write-Host "  Your browser just opened 2 tabs." -ForegroundColor White
Write-Host ""
Write-Host "  In EACH tab:" -ForegroundColor White
Write-Host "    → Look for a blue   ENABLE   button" -ForegroundColor Green
Write-Host "    → Click it" -ForegroundColor Green
Write-Host "    → If it says  MANAGE  instead, the API is already enabled. " -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Done both tabs? Press ENTER to continue..." -ForegroundColor Yellow
Read-Host | Out-Null

# ── STEP 2: Add Redirect URI ─────────────────────────────────────────────────

Clear-Host
Write-Host ""
Write-Host "  STEP 2 of 4 - Add Redirect URI" -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Opening your Google OAuth credentials..." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 1
Start-Process "https://console.cloud.google.com/apis/credentials?project=seo-agent-490820"

Start-Sleep -Seconds 2

Write-Host "  In the browser:" -ForegroundColor White
Write-Host ""
Write-Host "    1. Click on  SEO Agent  (under OAuth 2.0 Client IDs)" -ForegroundColor Green
Write-Host "    2. Scroll down to  Authorized redirect URIs" -ForegroundColor Green
Write-Host "    3. Click  + ADD URI" -ForegroundColor Green
Write-Host "    4. Paste this exactly:" -ForegroundColor Green
Write-Host ""
Write-Host "       http://localhost:3000/api/auth/callback/google" -ForegroundColor Yellow
Write-Host ""
Write-Host "    5. Click  SAVE  at the bottom" -ForegroundColor Green
Write-Host ""
Write-Host "  Done? Press ENTER to continue..." -ForegroundColor Yellow
Read-Host | Out-Null

# ── STEP 3: Get Credentials ──────────────────────────────────────────────────

Clear-Host
Write-Host ""
Write-Host "  STEP 3 of 4 - Copy Your Credentials" -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  You should still be on the SEO Agent page in your browser." -ForegroundColor White
Write-Host "  (If not, go back to Credentials and click SEO Agent again)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Find  Client ID  at the top of the page." -ForegroundColor White
Write-Host "  It looks like:  390018475259-xxxx...apps.googleusercontent.com" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Paste your Client ID here and press ENTER:" -ForegroundColor Yellow
$clientId = Read-Host "  Client ID"

Write-Host ""
Write-Host "  Now find  Client Secret  just below the Client ID." -ForegroundColor White
Write-Host "  Click the copy icon next to it." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Paste your Client Secret here and press ENTER:" -ForegroundColor Yellow
$clientSecret = Read-Host "  Client Secret"

# ── STEP 4: Write config and start ───────────────────────────────────────────

Clear-Host
Write-Host ""
Write-Host "  STEP 4 of 4 - Finishing Setup..." -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# Generate a secure random secret
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

# Write .env.local
$envPath = Join-Path $PSScriptRoot "app\.env.local"
$envContent = "DATABASE_URL=`"file:./dev.db`"`nNEXTAUTH_URL=`"http://localhost:3000`"`nNEXTAUTH_SECRET=`"$secret`"`nGOOGLE_CLIENT_ID=`"$clientId`"`nGOOGLE_CLIENT_SECRET=`"$clientSecret`""
[System.IO.File]::WriteAllText($envPath, $envContent, [System.Text.Encoding]::UTF8)

Write-Host "  Credentials saved." -ForegroundColor Green
Write-Host ""
Write-Host "  Starting the dashboard server..." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 2

# Open browser
Start-Process "http://localhost:3000"

Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    Dashboard is starting!" -ForegroundColor Cyan
Write-Host "    Your browser will open automatically." -ForegroundColor Cyan
Write-Host "    Click  Sign in with Google  to log in." -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# Start the dev server
Set-Location (Join-Path $PSScriptRoot "app")
npm run dev
