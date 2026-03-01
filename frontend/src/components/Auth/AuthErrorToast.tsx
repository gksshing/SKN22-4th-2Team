import { useState, useEffect, useCallback } from 'react';

/**
 * 전역 에러 알림(Toast) 컴포넌트
 * - 'auth:error' 커스텀 이벤트를 수신하여 백엔드 에러 메시지를 표시합니다.
 * - 5초 후 자동으로 사라집니다.
 */
export function AuthErrorToast() {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(100);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        setProgress(100);
    }, []);

    useEffect(() => {
        const handler = (e: any) => {
            const errorMsg = e.detail?.message || '알 수 없는 오류가 발생했습니다.';
            setMessage(errorMsg);
            setIsVisible(true);
            setProgress(100);
        };
        window.addEventListener('auth:error', handler);
        return () => window.removeEventListener('auth:error', handler);
    }, []);

    // 5초 자동 소멸 타이머
    useEffect(() => {
        if (!isVisible) return;

        const timer = setTimeout(handleClose, 5000);
        const interval = setInterval(() => {
            setProgress((p) => Math.max(0, p - 2));
        }, 100);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [isVisible, handleClose]);

    if (!isVisible) return null;

    return (
        <div
            role="alert"
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] w-full max-w-md
                bg-white border border-red-100 rounded-2xl shadow-[0_20px_50px_rgba(244,63,94,0.15)] 
                overflow-hidden animate-in slide-in-from-top-4 duration-300"
        >
            <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-800">오류 발생</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 break-words uppercase">
                        {message}
                    </p>
                </div>

                <button
                    onClick={handleClose}
                    className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* 하단 프로그레스 바 */}
            <div className="h-1 bg-red-100 overflow-hidden">
                <div
                    className="h-full bg-red-500 transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
