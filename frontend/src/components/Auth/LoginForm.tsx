/**
 * 로그인 폼 컴포넌트 (Issue #46)
 *
 * - onBlur 시 인라인 에러 표시 (alert 금지)
 * - 제출 실패 시 단일 통합 에러 (계정 열거 공격 방어)
 * - noValidate + role="alert" 접근성 준수
 */

import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { validateEmail, validatePassword } from '../../utils/validators';

interface LoginFormProps {
    onSuccess: () => void;
    onNavigateToSignup: () => void;
    onLogin: (params: { email: string; password: string }) => Promise<void>;
    isLoading?: boolean;
}

interface FormErrors {
    email?: string;
    password?: string;
    submit?: string;
}

export function LoginForm({ onSuccess, onNavigateToSignup, onLogin, isLoading }: LoginFormProps) {
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
        } catch (error: any) {
            // Toast와 정렬: 백엔드 메시지 또는 기본 메시지
            setErrors({ submit: error.message || '아이디 또는 비밀번호를 확인해주세요.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = isSubmitting || isLoading;

    const inputClass = (hasError: boolean) =>
        `w-full px-4 py-3 rounded-xl border-2 text-gray-800 placeholder-gray-400
        focus:outline-none transition-all duration-300 glass-input
        ${hasError ? 'border-red-400/50 bg-red-50/50 focus:border-red-500' : 'border-white/20 focus:border-blue-500/50'}
        disabled:opacity-50 disabled:cursor-not-allowed`;

    return (
        <div className="min-h-screen w-full flex bg-[#030712] overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

            {/* Left Side: Illustration (Desktop Only) */}
            <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden border-r border-white/5">
                <div className="absolute inset-0 bg-cover bg-center opacity-40 scale-105"
                    style={{ backgroundImage: "url('/images/auth-bg.png')" }}></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-transparent to-[#030712]/80"></div>

                <div className="relative z-10 max-w-lg text-center lg:text-left animate-float">
                    <h1 className="text-6xl font-black text-white leading-tight tracking-tighter mb-6 text-glow">
                        AI <span className="text-blue-500">Patent</span><br />Intelligence
                    </h1>
                    <p className="text-xl text-blue-200/80 font-medium leading-relaxed">
                        당신의 혁신적인 아이디어가 특허 가치를 가질 수 있도록,<br />
                        AI 기술로 빠르고 정확하게 검증합니다.
                    </p>
                    <div className="mt-10 flex gap-4">
                        <div className="w-12 h-1.5 bg-blue-500 rounded-full"></div>
                        <div className="w-3 h-1.5 bg-blue-500/30 rounded-full"></div>
                        <div className="w-3 h-1.5 bg-blue-500/30 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10">
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* 모바일 로고 */}
                    <div className="lg:hidden text-center mb-10">
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">✂️ Short-Cut</h1>
                        <p className="text-blue-300 text-sm">AI 특허 아이디어 검증 서비스</p>
                    </div>

                    {/* Glass Card */}
                    <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-white/10">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-white mb-2">반가워요! 👋</h2>
                            <p className="text-blue-100/60 font-medium">서비스 이용을 위해 로그인해주세요.</p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="space-y-6">
                            {/* 이메일 */}
                            <div className="space-y-2">
                                <label htmlFor="login-email" className="block text-sm font-bold text-blue-100/80 ml-1">
                                    이메일 주소
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
                                    className={inputClass(!!errors.email)}
                                />
                                {errors.email && (
                                    <p role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5 ml-1 animate-in zoom-in-95">
                                        <span className="text-lg">⚠</span> {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* 비밀번호 */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label htmlFor="login-password" className="block text-sm font-bold text-blue-100/80">
                                        비밀번호
                                    </label>
                                    <button type="button" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                        비밀번호 찾기
                                    </button>
                                </div>
                                <input
                                    id="login-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                    onBlur={handlePasswordBlur}
                                    disabled={isDisabled}
                                    placeholder="비밀번호를 입력하세요"
                                    className={inputClass(!!errors.password)}
                                />
                                {errors.password && (
                                    <p role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5 ml-1 animate-in zoom-in-95">
                                        <span className="text-lg">⚠</span> {errors.password}
                                    </p>
                                )}
                            </div>

                            {/* 제출 통합 에러 */}
                            {errors.submit && (
                                <div role="alert" className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 text-center font-semibold animate-in shake-1">
                                    {errors.submit}
                                </div>
                            )}

                            {/* 로그인 버튼 */}
                            <button
                                type="submit"
                                disabled={isDisabled}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold rounded-2xl
                                    hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-blue-900/40
                                    transition-all duration-300 mt-4
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                                    flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>로그인 처리 중...</span>
                                    </>
                                ) : (
                                    <>로그인</>
                                )}
                            </button>
                        </form>

                        {/* 회원가입 링크 */}
                        <div className="mt-10 pt-8 border-t border-white/10 text-center">
                            <p className="text-sm text-blue-100/50 font-medium">
                                아직 계정이 없으신가요?{' '}
                                <button
                                    type="button"
                                    onClick={onNavigateToSignup}
                                    className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all underline-offset-4"
                                >
                                    무료 회원가입
                                </button>
                            </p>
                        </div>
                    </div>

                    {/* 푸터 문구 */}
                    <p className="mt-8 text-center text-xs text-blue-100/20 font-medium">
                        &copy; 2026 Short-Cut AI. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
