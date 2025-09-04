import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";
import { leaderboardType } from "./types/leaderboard";

type LeaderboardResponse = BaseResponse<leaderboardType[]>;

export const getLeaderboard = async (versionId: number): Promise<LeaderboardResponse> => {
    try {
        const response = await Axios.post<LeaderboardResponse>(
            "/private/getleaderboard", {
                versionId: versionId
            }
        );
        return response.data;

    } catch (e) {
        Object.entries(e as {[key: string]: any}).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });
        return {
            success: false,
            message: "Network error",
            data: [],
        }
    }
}