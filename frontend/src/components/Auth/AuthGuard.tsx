import { ReactNode } from 'react';
import { SignupForm } from './SignupForm';
import { LoginForm } from './LoginForm';
import { User } from '../../types/auth';

interface AuthGuardProps {
    children: ReactNode;
    isGuest: boolean;
    setIsGuest: (v: boolean) => void;
    authView: 'login' | 'signup';
    user: User; // useAuth에서 가져온 user 객체
}


/**
 * 전역 인증 가드 컴포넌트
 * - 인증되지 않은 시도 시 로그인/회원가입 폼을 표시합니다.
 */
export const AuthGuard = (props: AuthGuardProps) => {
    const {
        children,
        isGuest,
        setIsGuest,
        authView,
        user
    } = props;

    return (
        <div className="relative min-h-screen">
            {/* 메인 서비스 콘텐츠 (항상 렌더링하여 배경으로 유지) */}
            {children}

            {/* 인증 모달 오버레이 (비로그인 상태이며 게스트 모드가 아닐 때만 표시) */}
            {!user && isGuest === false && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="w-full max-w-md p-4 animate-in zoom-in-95 duration-300">
                        {authView === 'signup' ? (
                            <SignupForm />
                        ) : (
                            <LoginForm />
                        )}
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setIsGuest(true)}
                                className="text-sm text-gray-300 hover:text-white underline transition-colors"
                            >
                                게스트로 계속하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

