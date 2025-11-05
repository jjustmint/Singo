import { Axios } from "@/util/AxiosInstance";
import { MistakeType } from "./types/mistakes";
import { BaseResponse } from "./types/baseResponse";

export type MistakeSummaryPayload = {
    recordId: number;
    filePath: string;
    score: number;
    qualityTier?: string;
    mistakes: MistakeType[];
};

type MistakeResponse = BaseResponse<MistakeType[] | MistakeSummaryPayload>;

export const getMistakes = async (recordingId: number): Promise<MistakeResponse> => {
    try {
        const response = await Axios.post<MistakeResponse>(
            "/private/getmistakes", { recordId: recordingId }
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
