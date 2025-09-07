import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";

type CreateRecordResponse = BaseResponse<string>; // adjust `any` if backend returns a specific shape

export const createRecord = async (file: string, versionId: string, key: string, ori: string ): Promise<BaseResponse<string>> => {
    try {
        const formData = new FormData();
        formData.append("file", {
            uri: file,
            name: "recording.mp3",
            type: "audio/mp3",
        } as any);
        formData.append("versionId", versionId);
        formData.append("key", key)
        formData.append("ori", ori ) 
         // Example duration, replace with actual value if needed
        const response = await Axios.post<CreateRecordResponse>(
            "/private/uploaduserrecord", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        console.log("Create record response:", response.data);
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