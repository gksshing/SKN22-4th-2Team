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
    validateNickname,
} from '../../utils/validators';
import { PasswordToggleInput } from './PasswordToggleInput';
import { PasswordStrengthBar } from './PasswordStrengthBar';

interface SignupFormProps {
    onSuccess: () => void;
    onNavigateToLogin: () => void;
    onSignup: (params: { email: string; password: string; nickname: string }) => Promise<void>;
    isLoading?: boolean;
}

interface FormErrors {
    email?: string;
    password?: string;
    confirmPassword?: string;
    nickname?: string;
    terms?: string;
    submit?: string;
}

export function SignupForm({ onSuccess, onNavigateToLogin, onSignup, isLoading }: SignupFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // 비밀번호 일치 여부 계산 (실시간 아이콘용)
    const isConfirmMatch = confirmPassword.length > 0 && confirmPassword === password;
    const isConfirmMismatch = confirmPassword.length > 0 && confirmPassword !== password;

    const handleEmailBlur = useCallback(() => {
        const r = validateEmail(email);
        setErrors((p) => ({ ...p, email: r === true ? undefined : r }));
    }, [email]);

    const handlePasswordBlur = useCallback(() => {
        const r = validatePassword(password);
        setErrors((p) => ({ ...p, password: r === true ? undefined : r }));
        if (confirmPassword) {
            const cr = validateConfirmPassword(confirmPassword, password);
            setErrors((p) => ({ ...p, confirmPassword: cr === true ? undefined : cr }));
        }
    }, [password, confirmPassword]);

    const handleConfirmPasswordBlur = useCallback(() => {
        const r = validateConfirmPassword(confirmPassword, password);
        setErrors((p) => ({ ...p, confirmPassword: r === true ? undefined : r }));
    }, [confirmPassword, password]);

    const handleNicknameBlur = useCallback(() => {
        const r = validateNickname(nickname);
        setErrors((p) => ({ ...p, nickname: r === true ? undefined : r }));
    }, [nickname]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const emailR = validateEmail(email);
        const passwordR = validatePassword(password);
        const confirmR = validateConfirmPassword(confirmPassword, password);
        const nicknameR = validateNickname(nickname);

        const newErrors: FormErrors = {
            email: emailR === true ? undefined : emailR,
            password: passwordR === true ? undefined : passwordR,
            confirmPassword: confirmR === true ? undefined : confirmR,
            nickname: nicknameR === true ? undefined : nicknameR,
            terms: termsAgreed ? undefined : '약관에 동의해주세요.',
        };

        if (Object.values(newErrors).some(Boolean)) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors({});
        try {
            await onSignup({ email, password, nickname });
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
        `block text-sm font-semibold text-gray-700 mb-1 ${hasError ? 'text-red-600' : ''}`;

    // 회원가입 성공 화면
    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950 px-4">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-bounce">🎉</div>
                    <h2 className="text-2xl font-bold text-white mb-2">회원가입 완료!</h2>
                    <p className="text-blue-300">로그인 화면으로 이동합니다...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950 px-4 py-8">
            <div className="w-full max-w-md">
                {/* 헤더 */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">✂️ Short-Cut</h1>
                    <p className="text-blue-300 text-sm">AI 특허 아이디어 검증 서비스</p>
                </div>

                {/* 카드 */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">회원가입</h2>

                    <form onSubmit={handleSubmit} noValidate className="space-y-4">

                        {/* 1. 이메일 */}
                        <div>
                            <label htmlFor="signup-email" className={fieldClass(!!errors.email)}>이메일</label>
                            <input
                                id="signup-email" type="email" autoComplete="email"
                                value={email}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                onBlur={handleEmailBlur}
                                disabled={isDisabled}
                                placeholder="example@email.com"
                                className={`w-full px-4 py-3 rounded-xl border-2 text-gray-800 placeholder-gray-400 focus:outline-none transition-colors
                                    ${errors.email ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'}
                                    disabled:opacity-50 disabled:cursor-not-allowed`}
                            />
                            {errors.email && <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">⚠️ {errors.email}</p>}
                        </div>

                        {/* 2. 비밀번호 (PasswordToggleInput + PasswordStrengthBar) */}
                        <div>
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
                            />
                            {/* 비밀번호 복잡도 강도 바 */}
                            <PasswordStrengthBar password={password} />
                            {errors.password && <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">⚠️ {errors.password}</p>}
                        </div>

                        {/* 3. 비밀번호 확인 (실시간 ✅/❌ 아이콘) */}
                        <div>
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
                                />
                                {/* 실시간 일치 아이콘 */}
                                {isConfirmMatch && (
                                    <span className="absolute right-10 top-1/2 -translate-y-1/2 text-green-500 text-sm font-bold">✅</span>
                                )}
                                {isConfirmMismatch && (
                                    <span className="absolute right-10 top-1/2 -translate-y-1/2 text-red-500 text-sm">❌</span>
                                )}
                            </div>
                            {errors.confirmPassword && <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">⚠️ {errors.confirmPassword}</p>}
                        </div>

                        {/* 4. 닉네임 */}
                        <div>
                            <label htmlFor="signup-nickname" className={fieldClass(!!errors.nickname)}>닉네임</label>
                            <input
                                id="signup-nickname" type="text" autoComplete="username"
                                value={nickname}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
                                onBlur={handleNicknameBlur}
                                disabled={isDisabled}
                                placeholder="2~20자, 특수문자 제외"
                                className={`w-full px-4 py-3 rounded-xl border-2 text-gray-800 placeholder-gray-400 focus:outline-none transition-colors
                                    ${errors.nickname ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'}
                                    disabled:opacity-50 disabled:cursor-not-allowed`}
                            />
                            {errors.nickname && <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">⚠️ {errors.nickname}</p>}
                        </div>

                        {/* 약관 동의 체크박스 */}
                        <div className="pt-1">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={termsAgreed}
                                    onChange={(e) => setTermsAgreed(e.target.checked)}
                                    disabled={isDisabled}
                                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                                    <span className="text-blue-600 font-semibold hover:underline cursor-pointer">서비스 이용약관</span> 및{' '}
                                    <span className="text-blue-600 font-semibold hover:underline cursor-pointer">개인정보 처리방침</span>에 동의합니다.
                                    <span className="text-red-500 ml-1">*</span>
                                </span>
                            </label>
                            {errors.terms && <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">⚠️ {errors.terms}</p>}
                        </div>

                        {/* 제출 에러 */}
                        {errors.submit && (
                            <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center font-medium">
                                {errors.submit}
                            </div>
                        )}

                        {/* 회원가입 버튼 */}
                        <button
                            type="submit"
                            disabled={isDisabled || !termsAgreed}
                            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl
                                hover:bg-blue-700 active:scale-95 transition-all mt-2
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                                flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <><span className="animate-spin">⏳</span>가입 중...</> : '회원가입'}
                        </button>
                    </form>

                    {/* 로그인 링크 */}
                    <p className="mt-6 text-center text-sm text-gray-500">
                        이미 계정이 있으신가요?{' '}
                        <button type="button" onClick={onNavigateToLogin}
                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                            로그인
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
