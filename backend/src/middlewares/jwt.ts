import { Context, Next } from "hono"
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { ConstructResponse } from "../utils/responseConstructor"

const jwtMiddleware = async (c: Context, next: Next) => {
    try {
        const token = getCookie(c, 'token')
        if (!token) return c.json(ConstructResponse(false, "Not Allowed"), 405)

        const JWT_SECRET = Bun.env.JWT_SECRET

        if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable")

        const decodedToken = await verify(token, JWT_SECRET)

        const userId = decodedToken["userId"] as number

        c.set('user_id', userId)

        await next()
    } catch (e) {
        console.log(e)
        return c.json(ConstructResponse(false, `${e}`), 500)
    }
}

export { jwtMiddleware }