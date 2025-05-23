import { Hono } from 'hono'
import { PrismaClient } from './generated/prisma';
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { mainRouter } from './routes/main.router';

const app = new Hono()

app.use(logger())

app.use(cors({
  origin: [""], // Your frontend URL
  credentials: true
}))

export const prisma = new PrismaClient();

prisma.$connect().catch((e) => {
  throw new Error(`Error connecting to database : ${e}`)
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route("", mainRouter)

export default {
  fetch: app.fetch,
  port: 8000
}
