import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "../types/baseResponse";
import { UserType } from "../types/user";

export type UpdateUserPayload = {
  username: string;
  password: string;
  newPassword?: string;
};

type UpdateUserResponse = BaseResponse<UserType>;

export const updateUserProfile = async (
  payload: UpdateUserPayload
): Promise<UpdateUserResponse> => {
  try {
    const response = await Axios.post<UpdateUserResponse>("/private/updateuser", payload);
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
