export type BaseResponse<T> = {
    success: boolean;
    message?: string;
    msg?: string;
    data: T;
}
