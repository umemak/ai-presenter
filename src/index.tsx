import { Hono } from 'hono'
import { renderer } from './renderer'

type Bindings = {
  AI: any
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', renderer)

// API: Generate presentation script using Cloudflare Workers AI
app.post('/api/generate-script', async (c) => {
  const { image, context } = await c.req.json()
  
  if (!image) {
    return c.json({ error: 'Image is required' }, 400)
  }

  try {
    // 1. Prepare image for LLaVA
    // remove "data:image/jpeg;base64," prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const imageArray = [...buffer];

    // 2. Run LLaVA to understand the image
    // LLaVA is good at describing images but prompt following can be tricky for specific formats
    const visionResp = await c.env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
      image: imageArray,
      prompt: "Describe this presentation slide in detail. Include the title, bullet points, charts, and any key text visible."
    });

    const imageDescription = visionResp.description || "";

    // 3. Run Llama 3 to generate the actual speech script based on the description
    const systemPrompt = `あなたはプロフェッショナルなプレゼンターです。
スライドの視覚情報（説明文）に基づいて、日本語で自然なプレゼンテーションの原稿を作成してください。
- 口語体で、聴衆に語りかけるように話してください。
- 文字を読むだけでなく、スライドの意図を汲み取って補足してください。
- 「えー」などのフィラーは入れないでください。
- 30秒〜1分程度の長さにしてください。
- 出力は原稿のテキストのみにしてください。余計な説明は不要です。
${context ? `追加コンテキスト: ${context}` : ''}`;

    const userPrompt = `以下のスライド内容の説明に基づいて原稿を作成してください：\n\n${imageDescription}`;

    const textResp = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    return c.json({ script: textResp.response });

  } catch (error: any) {
    console.error('Cloudflare AI Error:', error);
    return c.json({ error: error.message || 'Failed to generate script' }, 500);
  }
})

// Audio generation is now handled by the browser (Web Speech API) to be free and faster
// The /api/generate-audio endpoint is removed

export default app
