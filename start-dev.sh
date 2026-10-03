#!/usr/bin/env bash
# 開発環境一括起動スクリプト
# 使用方法: ./start-dev.sh

set -e

echo "🚀 開発環境を起動します..."

# 既存プロセスのクリーンアップ
echo "🧹 既存プロセスをクリーンアップ..."
pkill -f "tsx watch src/app.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "cloudflared" 2>/dev/null || true

# 依存関係チェック
echo "📦 依存関係を確認..."
npm install --prefer-offline 2>/dev/null || npm install

# DB初期化
echo "🗄️  データベース初期化..."
npm run db:generate
npm run db:push
npm run db:seed

# 開発サーバー起動（バックグラウンド）
echo "🔧 バックエンド起動 (port 3001)..."
npm run dev --workspace=packages/backend &
BACKEND_PID=$!

sleep 3

echo "🎨 フロントエンド起動 (port 5173)..."
npm run dev --workspace=packages/frontend -- --host 0.0.0.0 &
FRONTEND_PID=$!

sleep 3

# cloudflared起動（オプション）
if command -v cloudflared &> /dev/null; then
    echo "☁️  cloudflared トンネル起動..."
    npx cloudflared tunnel --url http://localhost:5173 > cloudflared-frontend.log 2>&1 &
    CLOUDFLARE_FRONTEND_PID=$!
    
    npx cloudflared tunnel --url http://localhost:3001 > cloudflared-backend.log 2>&1 &
    CLOUDFLARE_BACKEND_PID=$!
    
    echo "⏳ トンネルURL取得待機..."
    sleep 5
    
    if [ -f cloudflared-frontend.log ]; then
        FRONTEND_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' cloudflared-frontend.log | head -1)
        if [ -n "$FRONTEND_URL" ]; then
            echo "✅ フロントエンド公開URL: $FRONTEND_URL"
        fi
    fi
    
    if [ -f cloudflared-backend.log ]; then
        BACKEND_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' cloudflared-backend.log | head -1)
        if [ -n "$BACKEND_URL" ]; then
            echo "✅ バックエンド公開URL: $BACKEND_URL/api"
            echo "VITE_API_URL=${BACKEND_URL}/api" > packages/frontend/.env.local
        fi
    fi
fi

echo ""
echo "✅ 開発環境起動完了！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 フロントエンド: http://localhost:5173"
echo "🔧 バックエンド:  http://localhost:3001"
echo "📚 Swagger:      http://localhost:3001/docs"
echo ""
echo "🛑 停止するには: Ctrl+C"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# クリーンアップ関数
cleanup() {
    echo ""
    echo "🛑 シャットダウン中..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    kill $CLOUDFLARE_FRONTEND_PID $CLOUDFLARE_BACKEND_PID 2>/dev/null || true
    pkill -f "tsx watch src/app.ts" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "cloudflared" 2>/dev/null || true
    echo "✅ 完了"
    exit 0
}

trap cleanup INT TERM

# プロセス監視
wait $BACKEND_PID $FRONTEND_PID