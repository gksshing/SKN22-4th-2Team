/**
 * 회원가입 폼 컴포넌트 — Issue #47 개선판
 *
 * 기획서 35_issue47_auth_ux_plan.md 반영 사항:
 * - PasswordToggleInput: 비밀번호 표시/숨기기 토글 적용
 * - PasswordStrengthBar: 비밀번호 복잡도 실시간 강도 바 표시
 * - 비밀번호 확인 일치 여부 실시간 ✅/❌ 아이콘
 * - 약관 동의 체크박스 (미동의 시 제출 버튼 비활성)
 * - 필드 순서: 이메일 → 비밀번호 → 비밀번호 확인 → 닉네임
 * - 회원가입 성공 → 1.5초 성공 메시지 → onNavigateToLogin 호출
 */

import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import {
    validateEmail,
    validatePassword,
    validateConfirmPassword,
} from '../../utils/validators';
import { PasswordToggleInput } from './PasswordToggleInput';
import { PasswordStrengthBar } from './PasswordStrengthBar';

interface SignupFormProps {
    onSuccess: () => void;
    onNavigateToLogin: () => void;
    onSignup: (params: { email: string; password: string }) => Promise<void>;
    isLoading?: boolean;
}

interface FormErrors {
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    submit?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export function SignupForm({ onSuccess, onNavigateToLogin, onSignup, isLoading }: SignupFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // 비밀번호 일치 여부 계산 (실시간 아이콘용)
    const isConfirmMatch = confirmPassword.length > 0 && confirmPassword === password;
    const isConfirmMismatch = confirmPassword.length > 0 && confirmPassword !== password;

    const handleEmailBlur = useCallback(() => {
        const r = validateEmail(email);
        setErrors((p: FormErrors) => ({ ...p, email: r === true ? undefined : r }));
    }, [email]);

    const handlePasswordBlur = useCallback(() => {
        const r = validatePassword(password);
        setErrors((p: FormErrors) => ({ ...p, password: r === true ? undefined : r }));
        if (confirmPassword) {
            const cr = validateConfirmPassword(confirmPassword, password);
            setErrors((p: FormErrors) => ({ ...p, confirmPassword: cr === true ? undefined : cr }));
        }
    }, [password, confirmPassword]);

    const handleConfirmPasswordBlur = useCallback(() => {
        const r = validateConfirmPassword(confirmPassword, password);
        setErrors((p: FormErrors) => ({ ...p, confirmPassword: r === true ? undefined : r }));
    }, [confirmPassword, password]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const emailR = validateEmail(email);
        const passwordR = validatePassword(password);
        const confirmR = validateConfirmPassword(confirmPassword, password);

        const newErrors: FormErrors = {
            email: emailR === true ? undefined : emailR,
            password: passwordR === true ? undefined : passwordR,
            confirmPassword: confirmR === true ? undefined : confirmR,
            terms: termsAgreed ? undefined : '약관에 동의해주세요.',
        };

        if (Object.values(newErrors).some(Boolean)) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors({});
        try {
            await onSignup({ email, password });
            // 회원가입 성공 → 성공 메시지 1.5초 표시 후 로그인 이동
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                onSuccess();
            }, 1500);
        } catch (err: unknown) {
            setErrors({
                submit: err instanceof Error ? err.message : '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = isSubmitting || isLoading;

    const inputWrapperClass = (hasError: boolean) =>
        `w-full px-4 py-3 rounded-xl border-2 text-gray-800 placeholder-gray-400 focus:outline-none transition-all duration-300 glass-input
        ${hasError ? 'border-red-400/50 bg-red-50/50 focus:border-red-500' : 'border-white/20 focus:border-blue-500/50'}
        disabled:opacity-50 disabled:cursor-not-allowed`;

    // 회원가입 성공 화면 (프리미엄 버전 - 라이트 테마)
    if (isSuccess) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
                <div className="text-center animate-in zoom-in-95 duration-700">
                    <div className="text-8xl mb-6 animate-bounce drop-shadow-md">✨</div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">환영합니다!</h2>
                    <p className="text-xl text-gray-600 font-medium">회원가입이 완료되었습니다.<br />잠시 후 로그인 화면으로 이동합니다.</p>
                    <div className="mt-10 flex justify-center">
                        <div className="w-16 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] p-8 sm:p-10 my-8">
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">✂️ Short-Cut</h1>
                    <p className="text-gray-500 text-sm">AI 특허 아이디어 검증 서비스</p>
                </div>

                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800">회원가입</h2>
                    <p className="text-gray-500 mt-1">혁신의 여정을 함께 시작해볼까요? ✨</p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    {/* 1. 이메일 */}
                    <div className="space-y-1.5">
                        <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-700">이메일 주소</label>
                        <input
                            id="signup-email" type="email" autoComplete="email"
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            onBlur={handleEmailBlur}
                            disabled={isDisabled}
                            placeholder="example@email.com"
                            className={inputWrapperClass(!!errors.email)}
                        />
                        {errors.email && <p role="alert" className="text-sm text-red-500 mt-1">⚠ {errors.email}</p>}
                    </div>

                    {/* 2. 비밀번호 */}
                    <div className="space-y-1.5">
                        <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-700">비밀번호</label>
                        <PasswordToggleInput
                            id="signup-password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={handlePasswordBlur}
                            disabled={isDisabled}
                            placeholder="8자 이상, 영문·숫자·특수문자 포함"
                            hasError={!!errors.password}
                            className={`bg-white ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'}`}
                        />
                        <div className="px-1 mt-1"><PasswordStrengthBar password={password} /></div>
                        {errors.password && <p role="alert" className="text-sm text-red-500 mt-1">⚠ {errors.password}</p>}
                    </div>

                    {/* 3. 비밀번호 확인 */}
                    <div className="space-y-1.5">
                        <label htmlFor="signup-confirm" className="block text-sm font-semibold text-gray-700">비밀번호 확인</label>
                        <div className="relative">
                            <PasswordToggleInput
                                id="signup-confirm"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onBlur={handleConfirmPasswordBlur}
                                disabled={isDisabled}
                                placeholder="비밀번호를 다시 입력하세요"
                                hasError={!!errors.confirmPassword || isConfirmMismatch}
                                className={`bg-white ${errors.confirmPassword || isConfirmMismatch ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'}`}
                            />
                            {isConfirmMatch && (
                                <span className="absolute right-12 top-1/2 -translate-y-1/2 text-green-500 text-lg">✅</span>
                            )}
                            {isConfirmMismatch && (
                                <span className="absolute right-12 top-1/2 -translate-y-1/2 text-red-500 text-lg">❌</span>
                            )}
                        </div>
                        {errors.confirmPassword && <p role="alert" className="text-sm text-red-500 mt-1">⚠ {errors.confirmPassword}</p>}
                    </div>

                    {/* 약관 동의 */}
                    <div className="pt-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={termsAgreed}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                        const checked = e.target.checked;
                                        setTermsAgreed(checked);
                                        if (checked) {
                                            setErrors((prev) => ({ ...prev, terms: undefined }));
                                        }
                                    }}
                                    disabled={isDisabled}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-colors"
                                />
                            </div>
                            <span className="text-sm text-gray-600 leading-relaxed">
                                <span className="text-blue-600 font-semibold hover:underline cursor-pointer">서비스 이용약관</span> 및{' '}
                                <span className="text-blue-600 font-semibold hover:underline cursor-pointer">개인정보 처리방침</span>에 동의합니다.
                                <span className="text-red-500 ml-1 whitespace-nowrap">*</span>
                            </span>
                        </label>
                        {errors.terms && <p role="alert" className="text-sm text-red-500 mt-2">⚠ {errors.terms}</p>}
                    </div>

                    {/* 제출 에러 */}
                    {errors.submit && (
                        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center font-semibold">
                            {errors.submit}
                        </div>
                    )}

                    {/* 회원가입 버튼 */}
                    <button
                        type="submit"
                        disabled={isDisabled || !termsAgreed}
                        className="w-full py-3.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : '계정 생성하기'}
                    </button>
                </form>

                {/* 소셜 로그인 */}
                <div className="mt-8">
                    <div className="relative flex items-center justify-center mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <span className="relative bg-white px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">또는 간편 회원가입</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button type="button" onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/google`}
                            className="flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" title="Google로 가입">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/naver`}
                            className="flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" title="Naver로 가입">
                            <span className="text-[#03C75A] font-black text-lg">N</span>
                        </button>
                        <button type="button" onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/kakao`}
                            className="flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" title="Kakao로 가입">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FEE500]"><path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.553 1.706 4.8 4.27 6.054-.15.529-.544 1.923-.622 2.233-.098.397.13.392.274.301.114-.072 1.83-1.243 2.56-1.743.488.068.99.103 1.518.103 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" /></svg>
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-sm text-gray-500 text-center">
                    이미 계정이 있으신가요?{' '}
                    <button type="button" onClick={onNavigateToLogin} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">로그인하기</button>
                </p>
            </div>

            <div className="absolute bottom-4 text-center text-xs text-gray-400">
                &copy; 2026 Short-Cut AI. All rights reserved.
            </div>
        </div>
    );
}
