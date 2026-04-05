import Fastify from 'fastify'
import { buildApp } from './app'

const start = async () => {
  const port = parseInt(process.env.PORT ?? '3000', 10)
  const host = process.env.HOST ?? '0.0.0.0'

  const app = await buildApp()

  try {
    await app.listen({ port, host })
    console.log(`ServifyEU API running on http://${host}:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
