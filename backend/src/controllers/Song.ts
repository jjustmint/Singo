import { audio_version } from './../generated/prisma/index.d';
import { FindLyricsBySongId } from "../models/Lyrics";
import { FindAllSong, FindAudioVerById, FindSongKeyBySongId } from "../models/Song";
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

export const getSongController = async (c: Context) => {
    try{
        const { songId } = await c.req.json<{ songId: number }>();
        if(!songId){
            return c.json(ConstructResponse(false, "Missing song id", 400));
        }
        const lyrics = await FindLyricsBySongId(songId);
        return c.json(ConstructResponse(true, "Song found", lyrics ? lyrics : null), 200);
    }catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}   

export const getSongKeyController = async (c: Context) => {
    try{
        const { song_id } = await c.req.json<{ song_id: number }>();
        if(!song_id){
            return c.json(ConstructResponse(false, "Missing song id", 400));
        }
        const song = await FindSongKeyBySongId(song_id);
        if(!song){
            return c.json(ConstructResponse(false, "Song not found", 404));
        }
        return c.json(ConstructResponse(true, "Key found", song), 200);
    }catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}

export const getAudioVerByIdController = async (c: Context) => {
    try{
        const { audio_version_id } = await c.req.json<{ audio_version_id: number }>();
        if(!audio_version_id){
            return c.json(ConstructResponse(false, "Missing song id", 400));
        }
        const song = await FindAudioVerById(audio_version_id);
        if(!song){
            return c.json(ConstructResponse(false, "Song not found", 404));
        }
        return c.json(ConstructResponse(true, "Song found", song), 200);
    }catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}