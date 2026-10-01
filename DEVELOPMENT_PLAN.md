# 交通費申請システム 開発設計提案書

## 1. プロジェクト構造

```
travel-expense-system/
├── docs/                    # 設計書・API仕様書
├── packages/
│   ├── backend/             # Node.js + TypeScript (Express/Fastify)
│   │   ├── src/
│   │   │   ├── config/      # 環境変数・定数
│   │   │   ├── controllers/ # ルートハンドラ
│   │   │   ├── middleware/  # 認証・バリデーション・エラー
│   │   │   ├── models/      # DBモデル (Prisma/Drizzle)
│   │   │   ├── routes/      # APIルーティング
│   │   │   ├── services/    # ビジネスロジック
│   │   │   ├── utils/       # 共通ユーティリティ
│   │   │   └── app.ts       # エントリーポイント
│   │   ├── prisma/          # スキーマ・マイグレーション
│   │   ├── tests/
│   │   └── package.json
│   ├── frontend/            # React + TypeScript (Vite)
│   │   ├── src/
│   │   │   ├── components/  # 共通UIコンポーネント
│   │   │   ├── pages/       # 画面コンポーネント
│   │   │   ├── hooks/       # カスタムフック
│   │   │   ├── services/    # API通信層
│   │   │   ├── stores/      # 状態管理 (Zustand/Redux)
│   │   │   ├── types/       # 型定義
│   │   │   └── utils/
│   │   └── package.json
│   └── shared/              # 共通型定義・定数
├── docker-compose.yml
├── turbo.json               # Turborepo設定 (モノレポ管理)
└── package.json
```

## 2. 技術スタック詳細

| 領域 | 技術 | 理由 |
|------|------|------|
| **Runtime** | Node.js 20 LTS | 長期サポート |
| **Framework** | Fastify | 高性能・型安全・プラグイン豊富 |
| **Language** | TypeScript 5.x | 型安全性 |
| **ORM** | Prisma | 型安全・マイグレーション・Prisma Studio |
| **DB** | PostgreSQL 16 | 本番・開発統一、JSONB対応 |
| **Auth** | @fastify/jwt + passport-azure-ad | Entra ID SSO + ローカル認証 |
| **Validation** | Zod | スキーマベース・型推論 |
| **Frontend** | React 18 + Vite + TypeScript | 高速HMR・モダン |
| **UI Library** | shadcn/ui + Tailwind CSS | アクセシブル・カスタマイズ可 |
| **State** | TanStack Query + Zustand | サーバー状態・クライアント状態分離 |
| **Forms** | React Hook Form + Zod | 型安全フォーム |
| **Testing** | Vitest + Playwright | 単体・E2E統一 |
| **CI/CD** | GitHub Actions | 標準的・OSS無料 |
| **Container** | Docker + Docker Compose | 環境統一 |
| **Monorepo** | Turborepo | ビルドキャッシュ・並列実行 |

## 3. 開発フェーズ

### Phase 1: 基盤構築 (Week 1-2)
- [ ] Monorepo初期化 (Turborepo)
- [ ] Docker環境構築 (PostgreSQL, Backend, Frontend)
- [ ] Prismaスキーマ作成・マイグレーション
- [ ] 認証基盤実装
  - ローカル認証 (bcrypt + JWT + Email OTP)
  - Entra ID SSO (OIDCフロー)
  - ロールベースアクセス制御 (RBAC)
- [ ] 共通ミドルウェア (エラー・ログ・バリデーション)
- [ ] CI/CDパイプライン構築

### Phase 2: コアAPI実装 (Week 3-4)
- [ ] ユーザー管理API (CRUD, 定期券管理)
- [ ] 申請ヘッダーAPI (作成・一覧・詳細・ステータス遷移)
- [ ] 申請明細API (CRUD, 複製・過去ルート呼出)
- [ ] ステートマシン実装 (状態遷移バリデーション)
- [ ] 承認履歴API

### Phase 3: 外部連携 (Week 5)
- [ ] 駅すぱあとAPI連携サービス
  - 経路検索・運賃計算・定期控除
  - シリアライズコード保存・復元
- [ ] Google Maps Distance Matrix API
  - 距離取得・ガソリン代計算
- [ ] AWS S3連携
  - Presigned URL生成 (5分期限)
  - ファイルアップロード・削除

### Phase 4: フロントエンド実装 (Week 6-8)
- [ ] 認証画面 (ログイン・MFA・SSO)
- [ ] 申請者画面
  - ダッシュボード・申請作成・履歴・過去ルート再利用
- [ ] コーディネータ画面
  - 対象者切替・一括複製・代理申請
- [ ] 事務局画面
  - 一覧・詳細確認・差し戻し・転記アシスト・転記完了
- [ ] 共通UIコンポーネントライブラリ

### Phase 5: 統合・テスト・本番準備 (Week 9-10)
- [ ] 統合テスト・E2Eテスト
- [ ] パフォーマンステスト (インデックス検証)
- [ ] セキュリティ監査 (認証・認可・ファイルアクセス)
- [ ] ドキュメント整備 (API仕様・運用手順)
- [ ] 本番デプロイ・監視設定

## 4. 重要実装詳細

### 4.1 認証フロー設計

```typescript
// ハイブリッド認証のユーザー識別
interface AuthUser {
  id: string;           // 内部UUID
  email: string;
  role: 'applicant' | 'coordinator' | 'admin';
  authType: 'local' | 'entra_id';
  entraObjectId?: string;
}

// JWTペイロード
interface JWTPayload extends AuthUser {
  iat: number;
  exp: number;
}
```

**ローカル認証フロー:**
1. Email/Password → `/auth/login` → Access Token + Refresh Token
2. MFA必須時 → `/auth/mfa/send` → Email OTP送信
3. OTP検証 → `/auth/mfa/verify` → 新Access Token発行

**Entra ID SSOフロー:**
1. フロント → Microsoft Login URLリダイレクト
2. コールバック `/auth/callback/entra_id` → Token取得
3. `entra_object_id` でユーザー照合・JWT発行

### 4.2 状態遷移ガード (バックエンド)

```typescript
// services/state-machine.ts
const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['pending'],
  pending: ['approved', 'rejected'],
  rejected: ['pending'],
  approved: ['transferred'],
  transferred: [],
};

export function canTransition(
  current: ApplicationStatus,
  next: ApplicationStatus,
  role: UserRole
): boolean {
  // 権限チェック
  if (next === 'approved' && role !== 'admin') return false;
  if (next === 'transferred' && role !== 'admin') return false;
  if (next === 'rejected' && role !== 'admin') return false;
  
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}
```

### 4.3 過去ルート再利用ロジック

```typescript
// services/route-reuse.ts
async function reuseRoute(
  sourceDetailId: string,
  newUseDate: Date,
  userId: string
): Promise<ExpenseApplicationDetail> {
  const source = await prisma.expenseApplicationDetail.findUniqueOrThrow({
    where: { id: sourceDetailId },
    include: { application: true },
  });

  // 承認済みのみ許可
  if (!['approved', 'transferred'].includes(source.application.status)) {
    throw new ForbiddenError('承認済みのルートのみ再利用可能です');
  }

  let fare: number;
  let routeData: string | null = null;
  let distance: number | null = null;

  if (source.transportType === 'plane') {
    // 飛行機: 区間のみコピー、領収書クリア
    fare = 0; // 別途入力必須
  } else if (source.routeSerializeData) {
    // 鉄道・バス: 駅すぱあとで最新運賃取得
    const result = await ekispertClient.recaclulateFare(
      source.routeSerializeData,
      newUseDate
    );
    fare = result.fare;
    routeData = source.routeSerializeData;
  } else if (source.gpsDistanceKm) {
    // 自家用車: 距離再計算
    const distance = await googleMapsClient.getDistance(
      source.departurePlace,
      source.arrivalPlace
    );
    fare = Math.round(distance * GASOLINE_UNIT_PRICE);
  }

  return prisma.expenseApplicationDetail.create({
    data: {
      ...source,
      id: undefined,
      useDate: newUseDate,
      reimbursementFare: fare,
      routeSerializeData: routeData,
      gpsDistanceKm: distance,
      receiptFileUrl: source.transportType === 'plane' ? null : source.receiptFileUrl,
    },
  });
}
```

### 4.4 コーディネータ一括複製

```typescript
// API: POST /api/applications/:id/details/bulk-duplicate
interface BulkDuplicateRequest {
  detailId: string;
  useDates: string[]; // ISO日付配列
}

async function bulkDuplicate(req: Request, res: Reply) {
  const { detailId, useDates } = req.body as BulkDuplicateRequest;
  
  const results = await Promise.all(
    useDates.map(date => reuseRoute(detailId, new Date(date), req.user.id))
  );
  
  // ヘッダーの合計金額再計算
  await recalcApplicationTotal(results[0].applicationId);
  
  return results;
}
```

### 4.5 転記アシスト画面データ構造

```typescript
// クライアントシステム項目順にソート済みで返却
interface TransferAssistData {
  applicationId: string;
  applicantName: string;
  targetUserName: string;
  department: string;
  items: TransferItem[];
}

interface TransferItem {
  label: string;           // 項目名 (クライアントシステム準拠)
  value: string | number;  // コピー対象値
  copyKey: string;         // クリップボード識別子
  order: number;           // 表示順
}
```

## 5. データベース詳細設計 (Prisma)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  authType        AuthType @default(local)
  passwordHash    String?
  entraObjectId   String?  @unique
  role            Role     @default(applicant)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  commuterPass    CommuterPass?
  applications    Application[] @relation("ApplicantApplications")
  targetApplications Application[] @relation("TargetApplications")
  histories       ApplicationHistory[]

  @@map("users")
}

model CommuterPass {
  userId       String   @id
  routeText    String?
  teikiProfile String
  expiredAt    DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_commuter_passes")
}

model Application {
  id              String   @id @default(uuid())
  applicantId     String
  targetUserId    String
  title           String
  status          Status   @default(draft)
  totalAmount     Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  applicant       User     @relation("ApplicantApplications", fields: [applicantId], references: [id])
  targetUser      User     @relation("TargetApplications", fields: [targetUserId], references: [id])
  details         Detail[]
  histories       ApplicationHistory[]

  @@index([applicantId])
  @@index([targetUserId])
  @@index([status])
  @@map("expense_applications")
}

model Detail {
  id                   String   @id @default(uuid())
  applicationId        String
  transportType        TransportType
  useDate              DateTime
  departurePlace       String
  arrivalPlace         String
  reimbursementFare    Int
  routeSerializeData   String?
  gpsDistanceKm        Decimal? @db.Decimal(5, 2)
  receiptFileUrl       String?
  purpose              String?
  createdAt            DateTime @default(now())

  application          Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
  @@index([departurePlace, arrivalPlace, transportType])
  @@map("expense_application_details")
}

model ApplicationHistory {
  id            String   @id @default(uuid())
  applicationId String
  operatorId    String
  action        Action
  comment       String?
  createdAt     DateTime @default(now())

  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  operator      User        @relation(fields: [operatorId], references: [id])

  @@index([applicationId])
  @@map("application_histories")
}

enum AuthType { local entra_id }
enum Role { applicant coordinator admin }
enum Status { draft pending rejected approved transferred }
enum TransportType { train bus plane car }
enum Action { submit reject approve transfer }
```

## 6. APIエンドポイント設計

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| POST | `/auth/login` | ローカルログイン | Public |
| POST | `/auth/mfa/send` | OTP送信 | Authenticated |
| POST | `/auth/mfa/verify` | OTP検証 | Authenticated |
| GET | `/auth/entra_id` | SSO開始 | Public |
| GET | `/auth/callback/entra_id` | SSOコールバック | Public |
| POST | `/auth/refresh` | トークンリフレッシュ | Refresh Token |
| GET | `/users/me` | 現在ユーザー取得 | Authenticated |
| GET | `/users` | ユーザー一覧 | Admin |
| POST | `/users` | ユーザー作成 | Admin |
| GET | `/users/:id/commuter-pass` | 定期券取得 | Self/Coordinator/Admin |
| PUT | `/users/:id/commuter-pass` | 定期券更新 | Self/Admin |
| GET | `/applications` | 申請一覧 (フィルタ・ページング) | Role-based |
| POST | `/applications` | 申請作成 | Applicant/Coordinator |
| GET | `/applications/:id` | 申請詳細 | Related/Coordinator/Admin |
| PUT | `/applications/:id` | 申請更新 (draftのみ) | Owner |
| POST | `/applications/:id/submit` | 申請提出 (draft→pending) | Owner |
| POST | `/applications/:id/approve` | 承認 (pending→approved) | Admin |
| POST | `/applications/:id/reject` | 差し戻し (pending→rejected) | Admin |
| POST | `/applications/:id/transfer` | 転記完了 (approved→transferred) | Admin |
| GET | `/applications/:id/details` | 明細一覧 | Related |
| POST | `/applications/:id/details` | 明細作成 | Owner |
| PUT | `/details/:id` | 明細更新 (draftのみ) | Owner |
| DELETE | `/details/:id` | 明細削除 (draftのみ) | Owner |
| POST | `/details/:id/duplicate` | 明細複製 | Owner |
| POST | `/details/bulk-duplicate` | 一括複製 | Coordinator |
| GET | `/details/search/history` | 過去ルート検索 | Authenticated |
| POST | `/details/reuse` | 過去ルート再利用 | Authenticated |
| GET | `/applications/:id/transfer-assist` | 転記アシストデータ | Admin |
| POST | `/files/presigned-url` | S3署名付きURL取得 | Authenticated |
| DELETE | `/files/:key` | ファイル削除 | Owner/Admin |

## 7. フロントエンド画面構成

### 共通レイアウト
- Header: ユーザー名・ロール・ログアウト
- Sidebar: 権限に応じたナビゲーション

### 申請者向け
| 画面 | パス | 主要機能 |
|------|------|----------|
| ダッシュボード | `/applicant` | 申請状況サマリー・操作案内 |
| 申請作成 | `/applicant/applications/new` | ヘッダー入力・明細追加・過去ルート検索 |
| 申請詳細 | `/applicant/applications/:id` | 読み取り専用・履歴表示・差し戻し理由表示 |
| 申請履歴 | `/applicant/history` | フィルタ・ページング・ステータス別 |

### コーディネータ向け
| 画面 | パス | 主要機能 |
|------|------|----------|
| マイページ | `/coordinator` | 対象者コンボボックス・タブ切替 |
| 代理申請 | `/coordinator/applications/new` | 対象者選択・一括複製UI・定期券自動適用 |
| 下書き管理 | `/coordinator/drafts` | 対象者別下書き一覧・編集・提出 |

### 事務局向け
| 画面 | パス | 主要機能 |
|------|------|----------|
| 確認待ち一覧 | `/admin/pending` | pendingステータス絞込・一括表示 |
| 確認詳細 | `/admin/applications/:id` | 明細確認・差し戻しコメント入力・承認 |
| 転記待ち一覧 | `/admin/approved` | approvedステータス絞込 |
| 転記アシスト | `/admin/applications/:id/transfer` | C&Pボタン・項目順ソート・転記完了ボタン |

## 8. テスト戦略

| レベル | ツール | 対象 | カバレッジ目標 |
|--------|--------|------|----------------|
| 単体テスト | Vitest | Services, Utils, State Machine | 80%+ |
| 統合テスト | Vitest + Testcontainers | API Routes, DB操作, 外部APIモック | 主要フロー100% |
| E2Eテスト | Playwright | 認証・申請・承認・転記フロー | Critical Path 100% |
| 視覚回帰 | Playwright + pixelmatch | UIコンポーネント | 主要画面 |

## 9. セキュリティ考慮事項

- [ ] Helmet.js / Fastify Helmet でセキュリティヘッダー設定
- [ ] CORS厳格設定 (フロントエンドオリジンのみ)
- [ ] Rate Limiting (認証エンドポイント重点)
- [ ] SQL Injection対策 (Prisma Parameterized Query)
- [ ] XSS対策 (React標準エスケープ + CSP)
- [ ] ファイルアップロード: 拡張子・MIME・サイズ検証、ウイルススキャン検討
- [ ] 監査ログ: 全ステータス変更・ファイルアクセス記録
- [ ] 暗号化: パスワードbcrypt、通信TLS1.2+、保存時暗号化(S3 SSE)

## 10. 運用・監視

- **ログ**: Pino (JSON構造化ログ) → CloudWatch / Loki
- **メトリクス**: Prometheus + Grafana (API遅延・エラー率・DB接続数)
- **アラート**: PagerDuty / Slack (5xxエラー率・DB接続枯渇・認証失敗急増)
- **バックアップ**: RDS自動バックアップ (日次・ポイントインタイムリカバリ)
- **デプロイ**: Blue-Green / Rolling Update (ダウンタイムゼロ)

## 11. 見積もりサマリー

| フェーズ | 期間 | 主要成果物 |
|---------|------|------------|
| Phase 1: 基盤 | 2週間 | 開発環境・認証基盤・CI/CD |
| Phase 2: コアAPI | 2週間 | CRUD・状態遷移・履歴 |
| Phase 3: 外部連携 | 1週間 | 駅すぱあと・Google Maps・S3 |
| Phase 4: フロント | 3週間 | 3ロール分画面・共通UI |
| Phase 5: 統合・本番 | 2週間 | テスト・ドキュメント・デプロイ |
| **合計** | **10週間** | **本番リリース可能状態** |

## 12. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 駅すぱあとAPI仕様変更 | 高 | ラッパークラスで抽象化・バージョン固定・モック整備 |
| Entra ID設定の遅延 | 中 | 開発用テナント早期確保・モック認証で並行開発 |
| 複雑な状態遷移バグ | 高 | 状態遷移テーブル駆動・網羅的単体テスト・State Machineライブラリ検討 |
| 大量データ時の検索性能 | 中 | インデックス設計・ページング・必要ならマテリアライズドビュー |
| ファイルアップロード脆弱性 | 高 | 署名付きURL・内容検証・隔離バケット・WAF |

---

この設計提案をベースに、優先順位を調整して実装を開始できます。どのフェーズから着手するか、または特定領域の詳細設計を深掘りするかご指示ください。