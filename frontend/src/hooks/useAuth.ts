import { useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import { UserResponse, LoginParams, SignupParams } from '../types/auth';

interface UseAuthReturn {
    user: UserResponse | null;
    isLoading: boolean;
    sessionExpiredMsg: string | null;
    clearSessionExpiredMsg: () => void;
    login: (params: LoginParams) => Promise<void>;
    logout: () => Promise<void>;
    signup: (params: SignupParams) => Promise<void>;
    fetchMe: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);

    /** 세션 만료 이벤트 구독 (apiClient에서 발생시킴) */
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

    const login = useCallback(async (params: LoginParams) => {
        setIsLoading(true);
        try {
            const data = await authService.login(params);
            setUser(data.user || data);
        } catch (error: any) {
            console.error('Login failed:', error);
            const message = error.response?.data?.detail || '아이디 또는 비밀번호를 확인해주세요.';
            window.dispatchEvent(new CustomEvent('auth:error', { detail: { message } }));
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await authService.logout();
        } finally {
            setUser(null);
            setIsLoading(false);
        }
    }, []);

    const signup = useCallback(async (params: SignupParams) => {
        setIsLoading(true);
        try {

        } finally {
            setIsLoading(false);
      }
    }, []);

    const fetchMe = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await authService.getCurrentUser();
            setUser(data);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { user, isLoading, sessionExpiredMsg, clearSessionExpiredMsg, login, logout, signup, fetchMe };
}
