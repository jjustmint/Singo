import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";
import { AudioType } from "../types/audio";

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
        Object.entries(e as {[key: string]: any}).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });
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