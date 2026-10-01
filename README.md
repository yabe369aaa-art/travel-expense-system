# 交通費申請システム

## 概要
一般申請者による交通費申請、コーディネータによる代理申請、事務局による確認・転記業務を効率化するWebアプリケーション。

## 技術スタック
- **バックエンド**: Node.js + TypeScript + Fastify + Prisma + PostgreSQL
- **フロントエンド**: React + TypeScript + Vite + TanStack Query + Tailwind CSS + shadcn/ui
- **モノレポ**: Turborepo
- **認証**: JWT + ローカル認証(Email/Password + MFA) + Entra ID SSO (モック対応)
- **外部API**: 駅すぱあと, Google Maps Distance Matrix, AWS S3 (LocalStack)

## クイックスタート

### 前提条件
- Node.js 20+
- Docker & Docker Compose
- npm 10+

### 1. 依存関係インストール
```bash
npm install
```

### 2. 環境変数設定
```bash
# Backend
cp packages/backend/.env.example packages/backend/.env

# Frontend
cp packages/frontend/.env.example packages/frontend/.env
```

### 3. Docker起動 (PostgreSQL, LocalStack, Mock OIDC, Mailhog)
```bash
docker-compose up -d
```

### 4. データベースセットアップ
```bash
npm run db:generate  # Prisma Client生成
npm run db:migrate   # マイグレーション実行
npm run db:seed      # シードデータ投入 (開発用)
```

### 5. 開発サーバー起動
```bash
npm run dev
```
- Backend: http://localhost:3001 (API), http://localhost:3001/docs (Swagger)
- Frontend: http://localhost:5173
- Mailhog UI: http://localhost:8025 (MFAコード確認用)
- LocalStack S3: http://localhost:4566
- Mock OIDC: http://localhost:3000

## テストアカウント (シードデータ)

| 役割 | メール | パスワード |
|------|--------|------------|
| 申請者 | applicant1@travel-expense.local | password123 |
| 申請者 | applicant2@travel-expense.local | password123 |
| コーディネータ | coordinator@travel-expense.local | password123 |
| 事務局 | admin@travel-expense.local | password123 |

## 開発コマンド

```bash
# 全パッケージ
npm run dev          # 開発サーバー起動
npm run build        # ビルド
npm run lint         # Lint
npm run test         # テスト実行

# Backend
cd packages/backend
npm run db:studio    # Prisma Studio
npm run db:push      # スキーマ強制反映
npm run test:watch   # テストウォッチモード

# Frontend
cd packages/frontend
npm run test:ui      # Vitest UI
```

## プロジェクト構造
```
travel-expense-system/
├── packages/
│   ├── backend/          # Fastify API
│   │   ├── src/
│   │   │   ├── config/       # 環境変数, Prisma
│   │   │   ├── middleware/   # 認証, バリデーション, エラー
│   │   │   ├── routes/       # APIルート
│   │   │   ├── schemas/      # Zodバリデーションスキーマ
│   │   │   ├── services/     # ビジネスロジック
│   │   │   ├── types/        # 型定義
│   │   │   └── app.ts        # エントリーポイント
│   │   └── prisma/           # スキーマ, シード
│   ├── frontend/         # React App
│   │   ├── src/
│   │   │   ├── components/   # UIコンポーネント
│   │   │   ├── hooks/        # カスタムフック
│   │   │   ├── lib/          # APIクライアント, ユーティリティ
│   │   │   ├── pages/        # ページコンポーネント
│   │   │   ├── stores/       # Zustandストア
│   │   │   └── types/        # 型定義
│   └── shared/           # 共通型定義
├── docker-compose.yml
├── turbo.json
└── package.json
```

## 実装済み機能

### Phase 1: 基盤構築 ✅
- [x] Turborepoモノレポ構成
- [x] Docker開発環境 (PostgreSQL, LocalStack, Mock OIDC, Mailhog)
- [x] Prismaスキーマ・マイグレーション
- [x] 認証基盤 (JWT, ローカル認証, MFAモック, Entra ID SSOモック)
- [x] RBAC (ロールベースアクセス制御)
- [x] 状態遷移ガード (バックエンド)
- [x] 共通ミドルウェア (エラー, バリデーション, レート制限)
- [x] Swagger APIドキュメント

### Phase 2: コアAPI ✅
- [x] ユーザー管理 API (CRUD, 定期券管理)
- [x] 申請ヘッダー API (CRUD, ステータス遷移)
- [x] 申請明細 API (CRUD, 複製, 一括複製, 過去ルート検索/再利用)
- [x] 承認履歴 API
- [x] ファイルアップロード (Presigned URL)

### Phase 3: 外部連携 (モック実装) 🔄
- [x] S3 Presigned URL (LocalStack)
- [ ] 駅すぱあとAPI連携 (モック化済み, 実装待ち)
- [ ] Google Maps API連携 (モック化済み, 実装待ち)

### Phase 4: フロントエンド ✅
- [x] 認証画面 (ログイン, MFA, SSOコールバック)
- [x] 申請者画面 (ダッシュボード, 一覧, 詳細, 新規作成)
- [x] コーディネータ画面 (ダッシュボード, 対象者切替, 代理申請)
- [x] 事務局画面 (確認待ち一覧, 詳細確認, 承認/差し戻し, 転記待ち一覧, 転記アシスト)
- [x] 共通UIコンポーネント (shadcn/uiベース)

## 次のステップ

1. **駅すぱあとAPI実装** (`packages/backend/src/services/ekispert.service.ts`)
2. **Google Maps API実装** (`packages/backend/src/services/google-maps.service.ts`)
3. **単体・統合テスト追加** (Vitest)
4. **E2Eテスト追加** (Playwright)
5. **本番用環境変数・シークレット管理**
6. **CI/CDパイプライン構築** (GitHub Actions)

## ライセンス
MIT