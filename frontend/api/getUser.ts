import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";
import { UserType } from "./types/user";

type UsernameResponse = BaseResponse<UserType>;

export const getUsername = async (): Promise<UsernameResponse> => {
    try {
        const response = await Axios.get<UsernameResponse>(
            "/private/getuser",  // body (empty if not needed)
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
                user_id: -1,
                username: "",
                password: "",
                user_key: "",
                photo: "",
            },
        }
    }
}