import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";
import { ChallengeSongType, LeaderboardPayload, LeaderboardEntryType } from "./types/leaderboard";

type LeaderboardResponse = BaseResponse<LeaderboardPayload>;

export const getLeaderboard = async (date: string): Promise<LeaderboardResponse> => {
    try {
        const response = await Axios.post<LeaderboardResponse>('/private/getleaderboard', {
            date,
        });

        const responseData = response.data;
        const normalizedMessage = responseData.message ?? responseData.msg;
        const rawData = responseData?.data;

        let challengeSong: ChallengeSongType | null = null;
        let leaderBoard: LeaderboardEntryType[] = [];

        if (Array.isArray(rawData)) {
            leaderBoard = rawData as LeaderboardEntryType[];
        } else if (rawData && typeof rawData === 'object') {
            challengeSong = rawData.challengeSong ?? null;
            if (Array.isArray((rawData as LeaderboardPayload)?.leaderBoard)) {
                leaderBoard = (rawData as LeaderboardPayload).leaderBoard;
            }
        }

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
