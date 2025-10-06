import { song } from './../generated/prisma/index.d';
import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import { LyricPayload } from "../types/Lyric";
import { AddLyric, GetLyricsBySongId } from "../models/Lyrics";

export const AddLyricController = async (c: Context) => {
    try{
        const body = await c.req.json<LyricPayload>();
        if (!body.song_id) {
            return c.json(ConstructResponse(false, "Missing song id", 400));
        }
        const addLyric =  await AddLyric(body.song_id, body.lyric, body.timestart);
        return c.json(ConstructResponse(true, "Add lyric successfully", addLyric), 200);
    }catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }   
}

export const GetLyricController = async (c: Context) => {
    try{
        const { song_id } = await c.req.json<{song_id: number}>();
        if (!song_id) {
            return c.json(ConstructResponse(false, "Missing song id", 400));
        }
        const getLyric =  await GetLyricsBySongId(song_id);
        return c.json(ConstructResponse(true, "Get lyric successfully", getLyric), 200);
    }catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }   
}