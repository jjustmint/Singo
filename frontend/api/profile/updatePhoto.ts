import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";
import { UserType } from "../types/user";

export type UpdatePhotoResponse = BaseResponse<UserType>;

const getMimeType = (uri: string) => {
  const extension = uri.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "heic":
      return "image/heic";
    default:
      return "image/jpeg";
  }
};

export const updateProfilePhoto = async (photoUri: string): Promise<UpdatePhotoResponse> => {
  try {
    const formData = new FormData();
    const fileName = photoUri.split("/").pop() ?? "profile.jpg";
    const mimeType = getMimeType(fileName);

    formData.append("photo", {
      uri: photoUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await Axios.post<UpdatePhotoResponse>('/private/updatepic', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    Object.entries(error as { [key: string]: unknown }).forEach(([key, value]) => {
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
    };
  }
};
