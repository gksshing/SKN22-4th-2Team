/**
 * 로그인 폼 컴포넌트 — Issue #52 UI 리뉴얼
 *
 * 변경 사항 (41_issue52_login_ui_redesign_plan.md 반영):
 * - 배경: 어두운 그라데이션 → 라이트 테마(#F8FAFC)
 * - 카드: shadow-md + border border-gray-200 (네이버 스타일)
 * - 브랜드 헤더: 카드 외부 상단으로 분리
 * - 비밀번호: show/hide 토글 버튼 추가
 * - CTA 버튼: 그린 계열(#00C73C) → 브랜드 컬러 통일
 * - 하단 링크: 회원가입 | 비밀번호 찾기 텍스트 링크 정돈
 * - 보안 유지: 계정 열거 공격 방어 단일 에러 메시지
 * - 접근성 유지: role="alert", label htmlFor, autoComplete
 */

import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { validateEmail, validatePassword } from '../../utils/validators';
import { PasswordToggleInput } from './PasswordToggleInput';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

interface LoginFormProps {
    onSuccess: () => void;
    onNavigateToSignup: () => void;
    onLogin: (params: { email: string; password: string }) => Promise<void>;
    onGuest?: () => void;
    isLoading?: boolean;
}

interface FormErrors {
    email?: string;
    password?: string;
    submit?: string;
}

export function LoginForm({ onSuccess, onNavigateToSignup, onLogin, onGuest, isLoading }: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEmailBlur = useCallback(() => {
        const r = validateEmail(email);
        setErrors((p) => ({ ...p, email: r === true ? undefined : r }));
    }, [email]);

    const handlePasswordBlur = useCallback(() => {
        const r = validatePassword(password);
        setErrors((p) => ({ ...p, password: r === true ? undefined : r }));
    }, [password]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const emailR = validateEmail(email);
        const passwordR = validatePassword(password);
        const newErrors: FormErrors = {
            email: emailR === true ? undefined : emailR,
            password: passwordR === true ? undefined : passwordR,
        };
        if (newErrors.email || newErrors.password) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors({});
        try {
            await onLogin({ email, password });
            onSuccess();
        } catch {
            // 계정 열거 공격 방어: 실패 원인 노출 없이 단일 메시지
            setErrors({ submit: '아이디 또는 비밀번호를 확인해주세요.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = isSubmitting || isLoading;

    return (
        /* ── 전체 화면 래퍼: 라이트 연회색 배경, 수직 중앙 정렬 ── */
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] px-4">

            {/* ── 브랜드 헤더 (카드 외부 상단) ── */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">✂️ Short-Cut</h1>
                <p className="text-gray-500 text-sm mt-1">AI 특허 아이디어 검증 서비스</p>
            </div>

            {/* ── 로그인 카드 ── */}
            <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-md px-10 py-10">

                <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">로그인</h2>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">

                    {/* 이메일 */}
                    <div>
                        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                            이메일
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            onBlur={handleEmailBlur}
                            disabled={isDisabled}
                            placeholder="example@email.com"
                            className={`w-full px-4 py-3 rounded-lg border text-gray-800 placeholder-gray-400 text-sm
                                focus:outline-none focus:ring-1 transition-colors
                                ${errors.email
                                    ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
                                    : 'border-gray-300 bg-white focus:border-[#00C73C] focus:ring-green-100'}
                                disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                        {errors.email && (
                            <p role="alert" className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                <span>⚠</span> {errors.email}
                            </p>
                        )}
                    </div>

                    {/* 비밀번호 — PasswordToggleInput 으로 show/hide 토글 */}
                    <div>
                        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                            비밀번호
                        </label>
                        <PasswordToggleInput
                            id="login-password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={handlePasswordBlur}
                            disabled={isDisabled}
                            placeholder="비밀번호를 입력하세요"
                            hasError={!!errors.password}
                            className={`bg-white text-sm ${errors.password
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                : 'border-gray-300 focus:border-[#00C73C] focus:ring-green-100'}`}
                        />
                        {errors.password && (
                            <p role="alert" className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                <span>⚠</span> {errors.password}
                            </p>
                        )}
                    </div>

                    {/* 서밋 에러 (버튼 위) */}
                    {errors.submit && (
                        <div
                            role="alert"
                            className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center font-medium"
                        >
                            {errors.submit}
                        </div>
                    )}

                    {/* 로그인 CTA 버튼 */}
                    <button
                        type="submit"
                        disabled={isDisabled}
                        className="w-full py-3 bg-[#00C73C] hover:bg-[#00b235] active:scale-[0.98] text-white font-bold text-sm rounded-lg
                            transition-all duration-150 mt-2
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                            flex items-center justify-center gap-2"
                    >
                        {isSubmitting
                            ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> 로그인 중...</>
                            : '로그인'}
                    </button>

                    {/* 비회원 이용 (Guest Mode) — Issue #GuestAccess */}
                    {onGuest && (
                        <button
                            type="button"
                            onClick={onGuest}
                            className="w-full py-2.5 text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
                        >
                            비회원으로 이용하기 (Guest Mode)
                        </button>
                    )}
                </form>

                {/* 소셜 로그인 구분선 */}
                <div className="relative flex items-center justify-center my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <span className="relative bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">
                        또는 간편 로그인
                    </span>
                </div>

                {/* 소셜 버튼 */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/google`}
                        className="flex items-center justify-center py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Google로 로그인"
                    >
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google"
                            className="w-5 h-5"
                        />
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/naver`}
                        className="flex items-center justify-center py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Naver로 로그인"
                    >
                        <span className="text-[#03C75A] font-black text-lg leading-none">N</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/kakao`}
                        className="flex items-center justify-center py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Kakao로 로그인"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#3C1E1E]">
                            <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.553 1.706 4.8 4.27 6.054-.15.529-.544 1.923-.622 2.233-.098.397.13.392.274.301.114-.072 1.83-1.243 2.56-1.743.488.068.99.103 1.518.103 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" />
                        </svg>
                    </button>
                </div>

                {/* 하단 링크 */}
                <p className="mt-7 text-center text-sm text-gray-500">
                    계정이 없으신가요?{' '}
                    <button
                        type="button"
                        onClick={onNavigateToSignup}
                        className="font-semibold text-[#00C73C] hover:text-[#00b235] hover:underline transition-colors"
                    >
                        회원가입
                    </button>
                </p>
            </div>

            {/* 푸터 */}
            <p className="mt-8 text-xs text-gray-400">© 2026 Short-Cut AI. All rights reserved.</p>
        </div>
    );
}
