import { SongType } from '../types/song';
import { BaseResponse } from './../types/baseResponse';
import { Axios } from "@/util/AxiosInstance";

type LeaderboardResponse = BaseResponse<SongType>;
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