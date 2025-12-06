# AI Presenter Web App

スライド（PDF）をアップロードすると、AIがプレゼンテーションの原稿を作成し、音声で読み上げてくれるWebアプリケーションです。

## 機能
- **PDFアップロード**: スライド（PDF）をブラウザで解析
- **AI原稿生成**: GPT-4o がスライド画像を解析し、自然なプレゼン原稿を作成
- **音声合成**: AI生成された原稿を音声(TTS)に変換
- **自動再生**: 音声に合わせてスライドを自動で切り替えながら再生

## 技術スタック
- **Frontend**: HTML, CSS (Tailwind), JavaScript (PDF.js)
- **Backend**: Hono (Cloudflare Pages)
- **AI**: OpenAI API (GPT-4o, TTS-1)

## セットアップ手順

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **環境変数の設定**
   `.dev.vars.example` をコピーして `.dev.vars` を作成し、OpenAI API Keyを設定してください。
   ```bash
   cp .dev.vars.example .dev.vars
   # .dev.vars ファイルを編集して OPENAI_API_KEY を入力
   ```

3. **開発サーバーの起動**
   ```bash
   npm run dev
   ```
   ブラウザで `http://localhost:5173` にアクセスします。

4. **デプロイ (Cloudflare Pages)**
   ```bash
   npm run deploy
   ```
   デプロイ後、Cloudflareダッシュボードで環境変数 `OPENAI_API_KEY` を設定してください。

## 注意事項
- **PowerPoint (pptx)**: PDFに変換してからアップロードしてください。
- **コスト**: OpenAI APIを使用するため、API利用料が発生します。
- **ブラウザ**: PDF処理はブラウザ上で行われるため、重いPDFファイルは処理に時間がかかる場合があります。
