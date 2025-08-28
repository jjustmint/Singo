import { FindAllSong } from "../models/Song";
import { ConstructResponse } from "../utils/responseConstructor";
import { Context } from "hono";

export const DisplaySongsController = async (c: Context) => {
    try{
        const findSong = await FindAllSong()
        if(!findSong){
            return c.json(ConstructResponse(false, "Song not found", 404));
        }
        return c.json(ConstructResponse(true, "Song found", findSong), 200);
    }catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}