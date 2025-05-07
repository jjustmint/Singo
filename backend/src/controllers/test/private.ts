import { Context } from "hono";
import { ConstructResponse } from "../../utils/responseConstructor";

const PrivateController = async (c: Context) => {
    const userId = c.get('user_id')
    return c.json(ConstructResponse(true, `Hello ${userId}`), 200)
}

export { PrivateController }