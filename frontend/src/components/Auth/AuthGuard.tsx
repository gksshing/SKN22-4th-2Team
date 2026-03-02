import React, { useEffect } from 'react';
import { SignupForm } from './SignupForm';
import { LoginForm } from './LoginForm';
import { UserResponse, SignupParams, LoginParams } from '../../types/auth';

interface AuthGuardProps {
    children: React.ReactNode;
    user: UserResponse | null;
    authView: 'login' | 'signup';
    setAuthView: (view: 'login' | 'signup') => void;
    login: (params: LoginParams) => Promise<void>;
    signup: (params: SignupParams) => Promise<void>;
    fetchMe: () => Promise<void>;
    isAuthLoading: boolean;
    isGuest: boolean;
    setIsGuest: (v: boolean) => void;
}

/**
 * 전역 인증 가드 컴포넌트
 * - 자식 컴포넌트가 렌더링될 때 세션이 유효한지 체크합니다.
 * - 인증되지 않은 시도나 401 에러 발생 시 로그인/회원가입 폼을 표시합니다.
 */
export const AuthGuard = (props: AuthGuardProps) => {
    const {
        children,
        user,
        authView,
        setAuthView,
        login,
        signup,
        fetchMe,
        isAuthLoading,
        isGuest,
        setIsGuest
    } = props;

    // "페이지 이동 시마다 세션 체크" 요구사항 반영: 
    // SPA 특성상 마운트 시 체크가 이에 해당하며, 추가로 윈도우 포커스 시 체크를 병행
    useEffect(() => {
        if (!user && !isAuthLoading) {
            fetchMe();
        }
    }, [user, fetchMe, isAuthLoading]);

    useEffect(() => {
        const handleFocus = () => {
            if (user) fetchMe();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user, fetchMe]);

    // 로딩 중이면서 유저 정보가 없을 때만 스켈레톤/로딩 표시
    if (isAuthLoading && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 font-medium">인증 정보를 확인 중입니다...</p>
                </div>
            </div>
        );
    }

    // 인증 완료 시 메인 기능 표시 (인증 정보가 없어도 일단 진입 허용)
    // return <>{children}</>;

    // ========== Issue #GuestAccess: 인증 가드 복구 및 게스트 우회 ==========
    // 1. 유저 정보가 있으면 바로 진입
    if (user) {
        return <>{children}</>;
    }

    // 2. 게스트 모드를 선택했으면 진입 허용 (단, App.tsx에서 로그인 요청 시 가드 재작동을 위해 props로 제어 가능하도록 설계 가능)
    if (isGuest) {
        return <>{children}</>;
    }

    // 3. 인증되지 않았고 게스트 모드도 아니면Auth 화면 표시 (주석 해제 요청 반영)
    return (
        <div className="auth-entry-wrapper">
            {authView === 'signup' ? (
                <SignupForm
                    onSuccess={() => setAuthView('login')}
                    onNavigateToLogin={() => setAuthView('login')}
                    onSignup={signup}
                    onGuest={() => setIsGuest(true)}
                    isLoading={isAuthLoading}
                />
            ) : (
                <LoginForm
                    onSuccess={fetchMe}
                    onNavigateToSignup={() => setAuthView('signup')}
                    onLogin={login}
                    onGuest={() => setIsGuest(true)}
                    isLoading={isAuthLoading}
                />
            )}
        </div>
    );
};
