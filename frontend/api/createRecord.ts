import { Axios } from "@/util/AxiosInstance";
import { BaseResponse } from "./types/baseResponse";

type CreateRecordResponseData = {
  recordId: number;
  filePath: string;
  score: number;
  mistakes: unknown[];
};

export type CreateRecordResponse = BaseResponse<CreateRecordResponseData>;

const DEFAULT_RECORDING_FILENAME = "recording.m4a";

const buildFailureResponse = (
  message: string,
  msg?: string
): CreateRecordResponse => ({
  success: false,
  message,
  msg,
  data: {
    recordId: -1,
    filePath: "",
    score: -1,
    mistakes: [],
  },
});

const resolveFileName = (uri: string): string => {
  if (!uri) {
    return DEFAULT_RECORDING_FILENAME;
  }

  try {
    const decodedUri = decodeURIComponent(uri);
    const segments = decodedUri.split("/").filter(Boolean);
    const candidate = segments.pop();
    if (!candidate) {
      return DEFAULT_RECORDING_FILENAME;
    }
    return candidate.includes(".") ? candidate : DEFAULT_RECORDING_FILENAME;
  } catch {
    return DEFAULT_RECORDING_FILENAME;
  }
};

const resolveMimeType = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "aac":
    case "m4a":
    case "mp4":
      return "audio/mp4";
    case "caf":
      return "audio/x-caf";
    case "wav":
      return "audio/wav";
    case "mp3":
      return "audio/mpeg";
    default:
      return "application/octet-stream";
  }
};

export const createRecord = async (
  file: string,
  versionId: string,
  key: string,
  ori: string,
  sizeInBytes?: number
): Promise<CreateRecordResponse> => {
  try {
    const formData = new FormData();

    const fileName = resolveFileName(file);
    const mimeType = resolveMimeType(fileName);
    const normalizedUri = file.startsWith("file://") ? file : `file://${file}`;

    formData.append("file", {
      uri: normalizedUri,
      name: fileName,
      type: mimeType,
    } as any);

    formData.append("versionId", versionId);
    formData.append("key", key);
    formData.append("ori", ori);
    if (typeof sizeInBytes === "number" && !Number.isNaN(sizeInBytes)) {
      formData.append("fileSize", `${sizeInBytes}`);
    }

    const response = await Axios.post<CreateRecordResponse>(
      "/private/uploaduserrecord",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        maxBodyLength: 25 * 1024 * 1024,
      }
    );

    if (response.status === 413) {
      return buildFailureResponse(
        "Recording is too large to upload. Please record a shorter take and try again."
      );
    }

    const payload = response.data;

    if (
      typeof payload === "string" &&
      payload.toLowerCase().includes("request entity too large")
    ) {
      return buildFailureResponse(
        "Recording is too large to upload. Please record a shorter take and try again."
      );
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return buildFailureResponse(
        "Unexpected response from server while uploading recording."
      );
    }

    console.log("Create record response:", payload);
    return payload as CreateRecordResponse;
  } catch (e) {
    Object.entries(e as Record<string, unknown>).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    return buildFailureResponse("Network error");
  }
};
