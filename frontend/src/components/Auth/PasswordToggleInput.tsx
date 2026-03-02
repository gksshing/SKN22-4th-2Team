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
    isError?: boolean;
}

/**
 * 눈 아이콘 토글이 포함된 비밀번호 입력창
 */
export function PasswordToggleInput({ isError, className = '', ...props }: PasswordToggleInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    const togglePassword = () => setShowPassword(!showPassword);

    return (
        <div className="relative w-full">
            <input
                {...props}
                type={showPassword ? 'text' : 'password'}
                className={`
          w-full px-4 py-3 bg-white border rounded-[12px] 
          text-[15px] font-medium outline-none transition-all
          placeholder:text-gray-300
          ${isError
                        ? 'border-red-500 focus:ring-red-100'
                        : 'border-gray-200 focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]'}
          ${className}
        `}
            />
            <button
                type="button"
                onClick={togglePassword}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
            >
                {showPassword ? (
                    <span className="text-[18px]">👁️</span>
                ) : (
                    <span className="text-[18px]">👁️‍🗨️</span>
                )}
            </button>
        </div>
    );
}
