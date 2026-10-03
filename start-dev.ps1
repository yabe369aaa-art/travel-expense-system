# 開発環境一括起動スクリプト (PowerShell)
# 使用方法: .\start-dev.ps1

param(
    [switch]$WithCloudflare
)

Write-Host "🚀 開発環境を起動します..." -ForegroundColor Green

# 既存プロセスのクリーンアップ
Write-Host "🧹 既存プロセスをクリーンアップ..." -ForegroundColor Yellow
$processes = @(
    "tsx", "vite", "cloudflared"
)
foreach ($proc in $processes) {
    Get-Process -Name $proc -ErrorAction SilentlyContinue | Stop-Process -Force
}

# 依存関係チェック
Write-Host "📦 依存関係を確認..." -ForegroundColor Cyan
npm install

# DB初期化
Write-Host "🗄️  データベース初期化..." -ForegroundColor Magenta
npm run db:generate
npm run db:push
npm run db:seed

# バックエンド起動
Write-Host "🔧 バックエンド起動 (port 3001)..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    cd "$using:pwd\packages\backend"
    npm run dev
}

# 少し待機
Start-Sleep -Seconds 3

# フロントエンド起動
Write-Host "🎨 フロントエンド起動 (port 5173)..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    cd "$using:pwd\packages\frontend"
    npm run dev -- --host 0.0.0.0
}

Start-Sleep -Seconds 3

# cloudflared起動（オプション）
if ($WithCloudflare -and (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "☁️  cloudflared トンネル起動..." -ForegroundColor Cyan
    
    $cloudflareFrontendJob = Start-Job -ScriptBlock {
        npx cloudflared tunnel --url http://localhost:5173 *>&1 | Tee-Object cloudflared-frontend.log
    }
    
    $cloudflareBackendJob = Start-Job -ScriptBlock {
        npx cloudflared tunnel --url http://localhost:3001 *>&1 | Tee-Object cloudflared-backend.log
    }
    
    Write-Host "⏳ トンネルURL取得待機..." -ForegroundColor Yellow
    Start-Sleep -Seconds 8
    
    if (Test-Path "cloudflared-frontend.log") {
        $frontendUrl = Select-String -Path "cloudflared-frontend.log" -Pattern 'https://[^ ]*\.trycloudflare\.com' | Select-Object -First 1
        if ($frontendUrl) {
            Write-Host "✅ フロントエンド公開URL: $($frontendUrl.Matches.Value)" -ForegroundColor Green
        }
    }
    
    if (Test-Path "cloudflared-backend.log") {
        $backendUrl = Select-String -Path "cloudflared-backend.log" -Pattern 'https://[^ ]*\.trycloudflare\.com' | Select-Object -First 1
        if ($backendUrl) {
            $apiUrl = "$($backendUrl.Matches.Value)/api"
            Write-Host "✅ バックエンド公開URL: $apiUrl" -ForegroundColor Green
            "VITE_API_URL=$apiUrl" | Out-File -Encoding utf8 "packages/frontend/.env.local"
        fi
    }
}

Write-Host ""
Write-Host "✅ 開発環境起動完了！" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "📱 フロントエンド: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 バックエンド:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "📚 Swagger:      http://localhost:3001/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 停止するには: Ctrl+C" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# 終了ハンドラ
function Cleanup {
    Write-Host ""
    Write-Host "🛑 シャットダウン中..." -ForegroundColor Yellow
    Get-Job | Stop-Job | Remove-Job
    Get-Process -Name "tsx", "vite", "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ 完了" -ForegroundColor Green
    exit 0
}

# Ctrl+C ハンドラ
$global:cleanup = $true
[System.Console]::CancelKeyPress += {
    Cleanup
}

# メインループ
while ($true) {
    Start-Sleep -Seconds 1
    # ジョブ状態チェック
    if ((Get-Job -State Failed).Count -gt 0) {
        Write-Host "⚠️ ジョブが失敗しました" -ForegroundColor Red
        Get-Job -State Failed | Receive-Job
        break
    }
}