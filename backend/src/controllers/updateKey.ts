import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import { updateKey } from "../models/user.model";
import * as userModel from "../models/user.model";
import { UpdateKeyPayload } from "../types/UpdateKey";

const UpdateKeyController = async (c: Context) => {
    try{
        const body = await c.req.json<UpdateKeyPayload>()
        if (!body.key || body.key.length === 0) return c.json(ConstructResponse(false, "Missing key"), 400)
            
        const userId = c.get('user_id')

        if (!userId) return c.json(ConstructResponse(false, "Missing user id"), 400)

        const updatedUser = await updateKey(userId, body.key)

        return c.json(ConstructResponse(true, "Successfully Update Key", updatedUser), 200)

    }catch (e) {
        return c.json(ConstructResponse(false, `${e}`), 500)
    }
}

export { UpdateKeyController }