import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";

type LeaderboardResponse = BaseResponse<any>;

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
            data: "",
        }
    }
}

export const getAudioVerById = async (audio_version_id: number): Promise<LeaderboardResponse> => {
    try {
        const response = await Axios.post<LeaderboardResponse>(
            "/private/getaudiobyerid", {
                audio_version_id: audio_version_id
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
            data: "",
        }
    }
}

export const getSong = async (song_id: number): Promise<LeaderboardResponse> => {
    try {
        const response = await Axios.post<LeaderboardResponse>(
            "/private/getsong", {
                song_id: song_id
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
            data: "",
        }
    }
}   