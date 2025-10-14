import { Context } from "hono"
import { ConstructResponse } from "../utils/responseConstructor";
import { findChartBoard, getChallengeSong, getUserInfo, setChallengeSong } from "../models/LeaderBoard";
import { LeaderBoardPayload } from "../types/payload/LeaderBoard";

export const FindLeaderBoardController = async (c: Context) => {
    try{
        const body = await c.req.json<LeaderBoardPayload>();
        const challengeSong = await getChallengeSong(body.start_date);
        if(!challengeSong){
            return c.json(ConstructResponse(false, "No challenge song found", 404));
        }
        const response = await findChartBoard(challengeSong?.version_id || 0, challengeSong?.start_date || new Date());
        if(!response){
            return c.json(ConstructResponse(false, "no one sings yet", 404));
        }
        const leaderBoardData = await Promise.all(
            response.map(async (record) => {
              if (record.user_id === null) {
                return {
                  userName: "Unknown",
                  accuracyScore: record._max.accuracy_score,
                  createdAt: record._max.created_at,
                };
              }
          
              const userInfo = await getUserInfo(record.user_id);
          
              return {
                record_id: record._max.record_id,
                user_id: record.user_id,
                userName: userInfo?.username ?? "Unknown",
                profilePicture: userInfo?.photo ?? null,
                accuracyScore: record._max.accuracy_score,
                createdAt: record._max.created_at,
              };
            })
          );

    return c.json(ConstructResponse(true, "Leaderboard found", leaderBoardData), 200);
 
    }catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}

export const setChallengeSongController = async (c: Context) => {
  try{
      const body = await c.req.json<{version_id: number, start_date: string}>();
      if(!body.version_id){
          return c.json(ConstructResponse(false, "Missing version id", 400));
      }
      const challengeSong = await setChallengeSong(body.version_id, body.start_date);
      if(!challengeSong){
          return c.json(ConstructResponse(false, "Version not found", 404));
      }
      return c.json(ConstructResponse(true, "Challenge song set", challengeSong), 200);
  }catch (e) {
      return c.json(ConstructResponse(false, `Error: ${e}`), 500)
  }
}