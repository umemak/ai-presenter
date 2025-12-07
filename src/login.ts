import { Context } from 'hono'

export const loginPage = (c: Context) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ログイン - AI Presenter</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div class="text-center mb-8">
            <div class="inline-block p-4 bg-blue-100 rounded-full mb-4">
              <i class="fas fa-robot text-4xl text-blue-600"></i>
            </div>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">AI Presenter</h1>
            <p class="text-gray-600">ログインしてください</p>
          </div>

          <form id="login-form" class="space-y-6">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-user mr-2"></i>ユーザー名
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="ユーザー名を入力"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-lock mr-2"></i>パスワード
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="パスワードを入力"
              />
            </div>

            <div id="error-message" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <i class="fas fa-exclamation-circle mr-2"></i>
              <span id="error-text"></span>
            </div>

            <button
              type="submit"
              id="login-btn"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
            >
              <i class="fas fa-sign-in-alt mr-2"></i>
              ログイン
            </button>
          </form>

          <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p class="text-xs text-blue-800 text-center">
              <i class="fas fa-info-circle mr-1"></i>
              デモ用の固定認証情報を使用してください
            </p>
            <p class="text-xs text-blue-600 text-center mt-2">
              ユーザー名: <strong>admin</strong> / パスワード: <strong>password123</strong>
            </p>
          </div>
        </div>

        <script>
          const form = document.getElementById('login-form');
          const errorDiv = document.getElementById('error-message');
          const errorText = document.getElementById('error-text');
          const loginBtn = document.getElementById('login-btn');

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // エラーメッセージを非表示
            errorDiv.classList.add('hidden');
            
            // ローディング状態
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>ログイン中...';

            try {
              const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
              });

              const data = await response.json();

              if (response.ok && data.success) {
                // ログイン成功 - リダイレクト
                window.location.href = '/';
              } else {
                // ログイン失敗
                errorText.textContent = data.error || 'ログインに失敗しました';
                errorDiv.classList.remove('hidden');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>ログイン';
              }
            } catch (error) {
              errorText.textContent = 'ネットワークエラーが発生しました';
              errorDiv.classList.remove('hidden');
              loginBtn.disabled = false;
              loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>ログイン';
            }
          });
        </script>
      </body>
    </html>
  `)
}
