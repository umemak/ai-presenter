import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AI Presenter</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <script>
          // PDF.js worker setup
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        </script>
        <style>{`
          .slide-container {
            aspect-ratio: 16/9;
            background-color: #f3f4f6;
          }
          .loading-overlay {
            background: rgba(255, 255, 255, 0.9);
          }
        `}</style>
      </head>
      <body class="bg-gray-50 min-h-screen text-gray-800">
        <div id="app" class="container mx-auto px-4 py-8 max-w-5xl">
          {/* App content will be injected here by app.js */}
          <header class="mb-8 text-center">
            <h1 class="text-4xl font-bold text-blue-600 mb-2">
              <i class="fas fa-robot mr-2"></i>AI Presenter
            </h1>
            <p class="text-gray-600">スライド（PDF）をアップロードすると、AIがプレゼンしてくれます</p>
          </header>

          <main id="main-content" class="bg-white rounded-xl shadow-lg p-6 min-h-[600px] relative">
            <!-- Dynamic Content -->
            <div id="upload-section" class="text-center py-20">
              <div class="mb-6">
                <i class="fas fa-file-pdf text-6xl text-red-500 mb-4"></i>
                <p class="text-xl font-semibold mb-2">PDFファイルをアップロード</p>
                <p class="text-sm text-gray-500 mb-6">PowerPoint (pptx) は PDF に変換してからアップロードしてください</p>
              </div>
              <label class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full cursor-pointer transition shadow-md">
                <i class="fas fa-upload mr-2"></i>ファイルを選択
                <input type="file" id="file-input" accept=".pdf" class="hidden" />
              </label>
            </div>

            <div id="processing-section" class="hidden text-center py-20">
              <div class="animate-spin inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mb-6"></div>
              <h2 id="processing-status" class="text-xl font-semibold mb-2">解析中...</h2>
              <p id="processing-detail" class="text-gray-500">スライドを読み込んでいます</p>
              <div class="w-full max-w-md mx-auto mt-6 bg-gray-200 rounded-full h-2.5">
                <div id="progress-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
              </div>
            </div>

            <div id="presentation-section" class="hidden flex flex-col h-full">
              <div class="flex justify-between items-center mb-4">
                <div class="text-sm text-gray-500">
                  Slide <span id="current-slide-num">1</span> / <span id="total-slides-num">--</span>
                </div>
                <div class="space-x-2">
                  <button id="prev-btn" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">
                    <i class="fas fa-chevron-left"></i>
                  </button>
                  <button id="play-pause-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 min-w-[100px]">
                    <i class="fas fa-play mr-2"></i>再生
                  </button>
                  <button id="next-btn" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">
                    <i class="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
              
              <div class="flex-grow flex flex-col md:flex-row gap-6">
                <div class="w-full md:w-2/3">
                  <div class="slide-container relative rounded-lg overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center bg-black">
                    <img id="current-slide-img" src="" alt="Slide" class="max-w-full max-h-full object-contain" />
                  </div>
                </div>
                <div class="w-full md:w-1/3 flex flex-col">
                  <h3 class="font-bold text-lg mb-2 border-b pb-2">AI原稿</h3>
                  <div id="script-display" class="flex-grow bg-gray-50 p-4 rounded border border-gray-200 overflow-y-auto max-h-[400px] text-sm leading-relaxed whitespace-pre-wrap">
                    原稿がここに表示されます...
                  </div>
                  <div class="mt-4 p-3 bg-blue-50 rounded border border-blue-100 text-xs text-blue-800">
                    <i class="fas fa-info-circle mr-1"></i>
                    AI生成のため、内容に誤りがある可能性があります。
                  </div>
                </div>
              </div>
            </div>

          </main>
          
          <footer class="mt-8 text-center text-gray-400 text-sm">
            &copy; 2025 AI Presenter App
          </footer>
        </div>
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
})
