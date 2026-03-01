/**
 * 회원가입 폼 컴포넌트 (Issue #46)
 *
 * - 이메일 / 닉네임 / 비밀번호 / 비밀번호 확인 4개 필드
 * - onBlur 시 개별 필드 인라인 에러 표시 (alert 금지)
 * - 비밀번호 변경 시 비밀번호 확인 필드 자동 재검증
 * - 제출 시 전체 필드 일괄 검증
 */

import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import {
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    validateNickname,
} from '../../utils/validators';

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
    submit?: string;
}

export function SignupForm({ onSuccess, onNavigateToLogin, onSignup, isLoading }: SignupFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEmailBlur = useCallback(() => {
        const r = validateEmail(email);
        setErrors((p) => ({ ...p, email: r === true ? undefined : r }));
    }, [email]);

    const handlePasswordBlur = useCallback(() => {
        const r = validatePassword(password);
        setErrors((p) => ({ ...p, password: r === true ? undefined : r }));
        // 비밀번호 변경 시 확인 필드 자동 재검증
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
        };

        if (newErrors.email || newErrors.password || newErrors.confirmPassword || newErrors.nickname) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors({});
        try {
            await onSignup({ email, password, nickname });
            onSuccess();
        } catch (err: unknown) {
            setErrors({
                submit: err instanceof Error ? err.message : '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.',
            });
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
                        {/* 이메일 */}
                        <div>
                            <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-700 mb-1">이메일</label>
                            <input
                                id="signup-email" type="email" autoComplete="email"
                                value={email}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                onBlur={handleEmailBlur}
                                disabled={isDisabled}
                                placeholder="example@email.com"
                                className={inputClass(!!errors.email)}
                            />
                            {errors.email && <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1"><span>⚠️</span>{errors.email}</p>}
                        </div>

                        {/* 닉네임 */}
                        <div>
                            <label htmlFor="signup-nickname" className="block text-sm font-semibold text-gray-700 mb-1">닉네임</label>
                            <input
                                id="signup-nickname" type="text" autoComplete="username"
                                value={nickname}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
                                onBlur={handleNicknameBlur}
                                disabled={isDisabled}
                                placeholder="2~20자, 특수문자 제외"
                                className={inputClass(!!errors.nickname)}
                            />
                            {errors.nickname && <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1"><span>⚠️</span>{errors.nickname}</p>}
                        </div>

                        {/* 비밀번호 */}
                        <div>
                            <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-700 mb-1">비밀번호</label>
                            <input
                                id="signup-password" type="password" autoComplete="new-password"
                                value={password}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                onBlur={handlePasswordBlur}
                                disabled={isDisabled}
                                placeholder="8자 이상, 영문·숫자·특수문자 포함"
                                className={inputClass(!!errors.password)}
                            />
                            {errors.password && <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1"><span>⚠️</span>{errors.password}</p>}
                        </div>

                        {/* 비밀번호 확인 */}
                        <div>
                            <label htmlFor="signup-confirm" className="block text-sm font-semibold text-gray-700 mb-1">비밀번호 확인</label>
                            <input
                                id="signup-confirm" type="password" autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                onBlur={handleConfirmPasswordBlur}
                                disabled={isDisabled}
                                placeholder="비밀번호를 다시 입력하세요"
                                className={inputClass(!!errors.confirmPassword)}
                            />
                            {errors.confirmPassword && <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1"><span>⚠️</span>{errors.confirmPassword}</p>}
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
                            disabled={isDisabled}
                            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl
                                hover:bg-blue-700 active:scale-95 transition-all mt-2
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                                flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <><span className="animate-spin">⏳</span> 가입 중...</> : '회원가입'}
                        </button>
                    </form>

                    {/* 로그인 링크 */}
                    <p className="mt-6 text-center text-sm text-gray-500">
                        이미 계정이 있으신가요?{' '}
                        <button
                            type="button"
                            onClick={onNavigateToLogin}
                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        >
                            로그인
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
