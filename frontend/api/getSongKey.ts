import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse"
import { SongKeyType } from "./types/songKey";
import type { AxiosError } from "axios";

type SongKeyResponse = BaseResponse<SongKeyType[]>;
export const getSongkey = async (audio_id: number): Promise<SongKeyResponse> => {
    try {
        const response = await Axios.post<SongKeyResponse>(
            "/private/getsongkey",{
                song_id: audio_id
            }
        );
        return response.data;

    } catch (e) {
        const err = e as AxiosError | Error | unknown;
        const message =
            (typeof err === "object" && err !== null && "message" in err && typeof (err as any).message === "string")
                ? (err as any).message
                : "Unexpected error";
        console.warn(`[getSongkey] request failed: ${message}`);
        return {
            success: false,
            message: "Network error",
            data: [],
}
}}
