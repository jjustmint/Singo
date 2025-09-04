import axios, { AxiosInstance } from 'axios';
import { getAuthToken } from './cookies';
import { GlobalConstant } from '@/constant';
// import { getCookieValue } from '@/utils/cookie';

const Axios: AxiosInstance = axios.create({
    baseURL: GlobalConstant.API_URL,
    validateStatus: (s) => s >= 200 && s <= 500,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
    },
});

// Request interceptor to add Authorization header automatically
Axios.interceptors.request.use(
    async(config) => {
        // Skip adding auth header for login endpoint
        if (config.url?.includes('/auth')) {
            return config;
        }

        // Add Authorization header for all other requests
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