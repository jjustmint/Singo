import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";

export type RecordType = {
  record_id: number;
  song_id: number;
  user_id: number;
  version_id: number;
  score: number;
  record_path: string;
  created_at: string;
};

type RecordResponse = BaseResponse<RecordType>;

export const getRecordById = async (recordId: number): Promise<RecordResponse> => {
  try {
    const response = await Axios.post<RecordResponse>("/private/getrecordbyid", {
      recordId,
    });
    return response.data;
  } catch (e) {
    console.error("Error fetching record:", e);
    return {
      success: false,
      message: "Network error",
      data: {} as RecordType,
    };
  }
};
