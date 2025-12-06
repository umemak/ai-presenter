import { Hono } from 'hono'
import OpenAI from 'openai'
import { renderer } from './renderer'

type Bindings = {
  OPENAI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', renderer)

// API: Generate presentation script from image
app.post('/api/generate-script', async (c) => {
  const { image, context } = await c.req.json()
  
  if (!image) {
    return c.json({ error: 'Image is required' }, 400)
  }

  const openai = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
  })

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたはプロフェッショナルなプレゼンターです。
提供されたスライド画像の内容に基づいて、聴衆を引き込むような自然なプレゼンテーションの原稿を作成してください。
以下のルールを守ってください：
1. 口語体で、実際に話しているような自然なトーンにする。
2. スライドの要点を的確に説明するが、文字をただ読むだけでなく、補足や洞察を加える。
3. "えー"、"あー"などのフィラーは入れない。
4. 1枚のスライドにつき、30秒〜1分程度で話せる長さにする。
5. 出力は純粋なスピーチ原稿のみを返すこと（「はい、これが原稿です」などの前置きは不要）。
${context ? `追加のコンテキスト: ${context}` : ''}`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "このスライドのプレゼン原稿を作成してください。" },
            {
              type: "image_url",
              image_url: {
                "url": image, // Base64 data URL is expected here
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const script = response.choices[0].message.content;
    return c.json({ script });
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    return c.json({ error: error.message || 'Failed to generate script' }, 500);
  }
})

// API: Generate audio from text
app.post('/api/generate-audio', async (c) => {
  const { text } = await c.req.json()

  if (!text) {
    return c.json({ error: 'Text is required' }, 400)
  }

  const openai = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
  })

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    // Convert to base64 to send back to client
    const base64Audio = buffer.toString('base64');

    return c.json({ audio: `data:audio/mp3;base64,${base64Audio}` });
  } catch (error: any) {
    console.error('OpenAI TTS Error:', error);
    return c.json({ error: error.message || 'Failed to generate audio' }, 500);
  }
})

export default app
