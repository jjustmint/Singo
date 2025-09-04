import { Context } from "hono"
import { ConstructResponse } from "../utils/responseConstructor";
import { getUserById } from "../models/user.model";

export const UserController = async (c: Context) => {
    const userId = c.get("user_id");
    if (!userId) return c.json(ConstructResponse(false, "Missing user id"), 400);

    const user = await getUserById(userId);
    if (!user) return c.json(ConstructResponse(false, "User not found"), 404);
    return c.json(ConstructResponse(true, "Successfully Updated Key", user), 200);
}