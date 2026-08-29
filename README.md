# menu

Bun workspaces を使った TypeScript モノレポです。

## 構成

- `packages/frontend`: Vite + React + React Router + TanStack Query + Astryx
- `packages/backend`: Cloudflare Workers + Hono + Drizzle ORM + D1

## セットアップ

```bash
bun install
bun run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health check: http://localhost:3000/api/health

開発時、Frontend の `/api/*` は Vite によって Backend へプロキシされます。

## Database

BackendはCloudflare D1を使用します。`bun run dev`ではWranglerがローカル専用D1を起動し、マイグレーションを自動適用します。ローカルデータは`.wrangler/state`配下へ保存され、本番D1とは分離されます。

```bash
bun run --cwd packages/backend db:generate
bun run --cwd packages/backend db:migrate:local
```

本番D1へマイグレーションを適用する場合:

```bash
bun run --cwd packages/backend deploy
bun run --cwd packages/backend db:migrate:remote
```

## デプロイ

Frontendのビルド、D1のマイグレーション、Cloudflare Workerへのデプロイを順番に実行します。FrontendとAPIは同じWorker URLから配信されます。

```bash
bun run deploy
```

## コマンド

```bash
bun run dev        # Frontend と Backend を起動
bun run build      # 全パッケージをビルド
bun run typecheck  # 全パッケージを型チェック
bun run deploy     # Cloudflareへデプロイ
```

Astryxのコンポーネント一覧やAPIは、Frontendで公式CLIから確認できます。

```bash
bun run --cwd packages/frontend astryx -- component --list
bun run --cwd packages/frontend astryx -- component Button
```
