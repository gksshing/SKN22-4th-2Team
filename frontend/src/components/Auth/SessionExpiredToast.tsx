/**
 * 세션 만료 안내 토스트 컴포넌트 (Issue #47)
 *
 * - auth:session-expired CustomEvent 수신 시 자동 표시
 * - 5초 후 자동 소멸
 * - "로그인하기" 버튼 클릭 시 /login 이동
 * - App.tsx에 전역 마운트하여 어느 페이지에서든 표시
 */

import { useState, useEffect, useCallback } from 'react';

export function SessionExpiredToast() {
    const [isVisible, setIsVisible] = useState(false);
    const [progress, setProgress] = useState(100);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        setProgress(100);
    }, []);

    const handleLogin = useCallback(() => {
        handleClose();
        window.location.href = '/login';
    }, [handleClose]);

    useEffect(() => {
        const handler = () => {
            setIsVisible(true);
            setProgress(100);
        };
        window.addEventListener('auth:session-expired', handler);
        return () => window.removeEventListener('auth:session-expired', handler);
    }, []);

    // 5초 자동 소멸 타이머
    useEffect(() => {
        if (!isVisible) return;

        const timer = setTimeout(handleClose, 5000);
        // 프로그레스 바 감소 (100ms 간격으로 2% 감소 → 50회 × 100ms = 5초)
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
            aria-live="assertive"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm
                bg-slate-800 text-white rounded-2xl shadow-2xl overflow-hidden
                animate-[slideUp_0.3s_ease-out]"
        >
            {/* 프로그레스 바 */}
            <div
                className="h-1 bg-blue-400 transition-all duration-100"
                style={{ width: `${progress}%` }}
            />

            <div className="flex items-center gap-3 px-4 py-3">
                {/* 아이콘 */}
                <span className="text-2xl flex-shrink-0">🔒</span>

                {/* 메시지 */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">세션이 만료되었습니다.</p>
                    <p className="text-xs text-slate-300 mt-0.5">다시 로그인해주세요.</p>
                </div>

                {/* 액션 버튼 */}
                <button
                    type="button"
                    onClick={handleLogin}
                    className="flex-shrink-0 px-3 py-1.5 bg-blue-500 hover:bg-blue-400
                        text-white text-xs font-bold rounded-lg transition-colors"
                >
                    로그인하기
                </button>

                {/* 닫기 버튼 */}
                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="닫기"
                    className="flex-shrink-0 text-slate-400 hover:text-white transition-colors text-lg leading-none"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
