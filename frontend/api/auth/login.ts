import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";
import { setAuthToken } from "@/util/cookies";

type LoginResponse = BaseResponse<string>;

export const LoginApi = async (username: string, password: string): Promise<LoginResponse> => {
    try {
        const response = await Axios.post<LoginResponse>("/auth/login", {
            username,
            password
        })
        const token = response.data;
        await setAuthToken(token.data);
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