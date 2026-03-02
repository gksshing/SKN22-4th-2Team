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
    onGuest?: () => void;
    isLoading?: boolean;
}

interface FormErrors {
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    submit?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function SignupForm({ onSuccess, onNavigateToLogin, onSignup, onGuest, isLoading }: SignupFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const isConfirmMatch = confirmPassword.length > 0 && confirmPassword === password;
    const isConfirmMismatch = confirmPassword.length > 0 && confirmPassword !== password;

    const handleGoogleSignup = useCallback(() => {
        window.location.href = `${API_BASE_URL}/api/v1/auth/login/google`;
    }, []);

    const handleNaverSignup = useCallback(() => {
        window.location.href = `${API_BASE_URL}/api/v1/auth/login/naver`;
    }, []);

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
            terms: termsAgreed ? undefined : '이용약관 및 개인정보 처리방침에 동의해주세요.',
        };

        if (Object.values(newErrors).some(Boolean)) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors({});
        try {
            await onSignup({ email, password });
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                onSuccess();
            }, 1500);
        } catch (err: unknown) {
            setErrors({
                submit: err instanceof Error ? err.message : '회원가입에 실패했습니다.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = isSubmitting || isLoading;

    if (isSuccess) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
                <div className="text-center animate-in zoom-in-95 duration-700">
                    <div className="text-8xl mb-6">🎉</div>
                    <h2 className="text-[32px] font-black text-[#2563EB] mb-2 tracking-tighter">환영합니다!</h2>
                    <p className="text-gray-600 font-bold">회원가입이 성공적으로 완료되었습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] px-4 py-20">
            {/* Logo Section */}
            <div className="mb-12">
                <h1 className="text-[42px] font-black text-[#2563EB] tracking-tight">Short-Cut</h1>
                <p className="text-gray-500 text-center font-medium -mt-1">새로운 혁신의 시작</p>
            </div>

            {/* Signup Card */}
            <div className="w-full max-w-[460px] bg-white border border-gray-200 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-10">
                <h2 className="text-[20px] font-bold text-gray-800 mb-8 text-center tracking-tight">회원가입</h2>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    {/* Unified Input Box */}
                    <div className="border border-gray-200 rounded-[12px] overflow-hidden focus-within:ring-2 focus-within:ring-[#2563EB] focus-within:border-[#2563EB] transition-all">
                        <div className="relative border-b border-gray-100 flex items-center px-4 py-3.5 bg-white">
                            <span className="text-gray-400 mr-3">📧</span>
                            <input
                                id="signup-email" type="email" autoComplete="email"
                                value={email}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                onBlur={handleEmailBlur}
                                disabled={isDisabled}
                                placeholder="이메일 주소"
                                className="w-full h-full outline-none text-[16px] placeholder-gray-400"
                            />
                        </div>
                        <div className="relative border-b border-gray-100 flex items-center px-4 py-3.5 bg-white">
                            <span className="text-gray-400 mr-3">🔒</span>
                            <PasswordToggleInput
                                id="signup-password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                onBlur={handlePasswordBlur}
                                disabled={isDisabled}
                                placeholder="비밀번호(8자 이상, 영문·숫자·특수문자)"
                                className="border-none bg-transparent p-0 focus:bg-transparent pl-0 pr-8"
                            />
                        </div>
                        <div className="relative flex items-center px-4 py-3.5 bg-white">
                            <span className="text-gray-400 mr-3">✅</span>
                            <PasswordToggleInput
                                id="signup-confirm"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                onBlur={handleConfirmPasswordBlur}
                                disabled={isDisabled}
                                placeholder="비밀번호 확인"
                                className="border-none bg-transparent p-0 focus:bg-transparent pl-0 pr-12"
                            />
                            {isConfirmMatch && <span className="absolute right-10 text-emerald-500 text-[14px] font-bold">일치</span>}
                            {isConfirmMismatch && <span className="absolute right-10 text-red-500 text-[14px] font-bold">불일치</span>}
                        </div>
                    </div>

                    <div className="px-1 mt-1"><PasswordStrengthBar password={password} /></div>

                    {/* Terms Checkbox Section */}
                    <div className="pt-4 pb-2 px-1">
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={termsAgreed}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setTermsAgreed(e.target.checked)}
                                disabled={isDisabled}
                                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                            />
                            <span className="text-[14px] text-gray-500 font-medium leading-[1.4]">
                                <span className="text-[#2563EB] font-bold hover:underline">서비스 이용약관</span> 및{' '}
                                <span className="text-[#2563EB] font-bold hover:underline">개인정보 처리방침</span>의 내용을 확인하였으며 이에 동의합니다.
                            </span>
                        </label>
                    </div>

                    {/* Error Display */}
                    {(errors.email || errors.password || errors.confirmPassword || errors.terms || errors.submit) && (
                        <div role="alert" className="text-[13px] text-red-500 font-medium space-y-1 px-1">
                            {errors.email && <p>⚠ {errors.email}</p>}
                            {errors.password && <p>⚠ {errors.password}</p>}
                            {errors.confirmPassword && <p>⚠ {errors.confirmPassword}</p>}
                            {errors.terms && <p>⚠ {errors.terms}</p>}
                            {errors.submit && <p className="py-2 bg-red-50 rounded-lg text-center mt-2 border border-red-100">{errors.submit}</p>}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isDisabled || !termsAgreed}
                        className="w-full py-4 mt-6 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-[18px] rounded-[12px] transition-all duration-200 active:scale-[0.99] disabled:opacity-50"
                    >
                        {isSubmitting ? '가입 중...' : '회원가입'}
                    </button>

                    {onGuest && (
                        <button type="button" onClick={onGuest} className="w-full py-2 text-gray-400 hover:text-gray-600 font-medium text-sm transition-all hover:underline">
                            비회원으로 둘러보기
                        </button>
                    )}
                </form>

                {/* Social Signup Buttons (Design Consistency) */}
                <div className="mt-8">
                    <div className="relative flex items-center justify-center mb-6">
                        <div className="absolute inset-0 flex items-center px-2"><div className="w-full border-t border-gray-200" /></div>
                        <span className="relative bg-white px-4 text-[12px] font-bold text-gray-400">간편 가입하기</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={handleGoogleSignup}
                            className="flex items-center justify-center gap-3 py-3 bg-white border border-gray-200 rounded-[12px] hover:bg-gray-50 transition-all font-bold text-gray-700 text-[14px] shadow-sm active:scale-[0.98]"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                            Google
                        </button>
                        <button
                            type="button"
                            onClick={handleNaverSignup}
                            className="flex items-center justify-center gap-3 py-3 bg-[#03C75A] border border-[#02b351] rounded-[12px] hover:bg-[#02b351] transition-all font-bold text-white text-[14px] shadow-sm active:scale-[0.98]"
                        >
                            <span className="font-black text-[16px]">N</span>
                            Naver
                        </button>
                    </div>
                </div>

                <p className="mt-10 text-center text-[14px] text-gray-500 font-medium">
                    이미 계정이 있으신가요?{' '}
                    <button type="button" onClick={onNavigateToLogin} className="text-[#2563EB] font-bold hover:underline">로그인하기</button>
                </p>
            </div>

            {/* Simple Footer */}
            <div className="mt-16 text-center space-y-1">
                <p className="text-[13px] text-gray-400 font-semibold tracking-tight">© Short-Cut AI. All rights reserved.</p>
            </div>
        </div>
    );
}
