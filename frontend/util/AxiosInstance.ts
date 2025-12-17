import axios, { AxiosInstance } from 'axios';
import { getAuthToken } from './cookies';
import { GlobalConstant } from '@/constant';

const Axios: AxiosInstance = axios.create({
    baseURL: GlobalConstant.API_URL,
    validateStatus: (s) => s >= 200 && s <= 500,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
    },
});

Axios.interceptors.request.use(
    async(config) => {
        if (config.url?.includes('/auth')) {
            return config;
        }

        const token = await getAuthToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export { Axios };
