import apiClient from '../utils/apiClient';
import { LoginParams, SignupParams, UserResponse, LoginResponse } from '../types/auth';

/**
 * 전역 인증 서비스
 * - Axios 인스턴스(apiClient)의 withCredentials: true 설정을 활용하여 쿠키 기반 인증 수행
 */
export const authService = {
    /**
     * 로그인 요청
     * 성공 시 백엔드에서 Set-Cookie 헤더를 통해 JWT 발급
     */
    async login(params: LoginParams): Promise<LoginResponse> {
        const response = await apiClient.post('/api/v1/auth/login', params);
        return response.data;
    },

    /**
     * 회원가입 요청
     */
    async signup(params: SignupParams): Promise<void> {
        await apiClient.post('/api/v1/auth/register', params);
    },

    /**
     * 로그아웃 요청
     * 백엔드에서 쿠키를 만료시키는 처리가 필요함 (현재는 클라이언트 세션 클리어 위주)
     */
    async logout(): Promise<void> {
        try {
            await apiClient.post('/api/v1/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    /**
     * 현재 로그인된 사용자 정보 조회 (세션 체크)
     */
    async getCurrentUser(): Promise<UserResponse | null> {
        try {
            const response = await apiClient.get('/api/v1/auth/me');
            return response.data;
        } catch (error) {
            // 401 에러 등 인증되지 않은 상태면 null 반환
            return null;
        }
    }
};
