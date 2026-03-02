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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

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
            <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f4f8]">
                <div className="text-center animate-in zoom-in-95 duration-700">
                    <div className="text-8xl mb-6 animate-bounce drop-shadow-md">✨</div>
                    <h2 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent mb-4 tracking-tighter">환영합니다!</h2>
                    <p className="text-xl text-gray-600 font-bold">회원가입이 성공적으로 완료되었습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f0f4f8] px-4 overflow-hidden relative py-12">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-5%] right-[-5%] w-[35%] h-[35%] bg-blue-400/10 rounded-full blur-[100px] animate-float" />
            <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-emerald-400/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-2s' }} />

            <div className="text-center mb-10 z-10">
                <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center justify-center gap-2">
                    <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Short-Cut</span>
                </h1>
                <p className="text-gray-500 font-medium mt-2">아이디어를 현실로 만드는 첫 걸음</p>
            </div>

            <div className="w-full max-w-md glass-panel rounded-[2rem] p-8 sm:p-12 z-10 transition-all duration-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center tracking-tight">회원가입</h2>

                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                    {/* Email */}
                    <div className="space-y-2">
                        <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-600 ml-1">이메일 주소</label>
                        <input
                            id="signup-email" type="email" autoComplete="email"
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            onBlur={handleEmailBlur}
                            disabled={isDisabled}
                            placeholder="you@example.com"
                            className={`w-full px-5 py-3.5 rounded-2xl glass-input border-2 transition-all duration-300
                                ${errors.email ? 'border-red-400/50 bg-red-50/30' : 'border-white/50 focus:border-blue-400/50'}
                                outline-none`}
                        />
                        {errors.email && <p role="alert" className="text-xs text-red-500 font-medium mt-1 ml-1">⚠ {errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-600 ml-1">비밀번호</label>
                        <PasswordToggleInput
                            id="signup-password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={handlePasswordBlur}
                            disabled={isDisabled}
                            placeholder="8자 이상, 영문·숫자·특수문자 포함"
                            hasError={!!errors.password}
                            className={`rounded-2xl glass-input border-2 px-5 py-3.5 ${errors.password ? 'border-red-400/50 bg-red-50/30' : 'border-white/50'}`}
                        />
                        <div className="px-1 mt-2 rotate-[-0.5deg]"><PasswordStrengthBar password={password} /></div>
                        {errors.password && <p role="alert" className="text-xs text-red-500 font-medium mt-1 ml-1">⚠ {errors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label htmlFor="signup-confirm" className="block text-sm font-semibold text-gray-600 ml-1">비밀번호 확인</label>
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
                                className={`rounded-2xl glass-input border-2 px-5 py-3.5 ${errors.confirmPassword || isConfirmMismatch ? 'border-red-400/50 bg-red-50/30' : 'border-white/50'}`}
                            />
                            {isConfirmMatch && <span className="absolute right-14 top-1/2 -translate-y-1/2 text-emerald-500 text-lg">✅</span>}
                            {isConfirmMismatch && <span className="absolute right-14 top-1/2 -translate-y-1/2 text-red-500 text-lg">❌</span>}
                        </div>
                        {errors.confirmPassword && <p role="alert" className="text-xs text-red-500 font-medium mt-1 ml-1">⚠ {errors.confirmPassword}</p>}
                    </div>

                    {/* Terms */}
                    <div className="pt-2 px-1">
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={termsAgreed}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setTermsAgreed(e.target.checked)}
                                disabled={isDisabled}
                                className="w-5 h-5 mt-0.5 rounded-lg border-white/50 text-blue-600 focus:ring-blue-500/50 glass-input"
                            />
                            <span className="text-sm text-gray-500 font-medium leading-relaxed">
                                <span className="text-blue-600 font-bold hover:underline">서비스 이용약관</span> 및{' '}
                                <span className="text-blue-600 font-bold hover:underline">개인정보 처리방침</span>에 동의합니다.
                            </span>
                        </label>
                        {errors.terms && <p role="alert" className="text-xs text-red-500 font-medium mt-2">⚠ {errors.terms}</p>}
                    </div>

                    {errors.submit && (
                        <div role="alert" className="p-4 bg-red-50/80 border border-red-200 text-red-600 rounded-xl text-sm font-bold text-center">
                            {errors.submit}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isDisabled || !termsAgreed}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black rounded-2xl
                            transition-all duration-300 active:scale-[0.98] shadow-lg shadow-emerald-100 flex items-center justify-center gap-2
                            disabled:opacity-50 disabled:active:scale-100"
                    >
                        {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '계정 생성하기'}
                    </button>

                    {onGuest && (
                        <button type="button" onClick={onGuest} className="w-full py-2 text-gray-400 hover:text-gray-600 font-medium text-sm transition-all hover:underline">
                            비회원으로 둘러보기 (Guest Mode)
                        </button>
                    )}
                </form>

                {/* Social Login Divider */}
                <div className="relative flex items-center justify-center my-10">
                    <div className="absolute inset-0 flex items-center px-2"><div className="w-full border-t border-gray-200/50" /></div>
                    <span className="relative bg-[#f0f4f8] px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">JOIN WITH</span>
                </div>

                {/* Social Join Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/google`}
                        className="flex items-center justify-center gap-3 py-3 px-4 glass-panel rounded-2xl hover:bg-white/80 transition-all duration-300 group border-white/40">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold text-gray-700">Google</span>
                    </button>
                    <button type="button" onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/naver`}
                        className="flex items-center justify-center gap-3 py-3 px-4 bg-[#03C75A] hover:bg-[#02b351] rounded-2xl transition-all duration-300 group shadow-md">
                        <span className="text-white font-black text-lg group-hover:scale-110 transition-transform">N</span>
                        <span className="text-sm font-bold text-white">Naver</span>
                    </button>
                </div>

                <p className="mt-10 text-center text-sm text-gray-500 font-medium">
                    이미 계정이 있으신가요?{' '}
                    <button type="button" onClick={onNavigateToLogin} className="text-blue-600 font-bold hover:underline transition-all">로그인하기</button>
                </p>
            </div>
            <p className="mt-8 text-xs text-gray-400 font-medium z-10 opacity-70">© 2026 Short-Cut AI. All rights reserved.</p>
        </div>
    );
}
