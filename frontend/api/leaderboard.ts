import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";
import { LeaderboardPayload } from "./types/leaderboard";

type LeaderboardResponse = BaseResponse<LeaderboardPayload>;

export const getLeaderboard = async (date: string): Promise<LeaderboardResponse> => {
    try {
        const response = await Axios.post<LeaderboardResponse>(
            "/private/getleaderboard", {
                date: date
            }
        );
        const responseData = response.data;
        const normalizedMessage = responseData.message ?? responseData.msg;
        const challengeSong = responseData?.data?.challengeSong ?? null;
        const leaderBoard = Array.isArray(responseData?.data?.leaderBoard)
            ? responseData.data.leaderBoard
            : [];

        return {
            ...responseData,
            message: normalizedMessage,
            data: {
                challengeSong,
                leaderBoard,
            },
        };

    } catch (e) {
        Object.entries(e as {[key: string]: any}).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });
        return {
            success: false,
            message: "Network error",
            data: {
                challengeSong: null,
                leaderBoard: [],
            },
        };
    }
}
