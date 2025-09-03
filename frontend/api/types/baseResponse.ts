export type BaseResponse<T> = {
    success: boolean;
    message: string;
    data: T;
}