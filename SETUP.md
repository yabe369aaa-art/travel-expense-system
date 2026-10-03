# 開発環境セットアップガイド（2台PC同期版）

## 前提条件

| ツール | バージョン | インストール方法 |
|--------|-----------|-----------------|
| Node.js | 20.x LTS | `winget install OpenJS.NodeJS.LTS` / `volta install node@20` |
| Git | 最新 | `winget install Git.Git` |
| Docker Desktop | 最新 | https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe |
| VS Code | 最新 | `winget install Microsoft.VisualStudioCode` |

## 初回セットアップ（両PC共通）

```bash
# 1. リポジトリクローン
git clone https://github.com/yabe369aaa-art/travel-expense-system.git
cd travel-expense-system

# 2. 依存関係インストール
npm install

# 3. 環境変数設定（バックエンド）
cp packages/backend/.env.example packages/backend/.env
# 必要に応じて編集（通常はデフォルトでOK）

# 4. データベース初期化
npm run db:generate   # Prisma Client生成
npm run db:push       # スキーマ適用
npm run db:seed       # 初期データ投入

# 5. 開発サーバー起動（ターミナル3つ必要）
# ターミナル1: フロントエンド
npm run dev --workspace=packages/frontend -- --host 0.0.0.0

# ターミナル2: バックエンド
npm run dev --workspace=packages/backend

# ターミナル3: cloudflared（外部公開用・任意）
npx cloudflared tunnel --url http://localhost:5173
npx cloudflared tunnel --url http://localhost:3001  # バックエンド用
```

## 環境変数管理

### `.env` ファイル（Git管理外・各PCで個別設定）
```bash
packages/backend/.env        # バックエンド用
packages/frontend/.env       # フロントエンド用（VITE_*のみ）
```

### 共有設定（Git管理・`.env.example`でテンプレート管理）
- `packages/backend/.env.example`
- `packages/frontend/.env.example`

## 2台目PCでの作業開始手順

```bash
# 1. 最新取得
git pull origin main

# 2. 依存関係更新（package-lock.json変更時）
npm install

# 3. DBマイグレーション適用（スキーマ変更時）
npm run db:generate
npm run db:push

# 4. 必要なら再シード（データリセット）
npm run db:seed
```

## 開発フロー（両PC共通）

### 機能開発
```bash
# 1. ブランチ作成
git checkout -b feature/xxx

# 2. 開発・テスト
npm run dev
npm run test

# 3. ビルド確認
npm run build

# 4. コミット・プッシュ
git add .
git commit -m "feat: xxx"
git push origin feature/xxx

# 5. PR作成 → レビュー → マージ
```

### 同期ポイント
| タイミング | コマンド |
|-----------|----------|
| 作業開始前 | `git pull origin main` |
| 依存追加後 | `npm install` |
| スキーマ変更後 | `npm run db:generate && npm run db:push` |
| 作業終了時 | `git push origin <branch>` |

## よくある問題と解決

| 現象 | 原因 | 解決 |
|------|------|------|
| ポート衝突 (EADDRINUSE) | 既存プロセス残存 | `taskkill /F /IM node.exe` |
| DBスキーマ不一致 | マイグレーション未適用 | `npm run db:push` |
| プロキシ404 | Viteプロキシ不調 | `VITE_API_URL` で直接指定 |
| cloudflared接続失敗 | DNS伝播待ち | 30秒待機 / URL再発行 |

## cloudflared 運用（外部アクセス用）

```bash
# フロントエンド公開
npx cloudflared tunnel --url http://localhost:5173

# バックエンド公開（API直接アクセス用）
npx cloudflared tunnel --url http://localhost:3001

# 発行されたURLを .env に設定
# packages/frontend/.env
VITE_API_URL=https://backend-xxx.trycloudflare.com/api
```

## 推奨VS Code拡張機能

```json
{
  "recommendations": [
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

## 設定ファイル一覧（Git管理）

```
├── .gitignore
├── package.json              # ルート package.json (turbo)
├── turbo.json                # Turborepo設定
├── docker-compose.yml        # 本番用DB等
├── packages/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   └── prisma/
│   │       └── schema.prisma
│   ├── frontend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── .env.example
│   └── shared/
│       ├── package.json
│       └── tsconfig.json
└── SETUP.md                  # このファイル
```