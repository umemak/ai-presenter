import { Hono } from 'hono'

type Bindings = {
  AI: any
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>AI Presenter - Test</title>
      </head>
      <body>
        <h1>AI Presenter - Test Page</h1>
        <p>If you see this, the basic Hono app is working!</p>
      </body>
    </html>
  `)
})

app.get('/test', (c) => {
  return c.json({ message: 'API is working!' })
})

export default app
