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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

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
        } catch (error: unknown) {
            // Toast와 정렬: 백엔드 메시지 또는 기본 메시지
            const errorMessage = error instanceof Error ? error.message : '아이디 또는 비밀번호를 확인해주세요.';
            setErrors({ submit: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = isSubmitting || isLoading;

    const inputClass = (hasError: boolean) =>
        `w-full px-4 py-3 rounded-xl border ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'
        } bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:bg-gray-50`;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] p-8 sm:p-10">
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">✂️ Short-Cut</h1>
                    <p className="text-gray-500 text-sm">AI 특허 아이디어 검증 서비스</p>
                </div>

                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800">반가워요! 👋</h2>
                    <p className="text-gray-500 mt-1">서비스 이용을 위해 로그인해주세요.</p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    {/* 이메일 */}
                    <div className="space-y-1.5">
                        <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700">이메일 주소</label>
                        <input
                            id="login-email" type="email" autoComplete="email"
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            onBlur={handleEmailBlur}
                            disabled={isDisabled}
                            placeholder="example@email.com"
                            className={inputClass(!!errors.email)}
                        />
                        {errors.email && <p role="alert" className="text-sm text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    {/* 비밀번호 */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700">비밀번호</label>
                            <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">비밀번호 찾기</button>
                        </div>
                        <input
                            id="login-password" type="password" autoComplete="current-password"
                            value={password}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            onBlur={handlePasswordBlur}
                            disabled={isDisabled}
                            placeholder="비밀번호를 입력하세요"
                            className={inputClass(!!errors.password)}
                        />
                        {errors.password && <p role="alert" className="text-sm text-red-500 mt-1">{errors.password}</p>}
                    </div>

                    {/* 제출 통합 에러 */}
                    {errors.submit && (
                        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
                            {errors.submit}
                        </div>
                    )}

                    {/* 로그인 버튼 */}
                    <button
                        type="submit"
                        disabled={isDisabled}
                        className="w-full py-3.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : '로그인'}
                    </button>
                </form>

                {/* 소셜 로그인 */}
                <div className="mt-8">
                    <div className="relative flex items-center justify-center mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <span className="relative bg-white px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">또는 간편 로그인</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button type="button" onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/google`}
                            className="flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" title="Google로 로그인">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/naver`}
                            className="flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" title="Naver로 로그인">
                            <span className="text-[#03C75A] font-black text-lg">N</span>
                        </button>
                        <button type="button" onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/kakao`}
                            className="flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" title="Kakao로 로그인">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FEE500]"><path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.553 1.706 4.8 4.27 6.054-.15.529-.544 1.923-.622 2.233-.098.397.13.392.274.301.114-.072 1.83-1.243 2.56-1.743.488.068.99.103 1.518.103 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" /></svg>
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-sm text-gray-500 text-center">
                    아직 계정이 없으신가요?{' '}
                    <button type="button" onClick={onNavigateToSignup} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">무료 회원가입</button>
                </p>
            </div>

            <div className="absolute bottom-8 text-center text-xs text-gray-400">
                &copy; 2026 Short-Cut AI. All rights reserved.
            </div>
        </div>
    );
}
