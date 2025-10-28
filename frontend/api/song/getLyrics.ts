import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";
import { LyricLineType } from "../types/lyrics";

type GetLyricsResponse = BaseResponse<LyricLineType[]>;

export const getLyrics = async (song_id: number): Promise<GetLyricsResponse> => {
  try {
    const response = await Axios.post<GetLyricsResponse>("/private/getlyric", {
      song_id,
    });
    return response.data;
  } catch (e) {
    Object.entries(e as { [key: string]: any }).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    return {
      success: false,
      message: "Network error",
      data: [],
    };
  }
};
