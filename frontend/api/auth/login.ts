import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";

type LoginResponse = BaseResponse<string>;

export const LoginApi = async (username: string, password: string): Promise<LoginResponse> => {
    try {
        const response = await Axios.post("/auth/login", {
            username,
            password
        });

        const payload = response.data as Partial<LoginResponse> & { msg?: string };

        return {
            success: Boolean(payload?.success),
            message: payload?.message ?? payload?.msg ?? "",
            data: (payload?.data ?? "") as string,
        };

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
