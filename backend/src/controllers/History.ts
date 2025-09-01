import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import { FindHistoryByUserId } from "../models/History";

export const HistoryController = async (c : Context) => {
    const userId = c.get("user_id");
    if(!userId) return c.json(ConstructResponse(false, "Missing user id"), 400);
    const history = await FindHistoryByUserId(userId);
    return c.json(ConstructResponse(true, "History found", history), 200);
}