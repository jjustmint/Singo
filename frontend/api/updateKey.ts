import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";

type UpdateKeyResponse = BaseResponse<string>; // adjust `any` if backend returns a specific shape

export const updateKey = async (uri: string): Promise<UpdateKeyResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: "recording.mp3",
      type: "audio/mp3",
    } as any);

    const response = await Axios.post<UpdateKeyResponse>(
      "/private/updatekey",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (e) {
    Object.entries(e as { [key: string]: any }).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    return {
      success: false,
      message: "Network error",
      data: "",
    };
  }
};