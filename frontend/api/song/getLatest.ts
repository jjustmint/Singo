import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";
import { SongType } from "../types/song";

type LatestSongsResponse = BaseResponse<SongType[]>;

export const getLatestSongs = async (limit = 5): Promise<LatestSongsResponse> => {
  try {
    const response = await Axios.post<LatestSongsResponse>("/private/getsongs/latest", {
      limit,
    });
    return response.data;
  } catch (e) {
    Object.entries(e as Record<string, unknown>).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    return {
      success: false,
      message: "Network error",
      data: [],
    };
  }
};
