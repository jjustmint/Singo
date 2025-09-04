import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";

type UsernameResponse = BaseResponse<any>;

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
            data: "",
        }
    }
}

type SongResponse = BaseResponse<any>;

export const getAllsongs = async (): Promise<SongResponse> => {
    try {
        const response = await Axios.get<SongResponse>(
            "/private/findallsong",  // body (empty if not needed)
        );
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