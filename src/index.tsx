import { Hono } from 'hono'
import { renderer } from './renderer'
import { loginPage } from './login'
import { authMiddleware, login, setSession, clearSession } from './auth'

type Bindings = {
  AI: any
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// 認証ミドルウェアを全ルートに適用
app.use('*', authMiddleware)

// ログインページ
app.get('/login', loginPage)

// ログインAPI
app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json()
  
  if (login(username, password)) {
    setSession(c)
    return c.json({ success: true })
  } else {
    return c.json({ success: false, error: 'ユーザー名またはパスワードが正しくありません' }, 401)
  }
})

// ログアウトAPI
app.post('/api/logout', async (c) => {
  clearSession(c)
  return c.json({ success: true })
})

// メインページ（認証済みユーザーのみ）
app.get('/', renderer)

// API: Analyze presentation structure (全体構成を解析)
app.post('/api/analyze-structure', async (c) => {
  const { slides } = await c.req.json()
  
  if (!slides || slides.length === 0) {
    return c.json({ error: 'Slides data is required' }, 400)
  }

  try {
    // 全スライドをLLaVAで解析して説明文を取得
    const descriptions: string[] = []
    
    for (let i = 0; i < slides.length; i++) {
      const image = slides[i]
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "")
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      const imageArray = [...buffer]

      const visionResp = await c.env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
        image: imageArray,
        prompt: "Describe this presentation slide concisely. Include the title and main points."
      })

      descriptions.push(`スライド${i + 1}: ${visionResp.description || ""}`)
    }

    // Llama 3で全体構成を分析
    const structurePrompt = `以下は${slides.length}枚のプレゼンテーションスライドの説明です。
このプレゼンテーション全体の構成、流れ、主要なテーマを分析してください。

${descriptions.join('\n\n')}

プレゼンテーション全体の構成を簡潔にまとめてください（200文字程度）。`

    const structureResp = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'あなたはプレゼンテーション分析の専門家です。' },
        { role: 'user', content: structurePrompt }
      ]
    })

    return c.json({ 
      structure: structureResp.response,
      descriptions: descriptions 
    })

  } catch (error: any) {
    console.error('Structure analysis error:', error)
    return c.json({ error: error.message || 'Failed to analyze structure' }, 500)
  }
})

// API: Generate presentation script using Cloudflare Workers AI
// （全体構成を踏まえて個別のスライド原稿を生成）
app.post('/api/generate-script', async (c) => {
  const { slideNumber, description, structure, totalSlides } = await c.req.json()
  
  if (!description || !slideNumber) {
    return c.json({ error: 'Slide data is required' }, 400)
  }

  try {
    // Llama 3で原稿を生成（全体構成を考慮）
    const systemPrompt = `あなたはプロフェッショナルなプレゼンターです。
全体で${totalSlides}枚のプレゼンテーションの${slideNumber}枚目のスライドの原稿を作成してください。

プレゼンテーション全体の構成: ${structure || '（不明）'}

スライド原稿の作成ルール:
- 口語体で、聴衆に語りかけるように話してください。
- 文字を読むだけでなく、スライドの意図を汲み取って補足してください。
- 全体の流れの中でのこのスライドの位置を意識してください。
- 「えー」などのフィラーは入れないでください。
- 30秒〜1分程度の長さにしてください。
- 出力は原稿のテキストのみにしてください。余計な説明は不要です。`

    const userPrompt = `スライド${slideNumber}の内容: ${description}`

    const textResp = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })

    return c.json({ script: textResp.response })

  } catch (error: any) {
    console.error('Script generation error:', error)
    return c.json({ error: error.message || 'Failed to generate script' }, 500)
  }
})

// API: Save presentation to database
app.post('/api/save-presentation', async (c) => {
  try {
    const { filename, slides } = await c.req.json()
    
    if (!filename || !slides || slides.length === 0) {
      return c.json({ error: 'Invalid data' }, 400)
    }

    // Insert presentation
    const presentationResult = await c.env.DB.prepare(
      'INSERT INTO presentations (filename, total_slides) VALUES (?, ?)'
    ).bind(filename, slides.length).run()

    const presentationId = presentationResult.meta.last_row_id

    // Insert slides
    for (const slide of slides) {
      await c.env.DB.prepare(
        'INSERT INTO slides (presentation_id, slide_number, image_data, script) VALUES (?, ?, ?, ?)'
      ).bind(presentationId, slide.pageNum, slide.image, slide.script).run()
    }

    return c.json({ success: true, id: presentationId })
  } catch (error: any) {
    console.error('Save error:', error)
    return c.json({ error: error.message || 'Failed to save presentation' }, 500)
  }
})

// API: Get presentation list
app.get('/api/presentations', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT id, filename, total_slides, created_at FROM presentations ORDER BY created_at DESC LIMIT 50'
    ).all()

    return c.json({ presentations: result.results || [] })
  } catch (error: any) {
    console.error('Get presentations error:', error)
    return c.json({ error: error.message || 'Failed to get presentations' }, 500)
  }
})

// API: Get presentation by ID
app.get('/api/presentations/:id', async (c) => {
  try {
    const id = c.req.param('id')

    // Get presentation info
    const presentation = await c.env.DB.prepare(
      'SELECT * FROM presentations WHERE id = ?'
    ).bind(id).first()

    if (!presentation) {
      return c.json({ error: 'Presentation not found' }, 404)
    }

    // Get slides
    const slidesResult = await c.env.DB.prepare(
      'SELECT slide_number, image_data, script FROM slides WHERE presentation_id = ? ORDER BY slide_number'
    ).bind(id).all()

    return c.json({
      presentation,
      slides: slidesResult.results || []
    })
  } catch (error: any) {
    console.error('Get presentation error:', error)
    return c.json({ error: error.message || 'Failed to get presentation' }, 500)
  }
})

// API: Delete presentation
app.delete('/api/presentations/:id', async (c) => {
  try {
    const id = c.req.param('id')

    await c.env.DB.prepare('DELETE FROM presentations WHERE id = ?').bind(id).run()

    return c.json({ success: true })
  } catch (error: any) {
    console.error('Delete error:', error)
    return c.json({ error: error.message || 'Failed to delete presentation' }, 500)
  }
})

export default app
