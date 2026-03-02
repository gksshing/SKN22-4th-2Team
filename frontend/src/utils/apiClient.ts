/**
 * Axios 기반 인증 API 클라이언트 (Issue #46)
 *
 * - withCredentials: true → HttpOnly Cookie 자동 포함
 * - Response Interceptor: 401 감지 시 Silent Refresh 처리
 * - Singleton 패턴: 모듈이 여러 번 import 돼도 인터셉터 중복 등록 방지
 */

import axios, { AxiosInstance } from 'axios';
import { getSessionId } from './session';

// [운영 장애 대응] VITE_API_BASE_URL이 없으면 상대 경로('/')를 사용하여 동일 오리진 서버와 통신합니다.
// 개발 환경(.env)에서만 http://localhost:8000 등을 명시적으로 설정해서 사용하세요.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;
