/**
 * Axios 기반 인증 API 클라이언트 (Issue #46)
 *
 * - withCredentials: true → HttpOnly Cookie 자동 포함
 * - Response Interceptor: 401 감지 시 Silent Refresh 처리
 * - Singleton 패턴: 모듈이 여러 번 import 돼도 인터셉터 중복 등록 방지
 */

import axios, { AxiosInstance } from 'axios';
import { getSessionId } from './session';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

/** Axios 인스턴스 (Singleton) */
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    // 중요: HttpOnly Cookie를 모든 요청에 자동 포함
    withCredentials: true,
    timeout: 15000,
});

// ============================================================
// Request Interceptor: 공통 헤더 주입
// ============================================================
apiClient.interceptors.request.use((config) => {
    // 기존 세션 ID 헤더 (Rate Limit 식별자)
    config.headers['X-Session-ID'] = getSessionId();
    return config;
});

// ============================================================
// Response Interceptor: Silent Refresh 처리
// ============================================================

/** 동시 다중 401 요청 시 refresh를 한 번만 실행하기 위한 플래그 */
let isRefreshing = false;

/** refresh 완료를 기다리는 대기 요청 대기열 */
let failedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

/** 대기열에 있는 모든 요청을 처리합니다 */
const processQueue = (error: unknown) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve();
    });
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401이 아니거나 이미 retry한 요청이면 단순 거부
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // 무한 루프 방지: 이 요청 자체가 refresh 요청이었으면 로그인으로 이동
        if (originalRequest.url?.includes('/auth/refresh')) {
            _redirectToLogin();
            return Promise.reject(error);
        }

        if (isRefreshing) {
            // 이미 refresh 진행 중 → 완료 후 재시도 대기열 등록
            return new Promise<void>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => apiClient(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            // Refresh Token(HttpOnly Cookie)으로 새 Access Token 요청
            await apiClient.post('/api/v1/auth/refresh');
            processQueue(null);
            return apiClient(originalRequest); // 원래 요청 재시도
        } catch (refreshError) {
            processQueue(refreshError);
            _redirectToLogin();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

/** 인증 관련 경로 상수 — 경로 변경 시 이 곳만 수정 */
const AUTH_ROUTES = {
    LOGIN: '/login',
} as const;

/** 세션 만료 안내 후 로그인 페이지로 이동 */
function _redirectToLogin(): void {
    // Warning 반영: 강제 이동 전 짧은 안내 표시
    const event = new CustomEvent('auth:session-expired');
    window.dispatchEvent(event);
    // 짧은 지연 후 이동 (토스트 UI가 표시될 시간 확보)
    setTimeout(() => {
        window.location.href = AUTH_ROUTES.LOGIN;
    }, 500);
}

export default apiClient;
