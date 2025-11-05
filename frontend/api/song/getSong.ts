import { SongType } from '../types/song';
import { BaseResponse } from './../types/baseResponse';
import { Axios } from "@/util/AxiosInstance";
import type { AxiosError } from "axios";

type LeaderboardResponse = BaseResponse<SongType>;
export const getSong = async (song_id: number): Promise<LeaderboardResponse> => {
    try {
        const response = await Axios.post<LeaderboardResponse>(
            "/private/getsong", {
                songId: song_id
            }
        );
        return response.data;

    } catch (e) {
        const err = e as AxiosError | Error | unknown;
        const message =
            (typeof err === "object" && err !== null && "message" in err && typeof (err as any).message === "string")
                ? (err as any).message
                : "Unexpected error";
        console.warn(`[getSong] request failed: ${message}`);
        return {
            success: false,
            message: "Network error",
            data: {
                song_id: -1,
                title: "",
                key_signature: "",
                parent_song_id: null,
                lyrics: null,
                singer: "",
                album_cover: null,
            },
        }
    }
} 
