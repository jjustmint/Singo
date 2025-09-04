import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";
import { SongType } from "../types/song";

type GetAllSongResponse = BaseResponse<SongType[]>;

export const getAllsongs = async (): Promise<GetAllSongResponse> => {
    try {
        const response = await Axios.get<GetAllSongResponse>(
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
            data: [],
        }
    }
}