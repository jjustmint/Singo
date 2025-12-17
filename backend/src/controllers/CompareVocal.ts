import { updateScore, uploadMistakes } from './../models/CompareVocal';
import { Context } from "hono"
import { ConstructResponse } from "../utils/responseConstructor"
import { FindSongIdPayload } from "../types/CompareVocal"
import { findUserRecordPath, findVersionPath } from "../models/CompareVocal"

export const CompareVocalController = async (c: Context) => {
    try{
        const body = await c.req.json<FindSongIdPayload>()
        console.log("Received body:", body)
        if(!body.recordId){
            return c.json(ConstructResponse(false, "Missing songId", 400));
        }
        if(!body.oriId){
            return c.json(ConstructResponse(false, "Missing original song id", 400));
        }
        const FindVersionData = await findVersionPath(body.oriId)
        const FindUserRecord = await findUserRecordPath(body.recordId)
        if (!FindVersionData) {
            return c.json(ConstructResponse(false, "Song not found"), 404)
        }
        const response = await fetch("http://localhost:8080/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                originalSongPath: FindVersionData.ori_path,
                userSongPath: FindUserRecord.user_audio_path
            })
        })
        const result = await response.json()
        await updateScore(body.recordId, result?.data?.finalScore)
        await uploadMistakes(body.recordId, result?.data?.mistakes)

        if (!response.ok || !result.success) {
            return c.json(
                ConstructResponse(false, result.message || "Error from compare API", 400)
            )
        }
        return c.json(
            ConstructResponse(true, "success at updating score", result.data)
        )
    }catch (e) {
        console.error("Execution error:", e)
    return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}
