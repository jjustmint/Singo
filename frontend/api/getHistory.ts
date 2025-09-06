import { User } from './../../backend/src/generated/prisma/index.d';
import { HistoryType } from './../../backend/src/types/getHistory';
import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";

type HistoryResponse = BaseResponse<HistoryType[]>;

export const getHistory = async (UserId: number): Promise<HistoryResponse> => {
    try {
        const response = await Axios.post<HistoryResponse>(
            "/private/gethistory", { userId: UserId}
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