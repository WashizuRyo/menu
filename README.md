# menu

Bun workspaces を使った TypeScript モノレポです。

## 構成

- `packages/frontend`: Vite + React + React Router + TanStack Query + Astryx
- `packages/backend`: Cloudflare Workers + Hono + Drizzle ORM + D1

## インフラ構成

本番環境はCloudflare Workersにデプロイします。Cloudflare Pagesは使用せず、1つのWorkerでFrontendとBackendを配信します。

```text
https://menu-backend.appnest.workers.dev
├── /api/*  → Cloudflare Worker（Hono API）
│              └── D1 binding: DB → Cloudflare D1（menu）
└── その他  → Workers Static Assets（Reactのビルド成果物）
```

## セットアップ

```bash
bun install
bun run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health check: http://localhost:3000/api/health

開発時、Frontend の `/api/*` は Vite によって Backend へプロキシされます。

## コマンド

```bash
bun run dev        # Frontend と Backend を起動
bun run build      # 全パッケージをビルド
bun run format     # 全パッケージをフォーマット
bun run test     # 全パッケージをテスト
bun run typecheck  # 全パッケージを型チェック
bun run deploy     # Cloudflareへデプロイ
```
