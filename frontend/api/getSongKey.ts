import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse"
import { SongKeyType } from "./types/songKey";

type SongKeyResponse = BaseResponse<SongKeyType[]>;
export const getSongkey = async (audio_id: number): Promise<SongKeyResponse> => {
    try {
        const response = await Axios.post<SongKeyResponse>(
            "/private/getsongkey",{
                song_id: audio_id
            } // body (empty if not needed)
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
}}