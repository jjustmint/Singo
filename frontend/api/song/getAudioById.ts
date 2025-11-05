import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";
import { AudioType } from "../types/audio";
import type { AxiosError } from "axios";

type AudioResponse = BaseResponse<AudioType>;
export const getAudioVerById = async (audio_version_id: number): Promise<AudioResponse> => {
    try {
        const response = await Axios.post<AudioResponse>(
            "/private/getaudiobyid", {
                audio_version_id: audio_version_id
            }
        );
        return response.data;

    } catch (e) {
        const err = e as AxiosError | Error | unknown;
        const message =
            (typeof err === "object" && err !== null && "message" in err && typeof (err as any).message === "string")
                ? (err as any).message
                : "Unexpected error";
        console.warn(`[getAudioVerById] request failed: ${message}`);
        return {
            success: false,
            message: "Network error",
            data: {
                version_id: -1,
                song_id: -1,
                instru_path: null,
                ori_path: null,
                key_signature: null,
            },
        }
    }
}
