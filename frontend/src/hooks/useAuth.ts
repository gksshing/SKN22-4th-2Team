/**
 * 인증 상태 관리 훅 (Issue #46)
 *
 * - 로그인 / 로그아웃 / 회원가입 API 호출 담당
 * - auth:session-expired 커스텀 이벤트 구독 → 만료 토스트 표시
 * - 모든 토큰 처리는 HttpOnly Cookie로 서버에 위임 (프론트엔드에 토큰 값 저장 금지)
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';

/** 인증된 사용자 정보 */
export interface AuthUser {
    id: string;
    email: string;
    nickname: string;
}

/** 로그인 요청 파라미터 */
interface LoginParams {
    email: string;
    password: string;
}

/** 회원가입 요청 파라미터 */
interface SignupParams {
    email: string;
    password: string;
    nickname: string;
}

/** useAuth 훅 반환 타입 */
interface UseAuthReturn {
    user: AuthUser | null;
    isLoading: boolean;
    /** 세션 만료 알림 메시지 (표시 후 null로 초기화) */
    sessionExpiredMsg: string | null;
    clearSessionExpiredMsg: () => void;
    login: (params: LoginParams) => Promise<void>;
    logout: () => Promise<void>;
    signup: (params: SignupParams) => Promise<void>;
    /** 현재 세션의 사용자 정보 재조회 (페이지 새로고침 시 사용) */
    fetchMe: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);

    // apiClient의 Silent Refresh 실패 시 발생하는 커스텀 이벤트 구독
    useEffect(() => {
        const handleSessionExpired = () => {
            setSessionExpiredMsg('세션이 만료되었습니다. 다시 로그인해 주세요.');
            setUser(null);
        };
        window.addEventListener('auth:session-expired', handleSessionExpired);
        return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
    }, []);

    /** 현재 세션 사용자 정보 조회 (HttpOnly Cookie 기반, 자동 인증) */
    const fetchMe = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        try {
            const { data } = await apiClient.get<AuthUser>('/api/v1/auth/me');
            setUser(data);
        } catch {
            // 비로그인 상태이거나 토큰 만료: user null 유지
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 로그인 요청.
     * 계정 열거 공격 방어: 400/401 모두 동일한 메시지로 처리 (에러 re-throw 활용).
     */
    const login = useCallback(async ({ email, password }: LoginParams): Promise<void> => {
        setIsLoading(true);
        try {
            const { data } = await apiClient.post<AuthUser>('/api/v1/auth/login', {
                email,
                password,
            });
            setUser(data);
        } catch (err: unknown) {
            // Backend가 401 { detail: "INVALID_CREDENTIALS" }로 응답해야 함
            // 계정 열거 공격 방어: 에러 종류 구분 없이 동일한 에러 전달
            throw new Error('아이디 또는 비밀번호를 확인해주세요.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /** 로그아웃 요청: 서버에서 HttpOnly Cookie 삭제 */
    const logout = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        try {
            await apiClient.post('/api/v1/auth/logout');
        } catch {
            // 로그아웃 실패해도 클라이언트 상태는 초기화
        } finally {
            setUser(null);
            setIsLoading(false);
        }
    }, []);

    /** 회원가입 요청 후 자동 로그인 */
    const signup = useCallback(async (params: SignupParams): Promise<void> => {
        setIsLoading(true);
        try {
            const { data } = await apiClient.post<AuthUser>('/api/v1/auth/signup', params);
            setUser(data);
        } catch {
            throw new Error('회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearSessionExpiredMsg = useCallback(() => setSessionExpiredMsg(null), []);

    return {
        user,
        isLoading,
        sessionExpiredMsg,
        clearSessionExpiredMsg,
        login,
        logout,
        signup,
        fetchMe,
    };
}
