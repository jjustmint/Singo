import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";

type LoginResponse = BaseResponse<string>;

export const LoginApi = async (username: string, password: string): Promise<LoginResponse> => {
    const response = await Axios.post<LoginResponse>("/auth/login", {
        username,
        password
    })

    return response.data
}