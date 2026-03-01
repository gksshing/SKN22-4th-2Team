import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * 전역 인증 가드 컴포넌트
 * - 자식 컴포넌트가 렌더링될 때 세션이 유효한지 체크합니다.
 * - 인증되지 않은 시도나 401 에러 발생 시 부모(App.tsx)의 상태를 통해 로그인으로 유도합니다.
 */
export const AuthGuard = ({ children }: AuthGuardProps) => {
    const { user, fetchMe, isLoading } = useAuth();

    useEffect(() => {
        // 앱 마운트 시 또는 세션 유실 시 체크
        if (!user && !isLoading) {
            fetchMe();
        }
    }, [user, fetchMe, isLoading]);

    // "페이지 이동 시마다 세션 체크" 요구사항 반영: 윈도우 포커스 시 또는 5분마다 체크
    useEffect(() => {
        const handleFocus = () => {
            if (user) fetchMe();
        };
        window.addEventListener('focus', handleFocus);
        const interval = setInterval(() => {
            if (user) fetchMe();
        }, 300000); // 5분

        return () => {
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, [user, fetchMe]);

    if (isLoading && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-opacity-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 font-medium">인증 정보를 확인 중입니다...</p>
                </div>
            </div>
        );
    }

    // user가 있으면 자식 컴포넌트(메인 기능) 표시
    return <>{children}</>;
};
