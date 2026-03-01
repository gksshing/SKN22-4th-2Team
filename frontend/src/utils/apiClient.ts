/**
 * Axios 기반 인증 API 클라이언트 (Issue #46)
 *
 * - withCredentials: true → HttpOnly Cookie 자동 포함
 * - Response Interceptor: 401 감지 시 Silent Refresh 처리
 * - Singleton 패턴: 인터셉터 중복 등록 방지
 */

import axios, { AxiosInstance } from 'axios';
import { getSessionId } from './session';

const API_BASE_URL: string =
    (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
    ?? 'http://localhost:8000';

/** 인증 관련 경로 상수 */
const AUTH_ROUTES = {
    LOGIN: '/login',
} as const;

/** Axios 인스턴스 (Singleton) */
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // HttpOnly Cookie 자동 전송
    timeout: 15000,
});

// Request Interceptor: X-Session-ID 헤더 주입
apiClient.interceptors.request.use((config) => {
    config.headers['X-Session-ID'] = getSessionId();
    return config;
});

// Silent Refresh 상태 관리
let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve();
    });
    failedQueue = [];
};

// Response Interceptor: 401 → Silent Refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // 무한 루프 방지: refresh 요청 자체가 401이면 로그인으로 이동
        if (originalRequest.url?.includes('/auth/refresh')) {
            _redirectToLogin();
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise<void>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => apiClient(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            await apiClient.post('/api/v1/auth/refresh');
            processQueue(null);
            return apiClient(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError);
            _redirectToLogin();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

/** 세션 만료 → 이벤트 발송 후 로그인 페이지 이동 */
function _redirectToLogin(): void {
    const event = new CustomEvent('auth:session-expired');
    window.dispatchEvent(event);
    setTimeout(() => {
        window.location.href = AUTH_ROUTES.LOGIN;
    }, 500);
}

export default apiClient;
