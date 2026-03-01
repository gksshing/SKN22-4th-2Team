/**
 * 비밀번호 표시/숨기기 토글 입력 컴포넌트 (Issue #47)
 *
 * - 재사용 가능한 비밀번호 입력 래퍼
 * - 눈 아이콘 버튼으로 type="password" ↔ type="text" 토글
 * - LoginForm, SignupForm에서 공통 사용
 */

import { useState, InputHTMLAttributes } from 'react';

interface PasswordToggleInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    /** 에러 상태 여부 — 빨간 테두리 적용 */
    hasError?: boolean;
}

export function PasswordToggleInput({ hasError = false, className: _, ...rest }: PasswordToggleInputProps) {
    const [isVisible, setIsVisible] = useState(false);

    const inputClass = `w-full pl-4 pr-12 py-3 rounded-xl border-2 text-gray-800 placeholder-gray-400
        focus:outline-none transition-colors
        ${hasError
            ? 'border-red-400 bg-red-50 focus:border-red-500'
            : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
        }
        disabled:opacity-50 disabled:cursor-not-allowed`;

    return (
        <div className="relative">
            <input
                {...rest}
                type={isVisible ? 'text' : 'password'}
                className={inputClass}
            />
            {/* 표시/숨기기 토글 버튼 */}
            <button
                type="button"
                aria-label={isVisible ? '비밀번호 숨기기' : '비밀번호 표시'}
                onClick={() => setIsVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                    text-gray-400 hover:text-gray-600 transition-colors
                    focus:outline-none text-lg"
            >
                {isVisible ? '🙈' : '👁️'}
            </button>
        </div>
    );
}
