import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import { updateKey } from "../models/user.model";
import * as userModel from "../models/user.model";
import { UpdateKeyPayload } from "../types/UpdateKey";

const UpdateKeyController = async (c: Context) => {
    try{
        const userId = c.get('user_id')

        if (!userId) return c.json(ConstructResponse(false, "Missing user id"), 400)

        const res = await fetch('http://localhost:8081/keydetect', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

        const data = await res.json()
        const update = await updateKey(userId, data.data.detectKey)

        return c.json(ConstructResponse(true, "Successfully Update Key", update), 200)

    }catch (e) {
        return c.json(ConstructResponse(false, `${e}`), 500)
    }
}

export { UpdateKeyController }