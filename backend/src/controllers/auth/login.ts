import { Context } from "hono"
import { ConstructResponse } from "../../utils/responseConstructor"
import * as userModel from "../../models/user.model"
import { LoginPayload } from "../../types/payload/auth/login"
import { sign } from 'hono/jwt'
import { setCookie } from 'hono/cookie'

const LoginController = async (c: Context) => {
    try {
        const body = await c.req.json<LoginPayload>()
        if (!body.username || body.username.length === 0) return c.json(ConstructResponse(false, "Missing username"), 400)
        if (!body.password || body.password.length === 0) return c.json(ConstructResponse(false, "Missing password"), 400)

        const foundUser = await userModel.getByUsername(body.username)

        if (!foundUser) return c.json(ConstructResponse(false, "User not found"), 410)

        const isPasswordMatch = await Bun.password.verify(body.password, foundUser.password)

        if (!isPasswordMatch) return c.json(ConstructResponse(false, "Incorrect Password"), 411)

        const JWT_SECRET = Bun.env.JWT_SECRET

        if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable")

        const payload = {
            userId: foundUser.user_id
        }

        const jwtToken = await sign(payload, JWT_SECRET)

        setCookie(c, 'token', jwtToken)

        return c.json(ConstructResponse(true, "Login Successfully"), 200)
    } catch (e) {
        console.log(e)
        return c.json(ConstructResponse(false, `${e}`), 500)
    }
}

export { LoginController }