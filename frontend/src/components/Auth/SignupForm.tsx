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

    const fieldClass = (hasError: boolean) =>
        `block text-sm font-bold text-blue-100/80 mb-2 ml-1 ${hasError ? 'text-red-400' : ''}`;

    const inputWrapperClass = (hasError: boolean) =>
        `w-full px-4 py-3 rounded-xl border-2 text-gray-800 placeholder-gray-400 focus:outline-none transition-all duration-300 glass-input
        ${hasError ? 'border-red-400/50 bg-red-50/50 focus:border-red-500' : 'border-white/20 focus:border-blue-500/50'}
        disabled:opacity-50 disabled:cursor-not-allowed`;

    // 회원가입 성공 화면 (프리미엄 버전)
    if (isSuccess) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#030712] relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

                <div className="text-center z-10 animate-in zoom-in-95 duration-700">
                    <div className="text-8xl mb-6 animate-bounce drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]">✨</div>
                    <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">환영합니다!</h2>
                    <p className="text-xl text-blue-300/80 font-medium">회원가입이 완료되었습니다.<br />잠시 후 로그인 화면으로 이동합니다.</p>
                    <div className="mt-10 flex justify-center">
                        <div className="w-16 h-1 bg-blue-600 rounded-full animate-loading-bar"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex bg-[#030712] overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-20%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>

            {/* Left Side: Illustration (Desktop Only) */}
            <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden border-r border-white/5">
                <div className="absolute inset-0 bg-cover bg-center opacity-40 scale-105"
                    style={{ backgroundImage: "url('/images/auth-bg.png')" }}></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-transparent to-[#030712]/80"></div>

                <div className="relative z-10 max-w-lg text-center lg:text-left animate-float">
                    <h1 className="text-6xl font-black text-white leading-tight tracking-tighter mb-6 text-glow">
                        Join the <span className="text-blue-500">Future</span><br />of Innovation
                    </h1>
                    <p className="text-xl text-blue-200/80 font-medium leading-relaxed">
                        계정 하나로 모든 특허 데이터와 AI 분석 기술을 경험하세요.<br />
                        더 스마트한 아이디어 검증의 시작, Short-Cut입니다.
                    </p>
                    <ul className="mt-10 space-y-4 text-blue-100/60 font-medium">
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">✓</span>
                            무제한 AI 클라우드 기록 저장
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">✓</span>
                            정밀 하이브리드 검색 엔진 활용
                        </li>
                    </ul>
                </div>
            </div>

            {/* Right Side: Signup Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10 overflow-y-auto">
                <div className="w-full max-w-md my-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* 모바일 로고 */}
                    <div className="lg:hidden text-center mb-10">
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">✂️ Short-Cut</h1>
                        <p className="text-blue-300 text-sm">AI 특허 아이디어 검증 서비스</p>
                    </div>

                    {/* Glass Card */}
                    <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-white/10">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-white mb-2">회원가입</h2>
                            <p className="text-blue-100/60 font-medium">혁신의 여정을 함께 시작해볼까요? ✨</p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="space-y-6">
                            {/* 1. 이메일 */}
                            <div className="space-y-2">
                                <label htmlFor="signup-email" className={fieldClass(!!errors.email)}>이메일 주소</label>
                                <input
                                    id="signup-email" type="email" autoComplete="email"
                                    value={email}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                    onBlur={handleEmailBlur}
                                    disabled={isDisabled}
                                    placeholder="example@email.com"
                                    className={inputWrapperClass(!!errors.email)}
                                />
                                {errors.email && <p role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5 ml-1 animate-in zoom-in-95">⚠ {errors.email}</p>}
                            </div>

                            {/* 2. 비밀번호 */}
                            <div className="space-y-2">
                                <label htmlFor="signup-password" className={fieldClass(!!errors.password)}>비밀번호</label>
                                <PasswordToggleInput
                                    id="signup-password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onBlur={handlePasswordBlur}
                                    disabled={isDisabled}
                                    placeholder="8자 이상, 영문·숫자·특수문자 포함"
                                    hasError={!!errors.password}
                                    className="glass-input !bg-white/50 border-white/20"
                                />
                                <div className="px-1"><PasswordStrengthBar password={password} /></div>
                                {errors.password && <p role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5 ml-1 animate-in zoom-in-95">⚠ {errors.password}</p>}
                            </div>

                            {/* 3. 비밀번호 확인 */}
                            <div className="space-y-2">
                                <label htmlFor="signup-confirm" className={fieldClass(!!errors.confirmPassword)}>비밀번호 확인</label>
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
                                        className="glass-input !bg-white/50 border-white/20"
                                    />
                                    {isConfirmMatch && (
                                        <span className="absolute right-12 top-1/2 -translate-y-1/2 text-green-400 text-lg animate-in zoom-in-75">✅</span>
                                    )}
                                    {isConfirmMismatch && (
                                        <span className="absolute right-12 top-1/2 -translate-y-1/2 text-red-400 text-lg animate-in shake-1">❌</span>
                                    )}
                                </div>
                                {errors.confirmPassword && <p role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5 ml-1 animate-in zoom-in-95">⚠ {errors.confirmPassword}</p>}
                            </div>

                            {/* 약관 동의 */}
                            <div className="pt-2">
                                <label className="flex items-start gap-4 cursor-pointer group">
                                    <div className="relative mt-1">
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
                                            className="w-5 h-5 rounded-lg border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                                        />
                                    </div>
                                    <span className="text-sm text-blue-100/60 group-hover:text-blue-100 transition-colors leading-relaxed">
                                        <span className="text-blue-400 font-bold hover:underline underline-offset-4 cursor-pointer">서비스 이용약관</span> 및{' '}
                                        <span className="text-blue-400 font-bold hover:underline underline-offset-4 cursor-pointer">개인정보 처리방침</span>에 동의합니다.
                                        <span className="text-red-400 ml-1.5">*</span>
                                    </span>
                                </label>
                                {errors.terms && <p role="alert" className="mt-2 text-xs text-red-400 flex items-center gap-1.5 ml-1 animate-in zoom-in-95">⚠ {errors.terms}</p>}
                            </div>

                            {/* 제출 에러 */}
                            {errors.submit && (
                                <div role="alert" className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 text-center font-semibold animate-in shake-1">
                                    {errors.submit}
                                </div>
                            )}

                            {/* 회원가입 버튼 */}
                            <button
                                type="submit"
                                disabled={isDisabled || !termsAgreed}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold rounded-2xl
                                            hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-blue-900/40
                                            transition-all duration-300 mt-4
                                            disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                                            flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>가입 처리 중...</span>
                                    </>
                                ) : (
                                    <>계정 생성하기</>
                                )}
                            </button>
                        </form>

                        {/* 로그인 링크 및 소셜 로그인 */}
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/5"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[#0f172a] px-3 text-blue-100/30 font-bold tracking-widest">또는 간편 회원가입</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {/* 구글 */}
                                <button
                                    type="button"
                                    onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/callback/google`}
                                    className="flex items-center justify-center py-3 bg-white hover:bg-gray-100 rounded-xl transition-all duration-300 shadow-lg shadow-white/5 group"
                                    title="Google로 회원가입"
                                >
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>

                                {/* 네이버 */}
                                <button
                                    type="button"
                                    onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/callback/naver`}
                                    className="flex items-center justify-center py-3 bg-[#03C75A] hover:bg-[#02b351] rounded-xl transition-all duration-300 shadow-lg shadow-green-900/20 group"
                                    title="Naver로 회원가입"
                                >
                                    <span className="text-white font-black text-lg group-hover:scale-110 transition-transform">N</span>
                                </button>

                                {/* 카카오 */}
                                <button
                                    type="button"
                                    onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/callback/kakao`}
                                    className="flex items-center justify-center py-3 bg-[#FEE500] hover:bg-[#fada00] rounded-xl transition-all duration-300 shadow-lg shadow-yellow-900/20 group"
                                    title="Kakao로 회원가입"
                                >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#191919] group-hover:scale-110 transition-transform">
                                        <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.553 1.706 4.8 4.27 6.054-.15.529-.544 1.923-.622 2.233-.098.397.13.392.274.301.114-.072 1.83-1.243 2.56-1.743.488.068.99.103 1.518.103 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" />
                                    </svg>
                                </button>
                            </div>

                            <p className="mt-8 text-sm text-blue-100/50 text-center font-medium">
                                이미 계정이 있으신가요?{' '}
                                <button type="button" onClick={onNavigateToLogin}
                                    className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all underline-offset-4">
                                    로그인하기
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
