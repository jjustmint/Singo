import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import { getMistake } from "../models/Mistakes";

export const DisplayMistakesController = async (c: Context) => {
    try{
        const userId = c.get("user_id");
        if(!userId){
            return c.json(ConstructResponse(false, "Missing user id", 400));
        }
        const { recordId } = await c.req.json<{recordId: number}>();
        const response = await getMistake(recordId);
        if(!recordId){
            return c.json(ConstructResponse(false, "Missing record id", response));
        }

        return c.json(ConstructResponse(true, "Mistakes found", response), 200);
    }catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}