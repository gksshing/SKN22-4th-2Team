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

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 Unauthorized 감지 시 즉시 세션 만료 처리
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // 로그인 요청 자체가 실패한 경우는 인터셉터에서 리다이렉트 하지 않음 (LoginForm에서 알림 처리)
            if (originalRequest.url?.includes('/auth/login')) {
                return Promise.reject(error);
            }

            _redirectToLogin();
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);


/** 세션 만료 안내 후 로그인 페이지로 이동 */
function _redirectToLogin(): void {
    // 안내 이벤트만 발생시키고, 실제 UI 처리는 App.tsx 등에서 담당하도록 변경 (SPA/Guest 모드 호환)
    const event = new CustomEvent('auth:session-expired');
    window.dispatchEvent(event);
}

export default apiClient;
