import { Context, Next } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

// 固定の認証情報
const FIXED_USERNAME = 'admin'
const FIXED_PASSWORD = 'password123'

// セッションの有効期限（24時間）
const SESSION_MAX_AGE = 60 * 60 * 24

// 簡易的なセッショントークン生成
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// ログイン処理
export function login(username: string, password: string): boolean {
  return username === FIXED_USERNAME && password === FIXED_PASSWORD
}

// 認証ミドルウェア
export async function authMiddleware(c: Context, next: Next) {
  const sessionToken = getCookie(c, 'session_token')
  
  // ログインページとログインAPIは認証不要
  if (c.req.path === '/login' || c.req.path === '/api/login' || c.req.path === '/api/logout') {
    return next()
  }
  
  // セッショントークンがない場合はログインページへリダイレクト
  if (!sessionToken) {
    return c.redirect('/login')
  }
  
  // セッショントークンがあれば次の処理へ
  return next()
}

// セッション設定
export function setSession(c: Context) {
  const token = generateSessionToken()
  setCookie(c, 'session_token', token, {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/'
  })
}

// セッション削除
export function clearSession(c: Context) {
  deleteCookie(c, 'session_token', {
    path: '/'
  })
}
