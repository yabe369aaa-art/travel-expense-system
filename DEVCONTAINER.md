# 開発環境セットアップガイド

このプロジェクトは **Dev Container** に対応しています。どの環境でも同一の開発環境を再現できます。

## 前提条件

- **Docker Desktop** がインストール・起動済み
- **VS Code** または **Cursor** がインストール済み
- **Dev Containers 拡張機能** がインストール済み（VS Codeの場合）

## クイックスタート

### 1. リポジトリクローン

```bash
git clone https://github.com/yabe369aaa-art/travel-expense-system.git
cd travel-expense-system
```

### 2. 環境変数設定

```bash
cp .env.example .env
# .env をエディタで開き、必要な値を編集
```

### 3. Dev Container で開く

#### VS Code / Cursor
1. `F1` → `Dev Containers: Reopen in Container` を選択
2. 初回のみビルド実行（2〜3分程度）
3. 完了後、自動で依存関係インストール・DB生成・サービス起動まで実行

#### GitHub Codespaces
1. GitHubリポジトリページで `Code` → `Codespaces` → `Create codespace on main`
2. ブラウザ上で同一環境が即座に利用可能

## 含まれるもの

| カテゴリ | 内容 |
|---------|------|
| **ランタイム** | Node.js 20, npm 10.8.0 |
| **システムツール** | git, curl, wget, openssl, postgresql-client |
| **Nodeパッケージ** | 全ワークスペース分（`package-lock.json` 準拠） |
| **Prisma** | Client 生成済み（`prisma generate` 実行済み） |
| **VS Code拡張** | ESLint, Prettier, Prisma, Tailwind CSS, Docker 等 |
| **ポート転送** | 3000(OIDC), 5173(Frontend), 5432(DB), 4566(S3), 8025(MailHog) |

## 起動されるサービス

`postStartCommand` で自動起動：

```bash
docker-compose -f docker-compose.yml up -d
```

| サービス | ポート | 用途 |
|---------|-------|------|
| Mock OIDC | 3000 | 認証プロバイダ |
| Frontend (Vite) | 5173 | 開発サーバー |
| PostgreSQL | 5432 | データベース |
| LocalStack | 4566 | S3 モック |
| MailHog | 1025/8025 | メール送信テスト |

## 開発コマンド

コンテナ内のターミナルで実行：

```bash
# 全体
npm run dev          # 開発サーバー起動（Turbo）
npm run build        # ビルド
npm run lint         # リント
npm run test         # テスト

# バックエンド
npm run db:migrate   # マイグレーション実行
npm run db:studio    # Prisma Studio
npm run db:seed      # シードデータ投入

# フロントエンド
npm run storybook    # Storybook起動
```

## 新しいパッケージ追加時

```bash
# 例: バックエンドに追加
cd packages/backend
npm install <package-name>

# ルートでロックファイル更新確認
cd ../..
git add package-lock.json packages/backend/package-lock.json
git commit -m "chore: add <package-name>"
git push
```

→ 他のPCで `git pull` 後、Dev Container 再ビルドで自動反映

## トラブルシューティング

### ビルドが遅い / 失敗する
```bash
# キャッシュクリアして再ビルド
F1 → Dev Containers: Rebuild Container
```

### ポート競合
ホスト側で同一ポート使用中の場合、VS Codeのポート転送パネルで別ポートにマッピング変更可能

### node_modules が反映されない
ボリュームマウントで永続化しているため、稀に古いキャッシュが残ることがあります：
```bash
# コンテナ内で
rm -rf node_modules packages/*/node_modules
npm ci
```

### データベース接続エラー
`.env` の `DATABASE_URL` が正しいか確認：
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/travel_expense?schema=public
```
※ `localhost` はコンテナ内から見たホスト（docker-compose のサービス名 `postgres` でも可）

## 構成ファイル

| ファイル | 説明 |
|---------|------|
| `.devcontainer/Dockerfile` | ベースイメージ・システム依存・npm ci・Prisma生成 |
| `.devcontainer/devcontainer.json` | VS Code設定・ポート・ボリューム・拡張機能・起動コマンド |
| `.env.example` | 環境変数テンプレート |
| `docker-compose.yml` | 開発用サービス群（PostgreSQL, LocalStack, OIDC, MailHog） |
| `package-lock.json` | 依存関係ロック（必ずコミット） |

## 2台以上のPCで開発する場合

1. **共通**: このリポジトリをクローン → Dev Container で開く
2. **各PC固有**: `.env` のみローカルで編集（`.env` は gitignore 済み）
3. **同期**: `package-lock.json` 等のロックファイルをコミット → Push → Pull で自動反映

## 補足: Dev Container を使わない場合

```bash
# ホストマシンに Node 20 + pnpm/npm が必要
npm ci
npm run db:generate
docker-compose up -d
npm run dev
```
※ バージョン差異・環境差異が発生しやすいため非推奨