import { Context } from "hono"
import { ConstructResponse } from "../utils/responseConstructor";
import { findChartBoard, getUserInfo } from "../models/LeaderBoard";
import { LeaderBoardPayload } from "../types/payload/LeaderBoard";

export const FindLeaderBoardController = async (c: Context) => {
    try{
        const body = await c.req.json<LeaderBoardPayload>();
        console.log("Received body:", body);
        if(!body.versionId){
            return c.json(ConstructResponse(false, "Missing versionId", 400));
        }
        const response = await findChartBoard(body.versionId);
        if(!response){
            return c.json(ConstructResponse(false, "no one sings yet", 404));
        }
        const leaderBoardData = await Promise.all(
            response.map(async (record) => {
              if (record.user_id === null) {
                return {
                  userName: "Unknown",
                  accuracyScore: record.accuracy_score,
                  recordId: record.record_id,
                  versionId: record.version_id,
                  createdAt: record.created_at,
                  userAudioPath: record.user_audio_path,
                };
              }
          
              const userInfo = await getUserInfo(record.user_id);
          
              return {
                userName: userInfo?.username ?? "Unknown",
                profilePicture: userInfo?.photo ?? null,
                accuracyScore: record.accuracy_score,
                recordId: record.record_id,
                versionId: record.version_id,
                createdAt: record.created_at,
                userAudioPath: record.user_audio_path,
              };
            })
          );

    return c.json(ConstructResponse(true, "Leaderboard found", leaderBoardData), 200);
 
    }catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}
