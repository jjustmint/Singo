import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";

export type RecordType = {
  record_id: number;
  user_id: number | null;
  version_id: number | null;
  key: string | null;
  user_audio_path: string;
  accuracy_score: number | null;
  created_at: string | null;
};

type RecordResponse = BaseResponse<RecordType | null>;

export const getRecordById = async (recordId: number): Promise<RecordResponse> => {
  try {
    const response = await Axios.post<RecordResponse>("/private/getrecord", {
      record_id: recordId,
    });
    return response.data;
  } catch (e) {
    console.error("Error fetching record:", e);
    return {
      success: false,
      message: "Network error",
      data: null,
    };
  }
};
