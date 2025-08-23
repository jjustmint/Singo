import { Data } from './../../../node_modules/hono/dist/types/context.d';
import { Context } from "hono"
import { ConstructResponse } from "../../utils/responseConstructor"
import { RegisterPayload } from "../../types/payload/auth/register"
import * as userModel from "../../models/user.model"

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || 'data/uploads/users';

const RegisterController = async (c: Context) => {
    try {
        const body = await c.req.json<RegisterPayload>()
        if (!body.username || body.username.length === 0) return c.json(ConstructResponse(false, "Missing username"), 400)
        if (!body.password || body.password.length === 0) return c.json(ConstructResponse(false, "Missing password"), 400)
        
        const isUsernameDuplicate = (await userModel.getByUsername(body.username)) !== null

        if (isUsernameDuplicate) return c.json(ConstructResponse(false, "Username already existed"), 400)
        
        const hashedPassword = await Bun.password.hash(body.password);

        const newUser = await userModel.createNewUser(body.username, hashedPassword);

        const userId = newUser.user_id;
        userModel.createUserFolder(userId);

        return c.json(ConstructResponse(true, "Successfully Create new user", newUser), 201)
        
    } catch (e) {
        console.log(e)
        return c.json(ConstructResponse(false, `${e}`), 500)
    }
}

export { RegisterController }