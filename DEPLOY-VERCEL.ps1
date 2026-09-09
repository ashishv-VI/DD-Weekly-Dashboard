# ============================================
#   SEO Dashboard - Vercel Deploy Script
# ============================================

$host.UI.RawUI.WindowTitle = "SEO Dashboard - Deploy to Vercel"

Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    SEO Dashboard - Deploy to Vercel" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# ── Get Client Secret ────────────────────────────────────────────────────────
Write-Host "  Step 1 - Enter your Google credentials" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Client ID (already known):" -ForegroundColor Gray
Write-Host "  390018475259-nohhku2vvans0co7ef4h1h3k7ir4v62v.apps.googleusercontent.com" -ForegroundColor White
Write-Host ""
Write-Host "  Paste your NEW Client Secret and press ENTER:" -ForegroundColor Yellow
$clientSecret = Read-Host "  Client Secret"

if ([string]::IsNullOrWhiteSpace($clientSecret)) {
    Write-Host ""
    Write-Host "  ERROR: Client Secret cannot be empty." -ForegroundColor Red
    Write-Host "  Please go to Google Console, click + Add secret, and paste the new secret." -ForegroundColor Red
    Read-Host "  Press ENTER to exit"
    exit
}

$clientId = "390018475259-nohhku2vvans0co7ef4h1h3k7ir4v62v.apps.googleusercontent.com"

# Generate secure NEXTAUTH_SECRET
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
$nextAuthSecret = [Convert]::ToBase64String($bytes)

# ── Vercel Login ─────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  Step 2 - Login to Vercel" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Your browser will open. Log in with your Vercel account." -ForegroundColor White
Write-Host "  (Use the same Google account or email you use for Vercel)" -ForegroundColor Gray
Write-Host ""

Set-Location (Join-Path $PSScriptRoot "app")
vercel login

# ── Deploy ───────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  Step 3 - Deploying to Vercel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  When asked questions, press ENTER to accept defaults." -ForegroundColor Gray
Write-Host ""

# Deploy and capture URL
$deployOutput = vercel --yes 2>&1
Write-Host $deployOutput

# Extract preview URL
$previewUrl = ($deployOutput | Select-String "https://.*\.vercel\.app" | Select-Object -Last 1).Matches[0].Value

if ([string]::IsNullOrWhiteSpace($previewUrl)) {
    $previewUrl = "https://your-app.vercel.app"
    Write-Host "  Could not detect URL automatically. Check Vercel dashboard for your URL." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "  Deployed to: $previewUrl" -ForegroundColor Green
}

# ── Set Environment Variables ─────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  Step 4 - Setting environment variables on Vercel..." -ForegroundColor Yellow
Write-Host ""

$env:VERCEL_FORCE_NO_PROGRESS = "1"

# Set each env var
$envVars = @{
    "NEXTAUTH_URL"           = $previewUrl
    "NEXTAUTH_SECRET"        = $nextAuthSecret
    "GOOGLE_CLIENT_ID"       = $clientId
    "GOOGLE_CLIENT_SECRET"   = $clientSecret
}

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "  Setting $key..." -ForegroundColor Gray
    echo $value | vercel env add $key production --force 2>&1 | Out-Null
    echo $value | vercel env add $key preview --force 2>&1 | Out-Null
}

Write-Host "  Environment variables set." -ForegroundColor Green

# ── Final Deploy with env vars ────────────────────────────────────────────────
Write-Host ""
Write-Host "  Step 5 - Final production deploy..." -ForegroundColor Yellow
Write-Host ""

vercel --prod --yes 2>&1 | Tee-Object -Variable prodOutput
$prodUrl = ($prodOutput | Select-String "https://.*\.vercel\.app" | Select-Object -Last 1).Matches[0].Value

if ([string]::IsNullOrWhiteSpace($prodUrl)) {
    $prodUrl = $previewUrl
}

# ── Done ──────────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "    DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Your dashboard URL:" -ForegroundColor White
Write-Host "  $prodUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  IMPORTANT - One last step in Google Console:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Go to: console.cloud.google.com/apis/credentials" -ForegroundColor White
Write-Host "  Click SEO Agent -> Authorized redirect URIs -> + Add URI" -ForegroundColor White
Write-Host "  Paste this:" -ForegroundColor White
Write-Host "  $prodUrl/api/auth/callback/google" -ForegroundColor Cyan
Write-Host "  Click Save" -ForegroundColor White
Write-Host ""
Write-Host "  Then open your dashboard:" -ForegroundColor White
Write-Host "  $prodUrl" -ForegroundColor Cyan
Write-Host ""

Start-Process $prodUrl

Write-Host "  Press ENTER to exit..." -ForegroundColor Gray
Read-Host | Out-Null
