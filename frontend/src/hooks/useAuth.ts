/**
 * 인증 상태 관리 훅 (Issue #46)
 *
 * - login / logout / signup / fetchMe 구현
 * - auth:session-expired 커스텀 이벤트 수신 → 세션 만료 메시지 표시
 * - 계정 열거 공격 방어: 로그인 에러는 단일 통합 메시지로 래핑
 */

import { useState, useCallback, useEffect } from 'react';
import apiClient from '../utils/apiClient';

/** 로그인한 사용자 정보 타입 */
interface UserInfo {
    id: string;
    email: string;
    nickname: string;
}

/** useAuth 훅 반환 타입 */
interface UseAuthReturn {
    user: UserInfo | null;
    isLoading: boolean;
    sessionExpiredMsg: string | null;
    clearSessionExpiredMsg: () => void;
    login: (params: { email: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
    signup: (params: { email: string; password: string; nickname: string }) => Promise<void>;
    fetchMe: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);

    /** 세션 만료 이벤트 구독 */
    useEffect(() => {
        const handler = () => {
            setUser(null);
            setSessionExpiredMsg('세션이 만료되었습니다. 다시 로그인해주세요.');
        };
        window.addEventListener('auth:session-expired', handler);
        return () => window.removeEventListener('auth:session-expired', handler);
    }, []);

    const clearSessionExpiredMsg = useCallback(() => {
        setSessionExpiredMsg(null);
    }, []);

    /**
     * 로그인
     * - 계정 열거 공격 방어: 400/401 모두 단일 메시지로 래핑
     */
    const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
        setIsLoading(true);
        try {
            const res = await apiClient.post<UserInfo>('/api/v1/auth/login', { email, password });
            setUser(res.data);
        } catch {
            // 실패 원인(이메일 없음/비밀번호 불일치) 노출 금지 → 단일 메시지
            throw new Error('아이디 또는 비밀번호를 확인해주세요.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /** 로그아웃 */
    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await apiClient.post('/api/v1/auth/logout');
        } finally {
            setUser(null);
            setIsLoading(false);
        }
    }, []);

    /** 회원가입 */
    const signup = useCallback(async ({
        email, password, nickname,
    }: { email: string; password: string; nickname: string }) => {
        setIsLoading(true);
        try {
            await apiClient.post('/api/v1/auth/register', { email, password, nickname });
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /** 현재 로그인 세션 유저 조회 */
    const fetchMe = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get<UserInfo>('/api/v1/auth/me');
            setUser(res.data);
        } catch {
            setUser(null); // 미로그인 또는 세션 만료: graceful 처리
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { user, isLoading, sessionExpiredMsg, clearSessionExpiredMsg, login, logout, signup, fetchMe };
}
