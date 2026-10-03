# 開発環境セットアップガイド

このドキュメントは、旅費交通費申請システムの開発環境を **任意のPCで完全に再現する手順** です。

---

## 前提条件

| ソフトウェア | バージョン | 備考 |
|------------|----------|------|
| OS | Windows 11 | Mac/Linuxでも可（コマンド適宜調整） |
| Node.js | **20.x LTS** | `node -v` で確認、nvm推奨 |
| Docker Desktop | 最新版 | WSL2バックエンド推奨 |
| Git | 最新版 | |
| PostgreSQL | 16.x | Docker使用時は不要 |

> **重要**: このプロジェクトは **Docker Desktop必須** です（LocalStack, Mailhog, Mock OIDC, PostgreSQL用）。

---

## 1. リポジトリクローン・依存関係インストール

```bash
# リポジトリクローン
git clone https://github.com/yabe369aaa-art/travel-expense-system.git
cd travel-expense-system

# 最新mainブランチ取得
git pull origin main

# 依存関係インストール（package-lock.json準拠・完全同一環境）
npm ci
```

---

## 2. 環境変数設定（重要：全PCで完全一致させる）

### 2-1. バックエンド環境変数

```bash
# packages/backend/.env を作成
cp packages/backend/.env.example packages/backend/.env
```

**`packages/backend/.env` の内容（コピーして使用）**:

```env
# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Database（DockerのPostgreSQLを使用）
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/travel_expense?schema=public

# JWT（★全PCで完全同一値必須）
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 (LocalStack)
S3_ENDPOINT=http://localhost:4566
S3_REGION=ap-northeast-1
S3_ACCESS_KEY=test
S3_SECRET_KEY=test
S3_BUCKET=travel-expense-receipts
S3_PRESIGNED_EXPIRES=300

# External APIs
GOOGLE_MAPS_API_KEY=
EKISPERT_API_KEY=
GASOLINE_UNIT_PRICE=15

# Email (Mailhog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@travel-expense.local

# Entra ID / Mock OIDC
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=
ENTRA_TENANT_ID=
ENTRA_REDIRECT_URI=http://localhost:5173/auth/callback/entra_id
MOCK_OIDC_URL=http://localhost:3000
```

> ⚠️ **JWT_SECRETは全開発PCで完全に同じ値にすること**（トークン互換性のため）

### 2-2. フロントエンド環境変数

```bash
# packages/frontend/.env を作成
echo "VITE_API_URL=http://localhost:3001/api" > packages/frontend/.env
```

---

## 3. Dockerサービス起動

```bash
# プロジェクトルートで実行
docker-compose up -d

# 起動確認
docker-compose ps
# 全サービスが "healthy" または "running" になればOK
```

**起動されるサービス**:

| サービス | ポート | 用途 | ヘルスチェック |
|---------|-------|------|--------------|
| PostgreSQL | 5432 | メインDB | pg_isready |
| LocalStack | 4566 | S3モック | /_localstack/health |
| Mailhog | 1025/8025 | SMTP/Web UI | nc -z localhost 1025 |
| Mock OIDC | 3000 | Entra IDモック | /.well-known/openid-configuration |

**ポート競合がある場合**: 競合プロセスを停止するか、`docker-compose.yml` のポートマッピングを調整。

---

## 4. データベース初期化

```bash
cd packages/backend

# スキーマ適用
npm run db:push

# テストデータ投入（テストユーザー作成）
npm run db:seed
```

**作成されるテストユーザー** (全員パスワード: `password123`):

| メールアドレス | 役割 | 認証方式 |
|-------------|-----|---------|
| admin@travel-expense.local | 管理者 | local |
| coordinator@travel-expense.local | 調整者 | local |
| applicant1@travel-expense.local | 申請者 | local |
| applicant2@travel-expense.local | 申請者 | local |
| entra.user@company.com | 申請者 | entra_id |

---

## 5. 開発サーバー起動

### ターミナル1: バックエンド
```bash
cd packages/backend
npm run dev
# → http://localhost:3001 (API)
# → http://localhost:3001/docs (Swagger UI)
```

### ターミナル2: フロントエンド
```bash
cd packages/frontend
npm run dev
# → http://localhost:5173
```

---

## 6. 動作確認

1. **ブラウザで http://localhost:5173 を開く**
2. **ログイン画面でテストアカウント入力**:
   - メール: `applicant1@travel-expense.local`
   - パスワード: `password123`
3. **MFAコード入力**:
   - バックエンドコンソールに `🔐 MFA Code for applicant1@travel-expense.local: 123456` と表示される
   - または Mailhog UI (http://localhost:8025) でメール確認
4. **ダッシュボード表示されれば成功**

---

## 7. よくある問題と解決

### 400 Bad Request (ログイン時)
- **原因**: `JWT_SECRET` 不一致、DB未初期化、ユーザー不在
- **解決**: 
  1. `.env` の `JWT_SECRET` が全PC同一か確認
  2. `npm run db:push && npm run db:seed` 再実行
  3. バックエンド再起動

### Docker起動失敗
```bash
# 既存コンテナ削除して再起動
docker-compose down -v
docker-compose up -d
```

### ポート競合 (3001, 5173, 5432, 4566, 1025, 3000)
```bash
# 使用中プロセス確認 (Windows)
netstat -ano | findstr :3001
# PID確認後タスクマネージャで終了、またはポート変更
```

### Prisma Client生成エラー
```bash
cd packages/backend
npx prisma generate
```

### Node.jsバージョン不一致
```bash
# nvm使用推奨
nvm install 20
nvm use 20
```

---

## 8. 開発ワークフロー

### コード変更後の反映
- **バックエンド**: `tsx watch` でホットリロード自動
- **フロントエンド**: Vite HMR 自動
- **DBスキーマ変更**: `prisma/schema.prisma` 編集 → `npm run db:push`

### テスト実行
```bash
# 全パッケージ
npm run test

# バックエンドのみ
npm run test --filter=@travel-expense/backend

# フロントエンドのみ
npm run test --filter=@travel-expense/frontend
```

### リンター・型チェック
```bash
npm run lint
npm run build  # tsc で型チェック含む
```

---

## 9. 環境リセット（完全クリーンアップ）

```bash
# Dockerボリューム含め全削除
docker-compose down -v

# node_modules削除
rm -rf node_modules packages/*/node_modules

# 再セットアップ
npm ci
docker-compose up -d
cd packages/backend && npm run db:push && npm run db:seed
```

---

## 10. 便利なコマンド集

```bash
# DB管理UI
cd packages/backend && npm run db:studio  # http://localhost:5555

# ログ確認
docker-compose logs -f backend
docker-compose logs -f postgres

# コンテナ内操作
docker-compose exec postgres psql -U postgres -d travel_expense
docker-compose exec localstack awslocal s3 ls

# Git同期
git pull origin main
npm ci  # 依存関係更新時
cd packages/backend && npm run db:push  # スキーマ更新時
```

---

## チェックリスト（セットアップ完了確認）

- [ ] `node -v` が v20.x
- [ ] `docker-compose ps` 全サービス healthy/running
- [ ] `packages/backend/.env` が存在し `JWT_SECRET` がチーム共通値
- [ ] `packages/frontend/.env` が存在し `VITE_API_URL=http://localhost:3001/api`
- [ ] `npm run db:push` 成功
- [ ] `npm run db:seed` 成功（ユーザー5件作成）
- [ ] `npm run dev` (backend) → http://localhost:3001/docs 表示
- [ ] `npm run dev` (frontend) → http://localhost:5173 表示
- [ ] テストアカウントでログイン成功、MFAコード入力でダッシュボード表示

---

## 問い合わせ先

セットアップで詰まった場合:
1. このドキュメントの「よくある問題」確認
2. バックエンド/フロントエンドのコンソールエラー確認
3. ブラウザ開発ツール Network タブで失敗リクエスト確認
4. チームメンバーに相談

---

**最終更新**: 2026-10-03  
**対象コミット**: `a979ac9` (feat: add route planner and application updates)