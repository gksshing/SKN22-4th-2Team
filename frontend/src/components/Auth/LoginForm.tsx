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
        setErrors((p: FormErrors) => ({ ...p, email: r === true ? undefined : r }));
    }, [email]);

    const handlePasswordBlur = useCallback(() => {
        const r = validatePassword(password);
        setErrors((p: FormErrors) => ({ ...p, password: r === true ? undefined : r }));
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
            setErrors({ submit: '아이디 또는 비밀번호를 확인해주세요.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = isSubmitting || isLoading;

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f0f4f8] px-4 overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px] animate-float" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />

            {/* Brand Header */}
            <div className="text-center mb-10 z-10">
                <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center justify-center gap-2">
                    <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Short-Cut</span>
                </h1>
                <p className="text-gray-500 font-medium mt-2">AI 기반 특허 아이디어 분석 서비스</p>
            </div>

            {/* Login Card (Glassmorphism) */}
            <div className="w-full max-w-md glass-panel rounded-[2rem] p-8 sm:p-12 z-10 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center tracking-tight">반가워요! 다시 오셨군요 👋</h2>

                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                    {/* Email Input */}
                    <div className="space-y-2">
                        <label htmlFor="login-email" className="block text-sm font-semibold text-gray-600 ml-1">이메일</label>
                        <input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            onBlur={handleEmailBlur}
                            disabled={isDisabled}
                            placeholder="you@example.com"
                            className={`w-full px-5 py-3.5 rounded-2xl glass-input border-2 transition-all duration-300
                                ${errors.email ? 'border-red-400/50 bg-red-50/30' : 'border-white/50 focus:border-blue-400/50'}
                                disabled:opacity-50 outline-none shadow-sm`}
                        />
                        {errors.email && (
                            <p role="alert" className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1 ml-1 animate-in slide-in-from-left-2 duration-300">
                                <span>⚠</span> {errors.email}
                            </p>
                        )}
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label htmlFor="login-password" className="block text-sm font-semibold text-gray-600 ml-1">비밀번호</label>
                        <PasswordToggleInput
                            id="login-password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={handlePasswordBlur}
                            disabled={isDisabled}
                            placeholder="비밀번호를 입력하세요"
                            hasError={!!errors.password}
                            className={`rounded-2xl glass-input border-2 px-5 py-3.5 ${errors.password ? 'border-red-400/50 bg-red-50/30' : 'border-white/50'}`}
                        />
                        {errors.password && (
                            <p role="alert" className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1 ml-1 animate-in slide-in-from-left-2 duration-300">
                                <span>⚠</span> {errors.password}
                            </p>
                        )}
                    </div>

                    {/* Submit Error */}
                    {errors.submit && (
                        <div role="alert" className="p-4 bg-red-50/80 backdrop-blur-md border border-red-200 text-red-600 rounded-xl text-sm font-semibold text-center animate-in fade-in duration-300">
                            {errors.submit}
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={isDisabled}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-2xl
                            transition-all duration-300 active:scale-[0.98] shadow-lg shadow-blue-200 flex items-center justify-center gap-2
                            disabled:opacity-50 disabled:active:scale-100"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : '로그인'}
                    </button>

                    {/* Guest Mode Link */}
                    {onGuest && (
                        <button
                            type="button"
                            onClick={onGuest}
                            className="w-full py-2 text-gray-400 hover:text-gray-600 font-medium text-sm transition-all hover:underline"
                        >
                            비회원으로 둘러보기 (Guest Mode)
                        </button>
                    )}
                </form>

                {/* Social Login Divider */}
                <div className="relative flex items-center justify-center my-10">
                    <div className="absolute inset-0 flex items-center px-2"><div className="w-full border-t border-gray-200/50" /></div>
                    <span className="relative bg-white/20 backdrop-blur-md px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        OR CONTINUE WITH
                    </span>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/google`}
                        className="flex items-center justify-center gap-3 py-3 px-4 glass-panel rounded-2xl hover:bg-white/80 transition-all duration-300 group border-white/40"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold text-gray-700">Google</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/naver`}
                        className="flex items-center justify-center gap-3 py-3 px-4 bg-[#03C75A] hover:bg-[#02b351] rounded-2xl transition-all duration-300 group shadow-md shadow-green-100"
                    >
                        <span className="text-white font-black text-lg group-hover:scale-110 transition-transform">N</span>
                        <span className="text-sm font-bold text-white">Naver</span>
                    </button>
                </div>

                {/* Footer Links */}
                <p className="mt-10 text-center text-sm text-gray-500 font-medium">
                    아직 계정이 없으신가요?{' '}
                    <button
                        type="button"
                        onClick={onNavigateToSignup}
                        className="text-blue-600 font-bold hover:underline transition-all"
                    >
                        회원가입
                    </button>
                </p>
            </div>

            {/* Simple Footer */}
            <p className="mt-8 text-xs text-gray-400 font-medium z-10 opacity-70">© 2026 Short-Cut AI. Built for Innovators.</p>
        </div>
    );
}
