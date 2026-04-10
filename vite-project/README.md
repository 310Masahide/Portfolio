# vite-project（ポートフォリオ内の React / Vite アプリ）

## 開発

```bash
npm install
cp .env.example .env   # 必要なキーを設定
npm run dev
```

振り返り機能の AI 連携は開発サーバーの **`/api/gemini`** プロキシ経由です。`GEMINI_API_KEY`（推奨）または互換の `VITE_GEMINI_API_KEY` を `.env` に設定してください。

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | 型チェック + 本番ビルド |
| `npm run lint` | ESLint |
| `npm run test` | Vitest（ユニットテスト） |
| `npm run test:watch` | Vitest ウォッチ |

## 本番ビルドとセキュリティ

- **`npm run build`** 時に `index.html` へ **Content-Security-Policy** メタが挿入されます（開発 `npm run dev` には付きません。HMR との兼ね合いのため）。
- 静的ホストのみの場合、`/api/gemini` は存在しないため、AI 機能は別途バックエンドまたはエッジプロキシが必要です（アプリ内の文言でも案内しています）。

## 履歴リストとパフォーマンス

履歴は **ページネーション**（1 ページあたりの件数は `useFurikaeri` 内の `PAGE_SIZE`）で描画件数を抑えています。仮想スクロールライブラリは入れておらず、通常利用では DOM 負荷は限定的です。

## `/api/openai`

開発サーバーでは **`POST /api/openai`**（OpenAI Responses API プロキシ）もマウントしています。現状のフロントからは呼び出していません。手動の curl や将来の拡張用です。
