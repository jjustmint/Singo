import { Context } from "hono"
import { ConstructResponse } from "../utils/responseConstructor"
import { exec } from "child_process"
import { promisify } from "util"
import { CompareVocalPayload, FindSongIdPayload } from "../types/CompareVocal"
import { findUserRecordPath, findVersionPath } from "../models/CompareVocal"

const execAsync = promisify(exec)

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

        if (!response.ok || !result.success) {
            return c.json(
                ConstructResponse(false, result.message || "Error from compare API", 400)
            )
        }

        // Success response
        return c.json(
            ConstructResponse(true, result, 200)
        )
    }catch (e) {
        console.error("Execution error:", e)
    return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}
