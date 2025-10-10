import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";
import { LeaderboardEntryType } from "./types/leaderboard";

type LeaderboardResponse = BaseResponse<LeaderboardEntryType[]>;

export const getLeaderboard = async (startDate: string): Promise<LeaderboardResponse> => {
    try {
        const response = await Axios.post<LeaderboardResponse>(
            "/private/getleaderboard", {
                start_date: startDate
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
