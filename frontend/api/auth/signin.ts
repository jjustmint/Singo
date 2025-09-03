import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";

type SignUpResponse = BaseResponse<string>;

export const SignUpApi = async (username: string, password: string): Promise<SignUpResponse> => {
    try {
        const response = await Axios.post<SignUpResponse>("/auth/register", {
            username,
            password
        })
        return response.data

    } catch (e) {
        Object.entries(e as {[key: string]: any}).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });
        return {
            success: false,
            message: "Network error",
            data: ""
        }
    }

}