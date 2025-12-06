# AI Presenter Web App

スライド（PDF）をアップロードすると、AIがプレゼンテーションの原稿を作成し、音声で読み上げてくれるWebアプリケーションです。
**Cloudflare Workers AI** と **Web Speech API** を使用しているため、APIキー不要で無料で利用できます。

## 機能
- **PDFアップロード**: スライド（PDF）をブラウザで解析
- **AI原稿生成**: Cloudflare Workers AI (LLaVA + Llama 3) がスライド画像を解析し、自然なプレゼン原稿を作成
- **音声合成**: Web Speech API (ブラウザ標準機能) を使用して原稿を読み上げ（完全無料）
- **自動再生**: 音声に合わせてスライドを自動で切り替えながら再生

## 技術スタック
- **Frontend**: HTML, CSS (Tailwind), JavaScript (PDF.js)
- **Backend**: Hono (Cloudflare Pages), Cloudflare Workers AI
- **AI Models**: 
  - Image Analysis: `@cf/llava-hf/llava-1.5-7b-hf`
  - Text Generation: `@cf/meta/llama-3-8b-instruct`

## セットアップ手順

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **開発サーバーの起動**
   ```bash
   npm run dev
   ```
   ブラウザで `http://localhost:5173` にアクセスします。
   ※ ローカル開発でCloudflare Workers AIを使用するには、Cloudflareへのログインが必要な場合があります。

3. **デプロイ (Cloudflare Pages)**
   GitHubへプッシュするとCloudflare Pagesへ自動デプロイされます（連携設定済みの場合）。
   または手動デプロイ：
   ```bash
   npm run deploy
   ```

## 注意事項
- **PowerPoint (pptx)**: PDFに変換してからアップロードしてください。
- **ブラウザ互換性**: 音声合成にはブラウザのWeb Speech APIを使用します。Chrome, Edge, Safari, Firefoxなどの最新版で動作します。
