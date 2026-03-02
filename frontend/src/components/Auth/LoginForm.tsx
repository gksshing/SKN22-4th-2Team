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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
    const [keepLoggedIn, setKeepLoggedIn] = useState(false);
    const [ipSecurity, setIpSecurity] = useState(true);

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
            setErrors({ submit: '아이디(로그인 전용 아이디) 또는 비밀번호를 잘못 입력했습니다.\n입력하신 내용을 다시 확인해주세요.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = isSubmitting || isLoading;

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] px-4 py-12">
            {/* Logo Section */}
            <div className="mb-12">
                <h1 className="text-[42px] font-black text-[#2563EB] tracking-tight">Short-Cut</h1>
                <p className="text-gray-500 text-center font-medium -mt-1">AI 특허 아이디어 분석 서비스</p>
            </div>

            {/* Login Card (Naver Style) */}
            <div className="w-full max-w-[460px] bg-white border border-gray-200 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-10">
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    {/* Unified Input Box */}
                    <div className="border border-gray-200 rounded-[12px] overflow-hidden focus-within:ring-2 focus-within:ring-[#2563EB] focus-within:border-[#2563EB] transition-all">
                        <div className="relative border-b border-gray-100 flex items-center px-4 py-3.5 bg-white">
                            <span className="text-gray-400 mr-3">📧</span>
                            <input
                                id="login-email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                onBlur={handleEmailBlur}
                                disabled={isDisabled}
                                placeholder="이메일"
                                className="w-full h-full outline-none text-[16px] placeholder-gray-400"
                            />
                        </div>
                        <div className="relative flex items-center px-4 py-3.5 bg-white">
                            <span className="text-gray-400 mr-3">🔒</span>
                            <PasswordToggleInput
                                id="login-password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                onBlur={handlePasswordBlur}
                                disabled={isDisabled}
                                placeholder="비밀번호"
                                isError={false} // Use unified error display below
                                className="border-none bg-transparent p-0 focus:bg-transparent pl-0 pr-8"
                            />
                        </div>
                    </div>

                    {/* Checkbox & Toggle Section */}
                    <div className="flex items-center justify-between text-[14px] px-1 py-1">
                        <label className="flex items-center gap-2 cursor-pointer text-gray-600 font-medium">
                            <input
                                type="checkbox"
                                checked={keepLoggedIn}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setKeepLoggedIn(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                            />
                            로그인 상태 유지
                        </label>
                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                            <span>IP보안</span>
                            <button
                                type="button"
                                onClick={() => setIpSecurity(!ipSecurity)}
                                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ${ipSecurity ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${ipSecurity ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Field Errors */}
                    {(errors.email || errors.password || errors.submit) && (
                        <div role="alert" className="text-[13px] text-red-500 font-medium space-y-1 px-1">
                            {errors.email && <p>⚠ {errors.email}</p>}
                            {errors.password && <p>⚠ {errors.password}</p>}
                            {errors.submit && <p className="whitespace-pre-line text-center py-2 bg-red-50 rounded-lg border border-red-100 mt-2">{errors.submit}</p>}
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={isDisabled}
                        className="w-full py-4 mt-4 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-[18px] rounded-[12px] transition-all duration-200 active:scale-[0.99] disabled:opacity-50"
                    >
                        {isSubmitting ? '로그인 중...' : '로그인'}
                    </button>

                    {/* Guest Link */}
                    {onGuest && (
                        <button
                            type="button"
                            onClick={onGuest}
                            className="w-full py-2 text-gray-400 hover:text-gray-600 font-medium text-sm transition-all hover:underline mt-2"
                        >
                            비회원으로 둘러보기
                        </button>
                    )}
                </form>

                {/* Footer Links with thin separators */}
                <div className="mt-8 flex items-center justify-center gap-4 text-[13px] text-gray-400 font-medium">
                    <button type="button" className="hover:underline">비밀번호 찾기</button>
                    <span className="w-[1px] h-3 bg-gray-200"></span>
                    <button type="button" className="hover:underline">아이디 찾기</button>
                    <span className="w-[1px] h-3 bg-gray-200"></span>
                    <button type="button" onClick={onNavigateToSignup} className="text-gray-600 font-bold hover:underline">회원가입</button>
                </div>
            </div>

            {/* Social Login Buttons (Naver Passkey Style) */}
            <div className="w-full max-w-[460px] mt-10">
                <div className="relative flex items-center justify-center mb-6">
                    <div className="absolute inset-0 flex items-center px-2"><div className="w-full border-t border-gray-200" /></div>
                    <span className="relative bg-[#F8FAFC] px-4 text-[12px] font-bold text-gray-400">다른 방식으로 로그인</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/google`}
                        className="flex items-center justify-center gap-3 py-3.5 bg-white border border-gray-200 rounded-[12px] hover:bg-gray-50 transition-all font-bold text-gray-700 text-[15px] shadow-sm active:scale-[0.98]"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        Google
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.href = `${API_BASE_URL}/api/v1/auth/login/naver`}
                        className="flex items-center justify-center gap-3 py-3.5 bg-[#03C75A] border border-[#02b351] rounded-[12px] hover:bg-[#02b351] transition-all font-bold text-white text-[15px] shadow-sm active:scale-[0.98]"
                    >
                        <span className="font-black text-[18px]">N</span>
                        Naver
                    </button>
                </div>
            </div>

            {/* Simple Footer */}
            <div className="mt-16 text-center space-y-1">
                <p className="text-[13px] text-gray-400 font-semibold tracking-tight">© Short-Cut AI. All rights reserved.</p>
                <div className="flex items-center justify-center gap-3 text-[11px] text-gray-300">
                    <button className="hover:underline">이용약관</button>
                    <button className="hover:underline">개인정보처리방침</button>
                    <button className="hover:underline">고객센터</button>
                </div>
            </div>
        </div>
    );
}
