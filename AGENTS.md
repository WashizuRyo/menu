## アプリのコンセプト

このアプリは、一週間分の献立を作成し、その献立から必要な食材をまとめた
買い物リストを作るためのアプリです。

## リポジトリ構成

- `packages/frontend`: Vite、React、TanStack Router、TanStack Query、Astryx
- `packages/backend`: Cloudflare Workers、Hono、Drizzle ORM、D1
- `packages/shared`: Frontend と Backend で共有する TypeScript コード

## 主要なコマンド

コマンドはリポジトリのルートで実行してください。

```bash
bun run setup:local # 依存関係とローカル D1 をセットアップ
bun run dev         # Frontend と Backend の開発サーバーを起動
bun run build       # 全パッケージをビルド
bun run test        # テストを実行
bun run format      # Biome でフォーマットと自動修正を実行
bun run typecheck   # 全パッケージを型チェック
bun run deploy      # DB migration 後に Cloudflare へデプロイ
bun run deploy:preview # Cloudflare に preview version をアップロード
```

## 完了条件

変更を終えたら、最終報告の前に必ず次のコマンドを実行してください。

```bash
bun run test
bun run format
bun run typecheck
```
