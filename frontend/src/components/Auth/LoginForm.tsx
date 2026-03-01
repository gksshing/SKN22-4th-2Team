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
        focus:outline-none transition-colors
        ${hasError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'}
        disabled:opacity-50 disabled:cursor-not-allowed`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950 px-4">
            <div className="w-full max-w-md">
                {/* 헤더 */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">✂️ Short-Cut</h1>
                    <p className="text-blue-300 text-sm">AI 특허 아이디어 검증 서비스</p>
                </div>

                {/* 카드 */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">로그인</h2>

                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        {/* 이메일 */}
                        <div>
                            <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-1">
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
                                className={inputClass(!!errors.email)}
                            />
                            {errors.email && (
                                <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                    <span>⚠️</span> {errors.email}
                                </p>
                            )}
                        </div>

                        {/* 비밀번호 */}
                        <div>
                            <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-1">
                                비밀번호
                            </label>
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
                                <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                    <span>⚠️</span> {errors.password}
                                </p>
                            )}
                        </div>

                        {/* 제출 통합 에러 (계정 열거 공격 방어) */}
                        {errors.submit && (
                            <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center font-medium">
                                {errors.submit}
                            </div>
                        )}

                        {/* 로그인 버튼 */}
                        <button
                            type="submit"
                            disabled={isDisabled}
                            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl
                                hover:bg-blue-700 active:scale-95 transition-all mt-2
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                                flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <><span className="animate-spin">⏳</span> 로그인 중...</> : '로그인'}
                        </button>
                    </form>

                    {/* 회원가입 링크 */}
                    <p className="mt-6 text-center text-sm text-gray-500">
                        계정이 없으신가요?{' '}
                        <button
                            type="button"
                            onClick={onNavigateToSignup}
                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        >
                            회원가입
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
